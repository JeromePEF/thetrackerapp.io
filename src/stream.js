// Stream page — YouTube live stream embed via playlist
import { fetchFeatureFlags, applyFeatureFlags } from "./feature-flags.js";

const EMBED_URL = "https://www.youtube.com/embed/videoseries?list=PLXWqvyuPkkG8&origin=" + encodeURIComponent("https://thetrackerapp.io");

function renderStream() {
  const wrapper = document.getElementById("streamEmbedWrapper");
  const loading = document.getElementById("streamLoading");
  const offline = document.getElementById("streamOffline");
  if (!wrapper) return;

  if (loading) loading.hidden = true;
  if (offline) offline.hidden = true;

  wrapper.innerHTML = `<iframe src="${EMBED_URL}" title="The Tracker App Live Stream" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
}

function viewerId() {
  let id = sessionStorage.getItem("stream.viewerId");
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    sessionStorage.setItem("stream.viewerId", id);
  }
  return id;
}

async function pingViewer() {
  try {
    const res = await fetch(`/api/control?action=viewer-ping&viewer=${viewerId()}`);
    if (res.ok) {
      const data = await res.json();
      const el = document.getElementById("viewerCount");
      if (el) el.textContent = data.viewers || 0;
    }
  } catch {}
}

function startViewerPing() {
  pingViewer();
  setInterval(pingViewer, 15000);
}

async function init() {
  renderStream();
  startViewerPing();

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
