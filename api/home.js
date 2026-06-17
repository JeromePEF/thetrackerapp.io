// Server-side homepage renderer.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ESM-compatible __dirname.
const __dirname = dirname(fileURLToPath(import.meta.url));

const UPSTREAM_URL = "https://api.thetrackerapp.io/control";
const DASHBOARD_SHEET_ID = "1Fd0wKgx7qB6UVoxdk1hkZdjT-ymsScmwzLjeflaW-3c";
const STRENGTH_EXERCISES = ["BENCH", "SQUAT", "DEADLIFT"];
const CALISTHENICS_EXERCISES = ["PUSHUPS", "PULLUPS", "SQUATS", "DIPS"];

const CACHE_MAX_AGE = Math.max(
  10,
  Number(process.env.HOME_CACHE_SECONDS) || 300,
);
const STALE_WHILE_REVALIDATE = Math.max(60, Math.floor(CACHE_MAX_AGE * 2));

const INSTANCE_CACHE_MS = 30 * 1000;
const DATA_REQUEST_TIMEOUT_MS = 5000;
let cachedFlags = null;
let cachedFlagsAt = 0;

let cachedMetrics = null;
let cachedMetricsAt = 0;

let cachedLeaderboard = null;
let cachedLeaderboardAt = 0;

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

function buildInjection(messagingServices, flags, metricsJson, leaderboardJson) {
  const preloadLinks = PRELOAD_SVGS.map(
    (file) => `<link rel="preload" as="image" href="/SVGS/${file}" />`,
  ).join("\n    ");
  const msgJson = JSON.stringify(messagingServices);
  
  // If upstream fetch failed, set flags to null so the frontend knows it
  // has to fetch /api/control itself.
  const flagsStr = flags ? JSON.stringify(flags) : "null";
  
  let dataInjection = `window.__MESSAGING_SERVICES__=${msgJson}; window.__CONTROL_FLAGS__=${flagsStr};`;
  if (metricsJson) {
    dataInjection += ` window.__INITIAL_METRICS__=${metricsJson};`;
  }
  if (leaderboardJson) {
    dataInjection += ` window.__INITIAL_LEADERBOARD__=${leaderboardJson};`;
  }
  
  const inlineScript = `<script>${dataInjection}</script>`;
  return `    ${preloadLinks}\n    ${inlineScript}\n  `;
}

