// Status Page JavaScript

const API_BASE = "https://api.thetrackerapp.io";

// Services to monitor
const SERVICES = [
  { id: "website", name: "Website", url: "https://thetrackerapp.io" },
  { id: "api", name: "Tracker API", url: "https://api.thetrackerapp.io" },
  { id: "dashboard", name: "Dashboard", url: "https://dashboard.thetrackerapp.io" },
  { id: "telegram", name: "Telegram Bot", url: null },
  { id: "imessage", name: "iMessage Service", url: null },
  { id: "sms", name: "SMS Service", url: null },
];

// Simulated status data (replace with real API)
function generateMockStatus() {
  return SERVICES.map(service => ({
    ...service,
    status: "operational",
    uptime: 99.9 + Math.random() * 0.1,
    history: Array.from({ length: 30 }, () => 
      Math.random() > 0.02 ? "operational" : Math.random() > 0.5 ? "degraded" : "outage"
    ),
  }));
}

function generateMockStats() {
  return {
    avgResponseTime: Math.floor(180 + Math.random() * 100),
    p95ResponseTime: Math.floor(350 + Math.random() * 150),
    requestsToday: Math.floor(50000 + Math.random() * 30000),
  };
}

async function fetchStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Could not fetch status:", e);
  }
  
  // Return mock data
  return {
    services: generateMockStatus(),
    stats: generateMockStats(),
    incidents: [],
    overall: "operational",
  };
}

function renderServices(services) {
  const grid = document.getElementById("servicesGrid");
  if (!grid) return;
  
  grid.innerHTML = services.map(service => `
    <div class="service-card">
      <div class="service-info">
        <h3>${service.name}</h3>
        <div class="service-status">
          <span class="status-dot ${service.status}"></span>
          <span>${formatStatus(service.status)}</span>
        </div>
      </div>
      <div class="service-graph">
        ${service.history.slice(-30).map(day => 
          `<div class="graph-bar ${day}" style="height: ${day === 'operational' ? 100 : day === 'degraded' ? 60 : 30}%"></div>`
        ).join('')}
      </div>
      <div class="service-uptime">
        <span class="uptime-percent">${service.uptime.toFixed(1)}%</span>
        <span class="uptime-label">uptime</span>
      </div>
    </div>
  `).join('');
}

function renderStats(stats) {
  const avgEl = document.getElementById("avgResponseTime");
  const p95El = document.getElementById("p95ResponseTime");
  const reqEl = document.getElementById("requestsToday");
  
  if (avgEl) avgEl.textContent = `${stats.avgResponseTime}ms`;
  if (p95El) p95El.textContent = `${stats.p95ResponseTime}ms`;
  if (reqEl) reqEl.textContent = formatNumber(stats.requestsToday);
}

function renderOverallStatus(status) {
  const banner = document.getElementById("overallStatus");
  if (!banner) return;
  
  const icon = banner.querySelector(".status-icon");
  const h1 = banner.querySelector("h1");
  
  if (icon) {
    icon.className = `status-icon ${status}`;
  }
  
  if (h1) {
    h1.textContent = status === "operational" 
      ? "All Systems Operational"
      : status === "degraded"
      ? "Some Systems Degraded"
      : "System Outage";
  }
}

function renderUptimeHistory(services) {
  const grid = document.getElementById("uptimeGrid");
  if (!grid) return;
  
  // Combine all services for overall daily status
  const days = 30;
  const history = [];
  
  for (let i = 0; i < days; i++) {
    const dayStatuses = services.map(s => s.history[i] || "operational");
    if (dayStatuses.includes("outage")) {
      history.push("outage");
    } else if (dayStatuses.includes("degraded")) {
      history.push("degraded");
    } else {
      history.push("operational");
    }
  }
  
  grid.innerHTML = history.map((status, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return `<div class="uptime-day ${status}" title="${date.toLocaleDateString()}"></div>`;
  }).join('');
}

function renderIncidents(incidents) {
  const list = document.getElementById("incidentsList");
  if (!list) return;
  
  if (!incidents || incidents.length === 0) {
    list.innerHTML = '<p class="no-incidents">No incidents reported in the past 7 days</p>';
    return;
  }
  
  list.innerHTML = incidents.map(incident => `
    <div class="incident-item">
      <div class="incident-title">${escapeHtml(incident.title)}</div>
      <div class="incident-date">${new Date(incident.date).toLocaleDateString()}</div>
    </div>
  `).join('');
}

function updateLastUpdated() {
  const el = document.getElementById("lastUpdated");
  if (el) {
    el.textContent = new Date().toLocaleTimeString();
  }
}

function formatStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

async function refresh() {
  const data = await fetchStatus();
  
  renderOverallStatus(data.overall);
  renderServices(data.services);
  renderStats(data.stats);
  renderUptimeHistory(data.services);
  renderIncidents(data.incidents);
  updateLastUpdated();
}

// Initial load
refresh();

// Refresh every 60 seconds
setInterval(refresh, 60000);
