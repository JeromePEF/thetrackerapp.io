const UPSTREAM_URL = "https://api.thetrackerapp.io/control";
const CHANNEL_LIVE_URL = "https://www.youtube.com/@thetrackerappio/live";
const CONTROL_CACHE_SECONDS = 300;
const STALE_WHILE_REVALIDATE = 150;

const viewerTimestamps = new Map();
const VIEWER_TTL_MS = 30000;

function htmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanViewers() {
  const now = Date.now();
  for (const [id, ts] of viewerTimestamps) {
    if (now - ts > VIEWER_TTL_MS) viewerTimestamps.delete(id);
  }
}

function resolveMessagingServices(flags) {
  const defaults = {
    iMessage: true, whatsapp: false, telegram: false,
    discord: false, slack: false, signal: false, googleChat: false, email: false,
  };
  const upstream = flags?.messagingServices && typeof flags.messagingServices === "object"
    ? flags.messagingServices : {};
  return { ...defaults, ...upstream, iMessage: true };
}

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
    return { exercise: row.exercise || "", rank: row.rank || 1, name, emoji, score: row.value || row.count || 0, unit: row.unit || "", valueLabel, line: `${emoji ? emoji + " " : ""}${name} | ${valueLabel}` };
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
    return { rank: row.rank || 1, name, emoji, score: row.value || 0, valueLabel, line: `${emoji ? emoji + " " : ""}${name} | ${valueLabel}`, message };
  });

  return { entries: strength.map(toEntry), groupEntries: calisthenics.map(toEntry), streakEntries, streakLiveMessage: streakEntries[0]?.message || "" };
}

function buildInjection(messagingServices, flags, metricsJson, leaderboardJson) {
  const PRELOAD_SVGS = [
    "IMessage_logo.svg", "WhatsApp.svg", "Telegram_logo.svg",
    "discord-icon-svgrepo-com.svg", "Slack_icon_2019.svg", "Signal-Logo-Ultramarine.svg",
    "googlechat.svg", "email.svg",
  ];
  const preloadLinks = PRELOAD_SVGS.map((f) => `<link rel="preload" as="image" href="/SVGS/${f}" />`).join("\n    ");
  const msgJson = JSON.stringify(messagingServices);
  const flagsStr = flags ? JSON.stringify(flags) : "null";
  let dataInjection = `window.__MESSAGING_SERVICES__=${msgJson}; window.__CONTROL_FLAGS__=${flagsStr};`;
  if (metricsJson) dataInjection += ` window.__INITIAL_METRICS__=${metricsJson};`;
  if (leaderboardJson) dataInjection += ` window.__INITIAL_LEADERBOARD__=${leaderboardJson};`;
  const inlineScript = `<script>${dataInjection}</script>`;
  return `    ${preloadLinks}\n    ${inlineScript}\n  `;
}

