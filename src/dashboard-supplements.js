// Dashboard — supplement tracking panel (lives inside the Nutrition sub-view).
//
// PHILOSOPHY (changed): users CURATE their own supplement list. We don't
// surface niche items (ashwagandha, tongkat ali, beetroot, etc.) unless the
// user explicitly adds them. New users start with an EMPTY chip grid and a
// prominent "+ Add supplement" button. Tapping it opens a picker showing
// the ~10 most popular items in the registry plus a "Custom…" row.
//
// Chart visualization rules:
//   - Only supplements the user has TRACKED are rendered as chart lines or
//     metric cards anywhere in the dashboard.
//   - Backend should respect `trackedSupplements[]` on the user profile;
//     `/api/chart/data` only returns supplement metrics for keys present
//     in that array (see SUPPLEMENT_TRACKING_BACKEND.txt §10).
//
// Backend contract:
//   GET   /api/nutrition/supplement/registry   → full registry incl `popular`
//   GET   /api/nutrition/supplement?date=…      → today's logged entries
//   POST  /api/nutrition/supplement             → log a new entry
//   DELETE /api/nutrition/supplement/:id         → remove a mis-log
//   PATCH /api/account/profile  { trackedSupplements: [...] }  → persist list

const API_BASE = "https://api.thetrackerapp.io";
const STORAGE_KEY = "tracker.supplements.tracked";

// Popular supplements surfaced in the "+ Add" picker. Order is rough
// frequency-of-use ranking. The user's actual *tracked* list is empty until
// they explicitly add items.
const POPULAR_REGISTRY = [
  { key: "creatine",     displayName: "Creatine",      defaultUnit: "g",       defaultDose: 5,    popular: true },
  { key: "whey",         displayName: "Whey Protein",  defaultUnit: "g",       defaultDose: 25,   popular: true },
  { key: "multivitamin", displayName: "Multivitamin",  defaultUnit: "serving", defaultDose: 1,    popular: true },
  { key: "vitaminD",     displayName: "Vitamin D",     defaultUnit: "IU",      defaultDose: 2000, popular: true },
  { key: "fishOil",      displayName: "Fish Oil",      defaultUnit: "mg",      defaultDose: 1000, popular: true },
  { key: "magnesium",    displayName: "Magnesium",     defaultUnit: "mg",      defaultDose: 400,  popular: true },
  { key: "vitaminC",     displayName: "Vitamin C",     defaultUnit: "mg",      defaultDose: 500,  popular: true },
  { key: "electrolytes", displayName: "Electrolytes",  defaultUnit: "mL",      defaultDose: 500,  popular: true },
  { key: "collagen",     displayName: "Collagen",      defaultUnit: "g",       defaultDose: 10,   popular: true },
  { key: "preWorkout",   displayName: "Pre-Workout",   defaultUnit: "scoop",   defaultDose: 1,    popular: true },
  { key: "caseinProtein", displayName: "Casein Protein", defaultUnit: "g",     defaultDose: 25,   popular: false },
  { key: "bcaa",         displayName: "BCAAs",         defaultUnit: "g",       defaultDose: 5,    popular: false },
  { key: "eaa",          displayName: "EAAs",          defaultUnit: "g",       defaultDose: 5,    popular: false },
  { key: "caffeinePill", displayName: "Caffeine",      defaultUnit: "mg",      defaultDose: 200,  popular: false },
  { key: "vitaminB12",   displayName: "Vitamin B12",   defaultUnit: "mcg",     defaultDose: 500,  popular: false },
  { key: "zinc",         displayName: "Zinc",          defaultUnit: "mg",      defaultDose: 15,   popular: false },
  { key: "iron",         displayName: "Iron",          defaultUnit: "mg",      defaultDose: 18,   popular: false },
  { key: "calcium",      displayName: "Calcium",       defaultUnit: "mg",      defaultDose: 500,  popular: false },
  { key: "potassium",    displayName: "Potassium",     defaultUnit: "mg",      defaultDose: 99,   popular: false },
];

