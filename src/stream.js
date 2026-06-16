// Stream page — YouTube live stream embed
import { fetchFeatureFlags, applyFeatureFlags } from "./feature-flags.js";

const STREAM_URL = "https://www.youtube.com/watch?v=iiRNq1sxr0U";

function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      if (u.pathname.startsWith("/live/")) return u.pathname.split("/")[2];
      if (u.pathname.startsWith("/watch")) return u.searchParams.get("v");
      if (u.hostname === "youtu.be") return u.pathname.slice(1);
      const segs = u.pathname.split("/").filter(Boolean);
      if (segs[0] === "embed") return segs[1];
    }
  } catch (_) { return null; }
  return null;
}

function buildEmbedUrl() {
  const videoId = extractYouTubeId(STREAM_URL) || "";
  return `https://www.youtube.com/embed/${videoId}?origin=${encodeURIComponent("https://thetrackerapp.io")}`;
}

function renderStream() {
  const wrapper = document.getElementById("streamEmbedWrapper");
  const loading = document.getElementById("streamLoading");
  const offline = document.getElementById("streamOffline");
  if (!wrapper) return;

  const embedUrl = buildEmbedUrl();
  if (!embedUrl) {
    if (loading) loading.hidden = true;
    if (offline) offline.hidden = false;
    return;
  }

  if (loading) loading.hidden = true;
  if (offline) offline.hidden = true;

  wrapper.innerHTML = `<iframe src="${embedUrl}" title="The Tracker App Live Stream" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
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
