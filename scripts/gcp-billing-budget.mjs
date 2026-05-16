#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";

const DEFAULT_BILLING_ACCOUNT = "billingAccounts/01FC2B-A9D024-E861A7";
const DEFAULT_BUDGET_NAME = "Truist Cost Guard";
const DEFAULT_MONTHLY_USD = 500;

await main().catch((error) => {
  const text = formatError(error);
  console.error(`Billing budget script failed: ${text}`);
  if (/permission|forbidden|403/i.test(text)) {
    console.error("Required IAM (billing account level) for this caller:");
    console.error("- roles/billing.admin (or roles/billing.costsManager + budget create permission)");
    console.error("- roles/billing.viewer (for listing)");
  }
  if (/has not been used|disabled|SERVICE_DISABLED|accessNotConfigured/i.test(text)) {
    console.error("Enable APIs on project generalautomations-sites:");
    console.error("- cloudbilling.googleapis.com");
    console.error("- billingbudgets.googleapis.com");
  }
  process.exit(1);
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const keyFilename = await resolveKeyFilename(options.credentialsPath);
  const auth = new GoogleAuth({
    keyFilename: keyFilename || undefined,
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/cloud-billing",
    ],
  });

  const authClient = await auth.getClient();
  const cloudbilling = google.cloudbilling({ version: "v1", auth: authClient });
  const budgetsApi = google.billingbudgets({ version: "v1", auth: authClient });

  const billingAccount = normalizeBillingAccount(options.billingAccount);
  const [accounts, budgets] = await Promise.all([
    cloudbilling.billingAccounts.list().catch(() => ({ data: { billingAccounts: [] } })),
    budgetsApi.billingAccounts.budgets.list({ parent: billingAccount }),
  ]);

  const visible = accounts.data.billingAccounts || [];
  const selected = visible.find((acct) => acct.name === billingAccount) || null;

  const existing = budgets.data.budgets || [];
  console.log(`Billing account: ${billingAccount}${selected?.displayName ? ` (${selected.displayName})` : ""}`);
  if (!selected) {
    console.log("Note: account not returned by billingAccounts.list for this principal, but budget API access is working.");
  }
  console.log(`Existing budgets: ${existing.length}`);
  for (const budget of existing) {
    const amount = budget.amount?.specifiedAmount;
    const units = Number(amount?.units || 0);
    const nanos = Number(amount?.nanos || 0) / 1e9;
    const total = units + nanos;
    console.log(`- ${budget.displayName || "(no name)"} | ${budget.name} | ${formatUsd(total)}`);
  }

  if (!options.create) {
    return;
  }

  const existingByName = existing.find((budget) => normalizeText(budget.displayName) === normalizeText(options.displayName));
  if (existingByName) {
    console.log(`Budget '${options.displayName}' already exists: ${existingByName.name}`);
    return;
  }

  const payload = {
    displayName: options.displayName,
    budgetFilter: {},
    amount: {
      specifiedAmount: toMoney(options.monthlyUsd),
    },
    thresholdRules: [
      { thresholdPercent: 0.5 },
      { thresholdPercent: 0.9 },
      { thresholdPercent: 1.0 },
      { thresholdPercent: 1.2 },
    ],
    notificationsRule: {
      disableDefaultIamRecipients: false,
      schemaVersion: "1.0",
      monitoringNotificationChannels: options.notificationChannels,
    },
  };

  if (options.projectFilter.length) {
    payload.budgetFilter.projects = options.projectFilter.map((project) => normalizeProjectResource(project));
  }

  const created = await budgetsApi.billingAccounts.budgets.create({
    parent: billingAccount,
    requestBody: payload,
  });

  console.log(`Created budget: ${created.data.name}`);
  console.log(`Display name: ${created.data.displayName}`);
  console.log(`Monthly limit: ${formatUsd(options.monthlyUsd)}`);
  console.log(
    `Notification channels: ${options.notificationChannels.length ? options.notificationChannels.join(", ") : "IAM default recipients only"}`,
  );
}

