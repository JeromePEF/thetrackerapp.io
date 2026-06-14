const fs = require('fs');

let js = fs.readFileSync('src/api.js', 'utf8');

// I need to revert fetchPublicLeaderboardSnapshot back to calling PUBLIC_LEADERBOARD_ENDPOINT
// I'll grab the previous version of it.

const oldFunc = /export async function fetchPublicLeaderboardSnapshot\(\) \{[\s\S]*?sourceVersion: "",\n  \};\n\}/;
const newFunc = `export async function fetchPublicLeaderboardSnapshot() {
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

js = js.replace(oldFunc, newFunc);
fs.writeFileSync('src/api.js', js);
console.log("Restored fetchPublicLeaderboardSnapshot to hit API");
