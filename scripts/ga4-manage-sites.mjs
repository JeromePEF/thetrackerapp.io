#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";

const DEFAULT_TZ = "America/New_York";
const DEFAULT_CURRENCY = "USD";
const DEFAULT_ACCOUNT = "accounts/262650966";
const DEFAULT_CREDENTIALS_PATH = "/Users/rd/thetrackerapp.io/credentials.json";
const DEFAULT_SITES = [
  { name: "Browne and Price PA", url: "https://browneandpricepa.com" },
  { name: "Princips et Fide", url: "https://principsetfide.com" },
  { name: "TheTrackerApp", url: "https://thetrackerapp.io" },
];
const SCOPES = [
  "https://www.googleapis.com/auth/analytics.edit",
  "https://www.googleapis.com/auth/analytics.readonly",
];

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const keyFilename = await resolveCredentialPath(options.credentialsPath);
const auth = new GoogleAuth({
  scopes: SCOPES,
  keyFilename: keyFilename || undefined,
});
const authClient = await auth.getClient();
const analyticsadmin = google.analyticsadmin({ version: "v1beta", auth: authClient });

if (options.listAccounts) {
  const accounts = await listAccounts(analyticsadmin);
  if (!accounts.length) {
    console.log("No GA4 accounts visible to this identity.");
    process.exit(0);
  }

  console.log("Accessible GA4 accounts:");
  for (const account of accounts) {
    console.log(`- ${account.name || ""} | ${account.displayName || "(no display name)"}`);
  }
  process.exit(0);
}

const account = await resolveAccount(options, analyticsadmin);
const sites = await resolveSites(options);
if (!sites.length) {
  throw new Error("No sites provided. Use --site <name|url> or --sites-file <path>.");
}

const propertyCache = await listPropertiesForAccount(analyticsadmin, account);
const streamCache = new Map();
const results = [];

for (const site of sites) {
  const result = await ensureSiteSetup({
    analyticsadmin,
    account,
    site,
    options,
    propertyCache,
    streamCache,
  });
  results.push(result);
}

const out = {
  generatedAtUtc: new Date().toISOString(),
  account,
  dryRun: !options.apply,
  strictPropertyPerSite: options.strictPropertyPerSite,
  defaults: {
    timeZone: options.timeZone,
    currencyCode: options.currencyCode,
    industryCategory: options.industryCategory || null,
  },
  sites: results,
};

if (options.outPath) {
  await fs.mkdir(path.dirname(options.outPath), { recursive: true });
  await fs.writeFile(options.outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`Saved GA4 site setup report to ${options.outPath}`);
}

console.log(`Account: ${account}`);
console.log(`Mode: ${options.apply ? "apply" : "dry-run"}`);
console.log(`Credentials: ${keyFilename || "ADC default (no local key file found)"}`);
console.log("");

for (const site of results) {
  const status = site.actionSummary.join(", ") || "reused";
  console.log(`${site.siteName} (${site.siteUrl})`);
  console.log(`  property: ${site.propertyName} (${site.propertyDisplayName})`);
  console.log(`  stream: ${site.streamName} (${site.streamDisplayName})`);
  console.log(`  measurementId: ${site.measurementId || "(pending)"}`);
  console.log(`  actions: ${status}`);
}

console.log("");
console.log("Integration ID suggestions (optional env vars):");
for (const site of results) {
  const key = envKeyFromName(site.siteName);
  console.log(`# ${site.siteUrl}`);
  console.log(`${key}_GA4_PROPERTY_ID=${extractPropertyId(site.propertyName)}`);
  console.log(`${key}_GA4_MEASUREMENT_ID=${site.measurementId || ""}`);
}

