const fs = require('fs');

let js = fs.readFileSync('src/api.js', 'utf8');

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

js = js.replace(oldMetrics, newMetrics);
fs.writeFileSync('src/api.js', js);
console.log("Restored fetchLiveMetrics to hit sheet");
