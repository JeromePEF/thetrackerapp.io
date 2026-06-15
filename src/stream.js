// Stream page — YouTube live stream embed
import { fetchFeatureFlags, applyFeatureFlags } from "./feature-flags.js";

const STREAM_CACHE_KEY = "tracker.streamUrl";

function getCachedStreamUrl() {
  try {
    const raw = localStorage.getItem(STREAM_CACHE_KEY);
    if (!raw) return null;
    const { url } = JSON.parse(raw);
    return url || null;
  } catch {}
  return null;
}

function setCachedStreamUrl(url) {
  if (!url) return;
  try {
    localStorage.setItem(STREAM_CACHE_KEY, JSON.stringify({ url }));
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
  return `https://www.youtube.com/embed/${videoId}?origin=${encodeURIComponent("https://thetrackerapp.io")}`;
}

function hideLoading() {
  const el = document.getElementById("streamLoading");
  if (el) el.hidden = true;
}

function showOffline() {
  const el = document.getElementById("streamOffline");
  if (el) el.hidden = false;
}

function renderStream(streamUrl) {
  const wrapper = document.getElementById("streamEmbedWrapper");
  const offline = document.getElementById("streamOffline");
  if (!wrapper) return;

  const videoId = extractYouTubeId(streamUrl);

  if (!videoId) {
    wrapper.innerHTML = "";
    hideLoading();
    if (offline) offline.hidden = false;
    return;
  }

  hideLoading();
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
        const msg = document.getElementById("maintenanceMessage");
        if (overlay) {
          overlay.hidden = false;
          if (msg && flags.maintenanceMessage) msg.textContent = flags.maintenanceMessage;
        }
      }
      if (flags.youtubeStreamUrl) {
        setCachedStreamUrl(flags.youtubeStreamUrl);
        return flags.youtubeStreamUrl;
      }
    }
  } catch {}
  return null;
}

async function init() {
  let streamUrl = getCachedStreamUrl();

  if (streamUrl) {
    renderStream(streamUrl);
  } else {
    streamUrl = await refreshFromUpstream();
  }

  if (streamUrl) {
    renderStream(streamUrl);
  } else if (!getCachedStreamUrl()) {
    hideLoading();
    showOffline();
  }

  refreshFromUpstream();
}

init();
