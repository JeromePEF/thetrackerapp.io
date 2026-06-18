import { fetchFeatureFlags } from "./feature-flags.js";

const API_BASE = "https://api.thetrackerapp.io";
const SHEET_ID = "1Wslj5gWIx8CQ1Qoui2B8NtUH4V7BhUe7emU0Q4Hd1ak";
const LEADERBOARD_GID = "1755166331";
const DASHBOARD_METRICS_SHEET_ID = "1Fd0wKgx7qB6UVoxdk1hkZdjT-ymsScmwzLjeflaW-3c";
const DASHBOARD_METRICS_SHEET_NAME = "DashboardData";
const DASHBOARD_METRICS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DASHBOARD_METRICS_SHEET_ID}/edit`;
const DASHBOARD_METRICS_CSV_URL = `https://docs.google.com/spreadsheets/d/${DASHBOARD_METRICS_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
  DASHBOARD_METRICS_SHEET_NAME,
)}`;
const SITE_LEADERBOARD_ENDPOINTS = ["/api/site-leaderboard", "/api/leaderboard/site"];
const SITE_STRENGTH_ENDPOINTS = ["/api/site-leaderboard/strength", "/api/leaderboard/strength"];
const SITE_CALISTHENICS_ENDPOINTS = ["/api/site-leaderboard/calisthenics", "/api/leaderboard/calisthenics"];
const STREAKS_ENDPOINTS = ["/api/streaks"];
const STREAKS_LIVE_ENDPOINTS = ["/api/streaks/live"];
const FRONTEND_DASHBOARD_SHEET_ENDPOINTS = ["/api/frontend-dashboard-sheet"];
const PEBBLE_LEADERBOARD_ENDPOINTS = ["/api/pebble/leaderboard"];
const PEBBLE_CALORIES_ENDPOINTS = ["/api/pebble/calories-burned", "/api/pebble/calories"];
const PEBBLE_WORKOUTS_ENDPOINTS = ["/api/pebble/top-workouts", "/api/pebble/workouts"];
const PEBBLE_STEPS_ENDPOINTS = ["/api/pebble/steps"];
const PEBBLE_SLEEP_ENDPOINTS = ["/api/pebble/sleep-scores", "/api/pebble/sleep"];
const PEBBLE_MILES_ENDPOINTS = ["/api/pebble/miles-traversed", "/api/pebble/miles"];
const STRENGTH_EXERCISES = ["BENCH", "SQUAT", "DEADLIFT"];
const CALISTHENICS_EXERCISES = ["PUSHUPS", "PULLUPS", "SQUATS", "DIPS"];
const SITE_STRENGTH_SHEET_NAME = "Site Strength";
const SITE_CALISTHENICS_SHEET_NAME = "Site Calisthenics";
const TOP_STREAKS_SHEET_NAME = "Top Streaks";
const DASHBOARD_SHEET_CACHE_TTL_MS = 5 * 60 * 1000;
const POST_TIMEOUT_MS = 12000;
const LOCAL_SIGNUP_PROXY_ENDPOINT = "/api/signup-proxy";
const LOCAL_LOGIN_CODE_REQUEST_ENDPOINT = "/api/login-code-request";
const LOCAL_LOGIN_CODE_VERIFY_ENDPOINT = "/api/login-code-verify";
const LOCAL_BACKEND_PROXY_ENDPOINT = "/api/backend-proxy";
const PUBLIC_LEADERBOARD_ENDPOINT = "/api/public-leaderboard";
const LOGIN_CODE_REQUEST_ENDPOINTS = ["/api/auth/login-code/request", "/api/auth/code/request", "/api/login-code/request"];
const LOGIN_CODE_VERIFY_ENDPOINTS = ["/api/auth/login-code/verify", "/api/auth/code/verify", "/api/login-code/verify"];

const GVIZ_QUERY = "select A,B,C,D,E,F,G,H";

let cachedDashboardSheetMeta = null;
let cachedDashboardSheetMetaAt = 0;

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
      period: normalizeName(row[1], ""),
      value,
      valueNumeric: toNumeric(row[5]),
      scoreD: toNumeric(row[3]),
      eventDate,
      details: normalizeName(row[7], ""),
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

function readGvizTableBySheetName(spreadsheetId, sheetName) {
  return new Promise((resolve, reject) => {
    const src = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetName,
    )}`;

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${sheetName} sheet timed out.`));
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
      reject(new Error(`Unable to load ${sheetName} sheet script.`));
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

function buildLegacyWorkoutLeaderboardFromSheet(modelRows) {
  const topByExercise = (exerciseList, defaultUnit) => {
    return exerciseList
      .map((exercise) => {
        const matchingRows = modelRows.filter((row) => canonicalExerciseName(row.exercise, exerciseList) === exercise);
        if (!matchingRows.length) {
          return null;
        }

        const bestRow = matchingRows.reduce((best, row) => {
          const rowScore = Math.max(row.valueNumeric ?? row.scoreD ?? 0, 0);
          const bestScore = Math.max(best.valueNumeric ?? best.scoreD ?? 0, 0);
          return rowScore > bestScore ? row : best;
        }, matchingRows[0]);

        const score = Math.max(bestRow.valueNumeric ?? bestRow.scoreD ?? 0, 0);
        const inferredUnit = detectUnitFromText(bestRow.details || bestRow.value, defaultUnit);
        const rawValueLabel = bestRow.value || "";
        const valueLabel =
          cleanLeaderboardValueLabel(rawValueLabel) ||
          `${formatSiteLeaderboardValue(score)} ${inferredUnit}`.trim();

        return {
          exercise,
          name: stripEmoji(bestRow.username) || "User",
          emoji: extractEmojiToken(bestRow.username, ""),
          score,
          valueLabel,
          line: `${extractEmojiToken(bestRow.username, "") ? `${extractEmojiToken(bestRow.username, "")} ` : ""}${stripEmoji(bestRow.username) || "User"} | ${valueLabel}`,
          occurredAt:
            bestRow.eventDate instanceof Date && !Number.isNaN(bestRow.eventDate.getTime())
              ? bestRow.eventDate.toISOString()
              : null,
        };
      })
      .filter(Boolean);
  };

  const strengthEntries = topByExercise(STRENGTH_EXERCISES, "lb/kg");
  const calisthenicsEntries = topByExercise(CALISTHENICS_EXERCISES, "reps");

  return {
    entries: strengthEntries,
    groupEntries: calisthenicsEntries,
    liveEvents: buildLiveActivityEvents(modelRows),
    pebble: buildPebbleLeaderboard(modelRows),
    ...buildUsageCounts(modelRows),
    ...buildLiveUsageCounters(modelRows),
  };
}

function normalizeSiteTabEntryFromRow(row, exerciseList, fallbackUnit) {
  const cells = Array.isArray(row?.c) ? row.c : [];
  const exerciseRaw = normalizeCellValue(cells[0]);
  const exercise = canonicalExerciseName(exerciseRaw, exerciseList);
  if (!exercise) {
    return null;
  }

  const rankRaw = normalizeCellValue(cells[1]);
  const rank = coerceFiniteNumber(rankRaw);
  const username = normalizeName(normalizeCellValue(cells[2]), "");
  const weightOrRepsValue = coerceFiniteNumber(normalizeCellValue(cells[3])) ?? coerceFiniteNumber(cells[3]?.f) ?? 0;
  const unit = normalizeName(normalizeCellValue(cells[4]), "") || fallbackUnit;
  const referencedDateCell = normalizeCellValue(cells[5]);
  const referencedDate = parseGvizDate(referencedDateCell);
  const display = normalizeName(normalizeCellValue(cells[6]), "");
  const nameFromDisplay = display.includes("|") ? display.split("|")[0].trim() : "";
  const valueFromDisplay = display.includes("|") ? display.split("|").slice(1).join("|").trim() : "";
  const valueLabel = valueFromDisplay || `${formatSiteLeaderboardValue(weightOrRepsValue)} ${unit}`.trim();

  const noDataUsername = /^n\/?a$/i.test(username);
  const noDataDisplay = /^n\/?a$/i.test(display);
  const isNoData = noDataUsername || noDataDisplay;
  const lowerUnit = unit.toLowerCase();
  const expectsRepUnit = fallbackUnit.toLowerCase() === "reps";
  const expectsWeightUnit = fallbackUnit.toLowerCase().includes("lb") || fallbackUnit.toLowerCase().includes("kg");

  if (!isNoData) {
    if (expectsRepUnit && !lowerUnit.includes("rep")) {
      return null;
    }

    if (expectsWeightUnit && !(lowerUnit.includes("lb") || lowerUnit.includes("kg"))) {
      return null;
    }
  }

  if (isNoData) {
    return {
      exercise,
      rank: rank === null ? Number.POSITIVE_INFINITY : rank,
      name: "No data",
      emoji: "",
      score: 0,
      valueLabel: "",
      line: "No data",
      referencedDate: null,
      isNoData: true,
    };
  }

  const name = stripEmoji(username || nameFromDisplay) || "User";
  const emoji = extractEmojiToken(username || nameFromDisplay, "");
  const line = display || `${emoji ? `${emoji} ` : ""}${name} | ${valueLabel}`;

  return {
    exercise,
    rank: rank === null ? Number.POSITIVE_INFINITY : rank,
    name,
    emoji,
    score: Math.max(weightOrRepsValue, 0),
    valueLabel,
    line,
    referencedDate: referencedDate instanceof Date && !Number.isNaN(referencedDate.getTime()) ? referencedDate.toISOString() : null,
    isNoData: false,
  };
}

function rankOneByExerciseFromSiteTab(table, exerciseList, fallbackUnit) {
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  const dataRows = rows.slice(2);
  const grouped = new Map();

  dataRows.forEach((row) => {
    const normalized = normalizeSiteTabEntryFromRow(row, exerciseList, fallbackUnit);
    if (!normalized) {
      return;
    }

    const current = grouped.get(normalized.exercise) || [];
    current.push(normalized);
    grouped.set(normalized.exercise, current);
  });

  return exerciseList.map((exercise) => {
    const entries = grouped.get(exercise) || [];
    const ranked = entries.sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return (b.score || 0) - (a.score || 0);
    });

    const topRankOne = ranked.find((entry) => entry.rank === 1);
    const selected = topRankOne || ranked[0] || null;

    if (!selected) {
      return {
        exercise,
        name: "No data",
        emoji: "",
        score: 0,
        valueLabel: "",
        line: "No data",
      };
    }

    if (selected.isNoData) {
      return {
        exercise,
        name: "No data",
        emoji: "",
        score: 0,
        valueLabel: "",
        line: "No data",
      };
    }

    return {
      exercise,
      name: selected.name,
      emoji: selected.emoji,
      score: selected.score,
      valueLabel: selected.valueLabel,
      line: selected.line,
      referencedDate: selected.referencedDate,
    };
  });
}

function normalizeTopStreakEntryFromRow(row) {
  const cells = Array.isArray(row?.c) ? row.c : [];
  const rankValue = coerceFiniteNumber(normalizeCellValue(cells[0]));
  const username = normalizeName(normalizeCellValue(cells[1]), "");
  const daysValue =
    coerceFiniteNumber(normalizeCellValue(cells[2])) ??
    coerceFiniteNumber(cells[2]?.f) ??
    coerceFiniteNumber(normalizeCellValue(cells[0])) ??
    0;
  const unit = normalizeName(normalizeCellValue(cells[3]), "days") || "days";
  const display = normalizeName(normalizeCellValue(cells[4]), "");

  const rowText = [username, display].join(" ").toLowerCase();
  if (rowText.includes("generated at") || rowText.includes("username")) {
    return null;
  }

  if (!username && !display && rankValue === null) {
    return null;
  }

  const isNoData = /^n\/?a$/i.test(username) || /^n\/?a$/i.test(display);
  if (isNoData) {
    return {
      rank: rankValue === null ? Number.POSITIVE_INFINITY : rankValue,
      name: "No data",
      emoji: "",
      score: 0,
      valueLabel: "-",
      line: "No data | -",
      message: "",
    };
  }

  const displayParts = parseNameValueFromLine(display);
  const baseName = username || displayParts.name || "User";
  const emoji = extractEmojiToken(baseName, "");
  const name = stripEmoji(baseName) || "User";
  const valueLabel = displayParts.value || `${formatSiteLeaderboardValue(daysValue)} ${unit}`.trim();
  const safeValueLabel = valueLabel || `${formatSiteLeaderboardValue(daysValue)} ${unit}`.trim() || "-";

  return {
    rank: rankValue === null ? Number.POSITIVE_INFINITY : rankValue,
    name,
    emoji,
    score: Math.max(daysValue, 0),
    valueLabel: safeValueLabel,
    line: `${emoji ? `${emoji} ` : ""}${name} | ${safeValueLabel}`,
    message: `${emoji ? `${emoji} ` : ""}${name} just logged ${formatSiteLeaderboardValue(daysValue)} days in a row!`,
  };
}

function topStreaksFromSiteTab(table) {
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  const entries = rows
    .map(normalizeTopStreakEntryFromRow)
    .filter(Boolean)
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return (b.score || 0) - (a.score || 0);
    })
    .slice(0, 20);

  return entries;
}

async function fetchJsonFromEndpoints(endpoints, options = {}) {
  const requireOk = options.requireOk !== false;
  const requestInit = options.requestInit || { cache: "no-store" };
  const errors = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, requestInit);
      let body = null;

      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        errors.push(body?.error || body?.message || `${endpoint} failed (${response.status})`);
        continue;
      }

      if (requireOk && body && typeof body === "object" && "ok" in body && !body.ok) {
        errors.push(body?.error || body?.message || `${endpoint} returned ok=false`);
        continue;
      }

      return { endpoint, body };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const joined = errors.filter(Boolean).join("; ");
  throw new Error(joined || "No endpoint response.");
}

function firstObjectFromPaths(source, paths) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }

  return null;
}

function firstStringFromPaths(source, paths) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeTabKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function mapTabUrlsObject(rawTabs) {
  const mapped = new Map();
  if (!rawTabs || typeof rawTabs !== "object") {
    return mapped;
  }

  Object.entries(rawTabs).forEach(([tabName, url]) => {
    if (typeof url !== "string" || !url.trim()) {
      return;
    }
    mapped.set(normalizeTabKey(tabName), url.trim());
  });

  return mapped;
}

function resolveTabUrl(tabMap, aliases) {
  for (const alias of aliases) {
    const value = tabMap.get(normalizeTabKey(alias));
    if (value) {
      return value;
    }
  }
  return "";
}

function resolveDashboardSheetMetadataFromBody(body) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const tabUrls =
    firstObjectFromPaths(body, [
      "tabUrls",
      "sheet.tabUrls",
      "data.tabUrls",
      "dashboard.tabUrls",
      "result.tabUrls",
      "payload.tabUrls",
    ]) || {};

  const csvUrls =
    firstObjectFromPaths(body, [
      "csvUrls",
      "sheet.csvUrls",
      "data.csvUrls",
      "dashboard.csvUrls",
      "result.csvUrls",
      "payload.csvUrls",
    ]) || {};

  const tabMap = mapTabUrlsObject(tabUrls);
  const csvMap = mapTabUrlsObject(csvUrls);
  const masterSheetUrl =
    firstStringFromPaths(body, [
      "sheetUrl",
      "spreadsheetUrl",
      "sheet.sheetUrl",
      "sheet.spreadsheetUrl",
      "data.sheetUrl",
      "data.spreadsheetUrl",
      "dashboard.sheetUrl",
      "dashboard.spreadsheetUrl",
    ]) || DASHBOARD_METRICS_SHEET_URL;

  return {
    sheetUrl: masterSheetUrl,
    tabUrls,
    csvUrls,
    dashboardDataTabUrl:
      resolveTabUrl(tabMap, ["DashboardData", "Dashboard Data"]) || `${masterSheetUrl}#gid=0`,
    dashboardDataCsvUrl:
      resolveTabUrl(csvMap, ["DashboardData", "Dashboard Data"]) || DASHBOARD_METRICS_CSV_URL,
    siteStrengthTabUrl: resolveTabUrl(tabMap, ["Site Strength", "Strength"]),
    siteStrengthCsvUrl: resolveTabUrl(csvMap, ["Site Strength", "Strength", "site_strength", "strength"]),
    siteCalisthenicsTabUrl: resolveTabUrl(tabMap, ["Site Calisthenics", "Calisthenics"]),
    siteCalisthenicsCsvUrl: resolveTabUrl(csvMap, ["Site Calisthenics", "Calisthenics", "site_calisthenics", "calisthenics"]),
    topStreaksTabUrl: resolveTabUrl(tabMap, ["Top Streaks", "Streaks", "top_streaks"]),
    topStreaksCsvUrl: resolveTabUrl(csvMap, ["Top Streaks", "Streaks", "top_streaks"]),
    pebbleCaloriesTabUrl: resolveTabUrl(tabMap, ["Pebble Calories", "Calories"]),
    pebbleWorkoutsTabUrl: resolveTabUrl(tabMap, ["Pebble Workouts", "Workouts"]),
    pebbleStepsTabUrl: resolveTabUrl(tabMap, ["Pebble Steps", "Steps"]),
    pebbleSleepTabUrl: resolveTabUrl(tabMap, ["Pebble Sleep", "Sleep"]),
    pebbleMilesTabUrl: resolveTabUrl(tabMap, ["Pebble Miles", "Miles"]),
  };
}

