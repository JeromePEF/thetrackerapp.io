// Server-side homepage renderer.
//
// Reads the static built `index.html`, fetches the latest control flags
// (specifically the `messagingServices` object) from the upstream backend,
// and injects:
//   1. A small inline <script> that exposes `window.__MESSAGING_SERVICES__`
//      so `src/main.js` can filter the service-carousel synchronously
//      WITHOUT making an extra round-trip from the browser.
//   2. <link rel="preload" as="image"> tags for every messaging-service SVG
//      under /SVGS, so the carousel images are warm in cache the moment the
//      flag tells the client which icons to show.
//
// The whole response is edge-cached on Vercel (`s-maxage=300`) so the
// upstream backend is hit at most once per region per 5 minutes regardless
// of how many users visit the homepage. This makes the feature effectively
// "generated server-side" without adding any client-side latency.
//
// Wired in `vercel.json`:
//   { "source": "/", "destination": "/api/home" }
//
// In `vercel.json` we also use `functions.api/home.js.includeFiles` to bundle
// `dist/index.html` (the Vite build output) into the Lambda so the function
// can read it from disk without an HTTP round-trip.

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ESM-compatible __dirname. `package.json` has `"type": "module"`, so this
// file runs as an ES module both locally (vite preview) and on Vercel.
const __dirname = dirname(fileURLToPath(import.meta.url));

const UPSTREAM_URL = "https://api.thetrackerapp.io/control";

// Edge cache window. Drives "how quickly does a flag flip propagate to
// users" — not bandwidth. ~5 min keeps backend pressure trivial while
// flag flips still reach users without a manual redeploy.
const CACHE_MAX_AGE = Math.max(
  10,
  Number(process.env.HOME_CACHE_SECONDS) || 300,
);
const STALE_WHILE_REVALIDATE = Math.max(60, Math.floor(CACHE_MAX_AGE * 2));

// Within a warm Lambda instance, cache the fetched flags so back-to-back
// edge cache misses (e.g. cold region) don't hammer the upstream.
const INSTANCE_CACHE_MS = 30 * 1000;
let cachedFlags = null;
let cachedFlagsAt = 0;

// Cache the built HTML in memory — reading from disk per invocation would
// burn CPU on a hot path.
let cachedHtml = null;
function readBuiltIndexHtml() {
  if (cachedHtml) return cachedHtml;
  // Try several locations because Vercel's working directory varies between
  // local dev (`vercel dev`), build inspection, and the actual Lambda
  // runtime. `includeFiles: "dist/index.html"` in vercel.json ensures the
  // file lives next to the function on Lambda.
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

// SAFE-BY-DEFAULT messaging flags. iMessage stays ON because the product's
// canonical channel is iMessage — even if upstream is unreachable, the
// homepage MUST render the iMessage option so users can still onboard. SMS
// is also defaulted ON because it's the SMS opt-in surface for Twilio
// 10DLC; everything else stays OFF until upstream confirms.
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

// SVGs under /public/SVGS that we want warm in browser cache. The flag
// determines which ones are *displayed*, but we preload all of them so
// flipping a flag in the backend reveals an already-cached icon.
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
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    // A browser-like User-Agent + Accept-Language is required because the
    // upstream sits behind Cloudflare's WAF which blocks bare server-to-
    // server requests from AWS Lambda IP ranges. The headers don't make
    // the request a browser — they just clear CF's "obvious bot" heuristic.
    const res = await fetch(UPSTREAM_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 TheTrackerApp/HomeRenderer",
      },
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

// Build the messaging-services object that gets injected into the page.
// Rules:
//   - iMessage is ALWAYS true regardless of upstream value (product rule:
//     iMessage is the canonical channel, never hide it).
//   - Other channels follow upstream truthiness; missing keys fall back to
//     DEFAULT_MESSAGING_SERVICES.
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

function buildInjection(messagingServices) {
  const preloadLinks = PRELOAD_SVGS.map(
    (file) => `<link rel="preload" as="image" href="/SVGS/${file}" />`,
  ).join("\n    ");
  const json = JSON.stringify(messagingServices);
  // The script is a plain (non-module) inline script so it runs BEFORE the
  // deferred <script type="module" src=".../main.js"> below it. That means
  // `window.__MESSAGING_SERVICES__` is guaranteed to exist by the time
  // main.js's first line executes.
  const inlineScript = `<script>window.__MESSAGING_SERVICES__=${json};</script>`;
  return `    ${preloadLinks}\n    ${inlineScript}\n  `;
}

export default async function handler(req, res) {
  // Method guard. The homepage is GET-only.
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).send("Method Not Allowed");
  }

  const html = readBuiltIndexHtml();
  if (!html) {
    // Disk read failed (Lambda misconfiguration). Don't leave the homepage
    // broken — fall through with a short cache so we recover fast on the
    // next deploy.
    res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("X-Home-Source", "missing-template");
    return res.status(502).send("Homepage template missing.");
  }

  const flags = await fetchUpstreamFlags();
  const messagingServices = resolveMessagingServices(flags);
  const injection = buildInjection(messagingServices);

  // Insert before `</head>`. If the marker isn't found (shouldn't happen
  // with a sane Vite build), just append at the end of the document so we
  // still surface the JSON to main.js.
  let rendered;
  if (html.includes("</head>")) {
    rendered = html.replace("</head>", `${injection}</head>`);
  } else {
    rendered = `${html}\n${injection}`;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
  );
  res.setHeader("CDN-Cache-Control", `max-age=${CACHE_MAX_AGE}`);
  res.setHeader("X-Home-Source", flags ? "upstream" : "fallback");
  return res.status(200).send(rendered);
}
