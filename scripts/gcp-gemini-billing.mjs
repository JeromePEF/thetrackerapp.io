#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

import { BigQuery } from "@google-cloud/bigquery";
import dotenv from "dotenv";

const DEFAULT_DAYS = 30;
const DEFAULT_OUT_DIR = "metrics";

loadEnv();
const credentialInfo = await configureDefaultCredentials();

await main().catch(handleFatal);

async function main() {
  if (credentialInfo.mode === "auto-local") {
    console.log(`Auth: using local service account key at ${credentialInfo.path}`);
  } else if (credentialInfo.mode === "env") {
    console.log(`Auth: using GOOGLE_APPLICATION_CREDENTIALS=${credentialInfo.path}`);
  }

  const options = parseArgs(process.argv.slice(2));
  const range = resolveRange(options);
  const projectId =
    options.projectId ||
    process.env.GCP_BILLING_QUERY_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    (await readGcloudConfigProject()) ||
    "";

  const bigquery = new BigQuery({ projectId: projectId || undefined });
  const tableResolution = await resolveTableId(options, bigquery, projectId);
  const tableId = tableResolution.tableId;
  const tableStats = await readTableStats(bigquery, tableId);
  const pricingStats = await readSiblingPricingStats(bigquery, tableId);

  if (!options.allowEmpty && tableStats.numRows === 0) {
    const pricingHint =
      pricingStats.exists && pricingStats.numRows > 0
        ? ` Detected populated pricing table ${pricingStats.tableId} (${pricingStats.numRows} rows), which means Cloud Billing Pricing export is working but usage-cost export is still empty.`
        : "";
    throw new Error(
      `Billing export table ${tableId} has 0 rows (lastModified=${tableStats.lastModifiedTime || "unknown"}).` +
        ` Enable Standard usage cost and/or Detailed usage cost export for billing account ${extractBillingAccountFromTable(tableId)} and wait for the next daily export run.` +
        pricingHint,
    );
  }

  const sqlBase = buildSqlBase(tableId);
  const queryParams = {
    start_ts: `${range.startDate} 00:00:00+00`,
    end_ts: `${range.endExclusive} 00:00:00+00`,
  };

  const [summaryRows, splitRows, modelRows, skuRows, dailyRows, serviceRows, projectRows] = await Promise.all([
    runQuery(bigquery, `${sqlBase}
SELECT
  ROUND(SUM(net_cost), 6) AS total_cloud_net_cost,
  ROUND(SUM(gross_cost), 6) AS total_cloud_gross_cost,
  ROUND(SUM(credits_amount), 6) AS total_cloud_credits,
  ROUND(SUM(IF(is_gemini, net_cost, 0)), 6) AS gemini_total_net_cost,
  ROUND(SUM(IF(is_gemini AND flash_bucket = 'flash', net_cost, 0)), 6) AS gemini_flash_net_cost,
  ROUND(SUM(IF(is_gemini AND flash_bucket = 'non_flash', net_cost, 0)), 6) AS gemini_non_flash_net_cost,
  ANY_VALUE(currency) AS currency
FROM tagged`, queryParams),
  runQuery(bigquery, `${sqlBase}
SELECT
  flash_bucket,
  ROUND(SUM(net_cost), 6) AS net_cost,
  ROUND(SUM(gross_cost), 6) AS gross_cost,
  ROUND(SUM(credits_amount), 6) AS credits
FROM tagged
WHERE is_gemini
GROUP BY flash_bucket
ORDER BY net_cost DESC`, queryParams),
  runQuery(bigquery, `${sqlBase}
SELECT
  model_bucket,
  ROUND(SUM(net_cost), 6) AS net_cost,
  ROUND(SUM(gross_cost), 6) AS gross_cost,
  ROUND(SUM(credits_amount), 6) AS credits
FROM tagged
WHERE is_gemini
GROUP BY model_bucket
ORDER BY net_cost DESC`, queryParams),
  runQuery(bigquery, `${sqlBase}
SELECT
  sku_id,
  sku_description,
  service_description,
  flash_bucket,
  model_bucket,
  ROUND(SUM(net_cost), 6) AS net_cost,
  ROUND(SUM(gross_cost), 6) AS gross_cost,
  ROUND(SUM(credits_amount), 6) AS credits
FROM tagged
WHERE is_gemini
GROUP BY sku_id, sku_description, service_description, flash_bucket, model_bucket
ORDER BY net_cost DESC
LIMIT 250`, queryParams),
  runQuery(bigquery, `${sqlBase}
SELECT
  usage_date,
  flash_bucket,
  model_bucket,
  ROUND(SUM(net_cost), 6) AS net_cost,
  ROUND(SUM(gross_cost), 6) AS gross_cost,
  ROUND(SUM(credits_amount), 6) AS credits
FROM tagged
WHERE is_gemini
GROUP BY usage_date, flash_bucket, model_bucket
ORDER BY usage_date ASC, net_cost DESC`, queryParams),
  runQuery(bigquery, `${sqlBase}
SELECT
  service_description,
  ROUND(SUM(net_cost), 6) AS net_cost
FROM tagged
GROUP BY service_description
ORDER BY net_cost DESC
LIMIT 30`, queryParams),
  runQuery(bigquery, `${sqlBase}
SELECT
  project_id,
  project_name,
  ROUND(SUM(net_cost), 6) AS net_cost
FROM tagged
GROUP BY project_id, project_name
ORDER BY net_cost DESC
LIMIT 30`, queryParams),
  ]);

  const summary = summaryRows[0] || {};
  const cloudNet = number(summary.total_cloud_net_cost);
  const geminiNet = number(summary.gemini_total_net_cost);
  const flashNet = number(summary.gemini_flash_net_cost);
  const nonFlashNet = number(summary.gemini_non_flash_net_cost);

  const output = {
    generatedAtUtc: new Date().toISOString(),
    source: {
      tableId,
      queryProjectId: projectId || null,
      tableAutoDiscovered: tableResolution.autoDiscovered,
      tableCandidates: tableResolution.candidates,
      tableStats,
      siblingPricingTable: pricingStats,
    },
    range,
    summary: {
      currency: summary.currency || null,
      totalCloudNetCost: cloudNet,
      totalCloudGrossCost: number(summary.total_cloud_gross_cost),
      totalCloudCredits: number(summary.total_cloud_credits),
      geminiTotalNetCost: geminiNet,
      geminiFlashNetCost: flashNet,
      geminiNonFlashNetCost: nonFlashNet,
      geminiPercentOfCloudCost: cloudNet > 0 ? round((geminiNet / cloudNet) * 100, 4) : 0,
    },
    splitFlashVsNonFlash: splitRows.map(normalizeCostRow),
    splitByModelBucket: modelRows.map(normalizeCostRow),
    topGeminiSkus: skuRows.map((row) => ({
      skuId: row.sku_id || "",
      skuDescription: row.sku_description || "",
      serviceDescription: row.service_description || "",
      flashBucket: row.flash_bucket || "",
      modelBucket: row.model_bucket || "",
      netCost: number(row.net_cost),
      grossCost: number(row.gross_cost),
      credits: number(row.credits),
    })),
    geminiDailyBreakdown: dailyRows.map((row) => ({
      usageDate: row.usage_date?.value || row.usage_date || "",
      flashBucket: row.flash_bucket || "",
      modelBucket: row.model_bucket || "",
      netCost: number(row.net_cost),
      grossCost: number(row.gross_cost),
      credits: number(row.credits),
    })),
    topCloudServices: serviceRows.map((row) => ({
      serviceDescription: row.service_description || "",
      netCost: number(row.net_cost),
    })),
    topCloudProjects: projectRows.map((row) => ({
      projectId: row.project_id || "",
      projectName: row.project_name || "",
      netCost: number(row.net_cost),
    })),
  };

  const outPath = options.outPath || defaultOutPath();
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(output, null, options.pretty ? 2 : 0) + "\n", "utf8");

  console.log(`Saved billing breakdown to ${outPath}`);
  console.log(
    `Gemini spend (${range.startDate}..${range.endDate}): ` +
      `flash=${formatUsd(flashNet)} non-flash=${formatUsd(nonFlashNet)} total=${formatUsd(geminiNet)}`,
  );
  if (tableResolution.warnings.length) {
    console.log("Discovery warnings:");
    tableResolution.warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`);
    });
  }
}

function handleFatal(error) {
  const text = formatError(error);
  const needsReauth = /invalid_rapt|invalid_grant|reauth/i.test(text);
  console.error(`Billing script failed: ${text}`);
  if (needsReauth) {
    console.error("Re-auth required. Run:");
    console.error("  gcloud auth login");
    console.error("  gcloud auth application-default login");
  }
  if (/No billing export tables found/i.test(text)) {
    const projectHint = String(process.env.GCP_BILLING_QUERY_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "generalautomations-sites").trim();
    console.error("Billing export table not created yet (or still propagating).");
    console.error("Check these now:");
    console.error(`  bq ls ${projectHint}:automation_logs`);
    console.error(`  bq --location=us-central1 ls --transfer_config --project_id=${projectHint}`);
    printTransferStatusSnapshot(projectHint);
  }
  if (/has 0 rows/i.test(text)) {
    const projectHint = String(process.env.GCP_BILLING_QUERY_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "generalautomations-sites").trim();
    console.error("Usage-cost export is still empty, so spend cannot be computed yet.");
    console.error("In Cloud Billing export, enable these for the same billing account + dataset:");
    console.error("  - Standard usage cost");
    console.error("  - Detailed usage cost");
    console.error("Then wait for the next daily export run (no historical backfill before enablement).");
    console.error("Check transfer configs/runs:");
    console.error(`  bq --location=us-central1 ls --transfer_config --project_id=${projectHint}`);
    printTransferStatusSnapshot(projectHint);
  }
  process.exit(1);
}

function loadEnv() {
  const preferredEnvPath = process.env.GOOGLE_METRICS_ENV_FILE || ".env.google-metrics";
  dotenv.config({ path: preferredEnvPath, quiet: true });
  dotenv.config({ quiet: true });
}

function parseArgs(args) {
  const options = {
    days: DEFAULT_DAYS,
    startDate: "",
    endDate: "",
    outPath: "",
    projectId: "",
    tableId: "",
    pretty: true,
    allowEmpty: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--no-pretty") {
      options.pretty = false;
      continue;
    }

    if (arg === "--allow-empty") {
      options.allowEmpty = true;
      continue;
    }

    if (arg.startsWith("--days=")) {
      options.days = parsePositiveInt(arg.split("=")[1], DEFAULT_DAYS);
      continue;
    }

    if (arg === "--days") {
      options.days = parsePositiveInt(args[i + 1], DEFAULT_DAYS);
      i += 1;
      continue;
    }

    if (arg.startsWith("--start=")) {
      options.startDate = String(arg.split("=")[1] || "").trim();
      continue;
    }

    if (arg === "--start") {
      options.startDate = String(args[i + 1] || "").trim();
      i += 1;
      continue;
    }

    if (arg.startsWith("--end=")) {
      options.endDate = String(arg.split("=")[1] || "").trim();
      continue;
    }

    if (arg === "--end") {
      options.endDate = String(args[i + 1] || "").trim();
      i += 1;
      continue;
    }

    if (arg.startsWith("--out=")) {
      options.outPath = path.resolve(arg.split("=")[1] || "");
      continue;
    }

    if (arg === "--out") {
      options.outPath = path.resolve(args[i + 1] || "");
      i += 1;
      continue;
    }

    if (arg.startsWith("--project=")) {
      options.projectId = String(arg.split("=")[1] || "").trim();
      continue;
    }

    if (arg === "--project") {
      options.projectId = String(args[i + 1] || "").trim();
      i += 1;
      continue;
    }

    if (arg.startsWith("--table=")) {
      options.tableId = String(arg.split("=")[1] || "").trim();
      continue;
    }

    if (arg === "--table") {
      options.tableId = String(args[i + 1] || "").trim();
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/gcp-gemini-billing.mjs [options]

Options:
  --table <project.dataset.table>   Billing export table id (or set GCP_BILLING_EXPORT_TABLE)
  --project <project-id>            Query project id (optional)
  --days <N>                        Last N days, inclusive (default: ${DEFAULT_DAYS})
  --start YYYY-MM-DD                Custom start date (requires --end)
  --end YYYY-MM-DD                  Custom end date, inclusive (requires --start)
  --out <path>                      Output file path
  --no-pretty                       Compact JSON output
  --allow-empty                     Allow empty export table (otherwise script fails on 0 rows)
  -h, --help                        Show help
`);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveRange(options) {
  if (options.startDate || options.endDate) {
    if (!options.startDate || !options.endDate) {
      throw new Error("Both --start and --end are required when setting a custom date range.");
    }

    const start = parseIsoDate(options.startDate, "start");
    const end = parseIsoDate(options.endDate, "end");
    if (end < start) {
      throw new Error("--end must be on or after --start.");
    }

    const endExclusive = new Date(end);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    return {
      days: dayDiffInclusive(start, end),
      startDate: toIsoDate(start),
      endDate: toIsoDate(end),
      endExclusive: toIsoDate(endExclusive),
    };
  }

  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (options.days - 1));
  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  return {
    days: options.days,
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    endExclusive: toIsoDate(endExclusive),
  };
}