async function fetchDashboardSheetMetadata() {
  const now = Date.now();
  if (cachedDashboardSheetMeta && now - cachedDashboardSheetMetaAt < DASHBOARD_SHEET_CACHE_TTL_MS) {
    return cachedDashboardSheetMeta;
  }

  try {
    const response = await fetchJsonFromEndpoints(FRONTEND_DASHBOARD_SHEET_ENDPOINTS, { requireOk: false });
    const normalized = resolveDashboardSheetMetadataFromBody(response.body);
    if (normalized) {
      cachedDashboardSheetMeta = normalized;
      cachedDashboardSheetMetaAt = now;
      return normalized;
    }
  } catch {
    // Fall through to static defaults.
  }

  cachedDashboardSheetMeta = {
    sheetUrl: DASHBOARD_METRICS_SHEET_URL,
    tabUrls: {},
    csvUrls: {},
    dashboardDataTabUrl: DASHBOARD_METRICS_SHEET_URL,
    dashboardDataCsvUrl: DASHBOARD_METRICS_CSV_URL,
    siteStrengthTabUrl: "",
    siteStrengthCsvUrl: "",
    siteCalisthenicsTabUrl: "",
    siteCalisthenicsCsvUrl: "",
    topStreaksTabUrl: "",
    topStreaksCsvUrl: "",
    pebbleCaloriesTabUrl: "",
    pebbleWorkoutsTabUrl: "",
    pebbleStepsTabUrl: "",
    pebbleSleepTabUrl: "",
    pebbleMilesTabUrl: "",
  };
  cachedDashboardSheetMetaAt = now;
  return cachedDashboardSheetMeta;
}

