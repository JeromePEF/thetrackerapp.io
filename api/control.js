// Feature Flags Control API - Vercel Edge-Cached Proxy
//
// Fetches feature flags from the upstream backend (api.thetrackerapp.io/control)
// and serves them with edge cache headers so Vercel's CDN caches the response
// for 30 minutes. This means the backend gets hit at most once per region per
// 30 minutes, regardless of how many users visit the site.
//
// Frontend should call this endpoint at `/api/control` (same origin) instead of
// the upstream URL directly. This avoids CORS issues and lets Vercel serve the
// cached response from the edge for sub-50ms latency worldwide.

const UPSTREAM_URL = "https://api.thetrackerapp.io/control";

// How long the Vercel CDN caches a successful /api/control response.
// Default = 5 min (300 s). The backend gets at most ~1 hit per region per
// CACHE_MAX_AGE seconds regardless of how many users visit, so this value
// drives "how quickly do flag changes propagate" — NOT bandwidth/billing
// (responses are ~1–2 KB JSON and edge hits are effectively free).
//
// Tunable via env var so we can dial it without a redeploy:
//   CONTROL_CACHE_SECONDS=30   → near-realtime, ~120 backend hits / hr / region
//   CONTROL_CACHE_SECONDS=300  → 5 min  (default)
//   CONTROL_CACHE_SECONDS=1800 → 30 min (previous behaviour)
const CACHE_MAX_AGE = Math.max(
  10,
  Number(process.env.CONTROL_CACHE_SECONDS) || 300,
);
// Serve stale for ~half the cache window while a background refresh runs,
// so users never wait for the upstream fetch even right after a key expires.
const STALE_WHILE_REVALIDATE = Math.max(30, Math.floor(CACHE_MAX_AGE / 2));

// Fallback flags returned if the upstream is unreachable. SAFE-BY-DEFAULT:
// every gated nav link, section, footer entry, and dashboard tab is FALSE so
// the frontend's "show only on enabled === true" rule keeps them hidden.
// When upstream is unreachable we'd rather show users a minimal, accurate
// view (Pricing + iPhone mockup + always-visible UI) than a fake page where
// flag-disabled tabs appear to work.
//
// Pricing is intentionally true because:
//   1. The user's UX rule is "always assume pricing is true"
//   2. The pricing anchor in HTML doesn't even carry data-feature, so this
//      value is academic for the link — but it does matter for any tooling
//      that reads flags.pricing programmatically.
//
// iphoneMockup is true because it's a static visual element, not gated
// content. Same for the always-on tools.
const FALLBACK_FLAGS = {
  // Pages — gated, default OFF.
  blog: false,
  press: false,
  products: false,
  brackets: false,
  win: false,
  runClubs: false,
  personalTrainers: false,
  pebbleApp: false,
  macApps: false,
  workoutResources: false,
  pricing: true,                    // ALWAYS visible
  workoutGroups: false,
  // Sections — gated, default OFF.
  testimonials: false,
  faq: false,
  iphoneMockup: true,               // visual element, not gated
  stepTape: false,
  liveActivityFeed: false,
  bodyMeasurements: false,
  multiMetricCharts: false,
  narrative: false,
  // Maintenance — default OFF.
  maintenanceMode: false,
  maintenanceMessage: "",
  // Chatbot — default OFF (cheaper for us when we can't confirm).
  chatbotEnabled: false,
  // Free tools — these don't gate any user-visible UI, so default ON keeps
  // the marketing pages functional even when upstream is down.
  tools: {
    tdeeCalculator: true,
    bmiCalculator: true,
    aiMealPlanner: true,
    foodDiary: true,
  },
  // Dashboard sidebar tabs — default OFF so users don't see tabs we can't
  // confirm are ready.
  dashboardTabs: {
    personalTrainer: false,
    groups: false,
    runClubs: false,
    calendar: false,
    shortcuts: false,
  },
  // Social links — empty strings hide each icon.
  socials: {
    x: "", twitter: "", threads: "", instagram: "", facebook: "", tiktok: "",
    snapchat: "", linkedin: "", bluesky: "", youtube: "", rumble: "", twitch: "",
    kick: "", bitchute: "", pinterest: "", gbp: "", reddit: "", discord: "",
    telegram: "", mastodon: "", spotify: "", appleMusic: "", podcast: "",
    medium: "", substack: "", patreon: "", kofi: "", github: "", website: "",
  },
  // Footer links — gated, default OFF. Pricing always on (mirrors top nav).
  footer: {
    contact: false,
    pricing: true,                  // ALWAYS visible
    community: false,
    blog: false,
    press: false,
    guide: false,
    status: false,
    trust: false,
    llmsTxt: false,
    privacy: false,
    terms: false,
    home: false,
    pebbleApp: false,
    macApps: false,
    freeTools: false,
    groups: false,
    workoutResources: false,
    win: false,
    products: false,
    runClubs: false,
    personalTrainers: false,
    brackets: false,
  },
  // Billing — empty so the pricing page renders nothing rather than fake
  // tiers when we can't confirm what's actually for sale. The pricing page
  // also fetches /api/billing/stripe-prices separately, so it can still
  // render valid cards even when /control falls through.
  billing: {},
};