const SUPPLEMENT_COLOR = {
  creatine: "#4dd0e1",
  whey: "#64b5f6",
  caseinProtein: "#5c6bc0",
  multivitamin: "#81c784",
  vitaminD: "#ffb74d",
  fishOil: "#ff8a65",
  magnesium: "#9575cd",
  vitaminC: "#ffd54f",
  electrolytes: "#4fc3f7",
  collagen: "#a1887f",
  preWorkout: "#ef5350",
  bcaa: "#26a69a",
  eaa: "#66bb6a",
  caffeinePill: "#7e57c2",
  vitaminB12: "#f48fb1",
  zinc: "#90a4ae",
  iron: "#d84315",
  calcium: "#bcaaa4",
  potassium: "#b0bec5",
};

const state = {
  rootEl: null,
  registry: POPULAR_REGISTRY,
  registryByKey: new Map(POPULAR_REGISTRY.map((r) => [r.key, r])),
  tracked: [],            // string[] of canonical keys the user actively tracks
  todayEntries: [],
  endpointAvailable: true,
  customs: [],            // user-added custom supplements (not in registry)
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
    if (res.status === 404 || res.status === 501) state.endpointAvailable = false;
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

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function getItemMeta(key) {
  return (
    state.registryByKey.get(key) ||
    state.customs.find((c) => c.key === key) ||
    null
  );
}

function colorFor(key) {
  return SUPPLEMENT_COLOR[key] || "#64b5f6";
}

// ============================================================================
// Public entry
// ============================================================================

export async function initSupplementsPanel(container) {
  if (!container) return;
  state.rootEl = container;
  loadTrackedFromStorage();
  renderPanel();   // optimistic render with current local state
  await Promise.allSettled([loadRegistry(), loadProfile(), loadTodayEntries()]);
  renderPanel();
}

function loadTrackedFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.tracked)) state.tracked = parsed.tracked.slice();
      if (Array.isArray(parsed?.customs)) state.customs = parsed.customs.slice();
    }
  } catch {
    /* ignore */
  }
}

function saveTrackedToStorage() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tracked: state.tracked, customs: state.customs })
    );
  } catch {
    /* ignore (quota / private mode) */
  }
}

async function loadRegistry() {
  try {
    const r = await apiRequest("/api/nutrition/supplement/registry");
    if (Array.isArray(r?.items) && r.items.length) {
      state.registry = r.items;
      state.registryByKey = new Map(r.items.map((it) => [it.key, it]));
    }
  } catch {
    /* keep POPULAR_REGISTRY fallback */
  }
}

// Load `trackedSupplements` from the user's profile so it's synced across
// devices. Falls back to localStorage when the backend hasn't shipped this.
async function loadProfile() {
  try {
    const r = await apiRequest("/api/account/profile");
    const profileTracked = r?.trackedSupplements || r?.profile?.trackedSupplements;
    if (Array.isArray(profileTracked)) {
      state.tracked = profileTracked.slice();
      // Pull any custom supplements that aren't in the registry into customs[]
      profileTracked.forEach((key) => {
        if (!state.registryByKey.has(key) && !state.customs.find((c) => c.key === key)) {
          // Backend should send custom metadata via profile.customSupplements;
          // fall back to a minimal stub so the chip still renders.
          state.customs.push({
            key,
            displayName: key,
            defaultUnit: "g",
            defaultDose: 1,
          });
        }
      });
      saveTrackedToStorage();
    }
  } catch {
    /* leave localStorage as authoritative */
  }
}

async function loadTodayEntries() {
  try {
    const r = await apiRequest(`/api/nutrition/supplement?date=${todayIso()}`);
    state.todayEntries = Array.isArray(r?.entries) ? r.entries : [];
  } catch {
    state.todayEntries = [];
  }
}