function pickCategorySource(body, categoryName) {
  return (
    readPath(body, categoryName) ??
    readPath(body, `site.${categoryName}`) ??
    readPath(body, `leaderboard.${categoryName}`) ??
    readPath(body, `leaderboards.${categoryName}`) ??
    readPath(body, `data.${categoryName}`) ??
    readPath(body, `result.${categoryName}`) ??
    readPath(body, `payload.${categoryName}`) ??
    null
  );
}

function listFromUnknown(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const directArray = firstArrayFromPaths(value, ["rows", "entries", "leaders", "top", "items", "data"]);
  if (directArray.length) {
    return directArray;
  }

  const rowLikeKeys = ["name", "username", "user", "contact", "value", "score", "line", "display", "details", "emoji", "exercise", "metric"];
  const hasRowLikeShape = rowLikeKeys.some((key) => key in value);
  return hasRowLikeShape ? [value] : [];
}

function extractEmojiToken(value, fallback = "🔥") {
  const raw = String(value || "").trim();
  const match = raw.match(/\p{Extended_Pictographic}/u);
  return match ? match[0] : fallback;
}

function stripEmoji(value) {
  return String(value || "")
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeExerciseLabel(value, fallback = "") {
  const normalized = String(value || fallback)
    .trim()
    .toUpperCase();
  return normalized;
}

function formatSiteLeaderboardValue(value) {
  const numeric = coerceFiniteNumber(value);
  if (numeric === null) {
    return String(value || "").trim();
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 1,
    maximumFractionDigits: Number.isInteger(numeric) ? 0 : 1,
  }).format(numeric);
}

function normalizeSiteLeaderboardEntry(entry, fallbackExercise, fallbackUnit) {
  if (typeof entry === "string") {
    const trimmed = entry.trim();
    if (!trimmed) {
      return null;
    }

    const lineScore = coerceFiniteNumber(trimmed) ?? 0;
    return {
      exercise: normalizeExerciseLabel(fallbackExercise),
      emoji: extractEmojiToken(trimmed, ""),
      name: stripEmoji(trimmed) || "User",
      score: Math.max(lineScore, 0),
      valueLabel: trimmed,
      line: trimmed,
    };
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const rawLine =
    normalizeName(entry.line, "") ||
    normalizeName(entry.displayLine, "") ||
    normalizeName(entry.display, "") ||
    normalizeName(entry.text, "");

  const exercise = normalizeExerciseLabel(
    entry.exercise || entry.lift || entry.metric || entry.category || fallbackExercise,
    fallbackExercise,
  );
  const score =
    coerceFiniteNumber(entry.score) ??
    coerceFiniteNumber(entry.value) ??
    coerceFiniteNumber(entry.weight) ??
    coerceFiniteNumber(entry.reps) ??
    0;
  const valueRaw =
    normalizeName(entry.valueLabel, "") ||
    normalizeName(entry.valueText, "") ||
    normalizeName(entry.value, "") ||
    normalizeName(entry.weightLabel, "") ||
    normalizeName(entry.repsLabel, "");
  const detailsText = normalizeName(entry.details, "");
  const unit = detectUnitFromText(`${valueRaw} ${detailsText}`, fallbackUnit) || fallbackUnit;
  const cleanedPrimaryValue = cleanLeaderboardValueLabel(valueRaw);
  const cleanedDetailsValue = cleanLeaderboardValueLabel(detailsText);
  const valueLabel = cleanedPrimaryValue || cleanedDetailsValue || `${formatSiteLeaderboardValue(score)} ${unit}`.trim() || "-";
  const entryUnit = normalizeName(entry.unit, "");
  const name =
    normalizeName(entry.username, "") ||
    normalizeName(entry.user, "") ||
    normalizeName(entry.name, "") ||
    normalizeName(entry.contact, "") ||
    "User";
  const emoji = extractEmojiToken(entry.emoji || name || rawLine, "");
  const safeName = stripEmoji(name) || "User";
  const lineCore = rawLine || `${emoji ? `${emoji} ` : ""}${safeName} | ${valueLabel}${unit && !rawLine ? ` ${unit}` : ""}`;

  return {
    exercise,
    emoji,
    name: safeName,
    score: Math.max(score, 0),
    valueLabel:
      valueLabel + (entryUnit && valueLabel && !valueLabel.toLowerCase().includes(entryUnit.toLowerCase()) ? ` ${entryUnit}` : ""),
    line: lineCore.trim(),
  };
}

function rankEntries(entries, limit = 10) {
  return entries
    .filter(Boolean)
    .sort((a, b) => {
      const scoreDelta = (b.score || 0) - (a.score || 0);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return a.exercise.localeCompare(b.exercise);
    })
    .slice(0, limit);
}

function canonicalExerciseName(value, exerciseList) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (!normalized) {
    return "";
  }

  let canonical = normalized;

  if (normalized === "PUSHUP" || normalized === "PUSHUPS") {
    canonical = "PUSHUPS";
  } else if (normalized === "PULLUP" || normalized === "PULLUPS") {
    canonical = "PULLUPS";
  } else if (normalized === "DIP" || normalized === "DIPS") {
    canonical = "DIPS";
  } else if (normalized === "SQUAT" || normalized === "SQUATS") {
    if (exerciseList.includes("SQUAT")) {
      canonical = "SQUAT";
    } else if (exerciseList.includes("SQUATS")) {
      canonical = "SQUATS";
    }
  } else if (normalized === "BENCH PRESS") {
    canonical = "BENCH";
  } else if (normalized === "DEADLIFTS") {
    canonical = "DEADLIFT";
  }

  if (!exerciseList.includes(canonical)) {
    return "";
  }
  return canonical;
}

function detectUnitFromText(value, fallback = "") {
  const text = String(value || "").toLowerCase();
  if (!text) {
    return fallback;
  }
  if (text.includes("kg")) {
    return "kg";
  }
  if (text.includes("lb")) {
    return "lb";
  }
  if (text.includes("rep")) {
    return "reps";
  }
  if (text.includes("mile")) {
    return "mi";
  }
  if (text.includes("step")) {
    return "steps";
  }
  if (text.includes("cal")) {
    return "cal";
  }
  return fallback;
}

