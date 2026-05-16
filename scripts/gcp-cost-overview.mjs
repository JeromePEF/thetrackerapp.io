#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { BigQuery } from "@google-cloud/bigquery";
import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";
import dotenv from "dotenv";

const DEFAULT_DAYS = 30;
const DEFAULT_OUT_DIR = "metrics";
const DEFAULT_DAILY_ALERT_USD = 25;
const DEFAULT_MTD_ALERT_USD = 400;

loadEnv();
const credentialInfo = await configureDefaultCredentials();

await main().catch((error) => {
  console.error(`Cost overview failed: ${formatError(error)}`);
  process.exit(1);
});

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const projectId =
    options.projectId ||
    process.env.GCP_BILLING_QUERY_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    (await readGcloudConfigProject()) ||
    "";

  const bigquery = new BigQuery({ projectId: projectId || undefined });

  const tableResolution = await resolveBillingTables(options, projectId);
  const usageTableId = tableResolution.usageTableId;
  const resourceTableId = tableResolution.resourceTableId;
  const billingAccountId =
    normalizeBillingAccount(options.billingAccount) ||
    normalizeBillingAccount(extractBillingAccountFromTable(usageTableId)) ||
    "";

  const usageStats = await readTableStats(bigquery, usageTableId);
  const resourceStats = resourceTableId ? await readTableStats(bigquery, resourceTableId) : null;
  const pricingStats = await readSiblingPricingStats(bigquery, usageTableId);

  const now = new Date();
  const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const utcTomorrow = addDays(utcToday, 1);
  const startNDays = addDays(utcToday, -(options.days - 1));
  const start7 = addDays(utcToday, -6);
  const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const spend = {
    currency: "USD",
    last24hNetCost: 0,
    last7dNetCost: 0,
    monthToDateNetCost: 0,
    lastNDaysNetCost: 0,
    geminiFlashLastNDaysNetCost: 0,
    geminiNonFlashLastNDaysNetCost: 0,
    geminiTotalLastNDaysNetCost: 0,
    dailyTrendLastNDays: [],
    topServicesLastNDays: [],
    breakdownByApiLastNDays: [],
    projectBreakdownLastNDays: [],
  };

  let vmBreakdown = [];

  if (usageStats.numRows > 0) {
    const params = {
      start_24h: toTs(addDays(utcToday, -1)),
      start_7d: toTs(start7),
      start_mtd: toTs(startMonth),
      start_n: toTs(startNDays),
      end_exclusive: toTs(utcTomorrow),
    };

    const [summaryRows, serviceRows, apiRows, projectRows, dailyRows, geminiRows] = await Promise.all([
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
  FROM \`${usageTableId}\`
  WHERE usage_start_time >= @start_n
    AND usage_start_time < @end_exclusive
)
`,
        params,
      ),
      runQuery(
        bigquery,
        `
SELECT
  service.description AS service_description,
  ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 6) AS net_cost
FROM \`${usageTableId}\`
WHERE usage_start_time >= @start_n
  AND usage_start_time < @end_exclusive
GROUP BY service_description
ORDER BY net_cost DESC
LIMIT 20
`,
        params,
      ),
      runQuery(
        bigquery,
        `
SELECT
  service.description AS api_service,
  sku.description AS sku,
  ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 6) AS net_cost
FROM \`${usageTableId}\`
WHERE usage_start_time >= @start_n
  AND usage_start_time < @end_exclusive
GROUP BY api_service, sku
ORDER BY net_cost DESC
LIMIT 50
`,
        params,
      ),
      runQuery(
        bigquery,
        `
SELECT
  project.id AS project_id,
  project.name AS project_name,
  ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 6) AS net_cost
FROM \`${usageTableId}\`
WHERE usage_start_time >= @start_n
  AND usage_start_time < @end_exclusive
GROUP BY project_id, project_name
ORDER BY net_cost DESC
LIMIT 30
`,
        params,
      ),
      runQuery(
        bigquery,
        `
SELECT
  DATE(usage_start_time) AS usage_date,
  ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 6) AS net_cost
FROM \`${usageTableId}\`
WHERE usage_start_time >= @start_n
  AND usage_start_time < @end_exclusive
GROUP BY usage_date
ORDER BY usage_date ASC
`,
        params,
      ),
      runQuery(
        bigquery,
        `
SELECT
  ROUND(SUM(IF(LOWER(sku_description) LIKE '%gemini%' AND LOWER(sku_description) LIKE '%flash%', net_cost, 0)), 6) AS flash_net_cost,
  ROUND(SUM(IF(LOWER(sku_description) LIKE '%gemini%' AND NOT LOWER(sku_description) LIKE '%flash%', net_cost, 0)), 6) AS non_flash_net_cost,
  ROUND(SUM(IF(LOWER(sku_description) LIKE '%gemini%' OR LOWER(service_description) LIKE '%gemini%', net_cost, 0)), 6) AS total_net_cost
FROM (
  SELECT
    sku.description AS sku_description,
    service.description AS service_description,
    cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0) AS net_cost
  FROM \`${usageTableId}\`
  WHERE usage_start_time >= @start_n
    AND usage_start_time < @end_exclusive
)
`,
        params,
      ),
    ]);

    const summary = summaryRows[0] || {};
    const gemini = geminiRows[0] || {};

    spend.currency = summary.currency || "USD";
    spend.last24hNetCost = number(summary.last_24h_net_cost);
    spend.last7dNetCost = number(summary.last_7d_net_cost);
    spend.monthToDateNetCost = number(summary.mtd_net_cost);
    spend.lastNDaysNetCost = number(summary.last_n_days_net_cost);
    spend.geminiFlashLastNDaysNetCost = number(gemini.flash_net_cost);
    spend.geminiNonFlashLastNDaysNetCost = number(gemini.non_flash_net_cost);
    spend.geminiTotalLastNDaysNetCost = number(gemini.total_net_cost);
    spend.topServicesLastNDays = serviceRows.map((row) => ({
      serviceDescription: row.service_description || "",
      netCost: number(row.net_cost),
    }));
    spend.breakdownByApiLastNDays = apiRows.map((row) => ({
      apiService: row.api_service || "",
      sku: row.sku || "",
      netCost: number(row.net_cost),
    }));
    spend.projectBreakdownLastNDays = projectRows.map((row) => ({
      projectId: row.project_id || "",
      projectName: row.project_name || "",
      netCost: number(row.net_cost),
    }));
    spend.dailyTrendLastNDays = dailyRows.map((row) => ({
      usageDate: row.usage_date?.value || row.usage_date || "",
      netCost: number(row.net_cost),
    }));
  }

  if (resourceTableId && resourceStats?.numRows > 0) {
    const vmRows = await runQuery(
      bigquery,
      `
SELECT
  COALESCE(
    NULLIF(resource.name, ''),
    NULLIF(REGEXP_EXTRACT(resource.global_name, r'/instances/([^/]+)$'), ''),
    NULLIF(resource.global_name, ''),
    '(unknown)'
  ) AS instance_name,
  project.id AS project_id,
  project.name AS project_name,
  location.zone AS zone,
  ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 6) AS net_cost,
  ROUND(SUM(cost), 6) AS gross_cost
FROM \`${resourceTableId}\`
WHERE usage_start_time >= @start_n
  AND usage_start_time < @end_exclusive
  AND LOWER(service.description) LIKE '%compute engine%'
GROUP BY instance_name, project_id, project_name, zone
ORDER BY net_cost DESC
LIMIT 100
`,
      {
        start_n: toTs(startNDays),
        end_exclusive: toTs(utcTomorrow),
      },
    );

    vmBreakdown = vmRows.map((row) => ({
      instanceName: row.instance_name || "",
      projectId: row.project_id || "",
      projectName: row.project_name || "",
      zone: row.zone || "",
      netCost: number(row.net_cost),
      grossCost: number(row.gross_cost),
    }));
  }

  const budgetInfo = await fetchBudgets({
    billingAccount: billingAccountId,
    credentialsPath: credentialInfo.path,
  });

  const alerts = buildAlerts({
    usageStats,
    pricingStats,
    spend,
    budgetInfo,
    options,
  });

  const output = {
    generatedAtUtc: new Date().toISOString(),
    source: {
      queryProjectId: projectId || null,
      usageTableId,
      resourceTableId,
      usageTableStats: usageStats,
      resourceTableStats: resourceStats,
      pricingTableStats: pricingStats,
      billingAccountId,
      tableDiscoveryWarnings: tableResolution.warnings,
    },
    range: {
      days: options.days,
      startDate: toIsoDate(startNDays),
      endDate: toIsoDate(utcToday),
    },
    thresholds: {
      dailyAlertUsd: options.dailyAlertUsd,
      mtdAlertUsd: options.mtdAlertUsd,
    },
    spend,
    vmInstanceBreakdownLastNDays: vmBreakdown,
    budgets: budgetInfo,
    alerts,
  };

  const outPath = options.outPath || defaultOutPath();
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(output, null, options.pretty ? 2 : 0) + "\n", "utf8");

  printSummary(output, outPath);

  if (options.failOnAlert && alerts.some((a) => a.level === "critical")) {
    process.exit(2);
  }
}

