// Stream page — YouTube live stream embed
import { fetchFeatureFlags, applyFeatureFlags } from "./feature-flags.js";

const CACHE_KEY = "tracker.streamVideoId";

function getCachedVideoId() {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) return JSON.parse(stored).videoId || null;
  } catch {}
  return null;
}

function setCachedVideoId(videoId) {
  if (!videoId) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ videoId }));
  } catch {}
}

function buildEmbedUrl(videoId) {
  return `https://www.youtube.com/embed/${videoId}?origin=${encodeURIComponent("https://thetrackerapp.io")}`;
}

function renderStream(videoId) {
  const wrapper = document.getElementById("streamEmbedWrapper");
  const loading = document.getElementById("streamLoading");
  const offline = document.getElementById("streamOffline");
  if (!wrapper) return;

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

async function fetchLatestVideoId() {
  try {
    const res = await fetch("/api/stream-url");
    if (res.ok) {
      const data = await res.json();
      return data.videoId || null;
    }
  } catch {}
  return null;
}

async function init() {
  let videoId = getCachedVideoId();

  if (videoId) {
    renderStream(videoId);
  }

  const latest = await fetchLatestVideoId();

  if (latest) {
    setCachedVideoId(latest);
    if (latest !== videoId) renderStream(latest);
  } else if (!videoId) {
    renderStream(null);
  }

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
