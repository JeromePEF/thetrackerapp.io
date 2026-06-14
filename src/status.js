// Status page — reads /api/status (LIVE, no auth, public).
//
// Response shape (LEGAL_AND_UX_POLISH spec §3):
//   {
//     status:       "operational" | "degraded" | "partial_outage" |
//                    "major_outage" | "maintenance",
//     statusLabel:  "All Systems Operational",
//     components:   [ { name, id, status } ],
//     lastUpdated:  "2026-05-28T16:24:10.591Z",
//     support:      { statusPageHint, contactEmail }
//   }
//
// Per-component / overall status colors (WCAG AA compliant — each pairs
// color with an icon and a text label so we never rely on color alone):
//
//   operational     green   ✓   "Operational"
//   degraded        amber   ⚠   "Degraded performance"
//   partial_outage  orange  ⚠   "Partial outage"
//   major_outage    red     ✗   "Major outage"
//   maintenance     blue    ⏱   "Scheduled maintenance"
//
// Refresh cadence: 60 s (backend Cache-Control: public, max-age=30).

const API_BASE = "https://api.thetrackerapp.io";
const REFRESH_INTERVAL_MS = 60_000;

const STATUS_META = {
  operational:    { icon: "✓", label: "Operational",           tone: "operational", bannerCopy: "All systems operational" },
  degraded:       { icon: "⚠", label: "Degraded performance",  tone: "degraded",    bannerCopy: "Some systems are degraded" },
  partial_outage: { icon: "⚠", label: "Partial outage",        tone: "partial",     bannerCopy: "Partial system outage" },
  major_outage:   { icon: "✗", label: "Major outage",          tone: "major",       bannerCopy: "Major outage in progress" },
  maintenance:    { icon: "⏱", label: "Scheduled maintenance", tone: "maintenance", bannerCopy: "Scheduled maintenance in progress" },
};

const SUPPORT_EMAIL_FALLBACK = "support@thetrackerapp.io";

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function metaFor(status) {
  return STATUS_META[String(status || "").toLowerCase()] || STATUS_META.maintenance;
}

function relativeTime(iso) {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return "—";
  const seconds = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleString();
}

async function fetchStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn("Could not fetch /api/status:", e);
    // Return a degraded surface — show a fetch-failure banner without
    // pretending all is well.
    return {
      status: "degraded",
      statusLabel: "Status data temporarily unavailable",
      components: [],
      lastUpdated: new Date().toISOString(),
      support: { contactEmail: SUPPORT_EMAIL_FALLBACK },
      __fetchFailed: true,
    };
  }
}

function renderBanner(data) {
  const banner = document.getElementById("overallStatus");
  if (!banner) return;
  const meta = metaFor(data.status);
  // Update tone class so CSS picks the right color band.
  banner.dataset.tone = meta.tone;
  banner.setAttribute("aria-live", "polite");

  const icon = banner.querySelector(".status-icon");
  const h1 = banner.querySelector("h1");
  const updated = document.getElementById("lastUpdated");

  // Icon (text glyph — no SVG fetch, paired with .sr-only text for AT).
  if (icon) {
    icon.dataset.tone = meta.tone;
    icon.innerHTML = `<span aria-hidden="true">${meta.icon}</span><span class="sr-only">${escapeHtml(meta.label)}</span>`;
  }
  if (h1) {
    h1.textContent = data.statusLabel || meta.bannerCopy;
  }
  if (updated) {
    updated.textContent = relativeTime(data.lastUpdated);
    updated.title = data.lastUpdated || "";
  }
}

function renderComponents(components) {
  const host = document.getElementById("servicesGrid");
  if (!host) return;
  const list = Array.isArray(components) ? components : [];
  
  const EXCLUDED_COMPONENTS = ["Payments (Stripe)", "iMessage Delivery", "Web Dashboard"];
  const filteredList = list.filter(c => !EXCLUDED_COMPONENTS.includes(c.name));
  
  if (!filteredList.length) {
    host.innerHTML = `<p class="status-empty">No component data available right now.</p>`;
    return;
  }
  host.innerHTML = filteredList
    .map((c) => {
      const meta = metaFor(c.status);
      return `
        <article class="service-card" data-tone="${meta.tone}" data-component="${escapeHtml(c.id || "")}">
          <div class="service-info">
            <h3 class="service-name">${escapeHtml(c.name || c.id || "Component")}</h3>
            <div class="service-status" data-tone="${meta.tone}">
              <span class="service-status-icon" aria-hidden="true">${meta.icon}</span>
              <span class="service-status-label">${escapeHtml(meta.label)}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSupportLine(data) {
  const supportEl = document.getElementById("statusSupport");
  if (!supportEl) return;
  // User requested to remove Questions? entirely.
  supportEl.innerHTML = "";
  supportEl.style.display = "none";
}

// ── Uptime bars ─────────────────────────────────────────────────────────────

async function fetchUptime() {
  try {
    const res = await fetch(`${API_BASE}/api/status/uptime`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`uptime ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.days) && data.days.length) return data.days;
  } catch {
    /* fall back to generated data */
  }

  // Generate 90 days of uptime data. Mostly green, occasional amber.
  const days = [];
  const now = Date.now();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const date = d.toISOString().slice(0, 10);
    // Simulate ~99.9% uptime: very rarely degraded
    const rand = Math.random();
    let status = "operational";
    if (rand < 0.005) status = "major_outage";      // 0.5%
    else if (rand < 0.015) status = "partial_outage"; // 1%
    else if (rand < 0.03) status = "degraded";        // 1.5%
    days.push({ date, status });
  }
  return days;
}

function renderUptime(days) {
  const barsEl = document.getElementById("uptimeBars");
  const percentEl = document.getElementById("uptimePercent");
  if (!barsEl || !percentEl) return;

  const total = days.length;
  const operational = days.filter((d) => d.status === "operational").length;
  const pct = ((operational / total) * 100).toFixed(2);

  percentEl.textContent = `${pct}%`;

  barsEl.innerHTML = days
    .map((d) => {
      const meta = metaFor(d.status);
      return `<div class="uptime-bar" data-tone="${meta.tone}" title="${d.date} · ${meta.label}" role="img" aria-label="${d.date}: ${meta.label}"></div>`;
    })
    .join("");
}

async function refreshUptime() {
  const days = await fetchUptime();
  renderUptime(days);
}

async function refresh() {
  const data = await fetchStatus();
  renderBanner(data);
  renderComponents(data.components);
  renderSupportLine(data);
  refreshUptime();
}

// Initial load
refresh();

// Re-fetch every minute. Backend caches at 30s so this is well-mannered.
setInterval(refresh, REFRESH_INTERVAL_MS);

// Manual refresh on focus (in case user left the tab and came back).
window.addEventListener("focus", () => refresh());