function parseArgs(args) {
  const options = {
    days: DEFAULT_DAYS,
    projectId: "",
    usageTableId: "",
    resourceTableId: "",
    billingAccount: "",
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

    if (arg.startsWith("--usage-table=")) {
      options.usageTableId = String(arg.split("=")[1] || "").trim();
      continue;
    }
    if (arg === "--usage-table") {
      options.usageTableId = String(args[i + 1] || "").trim();
      i += 1;
      continue;
    }

    if (arg.startsWith("--resource-table=")) {
      options.resourceTableId = String(arg.split("=")[1] || "").trim();
      continue;
    }
    if (arg === "--resource-table") {
      options.resourceTableId = String(args[i + 1] || "").trim();
      i += 1;
      continue;
    }

    if (arg.startsWith("--billing-account=")) {
      options.billingAccount = String(arg.split("=")[1] || "").trim();
      continue;
    }
    if (arg === "--billing-account") {
      options.billingAccount = String(args[i + 1] || "").trim();
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
  node scripts/gcp-cost-overview.mjs [options]

Options:
  --project <project-id>             Query project id (optional)
  --usage-table <project.dataset.table>
  --resource-table <project.dataset.table>
  --billing-account <id>             Billing account id (01FC2B-...) or billingAccounts/... (optional)
  --days <N>                         Spend window for breakdowns (default: ${DEFAULT_DAYS})
  --daily-alert-usd <N>              Daily critical threshold (default: ${DEFAULT_DAILY_ALERT_USD})
  --mtd-alert-usd <N>                MTD critical threshold (default: ${DEFAULT_MTD_ALERT_USD})
  --fail-on-alert                    Exit 2 when critical alerts exist
  --out <path>                       Output json path
  --no-pretty                        Compact json output
  -h, --help                         Show help
`);
}

async function resolveBillingTables(options, primaryProjectId) {
  const warnings = [];

  const usageConfigured = (options.usageTableId || process.env.GCP_BILLING_EXPORT_TABLE || "").trim();
  const resourceConfigured = (options.resourceTableId || process.env.GCP_BILLING_RESOURCE_EXPORT_TABLE || "").trim();

  if (usageConfigured) {
    validateTableId(usageConfigured);
  }
  if (resourceConfigured) {
    validateTableId(resourceConfigured);
  }

  if (usageConfigured && resourceConfigured) {
    return {
      usageTableId: usageConfigured,
      resourceTableId: resourceConfigured,
      warnings,
    };
  }

  const projectCandidates = resolveProjectCandidates(options, primaryProjectId);
  if (!projectCandidates.length) {
    throw new Error("No project candidates available to auto-discover billing tables.");
  }

  let selectedUsage = usageConfigured;
  let selectedResource = resourceConfigured;

  for (const projectId of projectCandidates) {
    const bq = new BigQuery({ projectId });
    let discovered;
    try {
      discovered = await discoverBillingTables(bq, projectId);
    } catch (error) {
      warnings.push(`Skipping project '${projectId}': ${formatError(error)}`);
      continue;
    }

    if (!selectedUsage && discovered.usageCandidates.length) {
      selectedUsage = discovered.usageCandidates[0].fullId;
      warnings.push(
        `Auto-discovered usage table in '${projectId}': ${selectedUsage}${
          discovered.usageCandidates.length > 1 ? ` (candidates=${discovered.usageCandidates.length})` : ""
        }`,
      );
    }

    if (!selectedResource && discovered.resourceCandidates.length) {
      const usageSuffix = selectedUsage ? suffixFromTableName(parseTableId(selectedUsage).tableName) : "";
      const matched = usageSuffix
        ? discovered.resourceCandidates.find((candidate) => suffixFromTableName(parseTableId(candidate.fullId).tableName) === usageSuffix)
        : null;
      selectedResource = (matched || discovered.resourceCandidates[0]).fullId;
      warnings.push(
        `Auto-discovered resource table in '${projectId}': ${selectedResource}${
          discovered.resourceCandidates.length > 1 ? ` (candidates=${discovered.resourceCandidates.length})` : ""
        }`,
      );
    }

    if (selectedUsage && selectedResource) {
      break;
    }
  }

  if (!selectedUsage) {
    throw new Error(`No usage export table found in scanned projects (${projectCandidates.join(", ")}).`);
  }

  return {
    usageTableId: selectedUsage,
    resourceTableId: selectedResource,
    warnings,
  };
}

async function discoverBillingTables(bigquery, projectId) {
  const usageCandidates = [];
  const resourceCandidates = [];

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
      const fullId = `${projectId}.${datasetId}.${tableId}`;
      const updated = Number(table?.metadata?.lastModifiedTime || table?.metadata?.creationTime || 0) || 0;

      if (lower.startsWith("gcp_billing_export_v1_")) {
        usageCandidates.push({ fullId, updated });
      }
      if (lower.startsWith("gcp_billing_export_resource_v1_")) {
        resourceCandidates.push({ fullId, updated });
      }
    }
  }

  usageCandidates.sort((a, b) => b.updated - a.updated || a.fullId.localeCompare(b.fullId));
  resourceCandidates.sort((a, b) => b.updated - a.updated || a.fullId.localeCompare(b.fullId));

  return { usageCandidates, resourceCandidates };
}

async function fetchBudgets({ billingAccount, credentialsPath }) {
  const result = {
    ok: false,
    billingAccount: billingAccount ? normalizeBillingAccount(billingAccount) : "",
    budgets: [],
    warning: "",
  };

  if (!result.billingAccount) {
    result.warning = "Billing account was not provided or detected, so budgets were not queried.";
    return result;
  }

  try {
    const auth = new GoogleAuth({
      keyFilename: credentialsPath || undefined,
      scopes: [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/cloud-billing",
      ],
    });
    const client = await auth.getClient();
    const budgetsApi = google.billingbudgets({ version: "v1", auth: client });
    const res = await budgetsApi.billingAccounts.budgets.list({ parent: result.billingAccount });
    result.ok = true;
    result.budgets = (res.data.budgets || []).map((budget) => {
      const limit = budget.amount?.specifiedAmount;
      const units = Number(limit?.units || 0);
      const nanos = Number(limit?.nanos || 0) / 1e9;
      return {
        name: budget.name || "",
        displayName: budget.displayName || "",
        monthlyLimitUsd: round(units + nanos, 6),
        thresholdRules: (budget.thresholdRules || []).map((rule) => ({
          thresholdPercent: Number(rule.thresholdPercent || 0),
          spendBasis: rule.spendBasis || "",
        })),
        notificationsRule: {
          disableDefaultIamRecipients: Boolean(budget.notificationsRule?.disableDefaultIamRecipients),
          monitoringNotificationChannels: budget.notificationsRule?.monitoringNotificationChannels || [],
          pubsubTopic: budget.notificationsRule?.pubsubTopic || "",
          schemaVersion: budget.notificationsRule?.schemaVersion || "",
        },
        projectFilters: budget.budgetFilter?.projects || [],
      };
    });
  } catch (error) {
    result.warning = formatError(error);
  }

  return result;
}

function buildAlerts({ usageStats, pricingStats, spend, budgetInfo, options }) {
  const alerts = [];

  if (usageStats.numRows === 0) {
    alerts.push({
      level: "warning",
      code: "USAGE_EXPORT_EMPTY",
      message:
        "Usage-cost billing export table has 0 rows. Enable Standard usage cost + Detailed usage cost and wait for daily export.",
    });
  }

  if (pricingStats.exists && pricingStats.numRows > 0 && usageStats.numRows === 0) {
    alerts.push({
      level: "warning",
      code: "PRICING_ONLY_EXPORT",
      message: "Pricing export is populated but usage export is empty, so current spend breakdown is not yet available.",
    });
  }

  if (spend.last24hNetCost > options.dailyAlertUsd) {
    alerts.push({
      level: "critical",
      code: "DAILY_COST_THRESHOLD",
      message: `Last 24h spend ${formatUsd(spend.last24hNetCost)} exceeded ${formatUsd(options.dailyAlertUsd)}.`,
    });
  }

  if (spend.monthToDateNetCost > options.mtdAlertUsd) {
    alerts.push({
      level: "critical",
      code: "MTD_COST_THRESHOLD",
      message: `Month-to-date spend ${formatUsd(spend.monthToDateNetCost)} exceeded ${formatUsd(options.mtdAlertUsd)}.`,
    });
  }

  if (!budgetInfo.ok) {
    alerts.push({
      level: "warning",
      code: "BUDGETS_UNAVAILABLE",
      message: budgetInfo.warning || "Could not query budgets.",
    });
  } else if (budgetInfo.budgets.length === 0) {
    alerts.push({
      level: "warning",
      code: "NO_BUDGETS",
      message: `No budgets configured for ${budgetInfo.billingAccount}.`,
    });
  } else {
    for (const budget of budgetInfo.budgets) {
      if (!budget.monthlyLimitUsd || budget.monthlyLimitUsd <= 0) {
        continue;
      }

      const ratio = budget.monthlyLimitUsd > 0 ? spend.monthToDateNetCost / budget.monthlyLimitUsd : 0;
      for (const rule of budget.thresholdRules) {
        const threshold = Number(rule.thresholdPercent || 0);
        if (threshold > 0 && ratio >= threshold) {
          alerts.push({
            level: threshold >= 1 ? "critical" : "warning",
            code: "BUDGET_THRESHOLD_REACHED",
            message:
              `${budget.displayName || budget.name}: MTD ${formatUsd(spend.monthToDateNetCost)} has reached ` +
              `${round(ratio * 100, 2)}% of budget ${formatUsd(budget.monthlyLimitUsd)} (threshold ${(threshold * 100).toFixed(0)}%).`,
          });
        }
      }
    }
  }

  return alerts;
}

function printSummary(report, outPath) {
  console.log(`Saved cost overview to ${outPath}`);
  console.log(`Billing account: ${report.source.billingAccountId || "(unknown)"}`);
  console.log(`Usage table rows: ${report.source.usageTableStats.numRows}`);
  console.log(`Resource table rows: ${report.source.resourceTableStats?.numRows ?? 0}`);
  console.log(`Pricing table rows: ${report.source.pricingTableStats.numRows}`);
  console.log(`Spend last 24h: ${formatUsd(report.spend.last24hNetCost)}`);
  console.log(`Spend MTD: ${formatUsd(report.spend.monthToDateNetCost)}`);
  console.log(`Spend last ${report.range.days}d: ${formatUsd(report.spend.lastNDaysNetCost)}`);
  console.log(
    `Gemini last ${report.range.days}d: flash=${formatUsd(report.spend.geminiFlashLastNDaysNetCost)} non-flash=${formatUsd(report.spend.geminiNonFlashLastNDaysNetCost)} total=${formatUsd(report.spend.geminiTotalLastNDaysNetCost)}`,
  );
  console.log(`Budgets visible: ${report.budgets.budgets.length}`);
  if (report.alerts.length) {
    console.log("Alerts:");
    report.alerts.forEach((alert, index) => {
      console.log(`${index + 1}. [${alert.level}] ${alert.code} - ${alert.message}`);
    });
  }
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePositiveFloat(value, fallback) {
  const parsed = Number(String(value || "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveProjectCandidates(options, primaryProjectId) {
  const candidates = [];
  const envList = String(process.env.GCP_BILLING_CANDIDATE_PROJECTS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const pushUnique = (value) => {
    const normalized = String(value || "").trim();
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
  pushUnique("generalautomations-sites");
  pushUnique("automations-485317");

  return candidates;
}

function validateTableId(tableId) {
  if (!tableId) {
    throw new Error("Missing table id.");
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

function suffixFromTableName(tableName) {
  const idx = tableName.indexOf("_v1_");
  if (idx === -1) {
    return "";
  }
  return tableName.slice(idx + 4).toLowerCase();
}

function normalizeBillingAccount(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  if (raw.startsWith("billingAccounts/")) {
    return raw;
  }
  if (/^[A-F0-9]{6}-[A-F0-9]{6}-[A-F0-9]{6}$/i.test(raw)) {
    return `billingAccounts/${raw.toUpperCase()}`;
  }
  return raw;
}

function extractBillingAccountFromTable(tableId) {
  if (!tableId) {
    return "";
  }
  const { tableName } = parseTableId(tableId);
  const match = tableName.match(/([A-F0-9]{6})_([A-F0-9]{6})_([A-F0-9]{6})$/i);
  if (!match) {
    return "";
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

async function readSiblingPricingStats(bigquery, usageTableId) {
  const { projectId, datasetId } = parseTableId(usageTableId);
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

async function runQuery(bigquery, query, params) {
  const [job] = await bigquery.createQueryJob({ query, params, useLegacySql: false });
  const [rows] = await job.getQueryResults();
  return rows;
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

function millisToIso(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return new Date(n).toISOString();
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(number(value) * factor) / factor;
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number(value));
}

function defaultOutPath() {
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return path.resolve(DEFAULT_OUT_DIR, `gcp-cost-overview-${stamp}.json`);
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