function parseArgs(args) {
  const options = {
    billingAccount: DEFAULT_BILLING_ACCOUNT,
    displayName: DEFAULT_BUDGET_NAME,
    monthlyUsd: DEFAULT_MONTHLY_USD,
    credentialsPath: "/Users/rd/thetrackerapp.io/credentials.json",
    projectFilter: [],
    notificationChannels: [],
    create: false,
    help: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--create") {
      options.create = true;
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

    if (arg.startsWith("--display-name=")) {
      options.displayName = String(arg.split("=")[1] || "").trim();
      continue;
    }

    if (arg === "--display-name") {
      options.displayName = String(args[i + 1] || "").trim();
      i += 1;
      continue;
    }

    if (arg.startsWith("--monthly-usd=")) {
      options.monthlyUsd = parsePositiveFloat(arg.split("=")[1], DEFAULT_MONTHLY_USD);
      continue;
    }

    if (arg === "--monthly-usd") {
      options.monthlyUsd = parsePositiveFloat(args[i + 1], DEFAULT_MONTHLY_USD);
      i += 1;
      continue;
    }

    if (arg.startsWith("--credentials=")) {
      options.credentialsPath = String(arg.split("=")[1] || "").trim();
      continue;
    }

    if (arg === "--credentials") {
      options.credentialsPath = String(args[i + 1] || "").trim();
      i += 1;
      continue;
    }

    if (arg.startsWith("--project=")) {
      options.projectFilter.push(String(arg.split("=")[1] || "").trim());
      continue;
    }

    if (arg === "--project") {
      options.projectFilter.push(String(args[i + 1] || "").trim());
      i += 1;
      continue;
    }

    if (arg.startsWith("--notification-channel=")) {
      options.notificationChannels.push(String(arg.split("=")[1] || "").trim());
      continue;
    }

    if (arg === "--notification-channel") {
      options.notificationChannels.push(String(args[i + 1] || "").trim());
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  options.projectFilter = options.projectFilter.filter(Boolean);
  options.notificationChannels = options.notificationChannels.filter(Boolean);
  if (!options.displayName) {
    options.displayName = DEFAULT_BUDGET_NAME;
  }

  return options;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/gcp-billing-budget.mjs [options]

Options:
  --create                           Create budget if missing (otherwise list only)
  --billing-account <id>             Billing account (default: ${DEFAULT_BILLING_ACCOUNT})
  --display-name <name>              Budget display name (default: ${DEFAULT_BUDGET_NAME})
  --monthly-usd <amount>             Monthly budget cap USD (default: ${DEFAULT_MONTHLY_USD})
  --project <project-id|projects/N>  Optional project filter (repeatable)
  --notification-channel <name>      Optional Cloud Monitoring channel resource (repeatable)
  --credentials <path>               Service account json path
  -h, --help                         Show help

Examples:
  node scripts/gcp-billing-budget.mjs
  node scripts/gcp-billing-budget.mjs --create --monthly-usd 300
  node scripts/gcp-billing-budget.mjs --create --project generalautomations-sites
`);
}

async function resolveKeyFilename(inputPath) {
  const explicit = String(inputPath || "").trim();
  if (explicit) {
    const abs = path.resolve(explicit);
    try {
      await fs.access(abs);
      return abs;
    } catch {
      // ignore and try fallback
    }
  }

  const local = path.resolve(process.cwd(), "credentials.json");
  try {
    await fs.access(local);
    return local;
  } catch {
    return "";
  }
}

function normalizeBillingAccount(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    throw new Error("Missing billing account.");
  }
  if (raw.startsWith("billingAccounts/")) {
    return raw;
  }
  return `billingAccounts/${raw}`;
}

function normalizeProjectResource(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    throw new Error("Invalid project filter value.");
  }
  if (raw.startsWith("projects/")) {
    return raw;
  }
  return `projects/${raw}`;
}

function toMoney(usd) {
  const normalized = Math.max(0, Number(usd) || 0);
  const units = Math.floor(normalized);
  const nanos = Math.round((normalized - units) * 1e9);
  return {
    currencyCode: "USD",
    units: String(units),
    nanos,
  };
}

function parsePositiveFloat(value, fallback) {
  const parsed = Number(String(value || "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatUsd(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
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