function parseIsoDate(value, label) {
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(value)) {
    throw new Error(`Invalid ${label} date '${value}'. Use YYYY-MM-DD.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label} date '${value}'.`);
  }
  return date;
}

function dayDiffInclusive(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

async function resolveTableId(options, bigquery, projectId) {
  const warnings = [];
  const configuredTableId = (options.tableId || process.env.GCP_BILLING_EXPORT_TABLE || "").trim();

  if (configuredTableId) {
    validateTableId(configuredTableId);
    return {
      tableId: configuredTableId,
      autoDiscovered: false,
      candidates: [configuredTableId],
      warnings,
    };
  }

  const projectCandidates = resolveProjectCandidates(options, projectId);
  if (!projectCandidates.length) {
    throw new Error(
      "Missing billing export table and query project. Set --table or GCP_BILLING_EXPORT_TABLE, and ensure project is configured.",
    );
  }

  let discovery = { selected: "", candidates: [] };
  let selectedProject = "";
  for (const candidateProject of projectCandidates) {
    const candidateBq = new BigQuery({ projectId: candidateProject || undefined });
    let candidateDiscovery = { selected: "", candidates: [] };
    try {
      candidateDiscovery = await discoverBillingExportTables(candidateBq, candidateProject);
    } catch (error) {
      warnings.push(`Skipping project '${candidateProject}': ${formatError(error)}`);
      continue;
    }
    if (candidateDiscovery.candidates.length) {
      discovery = candidateDiscovery;
      selectedProject = candidateProject;
      break;
    }
  }

  if (!discovery.candidates.length) {
    throw new Error(
      `No billing export tables found in scanned projects (${projectCandidates.join(", ")}). Set --table or configure GCP_BILLING_EXPORT_TABLE.`,
    );
  }

  if (discovery.candidates.length > 1) {
    warnings.push(
      `Found ${discovery.candidates.length} billing export table candidates in '${selectedProject}'. Selected latest updated: ${discovery.selected}.`,
    );
    warnings.push(`Candidates: ${discovery.candidates.join(", ")}`);
  } else {
    warnings.push(`Auto-discovered billing export table in '${selectedProject}': ${discovery.selected}`);
  }

  return {
    tableId: discovery.selected,
    autoDiscovered: true,
    candidates: discovery.candidates,
    warnings,
  };
}

function resolveProjectCandidates(options, primaryProjectId) {
  const candidates = [];
  const envList = String(process.env.GCP_BILLING_CANDIDATE_PROJECTS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const commonAutomationsAliases = ["generalautomations-sites", "automations-485317"];
  const fromGcloud = listProjectsFromGcloud();

  const pushUnique = (projectId) => {
    const normalized = String(projectId || "").trim();
    if (!normalized) {
      return;
    }
    if (!candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  pushUnique(options.projectId);
  pushUnique(process.env.GCP_BILLING_QUERY_PROJECT);
  pushUnique(process.env.GOOGLE_CLOUD_PROJECT);
  pushUnique(primaryProjectId);
  if (envList.length) {
    envList.forEach(pushUnique);
    return candidates;
  }
  commonAutomationsAliases.forEach(pushUnique);
  fromGcloud.forEach(pushUnique);

  return candidates;
}

async function configureDefaultCredentials() {
  const explicit = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim();
  if (explicit) {
    return { mode: "env", path: explicit };
  }

  const localCredentialsPath = path.resolve(process.cwd(), "credentials.json");
  try {
    await fs.access(localCredentialsPath);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = localCredentialsPath;
    return { mode: "auto-local", path: localCredentialsPath };
  } catch {
    return { mode: "adc", path: "" };
  }
}

function printTransferStatusSnapshot(projectId) {
  const trimmedProjectId = String(projectId || "").trim();
  if (!trimmedProjectId) {
    return;
  }

  try {
    const configOutput = execFileSync(
      "bq",
      ["ls", "--transfer_config", "--transfer_location=us-central1", `--project_id=${trimmedProjectId}`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();

    if (!configOutput) {
      console.error("Transfer configs: none listed in us-central1.");
      return;
    }

    console.error("Transfer configs (us-central1):");
    console.error(configOutput);

    const configNames = [...configOutput.matchAll(/projects\/\d+\/locations\/[a-z0-9-]+\/transferConfigs\/[A-Za-z0-9-]+/g)].map(
      (match) => match[0],
    );

    for (const configName of configNames.slice(0, 2)) {
      try {
        const runOutput = execFileSync(
          "bq",
          ["ls", "--transfer_run", "--transfer_location=us-central1", configName],
          { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
        ).trim();
        if (runOutput) {
          console.error(`Transfer runs for ${configName}:`);
          console.error(runOutput);
        }
      } catch {
        // best effort only
      }
    }
  } catch {
    // best effort only
  }
}

function listProjectsFromGcloud() {
  try {
    const output = execFileSync(
      "gcloud",
      ["projects", "list", "--format=value(projectId)"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );

    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function validateTableId(tableId) {
  if (!tableId) {
    throw new Error("Missing billing export table. Set --table or GCP_BILLING_EXPORT_TABLE.");
  }

  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+$/.test(tableId)) {
    throw new Error(`Invalid table id '${tableId}'. Expected project.dataset.table`);
  }
}

function parseTableId(tableId) {
  validateTableId(tableId);
  const [projectId, datasetId, tableName] = tableId.split(".");
  return { projectId, datasetId, tableName };
}

function extractBillingAccountFromTable(tableId) {
  const { tableName } = parseTableId(tableId);
  const match = tableName.match(/([A-F0-9]{6})_([A-F0-9]{6})_([A-F0-9]{6})$/i);
  if (!match) {
    return "unknown";
  }
  return `${match[1]}-${match[2]}-${match[3]}`.toUpperCase();
}

async function readTableStats(bigquery, tableId) {
  const { projectId, datasetId, tableName } = parseTableId(tableId);
  const table = bigquery.dataset(datasetId, { projectId }).table(tableName);
  const [metadata] = await table.getMetadata();
  return {
    tableId,
    numRows: Number(metadata.numRows || 0),
    numBytes: Number(metadata.numBytes || 0),
    creationTime: millisToIso(metadata.creationTime),
    lastModifiedTime: millisToIso(metadata.lastModifiedTime),
  };
}

async function readSiblingPricingStats(bigquery, tableId) {
  const { projectId, datasetId } = parseTableId(tableId);
  const pricingTableId = `${projectId}.${datasetId}.cloud_pricing_export`;
  const table = bigquery.dataset(datasetId, { projectId }).table("cloud_pricing_export");
  try {
    const [metadata] = await table.getMetadata();
    return {
      exists: true,
      tableId: pricingTableId,
      numRows: Number(metadata.numRows || 0),
      numBytes: Number(metadata.numBytes || 0),
      lastModifiedTime: millisToIso(metadata.lastModifiedTime),
    };
  } catch (error) {
    return {
      exists: false,
      tableId: pricingTableId,
      numRows: 0,
      numBytes: 0,
      lastModifiedTime: null,
      error: formatError(error),
    };
  }
}

function millisToIso(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return new Date(n).toISOString();
}

async function discoverBillingExportTables(bigquery, projectId) {
  const candidates = [];

  const [datasets] = await bigquery.getDatasets({ autoPaginate: true, maxResults: 1000 });
  for (const dataset of datasets) {
    const datasetId = dataset?.id || dataset?.metadata?.datasetReference?.datasetId;
    if (!datasetId) {
      continue;
    }

    const [tables] = await dataset.getTables({ autoPaginate: true, maxResults: 5000 });
    for (const table of tables) {
      const tableId = table?.id || table?.metadata?.tableReference?.tableId;
      if (!tableId) {
        continue;
      }

      const lower = tableId.toLowerCase();
      if (!lower.startsWith("gcp_billing_export_v1_") && !lower.startsWith("gcp_billing_export_resource_v1_")) {
        continue;
      }

      const fullId = `${projectId}.${datasetId}.${tableId}`;
      const numericUpdated =
        Number(table?.metadata?.lastModifiedTime || table?.metadata?.creationTime || 0) || 0;
      candidates.push({
        fullId,
        updated: numericUpdated,
      });
    }
  }

  candidates.sort((a, b) => b.updated - a.updated || a.fullId.localeCompare(b.fullId));

  return {
    selected: candidates[0]?.fullId || "",
    candidates: candidates.map((entry) => entry.fullId),
  };
}

async function readGcloudConfigProject() {
  try {
    const activeConfigPath = path.join(os.homedir(), ".config", "gcloud", "active_config");
    const activeConfig = (await fs.readFile(activeConfigPath, "utf8")).trim() || "default";
    const configPath = path.join(os.homedir(), ".config", "gcloud", "configurations", `config_${activeConfig}`);
    const configContents = await fs.readFile(configPath, "utf8");
    const match = configContents.match(/^\s*project\s*=\s*(.+)\s*$/m);
    return match?.[1]?.trim() || "";
  } catch {
    return "";
  }
}

function buildSqlBase(tableId) {
  return `
WITH base AS (
  SELECT
    DATE(usage_start_time) AS usage_date,
    service.description AS service_description,
    sku.id AS sku_id,
    sku.description AS sku_description,
    project.id AS project_id,
    project.name AS project_name,
    cost AS gross_cost,
    IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0) AS credits_amount,
    cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0) AS net_cost,
    currency
  FROM \`${tableId}\`
  WHERE usage_start_time >= @start_ts
    AND usage_start_time < @end_ts
),
tagged AS (
  SELECT
    *,
    (
      LOWER(sku_description) LIKE '%gemini%'
      OR LOWER(service_description) LIKE '%gemini%'
      OR LOWER(sku_description) LIKE '%generative ai%'
    ) AS is_gemini,
    CASE
      WHEN LOWER(sku_description) LIKE '%flash%' THEN 'flash'
      ELSE 'non_flash'
    END AS flash_bucket,
    CASE
      WHEN LOWER(sku_description) LIKE '%flash%' THEN 'flash'
      WHEN LOWER(sku_description) LIKE '%pro%' THEN 'pro'
      WHEN LOWER(sku_description) LIKE '%gemini%' THEN 'gemini_other'
      ELSE 'non_gemini'
    END AS model_bucket
  FROM base
)
`;
}

async function runQuery(bigquery, query, params) {
  const [job] = await bigquery.createQueryJob({
    query,
    params,
    useLegacySql: false,
  });
  const [rows] = await job.getQueryResults();
  return rows;
}

function normalizeCostRow(row) {
  return {
    bucket: row.flash_bucket || row.model_bucket || "",
    netCost: number(row.net_cost),
    grossCost: number(row.gross_cost),
    credits: number(row.credits),
  };
}

function defaultOutPath() {
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return path.resolve(DEFAULT_OUT_DIR, `gcp-gemini-billing-${stamp}.json`);
}

function number(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatError(error) {
  if (!error) {
    return "Unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