async function ensureSiteSetup({ analyticsadmin, account, site, options, propertyCache, streamCache }) {
  const actionSummary = [];

  let property = null;
  if (options.strictPropertyPerSite) {
    property = findPropertyByDisplayName(propertyCache, site.name);
  } else {
    property = await findBestPropertyMatch({
      analyticsadmin,
      site,
      properties: propertyCache,
      streamCache,
    });
  }

  if (!property) {
    if (!options.apply) {
      const slug = slugify(site.name);
      property = {
        name: `accounts/${extractAccountId(account)}/properties/NEW_${slug}`,
        displayName: site.name,
      };
      actionSummary.push("would-create-property");
    } else {
      const created = await analyticsadmin.properties.create({
        requestBody: {
          parent: account,
          displayName: site.name,
          timeZone: options.timeZone,
          currencyCode: options.currencyCode,
          ...(options.industryCategory ? { industryCategory: options.industryCategory } : {}),
        },
      });
      property = created.data;
      propertyCache.push(property);
      actionSummary.push("created-property");
    }
  } else {
    actionSummary.push("reused-property");
  }

  const propertyName = property.name || "";
  const streams = propertyName.includes("/NEW") ? [] : await getWebStreams(analyticsadmin, propertyName, streamCache);

  let stream = findWebStreamByHost(streams, site.host);
  if (!stream) {
    if (!options.apply) {
      const slug = slugify(site.name);
      stream = {
        name: `${propertyName}/dataStreams/NEW_${slug}`,
        displayName: `${site.name} Web`,
        webStreamData: {
          defaultUri: site.url,
          measurementId: "",
        },
      };
      actionSummary.push("would-create-stream");
    } else {
      const created = await analyticsadmin.properties.dataStreams.create({
        parent: propertyName,
        requestBody: {
          type: "WEB_DATA_STREAM",
          displayName: `${site.name} Web`,
          webStreamData: {
            defaultUri: site.url,
          },
        },
      });
      stream = created.data;
      actionSummary.push("created-stream");

      const refreshed = await getWebStreams(analyticsadmin, propertyName, streamCache, { refresh: true });
      const refreshedMatch = findWebStreamByHost(refreshed, site.host);
      if (refreshedMatch) {
        stream = refreshedMatch;
      }
    }
  } else {
    actionSummary.push("reused-stream");
  }

  return {
    siteName: site.name,
    siteUrl: site.url,
    propertyName,
    propertyDisplayName: property.displayName || "",
    streamName: stream.name || "",
    streamDisplayName: stream.displayName || "",
    measurementId: stream.webStreamData?.measurementId || "",
    actionSummary,
  };
}

async function resolveAccount(options, analyticsadmin) {
  if (options.account) {
    return normalizeAccountName(options.account);
  }

  const accounts = await listAccounts(analyticsadmin);
  if (accounts.length === 1) {
    return accounts[0].name;
  }

  throw new Error(
    `Multiple or zero GA4 accounts detected (${accounts.length}). Use --account accounts/<id>.`,
  );
}

