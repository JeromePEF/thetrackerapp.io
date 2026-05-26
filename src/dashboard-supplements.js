// Dashboard — supplement quick-add panel (lives inside the Nutrition sub-view).
//
// Renders a chip row of the user's most-frequent supplements (or the
// registry's starter set when the user is new), each tappable to log a
// dose with one click. Falls back gracefully when the backend endpoints
// from SUPPLEMENT_TRACKING_BACKEND.txt aren't deployed yet (404 / 500 →
// inline "coming soon" hint, no broken UI).
//
// Backend contract:
//   GET   /api/nutrition/supplement/registry   → starter list + canonical units
//   GET   /api/nutrition/supplement?date=…      → today's logged entries
//   POST  /api/nutrition/supplement             → log a new entry
//   DELETE /api/nutrition/supplement/:id         → remove a mis-log

const API_BASE = "https://api.thetrackerapp.io";

// Starter list mirrors the registry's first ~12 items so the panel still
// renders even when /registry returns 404. When the backend ships, the live
// registry replaces these.
const STARTER_REGISTRY = [
  { key: "creatine",     displayName: "Creatine",      defaultUnit: "g",   defaultDose: 5 },
  { key: "whey",         displayName: "Whey Protein",  defaultUnit: "g",   defaultDose: 25 },
  { key: "vitaminD",     displayName: "Vitamin D",     defaultUnit: "IU",  defaultDose: 2000 },
  { key: "fishOil",      displayName: "Fish Oil",      defaultUnit: "mg",  defaultDose: 1000 },
  { key: "magnesium",    displayName: "Magnesium",     defaultUnit: "mg",  defaultDose: 400 },
  { key: "vitaminC",     displayName: "Vitamin C",     defaultUnit: "mg",  defaultDose: 500 },
  { key: "zinc",         displayName: "Zinc",          defaultUnit: "mg",  defaultDose: 15 },
  { key: "multivitamin", displayName: "Multivitamin",  defaultUnit: "serving", defaultDose: 1 },
  { key: "electrolytes", displayName: "Electrolytes",  defaultUnit: "mL",  defaultDose: 500 },
  { key: "collagen",     displayName: "Collagen",      defaultUnit: "g",   defaultDose: 10 },
  { key: "ashwagandha",  displayName: "Ashwagandha",   defaultUnit: "mg",  defaultDose: 600 },
  { key: "melatonin",    displayName: "Melatonin",     defaultUnit: "mg",  defaultDose: 3 },
];

const SUPPLEMENT_COLOR = {
  creatine: "#4dd0e1",
  whey: "#64b5f6",
  vitaminD: "#ffb74d",
  fishOil: "#ff8a65",
  magnesium: "#9575cd",
  vitaminC: "#ffd54f",
  zinc: "#90a4ae",
  multivitamin: "#81c784",
  electrolytes: "#4fc3f7",
  collagen: "#a1887f",
  ashwagandha: "#7e57c2",
  melatonin: "#5c6bc0",
};

const state = {
  rootEl: null,
  registry: STARTER_REGISTRY,
  todayEntries: [],
  endpointAvailable: true, // flipped to false on first 404 → show fallback msg
};