// Persist tracked list — PATCH the profile + mirror to localStorage.
async function persistTracked() {
  saveTrackedToStorage();
  try {
    await apiRequest("/api/account/profile", {
      method: "PATCH",
      body: JSON.stringify({
        trackedSupplements: state.tracked,
        customSupplements: state.customs.length ? state.customs : undefined,
      }),
    });
  } catch (e) {
    // Don't block the UI — localStorage is the fallback source of truth.
    console.warn("persist tracked supplements failed:", e);
  }
}

// ============================================================================
// Rendering
// ============================================================================

function renderPanel() {
  if (!state.rootEl) return;
  const takenKeys = new Set(state.todayEntries.map((e) => e.canonicalKey || e.key));
  const trackedMeta = state.tracked
    .map((k) => getItemMeta(k))
    .filter(Boolean);

  const todayLine = state.todayEntries.length
    ? state.todayEntries
        .slice(0, 6)
        .map(
          (e) =>
            `<span class="supp-today-chip" style="--c:${colorFor(e.canonicalKey || e.key)}">${escapeHtml(
              e.name || getItemMeta(e.canonicalKey || e.key)?.displayName || e.canonicalKey
            )} <strong>${e.amount}${escapeHtml(e.unit || "")}</strong></span>`
        )
        .join("") +
      (state.todayEntries.length > 6 ? `<span class="supp-today-more">+${state.todayEntries.length - 6} more</span>` : "")
    : `<span class="supp-today-empty">Nothing logged yet today.</span>`;

  // Empty-state vs chip grid.
  const body = trackedMeta.length
    ? `
      <div class="supp-chip-grid">
        ${trackedMeta
          .map((item) => {
            const taken = takenKeys.has(item.key);
            const color = colorFor(item.key);
            return `
              <div class="supp-chip-wrap">
                <button type="button" class="supp-chip ${taken ? "is-taken" : ""}"
                        data-supp-action="log" data-supp-key="${escapeHtml(item.key)}"
                        style="--c:${color}"
                        title="Log ${escapeHtml(item.displayName)} (${item.defaultDose} ${escapeHtml(item.defaultUnit)}). Shift-click for custom amount.">
                  <span class="supp-chip-name">${escapeHtml(item.displayName)}</span>
                  <span class="supp-chip-dose">${item.defaultDose}<span class="supp-chip-unit">${escapeHtml(item.defaultUnit)}</span></span>
                </button>
                <button type="button" class="supp-chip-remove"
                        data-supp-action="untrack" data-supp-key="${escapeHtml(item.key)}"
                        aria-label="Stop tracking ${escapeHtml(item.displayName)}">×</button>
              </div>
            `;
          })
          .join("")}
        <button type="button" class="supp-chip supp-chip-add" data-supp-action="open-picker">
          <span class="supp-chip-name">+ Add supplement</span>
          <span class="supp-chip-dose">choose what to track</span>
        </button>
      </div>
    `
    : `
      <div class="supp-empty">
        <p class="supp-empty-title">No supplements tracked yet.</p>
        <p class="supp-empty-sub">Pick the ones you take regularly and we'll only show those on your dashboard. Add as many or as few as you want — totally yours to curate.</p>
        <button type="button" class="btn-primary supp-empty-btn" data-supp-action="open-picker">+ Add a supplement</button>
      </div>
    `;

  state.rootEl.innerHTML = `
    <section class="supplements-panel grafana-panel">
      <header class="panel-header">
        <div>
          <h3>Supplements</h3>
          <p class="panel-sub">${
            trackedMeta.length
              ? "Tap a chip to log a dose. × to stop tracking. Only your tracked supplements show up in charts."
              : "Curate the supplements you actually take — they'll appear on your dashboard with their own chart line."
          }</p>
        </div>
      </header>

      ${trackedMeta.length ? `<div class="supp-today-row">${todayLine}</div>` : ""}

      ${body}

      ${
        state.endpointAvailable
          ? ""
          : `<p class="supp-fallback-note">Backend logging endpoint isn't live yet — chips will log to localStorage in the meantime. You can also text the bot (e.g. "took 5g creatine") and it'll go through the existing nutrition path.</p>`
      }
    </section>
  `;
  bindEvents();
}

