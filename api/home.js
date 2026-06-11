// Server-side homepage renderer.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ESM-compatible __dirname.
const __dirname = dirname(fileURLToPath(import.meta.url));

const UPSTREAM_URL = "https://api.thetrackerapp.io/control";

const CACHE_MAX_AGE = Math.max(
  10,
  Number(process.env.HOME_CACHE_SECONDS) || 300,
);
const STALE_WHILE_REVALIDATE = Math.max(60, Math.floor(CACHE_MAX_AGE * 2));

const INSTANCE_CACHE_MS = 30 * 1000;
let cachedFlags = null;
let cachedFlagsAt = 0;

let cachedHtml = null;
function readBuiltIndexHtml() {
  if (cachedHtml) return cachedHtml;
  const candidates = [
    join(process.cwd(), "dist", "index.html"),
    join(process.cwd(), "index.html"),
    join(__dirname, "..", "dist", "index.html"),
    join(__dirname, "..", "index.html"),
  ];
  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) {
        cachedHtml = readFileSync(candidate, "utf8");
        return cachedHtml;
      }
    } catch {
      /* keep trying */
    }
  }
  return null;
}

const DEFAULT_MESSAGING_SERVICES = {
  iMessage: true,
  sms: true,
  whatsapp: false,
  telegram: false,
  discord: false,
  slack: false,
  signal: false,
  googleChat: false,
  email: false,
};

const PRELOAD_SVGS = [
  "IMessage_logo.svg",
  "SMS.svg",
  "WhatsApp.svg",
  "Telegram_logo.svg",
  "discord-icon-svgrepo-com.svg",
  "Slack_icon_2019.svg",
  "Signal-Logo-Ultramarine.svg",
  "googlechat.svg",
  "email.svg",
];

async function fetchUpstreamFlags() {
  const now = Date.now();
  if (cachedFlags && now - cachedFlagsAt < INSTANCE_CACHE_MS) {
    return cachedFlags;
  }
  const controller = new AbortController();
  // 8-second timeout to allow for cold start + TLS + CF routing
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(UPSTREAM_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
    const data = await res.json();
    if (!data || typeof data !== "object") throw new Error("Upstream returned non-object");
    cachedFlags = data;
    cachedFlagsAt = now;
    return data;
  } catch (err) {
    console.warn("home renderer: upstream fetch failed:", err.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function resolveMessagingServices(flags) {
  const upstream =
    flags &&
    typeof flags === "object" &&
    flags.messagingServices &&
    typeof flags.messagingServices === "object"
      ? flags.messagingServices
      : {};
  return {
    ...DEFAULT_MESSAGING_SERVICES,
    ...upstream,
    iMessage: true,
  };
}

function buildInjection(messagingServices, flags) {
  const preloadLinks = PRELOAD_SVGS.map(
    (file) => `<link rel="preload" as="image" href="/SVGS/${file}" />`,
  ).join("\n    ");
  const msgJson = JSON.stringify(messagingServices);
  
  // If upstream fetch failed, set flags to null so the frontend knows it
  // has to fetch /api/control itself.
  const flagsStr = flags ? JSON.stringify(flags) : "null";
  
  const inlineScript = `<script>window.__MESSAGING_SERVICES__=${msgJson}; window.__CONTROL_FLAGS__=${flagsStr};</script>`;
  return `    ${preloadLinks}\n    ${inlineScript}\n  `;
}

export default async function handler(req, res) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).send("Method Not Allowed");
  }

  const html = readBuiltIndexHtml();
  if (!html) {
    res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("X-Home-Source", "missing-template");
    return res.status(502).send("Homepage template missing.");
  }

  const flags = await fetchUpstreamFlags();
  const messagingServices = resolveMessagingServices(flags);
  const injection = buildInjection(messagingServices, flags);

  let rendered;
  if (html.includes("</head>")) {
    rendered = html.replace("</head>", `${injection}</head>`);
  } else {
    rendered = `${html}\n${injection}`;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (flags) {
    res.setHeader(
      "Cache-Control",
      `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
    );
    res.setHeader("CDN-Cache-Control", `max-age=${CACHE_MAX_AGE}`);
  } else {
    // If upstream failed, only cache for 10 seconds so we recover quickly.
    res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
  }
  res.setHeader("X-Home-Source", flags ? "upstream" : "fallback");
  
  return res.status(200).send(rendered);
}
