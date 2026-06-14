const fs = require('fs');

let js = fs.readFileSync('src/api.js', 'utf8');

const oldLeaderboard = /export async function fetchPublicLeaderboardSnapshot\(\) \{[\s\S]*?sourceVersion: "",\n  \};\n\}/;
const newLeaderboard = `export async function fetchPublicLeaderboardSnapshot() {
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
    throw new Error(body?.error || \`Public leaderboard failed (\${response.status})\`);
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
}`;

const oldMetrics = /export async function fetchLiveMetrics\(windowValue = "today"\) \{[\s\S]*?gallonsDrank: metricRecord\(liveStats\.gallonsDrank \|\| 0, ""\),\n  \};\n\}/;
const newMetrics = `export async function fetchLiveMetrics(windowValue = "today") {
  const normalizedWindow = normalizeLiveMetricsWindow(windowValue);
  const dashboardMeta = await fetchDashboardSheetMetadata();
  const dashboardCsvUrl = dashboardMeta?.dashboardDataCsvUrl || DASHBOARD_METRICS_CSV_URL;
  const dashboardSheetUrl = dashboardMeta?.dashboardDataTabUrl || dashboardMeta?.sheetUrl || DASHBOARD_METRICS_SHEET_URL;
  const response = await fetch(dashboardCsvUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(\`Live metrics sheet failed (\${response.status})\`);
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
}`;

js = js.replace(oldLeaderboard, newLeaderboard);
js = js.replace(oldMetrics, newMetrics);

fs.writeFileSync('src/api.js', js);
console.log("Reverted api.js back to hitting endpoints instead of flags");