// ============================================================================
// Picker modal — opens when user clicks "+ Add supplement". Shows popular
// rows at the top, "Browse all" expander, and a "Custom…" row at the bottom.
// ============================================================================

function openPicker() {
  const overlay = document.createElement("div");
  overlay.className = "supp-picker-overlay";
  overlay.id = "suppPickerOverlay";
  overlay.innerHTML = renderPicker(/* showAll */ false);
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePicker();
  });
  bindPickerEvents(overlay);
}

function renderPicker(showAll) {
  const tracked = new Set(state.tracked);
  const items = state.registry.slice();
  const popularItems = items.filter((it) => it.popular !== false).slice(0, 10);
  const otherItems = items.filter((it) => it.popular === false);

  const renderRow = (it) => {
    const isTracked = tracked.has(it.key);
    const color = colorFor(it.key);
    return `
      <button type="button" class="supp-picker-row ${isTracked ? "is-tracked" : ""}"
              data-supp-action="toggle-track" data-supp-key="${escapeHtml(it.key)}"
              style="--c:${color}">
        <span class="supp-picker-swatch"></span>
        <span class="supp-picker-name">${escapeHtml(it.displayName)}</span>
        <span class="supp-picker-meta">${it.defaultDose} ${escapeHtml(it.defaultUnit)}</span>
        <span class="supp-picker-action">${isTracked ? "✓ Tracking" : "+ Add"}</span>
      </button>
    `;
  };

  return `
    <div class="supp-picker" role="dialog" aria-modal="true" aria-labelledby="suppPickerTitle">
      <header class="supp-picker-head">
        <h3 id="suppPickerTitle">Add a supplement</h3>
        <button type="button" class="supp-picker-close" data-supp-action="close-picker" aria-label="Close">×</button>
      </header>
      <p class="supp-picker-sub">Tap to add — you can remove anything later. Only what you track shows up on your charts.</p>

      <section class="supp-picker-section">
        <h4>Popular</h4>
        ${popularItems.map(renderRow).join("")}
      </section>

      ${
        otherItems.length
          ? `
        <section class="supp-picker-section">
          <button type="button" class="supp-picker-expand" data-supp-action="toggle-show-all" aria-expanded="${showAll}">
            ${showAll ? "− Hide other" : `+ Browse other (${otherItems.length})`}
          </button>
          ${showAll ? `<div class="supp-picker-other">${otherItems.map(renderRow).join("")}</div>` : ""}
        </section>
      `
          : ""
      }

      <section class="supp-picker-section">
        <h4>Custom</h4>
        <p class="supp-picker-custom-hint">Don't see what you take? Add your own — any name, any unit.</p>
        <button type="button" class="supp-picker-custom-btn" data-supp-action="add-custom">+ Add custom supplement</button>
      </section>

      <footer class="supp-picker-foot">
        <button type="button" class="btn-primary" data-supp-action="close-picker">Done</button>
      </footer>
    </div>
  `;
}

function bindPickerEvents(overlay) {
  overlay.querySelectorAll("[data-supp-action]").forEach((el) => {
    el.addEventListener("click", async (ev) => {
      const action = el.dataset.suppAction;
      const key = el.dataset.suppKey;
      if (action === "close-picker") {
        closePicker();
      } else if (action === "toggle-track" && key) {
        await toggleTrack(key);
        // Re-render picker preserving expansion state
        const expanded = !!overlay.querySelector(".supp-picker-other");
        overlay.innerHTML = renderPicker(expanded);
        bindPickerEvents(overlay);
      } else if (action === "toggle-show-all") {
        const expanded = !!overlay.querySelector(".supp-picker-other");
        overlay.innerHTML = renderPicker(!expanded);
        bindPickerEvents(overlay);
      } else if (action === "add-custom") {
        await addCustomFlow();
        const expanded = !!overlay.querySelector(".supp-picker-other");
        overlay.innerHTML = renderPicker(expanded);
        bindPickerEvents(overlay);
      }
    });
  });
}