function getAuthToken() {
  try {
    const raw = localStorage.getItem("tracker.auth.session");
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      const token = parsed && (parsed.token || parsed.accessToken);
      if (token) return String(token).trim();
    } catch {
      /* fall through */
    }
    return String(raw).trim();
  } catch {
    return "";
  }
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    // 404 / 501 means the endpoint isn't shipped yet — flip the flag and
    // render the fallback CTA so the user still understands the feature.
    if (res.status === 404 || res.status === 501) {
      state.endpointAvailable = false;
    }
    const body = await res.text().catch(() => "");
    throw new Error(`${path} ${res.status}: ${body || res.statusText}`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Public entry — render the supplements panel into `container`. Safe to call
// multiple times; will refetch + re-render.
export async function initSupplementsPanel(container) {
  if (!container) return;
  state.rootEl = container;
  // Optimistic render — show the panel with the starter registry first so
  // users see something instantly, then upgrade with backend data.
  renderPanel();
  await Promise.allSettled([loadRegistry(), loadTodayEntries()]);
  renderPanel();
}

async function loadRegistry() {
  try {
    const r = await apiRequest("/api/nutrition/supplement/registry");
    if (Array.isArray(r?.items) && r.items.length) {
      state.registry = r.items;
    }
  } catch (e) {
    // Keep STARTER_REGISTRY — fall back silently.
  }
}

async function loadTodayEntries() {
  try {
    const r = await apiRequest(`/api/nutrition/supplement?date=${todayIso()}`);
    state.todayEntries = Array.isArray(r?.entries) ? r.entries : [];
  } catch (e) {
    state.todayEntries = [];
  }
}

function renderPanel() {
  if (!state.rootEl) return;
  // Sort registry: items the user took today first (so "log another"
  // becomes the obvious affordance), then the rest.
  const takenKeys = new Set(state.todayEntries.map((e) => e.canonicalKey || e.key));
  const sorted = state.registry.slice().sort((a, b) => {
    const aTaken = takenKeys.has(a.key) ? 0 : 1;
    const bTaken = takenKeys.has(b.key) ? 0 : 1;
    return aTaken - bTaken;
  });
  // Build today's intake summary line for above the chips.
  const todayLine = state.todayEntries.length
    ? state.todayEntries
        .slice(0, 5)
        .map(
          (e) =>
            `<span class="supp-today-chip" style="--c:${SUPPLEMENT_COLOR[e.canonicalKey] || "#64b5f6"}">${escapeHtml(
              e.name || e.canonicalKey
            )} <strong>${e.amount}${escapeHtml(e.unit || "")}</strong></span>`
        )
        .join("") +
      (state.todayEntries.length > 5 ? `<span class="supp-today-more">+${state.todayEntries.length - 5} more</span>` : "")
    : `<span class="supp-today-empty">Nothing logged yet today — tap a chip below to log one.</span>`;

  state.rootEl.innerHTML = `
    <section class="supplements-panel grafana-panel">
      <header class="panel-header">
        <div>
          <h3>Supplements</h3>
          <p class="panel-sub">Tap any supplement to log a dose. Each one becomes its own chart on the dashboard.</p>
        </div>
      </header>

      <div class="supp-today-row">${todayLine}</div>

      <div class="supp-chip-grid">
        ${sorted
          .map((item) => {
            const taken = takenKeys.has(item.key);
            const color = SUPPLEMENT_COLOR[item.key] || "#64b5f6";
            const safeKey = escapeHtml(item.key);
            return `
              <button type="button"
                      class="supp-chip ${taken ? "is-taken" : ""}"
                      data-supp-key="${safeKey}"
                      style="--c:${color}"
                      title="Log ${escapeHtml(item.displayName)} (${item.defaultDose} ${escapeHtml(item.defaultUnit)})">
                <span class="supp-chip-name">${escapeHtml(item.displayName)}</span>
                <span class="supp-chip-dose">${item.defaultDose}<span class="supp-chip-unit">${escapeHtml(item.defaultUnit)}</span></span>
              </button>
            `;
          })
          .join("")}
        <button type="button" class="supp-chip supp-chip-add" data-supp-key="__other">
          <span class="supp-chip-name">+ Other</span>
          <span class="supp-chip-dose">custom</span>
        </button>
      </div>

      ${
        state.endpointAvailable
          ? ""
          : `<p class="supp-fallback-note">Backend logging endpoint isn't live yet — chips will work as soon as it ships. You can text the bot in the meantime (e.g. "took 5g creatine") and it'll be logged via the existing nutrition path.</p>`
      }
    </section>
  `;
  bindChipEvents();
}

function bindChipEvents() {
  state.rootEl?.querySelectorAll(".supp-chip[data-supp-key]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.suppKey;
      if (!key) return;
      if (key === "__other") {
        openCustomDialog();
        return;
      }
      const item = state.registry.find((r) => r.key === key);
      if (!item) return;
      // Optional dose override — hold Shift to be prompted for a non-default
      // amount. Plain click logs the registry default.
      let amount = item.defaultDose;
      let unit = item.defaultUnit;
      if (window.event?.shiftKey) {
        const entered = prompt(`How much ${item.displayName}? (default ${item.defaultDose} ${item.defaultUnit})`, item.defaultDose);
        if (entered == null || entered === "") return;
        amount = Number(entered);
        if (!Number.isFinite(amount) || amount <= 0) {
          alert("Please enter a positive number.");
          return;
        }
      }
      await logEntry({ name: item.displayName, canonicalKey: item.key, amount, unit });
    });
  });
}

function openCustomDialog() {
  const name = prompt("Supplement name (e.g. 'Beta-Alanine'):");
  if (!name) return;
  const amountStr = prompt(`How much ${name}? (number)`);
  const amount = Number(amountStr);
  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Please enter a positive number.");
    return;
  }
  const unit =
    prompt("Unit: g / mg / mcg / oz / IU / mL / L / serving / scoop / tablet / capsule", "g") || "g";
  logEntry({ name, amount, unit });
}

async function logEntry({ name, canonicalKey, amount, unit }) {
  // Optimistic add — show it immediately, then reconcile with server response.
  const optimistic = {
    id: `pending-${Date.now()}`,
    name,
    canonicalKey,
    amount,
    unit,
    loggedAt: new Date().toISOString(),
    pending: true,
  };
  state.todayEntries = [optimistic, ...state.todayEntries];
  renderPanel();
  try {
    const r = await apiRequest("/api/nutrition/supplement", {
      method: "POST",
      body: JSON.stringify({ name, canonicalKey, amount, unit, source: "manual" }),
    });
    if (r && (r.id || r.entry)) {
      // Replace the optimistic placeholder with the canonical entry.
      const entry = r.entry || r;
      state.todayEntries = state.todayEntries.map((e) => (e === optimistic ? entry : e));
    }
    renderPanel();
    // Nudge the chart panel to refetch /api/chart/data so the new metric line
    // appears immediately in the combined chart.
    window.dispatchEvent(new CustomEvent("tracker:nutrition-changed", { detail: { kind: "supplement" } }));
  } catch (e) {
    // Roll back the optimistic add + tell the user (only when the endpoint
    // exists at all — silent fallback if it's still in 404-land).
    state.todayEntries = state.todayEntries.filter((x) => x !== optimistic);
    renderPanel();
    if (state.endpointAvailable) {
      console.warn("supplement log failed:", e);
      alert(`Couldn't log ${name}. Try again in a moment.`);
    }
  }
}
