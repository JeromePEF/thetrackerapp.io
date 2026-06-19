#!/usr/bin/env node
/**
 * request-indexing.mjs
 * --------------------
 * Programmatically requests Google to recrawl updated URLs via the Indexing API.
 *
 * Prerequisites:
 *   1. Service account added as Owner in Google Search Console for thetrackerapp.io
 *   2. Indexing API enabled in the GCP project (generalautomations-sites)
 *   3. credentials.json present in project root
 *
 * Quota: 200 URLs per day per service account.
 *
 * Usage:
 *   node scripts/request-indexing.mjs [--dry-run] [--urls /path/changelog,/path/faq,...]
 *
 * If no --urls flag, submits ALL public URLs in the sitemap registry.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITE = "https://thetrackerapp.io";

// All public pages that were modified in this SEO update
const MODIFIED_URLS = [
  "/",
  "/changelog",
  "/guide",
  "/community",
  "/pricing",
  "/leaderboard",
  "/trust",
  "/groups",
  "/brackets",
  "/login",
  "/faq",
  "/privacy",
  "/terms",
  "/affiliate/signup",
  "/blog",
  "/blog/the-importance-of-tracking",
  "/press",
  "/products",
  "/win",
  "/tools/tdee-calculator",
  "/tools/bmi-calculator",
  "/tools/ai-meal-planner",
  "/tools/food-diary",
  "/pebble-app",
  "/mac-apps",
  "/workout-resources",
  "/run-clubs",
  "/personal-trainers",
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

let urls = MODIFIED_URLS;
const urlsFlag = args.find((a) => a.startsWith("--urls="));
if (urlsFlag) {
  urls = urlsFlag.replace("--urls=", "").split(",").map((u) => u.trim()).filter(Boolean);
}

const credFlag = args.find((a) => a.startsWith("--credentials="));
const customCredPath = credFlag ? credFlag.replace("--credentials=", "") : null;

if (urls.length === 0) {
  console.error("No URLs to submit.");
  process.exit(1);
}

console.log(`Found ${urls.length} URL(s) to request indexing for.`);

/**
 * Authenticate using the local credentials.json service account.
 */
function getAuthClient(customCredPath) {
  const credPath = customCredPath || path.resolve(ROOT, "credentials.json");
  if (!fs.existsSync(credPath)) {
    console.error(`Missing credentials file at ${credPath}`);
    process.exit(1);
  }
  const key = JSON.parse(fs.readFileSync(credPath, "utf8"));

  // Dynamic import to avoid top-level await issues in older Node
  return import("google-auth-library").then(({ GoogleAuth }) => {
    const auth = new GoogleAuth({
      credentials: key,
      scopes: ["https://www.googleapis.com/auth/indexing"],
    });
    return auth.getClient();
  });
}

/**
 * Submit a single URL to the Indexing API.
 * Returns { url, status, error? }
 */
async function notifyUrl(authClient, url) {
  const fullUrl = url.startsWith("http") ? url : `${SITE}${url}`;
  const body = JSON.stringify({
    url: fullUrl,
    type: "URL_UPDATED",
  });

  try {
    const res = await authClient.request({
      url: "https://indexing.googleapis.com/v3/urlNotifications:publish",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return {
      url: fullUrl,
      status: res.status,
      data: res.data,
    };
  } catch (err) {
    return {
      url: fullUrl,
      status: err.code || err.response?.status || 0,
      error: err.message,
    };
  }
}

// ---- Main ----
const authClient = await getAuthClient(customCredPath);

if (dryRun) {
  console.log("\n[Dry run] Would request indexing for:");
  urls.forEach((u) => console.log(`  ${SITE}${u}`));
  console.log(`\nTotal: ${urls.length} URLs. Add --dry-run to skip actual API calls.`);
  process.exit(0);
}

console.log(`\nRequesting indexing (Indexing API quota: 200/day)...\n`);

const results = [];
for (const u of urls) {
  const result = await notifyUrl(authClient, u);
  results.push(result);
  const icon = result.status === 200 ? "✓" : "✗";
  console.log(`  ${icon} ${result.url} — ${result.status}`);
  if (result.error) {
    console.log(`    Error: ${result.error}`);
  }
  // Rate limit: Indexing API allows ~1 QPS, be gentle
  await new Promise((r) => setTimeout(r, 600));
}

const ok = results.filter((r) => r.status === 200).length;
const fail = results.filter((r) => r.status !== 200).length;
console.log(`\nDone: ${ok} succeeded, ${fail} failed out of ${results.length}.`);

if (fail > 0) {
  console.log("\nFailed URLs:");
  results.filter((r) => r.status !== 200).forEach((r) => {
    console.log(`  - ${r.url}: ${r.error || `HTTP ${r.status}`}`);
  });
  console.log("\nCommon causes:");
  console.log("  1. Service account not added as Owner in Google Search Console");
  console.log("  2. Indexing API not enabled in GCP project");
  console.log("  3. URL not verified in Search Console property");
}
