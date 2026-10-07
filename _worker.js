const UPSTREAM_URL = "https://api.thetrackerapp.io/control";
const CHANNEL_LIVE_URL = "https://www.youtube.com/@thetrackerappio/live";
const CONTROL_CACHE_SECONDS = 300;
const STALE_WHILE_REVALIDATE = 150;

const viewerTimestamps = new Map();
const VIEWER_TTL_MS = 30000;

// ── Rate limiting (in-memory) for public worker API endpoints ──────────────
const rateLimitStore = new Map();
const RATE_LIMIT_MAX = 60;        // requests per window
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

function cleanRateLimitStore() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) rateLimitStore.delete(ip);
  }
}

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

const CORS_ORIGIN = "https://thetrackerapp.io";

async function handleControl(req, env) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "stream-video") {
    const videoId = await fetchLiveVideoId();
    return new Response(JSON.stringify({ videoId: videoId || null }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30", "Access-Control-Allow-Origin": CORS_ORIGIN },
    });
  }

  if (action === "viewer-ping") {
    const viewerId = url.searchParams.get("viewer") || "anon";
    cleanViewers();
    viewerTimestamps.set(viewerId, Date.now());
    return new Response(JSON.stringify({ viewers: viewerTimestamps.size }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": CORS_ORIGIN },
    });
  }

  if (action === "viewers") {
    cleanViewers();
    return new Response(JSON.stringify({ viewers: viewerTimestamps.size }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": CORS_ORIGIN },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": CORS_ORIGIN },
  });
}

