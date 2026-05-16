#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import { GoogleAuth, OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

const DEFAULT_DAYS = 30;
const DEFAULT_OUT_DIR = "metrics";
const SCOPES = {
  ga4: ["https://www.googleapis.com/auth/analytics.readonly"],
  adsense: ["https://www.googleapis.com/auth/adsense.readonly"],
  googleAds: ["https://www.googleapis.com/auth/adwords"],
};

loadEnv();
const credentialInfo = await configureDefaultCredentials();

const options = parseArgs(process.argv.slice(2));
const range = resolveDateRange(options.days);

const result = {
  generatedAtUtc: new Date().toISOString(),
  range,
  options: {
    includeGa4: options.includeGa4,
    includeAdSense: options.includeAdSense,
    includeGoogleAds: options.includeGoogleAds,
    ga4SummaryOnly: options.ga4SummaryOnly,
  },
  status: {
    ga4: "skipped",
    adsense: "skipped",
    googleAds: "skipped",
  },
  warnings: [],
  errors: [],
  ga4: null,
  adsense: null,
  googleAds: null,
};

const collectors = [];
if (options.includeGa4) {
  collectors.push(withSourceTimeout("ga4", collectGa4(range)));
}
if (options.includeAdSense) {
  collectors.push(withSourceTimeout("adsense", collectAdSense(range)));
}
if (options.includeGoogleAds) {
  collectors.push(withSourceTimeout("googleAds", collectGoogleAds(range)));
}

const settled = await Promise.allSettled(collectors);
for (const collector of settled) {
  if (collector.status === "fulfilled") {
    applyCollectorResult(result, collector.value);
  } else {
    result.errors.push(formatError(collector.reason));
  }
}

const outPath = options.outPath || defaultOutPath();
await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, JSON.stringify(result, null, options.pretty ? 2 : 0) + "\n", "utf8");

const okCount = Object.values(result.status).filter((s) => s === "ok").length;
const warningCount = result.warnings.length;
const errorCount = result.errors.length;

if (options.ga4SummaryOnly) {
  if (result.status.ga4 === "ok" && result.ga4?.summary) {
    const summary = result.ga4.summary;
    console.log(`GA4 summary (${range.startDate}..${range.endDate}) property=${result.ga4.propertyId}:`);
    console.log(
      `  activeUsers=${metricValue(summary.activeUsers)} sessions=${metricValue(summary.sessions)} screenPageViews=${metricValue(summary.screenPageViews)}`,
    );
    process.exit(0);
  }

  const firstIssue = result.errors[0] || result.warnings[0] || "GA4 summary unavailable.";
  console.error(`GA4 summary unavailable: ${firstIssue}`);
  process.exit(1);
}