// ── CSV helpers (lightweight, no deps) ──────────────────────────────────────

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function clean(value) {
  return String(value || "").trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { row.push(cell.trim()); cell = ""; continue; }
    if (ch === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; continue; }
    if (ch !== "\r") cell += ch;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function csvUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${DASHBOARD_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DATA_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Accept: "text/csv,text/plain,*/*" }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ── Metrics & leaderboard from control API liveStats ─────────────────────────

function metricsFromLiveStats(ls) {
  if (!ls || typeof ls !== "object") return null;
  return {
    usersToday: ls.usersUsingToday ?? 0,
    usersThisWeek: ls.totalUsersThisWeek ?? 0,
    workoutsLogged: ls.workoutsLogged ?? 0,
    caloriesTracked: ls.caloriesTracked ?? 0,
    gallonsDrank: ls.gallonsDrank ?? 0,
  };
}

function leaderboardFromLiveStats(ls) {
  if (!ls || typeof ls !== "object") return null;
  const toEntry = (row) => {
    const username = row.username || row.canonical || "User";
    const emoji = (username.match(/\p{Extended_Pictographic}/u) || [])[0] || "";
    const name = username.replace(/\p{Extended_Pictographic}/gu, "").trim() || "User";
    const valueLabel = row.display || `${row.value || 0} ${row.unit || ""}`.trim();
    return {
      exercise: row.exercise || "",
      rank: row.rank || 1,
      name,
      emoji,
      score: row.value || row.count || 0,
      unit: row.unit || "",
      valueLabel,
      line: `${emoji ? emoji + " " : ""}${name} | ${valueLabel}`,
    };
  };

  const strength = ls.strengthLeaderboard?.rows || [];
  const calisthenics = ls.calisthenicsLeaderboard?.rows || [];
  const streaks = ls.topStreaks?.rows || [];

  const streakEntries = streaks.map((row) => {
    const username = row.username || row.canonical || "User";
    const emoji = (username.match(/\p{Extended_Pictographic}/u) || [])[0] || "";
    const name = username.replace(/\p{Extended_Pictographic}/gu, "").trim() || "User";
    const valueLabel = row.display || `${row.value || 0} ${row.unit || "days"}`.trim();
    const message = row.message || `${emoji ? emoji + " " : ""}${name} just logged ${row.value || 0} days in a row!`;
    return {
      rank: row.rank || 1,
      name,
      emoji,
      score: row.value || 0,
      valueLabel,
      line: `${emoji ? emoji + " " : ""}${name} | ${valueLabel}`,
      message,
    };
  });

  return {
    entries: strength.map(toEntry),
    groupEntries: calisthenics.map(toEntry),
    streakEntries,
    streakLiveMessage: streakEntries[0]?.message || "",
  };
}

// ── Dashboard metrics from Google Sheets (fallback) ───────────────────────────────

async function fetchDashboardMetrics() {
  const now = Date.now();
  if (cachedMetrics && now - cachedMetricsAt < INSTANCE_CACHE_MS) return cachedMetrics;

  try {
    const csvText = await fetchText(csvUrl("DashboardData"));
    const rows = parseCsv(csvText);
    if (rows.length < 2) throw new Error("empty sheet");

    const headers = rows[0].map((h) => String(h).trim().toLowerCase());
    const wi = headers.indexOf("window");
    const ui = headers.indexOf("users active");
    const woi = headers.indexOf("workouts logged");
    const ci = headers.indexOf("calories tracked");
    const gi = headers.indexOf("gallons drank");

    const todayRow = rows.slice(1).find((r) => (r[wi] || "").trim().toLowerCase() === "today");
    const weekRow = rows.slice(1).find((r) => (r[wi] || "").trim().toLowerCase() === "week");

    const result = {
      usersToday: toNumber(todayRow?.[ui]) ?? 0,
      usersThisWeek: toNumber(weekRow?.[ui]) ?? toNumber(todayRow?.[ui]) ?? 0,
      workoutsLogged: toNumber(todayRow?.[woi]) ?? 0,
      caloriesTracked: toNumber(todayRow?.[ci]) ?? 0,
      gallonsDrank: toNumber(todayRow?.[gi]) ?? 0,
    };
    cachedMetrics = result;
    cachedMetricsAt = now;
    return result;
  } catch (err) {
    console.warn("home renderer: metrics fetch failed:", err.message);
    return cachedMetrics || { usersToday: 0, usersThisWeek: 0, workoutsLogged: 0, caloriesTracked: 0, gallonsDrank: 0 };
  }
}

// ── Leaderboard from Google Sheets (lightweight, same as public-leaderboard fallback) ──

function normalizeEntry(row, exercise, fallbackUnit) {
  const ex = clean(row[0]).toUpperCase();
  if (ex !== exercise.toUpperCase()) return null;
  const rank = toNumber(row[1]) ?? Number.POSITIVE_INFINITY;
  const username = clean(row[2]);
  const score = Math.max(toNumber(row[3]) ?? 0, 0);
  const unit = clean(row[4]) || fallbackUnit;
  const display = clean(row[6]);
  const parts = display.includes("|") ? display.split("|") : [];
  const displayName = parts[0] || "";
  const displayValue = parts.slice(1).join("|").trim();
  const nameRaw = username || displayName;
  const emoji = (nameRaw.match(/\p{Extended_Pictographic}/u) || [])[0] || "";
  const name = nameRaw.replace(/\p{Extended_Pictographic}/gu, "").trim() || "User";
  const valueLabel = displayValue || `${score} ${unit}`.trim();
  return { exercise: ex, rank, name, emoji, score, unit, valueLabel, line: `${emoji ? emoji + " " : ""}${name} | ${valueLabel}` };
}

function topByExercise(rows, exercises, fallbackUnit) {
  const map = new Map();
  for (const row of rows) {
    for (const ex of exercises) {
      const entry = normalizeEntry(row, ex, fallbackUnit);
      if (entry) map.set(ex, [...(map.get(ex) || []), entry]);
    }
  }
  return exercises.map((ex) => {
    const ranked = (map.get(ex) || []).sort((a, b) => a.rank !== b.rank ? a.rank - b.rank : b.score - a.score);
    return ranked.find((e) => e.rank === 1) || ranked[0] || { exercise: ex, name: "No data", emoji: "", score: 0, valueLabel: "", line: "No data" };
  });
}

function parseStreakRows(rows) {
  return rows
    .map((row) => {
      const rank = toNumber(row[0]);
      const username = clean(row[1]);
      const days = Math.max(toNumber(row[2]) ?? 0, 0);
      const display = clean(row[4]);
      const lower = `${username} ${display}`.toLowerCase();
      if (rank === null || lower.includes("username") || lower.includes("generated at")) return null;
      const parts = display.includes("|") ? display.split("|") : [];
      const nameRaw = username || parts[0] || "User";
      const emoji = (nameRaw.match(/\p{Extended_Pictographic}/u) || [])[0] || "";
      const name = nameRaw.replace(/\p{Extended_Pictographic}/gu, "").trim() || "User";
      const valueLabel = parts.slice(1).join("|").trim() || `${days} days`.trim();
      return { rank, name, emoji, score: days, valueLabel, line: `${emoji ? emoji + " " : ""}${name} | ${valueLabel}`, message: `${emoji ? emoji + " " : ""}${name} just logged ${days} days in a row!` };
    })
    .filter(Boolean)
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : b.score - a.score))
    .slice(0, 20);
}

