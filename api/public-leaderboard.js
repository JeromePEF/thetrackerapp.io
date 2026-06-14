const API_BASE = process.env.API_BASE || "https://api.thetrackerapp.io";
const DASHBOARD_METRICS_SHEET_ID = "1Fd0wKgx7qB6UVoxdk1hkZdjT-ymsScmwzLjeflaW-3c";
const STRENGTH_EXERCISES = ["BENCH", "SQUAT", "DEADLIFT"];
const CALISTHENICS_EXERCISES = ["PUSHUPS", "PULLUPS", "SQUATS", "DIPS"];
const REQUEST_TIMEOUT_MS = 6000;
const BACKEND_PUBLIC_SNAPSHOT_ENDPOINT = "/api/public-site-snapshot";

function csvUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${DASHBOARD_METRICS_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function clean(value) {
  return String(value || "").trim();
}

function emojiFrom(value) {
  return clean(value).match(/\p{Extended_Pictographic}/u)?.[0] || "";
}

function stripEmoji(value) {
  return clean(value).replace(/\p{Extended_Pictographic}/gu, "").trim();
}

function formatValue(value) {
  const number = toNumber(value);
  if (number === null) {
    return clean(value);
  }
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
}

function normalizePublicEntry(entry) {
  const exercise = clean(entry?.exercise).toUpperCase();
  const rank = toNumber(entry?.rank) ?? Number.POSITIVE_INFINITY;
  const score = Math.max(toNumber(entry?.score) ?? toNumber(entry?.value) ?? 0, 0);
  const displayName = clean(entry?.displayName) || clean(entry?.username) || clean(entry?.name) || "User";
  const emoji = emojiFrom(displayName);
  const name = stripEmoji(displayName) || "User";
  const unit = clean(entry?.unit);
  const valueLabel = clean(entry?.valueLabel) || `${formatValue(score)} ${unit}`.trim();

  return {
    exercise,
    rank,
    name,
    emoji,
    score,
    unit,
    valueLabel,
    line: `${emoji ? `${emoji} ` : ""}${name} | ${valueLabel}`,
  };
}

function topOneByExercise(rows, exercises) {
  const grouped = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const normalized = normalizePublicEntry(row);
    if (!exercises.includes(normalized.exercise)) {
      return;
    }

    grouped.set(normalized.exercise, [...(grouped.get(normalized.exercise) || []), normalized]);
  });

  return exercises.map((exercise) => {
    const ranked = (grouped.get(exercise) || []).sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return b.score - a.score;
    });

    return ranked[0] || {
      exercise,
      name: "No data",
      emoji: "",
      score: 0,
      valueLabel: "",
      line: "No data",
    };
  });
}

function normalizePublicStreak(entry) {
  const rank = toNumber(entry?.rank) ?? Number.POSITIVE_INFINITY;
  const days = Math.max(toNumber(entry?.days) ?? toNumber(entry?.score) ?? 0, 0);
  const displayName = clean(entry?.displayName) || clean(entry?.username) || clean(entry?.name) || "User";
  const emoji = emojiFrom(displayName);
  const name = stripEmoji(displayName) || "User";
  const valueLabel = clean(entry?.valueLabel) || `${formatValue(days)} days`;

  return {
    rank,
    name,
    emoji,
    score: days,
    valueLabel,
    line: `${emoji ? `${emoji} ` : ""}${name} | ${valueLabel}`,
    message: `${emoji ? `${emoji} ` : ""}${name} just logged ${formatValue(days)} days in a row!`,
  };
}

