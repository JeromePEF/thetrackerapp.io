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

const CONTROL_API_URL = "https://api.thetrackerapp.io/control";
const CACHE_KEY = "tracker.featureFlags";
const CACHE_TTL = 15 * 1000; // 15 seconds for live data freshness

// Default flags (fallback if API unavailable)
// SAFE-BY-DEFAULT: this is what the frontend uses when fetchFeatureFlags()
// fails entirely (network error, no /api/control reachable). Every gated
// flag is FALSE so the "show only on enabled === true" applier keeps
// gated content hidden — better to show users a minimal accurate page
// than a fake one where flag-disabled tabs appear to work.
//
// Pricing is true because the UX rule is "pricing always renders".
// iphoneMockup is true because it's a visual element, not a gated feature.
// Tools are true so the calculator/meal-planner pages still work when
// upstream is unreachable (they're harmless static utilities).
const DEFAULT_FLAGS = {
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
  // Maintenance
  maintenanceMode: false,
  maintenanceMessage: "",
  // Floating AI chatbot widget — default OFF when we can't confirm config.
  chatbotEnabled: false,
  // Free tools — harmless static utilities, default ON so calculators work
  // even when upstream is unreachable.
  tools: {
    tdeeCalculator: true,
    bmiCalculator: true,
    aiMealPlanner: true,
    foodDiary: true,
  },
  // Dashboard sidebar tabs — default OFF.
  dashboardTabs: {
    personalTrainer: false,
    groups: false,
    runClubs: false,
    calendar: false,
    shortcuts: false,
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
  // Footer links — gated, default OFF. Pricing always on (matches top nav rule).
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

// Check for server-injected flags first (avoids an extra HTTP request on load)
let injectedFlags = typeof window !== "undefined" && window.__CONTROL_FLAGS__ ? window.__CONTROL_FLAGS__ : null;
// If the injected flags don't have the expected data (e.g. server fetch failed
// and it injected an empty object), treat it as a miss so the client fetches directly.
if (injectedFlags && Object.keys(injectedFlags).length === 0) {
  injectedFlags = null;
}
let cachedFlags = injectedFlags;
// If we have injected flags, treat them as freshly fetched.
let lastFetch = cachedFlags ? Date.now() : 0;
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
      // Broadcast so any module that depends on flags (e.g. the homepage's
      // service carousel reading `flags.messagingServices`) can re-render
      // without polling on its own. Listeners receive the latest flags
      // object in `event.detail`. Idempotent — safe to dispatch even when
      // nothing has changed.
      try {
        window.dispatchEvent(new CustomEvent("featureflags:updated", { detail: flags }));
      } catch {
        /* CustomEvent unsupported (ancient browser) — ignore */
      }
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
      // Billing tier visibility + Stripe price changes are kept in sync
      // with /control by the backend, so when /control version bumps we
      // also force-refresh the stripe-prices cache. Pricing page +
      // dashboard billing tab subscribe to the price-update event and
      // re-render automatically.
      try {
        const { refreshBillingPrices } = await import("./billing-prices.js");
        refreshBillingPrices().catch(() => {});
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

export async function fetchFeatureFlags(forceRefresh = false) {
  const now = Date.now();

  // Check memory cache. Subtract a small buffer (500ms) to ensure
  // setIntervals of 30s don't accidentally hit the cache if they fire a
  // few ms early.
  if (!forceRefresh && cachedFlags && now - lastFetch < (CACHE_TTL - 500)) {
    return cachedFlags;
  }

  // Check localStorage cache
  if (!forceRefresh) {
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
      // ignore parse errors
    }
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
  // We ONLY await this if it's a background poll or forceRefresh. On initial
  // load, we want to fetch the flags as fast as possible without an extra
  // round-trip to the Vercel proxy.
  if (!knownVersion && forceRefresh) {
    knownVersion = await fetchControlVersion();
  }

  // Fetch directly from upstream API. The browser usually clears CF bot checks.
  let flags = null;
  try {
    const fetchUrl = forceRefresh ? controlUrlForVersion(knownVersion) : CONTROL_API_URL;
    const response = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    flags = await response.json();

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
