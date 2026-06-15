// Stream page — YouTube live stream embed
import { fetchFeatureFlags, getCachedFlags, applyFeatureFlags } from "./feature-flags.js";
import "./footer-socials.js";

function extractYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      if (u.pathname.startsWith("/live/")) return u.pathname.split("/")[2];
      if (u.pathname.startsWith("/watch")) return u.searchParams.get("v");
      if (u.hostname === "youtu.be") return u.pathname.slice(1);
      const segs = u.pathname.split("/").filter(Boolean);
      if (segs[0] === "embed") return segs[1];
      if (segs[0] === "live") return segs[1];
    }
  } catch (_) {
    return null;
  }
  return null;
}

function buildEmbedUrl(videoId) {
  const origin = encodeURIComponent("https://thetrackerapp.io");
  return `https://www.youtube.com/embed/${videoId}?origin=${origin}`;
}

function renderStream(streamUrl) {
  const wrapper = document.getElementById("streamEmbedWrapper");
  const offline = document.getElementById("streamOffline");

  if (!wrapper) return;

  const videoId = extractYouTubeId(streamUrl);

  if (!videoId) {
    if (offline) offline.hidden = false;
    return;
  }

  if (offline) offline.hidden = true;

  const embedUrl = buildEmbedUrl(videoId);

  wrapper.innerHTML = `
    <iframe
      src="${embedUrl}"
      title="The Tracker App Live Stream"
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen>
    </iframe>
  `;
}

async function checkMaintenanceMode() {
  try {
    const flags = await fetchFeatureFlags();
    if (flags.maintenanceMode) {
      const overlay = document.getElementById("maintenanceOverlay");
      const message = document.getElementById("maintenanceMessage");
      if (overlay) {
        overlay.hidden = false;
        if (message && flags.maintenanceMessage) {
          message.textContent = flags.maintenanceMessage;
        }
      }
      return true;
    }
  } catch (e) {
    console.warn("Could not check maintenance mode:", e);
  }
  return false;
}

async function init() {
  await checkMaintenanceMode();
  const flags = getCachedFlags();
  if (flags) applyFeatureFlags(flags);
  const streamUrl = flags?.youtubeStreamUrl || "";
  renderStream(streamUrl);
}

init();