function cleanLeaderboardValueLabel(value) {
  return String(value || "")
    .replace(/\btop\s+weight\b/gi, "")
    .replace(/\btotal\s+reps?\b/gi, "reps")
    .replace(/\s+/g, " ")
    .trim();
}

function inferExerciseFromText(value, exerciseList) {
  const text = String(value || "")
    .trim()
    .toUpperCase();

  if (!text) {
    return "";
  }

  for (const exercise of exerciseList) {
    const canonical = canonicalExerciseName(exercise, exerciseList);
    if (!canonical) {
      continue;
    }

    if (text.includes(canonical)) {
      return canonical;
    }

    if (canonical === "BENCH" && text.includes("BENCH PRESS")) {
      return canonical;
    }
  }

  return "";
}

function scoreLeaderboardHeaderRow(row) {
  const headers = row.map((cell) => normalizeCsvHeader(cell));
  let score = 0;

  if (headers.some((header) => header === "#" || header.includes("rank") || header.includes("position"))) {
    score += 1;
  }

  if (headers.some((header) => header.includes("exercise") || header.includes("lift") || header.includes("workout"))) {
    score += 1;
  }

  if (headers.some((header) => header.includes("username") || header.includes("user") || header.includes("name"))) {
    score += 1;
  }

  if (headers.some((header) => header.includes("value") || header.includes("weight") || header.includes("reps") || header.includes("score"))) {
    score += 1;
  }

  return score;
}