if (credentialInfo.mode === "auto-local") {
  console.log(`Auth: using local service account key at ${credentialInfo.path}`);
} else if (credentialInfo.mode === "env") {
  console.log(`Auth: using GOOGLE_APPLICATION_CREDENTIALS=${credentialInfo.path}`);
}
console.log(`Saved metrics snapshot to ${outPath}`);
console.log(`Status: ${okCount} source(s) ok, ${warningCount} warning(s), ${errorCount} error(s).`);
if (result.status.ga4 === "ok" && result.ga4?.summary) {
  const summary = result.ga4.summary;
  console.log(
    `GA4 summary (${range.startDate}..${range.endDate}) property=${result.ga4.propertyId}: ` +
      `activeUsers=${metricValue(summary.activeUsers)} ` +
      `sessions=${metricValue(summary.sessions)} ` +
      `screenPageViews=${metricValue(summary.screenPageViews)}`,
  );
}
if (warningCount > 0) {
  console.log("Warnings:");
  result.warnings.forEach((warning, index) => {
    console.log(`${index + 1}. ${warning}`);
  });
}
if (errorCount > 0) {
  console.log("Errors:");
  result.errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error}`);
  });
}
const authIssuesText = [...result.warnings, ...result.errors].join(" ");
if (/invalid_rapt|invalid_grant|reauth/i.test(authIssuesText)) {
  console.log("Re-auth required. Run:");
  console.log("  gcloud auth login");
  console.log("  gcloud auth application-default login");
}
if (/insufficient authentication scopes/i.test(authIssuesText)) {
  console.log("Additional OAuth scopes required. Run:");
  console.log(
    "  gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/adsense.readonly,https://www.googleapis.com/auth/adwords",
  );
}

if (okCount === 0) {
  console.error("No metrics source succeeded. Check credentials/env and rerun.");
  process.exit(1);
}

process.exit(0);

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

function parseArgs(args) {
  const options = {
    days: DEFAULT_DAYS,
    outPath: "",
    pretty: true,
    includeGa4: true,
    includeAdSense: false,
    includeGoogleAds: false,
    ga4SummaryOnly: true,
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

    if (arg === "--no-ga4") {
      options.includeGa4 = false;
      continue;
    }

    if (arg === "--no-adsense") {
      options.includeAdSense = false;
      continue;
    }

    if (arg === "--no-google-ads") {
      options.includeGoogleAds = false;
      continue;
    }

    if (arg === "--full") {
      options.ga4SummaryOnly = false;
      options.includeGa4 = true;
      options.includeAdSense = true;
      options.includeGoogleAds = true;
      continue;
    }

    if (arg === "--ga4-summary-only") {
      options.ga4SummaryOnly = true;
      options.includeGa4 = true;
      options.includeAdSense = false;
      options.includeGoogleAds = false;
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

    if (arg.startsWith("--out=")) {
      options.outPath = path.resolve(arg.split("=")[1]);
      continue;
    }

    if (arg === "--out") {
      options.outPath = path.resolve(args[i + 1] || "");
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/google-metrics.mjs [options]

Options:
  --days <N>            Date range window length (default: ${DEFAULT_DAYS})
  --out <path>          Output JSON path (default: ${DEFAULT_OUT_DIR}/google-metrics-<timestamp>.json)
  --no-pretty           Compact JSON output
  --full                Enable GA4 + AdSense + Google Ads collection
  --no-ga4              Skip GA4 collection
  --no-adsense          Skip AdSense collection
  --no-google-ads       Skip Google Ads collection
  --ga4-summary-only    Print only GA4 summary line block (default)
  -h, --help            Show this help
`);
}

function resolveDateRange(days) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return {
    days,
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function defaultOutPath() {
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return path.resolve(DEFAULT_OUT_DIR, `google-metrics-${stamp}.json`);
}

function applyCollectorResult(target, collectorResult) {
  if (!collectorResult || typeof collectorResult !== "object") {
    return;
  }

  const { source, status, payload, warnings, error } = collectorResult;
  if (!source) {
    return;
  }

  target.status[source] = status;

  if (payload) {
    target[source] = payload;
  }

  if (Array.isArray(warnings)) {
    target.warnings.push(...warnings.map((w) => `${source}: ${w}`));
  }

  if (error) {
    target.errors.push(`${source}: ${error}`);
  }
}

function withSourceTimeout(source, promise, timeoutMs = 30_000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        source,
        status: "error",
        error: `Timed out after ${timeoutMs}ms while collecting ${source} metrics.`,
      });
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        resolve({
          source,
          status: "error",
          error: formatError(error),
        });
      });
  });
}

