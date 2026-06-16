// Stream page — YouTube live stream embed
import { fetchFeatureFlags, applyFeatureFlags } from "./feature-flags.js";

const CHANNEL_LIVE_URL = "https://www.youtube.com/@thetrackerappio/live";

function buildEmbedUrl() {
  const origin = encodeURIComponent("https://thetrackerapp.io");
  return `${CHANNEL_LIVE_URL}?origin=${origin}`;
}

function renderStream() {
  const wrapper = document.getElementById("streamEmbedWrapper");
  const loading = document.getElementById("streamLoading");
  const offline = document.getElementById("streamOffline");
  if (!wrapper) return;

  if (loading) loading.hidden = true;
  if (offline) offline.hidden = true;

  wrapper.innerHTML = `<iframe src="${buildEmbedUrl()}" title="The Tracker App Live Stream" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
}

async function init() {
  renderStream();

  try {
    const flags = await fetchFeatureFlags(true);
    if (flags) {
      applyFeatureFlags(flags);
      try {
        const { applyFooterSocials } = await import("./footer-socials.js");
        applyFooterSocials(flags?.socials);
      } catch {}
      if (flags.maintenanceMode) {
        const overlay = document.getElementById("maintenanceOverlay");
        const msg = document.getElementById("maintenanceMessage");
        if (overlay) {
          overlay.hidden = false;
          if (msg && flags.maintenanceMessage) msg.textContent = flags.maintenanceMessage;
        }
      }
    }
  } catch {}
}

init();