async function listAccounts(analyticsadmin) {
  const accounts = [];
  let pageToken = undefined;

  do {
    const response = await analyticsadmin.accounts.list({
      pageSize: 200,
      pageToken,
      showDeleted: false,
    });

    accounts.push(...(response.data.accounts || []));
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return accounts;
}

async function listPropertiesForAccount(analyticsadmin, account) {
  const properties = [];
  let pageToken = undefined;

  do {
    const response = await analyticsadmin.properties.list({
      filter: `parent:${account}`,
      pageSize: 200,
      pageToken,
      showDeleted: false,
    });

    properties.push(...(response.data.properties || []));
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return properties;
}

async function getWebStreams(analyticsadmin, propertyName, streamCache, options = {}) {
  const refresh = Boolean(options.refresh);
  if (!refresh && streamCache.has(propertyName)) {
    return streamCache.get(propertyName);
  }

  const streams = [];
  let pageToken = undefined;

  do {
    const response = await analyticsadmin.properties.dataStreams.list({
      parent: propertyName,
      pageSize: 200,
      pageToken,
    });

    const rows = response.data.dataStreams || [];
    for (const row of rows) {
      if (row.type === "WEB_DATA_STREAM") {
        streams.push(row);
      }
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  streamCache.set(propertyName, streams);
  return streams;
}

async function findBestPropertyMatch({ analyticsadmin, site, properties, streamCache }) {
  for (const property of properties) {
    if (!property.name) {
      continue;
    }

    const streams = await getWebStreams(analyticsadmin, property.name, streamCache);
    const byHost = findWebStreamByHost(streams, site.host);
    if (byHost) {
      return property;
    }
  }

  const nameMatch = properties.find((property) => normalizeText(property.displayName) === normalizeText(site.name));
  return nameMatch || null;
}

function findWebStreamByHost(streams, host) {
  for (const stream of streams) {
    const streamUri = stream.webStreamData?.defaultUri || "";
    if (!streamUri) {
      continue;
    }

    const streamHost = normalizeHost(streamUri);
    if (streamHost === host) {
      return stream;
    }
  }

  return null;
}

function findPropertyByDisplayName(properties, displayName) {
  return (
    properties.find((property) => normalizeText(property.displayName) === normalizeText(displayName)) || null
  );
}

async function resolveSites(options) {
  const inlineSites =
    options.inlineSites.length || options.sitesFile
      ? options.inlineSites
      : DEFAULT_SITES.map((site) => `${site.name}|${site.url}`);
  const fromInline = inlineSites.map(parseInlineSite);
  if (options.sitesFile) {
    const fromFile = await parseSitesFile(options.sitesFile);
    return dedupeSites([...fromInline, ...fromFile]);
  }
  return dedupeSites(fromInline);
}

function dedupeSites(sites) {
  const byHost = new Map();
  for (const site of sites) {
    byHost.set(site.host, site);
  }
  return [...byHost.values()];
}

function parseInlineSite(raw) {
  const value = String(raw || "").trim();
  const separator = value.indexOf("|");
  if (separator === -1) {
    throw new Error(`Invalid --site value '${value}'. Use --site \"Name|https://domain\".`);
  }

  const name = value.slice(0, separator).trim();
  const url = value.slice(separator + 1).trim();
  if (!name || !url) {
    throw new Error(`Invalid --site value '${value}'. Use --site \"Name|https://domain\".`);
  }

  const normalizedUrl = normalizeUrl(url);
  return {
    name,
    url: normalizedUrl,
    host: normalizeHost(normalizedUrl),
  };
}

async function parseSitesFile(filePath) {
  const abs = path.resolve(filePath);
  const raw = await fs.readFile(abs, "utf8");

  if (abs.endsWith(".json")) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Sites JSON must be an array of { name, url } entries.");
    }

    return parsed.map((row) => {
      const name = String(row?.name || "").trim();
      const url = String(row?.url || "").trim();
      if (!name || !url) {
        throw new Error("Each site JSON entry requires name and url.");
      }
      const normalizedUrl = normalizeUrl(url);
      return {
        name,
        url: normalizedUrl,
        host: normalizeHost(normalizedUrl),
      };
    });
  }

  const lines = raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = [];
  for (const line of lines) {
    if (/^name\s*,\s*url$/i.test(line)) {
      continue;
    }

    const parts = splitCsvLine(line);
    if (parts.length < 2) {
      continue;
    }

    const name = String(parts[0] || "").trim();
    const url = String(parts[1] || "").trim();
    if (!name || !url) {
      continue;
    }

    const normalizedUrl = normalizeUrl(url);
    rows.push({
      name,
      url: normalizedUrl,
      host: normalizeHost(normalizedUrl),
    });
  }

  return rows;
}

function splitCsvLine(line) {
  const cols = [];
  let buffer = "";
  let quote = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quote && line[i + 1] === '"') {
        buffer += '"';
        i += 1;
      } else {
        quote = !quote;
      }
      continue;
    }

    if (ch === "," && !quote) {
      cols.push(buffer);
      buffer = "";
      continue;
    }

    buffer += ch;
  }

  cols.push(buffer);
  return cols.map((col) => col.trim());
}

function normalizeAccountName(account) {
  const value = String(account || "").trim();
  if (!value) {
    throw new Error("Missing account value.");
  }

  if (value.startsWith("accounts/")) {
    return value;
  }

  return `accounts/${value}`;
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    throw new Error("Missing site URL.");
  }

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withScheme);
  parsed.pathname = "/";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function normalizeHost(input) {
  const url = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const host = new URL(url).hostname.toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function extractAccountId(accountName) {
  const parts = String(accountName || "").split("/");
  return parts[parts.length - 1] || "";
}

function extractPropertyId(propertyName) {
  const parts = String(propertyName || "").split("/");
  return parts[parts.length - 1] || "";
}

function envKeyFromName(name) {
  return String(name || "SITE")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/__+/g, "_") || "SITE";
}

function slugify(value) {
  return (
    String(value || "site")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "site"
  );
}

async function resolveCredentialPath(preferredPath) {
  const preferred = String(preferredPath || "").trim();
  if (preferred) {
    const resolved = path.resolve(preferred);
    try {
      await fs.access(resolved);
      return resolved;
    } catch {
      // Continue to fallback checks.
    }
  }

  const localCredentialsPath = path.resolve(process.cwd(), "credentials.json");
  try {
    await fs.access(localCredentialsPath);
    return localCredentialsPath;
  } catch {
    return "";
  }
}