function normalizeBackendSnapshot(body) {
  const leaderboards = body?.leaderboards || {};
  const metrics = body?.metrics || {};

  const streakEntries = (Array.isArray(leaderboards.streaks) ? leaderboards.streaks : [])
    .map(normalizePublicStreak)
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : b.score - a.score))
    .slice(0, 20);

  return {
    ok: true,
    generatedAt: clean(body?.generatedAt) || new Date().toISOString(),
    source: "backend-public-site-snapshot",
    sourceVersion: clean(body?.sourceVersion),
    entries: topOneByExercise(leaderboards.strength, STRENGTH_EXERCISES),
    groupEntries: topOneByExercise(leaderboards.calisthenics, CALISTHENICS_EXERCISES),
    streakEntries,
    streakLiveMessage: streakEntries[0]?.message || "",
    pebble: leaderboards.pebble && typeof leaderboards.pebble === "object" ? leaderboards.pebble : {},
    usersToday: toNumber(metrics.usersToday) ?? 0,
    usersThisWeek: toNumber(metrics.usersThisWeek) ?? 0,
    usersOnline: toNumber(metrics.usersOnline) ?? 0,
    workoutsLogged: toNumber(metrics.workoutsLogged) ?? 0,
    caloriesTracked: toNumber(metrics.caloriesTracked) ?? 0,
    gallonsDrank: toNumber(metrics.gallonsDrank) ?? 0,
    directories: body?.directories && typeof body.directories === "object" ? body.directories : {},
  };
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "text/csv,text/plain,*/*" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Fetch failed (${response.status})`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(endpoint) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`${endpoint} failed (${response.status})`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getBackendPublicSnapshot() {
  const body = await fetchJson(BACKEND_PUBLIC_SNAPSHOT_ENDPOINT);
  if (!body?.ok) {
    throw new Error("Backend public snapshot returned ok=false.");
  }
  return normalizeBackendSnapshot(body);
}

function parseCategoryRows(rows, exercises, fallbackUnit) {
  const grouped = new Map();

  rows.forEach((row) => {
    const exercise = clean(row[0]).toUpperCase();
    if (!exercises.includes(exercise)) {
      return;
    }

    const rank = toNumber(row[1]) ?? Number.POSITIVE_INFINITY;
    const username = clean(row[2]);
    const score = Math.max(toNumber(row[3]) ?? 0, 0);
    const unit = clean(row[4]) || fallbackUnit;
    const display = clean(row[6]);
    const displayParts = display.includes("|") ? display.split("|") : [];
    const displayName = displayParts[0] || "";
    const displayValue = displayParts.slice(1).join("|").trim();
    const nameRaw = username || displayName;
    const isNoData = /^n\/?a$/i.test(nameRaw) || /^no data$/i.test(nameRaw);
    const emoji = isNoData ? "" : emojiFrom(nameRaw);
    const name = isNoData ? "No data" : stripEmoji(nameRaw) || "User";
    const valueLabel = isNoData ? "" : displayValue || `${formatValue(score)} ${unit}`.trim();
    const entry = {
      exercise,
      rank,
      name,
      emoji,
      score,
      valueLabel,
      line: isNoData ? "No data" : `${emoji ? `${emoji} ` : ""}${name} | ${valueLabel}`,
    };

    grouped.set(exercise, [...(grouped.get(exercise) || []), entry]);
  });

  return exercises.map((exercise) => {
    const entries = (grouped.get(exercise) || []).sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return b.score - a.score;
    });
    return entries.find((entry) => entry.rank === 1) || entries[0] || {
      exercise,
      name: "No data",
      emoji: "",
      score: 0,
      valueLabel: "",
      line: "No data",
    };
  });
}

function parseStreakRows(rows) {
  return rows
    .map((row) => {
      const rank = toNumber(row[0]);
      const username = clean(row[1]);
      const days = Math.max(toNumber(row[2]) ?? 0, 0);
      const unit = clean(row[3]) || "days";
      const display = clean(row[4]);
      const lower = `${username} ${display}`.toLowerCase();
      if (rank === null || lower.includes("username") || lower.includes("generated at")) {
        return null;
      }
      const displayParts = display.includes("|") ? display.split("|") : [];
      const nameRaw = username || displayParts[0] || "User";
      const emoji = emojiFrom(nameRaw);
      const name = stripEmoji(nameRaw) || "User";
      const valueLabel = displayParts.slice(1).join("|").trim() || `${formatValue(days)} ${unit}`.trim();
      return {
        rank,
        name,
        emoji,
        score: days,
        valueLabel,
        line: `${emoji ? `${emoji} ` : ""}${name} | ${valueLabel}`,
        message: `${emoji ? `${emoji} ` : ""}${name} just logged ${formatValue(days)} days in a row!`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : b.score - a.score))
    .slice(0, 20);
}

function arrayFromPath(source, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], source);
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function normalizePebbleRows(body, paths) {
  return arrayFromPath(body || {}, paths).map((entry) => {
    const name = clean(entry?.username) || clean(entry?.name) || clean(entry?.contact) || "User";
    const score =
      toNumber(entry?.value) ??
      toNumber(entry?.score) ??
      toNumber(entry?.amount) ??
      toNumber(entry?.steps) ??
      toNumber(entry?.miles) ??
      0;
    return {
      name,
      score: Math.max(score, 0),
      unit: clean(entry?.unit),
      valueLabel: clean(entry?.valueLabel) || clean(entry?.valueText) || clean(entry?.display) || clean(entry?.details),
      details: clean(entry?.details),
    };
  });
}

function firstRows(primary, fallback) {
  return primary.length ? primary : fallback;
}

async function getPebble() {
  const [combined, calories, workouts, steps, sleep, miles] = await Promise.allSettled([
    fetchJson("/api/pebble/leaderboard"),
    fetchJson("/api/pebble/calories-burned"),
    fetchJson("/api/pebble/top-workouts"),
    fetchJson("/api/pebble/steps"),
    fetchJson("/api/pebble/sleep-scores"),
    fetchJson("/api/pebble/miles-traversed"),
  ]);

  const base = combined.status === "fulfilled" ? combined.value : {};
  const caloriesBody = calories.status === "fulfilled" ? calories.value : {};
  const workoutsBody = workouts.status === "fulfilled" ? workouts.value : {};
  const stepsBody = steps.status === "fulfilled" ? steps.value : {};
  const sleepBody = sleep.status === "fulfilled" ? sleep.value : {};
  const milesBody = miles.status === "fulfilled" ? miles.value : {};

  return {
    date: clean(base.date) || clean(base.asOf) || clean(base.generatedAt) || null,
    caloriesTop: firstRows(
      normalizePebbleRows(base, ["caloriesBurnedTop", "caloriesTop", "leaderboard.calories", "leaderboards.calories", "data.caloriesTop"]),
      normalizePebbleRows(caloriesBody, ["caloriesBurnedTop", "caloriesTop", "top", "entries", "rows", "data"]),
    ),
    workoutsTop: firstRows(
      normalizePebbleRows(base, ["workoutsTop", "topWorkouts", "leaderboard.workouts", "leaderboards.workouts", "data.workoutsTop"]),
      normalizePebbleRows(workoutsBody, ["workoutsTop", "topWorkouts", "top", "entries", "rows", "data"]),
    ),
    stepsTop: firstRows(
      normalizePebbleRows(base, ["stepsTop", "leaderboard.steps", "leaderboards.steps", "data.stepsTop"]),
      normalizePebbleRows(stepsBody, ["stepsTop", "topSteps", "top", "entries", "rows", "data"]),
    ),
    sleepTop: firstRows(
      normalizePebbleRows(base, ["sleepScoresTop", "sleepTop", "leaderboard.sleep", "leaderboards.sleep", "data.sleepTop"]),
      normalizePebbleRows(sleepBody, ["sleepScoresTop", "sleepTop", "top", "entries", "rows", "data"]),
    ),
    milesTop: firstRows(
      normalizePebbleRows(base, ["milesTraversedTop", "milesTop", "leaderboard.miles", "leaderboards.miles", "data.milesTop"]),
      normalizePebbleRows(milesBody, ["milesTraversedTop", "milesTop", "top", "entries", "rows", "data"]),
    ),
    totalStepsAllTime: toNumber(base.totalStepsAllTime) ?? toNumber(stepsBody.totalStepsAllTime) ?? 0,
    totalMilesAllTime: toNumber(base.totalMilesAllTime) ?? toNumber(milesBody.totalMilesAllTime) ?? 0,
    stepEvents: arrayFromPath(base, ["recentStepEvents", "stepEvents", "recentSteps", "stepsEvents", "stepsTape", "steps.feed"]),
  };
}

async function getSheetLeaderboards() {
  const [strength, calisthenics, streaks] = await Promise.all([
    fetchText(csvUrl("Site Strength")),
    fetchText(csvUrl("Site Calisthenics")),
    fetchText(csvUrl("Top Streaks")),
  ]);

  return {
    entries: parseCategoryRows(parseCsv(strength), STRENGTH_EXERCISES, "lb"),
    groupEntries: parseCategoryRows(parseCsv(calisthenics), CALISTHENICS_EXERCISES, "reps"),
    streakEntries: parseStreakRows(parseCsv(streaks)),
  };
}

async function getDashboardMetricsFromSheet() {
  try {
    const csvText = await fetchText(csvUrl("DashboardData"));
    const rows = parseCsv(csvText);
    if (rows.length < 2) {
      throw new Error("DashboardData sheet returned no data rows.");
    }

    const headers = rows[0].map((h) => String(h).trim().toLowerCase());
    const windowIdx = headers.indexOf("window");
    const usersIdx = headers.indexOf("users active");
    const workoutsIdx = headers.indexOf("workouts logged");
    const caloriesIdx = headers.indexOf("calories tracked");
    const gallonsIdx = headers.indexOf("gallons drank");

    const todayRow = rows.slice(1).find((row) => (row[windowIdx] || "").trim().toLowerCase() === "today");
    const weekRow = rows.slice(1).find((row) => (row[windowIdx] || "").trim().toLowerCase() === "week");

    return {
      usersToday: toNumber(todayRow?.[usersIdx]) ?? 0,
      usersThisWeek: toNumber(weekRow?.[usersIdx]) ?? toNumber(todayRow?.[usersIdx]) ?? 0,
      workoutsLogged: toNumber(todayRow?.[workoutsIdx]) ?? 0,
      caloriesTracked: toNumber(todayRow?.[caloriesIdx]) ?? 0,
      gallonsDrank: toNumber(todayRow?.[gallonsIdx]) ?? 0,
    };
  } catch {
    return {
      usersToday: 0,
      usersThisWeek: 0,
      workoutsLogged: 0,
      caloriesTracked: 0,
      gallonsDrank: 0,
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=45");

  try {
    return res.status(200).json(await getBackendPublicSnapshot());
  } catch {
    // Keep the public page available if the new backend snapshot is temporarily down.
  }

  const [sheetResult, pebbleResult, liveStreakResult, metricsResult] = await Promise.allSettled([
    getSheetLeaderboards(),
    getPebble(),
    fetchJson("/api/streaks/live"),
    getDashboardMetricsFromSheet(),
  ]);

  if (sheetResult.status !== "fulfilled") {
    return res.status(502).json({
      ok: false,
      error: "Public leaderboard snapshot unavailable.",
    });
  }

  const streakLiveMessage =
    clean(liveStreakResult.status === "fulfilled" ? liveStreakResult.value?.message || liveStreakResult.value?.text : "") ||
    sheetResult.value.streakEntries[0]?.message ||
    "";

  const metrics = metricsResult.status === "fulfilled" ? metricsResult.value : {};

  return res.status(200).json({
    ok: true,
    generatedAt: new Date().toISOString(),
    source: "vercel-public-leaderboard-snapshot",
    ...sheetResult.value,
    streakLiveMessage,
    pebble: pebbleResult.status === "fulfilled" ? pebbleResult.value : {},
    usersToday: metrics.usersToday ?? 0,
    usersThisWeek: metrics.usersThisWeek ?? 0,
    usersOnline: 0,
    workoutsLogged: metrics.workoutsLogged ?? 0,
    caloriesTracked: metrics.caloriesTracked ?? 0,
    gallonsDrank: metrics.gallonsDrank ?? 0,
    directories: {},
  });
}
