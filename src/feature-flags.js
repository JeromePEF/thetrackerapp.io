// Feature Flags System
//
// Fetches feature visibility settings from `/api/control` (same-origin Vercel
// serverless function that proxies api.thetrackerapp.io/control with a 30-min
// edge cache). This means each user only hits the Vercel CDN, and the upstream
// backend is contacted at most ~once per region per 30 minutes.
//
// The localStorage cache below is intentionally short (60 s) because the heavy
// lifting is done by the Vercel edge cache. Keeping a tiny client cache still
// avoids repeated fetches across navigations within a single session while
// allowing flag changes to propagate quickly once the edge refreshes.

const CONTROL_API_URL = "/api/control";
const CACHE_KEY = "tracker.featureFlags";
const CACHE_TTL = 60 * 1000; // 60 seconds (Vercel edge handles longer caching)

// Default flags (fallback if API unavailable)
const DEFAULT_FLAGS = {
  // Pages
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
  // Sections
  testimonials: true,
  faq: true,
  iphoneMockup: true,
  stepTape: true,
  liveActivityFeed: true,
  bodyMeasurements: true,
  multiMetricCharts: true,
  narrative: true,
  // Maintenance
  maintenanceMode: false,
  maintenanceMessage: "",
  // Floating AI chatbot widget (bottom-right of every page). When true, the
  // assistant answers questions; users can escalate to a human via the
  // "Talk to a human" button or by typing "agent".
  chatbotEnabled: false,
  // Tools
  tools: {
    tdeeCalculator: true,
    bmiCalculator: true,
    aiMealPlanner: true,
    foodDiary: true,
  },
  // Dashboard sidebar tabs that can be toggled independently.
  // Frontend reads `data-feature="dashboardTabs.personalTrainer"` etc. on each
  // <button> + <article> pair. When `false`, the button hides and the panel
  // is removed from navigation.
  dashboardTabs: {
    personalTrainer: true,
    groups: true,
    runClubs: true,
  },
  // Social links rendered as white SVG icons in the bottom-right of every footer.
  // Each key is a URL (or empty string to hide). Add new platforms as plain
  // string keys; the frontend has matching icons for the well-known list.
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
  // Footer links (each toggleable independently)
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
  // Pricing/Billing (controlled by backend). Only Monthly + Yearly are shown.
  // The yearly card auto-displays a "$X/mo billed annually" subtitle derived
  // from `yearlyTier.price / 12`, unless `yearlyTier.yearlyEquivalent` is set.
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

let cachedFlags = null;
let lastFetch = 0;
let knownVersion = null;        // last `version` we saw from /api/control-version
let versionPollTimer = null;    // setInterval handle

const VERSION_API_URL = "/api/control-version";
const VERSION_POLL_MS = 30 * 1000; // every 30 s
// Once we know a `version`, we append it as a query param to /api/control so
// each invalidation produces a unique URL and bypasses Vercel's edge cache.

/**
 * Read the latest known control version from /api/control-version.
 * Lightweight (3 s edge cache); safe to call frequently.
 */
async function fetchControlVersion() {
  try {
    const res = await fetch(VERSION_API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.version ? String(body.version) : null;
  } catch {
    return null;
  }
}

/**
 * Build the canonical /api/control URL, including ?v=<version> when known.
 * Different versions → different URLs → different CDN cache entries → fresh
 * data on every invalidation without busting cache for everyone else.
 */
function controlUrlForVersion(version) {
  if (!version) return CONTROL_API_URL;
  const sep = CONTROL_API_URL.includes("?") ? "&" : "?";
  return `${CONTROL_API_URL}${sep}v=${encodeURIComponent(version)}`;
}

/**
 * Start polling the version endpoint in the background. When the version
 * changes, force a fresh flag fetch + re-apply.
 */
function startVersionPolling() {
  if (versionPollTimer) return;
  versionPollTimer = setInterval(async () => {
    const v = await fetchControlVersion();
    if (!v || v === knownVersion) return;
    knownVersion = v;
    // Invalidate caches and pull fresh data; applyFeatureFlags re-runs on the
    // resulting flags so toggles take effect immediately.
    cachedFlags = null;
    lastFetch = 0;
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      /* ignore */
    }
    try {
      const flags = await fetchFeatureFlags();
      applyFeatureFlags(flags);
      // Re-run dependent UI hooks (footer socials + chatbot) so they pick up
      // any flips. Both modules are idempotent / teardown-safe.
      try {
        const { applyFooterSocials } = await import("./footer-socials.js");
        applyFooterSocials(flags?.socials);
      } catch {
        /* optional */
      }
      try {
        const { initChatbot } = await import("./chatbot.js");
        initChatbot(flags);
      } catch {
        /* optional */
      }
    } catch {
      /* swallow — next tick will retry */
    }
  }, VERSION_POLL_MS);

  // Also stop polling when the tab is hidden, restart when visible, to save
  // backend calls when nobody is looking.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (versionPollTimer) {
        clearInterval(versionPollTimer);
        versionPollTimer = null;
      }
    } else if (!versionPollTimer) {
      startVersionPolling();
    }
  });
}

