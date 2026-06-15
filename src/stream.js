// Stream page — YouTube live stream embed
import { fetchFeatureFlags, applyFeatureFlags } from "./feature-flags.js";

const FALLBACK_STREAM_URL = "https://www.youtube.com/watch?v=iiRNq1sxr0U";
const STREAM_CACHE_KEY = "tracker.streamUrl";
const STREAM_CACHE_TTL = 24 * 60 * 60 * 1000;

function getCachedStreamUrl() {
  try {
    const stored = localStorage.getItem(STREAM_CACHE_KEY);
    if (!stored) return null;
    const { url, timestamp } = JSON.parse(stored);
    if (Date.now() - timestamp < STREAM_CACHE_TTL) return url;
  } catch {}
  return null;
}

function setCachedStreamUrl(url) {
  if (!url) return;
  try {
    localStorage.setItem(STREAM_CACHE_KEY, JSON.stringify({ url, timestamp: Date.now() }));
  } catch {}
}

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
  } catch (_) { return null; }
  return null;
}

function buildEmbedUrl(videoId) {
  const origin = encodeURIComponent("https://thetrackerapp.io");
  return `https://www.youtube.com/embed/${videoId}?origin=${origin}`;
}

function renderStream(streamUrl) {
  const wrapper = document.getElementById("streamEmbedWrapper");
  const offline = document.getElementById("streamOffline");
  const loading = document.getElementById("streamLoading");

  if (!wrapper) return;

  const videoId = extractYouTubeId(streamUrl);

  if (!videoId) {
    if (loading) loading.hidden = true;
    if (offline) offline.hidden = false;
    wrapper.innerHTML = "";
    return;
  }

  if (loading) loading.hidden = true;
  if (offline) offline.hidden = true;

  wrapper.innerHTML = `<iframe src="${buildEmbedUrl(videoId)}" title="The Tracker App Live Stream" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
}

async function refreshFromUpstream() {
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
        const message = document.getElementById("maintenanceMessage");
        if (overlay) {
          overlay.hidden = false;
          if (message && flags.maintenanceMessage) message.textContent = flags.maintenanceMessage;
        }
      }
      if (flags.youtubeStreamUrl) {
        setCachedStreamUrl(flags.youtubeStreamUrl);
      }
    }
  } catch {}
}

function init() {
  const cachedUrl = getCachedStreamUrl();
  const streamUrl = cachedUrl || FALLBACK_STREAM_URL;
  renderStream(streamUrl);
  refreshFromUpstream();
}

init();