function closePicker() {
  const overlay = document.getElementById("suppPickerOverlay");
  if (overlay) overlay.remove();
  renderPanel();
}

async function addCustomFlow() {
  const name = prompt("Supplement name (e.g. 'Tongkat Ali', 'Beetroot Powder'):");
  if (!name) return;
  const amountStr = prompt(`Typical dose for ${name} (number):`);
  const defaultDose = Number(amountStr);
  if (!Number.isFinite(defaultDose) || defaultDose <= 0) {
    alert("Please enter a positive number.");
    return;
  }
  const defaultUnit =
    prompt(
      "Unit: g / mg / mcg / oz / IU / mL / L / serving / scoop / tablet / capsule",
      "g"
    ) || "g";
  const key = `custom-${slugify(name)}`;
  const item = { key, displayName: name, defaultUnit, defaultDose };
  // Avoid duplicates
  if (!state.customs.find((c) => c.key === key)) {
    state.customs.push(item);
  }
  if (!state.tracked.includes(key)) {
    state.tracked.push(key);
  }
  await persistTracked();
}

async function toggleTrack(key) {
  if (state.tracked.includes(key)) {
    state.tracked = state.tracked.filter((k) => k !== key);
  } else {
    state.tracked = [...state.tracked, key];
  }
  await persistTracked();
}

// ============================================================================
// Main panel events
// ============================================================================

function bindEvents() {
  state.rootEl?.querySelectorAll("[data-supp-action]").forEach((el) => {
    el.addEventListener("click", async (ev) => {
      const action = el.dataset.suppAction;
      const key = el.dataset.suppKey;
      if (action === "log" && key) {
        await logChip(key, ev.shiftKey);
      } else if (action === "untrack" && key) {
        const meta = getItemMeta(key);
        if (
          confirm(
            `Stop tracking ${meta?.displayName || key}?\n\nIt'll disappear from your dashboard charts but past logs stay in your history.`
          )
        ) {
          state.tracked = state.tracked.filter((k) => k !== key);
          await persistTracked();
          renderPanel();
          // Tell the chart panel to refetch so the chart line disappears.
          window.dispatchEvent(new CustomEvent("tracker:nutrition-changed", { detail: { kind: "supplement-untrack" } }));
        }
      } else if (action === "open-picker") {
        openPicker();
      }
    });
  });
}

async function logChip(key, askForAmount) {
  const item = getItemMeta(key);
  if (!item) return;
  let amount = item.defaultDose;
  let unit = item.defaultUnit;
  if (askForAmount) {
    const entered = prompt(
      `How much ${item.displayName}? (default ${item.defaultDose} ${item.defaultUnit})`,
      item.defaultDose
    );
    if (entered == null || entered === "") return;
    amount = Number(entered);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a positive number.");
      return;
    }
  }
  await logEntry({ name: item.displayName, canonicalKey: item.key, amount, unit });
}

async function logEntry({ name, canonicalKey, amount, unit }) {
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
      const entry = r.entry || r;
      state.todayEntries = state.todayEntries.map((e) => (e === optimistic ? entry : e));
    }
    renderPanel();
    window.dispatchEvent(new CustomEvent("tracker:nutrition-changed", { detail: { kind: "supplement-log" } }));
  } catch (e) {
    state.todayEntries = state.todayEntries.filter((x) => x !== optimistic);
    renderPanel();
    if (state.endpointAvailable) {
      console.warn("supplement log failed:", e);
      alert(`Couldn't log ${name}. Try again in a moment.`);
    }
  }
}