function parseArgs(args) {
  const options = {
    account: DEFAULT_ACCOUNT,
    timeZone: DEFAULT_TZ,
    currencyCode: DEFAULT_CURRENCY,
    industryCategory: "",
    credentialsPath: DEFAULT_CREDENTIALS_PATH,
    sitesFile: "",
    inlineSites: [],
    outPath: "",
    listAccounts: false,
    strictPropertyPerSite: false,
    apply: false,
    help: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--list-accounts") {
      options.listAccounts = true;
      continue;
    }

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--strict-property-per-site") {
      options.strictPropertyPerSite = true;
      continue;
    }

    if (arg.startsWith("--account=")) {
      options.account = arg.slice("--account=".length).trim();
      continue;
    }

    if (arg === "--account") {
      options.account = String(args[i + 1] || "").trim();
      i += 1;
      continue;
    }

    if (arg.startsWith("--credentials=")) {
      options.credentialsPath = path.resolve(arg.slice("--credentials=".length).trim());
      continue;
    }

    if (arg === "--credentials") {
      options.credentialsPath = path.resolve(String(args[i + 1] || "").trim());
      i += 1;
      continue;
    }

    if (arg.startsWith("--site=")) {
      options.inlineSites.push(arg.slice("--site=".length));
      continue;
    }

    if (arg === "--site") {
      options.inlineSites.push(String(args[i + 1] || ""));
      i += 1;
      continue;
    }

    if (arg.startsWith("--sites-file=")) {
      options.sitesFile = path.resolve(arg.slice("--sites-file=".length));
      continue;
    }

    if (arg === "--sites-file") {
      options.sitesFile = path.resolve(String(args[i + 1] || ""));
      i += 1;
      continue;
    }

    if (arg.startsWith("--timezone=")) {
      options.timeZone = arg.slice("--timezone=".length).trim() || DEFAULT_TZ;
      continue;
    }

    if (arg === "--timezone") {
      options.timeZone = String(args[i + 1] || "").trim() || DEFAULT_TZ;
      i += 1;
      continue;
    }

    if (arg.startsWith("--currency=")) {
      options.currencyCode = arg.slice("--currency=".length).trim() || DEFAULT_CURRENCY;
      continue;
    }

    if (arg === "--currency") {
      options.currencyCode = String(args[i + 1] || "").trim() || DEFAULT_CURRENCY;
      i += 1;
      continue;
    }

    if (arg.startsWith("--industry=")) {
      options.industryCategory = arg.slice("--industry=".length).trim();
      continue;
    }

    if (arg === "--industry") {
      options.industryCategory = String(args[i + 1] || "").trim();
      i += 1;
      continue;
    }

    if (arg.startsWith("--out=")) {
      options.outPath = path.resolve(arg.slice("--out=".length));
      continue;
    }

    if (arg === "--out") {
      options.outPath = path.resolve(String(args[i + 1] || ""));
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.account) {
    options.account = normalizeAccountName(options.account);
  }

  if (options.outPath === "") {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    options.outPath = path.resolve(process.cwd(), `metrics/ga4-manage-sites-${stamp}.json`);
  }

  return options;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/ga4-manage-sites.mjs [options]

Options:
  --list-accounts                  List accessible GA4 accounts and exit
  --account <accounts/123>         GA4 account resource name (default: ${DEFAULT_ACCOUNT})
  --credentials <path>             Service account json path (default: ${DEFAULT_CREDENTIALS_PATH})
  --site "Name|https://domain"     Add one site (repeatable)
  --sites-file <path>              JSON or CSV file with sites
  --strict-property-per-site       Ignore shared-property matches, key by property displayName
  --timezone <IANA_TZ>             Property timezone (default: ${DEFAULT_TZ})
  --currency <ISO_4217>            Property currency (default: ${DEFAULT_CURRENCY})
  --industry <ENUM>                Optional GA4 industry category enum
  --apply                          Execute creates (default is dry-run)
  --out <path>                     Output JSON report path
  -h, --help                       Show this help

Sites file formats:
  JSON: [ { "name": "TheTrackerApp", "url": "https://thetrackerapp.io" } ]
  CSV:  name,url
        TheTrackerApp,https://thetrackerapp.io

Built-in defaults:
  account: ${DEFAULT_ACCOUNT}
  credentials: ${DEFAULT_CREDENTIALS_PATH}
  sites: ${DEFAULT_SITES.map((site) => `${site.name}|${site.url}`).join(" ; ")}

Examples:
  node scripts/ga4-manage-sites.mjs
  node scripts/ga4-manage-sites.mjs --list-accounts
  node scripts/ga4-manage-sites.mjs --account accounts/123 --site "TheTrackerApp|https://thetrackerapp.io"
  node scripts/ga4-manage-sites.mjs --account 123 --sites-file ./sites.json --apply
`);
}
