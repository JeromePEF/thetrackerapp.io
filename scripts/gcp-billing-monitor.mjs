#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { BigQuery } from "@google-cloud/bigquery";
import dotenv from "dotenv";

const DEFAULT_DAYS = 30;
const DEFAULT_OUT_DIR = "metrics";
const DEFAULT_DAILY_ALERT_USD = 25;
const DEFAULT_MTD_ALERT_USD = 400;

loadEnv();
const credentialInfo = await configureDefaultCredentials();

await main().catch((error) => {
  console.error(`Billing monitor failed: ${formatError(error)}`);
  process.exit(1);
});

async function main() {
  if (credentialInfo.mode === "auto-local") {
    console.log(`Auth: using local service account key at ${credentialInfo.path}`);
  } else if (credentialInfo.mode === "env") {
    console.log(`Auth: using GOOGLE_APPLICATION_CREDENTIALS=${credentialInfo.path}`);
  }

  const options = parseArgs(process.argv.slice(2));
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
  const billingAccountId = extractBillingAccountFromTable(tableId);

  const now = new Date();
  const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const utcTomorrow = addDays(utcToday, 1);
  const start30 = addDays(utcToday, -(options.days - 1));
  const start7 = addDays(utcToday, -6);
  const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const health = {
    usageExportReady: tableStats.numRows > 0,
    usageTable: tableStats,
    pricingTable: pricingStats,
    billingAccountId,
    warnings: [...tableResolution.warnings],
  };

  let spend = {
    last24h: 0,
    last7d: 0,
    mtd: 0,
    lastNDays: 0,
    currency: "USD",
    geminiFlashLastNDays: 0,
    geminiNonFlashLastNDays: 0,
    geminiTotalLastNDays: 0,
    topServicesLastNDays: [],
  };

  if (health.usageExportReady) {
    const queryParams = {
      start_24h: toTs(addDays(utcToday, -1)),
      start_7d: toTs(start7),
      start_mtd: toTs(startMonth),
      start_n: toTs(start30),
      end_exclusive: toTs(utcTomorrow),
    };

    const [summaryRows, servicesRows, geminiRows] = await Promise.all([
      runQuery(
        bigquery,
        `
SELECT
  ROUND(SUM(IF(usage_start_time >= @start_24h, net_cost, 0)), 6) AS last_24h_net_cost,
  ROUND(SUM(IF(usage_start_time >= @start_7d, net_cost, 0)), 6) AS last_7d_net_cost,
  ROUND(SUM(IF(usage_start_time >= @start_mtd, net_cost, 0)), 6) AS mtd_net_cost,
  ROUND(SUM(IF(usage_start_time >= @start_n, net_cost, 0)), 6) AS last_n_days_net_cost,
  ANY_VALUE(currency) AS currency
FROM (
  SELECT
    usage_start_time,
    cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0) AS net_cost,
    currency
  FROM \`${tableId}\`
  WHERE usage_start_time >= @start_n
    AND usage_start_time < @end_exclusive
)
`,
        queryParams,
      ),
      runQuery(
        bigquery,
        `
SELECT
  service.description AS service_description,
  ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 6) AS net_cost
FROM \`${tableId}\`
WHERE usage_start_time >= @start_n
  AND usage_start_time < @end_exclusive
GROUP BY service_description
ORDER BY net_cost DESC
LIMIT 15
`,
        queryParams,
      ),
      runQuery(
        bigquery,
        `
SELECT
  ROUND(SUM(IF(LOWER(sku.description) LIKE '%gemini%' AND LOWER(sku.description) LIKE '%flash%', net_cost, 0)), 6) AS flash_net_cost,
  ROUND(SUM(IF(LOWER(sku.description) LIKE '%gemini%' AND NOT LOWER(sku.description) LIKE '%flash%', net_cost, 0)), 6) AS non_flash_net_cost,
  ROUND(SUM(IF(LOWER(sku.description) LIKE '%gemini%' OR LOWER(service.description) LIKE '%gemini%', net_cost, 0)), 6) AS total_net_cost
FROM (
  SELECT
    sku.description AS sku_description,
    service.description AS service_description,
    cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0) AS net_cost
  FROM \`${tableId}\`
  WHERE usage_start_time >= @start_n
    AND usage_start_time < @end_exclusive
)
`,
        queryParams,
      ),
    ]);

    const summary = summaryRows[0] || {};
    const gemini = geminiRows[0] || {};

    spend = {
      last24h: number(summary.last_24h_net_cost),
      last7d: number(summary.last_7d_net_cost),
      mtd: number(summary.mtd_net_cost),
      lastNDays: number(summary.last_n_days_net_cost),
      currency: summary.currency || "USD",
      geminiFlashLastNDays: number(gemini.flash_net_cost),
      geminiNonFlashLastNDays: number(gemini.non_flash_net_cost),
      geminiTotalLastNDays: number(gemini.total_net_cost),
      topServicesLastNDays: servicesRows.map((row) => ({
        serviceDescription: row.service_description || "",
        netCost: number(row.net_cost),
      })),
    };
  }

  const alerts = [];
  if (!health.usageExportReady) {
    alerts.push({
      level: "warning",
      code: "USAGE_EXPORT_EMPTY",
      message:
        "Usage-cost export table has 0 rows. Enable Standard usage cost and Detailed usage cost in Billing Export and wait for next daily run.",
    });
  }
  if (spend.last24h > options.dailyAlertUsd) {
    alerts.push({
      level: "critical",
      code: "DAILY_COST_THRESHOLD",
      message: `Last 24h net cost ${formatUsd(spend.last24h)} exceeded threshold ${formatUsd(options.dailyAlertUsd)}.`,
    });
  }
  if (spend.mtd > options.mtdAlertUsd) {
    alerts.push({
      level: "critical",
      code: "MTD_COST_THRESHOLD",
      message: `MTD net cost ${formatUsd(spend.mtd)} exceeded threshold ${formatUsd(options.mtdAlertUsd)}.`,
    });
  }

  const result = {
    generatedAtUtc: new Date().toISOString(),
    source: {
      queryProjectId: projectId || null,
      tableId,
      tableAutoDiscovered: tableResolution.autoDiscovered,
      tableCandidates: tableResolution.candidates,
    },
    range: {
      days: options.days,
      startDate: toIsoDate(start30),
      endDate: toIsoDate(utcToday),
    },
    thresholds: {
      dailyAlertUsd: options.dailyAlertUsd,
      mtdAlertUsd: options.mtdAlertUsd,
    },
    health,
    spend,
    alerts,
  };

  const outPath = options.outPath || defaultOutPath();
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(result, null, options.pretty ? 2 : 0) + "\n", "utf8");

  console.log(`Saved billing monitor snapshot to ${outPath}`);
  console.log(`Billing account: ${billingAccountId}`);
  console.log(`Usage export ready: ${health.usageExportReady ? "yes" : "no"}`);
  console.log(`Usage table rows: ${health.usageTable.numRows}`);
  console.log(`Pricing table rows: ${health.pricingTable.numRows}`);

  if (health.usageExportReady) {
    console.log(`Net cost last 24h: ${formatUsd(spend.last24h)}`);
    console.log(`Net cost last 7d: ${formatUsd(spend.last7d)}`);
    console.log(`Net cost MTD: ${formatUsd(spend.mtd)}`);
    console.log(`Net cost last ${options.days}d: ${formatUsd(spend.lastNDays)}`);
    console.log(
      `Gemini last ${options.days}d: flash=${formatUsd(spend.geminiFlashLastNDays)} non-flash=${formatUsd(spend.geminiNonFlashLastNDays)} total=${formatUsd(spend.geminiTotalLastNDays)}`,
    );
    if (spend.topServicesLastNDays.length) {
      console.log("Top services:");
      for (const svc of spend.topServicesLastNDays.slice(0, 8)) {
        console.log(`- ${svc.serviceDescription || "(unknown)"}: ${formatUsd(svc.netCost)}`);
      }
    }
  }

  if (health.warnings.length) {
    console.log("Discovery warnings:");
    health.warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`);
    });
  }

  if (alerts.length) {
    console.log("Alerts:");
    alerts.forEach((alert, index) => {
      console.log(`${index + 1}. [${alert.level}] ${alert.code} - ${alert.message}`);
    });
  }

  if (options.failOnAlert && alerts.some((alert) => alert.level === "critical")) {
    process.exit(2);
  }
}

function parseArgs(args) {
  const options = {
    days: DEFAULT_DAYS,
    projectId: "",
    tableId: "",
    outPath: "",
    pretty: true,
    dailyAlertUsd: DEFAULT_DAILY_ALERT_USD,
    mtdAlertUsd: DEFAULT_MTD_ALERT_USD,
    failOnAlert: false,
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

    if (arg === "--fail-on-alert") {
      options.failOnAlert = true;
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

    if (arg.startsWith("--out=")) {
      options.outPath = path.resolve(arg.split("=")[1] || "");
      continue;
    }

    if (arg === "--out") {
      options.outPath = path.resolve(args[i + 1] || "");
      i += 1;
      continue;
    }

    if (arg.startsWith("--daily-alert-usd=")) {
      options.dailyAlertUsd = parsePositiveFloat(arg.split("=")[1], DEFAULT_DAILY_ALERT_USD);
      continue;
    }

    if (arg === "--daily-alert-usd") {
      options.dailyAlertUsd = parsePositiveFloat(args[i + 1], DEFAULT_DAILY_ALERT_USD);
      i += 1;
      continue;
    }

    if (arg.startsWith("--mtd-alert-usd=")) {
      options.mtdAlertUsd = parsePositiveFloat(arg.split("=")[1], DEFAULT_MTD_ALERT_USD);
      continue;
    }

    if (arg === "--mtd-alert-usd") {
      options.mtdAlertUsd = parsePositiveFloat(args[i + 1], DEFAULT_MTD_ALERT_USD);
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
  node scripts/gcp-billing-monitor.mjs [options]

Options:
  --table <project.dataset.table>   Billing export table id (optional auto-discovery)
  --project <project-id>            Query project id (optional)
  --days <N>                        Cost window for N-day summaries (default: ${DEFAULT_DAYS})
  --daily-alert-usd <N>             Critical alert threshold for last 24h net cost (default: ${DEFAULT_DAILY_ALERT_USD})
  --mtd-alert-usd <N>               Critical alert threshold for month-to-date net cost (default: ${DEFAULT_MTD_ALERT_USD})
  --fail-on-alert                   Exit with code 2 when critical alerts are present
  --out <path>                      Output JSON path
  --no-pretty                       Compact JSON output
  -h, --help                        Show help
`);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePositiveFloat(value, fallback) {
  const parsed = Number(String(value || "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadEnv() {
  const preferredEnvPath = process.env.GOOGLE_METRICS_ENV_FILE || ".env.google-metrics";
  dotenv.config({ path: preferredEnvPath, quiet: true });
  dotenv.config({ quiet: true });
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

  const pushUnique = (project) => {
    const normalized = String(project || "").trim();
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
  envList.forEach(pushUnique);
  commonAutomationsAliases.forEach(pushUnique);

  return candidates;
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
      const numericUpdated = Number(table?.metadata?.lastModifiedTime || table?.metadata?.creationTime || 0) || 0;
      candidates.push({ fullId, updated: numericUpdated });
    }
  }

  candidates.sort((a, b) => b.updated - a.updated || a.fullId.localeCompare(b.fullId));

  return {
    selected: candidates[0]?.fullId || "",
    candidates: candidates.map((entry) => entry.fullId),
  };
}

async function runQuery(bigquery, query, params) {
  const [job] = await bigquery.createQueryJob({ query, params, useLegacySql: false });
  const [rows] = await job.getQueryResults();
  return rows;
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

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function toTs(date) {
  return `${toIsoDate(date)} 00:00:00+00`;
}

function defaultOutPath() {
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return path.resolve(DEFAULT_OUT_DIR, `gcp-billing-monitor-${stamp}.json`);
}

function number(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number(value));
}

function formatError(error) {
  if (!error) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  const direct =
    error.message ||
    error.errors?.[0]?.message ||
    error.response?.data?.error?.message ||
    error.response?.data?.message;
  if (direct) {
    return String(direct);
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