async function fetchUpstreamFlags() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(UPSTREAM_URL, {
      headers: { Accept: "application/json", "Accept-Language": "en-US,en;q=0.9" },
      signal: controller.signal,
      cf: { cacheTtl: 0 },
    });
    if (!res.ok) {
      console.warn("home renderer: upstream HTTP", res.status);
      return null;
    }
    const data = await res.json();
    if (!data || typeof data !== "object") throw new Error("Upstream returned non-object");
    return data;
  } catch (err) {
    console.warn("home renderer: upstream fetch failed:", err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function MAINTENANCE_HTML(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Tracker App — Maintenance</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0a0a0c 0%, #1a1a2e 100%);
      color: #ecf4ff;
      display: flex; align-items: center; justify-content: center; flex-direction: column;
      text-align: center; padding: 2rem;
    }
    .icon { font-size: 5rem; margin-bottom: 1.5rem; animation: float 3s ease-in-out infinite; }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    h1 { font-family: 'Orbitron', -apple-system, sans-serif; font-size: 2.5rem; color: #fff; margin: 0 0 1rem; }
    p { color: #9eb0c5; font-size: 1.1rem; max-width: 420px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="icon">🔧</div>
  <h1>We'll Be Right Back</h1>
  <p>${htmlEscape(message)}</p>
</body>
</html>`;
}

async function fetchLiveVideoId() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(CHANNEL_LIVE_URL, {
      headers: { "Accept-Language": "en-US,en;q=0.9", "User-Agent": "Mozilla/5.0 (compatible; TheTrackerApp/1.0; +https://thetrackerapp.io)" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const html = await res.text();
    const liveMatch = html.match(/"isLive":true.*?"videoId":"([^"]+)"/);
    if (liveMatch) return liveMatch[1];
    const match = html.match(/"videoId":"([^"]+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

let cachedTemplate = null;

async function getHtmlTemplate(env) {
  if (cachedTemplate) return cachedTemplate;
  try {
    const obj = await env.R2.get("dist/index.html");
    if (obj) {
      cachedTemplate = await obj.text();
      return cachedTemplate;
    }
  } catch {}
  try {
    const res = await env.ASSETS.fetch(new URL("https://thetrackerapp.io/index.html"));
    if (res.ok) {
      cachedTemplate = await res.text();
      return cachedTemplate;
    }
  } catch {}
  return null;
}

async function handleHomepage(req, env) {
  const flags = await fetchUpstreamFlags();

  if (flags && flags.maintenanceMode) {
    const message = flags.maintenanceMessage || "We're upgrading our servers. Back soon!";
    return new Response(MAINTENANCE_HTML(message), {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=10",
      },
    });
  }

  const html = await getHtmlTemplate(env);
  if (!html) {
    return new Response("Homepage template missing.", { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } });
  }

  const liveStats = flags?.liveStats;
  const metrics = metricsFromLiveStats(liveStats);
  const leaderboard = leaderboardFromLiveStats(liveStats);
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

  const cacheControl = flags
    ? `public, s-maxage=${CONTROL_CACHE_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`
    : "public, s-maxage=10, stale-while-revalidate=30";

  return new Response(rendered, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": cacheControl,
      "CDN-Cache-Control": `max-age=${CONTROL_CACHE_SECONDS}`,
      "X-Home-Source": flags ? "upstream" : "fallback",
    },
  });
}

async function handleControl(req, env) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "stream-video") {
    const videoId = await fetchLiveVideoId();
    return new Response(JSON.stringify({ videoId: videoId || null }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30", "Access-Control-Allow-Origin": "*" },
    });
  }

  if (action === "viewer-ping") {
    const viewerId = url.searchParams.get("viewer") || "anon";
    cleanViewers();
    viewerTimestamps.set(viewerId, Date.now());
    return new Response(JSON.stringify({ viewers: viewerTimestamps.size }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
    });
  }

  if (action === "viewers") {
    cleanViewers();
    return new Response(JSON.stringify({ viewers: viewerTimestamps.size }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

async function handleVersion(req, env) {
  try {
    const v = await env.CONTROL_VERSION.get("latest");
    return new Response(JSON.stringify({ version: v || null }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=3", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ version: null }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}

async function handleVersionUpdate(req, env) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  const secret = req.headers.get("X-Webhook-Secret") || "";
  if (secret !== env.CONTROL_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const version = body?.version || String(Date.now());

  await env.CONTROL_VERSION.put("latest", version);
  if (body?.html) {
    await env.R2.put("dist/index.html", body.html, {
      httpMetadata: { contentType: "text/html; charset=utf-8" },
    });
    cachedTemplate = body.html;
  }

  return new Response(JSON.stringify({ ok: true, version }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function addCors(responsePromise) {
  const response = await responsePromise;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/control") return handleControl(request, env);
    if (path === "/api/control-version") return handleVersion(request, env);
    if (path === "/api/control-update") return handleVersionUpdate(request, env);

    if (path === "/" || path === "/index.html") return handleHomepage(request, env);

    // /tools/workout-commands merged into the exercise picker (2026-07-11)
    if (path === "/tools/workout-commands" || path === "/tools/workout-commands.html") {
      return Response.redirect(`${url.origin}/tools/exercise-nutrition`, 301);
    }

    if (path.startsWith("/@")) return env.ASSETS.fetch(new URL("/user.html", request.url));

    // Feature-gated routes — block when flag is false in /api/control
    const GATED_ROUTES = {
      "/workout-resources": "workoutResources",
      "/pebble-app":        "pebbleApp",
      "/products":          "products",
      "/brackets":          "brackets",
      "/win":               "win",
      "/run-clubs":         "runClubs",
      "/personal-trainers": "personalTrainers",
      "/mac-apps":          "macApps",
      "/pricing":           "pricing",
      "/testimonials":      "testimonials",
      "/faq":               "faq",
    };

    const flagKey = GATED_ROUTES[path] || GATED_ROUTES[`/${path.split("/")[1]}`];
    if (flagKey) {
      const flags = await fetchUpstreamFlags();
      if (flags && flags[flagKey] === false) {
        return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=30" } });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
