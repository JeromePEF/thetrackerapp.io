const API_BASE = "https://api.thetrackerapp.io";
const SHEET_ID = "1Wslj5gWIx8CQ1Qoui2B8NtUH4V7BhUe7emU0Q4Hd1ak";
const LEADERBOARD_GID = "1755166331";

const GVIZ_QUERY = "select A,B,C,D,E,F,G,H";

function normalizeCellValue(cell) {
  if (!cell) {
    return "";
  }

  if (cell.v !== null && cell.v !== undefined) {
    return cell.v;
  }

  if (cell.f !== null && cell.f !== undefined) {
    return cell.f;
  }

  return "";
}

function parseGvizDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const gvizDateMatch = /^Date\((\d{4}),(\d{1,2}),(\d{1,2})(?:,(\d{1,2}),(\d{1,2}),(\d{1,2}))?\)$/.exec(trimmed);

    if (gvizDateMatch) {
      const year = Number(gvizDateMatch[1]);
      const month = Number(gvizDateMatch[2]);
      const day = Number(gvizDateMatch[3]);
      const hour = Number(gvizDateMatch[4] || 0);
      const minute = Number(gvizDateMatch[5] || 0);
      const second = Number(gvizDateMatch[6] || 0);
      const parsed = new Date(year, month, day, hour, minute, second);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfLocalWeek(date) {
  const day = (date.getDay() + 6) % 7;
  const clone = startOfLocalDay(date);
  clone.setDate(clone.getDate() - day);
  return clone;
}

function normalizeName(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function toNumeric(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.replace(/[^\d.-]/g, "").trim();
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function isLikelyHeaderRow(row) {
  const joined = row
    .map((item) => String(item || "").toLowerCase())
    .join("|");

  return joined.includes("timestamp") && joined.includes("username") && joined.includes("exercise");
}

function toModelRows(rawRows) {
  const rows = rawRows.map((row) => row.map((cell) => (typeof cell === "string" ? cell.trim() : cell)));

  if (rows.length && isLikelyHeaderRow(rows[0])) {
    rows.shift();
  }

  return rows.map((row, index) => {
    const username = normalizeName(row[4], normalizeName(row[2], `User ${index + 1}`));
    const eventDate = parseGvizDate(row[6]) || parseGvizDate(row[0]);
    const board = normalizeName(row[2], "");
    const value = normalizeName(row[5], "");

    return {
      username,
      board,
      exercise: normalizeName(row[3], ""),
      value,
      valueNumeric: toNumeric(row[5]),
      scoreD: toNumeric(row[3]),
      eventDate,
    };
  });
}

function rowsWithScores(rows) {
  const rowsWithD = rows.filter((row) => row.exercise || row.scoreD !== null);
  const numericD = rowsWithD.filter((row) => row.scoreD !== null);
  const useNumericD = rowsWithD.length > 0 && numericD.length / rowsWithD.length >= 0.6;
  return { rowsWithD, useNumericD };
}

function resolveScoreIncrement(row, useNumericD) {
  return useNumericD ? Math.max(row.scoreD || 0, 0) : row.exercise ? 1 : 0;
}

function buildLeaderboard(rows) {
  const { rowsWithD, useNumericD } = rowsWithScores(rows);

  const byUser = new Map();

  rowsWithD.forEach((row) => {
    const current = byUser.get(row.username) || 0;
    const increment = resolveScoreIncrement(row, useNumericD);
    byUser.set(row.username, current + increment);
  });

  return [...byUser.entries()]
    .map(([name, score]) => ({ name, score }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function buildGroupLeaderboard(rows) {
  const { rowsWithD, useNumericD } = rowsWithScores(rows);
  const byGroup = new Map();

  rowsWithD.forEach((row) => {
    if (!row.board) {
      return;
    }

    const current = byGroup.get(row.board) || 0;
    const increment = resolveScoreIncrement(row, useNumericD);
    byGroup.set(row.board, current + increment);
  });

  return [...byGroup.entries()]
    .map(([name, score]) => ({ name, score }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function buildUsageCounts(rows) {
  const dated = rows.filter((row) => row.eventDate instanceof Date && !Number.isNaN(row.eventDate.getTime()) && row.exercise);

  if (!dated.length) {
    const uniqueUsers = new Set(rows.filter((row) => row.exercise).map((row) => row.username));
    const fallbackCount = uniqueUsers.size;
    return {
      usersToday: fallbackCount,
      usersThisWeek: fallbackCount,
    };
  }

  const now = new Date();
  const startToday = startOfLocalDay(now);
  const startWeek = startOfLocalWeek(now);

  const usersToday = new Set();
  const usersThisWeek = new Set();

  dated.forEach((row) => {
    if (row.eventDate >= startWeek && row.eventDate <= now) {
      usersThisWeek.add(row.username);
    }

    if (row.eventDate >= startToday && row.eventDate <= now) {
      usersToday.add(row.username);
    }
  });

  return {
    usersToday: usersToday.size,
    usersThisWeek: usersThisWeek.size,
  };
}

function isRunningRow(row) {
  const merged = `${row.board} ${row.exercise}`.toLowerCase();
  return merged.includes("run");
}

function hasWorkoutActivity(row) {
  if (row.exercise) {
    return true;
  }

  return row.scoreD !== null || row.valueNumeric !== null;
}

function buildLiveUsageCounters(rows) {
  const now = Date.now();
  const onlineWindowMs = 15 * 60 * 1000;
  const onlineUsers = new Set();
  let workoutsLogged = 0;

  rows.forEach((row) => {
    if (!hasWorkoutActivity(row)) {
      return;
    }

    workoutsLogged += 1;

    if (
      row.eventDate instanceof Date &&
      !Number.isNaN(row.eventDate.getTime()) &&
      now - row.eventDate.getTime() <= onlineWindowMs
    ) {
      onlineUsers.add(row.username);
    }
  });

  return {
    usersOnline: onlineUsers.size,
    workoutsLogged,
  };
}

function localDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function longestConsecutiveStreak(dayKeys) {
  if (!dayKeys.length) {
    return 0;
  }

  let best = 1;
  let current = 1;

  for (let index = 1; index < dayKeys.length; index += 1) {
    const previous = new Date(`${dayKeys[index - 1]}T00:00:00`);
    const next = new Date(`${dayKeys[index]}T00:00:00`);
    const diff = (next - previous) / (24 * 60 * 60 * 1000);

    if (diff === 1) {
      current += 1;
      if (current > best) {
        best = current;
      }
      continue;
    }

    current = 1;
  }

  return best;
}

function streakMapByUser(rows) {
  const byUserDays = new Map();

  rows.forEach((row) => {
    if (!row.exercise || !(row.eventDate instanceof Date) || Number.isNaN(row.eventDate.getTime())) {
      return;
    }

    const day = localDayKey(row.eventDate);
    if (!byUserDays.has(row.username)) {
      byUserDays.set(row.username, new Set());
    }

    byUserDays.get(row.username).add(day);
  });

  const streakMap = new Map();
  for (const [name, daySet] of byUserDays.entries()) {
    const sortedDays = [...daySet].sort((a, b) => a.localeCompare(b));
    streakMap.set(name, longestConsecutiveStreak(sortedDays));
  }

  return streakMap;
}

function buildStreakLeaderboard(rows) {
  const streakMap = streakMapByUser(rows);

  return [...streakMap.entries()]
    .map(([name, score]) => ({ name, score }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function buildLiveActivityEvents(rows) {
  const streakMap = streakMapByUser(rows);
  const dedupe = new Set();

  return rows
    .filter((row) => row.exercise)
    .sort((a, b) => {
      const aTime = a.eventDate instanceof Date && !Number.isNaN(a.eventDate.getTime()) ? a.eventDate.getTime() : 0;
      const bTime = b.eventDate instanceof Date && !Number.isNaN(b.eventDate.getTime()) ? b.eventDate.getTime() : 0;
      return bTime - aTime;
    })
    .map((row) => {
      return {
        name: row.username,
        exercise: row.exercise,
        value: row.value || "",
        streak: streakMap.get(row.username) || 0,
        occurredAt:
          row.eventDate instanceof Date && !Number.isNaN(row.eventDate.getTime())
            ? row.eventDate.toISOString()
            : null,
      };
    })
    .filter((event) => {
      const dedupeKey = `${event.name}|${event.exercise}|${event.value}|${event.occurredAt || ""}`;
      if (dedupe.has(dedupeKey)) {
        return false;
      }
      dedupe.add(dedupeKey);
      return true;
    })
    .slice(0, 40);
}

function topFromMap(map, limit = 5) {
  return [...map.entries()]
    .map(([name, score]) => ({ name, score }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function detectPebbleMetric(row) {
  const merged = `${row.board} ${row.exercise}`.toLowerCase();

  if (merged.includes("step")) {
    return "steps";
  }

  if (merged.includes("calor")) {
    return "calories";
  }

  if (merged.includes("workout") || merged.includes("exercise")) {
    return "workouts";
  }

  return null;
}

function buildPebbleLeaderboard(rows) {
  const buckets = {
    calories: new Map(),
    workouts: new Map(),
    steps: new Map(),
  };

  rows.forEach((row) => {
    const metric = detectPebbleMetric(row);
    if (!metric) {
      return;
    }

    const map = buckets[metric];
    const current = map.get(row.username) || 0;

    let increment = 0;
    if (metric === "workouts") {
      increment = row.valueNumeric !== null ? Math.max(row.valueNumeric, 0) : 1;
    } else {
      increment = row.valueNumeric ?? row.scoreD ?? 0;
      increment = Math.max(increment, 0);
    }

    if (increment <= 0) {
      return;
    }

    map.set(row.username, current + increment);
  });

  return {
    caloriesTop: topFromMap(buckets.calories),
    workoutsTop: topFromMap(buckets.workouts),
    stepsTop: topFromMap(buckets.steps),
  };
}

function readGvizTable() {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(GVIZ_QUERY);
    const src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=${LEADERBOARD_GID}&tq=${query}`;

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Leaderboard sheet timed out."));
    }, 12000);

    const previousGoogle = window.google;
    const previousQuery = previousGoogle?.visualization?.Query;
    let resolved = false;

    if (!window.google) {
      window.google = {};
    }

    if (!window.google.visualization) {
      window.google.visualization = {};
    }

    if (!window.google.visualization.Query) {
      window.google.visualization.Query = {};
    }

    window.google.visualization.Query.setResponse = (response) => {
      if (resolved) {
        return;
      }

      resolved = true;
      cleanup();

      if (!response || response.status !== "ok" || !response.table) {
        const details = response?.errors?.[0]?.detailed_message || "Unknown sheet error";
        reject(new Error(details));
        return;
      }

      resolve(response.table);
    };

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onerror = () => {
      if (resolved) {
        return;
      }

      resolved = true;
      cleanup();
      reject(new Error("Unable to load leaderboard script."));
    };

    document.head.append(script);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();

      if (previousGoogle === undefined) {
        delete window.google;
        return;
      }

      if (!window.google) {
        window.google = previousGoogle;
        return;
      }

      if (!window.google.visualization) {
        window.google.visualization = previousGoogle.visualization;
      }

      if (!window.google.visualization) {
        return;
      }

      if (previousQuery === undefined) {
        delete window.google.visualization.Query;
        return;
      }

      window.google.visualization.Query = previousQuery;
    }
  });
}

export async function fetchWorkoutLeaderboard() {
  const table = await readGvizTable();
  const rows = (table.rows || []).map((row) => (row.c || []).map(normalizeCellValue));
  const modelRows = toModelRows(rows);

  return {
    entries: buildLeaderboard(modelRows),
    groupEntries: buildGroupLeaderboard(modelRows),
    streakEntries: buildStreakLeaderboard(modelRows),
    liveEvents: buildLiveActivityEvents(modelRows),
    pebble: buildPebbleLeaderboard(modelRows),
    ...buildUsageCounts(modelRows),
    ...buildLiveUsageCounters(modelRows),
  };
}

function normalizePebbleEntry(entry) {
  const username = normalizeName(entry?.username, "");
  const contact = normalizeName(entry?.contact, "");
  const name = username || contact || "User";

  return {
    name,
    score: Number(entry?.value || 0),
    unit: normalizeName(entry?.unit, ""),
    details: normalizeName(entry?.details, ""),
  };
}

function coerceFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "").trim();
    if (!cleaned) {
      return null;
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readPath(source, path) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const parts = path.split(".");
  let current = source;

  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

function firstNumberFromPaths(source, paths) {
  for (const path of paths) {
    const value = coerceFiniteNumber(readPath(source, path));
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function firstArrayFromPaths(source, paths) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizePebbleStepEvent(event) {
  const name = normalizeName(event?.username, "") || normalizeName(event?.name, "") || normalizeName(event?.contact, "") || "User";

  const delta =
    coerceFiniteNumber(event?.stepDelta) ??
    coerceFiniteNumber(event?.delta) ??
    coerceFiniteNumber(event?.stepsAdded) ??
    coerceFiniteNumber(event?.value) ??
    0;

  const total =
    coerceFiniteNumber(event?.stepsTotal) ??
    coerceFiniteNumber(event?.totalSteps) ??
    coerceFiniteNumber(event?.runningTotal) ??
    0;

  const occurredAt = normalizeName(event?.occurredAt, "") || normalizeName(event?.timestamp, "") || normalizeName(event?.date, "");

  return {
    name,
    delta: Math.max(delta, 0),
    total: Math.max(total, 0),
    occurredAt,
  };
}

export async function fetchPebbleLeaderboard() {
  const response = await fetch(`${API_BASE}/api/pebble/leaderboard`);
  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.ok) {
    throw new Error(body?.error || body?.message || `Pebble leaderboard failed (${response.status})`);
  }

  const totalStepsAllTime =
    firstNumberFromPaths(body, [
      "totalStepsAllTime",
      "stepsAllTime",
      "allTimeSteps",
      "totalSteps",
      "totals.steps",
      "metrics.steps",
    ]) ?? 0;

  const totalMilesAllTime =
    firstNumberFromPaths(body, [
      "totalMilesAllTime",
      "milesAllTime",
      "allTimeMiles",
      "totalMiles",
      "totals.miles",
      "metrics.miles",
    ]) ?? 0;

  const rawStepEvents = firstArrayFromPaths(body, [
    "recentStepEvents",
    "stepEvents",
    "recentSteps",
    "stepsEvents",
    "stepsTape",
    "steps.feed",
  ]);

  return {
    date: body.date || null,
    caloriesTop: (body.caloriesBurnedTop || []).map(normalizePebbleEntry),
    workoutsTop: (body.workoutsTop || []).map(normalizePebbleEntry),
    stepsTop: (body.stepsTop || []).map(normalizePebbleEntry),
    totalStepsAllTime,
    totalMilesAllTime,
    stepEvents: rawStepEvents.map(normalizePebbleStepEvent).filter((event) => event.delta > 0 || event.total > 0),
  };
}

async function postJson(endpoint, payload) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = body?.error || body?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return { endpoint, body };
}

export async function fetchUsageStats() {
  const response = await fetch(`${API_BASE}/api/stats/usage`);
  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.ok) {
    throw new Error(body?.error || body?.message || `Usage stats failed (${response.status})`);
  }

  return {
    usersToday: Number(body.usersUsingToday || 0),
    usersThisWeek: Number(body.totalUsersThisWeek || 0),
    trackerProfiles: Number(body.trackerProfiles || 0),
    trackerLeads: Number(body.trackerLeads || 0),
    generatedAt: body.generatedAt || null,
  };
}

export async function fetchLiveMetrics() {
  const response = await fetch(`${API_BASE}/api/live-metrics`);
  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.ok) {
    throw new Error(body?.error || body?.message || `Live metrics failed (${response.status})`);
  }

  const metrics = body.metrics || {};

  return {
    generatedAt: body.generatedAt || null,
    masterLogSheetUrl: body.masterLogSheetUrl || "",
    usersUsingToday: {
      value: Number(metrics.usersUsingToday?.value || 0),
      sheetUrl: metrics.usersUsingToday?.sheetUrl || "",
    },
    totalUsersThisWeek: {
      value: Number(metrics.totalUsersThisWeek?.value || 0),
      sheetUrl: metrics.totalUsersThisWeek?.sheetUrl || "",
    },
    usersOnline: {
      value: Number(metrics.usersOnline?.value || 0),
      sheetUrl: metrics.usersOnline?.sheetUrl || "",
    },
    workoutsLogged: {
      value: Number(metrics.workoutsLogged?.value || 0),
      sheetUrl: metrics.workoutsLogged?.sheetUrl || "",
    },
    caloriesTracked: {
      value: Number(metrics.caloriesTracked?.value || 0),
      sheetUrl: metrics.caloriesTracked?.sheetUrl || "",
    },
    gallonsDrank: {
      value: Number(metrics.gallonsDrank?.value || 0),
      sheetUrl: metrics.gallonsDrank?.sheetUrl || "",
    },
  };
}

export async function submitSignup(payload) {
  if (payload?.provider === "iMessage") {
    const endpoints = ["/api/onboarding/trigger", "/api/welcome", "/api/onboarding/send-welcome"];
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        return await postJson(endpoint, payload);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("iMessage onboarding request failed.");
  }

  try {
    return await postJson("/api/onboarding", payload);
  } catch (primaryError) {
    try {
      return await postJson("/signup", payload);
    } catch {
      throw primaryError;
    }
  }
}

export { API_BASE };