async function handleVersion(req, env) {
  try {
    const v = await env.CONTROL_VERSION.get("latest");
    return new Response(JSON.stringify({ version: v || null }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=3", "Access-Control-Allow-Origin": CORS_ORIGIN },
    });
  } catch (e) {
    return new Response(JSON.stringify({ version: null }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": CORS_ORIGIN },
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

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    // static.cloudflareinsights.com is the beacon Cloudflare injects into this
    // zone's own pages — the CSP was blocking a script the platform adds
    // itself, so every page load logged a violation and the zone's own
    // analytics never reported.
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://pagead2.googlesyndication.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    // GA4 does NOT always post to www.google-analytics.com. From a European
    // edge (this zone serves CDG) it uses region1.google-analytics.com, and
    // analytics.google.com is used for some payloads — both were blocked by
    // connect-src, so the tag loaded, built its hit, and the browser refused
    // to send it. A CSP that allows the SCRIPT but not its COLLECT endpoint
    // looks correctly installed and reports nothing.
    "connect-src 'self' https://api.thetrackerapp.io https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://pagead2.googlesyndication.com https://docs.google.com https://ipapi.co",
    "frame-src 'self' https://www.youtube.com https://js.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

// ── ANALYTICS, INJECTED AT THE EDGE ──────────────────────────────────────
// GA4 for account 262650966 / property 533184487. Data stops in GA4 on
// 2026-07-13, the day the tracker was removed along with the cookie banner.
//
// WHY HERE AND NOT ONLY IN THE BUNDLE. Restoring src/google-analytics.js is not
// enough to bring the numbers back, because almost nothing in the marketing
// funnel ever loaded it:
//   • src/main.js — the HOMEPAGE — never called initGoogleAnalytics() at all.
//     It was tracked by a hardcoded snippet in index.html's <head>, and that
//     snippet is what got deleted.
//   • the 2,033 generated /exercises/* pages load NO module whatsoever. That is
//     2,034 URLs of SEO surface, the pages most likely to receive organic and
//     campaign traffic, and the bundle could never have covered them.
//   • only 8 of ~40 entries call it, mostly dashboard/login/affiliate pages.
//
// Every response leaves through addSecurityHeaders, so injecting here is the
// one place that covers static pages, the rendered homepage and generated
// pages alike — and it cannot be forgotten by a new page or a new generator.
//
// NO DOUBLE COUNTING. The tag carries data-ga-loader, which is exactly what
// initGoogleAnalytics() checks before adding its own, so on the 8 pages that
// do call it the module sees this tag and no-ops instead of configuring the
// same property twice.
//
// COOKIES ARE ON, chosen deliberately for measurement accuracy. client_storage
// was "none", which wrote no cookie but also persisted no client_id — so every
// pageview looked like a new person and "users" was really "sessions". With the
// first-party _ga cookie restored, returning visitors, session counts and
// retention are correct, which is the difference between knowing a campaign
// brought 40 people back and guessing.
//
// The cost is honest: a first-party analytics cookie is what a consent banner
// normally exists to cover, and the banner was removed in July.
// src/cookie-consent.js is still present (stubbed), so restoring one is a
// contained job if that becomes necessary.
//
// Advertising storage stays denied on all three axes and Google Signals stays
// off: this is first-party measurement only, nothing to do with ads.
const GA_MEASUREMENT_ID = "G-RNSBGSR08Y";
const GA_SNIPPET =
  `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"` +
  ` data-ga-loader="${GA_MEASUREMENT_ID}"></script>` +
  `<script>window.dataLayer=window.dataLayer||[];` +
  `function gtag(){dataLayer.push(arguments);}` +
  `gtag('js',new Date());` +
  // analytics_storage GRANTED, deliberately. With it denied, GA4 sends only
  // cookieless CONSENT PINGS: they are modelled, never surface in Realtime,
  // and leave the property reporting "Data collection isn't active" — which
  // is exactly what happened. Granted sends real hits.
  //
  // It is still COOKIELESS, because client_storage:'none' below is what
  // actually governs cookie writing — not this flag. So no _ga cookie is set,
  // nothing is stored on the device, and the banner that was removed stays
  // removed. Advertising storage remains denied on all three axes.
  `gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',` +
  `ad_personalization:'denied',analytics_storage:'granted'});` +
  `gtag('config','${GA_MEASUREMENT_ID}',{anonymize_ip:true,transport_type:'beacon',` +
  `allow_google_signals:false,allow_ad_personalization_signals:false});</script>`;

class GaHeadInjector {
  element(head) {
    head.append(GA_SNIPPET, { html: true });
  }
}

function injectAnalytics(response) {
  // HTML only: JSON routes, the plain-text 404 and redirects must pass through
  // untouched, and HTMLRewriter on a non-HTML body would be wasted work.
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return response;
  try {
    return new HTMLRewriter().on("head", new GaHeadInjector()).transform(response);
  } catch (_) {
    // Never let analytics take the page down.
    return response;
  }
}

function addSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return injectAnalytics(new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  }));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Rate limit public worker API endpoints (no auth) by client IP.
    if (path === "/api/control" || path === "/api/control-version") {
      cleanRateLimitStore();
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      if (!checkRateLimit(ip)) {
        return addSecurityHeaders(new Response(JSON.stringify({ error: "rate limited" }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Retry-After": "60" },
        }));
      }
    }

    if (path === "/api/control") return addSecurityHeaders(await handleControl(request, env));
    if (path === "/api/control-version") return addSecurityHeaders(await handleVersion(request, env));
    if (path === "/api/control-update") return addSecurityHeaders(await handleVersionUpdate(request, env));

    if (path === "/" || path === "/index.html") return addSecurityHeaders(await handleHomepage(request, env));

    // /tools/workout-commands merged into the exercise picker (2026-07-11)
    if (path === "/tools/workout-commands" || path === "/tools/workout-commands.html") {
      return addSecurityHeaders(Response.redirect(`${url.origin}/tools/exercise-nutrition`, 301));
    }

    // Share card, proxied onto the MAIN origin. og:image previously pointed at
    // api.thetrackerapp.io; when that host wedged, scrapers silently dropped
    // the image and fell back to whatever they had cached. Serving it from the
    // same origin as the page removes a second host from the critical path for
    // a link preview, and the changed URL also forces platforms holding a
    // stale image to fetch a new one.
    if (path.startsWith("/card/") && path.endsWith(".png")) {
        const who = decodeURIComponent(path.slice(6, -4));
        const cache = caches.default;
        const ck = new Request(`https://og.cache/card/${encodeURIComponent(who)}.png`, { method: "GET" });
        // Serve the cached PNG first. The API is down for ~3 minutes on every
        // deploy, and a scraper that gets a 502 here shows no image at all and
        // will not come back for days — so a day-old card beats a broken one.
        // NOT addSecurityHeaders. Those are PAGE headers, and applying them to
        // an image sends X-Frame-Options: DENY and frame-ancestors 'none' with
        // the PNG — so a preview renderer, which embeds the card in a frame,
        // is told outright not to display it. That is why the title updated
        // but the image never appeared.
        const imgHeaders = (extra = {}) => ({
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "Access-Control-Allow-Origin": "*",
            "X-Content-Type-Options": "nosniff",
            ...extra,
        });
        try {
            const hit = await cache.match(ck);
            if (hit) return new Response(hit.body, { status: 200, headers: imgHeaders() });
        } catch (_) {}
        try {
            const r = await fetch(`https://api.thetrackerapp.io/api/u/${encodeURIComponent(who)}/card.png`);
            if (!r.ok) return new Response("Card unavailable", { status: 502 });
            const buf = await r.arrayBuffer();
            const out = new Response(buf, { status: 200, headers: imgHeaders() });
            ctx.waitUntil(cache.put(ck, out.clone()));
            return out;
        } catch (_) {
            return addSecurityHeaders(new Response("Card unavailable", { status: 502 }));
        }
    }

    // ── PROFILE LINK PREVIEWS, BUILT AT THE EDGE ────────────────────────
    // user.html sets its og: tags from JavaScript, and NO CRAWLER RUNS
    // JAVASCRIPT — so every shared profile scraped as the literal placeholder
    // "User Profile | The Tracker App" with an empty og:url and the one
    // generic site image. A 56-day streak and 3,340 logged workouts previewed
    // exactly like an empty account, on the platform where the preview card IS
    // the advert.
    //
    // So the tags are rewritten here, server-side, before anything leaves the
    // edge. The page's own setMeta() still runs for real browsers (tab title,
    // canonical); this is what the scrapers see.
    if (path.startsWith("/@")) {
        const uname = decodeURIComponent(path.slice(2)).trim();
        const page = await env.ASSETS.fetch(new URL("/user.html", request.url));
        if (!uname) return addSecurityHeaders(page);

        // A PREVIEW MUST NOT DEPEND ON A LIVE API CALL.
        //
        // This originally fetched the API on every scrape and fell through to
        // the generic card on any failure. The API is unavailable for ~3
        // minutes on every deploy and has wedged outright more than once — and
        // a scraper only visits ONCE, then caches what it got for days. So a
        // single unlucky scrape during a reload permanently pinned a generic
        // preview on a link, which is exactly what was being reported as "the
        // OG is still generic".
        //
        // Three tiers: the edge cache (minutes), then the API, then KV holding
        // the last known good payload for a week. Stale numbers on a share
        // card are harmless — a streak that reads one short is immeasurably
        // better than a card that says nothing.
        const statsKey = `ogstats:${uname.toLowerCase()}`;
        let stats = null;
        const cache = caches.default;
        const cacheKey = new Request(`https://og.cache/${encodeURIComponent(uname)}`, { method: "GET" });
        try {
            const hit = await cache.match(cacheKey);
            if (hit) stats = await hit.json();
        } catch (_) {}

        if (!stats) {
            try {
                const ctl = new AbortController();
                const t = setTimeout(() => ctl.abort(), 2500);
                const r = await fetch(`https://api.thetrackerapp.io/api/u/${encodeURIComponent(uname)}`,
                    { headers: { Accept: "application/json" }, signal: ctl.signal });
                clearTimeout(t);
                if (r.ok) {
                    const j = await r.json();
                    if (j && j.ok) {
                        stats = j;
                        const body = JSON.stringify({
                            ok: true, username: j.username, profile: j.profile, stats: j.stats
                        });
                        ctx.waitUntil(cache.put(cacheKey, new Response(body, {
                            headers: { "Content-Type": "application/json", "Cache-Control": "max-age=600" }
                        })));
                        if (env.CONTROL_VERSION) {
                            ctx.waitUntil(env.CONTROL_VERSION.put(statsKey, body, { expirationTtl: 604800 }));
                        }
                    }
                }
            } catch (_) {}
        }

        if (!stats && env.CONTROL_VERSION) {
            // Last known good, up to a week old. Better a slightly stale
            // streak than no card at all.
            try {
                const kv = await env.CONTROL_VERSION.get(statsKey);
                if (kv) stats = JSON.parse(kv);
            } catch (_) {}
        }

        if (!stats) return addSecurityHeaders(page);

        const esc = (v) => String(v == null ? "" : v)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        const s = stats.stats || {};
        const p2 = stats.profile || {};
        const name = p2.username || uname;
        const num = (n) => Number(n || 0).toLocaleString("en-US");
        const bits = [];
        if (s.currentStreak) bits.push(`${s.currentStreak}-day streak`);
        if (s.totalWorkouts) bits.push(`${num(s.totalWorkouts)} workouts`);
        if (s.activeDays) bits.push(`${num(s.activeDays)} active days`);

        const title = `@${name}${bits.length ? " — " + bits.slice(0, 2).join(" · ") : ""} | The Tracker App`;
        const desc = bits.length
            ? `@${name}${p2.memberNumber ? ` (member #${p2.memberNumber})` : ""}: `
              + `${bits.join(" · ")}. Every set and every meal, logged by text.`
            : `@${name} on The Tracker App.`;
        const img = `${url.origin}/card/${encodeURIComponent(name)}.png`;
        const canon = `${url.origin}/@${encodeURIComponent(name)}`;

        const SET = {
            "og:title": title, "og:description": desc, "og:url": canon,
            "og:image": img, "og:image:alt": `@${name} — ${bits.join(", ")}`,
            "twitter:title": title, "twitter:description": desc, "twitter:image": img,
            "twitter:card": "summary_large_image",
        };

        class Meta {
            element(el) {
                const key = el.getAttribute("property") || el.getAttribute("name");
                if (key && Object.prototype.hasOwnProperty.call(SET, key)) {
                    el.setAttribute("content", SET[key]);
                }
            }
        }
        class Title { element(el) { el.setInnerContent(title); } }
        class Canonical { element(el) { el.setAttribute("href", canon); } }

        return addSecurityHeaders(
            new HTMLRewriter()
                .on("meta", new Meta())
                .on("title", new Title())
                .on('link[rel="canonical"]', new Canonical())
                .transform(page)
        );
    }

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
        return addSecurityHeaders(new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=30" } }));
      }
    }

    return addSecurityHeaders(await env.ASSETS.fetch(request));
  },
};