async function collectGa4(range) {
  const auth = new GoogleAuth({ scopes: SCOPES.ga4 });
  const authClient = await auth.getClient();
  const requestedPropertyId = String(process.env.GA4_PROPERTY_ID || "").trim();
  const measurementIdHint = String(process.env.GA4_MEASUREMENT_ID || process.env.VITE_GA_MEASUREMENT_ID || "").trim();
  const discovery = await resolveGa4PropertyId(authClient, requestedPropertyId, measurementIdHint);
  const propertyId = discovery.propertyId;

  if (!propertyId) {
    return {
      source: "ga4",
      status: "skipped",
      warnings: [
        "Unable to resolve GA4 property. Set GA4_PROPERTY_ID, or set GA4_MEASUREMENT_ID/VITE_GA_MEASUREMENT_ID for auto-discovery.",
        ...discovery.warnings,
      ],
    };
  }

  try {
    const analyticsData = google.analyticsdata({ version: "v1beta", auth: authClient });
    const property = `properties/${propertyId}`;

    const sharedDateRanges = [{ startDate: range.startDate, endDate: range.endDate }];

    const [summaryCore, summaryRates, dailyTrend, topPages, channels, devices, countries] = await Promise.all([
      runGa4Report(analyticsData, property, {
        dateRanges: sharedDateRanges,
        metrics: [
          { name: "activeUsers" },
          { name: "newUsers" },
          { name: "totalUsers" },
          { name: "sessions" },
          { name: "engagedSessions" },
          { name: "screenPageViews" },
          { name: "eventCount" },
          { name: "conversions" },
          { name: "totalRevenue" },
          { name: "averageSessionDuration" },
        ],
      }),
      runGa4Report(analyticsData, property, {
        dateRanges: sharedDateRanges,
        metrics: [
          { name: "bounceRate" },
          { name: "engagementRate" },
        ],
      }),
      runGa4Report(analyticsData, property, {
        dateRanges: sharedDateRanges,
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "eventCount" },
          { name: "conversions" },
          { name: "totalRevenue" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 400,
      }),
      runGa4Report(analyticsData, property, {
        dateRanges: sharedDateRanges,
        dimensions: [{ name: "pagePathPlusQueryString" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }, { name: "engagedSessions" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 50,
      }),
      runGa4Report(analyticsData, property, {
        dateRanges: sharedDateRanges,
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "conversions" }, { name: "totalRevenue" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 25,
      }),
      runGa4Report(analyticsData, property, {
        dateRanges: sharedDateRanges,
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      }),
      runGa4Report(analyticsData, property, {
        dateRanges: sharedDateRanges,
        dimensions: [{ name: "country" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "conversions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 25,
      }),
    ]);

    const payload = {
      propertyId,
      summary: {
        ...ga4Totals(summaryCore),
        ...ga4Totals(summaryRates),
      },
      dailyTrend: ga4Rows(dailyTrend),
      topPages: ga4Rows(topPages),
      channels: ga4Rows(channels),
      devices: ga4Rows(devices),
      countries: ga4Rows(countries),
    };

    const warnings = [
      ...discovery.warnings,
      ...(summaryCore?.metadata?.currencyCode ? [] : ["GA4 report did not return a currency code in metadata."]),
    ];

    return { source: "ga4", status: "ok", payload, warnings };
  } catch (error) {
    return { source: "ga4", status: "error", error: formatError(error) };
  }
}

async function resolveGa4PropertyId(authClient, requestedPropertyId, measurementIdHint) {
  if (requestedPropertyId) {
    return { propertyId: requestedPropertyId, warnings: [] };
  }

  const warnings = [];

  try {
    const admin = google.analyticsadmin({ version: "v1beta", auth: authClient });
    const accountSummaries = [];
    let pageToken = "";

    // Keep pages bounded for safety; 10 pages is already many accounts/properties.
    for (let i = 0; i < 10; i += 1) {
      const response = await admin.accountSummaries.list({
        pageSize: 200,
        pageToken: pageToken || undefined,
      });
      const items = Array.isArray(response.data.accountSummaries) ? response.data.accountSummaries : [];
      accountSummaries.push(...items);
      pageToken = response.data.nextPageToken || "";
      if (!pageToken) {
        break;
      }
    }

    const properties = [];
    for (const account of accountSummaries) {
      const propertySummaries = Array.isArray(account.propertySummaries) ? account.propertySummaries : [];
      for (const propertySummary of propertySummaries) {
        const propertyRef = String(propertySummary.property || "").trim();
        const numericId = propertyRef.replace(/^properties\//, "");
        if (numericId) {
          properties.push({
            propertyRef,
            propertyId: numericId,
            displayName: propertySummary.displayName || "",
          });
        }
      }
    }

    if (!properties.length) {
      warnings.push("No GA4 properties found in analyticsadmin.accountSummaries.list.");
      return { propertyId: "", warnings };
    }

    if (measurementIdHint) {
      for (const property of properties) {
        try {
          const streamResponse = await admin.properties.dataStreams.list({
            parent: property.propertyRef,
            pageSize: 200,
          });
          const streams = Array.isArray(streamResponse.data.dataStreams) ? streamResponse.data.dataStreams : [];
          const matched = streams.some((stream) => {
            const web = stream.webStreamData;
            return web?.measurementId && web.measurementId.trim() === measurementIdHint;
          });
          if (matched) {
            return {
              propertyId: property.propertyId,
              warnings: [`Auto-resolved GA4 property via measurement ID ${measurementIdHint}.`],
            };
          }
        } catch (streamError) {
          warnings.push(
            `Failed checking data streams for ${property.propertyRef}: ${formatError(streamError)}`,
          );
        }
      }
      warnings.push(`No property matched measurement ID ${measurementIdHint}.`);
    }

    if (properties.length === 1) {
      return {
        propertyId: properties[0].propertyId,
        warnings: [
          `Auto-selected only available GA4 property: ${properties[0].propertyRef}${properties[0].displayName ? ` (${properties[0].displayName})` : ""}.`,
        ],
      };
    }

    return {
      propertyId: properties[0].propertyId,
      warnings: [
        `Multiple GA4 properties found (${properties.length}). Defaulted to ${properties[0].propertyRef}. Set GA4_PROPERTY_ID to pin one.`,
      ],
    };
  } catch (error) {
    warnings.push(`GA4 property auto-discovery failed: ${formatError(error)}`);
    return { propertyId: "", warnings };
  }
}

async function runGa4Report(analyticsData, property, requestBody) {
  const response = await analyticsData.properties.runReport({
    property,
    requestBody,
  });
  return response.data || {};
}

function ga4Totals(report) {
  const metricHeaders = Array.isArray(report.metricHeaders) ? report.metricHeaders.map((h) => h.name || "") : [];
  const totals = report.totals?.[0]?.metricValues || report.rows?.[0]?.metricValues || [];
  const summary = {};
  metricHeaders.forEach((name, index) => {
    summary[name] = parseMaybeNumber(totals[index]?.value);
  });
  return summary;
}

function ga4Rows(report) {
  const dimensionHeaders = Array.isArray(report.dimensionHeaders) ? report.dimensionHeaders.map((h) => h.name || "") : [];
  const metricHeaders = Array.isArray(report.metricHeaders) ? report.metricHeaders.map((h) => h.name || "") : [];
  const rows = Array.isArray(report.rows) ? report.rows : [];

  return rows.map((row) => {
    const entry = {};

    dimensionHeaders.forEach((name, index) => {
      entry[name] = row.dimensionValues?.[index]?.value ?? "";
    });

    metricHeaders.forEach((name, index) => {
      entry[name] = parseMaybeNumber(row.metricValues?.[index]?.value);
    });

    return entry;
  });
}

async function collectAdSense(range) {
  const configuredAccount = String(process.env.ADSENSE_ACCOUNT || "").trim();

  try {
    const auth = new GoogleAuth({ scopes: SCOPES.adsense });
    const authClient = await auth.getClient();
    const adsense = google.adsense({ version: "v2", auth: authClient });
    const accountsResponse = await adsense.accounts.list({ pageSize: 100 });
    const accounts = Array.isArray(accountsResponse.data.accounts) ? accountsResponse.data.accounts : [];

    if (!accounts.length) {
      return {
        source: "adsense",
        status: "error",
        error: "No AdSense accounts returned for this credential.",
      };
    }

    const selectedAccount = configuredAccount || accounts[0].name || "";
    if (!selectedAccount) {
      return {
        source: "adsense",
        status: "error",
        error: "Unable to resolve an AdSense account name.",
      };
    }

    const dateParts = buildAdSenseDateParams(range);
    const metricSet = [
      "IMPRESSIONS",
      "CLICKS",
      "ESTIMATED_EARNINGS",
      "PAGE_VIEWS",
      "PAGE_VIEWS_RPM",
      "IMPRESSIONS_RPM",
      "ACTIVE_VIEW_VIEWABILITY",
      "MATCHED_AD_REQUESTS",
    ];

    const summaryReport = await adsense.accounts.reports.generate({
      account: selectedAccount,
      ...dateParts,
      metrics: metricSet,
      reportingTimeZone: "ACCOUNT_TIME_ZONE",
    });

    const dailyReport = await adsense.accounts.reports.generate({
      account: selectedAccount,
      ...dateParts,
      dimensions: ["DATE"],
      metrics: metricSet,
      orderBy: ["+DATE"],
      limit: 500,
      reportingTimeZone: "ACCOUNT_TIME_ZONE",
    });

    const adClientReport = await adsense.accounts.reports.generate({
      account: selectedAccount,
      ...dateParts,
      dimensions: ["AD_CLIENT_ID"],
      metrics: metricSet,
      orderBy: ["-ESTIMATED_EARNINGS"],
      limit: 100,
      reportingTimeZone: "ACCOUNT_TIME_ZONE",
    });

    const countryReport = await adsense.accounts.reports.generate({
      account: selectedAccount,
      ...dateParts,
      dimensions: ["COUNTRY_CODE"],
      metrics: metricSet,
      orderBy: ["-ESTIMATED_EARNINGS"],
      limit: 75,
      reportingTimeZone: "ACCOUNT_TIME_ZONE",
    });

    const payload = {
      account: selectedAccount,
      availableAccounts: accounts.map((a) => ({
        name: a.name || "",
        displayName: a.displayName || "",
        state: a.state || "",
        currencyCode: a.currencyCode || "",
      })),
      summary: adsenseTotals(summaryReport.data),
      dailyTrend: adsenseRows(dailyReport.data),
      byAdClient: adsenseRows(adClientReport.data),
      byCountry: adsenseRows(countryReport.data),
    };

    const warnings = [];
    if (configuredAccount && configuredAccount !== selectedAccount) {
      warnings.push(`Requested ADSENSE_ACCOUNT '${configuredAccount}' was not used; defaulted to '${selectedAccount}'.`);
    }
    if (Array.isArray(summaryReport.data?.warnings) && summaryReport.data.warnings.length) {
      warnings.push(...summaryReport.data.warnings);
    }

    return { source: "adsense", status: "ok", payload, warnings };
  } catch (error) {
    return { source: "adsense", status: "error", error: formatError(error) };
  }
}

function buildAdSenseDateParams(range) {
  const [startYear, startMonth, startDay] = range.startDate.split("-").map((v) => Number.parseInt(v, 10));
  const [endYear, endMonth, endDay] = range.endDate.split("-").map((v) => Number.parseInt(v, 10));

  return {
    dateRange: "CUSTOM",
    "startDate.year": startYear,
    "startDate.month": startMonth,
    "startDate.day": startDay,
    "endDate.year": endYear,
    "endDate.month": endMonth,
    "endDate.day": endDay,
  };
}

function adsenseRows(report) {
  const headers = Array.isArray(report?.headers) ? report.headers : [];
  const headerNames = headers.map((header) => header.name || "");
  const rows = Array.isArray(report?.rows) ? report.rows : [];

  return rows.map((row) => {
    const entry = {};
    const cells = Array.isArray(row?.cells) ? row.cells : [];

    headerNames.forEach((headerName, index) => {
      entry[headerName] = parseMaybeNumber(cells[index]?.value);
    });

    return entry;
  });
}

function adsenseTotals(report) {
  const headers = Array.isArray(report?.headers) ? report.headers : [];
  const headerNames = headers.map((header) => header.name || "");
  const totalCells = Array.isArray(report?.totals?.cells) ? report.totals.cells : [];
  const summary = {};

  headerNames.forEach((headerName, index) => {
    summary[headerName] = parseMaybeNumber(totalCells[index]?.value);
  });

  return summary;
}

async function collectGoogleAds(range) {
  const customerId = normalizeCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const developerToken = String(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "").trim();

  if (!customerId) {
    return {
      source: "googleAds",
      status: "skipped",
      warnings: ["Set GOOGLE_ADS_CUSTOMER_ID to enable Google Ads collection."],
    };
  }

  if (!developerToken) {
    return {
      source: "googleAds",
      status: "skipped",
      warnings: ["Set GOOGLE_ADS_DEVELOPER_TOKEN to enable Google Ads collection."],
    };
  }

  try {
    const accessToken = await getGoogleAdsAccessToken();
    const loginCustomerId = normalizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
    const endpoint = `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`;

    const [summaryRows, dailyRows, campaignRows, deviceRows, keywordRows] = await Promise.all([
      googleAdsSearchStream(endpoint, accessToken, developerToken, loginCustomerId, buildGoogleAdsSummaryQuery(range)),
      googleAdsSearchStream(endpoint, accessToken, developerToken, loginCustomerId, buildGoogleAdsDailyQuery(range)),
      googleAdsSearchStream(endpoint, accessToken, developerToken, loginCustomerId, buildGoogleAdsCampaignQuery(range)),
      googleAdsSearchStream(endpoint, accessToken, developerToken, loginCustomerId, buildGoogleAdsDeviceQuery(range)),
      googleAdsSearchStream(endpoint, accessToken, developerToken, loginCustomerId, buildGoogleAdsKeywordQuery(range)),
    ]);

    const payload = {
      customerId,
      loginCustomerId: loginCustomerId || null,
      summary: googleAdsSummary(summaryRows[0] || {}),
      dailyTrend: dailyRows.map(googleAdsDailyRow),
      campaigns: campaignRows.map(googleAdsCampaignRow),
      devices: deviceRows.map(googleAdsDeviceRow),
      keywords: keywordRows.map(googleAdsKeywordRow),
    };

    return { source: "googleAds", status: "ok", payload, warnings: [] };
  } catch (error) {
    return { source: "googleAds", status: "error", error: formatError(error) };
  }
}

function normalizeCustomerId(value) {
  const cleaned = String(value || "").replaceAll("-", "").trim();
  return cleaned || "";
}

async function getGoogleAdsAccessToken() {
  const refreshToken = String(process.env.GOOGLE_ADS_REFRESH_TOKEN || "").trim();
  const clientId = String(process.env.GOOGLE_ADS_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.GOOGLE_ADS_CLIENT_SECRET || "").trim();

  if (refreshToken && clientId && clientSecret) {
    const oauthClient = new OAuth2Client({
      clientId,
      clientSecret,
    });
    oauthClient.setCredentials({ refresh_token: refreshToken });
    const tokenResponse = await oauthClient.getAccessToken();
    const token = tokenResponse?.token;
    if (!token) {
      throw new Error("Unable to obtain Google Ads access token from refresh token.");
    }
    return token;
  }

  const auth = new GoogleAuth({ scopes: SCOPES.googleAds });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;
  if (!token) {
    throw new Error("Unable to obtain Google Ads access token via Application Default Credentials.");
  }
  return token;
}

async function googleAdsSearchStream(endpoint, accessToken, developerToken, loginCustomerId, query) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };

  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Ads API error ${response.status}: ${body}`);
  }

  const chunks = await response.json();
  if (!Array.isArray(chunks)) {
    return [];
  }

  const rows = [];
  for (const chunk of chunks) {
    if (Array.isArray(chunk.results)) {
      rows.push(...chunk.results);
    }
  }
  return rows;
}

function buildGoogleAdsSummaryQuery(range) {
  return `
    SELECT
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.all_conversions,
      metrics.search_impression_share
    FROM customer
    WHERE segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'
    LIMIT 1
  `;
}

function buildGoogleAdsDailyQuery(range) {
  return `
    SELECT
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr
    FROM customer
    WHERE segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'
    ORDER BY segments.date
  `;
}

function buildGoogleAdsCampaignQuery(range) {
  return `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'
    ORDER BY metrics.impressions DESC
    LIMIT 100
  `;
}

function buildGoogleAdsDeviceQuery(range) {
  return `
    SELECT
      segments.device,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions
    FROM customer
    WHERE segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'
    ORDER BY metrics.impressions DESC
  `;
}

function buildGoogleAdsKeywordQuery(range) {
  return `
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group.name,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM keyword_view
    WHERE segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'
    ORDER BY metrics.impressions DESC
    LIMIT 100
  `;
}

function googleAdsSummary(row) {
  const metrics = row.metrics || {};
  return {
    impressions: parseMaybeNumber(metrics.impressions),
    clicks: parseMaybeNumber(metrics.clicks),
    ctr: parseMaybeNumber(metrics.ctr),
    averageCpcMicros: parseMaybeNumber(metrics.averageCpc),
    averageCpc: microsToCurrency(metrics.averageCpc),
    costMicros: parseMaybeNumber(metrics.costMicros),
    cost: microsToCurrency(metrics.costMicros),
    conversions: parseMaybeNumber(metrics.conversions),
    conversionsValue: parseMaybeNumber(metrics.conversionsValue),
    allConversions: parseMaybeNumber(metrics.allConversions),
    searchImpressionShare: parseMaybeNumber(metrics.searchImpressionShare),
  };
}

function googleAdsDailyRow(row) {
  const metrics = row.metrics || {};
  return {
    date: row.segments?.date || "",
    impressions: parseMaybeNumber(metrics.impressions),
    clicks: parseMaybeNumber(metrics.clicks),
    ctr: parseMaybeNumber(metrics.ctr),
    costMicros: parseMaybeNumber(metrics.costMicros),
    cost: microsToCurrency(metrics.costMicros),
    conversions: parseMaybeNumber(metrics.conversions),
    conversionsValue: parseMaybeNumber(metrics.conversionsValue),
  };
}

function googleAdsCampaignRow(row) {
  const metrics = row.metrics || {};
  return {
    campaignId: row.campaign?.id || "",
    campaignName: row.campaign?.name || "",
    campaignStatus: row.campaign?.status || "",
    channelType: row.campaign?.advertisingChannelType || "",
    impressions: parseMaybeNumber(metrics.impressions),
    clicks: parseMaybeNumber(metrics.clicks),
    ctr: parseMaybeNumber(metrics.ctr),
    averageCpc: microsToCurrency(metrics.averageCpc),
    cost: microsToCurrency(metrics.costMicros),
    conversions: parseMaybeNumber(metrics.conversions),
    conversionsValue: parseMaybeNumber(metrics.conversionsValue),
  };
}

function googleAdsDeviceRow(row) {
  const metrics = row.metrics || {};
  return {
    device: row.segments?.device || "",
    impressions: parseMaybeNumber(metrics.impressions),
    clicks: parseMaybeNumber(metrics.clicks),
    ctr: parseMaybeNumber(metrics.ctr),
    cost: microsToCurrency(metrics.costMicros),
    conversions: parseMaybeNumber(metrics.conversions),
  };
}

function googleAdsKeywordRow(row) {
  const metrics = row.metrics || {};
  return {
    campaignName: row.campaign?.name || "",
    adGroupName: row.adGroup?.name || "",
    keyword: row.adGroupCriterion?.keyword?.text || "",
    matchType: row.adGroupCriterion?.keyword?.matchType || "",
    impressions: parseMaybeNumber(metrics.impressions),
    clicks: parseMaybeNumber(metrics.clicks),
    ctr: parseMaybeNumber(metrics.ctr),
    cost: microsToCurrency(metrics.costMicros),
    conversions: parseMaybeNumber(metrics.conversions),
    conversionsValue: parseMaybeNumber(metrics.conversionsValue),
  };
}

function parseMaybeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber)) {
    return asNumber;
  }

  return trimmed;
}

function microsToCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric / 1_000_000;
}

function formatError(error) {
  if (!error) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function metricValue(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  if (value === null || typeof value === "undefined" || value === "") {
    return "n/a";
  }
  return String(value);
}