// Deep-merge two plain objects, with `override` winning over `base`. Used to
// layer upstream flag values on top of FALLBACK_FLAGS so any key the upstream
// has not yet implemented (e.g. the new `footer` object) still resolves to a
// sensible default instead of `undefined`.
function deepMerge(base, override) {
  if (!override || typeof override !== "object") return base;
  if (!base || typeof base !== "object") return override;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override)) {
    const a = out[key];
    const b = override[key];
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
      out[key] = deepMerge(a, b);
    } else {
      out[key] = b;
    }
  }
  return out;
}

const CHANNEL_LIVE_URL = "https://www.youtube.com/@thetrackerappio/live";

async function fetchLiveVideoId() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(CHANNEL_LIVE_URL, {
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (compatible; TheTrackerApp/1.0; +https://thetrackerapp.io)",
      },
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

async function fetchUpstream() {
  // 6-second timeout to keep cold-start latency bounded.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(UPSTREAM_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 TheTrackerApp/ControlProxy",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
    const data = await res.json();
    if (!data || typeof data !== "object") throw new Error("Upstream returned non-object");
    // Merge upstream over fallback so missing keys (like `footer.*` on older
    // backend builds) still have defaults. Upstream values always win.
    const merged = deepMerge(FALLBACK_FLAGS, data);
    return { data: merged, fresh: true };
  } catch (err) {
    console.warn("control proxy: upstream fetch failed, serving fallback:", err.message);
    return { data: FALLBACK_FLAGS, fresh: false };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  // CORS - permit same-origin and any subdomain
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Accept-Encoding");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // /api/control?action=stream-video — scrape current live video ID
  const url = new URL(req.url, "https://thetrackerapp.io");
  if (url.searchParams.get("action") === "stream-video") {
    const videoId = await fetchLiveVideoId();
    if (videoId) {
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");
      return res.status(200).json({ videoId });
    }
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=30");
    return res.status(200).json({ videoId: null });
  }

  const { data, fresh } = await fetchUpstream();

  if (fresh) {
    // Cache fresh upstream responses at the edge for 30 minutes.
    // stale-while-revalidate lets the edge serve slightly stale content
    // for up to 5 more minutes while a background refresh happens.
    res.setHeader(
      "Cache-Control",
      `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`
    );
    res.setHeader("CDN-Cache-Control", `max-age=${CACHE_MAX_AGE}`);
    res.setHeader("X-Control-Source", "upstream");
  } else {
    // If the upstream failed, only cache for a short period so we recover
    // quickly when it comes back online.
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=60");
    res.setHeader("X-Control-Source", "fallback");
  }

  return res.status(200).json(data);
}