function detectLeaderboardCsvHeaderIndex(rows) {
  let bestIndex = 0;
  let bestScore = -1;

  rows.forEach((row, index) => {
    const score = scoreLeaderboardHeaderRow(row);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  if (bestScore >= 2) {
    return bestIndex;
  }

  return rows.length > 1 ? 1 : 0;
}

function findCsvHeaderIndex(headerMap, candidates) {
  const normalizedCandidates = candidates.map((candidate) => normalizeCsvHeader(candidate));

  for (const candidate of normalizedCandidates) {
    if (headerMap.has(candidate)) {
      return headerMap.get(candidate);
    }
  }

  for (const [header, index] of headerMap.entries()) {
    if (normalizedCandidates.some((candidate) => header.includes(candidate) || candidate.includes(header))) {
      return index;
    }
  }

  return undefined;
}

function csvCellByCandidates(row, headerMap, candidates) {
  const index = findCsvHeaderIndex(headerMap, candidates);
  if (index === undefined) {
    return "";
  }

  return String(row[index] || "").trim();
}

function parseNameValueFromLine(line) {
  const text = String(line || "").trim();
  if (!text) {
    return { name: "", value: "" };
  }

  const separatorIndex = text.indexOf("|");
  if (separatorIndex < 0) {
    return { name: text, value: "" };
  }

  return {
    name: text.slice(0, separatorIndex).trim(),
    value: text.slice(separatorIndex + 1).trim(),
  };
}

function parseCategoryEntriesFromCsv(csvText, exerciseList, fallbackUnit) {
  const rows = parseCsvTable(csvText);
  if (!rows.length) {
    return [];
  }

  const headerIndex = detectLeaderboardCsvHeaderIndex(rows);
  const headerRow = rows[headerIndex] || [];
  const headerMap = csvHeaderIndexMap(headerRow);
  const dataRows = rows.slice(headerIndex + 1);

  if (!dataRows.length) {
    return [];
  }

  const entries = [];

  dataRows.forEach((row) => {
    const compactRowText = row.join(" ").trim();
    if (!compactRowText || /^no data\b/i.test(compactRowText)) {
      return;
    }

    const lineRaw = csvCellByCandidates(row, headerMap, ["line", "display", "entry", "text"]);
    const parsedLine = parseNameValueFromLine(lineRaw);

    const exerciseRaw =
      csvCellByCandidates(row, headerMap, ["exercise", "lift", "workout", "movement", "category"]) ||
      inferExerciseFromText(`${lineRaw} ${compactRowText}`, exerciseList);
    const exercise = canonicalExerciseName(exerciseRaw, exerciseList);

    const usernameRaw =
      csvCellByCandidates(row, headerMap, ["emoji username", "username", "user", "name", "athlete"]) || parsedLine.name;
    const flairRaw = csvCellByCandidates(row, headerMap, ["emoji", "flair"]);
    const emoji = extractEmojiToken(flairRaw || usernameRaw, "");
    const name = stripEmoji(usernameRaw) || "User";

    const valueRaw =
      csvCellByCandidates(row, headerMap, ["value", "weight", "top weight", "reps", "score", "amount"]) ||
      parsedLine.value ||
      "";
    const detailsRaw = csvCellByCandidates(row, headerMap, ["details", "notes", "note", "description"]);
    const score =
      coerceFiniteNumber(valueRaw) ??
      coerceFiniteNumber(detailsRaw) ??
      coerceFiniteNumber(parsedLine.value) ??
      0;
    const unit = detectUnitFromText(`${valueRaw} ${detailsRaw} ${lineRaw}`, fallbackUnit) || fallbackUnit;
    const valueLabel =
      cleanLeaderboardValueLabel(valueRaw || detailsRaw || parsedLine.value) ||
      `${formatSiteLeaderboardValue(score)} ${unit}`.trim() ||
      "-";

    if (!exercise) {
      return;
    }

    entries.push({
      exercise,
      emoji,
      name,
      score: Math.max(score, 0),
      valueLabel,
      line: `${emoji ? `${emoji} ` : ""}${name} | ${valueLabel}`,
    });
  });

  return rankEntries(entries, 10);
}

async function fetchCategoryEntriesFromCsv(csvUrl, exerciseList, fallbackUnit) {
  const url = String(csvUrl || "").trim();
  if (!url) {
    return [];
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Sheet CSV fetch failed (${response.status})`);
  }

  const csvText = await response.text();
  return parseCategoryEntriesFromCsv(csvText, exerciseList, fallbackUnit);
}

async function fetchSiteLeaderboardFromSheetCsv(dashboardMeta) {
  const [strengthResult, calisthenicsResult] = await Promise.allSettled([
    fetchCategoryEntriesFromCsv(dashboardMeta?.siteStrengthCsvUrl, STRENGTH_EXERCISES, "lb/kg"),
    fetchCategoryEntriesFromCsv(dashboardMeta?.siteCalisthenicsCsvUrl, CALISTHENICS_EXERCISES, "reps"),
  ]);

  return {
    entries: strengthResult.status === "fulfilled" ? strengthResult.value : [],
    groupEntries: calisthenicsResult.status === "fulfilled" ? calisthenicsResult.value : [],
  };
}

function normalizeCategoryEntries(source, exerciseList, fallbackUnit) {
  const entries = [];
  const pushEntries = (raw, exerciseFallback) => {
    listFromUnknown(raw).forEach((item) => {
      const normalized = normalizeSiteLeaderboardEntry(item, exerciseFallback, fallbackUnit);
      if (normalized) {
        const canonicalExercise = canonicalExerciseName(normalized.exercise || exerciseFallback, exerciseList);
        if (!canonicalExercise) {
          return;
        }
        entries.push(normalized);
      }
    });
  };

  pushEntries(source, "");

  const sourceObject = source && typeof source === "object" && !Array.isArray(source) ? source : null;
  if (sourceObject) {
    exerciseList.forEach((exercise) => {
      const byUpper = sourceObject[exercise];
      const byLower = sourceObject[exercise.toLowerCase()];
      const byTitle = sourceObject[exercise.slice(0, 1) + exercise.slice(1).toLowerCase()];
      pushEntries(byUpper, exercise);
      pushEntries(byLower, exercise);
      pushEntries(byTitle, exercise);
    });
  }

  const deduped = new Map();
  entries.forEach((entry) => {
    const key = `${entry.exercise}|${entry.name}|${entry.valueLabel}|${entry.line}`;
    if (!deduped.has(key)) {
      deduped.set(key, entry);
    }
  });

  const withExerciseFallback = [...deduped.values()].map((entry) => {
    const canonicalExercise = canonicalExerciseName(entry.exercise, exerciseList);
    const detectedUnit = detectUnitFromText(`${entry.valueLabel} ${entry.line}`, fallbackUnit);
    const cleanedValue = cleanLeaderboardValueLabel(entry.valueLabel);
    return {
      ...entry,
      exercise: canonicalExercise,
      valueLabel: cleanedValue,
      line: `${entry.emoji ? `${entry.emoji} ` : ""}${entry.name} | ${cleanedValue || `${formatSiteLeaderboardValue(entry.score)} ${detectedUnit}`.trim()}`,
    };
  });

  return rankEntries(withExerciseFallback.filter((entry) => entry.exercise), 10);
}

async function fetchSiteLeaderboardFromApi() {
  const combinedResult = await fetchJsonFromEndpoints(SITE_LEADERBOARD_ENDPOINTS, { requireOk: false });
  return combinedResult.body;
}

async function fetchSiteLeaderboardFromSplitEndpoints() {
  const [strengthResult, calisthenicsResult] = await Promise.allSettled([
    fetchJsonFromEndpoints(SITE_STRENGTH_ENDPOINTS, { requireOk: false }),
    fetchJsonFromEndpoints(SITE_CALISTHENICS_ENDPOINTS, { requireOk: false }),
  ]);

  const strengthBody = strengthResult.status === "fulfilled" ? strengthResult.value.body : null;
  const calisthenicsBody = calisthenicsResult.status === "fulfilled" ? calisthenicsResult.value.body : null;

  if (!strengthBody && !calisthenicsBody) {
    const messageParts = [];
    if (strengthResult.status === "rejected") {
      messageParts.push(strengthResult.reason?.message || "strength unavailable");
    }
    if (calisthenicsResult.status === "rejected") {
      messageParts.push(calisthenicsResult.reason?.message || "calisthenics unavailable");
    }
    throw new Error(messageParts.join("; ") || "Site leaderboard unavailable.");
  }

  return {
    strength: strengthBody,
    calisthenics: calisthenicsBody,
  };
}

function normalizeSiteLeaderboardResponse(body, dashboardMeta) {
  const strengthSource = pickCategorySource(body, "strength") ?? readPath(body, "strengthEntries") ?? readPath(body, "strengthTop") ?? [];
  const calisthenicsSource =
    pickCategorySource(body, "calisthenics") ?? readPath(body, "calisthenicsEntries") ?? readPath(body, "calisthenicsTop") ?? [];

  const strengthEntries = normalizeCategoryEntries(strengthSource, STRENGTH_EXERCISES, "lb");
  const calisthenicsEntries = normalizeCategoryEntries(calisthenicsSource, CALISTHENICS_EXERCISES, "reps");

  const sheetMeta = resolveDashboardSheetMetadataFromBody(body) || dashboardMeta || null;

  return {
    entries: strengthEntries,
    groupEntries: calisthenicsEntries,
    liveEvents: firstArrayFromPaths(body, ["liveEvents", "events", "activity", "feed", "site.feed"]),
    usersToday:
      firstNumberFromPaths(body, ["usersToday", "usage.usersToday", "totals.usersToday", "metrics.usersToday"]) ?? 0,
    usersThisWeek:
      firstNumberFromPaths(body, ["usersThisWeek", "usage.usersThisWeek", "totals.usersThisWeek", "metrics.usersThisWeek"]) ??
      0,
    usersOnline:
      firstNumberFromPaths(body, ["usersOnline", "usage.usersOnline", "totals.usersOnline", "metrics.usersOnline"]) ?? 0,
    workoutsLogged:
      firstNumberFromPaths(body, ["workoutsLogged", "usage.workoutsLogged", "totals.workoutsLogged", "metrics.workoutsLogged"]) ??
      0,
    sheet: sheetMeta,
  };
}

function normalizeStreakRowsFromApiBody(body) {
  const rows = firstArrayFromPaths(body, ["rows", "data.rows", "result.rows", "payload.rows", "streaks", "top", "entries"]);
  return rows
    .map((row) => {
      const rank = coerceFiniteNumber(row?.rank) ?? Number.POSITIVE_INFINITY;
      const username = normalizeName(row?.username, "") || normalizeName(row?.name, "") || "User";
      const days = coerceFiniteNumber(row?.days) ?? coerceFiniteNumber(row?.value) ?? coerceFiniteNumber(row?.streak) ?? 0;
      const unit = normalizeName(row?.unit, "days") || "days";
      const display = normalizeName(row?.display, "") || normalizeName(row?.line, "");
      const parsedDisplay = parseNameValueFromLine(display);
      const emoji = extractEmojiToken(username || parsedDisplay.name, "");
      const name = stripEmoji(username || parsedDisplay.name) || "User";
      const valueLabel = parsedDisplay.value || `${formatSiteLeaderboardValue(days)} ${unit}`.trim();
      const safeValue = valueLabel || `${formatSiteLeaderboardValue(days)} ${unit}`.trim() || "-";
      return {
        rank,
        name,
        emoji,
        score: Math.max(days, 0),
        valueLabel: safeValue,
        line: `${emoji ? `${emoji} ` : ""}${name} | ${safeValue}`,
        message:
          normalizeName(row?.message, "") ||
          `${emoji ? `${emoji} ` : ""}${name} just logged ${formatSiteLeaderboardValue(days)} days in a row!`,
      };
    })
    .filter((entry) => entry.name)
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return (b.score || 0) - (a.score || 0);
    })
    .slice(0, 20);
}

function normalizeLiveStreakMessageFromBody(body) {
  const rows = firstArrayFromPaths(body, ["rows", "data.rows", "result.rows", "payload.rows", "events", "feed"]);
  const firstRow = rows.find((row) => row && typeof row === "object") || null;
  if (!firstRow) {
    return "";
  }

  const display = normalizeName(firstRow.display, "") || normalizeName(firstRow.message, "") || normalizeName(firstRow.text, "");
  if (display) {
    return display;
  }

  const username = normalizeName(firstRow.username, "") || normalizeName(firstRow.name, "");
  const streak = coerceFiniteNumber(firstRow.streak) ?? coerceFiniteNumber(firstRow.days) ?? coerceFiniteNumber(firstRow.value) ?? 0;
  if (!username || streak <= 0) {
    return "";
  }

  return `${username} just logged ${formatSiteLeaderboardValue(streak)} days in a row!`;
}

export async function fetchWorkoutLeaderboard() {
  const dashboardMeta = await fetchDashboardSheetMetadata();
  // gviz callback wiring is global (window.google.visualization.Query.setResponse),
  // so reads must be serialized to avoid cross-response races between tabs.
  const strengthResult = await Promise.resolve(readGvizTableBySheetName(DASHBOARD_METRICS_SHEET_ID, SITE_STRENGTH_SHEET_NAME))
    .then((value) => ({ status: "fulfilled", value }))
    .catch((reason) => ({ status: "rejected", reason }));

  const calisthenicsResult = await Promise.resolve(
    readGvizTableBySheetName(DASHBOARD_METRICS_SHEET_ID, SITE_CALISTHENICS_SHEET_NAME),
  )
    .then((value) => ({ status: "fulfilled", value }))
    .catch((reason) => ({ status: "rejected", reason }));

  const topStreaksResult = await Promise.resolve(readGvizTableBySheetName(DASHBOARD_METRICS_SHEET_ID, TOP_STREAKS_SHEET_NAME))
    .then((value) => ({ status: "fulfilled", value }))
    .catch((reason) => ({ status: "rejected", reason }));

  const strengthEntries =
    strengthResult.status === "fulfilled"
      ? rankOneByExerciseFromSiteTab(strengthResult.value, STRENGTH_EXERCISES, "lb/kg")
      : STRENGTH_EXERCISES.map((exercise) => ({
          exercise,
          name: "No data",
          emoji: "",
          score: 0,
          valueLabel: "",
          line: "No data",
        }));

  const calisthenicsEntries =
    calisthenicsResult.status === "fulfilled"
      ? rankOneByExerciseFromSiteTab(calisthenicsResult.value, CALISTHENICS_EXERCISES, "reps")
      : CALISTHENICS_EXERCISES.map((exercise) => ({
          exercise,
          name: "No data",
          emoji: "",
          score: 0,
          valueLabel: "",
          line: "No data",
        }));

  let streakEntries = topStreaksResult.status === "fulfilled" ? topStreaksFromSiteTab(topStreaksResult.value) : [];

  if (!streakEntries.length) {
    try {
      const streaksResult = await fetchJsonFromEndpoints(STREAKS_ENDPOINTS, { requireOk: false });
      streakEntries = normalizeStreakRowsFromApiBody(streaksResult.body);
    } catch {
      streakEntries = [];
    }
  }

  return {
    entries: strengthEntries,
    groupEntries: calisthenicsEntries,
    streakEntries,
    liveEvents: [],
    usersToday: 0,
    usersThisWeek: 0,
    usersOnline: 0,
    workoutsLogged: 0,
    sheet: dashboardMeta || null,
  };
}

export async function fetchLiveStreakAlert() {
  try {
    const liveResult = await fetchJsonFromEndpoints(STREAKS_LIVE_ENDPOINTS, { requireOk: false });
    const liveMessage = normalizeLiveStreakMessageFromBody(liveResult.body);
    if (liveMessage) {
      return liveMessage;
    }
  } catch {
    // Fall back to /api/streaks.
  }

  try {
    const streakResult = await fetchJsonFromEndpoints(STREAKS_ENDPOINTS, { requireOk: false });
    const rows = normalizeStreakRowsFromApiBody(streakResult.body);
    return rows[0]?.message || "";
  } catch {
    return "";
  }
}

export async function fetchPublicLeaderboardSnapshot() {
  const response = await fetch("/api/public-leaderboard", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error || `Public leaderboard failed (${response.status})`);
  }

  return {
    entries: Array.isArray(body?.entries) ? body.entries : [],
    groupEntries: Array.isArray(body?.groupEntries) ? body.groupEntries : [],
    streakEntries: Array.isArray(body?.streakEntries) ? body.streakEntries : [],
    streakLiveMessage: typeof body?.streakLiveMessage === "string" ? body.streakLiveMessage : "",
    liveEvents: Array.isArray(body?.liveEvents) ? body.liveEvents : [],
    pebble: body?.pebble && typeof body.pebble === "object" ? body.pebble : {},
    usersToday: coerceFiniteNumber(body?.usersToday) ?? 0,
    usersThisWeek: coerceFiniteNumber(body?.usersThisWeek) ?? 0,
    usersOnline: coerceFiniteNumber(body?.usersOnline) ?? 0,
    workoutsLogged: coerceFiniteNumber(body?.workoutsLogged) ?? 0,
    caloriesTracked: coerceFiniteNumber(body?.caloriesTracked) ?? 0,
    gallonsDrank: coerceFiniteNumber(body?.gallonsDrank) ?? 0,
    directories: body?.directories && typeof body.directories === "object" ? body.directories : {},
    generatedAt: typeof body?.generatedAt === "string" ? body.generatedAt : "",
    source: typeof body?.source === "string" ? body.source : "",
    sourceVersion: typeof body?.sourceVersion === "string" ? body.sourceVersion : "",
  };
}

function normalizePebbleEntry(entry) {
  const username = normalizeName(entry?.username, "");
  const contact = normalizeName(entry?.contact, "") || normalizeName(entry?.name, "");
  const name = username || contact || "User";
  const score =
    coerceFiniteNumber(entry?.value) ??
    coerceFiniteNumber(entry?.score) ??
    coerceFiniteNumber(entry?.amount) ??
    coerceFiniteNumber(entry?.steps) ??
    coerceFiniteNumber(entry?.miles) ??
    0;
  const unit = normalizeName(entry?.unit, "");
  const valueLabel =
    normalizeName(entry?.valueLabel, "") ||
    normalizeName(entry?.valueText, "") ||
    normalizeName(entry?.display, "") ||
    normalizeName(entry?.details, "");

  return {
    name,
    score: Math.max(score, 0),
    unit,
    valueLabel,
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

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object") {
    return [value];
  }
  return [];
}

function readTopRows(body, paths) {
  const direct = firstArrayFromPaths(body, paths);
  if (direct.length) {
    return direct;
  }

  const single = firstObjectFromPaths(body, paths);
  if (single) {
    return asArray(single);
  }

  return [];
}

function normalizePebbleTopRows(body, paths) {
  return readTopRows(body, paths).map(normalizePebbleEntry);
}

function pickPebbleDate(body) {
  return firstStringFromPaths(body, [
    "date",
    "asOf",
    "generatedAt",
    "snapshotAt",
    "data.date",
    "data.asOf",
    "result.date",
    "result.asOf",
  ]);
}

function mergeTopRows(primaryRows, fallbackRows) {
  if (primaryRows.length) {
    return primaryRows;
  }
  return fallbackRows;
}

export async function fetchPebbleLeaderboard() {
  let body = null;

  try {
    const combinedResult = await fetchJsonFromEndpoints(PEBBLE_LEADERBOARD_ENDPOINTS, { requireOk: false });
    body = combinedResult.body;
  } catch {
    body = null;
  }

  const [caloriesResult, workoutsResult, stepsResult, sleepResult, milesResult] = await Promise.allSettled([
    fetchJsonFromEndpoints(PEBBLE_CALORIES_ENDPOINTS, { requireOk: false }),
    fetchJsonFromEndpoints(PEBBLE_WORKOUTS_ENDPOINTS, { requireOk: false }),
    fetchJsonFromEndpoints(PEBBLE_STEPS_ENDPOINTS, { requireOk: false }),
    fetchJsonFromEndpoints(PEBBLE_SLEEP_ENDPOINTS, { requireOk: false }),
    fetchJsonFromEndpoints(PEBBLE_MILES_ENDPOINTS, { requireOk: false }),
  ]);

  const caloriesBody = caloriesResult.status === "fulfilled" ? caloriesResult.value.body : null;
  const workoutsBody = workoutsResult.status === "fulfilled" ? workoutsResult.value.body : null;
  const stepsBody = stepsResult.status === "fulfilled" ? stepsResult.value.body : null;
  const sleepBody = sleepResult.status === "fulfilled" ? sleepResult.value.body : null;
  const milesBody = milesResult.status === "fulfilled" ? milesResult.value.body : null;
  const baseBody = body && typeof body === "object" ? body : {};

  const caloriesTop = mergeTopRows(
    normalizePebbleTopRows(baseBody, [
      "caloriesBurnedTop",
      "caloriesTop",
      "leaderboard.calories",
      "leaderboards.calories",
      "data.caloriesTop",
    ]),
    normalizePebbleTopRows(caloriesBody, ["caloriesBurnedTop", "caloriesTop", "top", "entries", "rows", "data"]),
  );

  const workoutsTop = mergeTopRows(
    normalizePebbleTopRows(baseBody, [
      "workoutsTop",
      "topWorkouts",
      "leaderboard.workouts",
      "leaderboards.workouts",
      "data.workoutsTop",
    ]),
    normalizePebbleTopRows(workoutsBody, ["workoutsTop", "topWorkouts", "top", "entries", "rows", "data"]),
  );

  const stepsTop = mergeTopRows(
    normalizePebbleTopRows(baseBody, ["stepsTop", "leaderboard.steps", "leaderboards.steps", "data.stepsTop"]),
    normalizePebbleTopRows(stepsBody, ["stepsTop", "topSteps", "top", "entries", "rows", "data"]),
  );

  const sleepTop = mergeTopRows(
    normalizePebbleTopRows(baseBody, [
      "sleepScoresTop",
      "sleepTop",
      "leaderboard.sleep",
      "leaderboards.sleep",
      "data.sleepTop",
    ]),
    normalizePebbleTopRows(sleepBody, ["sleepScoresTop", "sleepTop", "top", "entries", "rows", "data"]),
  );

  const milesTop = mergeTopRows(
    normalizePebbleTopRows(baseBody, [
      "milesTraversedTop",
      "milesTop",
      "leaderboard.miles",
      "leaderboards.miles",
      "data.milesTop",
    ]),
    normalizePebbleTopRows(milesBody, ["milesTraversedTop", "milesTop", "top", "entries", "rows", "data"]),
  );

  const totalStepsAllTime =
    firstNumberFromPaths(baseBody, [
      "totalStepsAllTime",
      "stepsAllTime",
      "allTimeSteps",
      "totalSteps",
      "totals.steps",
      "metrics.steps",
    ]) ??
    firstNumberFromPaths(stepsBody, ["totalStepsAllTime", "stepsAllTime", "allTimeSteps", "totalSteps", "totals.steps", "metrics.steps"]) ??
    0;

  const totalMilesAllTime =
    firstNumberFromPaths(baseBody, [
      "totalMilesAllTime",
      "milesAllTime",
      "allTimeMiles",
      "totalMiles",
      "totals.miles",
      "metrics.miles",
    ]) ??
    firstNumberFromPaths(milesBody, ["totalMilesAllTime", "milesAllTime", "allTimeMiles", "totalMiles", "totals.miles", "metrics.miles"]) ??
    0;

  const rawStepEvents = firstArrayFromPaths(baseBody, [
    "recentStepEvents",
    "stepEvents",
    "recentSteps",
    "stepsEvents",
    "stepsTape",
    "steps.feed",
  ]);

  if (!body && !caloriesBody && !workoutsBody && !stepsBody && !sleepBody && !milesBody) {
    throw new Error("Pebble leaderboard unavailable.");
  }

  return {
    date: pickPebbleDate(baseBody) || pickPebbleDate(stepsBody) || null,
    caloriesTop,
    workoutsTop,
    stepsTop,
    sleepTop,
    milesTop,
    totalStepsAllTime: Math.max(totalStepsAllTime, 0),
    totalMilesAllTime: Math.max(totalMilesAllTime, 0),
    stepEvents: rawStepEvents.map(normalizePebbleStepEvent).filter((event) => event.delta > 0 || event.total > 0),
  };
}

async function postJson(endpoint, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POST_TIMEOUT_MS);
  let response = null;

  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

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

async function postJsonSameOrigin(endpoint, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POST_TIMEOUT_MS);
  let response = null;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

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

  if (body && typeof body === "object" && "ok" in body && !body.ok) {
    const message = body?.error || body?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return { endpoint, body };
}

function toWelcomePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const provider = normalizeName(payload.provider, "SMS");
  const email = normalizeName(payload.email, "") || null;
  const contact = normalizeName(payload.contact, "") || normalizeName(payload.phone, "");
  const username = normalizeName(payload.username, "");

  if (provider === "iMessage") {
    return {
      provider: "iMessage",
      contact: contact || username || null,
      email,
    };
  }

  if (contact) {
    return {
      provider,
      contact,
      email,
    };
  }

  if (username) {
    return {
      provider,
      username,
      email,
    };
  }

  return {
    provider,
    email,
  };
}

function buildWelcomePayloadVariants(payload) {
  const base = toWelcomePayload(payload) || {};
  const provider = normalizeName(payload?.provider, "iMessage");
  const email = normalizeName(payload?.email, "") || null;
  const phoneOrContact = normalizeName(payload?.phone, "") || normalizeName(payload?.contact, "");
  const username = normalizeName(payload?.username, "");

  const variants = [];

  if (phoneOrContact) {
    variants.push({
      provider: "iMessage",
      phone: phoneOrContact,
      email,
    });

    variants.push({
      provider: "iMessage",
      contact: phoneOrContact,
      email,
    });

    variants.push({
      provider,
      contact: phoneOrContact,
      email,
    });

    variants.push({
      provider,
      phone: phoneOrContact,
      email,
    });
  }

  if (username) {
    variants.push({
      provider,
      username,
      email,
    });
  }

  variants.push(base);

  const deduped = new Map();
  variants.forEach((variant) => {
    if (!variant || typeof variant !== "object") {
      return;
    }

    const entries = Object.entries(variant)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
      .sort(([a], [b]) => a.localeCompare(b));

    if (!entries.length) {
      return;
    }

    const normalizedVariant = Object.fromEntries(entries);
    const key = JSON.stringify(normalizedVariant);
    if (!deduped.has(key)) {
      deduped.set(key, normalizedVariant);
    }
  });

  return [...deduped.values()];
}

async function tryEndpointsWithPayloads(endpoints, payloads) {
  let lastError = null;

  for (const endpoint of endpoints) {
    for (const body of payloads) {
      try {
        return await postJson(endpoint, body);
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError || new Error("Request failed.");
}

function summarizeAuthError(error, fallback = "Request failed.") {
  const raw = String(error?.message || fallback || "Request failed.").trim();
  if (!raw) {
    return "Request failed.";
  }

  if (/<!doctype html|<html[\s>]/i.test(raw)) {
    const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(raw);
    if (/bad gateway|error code 502/i.test(raw)) {
      return "502 Bad Gateway from api.thetrackerapp.io";
    }
    return titleMatch?.[1]?.trim() || "Upstream service returned HTML error page.";
  }

  if (/load failed|failed to fetch|networkerror|network request failed/i.test(raw)) {
    return "Network connection to backend failed.";
  }

  if (raw.length > 220) {
    return `${raw.slice(0, 220)}...`;
  }

  return raw;
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

const LIVE_METRICS_WINDOWS = new Set(["today", "week", "month", "year", "all"]);

function normalizeLiveMetricsWindow(windowValue) {
  const normalized = String(windowValue || "today")
    .trim()
    .toLowerCase();

  if (LIVE_METRICS_WINDOWS.has(normalized)) {
    return normalized;
  }

  return "today";
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsvTable(csvText) {
  return String(csvText || "")
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
}

function normalizeCsvHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function csvHeaderIndexMap(headerRow) {
  const map = new Map();
  headerRow.forEach((column, index) => {
    map.set(normalizeCsvHeader(column), index);
  });
  return map;
}

function csvCell(row, headerMap, headerName) {
  const index = headerMap.get(normalizeCsvHeader(headerName));
  if (index === undefined) {
    return "";
  }
  return String(row[index] || "").trim();
}

function parseDashboardMetricsCsv(csvText) {
  const rows = parseCsvTable(csvText);
  if (rows.length < 2) {
    throw new Error("Dashboard metrics sheet returned no data rows.");
  }

  const headers = csvHeaderIndexMap(rows[0]);
  const byWindow = new Map();

  rows.slice(1).forEach((row) => {
    const windowName = normalizeLiveMetricsWindow(csvCell(row, headers, "Window"));
    if (!windowName) {
      return;
    }

    byWindow.set(windowName, {
      window: windowName,
      usersActive: coerceFiniteNumber(csvCell(row, headers, "Users Active")) ?? 0,
      workoutsLogged: coerceFiniteNumber(csvCell(row, headers, "Workouts Logged")) ?? 0,
      caloriesTracked: coerceFiniteNumber(csvCell(row, headers, "Calories Tracked")) ?? 0,
      gallonsDrank: coerceFiniteNumber(csvCell(row, headers, "Gallons Drank")) ?? 0,
      generatedAt: csvCell(row, headers, "Generated At UTC") || null,
    });
  });

  return byWindow;
}

function metricRecord(value, sheetUrl) {
  return {
    value: value ?? 0,
    sheetUrl: sheetUrl || DASHBOARD_METRICS_SHEET_URL,
  };
}

export async function fetchLiveMetrics(windowValue = "today") {
  const normalizedWindow = normalizeLiveMetricsWindow(windowValue);
  const dashboardMeta = await fetchDashboardSheetMetadata();
  const dashboardCsvUrl = dashboardMeta?.dashboardDataCsvUrl || DASHBOARD_METRICS_CSV_URL;
  const dashboardSheetUrl = dashboardMeta?.dashboardDataTabUrl || dashboardMeta?.sheetUrl || DASHBOARD_METRICS_SHEET_URL;
  const response = await fetch(dashboardCsvUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Live metrics sheet failed (${response.status})`);
  }

  const csvText = await response.text();
  const byWindow = parseDashboardMetricsCsv(csvText);

  const todayRow = byWindow.get("today") || null;
  const weekRow = byWindow.get("week") || null;
  const activeRow = byWindow.get(normalizedWindow) || todayRow || weekRow || null;
  const generatedAt = activeRow?.generatedAt || todayRow?.generatedAt || weekRow?.generatedAt || null;

  const usersUsingTodayValue = todayRow?.usersActive ?? activeRow?.usersActive ?? 0;
  const totalUsersThisWeekValue = weekRow?.usersActive ?? usersUsingTodayValue ?? 0;

  return {
    requestedWindow: normalizedWindow,
    generatedAt,
    masterLogSheetUrl: dashboardMeta?.sheetUrl || DASHBOARD_METRICS_SHEET_URL,
    usersUsingToday: metricRecord(usersUsingTodayValue, dashboardSheetUrl),
    totalUsersThisWeek: metricRecord(totalUsersThisWeekValue, dashboardSheetUrl),
    usersOnline: metricRecord(0, dashboardSheetUrl),
    workoutsLogged: metricRecord(activeRow?.workoutsLogged ?? 0, dashboardSheetUrl),
    caloriesTracked: metricRecord(activeRow?.caloriesTracked ?? 0, dashboardSheetUrl),
    gallonsDrank: metricRecord(activeRow?.gallonsDrank ?? 0, dashboardSheetUrl),
  };
}

export async function submitSignup(payload) {
  try {
    return await postJsonSameOrigin(LOCAL_SIGNUP_PROXY_ENDPOINT, payload);
  } catch {
    // Fall back to direct API calls below.
  }

  const onboardingEndpoints = ["/api/onboarding", "/signup"];
  const welcomeEndpoints = ["/api/welcome", "/api/onboarding/trigger", "/api/onboarding/send-welcome"];
  const onboardingPayloads = [payload];
  const welcomePayloads = buildWelcomePayloadVariants(payload);
  const hasPhone = normalizeName(payload?.phone, "") || normalizeName(payload?.contact, "");

  let onboardingResult = null;
  let onboardingError = null;
  let welcomeError = null;

  if (hasPhone) {
    try {
      return await tryEndpointsWithPayloads(welcomeEndpoints, welcomePayloads);
    } catch (error) {
      welcomeError = error;
    }
  }

  try {
    onboardingResult = await tryEndpointsWithPayloads(onboardingEndpoints, onboardingPayloads);
  } catch (error) {
    onboardingError = error;
  }

  const followUpWelcomePayloads = [...welcomePayloads];
  const onboardingContact = normalizeName(onboardingResult?.body?.contact, "");
  if (onboardingContact) {
    followUpWelcomePayloads.unshift({
      provider: "iMessage",
      phone: onboardingContact,
      email: normalizeName(payload?.email, "") || null,
    });
  }

  try {
    return await tryEndpointsWithPayloads(welcomeEndpoints, followUpWelcomePayloads);
  } catch (error) {
    welcomeError = error;
  }

  if (onboardingResult) {
    throw new Error("Profile started, but onboarding message could not be sent yet. Please retry.");
  }

  throw welcomeError || onboardingError || new Error("Signup request failed.");
}

export async function requestLoginCode(payload) {
  let proxyError = null;
  try {
    return await postJsonSameOrigin(LOCAL_LOGIN_CODE_REQUEST_ENDPOINT, payload);
  } catch (error) {
    proxyError = error;
    // Fall back to direct backend endpoints below.
  }

  let backendError = null;
  try {
    return await tryEndpointsWithPayloads(LOGIN_CODE_REQUEST_ENDPOINTS, [payload]);
  } catch (error) {
    backendError = error;
  }

  const proxyMessage = summarizeAuthError(proxyError, "Proxy unavailable.");
  const backendMessage = summarizeAuthError(backendError, "Backend unavailable.");
  throw new Error(`Login code request failed. Proxy: ${proxyMessage}. Backend: ${backendMessage}.`);
}

export async function verifyLoginCode(payload) {
  let proxyError = null;
  try {
    return await postJsonSameOrigin(LOCAL_LOGIN_CODE_VERIFY_ENDPOINT, payload);
  } catch (error) {
    proxyError = error;
    // Fall back to direct backend endpoints below.
  }

  let backendError = null;
  try {
    return await tryEndpointsWithPayloads(LOGIN_CODE_VERIFY_ENDPOINTS, [payload]);
  } catch (error) {
    backendError = error;
  }

  const proxyMessage = summarizeAuthError(proxyError, "Proxy unavailable.");
  const backendMessage = summarizeAuthError(backendError, "Backend unavailable.");
  throw new Error(`Login code verification failed. Proxy: ${proxyMessage}. Backend: ${backendMessage}.`);
}

function readAuthSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem("tracker.auth.session");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    const token = String(parsed?.token || "").trim();
    return token ? { token, expiresAt: parsed?.expiresAt || null } : null;
  } catch {
    return null;
  }
}

