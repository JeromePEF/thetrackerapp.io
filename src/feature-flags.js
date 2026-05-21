// Feature Flags System
// Fetches feature visibility settings from api.thetrackerapp.io/control

const CONTROL_API_URL = "https://api.thetrackerapp.io/control";
const CACHE_KEY = "tracker.featureFlags";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Default flags (fallback if API unavailable)
const DEFAULT_FLAGS = {
  blog: true,
  press: true,
  products: true,
  brackets: false,
  win: false,
  runClubs: true,
  personalTrainers: true,
  testimonials: true,
  faq: true,
  iphoneMockup: true,
  stepTape: true,
  bodyMeasurements: true,
  multiMetricCharts: true,
  narrative: true,
  tools: {
    tdeeCalculator: true,
    bmiCalculator: true,
    aiMealPlanner: true,
    foodDiary: true,
  },
};

let cachedFlags = null;
let lastFetch = 0;

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
      const { flags, timestamp } = JSON.parse(stored);
      if (now - timestamp < CACHE_TTL) {
        cachedFlags = flags;
        lastFetch = timestamp;
        return flags;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  // Fetch from API
  try {
    const response = await fetch(CONTROL_API_URL, {
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

    // Store in localStorage
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ flags, timestamp: now }));
    } catch (e) {
      // Ignore localStorage errors
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
  // Apply visibility to elements with data-feature attribute
  document.querySelectorAll("[data-feature]").forEach((el) => {
    const feature = el.dataset.feature;
    const enabled = getNestedValue(flags, feature);

    if (enabled === false) {
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
    } else {
      el.hidden = false;
      el.removeAttribute("aria-hidden");
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
  return flags;
}
