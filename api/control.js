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

// Fallback flags returned if the upstream is unreachable. These should mirror
// the structure documented in BACKEND_TODO.md and src/feature-flags.js so the
// frontend never has to handle a missing key.
const FALLBACK_FLAGS = {
  blog: true,
  press: true,
  products: true,
  brackets: false,
  win: false,
  runClubs: true,
  personalTrainers: true,
  pebbleApp: true,
  macApps: true,
  workoutResources: true,
  pricing: true,
  workoutGroups: true,
  testimonials: true,
  faq: true,
  iphoneMockup: true,
  stepTape: true,
  liveActivityFeed: true,
  bodyMeasurements: true,
  multiMetricCharts: true,
  narrative: true,
  maintenanceMode: false,
  maintenanceMessage: "",
  chatbotEnabled: false,
  tools: {
    tdeeCalculator: true,
    bmiCalculator: true,
    aiMealPlanner: true,
    foodDiary: true,
  },
  dashboardTabs: {
    personalTrainer: true,
    groups: true,
    runClubs: true,
  },
  socials: {
    x: "",
    twitter: "",
    threads: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    snapchat: "",
    linkedin: "",
    bluesky: "",
    youtube: "",
    rumble: "",
    twitch: "",
    kick: "",
    bitchute: "",
    pinterest: "",
    gbp: "",
    reddit: "",
    discord: "",
    telegram: "",
    mastodon: "",
    spotify: "",
    appleMusic: "",
    podcast: "",
    medium: "",
    substack: "",
    patreon: "",
    kofi: "",
    github: "",
    website: "",
  },
  footer: {
    contact: true,
    pricing: true,
    community: true,
    blog: true,
    press: true,
    guide: true,
    status: true,
    trust: true,
    llmsTxt: true,
    privacy: true,
    terms: true,
    home: true,
    pebbleApp: true,
    macApps: true,
    freeTools: true,
    groups: true,
    workoutResources: true,
    win: false,
    products: true,
    runClubs: true,
    personalTrainers: true,
    brackets: false,
  },
  billing: {
    monthlyTier: {
      name: "Monthly",
      price: 10,
      interval: "month",
      features: [
        "Unlimited workout, nutrition & water logging",
        "Body measurements & progress charts",
        "Leaderboards, brackets & streaks",
        "Wearable integrations",
        "Cancel anytime",
      ],
    },
    yearlyTier: {
      name: "Yearly",
      price: 96,
      interval: "year",
      yearlyEquivalent: 8,
      features: [
        "Everything in Monthly",
        "2 months free vs monthly",
        "Priority support",
        "Early access to new features",
      ],
    },
  },
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

async function fetchUpstream() {
  // 6-second timeout to keep cold-start latency bounded.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(UPSTREAM_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
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
  // `Vary: ?v` is implicit via URL — the CDN already keys by full URL incl.
  // query string. Each ?v=<version> bump is a brand new cache entry, so a
  // freshly invalidated version round-trips to upstream on the first hit
  // and is then served from edge cache to everyone else.
  res.setHeader("Vary", "Accept-Encoding");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
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