function authHeaders() {
  const session = readAuthSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

function readAuthUserRecord() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem("tracker.auth.user");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function isMaskedValue(value) {
  return /[*•]/.test(String(value || ""));
}

function normalizePhoneIdentity(value) {
  const raw = String(value || "").trim();
  if (!raw || isMaskedValue(raw)) {
    return "";
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return raw.startsWith("+") ? raw : `+${digits}`;
  }
  return "";
}

function pruneEmptyFields(record) {
  const clean = {};
  Object.entries(record || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    clean[key] = value;
  });
  return clean;
}

export function readStoredAffiliateIdentity() {
  const parsed = readAuthUserRecord();
  if (!parsed) {
    return {};
  }

  const email = String(parsed?.email || parsed?.primaryEmail || "").trim().toLowerCase();
  const username = String(parsed?.username || "").trim();
  const accountId = String(parsed?.accountId || parsed?.id || "").trim();
  const canonical = String(parsed?.canonical || "").trim();

  const contactCandidates = [
    parsed?.contact,
    parsed?.phone,
    parsed?.credential,
    parsed?.identifier,
    parsed?.canonical,
  ];

  let contact = "";
  let phone = "";

  for (const candidate of contactCandidates) {
    const normalized = String(candidate || "").trim();
    if (!normalized || isMaskedValue(normalized)) {
      continue;
    }
    if (!contact) {
      contact = normalized;
    }
    if (!phone) {
      phone = normalizePhoneIdentity(normalized);
    }
  }

  if (!contact) {
    contact = phone || email || username || accountId || canonical || "";
  }

  return pruneEmptyFields({
    email,
    username,
    accountId,
    canonical,
    contact,
    phone,
  });
}

