import { fetchFeatureFlags, applyFeatureFlags } from "./feature-flags.js";

async function init() {
  try {
    const flags = await fetchFeatureFlags();
    applyFeatureFlags(flags);
  } catch (e) {
    console.warn("Failed to load feature flags for trust page", e);
  }
}

init();