async function fetchSheetLeaderboard() {
  const now = Date.now();
  if (cachedLeaderboard && now - cachedLeaderboardAt < INSTANCE_CACHE_MS) return cachedLeaderboard;

  try {
    const [strength, calisthenics, streaks] = await Promise.all([
      fetchText(csvUrl("Site Strength")),
      fetchText(csvUrl("Site Calisthenics")),
      fetchText(csvUrl("Top Streaks")),
    ]);

    const entries = topByExercise(parseCsv(strength), STRENGTH_EXERCISES, "lb");
    const groupEntries = topByExercise(parseCsv(calisthenics), CALISTHENICS_EXERCISES, "reps");
    const streakEntries = parseStreakRows(parseCsv(streaks));
    const streakLiveMessage = streakEntries[0]?.message || "";

    const result = { entries, groupEntries, streakEntries, streakLiveMessage };
    cachedLeaderboard = result;
    cachedLeaderboardAt = now;
    return result;
  } catch (err) {
    console.warn("home renderer: leaderboard fetch failed:", err.message);
    return cachedLeaderboard || { entries: [], groupEntries: [], streakEntries: [], streakLiveMessage: "" };
  }
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

  const liveStats = flags?.liveStats;
  const metrics = metricsFromLiveStats(liveStats) || await fetchDashboardMetrics();
  const leaderboard = leaderboardFromLiveStats(liveStats) || await fetchSheetLeaderboard();

  const messagingServices = resolveMessagingServices(flags);
  const metricsJson = metrics ? JSON.stringify(metrics) : null;
  const leaderboardJson = leaderboard ? JSON.stringify(leaderboard) : null;

  const injection = buildInjection(messagingServices, flags, metricsJson, leaderboardJson);

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