function normalizeAffiliateIdentityInput(input) {
  if (typeof input !== "string") {
    return { ...(input || {}) };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return {};
  }
  if (trimmed.includes("@")) {
    return { email: trimmed.toLowerCase(), contact: trimmed };
  }

  const phone = normalizePhoneIdentity(trimmed);
  if (phone) {
    return { contact: trimmed, phone };
  }

  return { username: trimmed, contact: trimmed };
}

function buildAuthedProxyUrl(endpoint, params) {
  const upstreamUrl = new URL(`${API_BASE}${endpoint}`);
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }
      upstreamUrl.searchParams.set(key, String(value));
    });
  }

  return upstreamUrl.toString();
}

async function getJsonAuthed(endpoint, params) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POST_TIMEOUT_MS);
  let response = null;

  try {
    response = await fetch(buildAuthedProxyUrl(endpoint, params), {
      method: "GET",
      headers: { Accept: "application/json", ...authHeaders() },
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

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

  if (body && typeof body === "object" && "ok" in body && !body.ok) {
    throw new Error(body.error || body.message || `Request failed (${response.status})`);
  }

  return { endpoint, body };
}

async function postJsonAuthed(endpoint, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POST_TIMEOUT_MS);
  let response = null;

  try {
    response = await fetch(buildAuthedProxyUrl(endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

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

function withFallbackAffiliateIdentity(input) {
  const base = normalizeAffiliateIdentityInput(input);
  const storedIdentity = readStoredAffiliateIdentity();
  const merged = { ...base };

  Object.entries(storedIdentity).forEach(([key, value]) => {
    if (merged[key] === undefined || merged[key] === null || merged[key] === "") {
      merged[key] = value;
    }
  });

  if (!merged.contact) {
    merged.contact =
      merged.phone ||
      merged.email ||
      merged.username ||
      merged.accountId ||
      merged.canonical ||
      "";
  }

  return pruneEmptyFields(merged);
}

export async function affiliateSignup(payload) {
  const merged = withFallbackAffiliateIdentity(payload);
  const result = await postJsonAuthed("/api/affiliate/signup", merged);
  return result.body;
}

export async function affiliateStatus(identity) {
  const params = withFallbackAffiliateIdentity(identity);
  const result = await getJsonAuthed("/api/affiliate/status", params);
  return result.body;
}

export async function affiliateHistory(identity) {
  const params = withFallbackAffiliateIdentity(identity);
  const result = await getJsonAuthed("/api/affiliate/history", params);
  return result.body;
}

export async function affiliateConnect(payload) {
  const merged = withFallbackAffiliateIdentity(payload);
  const result = await postJsonAuthed("/api/affiliate/connect", merged);
  return result.body;
}

export async function affiliateAgreement(payload) {
  const merged = withFallbackAffiliateIdentity(payload);
  const result = await postJsonAuthed("/api/affiliate/agreement", merged);
  return result.body;
}

export { API_BASE };