// Synchronous accessor for the last-cached flags. Returns null if we
// haven't fetched yet. Useful when a module needs flag data right now
// (e.g. the billing renderer reading `flags.billing.*Tier`) without
// awaiting the network.
export function getCachedFlags() {
  return cachedFlags;
}

export async function fetchFeatureFlags() {
  const now = Date.now();

  // Check memory cache
  if (cachedFlags && now - lastFetch < CACHE_TTL) {
    return cachedFlags;
  }

  // Check localStorage cache
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const { flags, timestamp, version } = JSON.parse(stored);
      if (now - timestamp < CACHE_TTL) {
        cachedFlags = flags;
        lastFetch = timestamp;
        if (version && !knownVersion) knownVersion = version;
        return flags;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  // Learn the current version first so we can cache-bust correctly.
  if (!knownVersion) {
    knownVersion = await fetchControlVersion();
  }

  // Fetch from API
  try {
    const response = await fetch(controlUrlForVersion(knownVersion), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const flags = await response.json();
    cachedFlags = flags;
    lastFetch = now;

    // Store in localStorage along with the version we used so a refresh can
    // skip the version-fetch round-trip on quick navigation.
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ flags, timestamp: now, version: knownVersion || null }),
      );
    } catch (e) {
      // Ignore localStorage errors
    }

    // Make sure the background poll is running so subsequent invalidations
    // are picked up automatically without a page reload.
    if (typeof document !== "undefined" && !versionPollTimer && !document.hidden) {
      startVersionPolling();
    }

    return flags;
  } catch (error) {
    console.warn("Failed to fetch feature flags, using defaults:", error.message);
    return DEFAULT_FLAGS;
  }
}

export function isFeatureEnabled(flagPath) {
  if (!cachedFlags) {
    return getNestedValue(DEFAULT_FLAGS, flagPath) ?? true;
  }

  return getNestedValue(cachedFlags, flagPath) ?? true;
}

function getNestedValue(obj, path) {
  const keys = path.split(".");
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}

export function applyFeatureFlags(flags = cachedFlags || DEFAULT_FLAGS) {
  // Apply visibility to elements with data-feature attribute.
  //
  // RULE CHANGE: previously we showed by default and only hid on `false`.
  // That meant tabs flashed visible during initial page load (before flags
  // arrived) and stayed visible for flags the backend hadn't defined yet —
  // users saw tabs they weren't supposed to have access to.
  //
  // New rule: only show when `enabled === true`. Anything else (undefined,
  // null, false) stays hidden. The HTML default for every `data-feature`
  // element is `hidden`, so the first paint never shows a gated tab.
  document.querySelectorAll("[data-feature]").forEach((el) => {
    const feature = el.dataset.feature;
    const enabled = getNestedValue(flags, feature);

    if (enabled === true) {
      el.hidden = false;
      el.removeAttribute("aria-hidden");
    } else {
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
    }
  });

  // Apply to navigation links
  const navMappings = {
    blog: ['a[href="/blog"]', 'a[href*="/blog"]'],
    press: ['a[href="/press"]', 'a[href*="/press"]'],
    products: ['a[href="/products"]', 'a[href*="/products"]'],
    brackets: ['a[href="/brackets"]', 'a[href*="/brackets"]'],
    win: ['a[href="/win"]', 'a[href*="/win"]'],
    runClubs: ['a[href="/run-clubs"]', '#runClubsNavLink'],
    personalTrainers: ['a[href="/personal-trainers"]', '#personalTrainersNavLink'],
    pebbleApp: ['a[href="/pebble-app"]', 'a[href*="/pebble-app"]'],
    macApps: ['a[href="/mac-apps"]', 'a[href*="/mac-apps"]'],
    workoutResources: ['a[href="/workout-resources"]', 'a[href*="/workout-resources"]'],
    // `pricing` intentionally NOT in this map — pricing is always visible
    // regardless of /control state. If we ever need to hide it, the right
    // move is removing the link entirely.
    workoutGroups: ['a[href="/groups"]', 'a[href*="/groups"]', '.group-join-button'],
  };

  for (const [flag, selectors] of Object.entries(navMappings)) {
    const enabled = flags[flag];
    if (enabled === false) {
      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          el.hidden = true;
        });
      });
    }
  }
}

// Initialize feature flags on page load
export async function initFeatureFlags() {
  const flags = await fetchFeatureFlags();
  applyFeatureFlags(flags);
  // Side-effect: surface configured social links in every footer. Loaded
  // lazily so the rest of feature-flags.js stays usable in contexts where
  // the DOM isn't ready or there's no footer (admin tools, etc.).
  try {
    const { applyFooterSocials } = await import("./footer-socials.js");
    applyFooterSocials(flags?.socials);
  } catch {
    /* socials are optional – ignore failures */
  }

  // Side-effect: mount the AI chatbot widget when the backend has it enabled.
  // Idempotent — calling initChatbot when already mounted is a no-op, and
  // calling it with `chatbotEnabled !== true` cleanly tears down any prior
  // instance (e.g. when the flag is flipped off mid-session).
  try {
    const { initChatbot } = await import("./chatbot.js");
    initChatbot(flags);
  } catch {
    /* chatbot is optional – ignore failures */
  }
  return flags;
}
