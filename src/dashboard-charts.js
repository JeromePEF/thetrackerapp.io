// Dashboard Charts (Grafana-style)
//
// Renders the dashboard "Progress Charts" section by hitting the unified
// backend endpoint:
//
//   GET /api/chart/data?contact=<id>&range=<7d|30d|90d|1y|all>[&metric=<key>]
//
// The response shape is documented in the backend's "Chart Data API"
// integration guide. We expect:
//
//   {
//     ok, contact, range, rangeStart, rangeEnd,
//     metrics:        [ { key, label, unit, category, available, stats } ],
//     metricsByCategory: { nutrition: [...], hydration: [...], body: [...],
//                          bodyMeasures: [...], health: [...] },
//     chartData:      { weight: [ { date, value } ], bicepL: [...] }
//   }
//
// Visual style: dark Grafana panels, smooth area-filled line series, subtle
// horizontal grid, dashed vertical grid, hover tooltips with date + values,
// and a Name / Mean / Min / Max / Last legend table under every chart.

const API_BASE = "https://api.thetrackerapp.io";

// ---------- helpers ----------

// The dashboard stores the session as JSON at `tracker.auth.session`:
//   { "token": "...", "expiresAt": "..." }
// We need the raw token for the Authorization header.
function getAuthToken() {
  try {
    const raw = localStorage.getItem("tracker.auth.session");
    if (!raw) return "";
    // Try JSON first (the normal shape written by dashboard.js).
    try {
      const parsed = JSON.parse(raw);
      const token = parsed && (parsed.token || parsed.accessToken);
      if (token) return String(token).trim();
    } catch {
      /* fall through – the value might already be a raw token string */
    }
    return String(raw).trim();
  } catch {
    return "";
  }
}

// The user identity is stored as JSON at `tracker.auth.user` (written by
// `normalizeAuthUser()` in dashboard.js). The /api/chart/data endpoint wants a
// "contact" – which is whatever string identifies the user across services
// (iMessage handle, phone, telegram username, internal canonical id, …). We
// prefer the most stable / human-readable field available.
function getCurrentContact() {
  try {
    const raw = localStorage.getItem("tracker.auth.user");
    if (raw) {
      const u = JSON.parse(raw);
      const candidates = [
        u?.username,
        u?.canonical,
        u?.credential,
        u?.maskedCredential,
        u?.accountId,
        u?.email,
      ];
      for (const c of candidates) {
        if (c && String(c).trim()) return String(c).trim();
      }
    }
  } catch {
    /* ignore */
  }
  // Final fallback – older keys that some early sign-in paths may have set.
  for (const key of [
    "tracker.identity.contact",
    "tracker.user.contact",
    "tracker.account.contact",
    "tracker.username",
  ]) {
    try {
      const v = localStorage.getItem(key);
      if (v && v.trim()) return v.trim();
    } catch {
      /* ignore */
    }
  }
  return "";
}

async function fetchJson(path) {
  const token = getAuthToken();
  // Only send headers the backend's CORS policy already allows. Adding
  // Cache-Control / Pragma here triggers a CORS preflight and the backend
  // currently doesn't whitelist those header names, so every chart fetch
  // would fail. The `cache: "no-store"` fetch option + the `?_=<ts>`
  // cache-buster query string are enough to bypass browser + CDN caches
  // without provoking the preflight.
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = `${API_BASE}${path}${path.includes("?") ? "&" : "?"}_=${Date.now()}`;
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

const CATEGORY_ORDER = ["body", "bodyMeasures", "nutrition", "hydration", "health"];
const CATEGORY_LABELS = {
  body: "Body",
  bodyMeasures: "Body Measurements",
  nutrition: "Nutrition",
  hydration: "Hydration",
  health: "Health",
};

// Category palette – tuned for dark background, ~12 distinct hues.
const PALETTE = [
  "#38ffd3", // teal/mint
  "#64b5f6", // blue
  "#ff7f7f", // coral
  "#ffb74d", // amber
  "#ba68c8", // purple
  "#4fc3f7", // sky
  "#81c784", // green
  "#ef5350", // red
  "#9575cd", // violet
  "#f48fb1", // pink
  "#ffcc80", // peach
  "#90a4ae", // slate
];

function colorFor(key, index) {
  return PALETTE[index % PALETTE.length];
}

// Left/Right symmetry pairs we'll render as comparison panels.
const SYMMETRY_PAIRS = [
  { left: "bicepL", right: "bicepR", label: "Biceps", unit: "in" },
  { left: "forearmL", right: "forearmR", label: "Forearms", unit: "in" },
  { left: "quadL", right: "quadR", label: "Quads", unit: "in" },
  { left: "calfL", right: "calfR", label: "Calves", unit: "in" },
];

// ---------- state ----------

// Default quick-look charts shown in the top fold. Anything else lives behind
// the "+ Show advanced charts" toggle.
const QUICK_METRICS = ["weight", "calories", "protein", "water"];

// Sub-tab identifiers must be declared BEFORE `state` because `state.subView`
// is computed via readSubViewFromUrl() during the state object initializer
// (line below) and that function references SUB_VIEWS. Declaring SUB_VIEWS
// after `state` triggers a TDZ access that minification surfaces as
// "Cannot read properties of undefined (reading 'includes')" at runtime.
const SUB_VIEWS = ["all", "workouts", "nutrition", "water"];

const state = {
  range: "30d",
  data: null,
  cardio: null, // populated by /api/cardio/stats when available
  // metrics shown on the aggregate "Overview" chart at the top
  overlay: ["weight", "calories", "protein"],
  inflight: null,
  contact: "",
  advancedOpen: false,
  // Stats sub-tab: "all" (default) | "workouts" | "nutrition" | "water"
  // Drives which sections / quick charts render. Sub-tab choice persists via
  // URL hash on the dashboard so users can deep-link or share an isolated view.
  subView: readSubViewFromUrl(),
};

function readSubViewFromUrl() {
  if (typeof window === "undefined") return "all";
  const hash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
  return SUB_VIEWS.includes(hash) ? hash : "all";
}

function writeSubViewToUrl(view) {
  if (typeof window === "undefined") return;
  const next = view === "all" ? "" : `#${view}`;
  if (window.location.hash !== next) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
  }
}

// Cardio range param mapping. The cardio endpoint uses short-form ranges
// ("d", "w", "m", "y", "at") that don't perfectly match the chart endpoint's
// ("7d", "30d", "90d", "1y", "all"). Map between the two.
function cardioRangeFor(range) {
  switch (range) {
    case "7d":  return "w";
    case "30d": return "m";
    case "90d": return "90d";   // backend accepts the same string
    case "1y":  return "y";
    case "all": return "at";
    default:    return "w";
  }
}

let rootEl = null;

// ---------- public API ----------

export async function initDashboardCharts(container) {
  if (!container) return;
  rootEl = container;
  state.contact = getCurrentContact();

  container.innerHTML = `
    <div class="grafana-shell" id="grafanaShell">
      <nav class="stats-subtabs" role="tablist" aria-label="Stats view">
        ${renderSubTab("all", "🏠 All")}
        ${renderSubTab("workouts", "🏋️ Workouts")}
        ${renderSubTab("nutrition", "🍎 Nutrition")}
        ${renderSubTab("water", "💧 Water")}
      </nav>
      <div class="grafana-toolbar">
        <div class="range-buttons" role="tablist" aria-label="Time range">
          ${renderRangeButton("7d", "7D")}
          ${renderRangeButton("30d", "30D", true)}
          ${renderRangeButton("90d", "90D")}
          ${renderRangeButton("1y", "1Y")}
          ${renderRangeButton("all", "All")}
        </div>
        <div class="grafana-toolbar-actions">
          <button type="button" class="grafana-refresh" id="grafanaShareWeek" aria-label="Download a shareable weekly snapshot PNG">📸 Share week</button>
          <button type="button" class="grafana-refresh" id="grafanaDownloadWorkouts" aria-label="Download all workouts as CSV (PRs highlighted)">📋 Workouts CSV</button>
          <button type="button" class="grafana-refresh" id="grafanaRefresh" aria-label="Refresh charts">↻ Refresh</button>
        </div>
      </div>
      <div class="grafana-body" id="grafanaBody">
        <p class="grafana-empty">Loading chart data…</p>
      </div>
    </div>
  `;

  bindSubTabs(container);

  container.querySelectorAll(".range-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".range-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.range = btn.dataset.range;
      void loadAndRender();
    });
  });
  container.querySelector("#grafanaRefresh")?.addEventListener("click", () => {
    void loadAndRender();
  });
  container.querySelector("#grafanaShareWeek")?.addEventListener("click", async () => {
    if (!state.data) {
      // Trigger a load if we don't have data yet, then download once ready.
      await loadAndRender();
    }
    const { downloadWeeklySnapshot } = await import("./weekly-snapshot.js");
    downloadWeeklySnapshot({
      data: state.data,
      cardio: state.cardio,
      username: state.contact || "you",
    });
  });

  container.querySelector("#grafanaDownloadWorkouts")?.addEventListener("click", async () => {
    if (!state.data) await loadAndRender();
    downloadWorkoutsCsv(state.data, state.contact || "you");
  });

  await loadAndRender();
}

function renderRangeButton(range, label, active = false) {
  return `<button type="button" class="range-btn ${active ? "active" : ""}" data-range="${range}">${label}</button>`;
}

function renderSubTab(view, label) {
  const active = state.subView === view;
  return `<button type="button" class="stats-subtab ${active ? "active" : ""}" role="tab" aria-selected="${active}" data-subview="${view}">${label}</button>`;
}

function bindSubTabs(container) {
  container.querySelectorAll(".stats-subtab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.subview;
      if (!SUB_VIEWS.includes(v) || v === state.subView) return;
      state.subView = v;
      writeSubViewToUrl(v);
      // Update toggle styling in place; then re-render the body so each
      // section reflects the active sub-view's filter without losing the
      // already-fetched data.
      container.querySelectorAll(".stats-subtab").forEach((b) => {
        const isActive = b.dataset.subview === v;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-selected", String(isActive));
      });
      if (state.data) renderAll();
    });
  });
}

async function loadAndRender() {
  if (!rootEl) return;
  const body = rootEl.querySelector("#grafanaBody");
  if (!body) return;

  if (!state.contact) state.contact = getCurrentContact();
  if (!state.contact) {
    body.innerHTML = `<p class="grafana-empty">Sign in to view your charts.</p>`;
    return;
  }

  body.innerHTML = `<p class="grafana-empty">Loading chart data…</p>`;

  try {
    if (state.inflight) state.inflight.abort?.();
    const chartParams = new URLSearchParams({
      contact: state.contact,
      range: state.range,
    });
    const cardioParams = new URLSearchParams({
      contact: state.contact,
      range: cardioRangeFor(state.range),
    });
    // Fire both in parallel — cardio is "soft" so we don't fail the whole
    // render if the cardio endpoint is unavailable or 404.
    const [data, cardio] = await Promise.all([
      fetchJson(`/api/chart/data?${chartParams.toString()}`),
      fetchJson(`/api/cardio/stats?${cardioParams.toString()}`).catch(() => null),
    ]);
    if (!data || data.ok === false) throw new Error("Bad response");
    state.data = data;
    state.cardio = cardio && cardio.ok !== false ? cardio : null;
    renderAll();
  } catch (err) {
    body.innerHTML = `<p class="grafana-empty grafana-error">Chart data unavailable: ${escapeHtml(err?.message || "request failed")}</p>`;
    console.warn("Chart data fetch failed:", err);
  }
}

// ---------- rendering ----------

function renderAll() {
  if (!rootEl || !state.data) return;
  const body = rootEl.querySelector("#grafanaBody");
  if (!body) return;

  const { metrics, metricsByCategory, chartData } = state.data;
  const availableMap = new Map();
  (metrics || []).forEach((m) => {
    // Skip duplicates of the same underlying series (the backend sends both
    // `water` and `waterGallons`; we only need one).
    if (m.key === "waterGallons" && state.data.chartData?.water) return;
    if (m.available && Array.isArray(chartData[m.key]) && chartData[m.key].length > 0) {
      availableMap.set(m.key, m);
    }
  });

  if (availableMap.size === 0) {
    body.innerHTML = `<p class="grafana-empty">No data yet for this time range. Try widening the range or log something via text.</p>`;
    return;
  }

  // Sanitise overlay selection (drop metrics that aren't available)
  state.overlay = state.overlay.filter((k) => availableMap.has(k));
  if (state.overlay.length === 0) {
    state.overlay = QUICK_METRICS.filter((k) => availableMap.has(k)).slice(0, 3);
    if (state.overlay.length === 0) state.overlay = Array.from(availableMap.keys()).slice(0, 3);
  }

  // Build the body based on which sub-view is active. Each sub-view shows a
  // focused subset; "all" keeps the original holistic layout.
  let bodyHtml = "";
  if (state.subView === "workouts") {
    bodyHtml = renderWorkoutsView(availableMap, metricsByCategory);
  } else if (state.subView === "nutrition") {
    bodyHtml = renderNutritionView(availableMap, metricsByCategory);
  } else if (state.subView === "water") {
    bodyHtml = renderWaterView(availableMap, metricsByCategory);
  } else {
    bodyHtml = `
      ${renderSpotlight(availableMap)}
      ${renderInfoStrips(availableMap)}
      ${renderQuickCharts(availableMap)}
      <div class="advanced-toggle-row">
        <button type="button" class="advanced-toggle ${state.advancedOpen ? "is-open" : ""}" id="advancedToggle" aria-expanded="${state.advancedOpen}">
          <span class="advanced-toggle-icon">${state.advancedOpen ? "−" : "+"}</span>
          ${state.advancedOpen ? "Hide advanced charts" : "Show advanced charts"}
        </button>
      </div>
      <div class="advanced-section" id="advancedSection" ${state.advancedOpen ? "" : "hidden"}>
        ${renderAggregatePanel(availableMap)}
        ${renderSymmetryPanels(availableMap)}
        ${renderCategoryPanels(metricsByCategory, availableMap)}
      </div>
    `;
  }

  body.innerHTML = bodyHtml;

  // Also populate the legacy Body Measurements panel (static cards in dashboard.html)
  // with the same data we just fetched — so users don't see "--" everywhere when
  // /api/body-measures hasn't been populated.
  hydrateBodyMeasuresFromChartData(state.data);

  // Defer drawing until layout is measured.
  requestAnimationFrame(() => drawAllCharts(availableMap));
  bindOverlayCheckboxes(availableMap);
  bindSpotlightEditors();
  bindDrilldownTriggers(availableMap);

  rootEl.querySelector("#advancedToggle")?.addEventListener("click", () => {
    state.advancedOpen = !state.advancedOpen;
    renderAll();
  });
}

// ---------- workouts CSV export ----------
//
// Builds a downloadable spreadsheet of every strength workout the user has
// logged across the current range. Each row gets a `PR` column set to "★"
// when that day's lift equals the all-time max for that lift (so users can
// import the CSV into Excel/Numbers/Sheets and conditionally format gold).

function downloadWorkoutsCsv(data, contact) {
  if (!data) return;
  const STRENGTH_KEYS = [
    "bench", "squat", "deadlift", "overheadPress", "ohp", "row", "pullup", "pushup",
  ];
  const metrics = Array.isArray(data.metrics) ? data.metrics : [];
  const lifts = metrics.filter(
    (m) =>
      m.available !== false &&
      (m.category === "strength" || STRENGTH_KEYS.includes(m.key)),
  );
  if (!lifts.length) {
    alert("No strength workouts to export yet — log one via text first.");
    return;
  }

  // Flatten each metric's chartData into rows (date, lift, value, unit, isPR).
  const rows = [];
  for (const m of lifts) {
    const points = data.chartData?.[m.key] || [];
    const max = Number(m.stats?.max);
    const unit = m.unit || "lb";
    for (const p of points) {
      const v = Number(p.value);
      if (!Number.isFinite(v)) continue;
      const isPR = Number.isFinite(max) && Math.abs(v - max) < 0.001;
      rows.push({
        date: p.date,
        lift: m.label || m.key,
        value: v,
        unit,
        isPR,
        source: p.source || "",
        id: p.id ?? "",
      });
    }
  }
  // Sort by date desc so the freshest workouts are at the top.
  rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  // Build CSV (RFC 4180-safe quoting for any commas / quotes in fields)
  const escape = (s) => {
    const str = String(s ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const header = ["Date", "Lift", "Value", "Unit", "PR", "Source", "ID"]
    .map(escape)
    .join(",");
  const body = rows
    .map((r) =>
      [r.date, r.lift, r.value, r.unit, r.isPR ? "★ PR" : "", r.source, r.id]
        .map(escape)
        .join(","),
    )
    .join("\n");
  const csv = `${header}\n${body}\n`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeContact = String(contact || "user").replace(/[^a-zA-Z0-9_-]/g, "_");
  a.href = url;
  a.download = `${safeContact}-workouts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ---------- drill-down triggers ----------
//
// Wires every clickable point in the Stats tab to the modal in
// dashboard-drilldown.js: clicking a day in the "Calories — this week" bar
// chart opens that day's food log; clicking the Weight quick chart opens the
// list of raw weight entries (with source + delete) so users can audit
// suspicious values.

async function openNutritionDayModal(date, summary) {
  try {
    const mod = await import("./dashboard-drilldown.js");
    mod.openNutritionDay({
      date,
      fallback: summary || {},
    });
  } catch (e) {
    console.warn("openNutritionDay failed:", e);
  }
}

async function openWeightEntriesModal() {
  try {
    const mod = await import("./dashboard-drilldown.js");
    const points = state.data?.chartData?.weight || [];
    mod.openMetricEntries({ key: "weight", label: "Weight", unit: "lb", points });
  } catch (e) {
    console.warn("openMetricEntries failed:", e);
  }
}

function bindDrilldownTriggers(availableMap) {
  if (!rootEl) return;

  // 1. Each bar on the "Calories — this week" card
  rootEl.querySelectorAll(".week-bar[data-day]").forEach((bar) => {
    bar.style.cursor = "pointer";
    bar.addEventListener("click", () => {
      const iso = bar.dataset.day;
      const value = Number(bar.dataset.value || 0);
      const calories = state.data?.chartData?.calories || [];
      const point = calories.find((p) => p.date === iso) || {};
      openNutritionDayModal(iso, {
        total: value,
        entryCount: point.entryCount,
        sources: Array.isArray(point.sources) ? point.sources : (point.source ? [point.source] : []),
      });
    });
    bar.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        bar.click();
      }
    });
  });

  // 2. Big "Calories today" number → today's breakdown
  const todayCard = rootEl.querySelector(".spotlight-calories .spotlight-cal-big");
  if (todayCard) {
    todayCard.style.cursor = "pointer";
    todayCard.title = "Click to see today's food entries";
    todayCard.addEventListener("click", () => {
      const today = todayIso();
      const calories = state.data?.chartData?.calories || [];
      const point = calories.find((p) => p.date === today) || {};
      openNutritionDayModal(today, {
        total: Number(point.value) || 0,
        entryCount: point.entryCount,
        sources: Array.isArray(point.sources) ? point.sources : (point.source ? [point.source] : []),
      });
    });
  }

  // 3. Weight quick-chart card → "all weight entries" audit modal
  const weightCard = rootEl.querySelector('.metric-card[data-metric="weight"]');
  if (weightCard) {
    // Add a small "View entries" link in the header so it's discoverable
    if (!weightCard.querySelector(".metric-card-view-entries")) {
      const head = weightCard.querySelector(".metric-card-head");
      if (head) {
        const link = document.createElement("button");
        link.type = "button";
        link.className = "metric-card-view-entries";
        link.textContent = "View entries";
        link.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openWeightEntriesModal();
        });
        head.appendChild(link);
      }
    }
  }
}

// ---------- inline edit for targets / goal in the spotlight ----------

const GOAL_OPTIONS = ["Maintain", "Lose", "Gain", "Recomp", "Bulk", "Cut"];

function bindSpotlightEditors() {
  // Look across the whole document because measurement-goal targets live in
  // the (separate) Body Measurements panel, not inside the chart container.
  document.querySelectorAll("[data-target-edit]").forEach((el) => {
    if (el.dataset.spotlightBound === "1") return;
    el.dataset.spotlightBound = "1";
    el.addEventListener("click", (ev) => {
      ev.preventDefault();
      startSpotlightEdit(el);
    });
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        startSpotlightEdit(el);
      }
    });
  });

  // Wire the maintenance-calorie "Why?" button so users can see the inputs
  // and method behind the estimate. Uses native confirm/alert for simplicity
  // — we keep this lightweight rather than opening a full modal.
  document.querySelectorAll(".spotlight-maint-why").forEach((btn) => {
    if (btn.dataset.maintBound === "1") return;
    btn.dataset.maintBound = "1";
    btn.addEventListener("click", () => {
      const msg = btn.dataset.why || "Maintenance calories are estimated from your age, sex, height, weight, and recent activity.";
      alert(msg);
    });
  });
}

function startSpotlightEdit(el) {
  // Don't double-open
  if (el.querySelector("input, select")) return;
  const field = el.dataset.targetEdit;
  const isGoal = field === "fitnessGoal";
  const unit = el.dataset.targetUnit || "";
  const originalHtml = el.innerHTML;

  let input;
  if (isGoal) {
    input = document.createElement("select");
    input.className = "spotlight-edit-input";
    GOAL_OPTIONS.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      if (opt.toLowerCase() === el.textContent.trim().toLowerCase()) o.selected = true;
      input.appendChild(o);
    });
  } else {
    input = document.createElement("input");
    input.className = "spotlight-edit-input";
    input.type = "number";
    input.inputMode = "numeric";
    input.min = "0";
    input.step = "1";
    input.placeholder = unit;
    // Pre-fill from a number in the current label, if any
    const m = el.textContent.match(/(\d+)/);
    if (m) input.value = m[1];
  }

  el.innerHTML = "";
  el.appendChild(input);
  if (input.focus) input.focus();
  if (input.select) input.select();

  let settled = false;
  const commit = async () => {
    if (settled) return;
    settled = true;
    const raw = input.value;
    if (raw === "" || raw == null) {
      el.innerHTML = originalHtml;
      return;
    }
    let value;
    if (isGoal) {
      value = String(raw);
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        el.innerHTML = originalHtml;
        return;
      }
      value = Math.round(n);
    }
    try {
      await saveTarget(field, value);
      // Patch our local state so the next render reflects it without a refetch.
      if (isGoal) {
        state.data.goal = value;
      } else {
        const key = field.replace(/Goal$/, "");
        state.data.targets = state.data.targets || {};
        state.data.targets[key] = value;
      }
      // Re-render just the spotlight (keep advanced toggle state).
      // The simplest correct path is to re-run renderAll().
      el.classList.add("just-saved");
      setTimeout(() => renderAll(), 250);
    } catch (e) {
      el.innerHTML = originalHtml;
      el.classList.add("save-failed");
      setTimeout(() => el.classList.remove("save-failed"), 1200);
      console.warn("Save target failed:", e);
    }
  };

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      input.blur();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      settled = true;
      el.innerHTML = originalHtml;
    }
  });
}

async function saveTarget(field, value) {
  // Backend contract:
  //   PATCH /api/account/profile?contact=<contact>
  //   { fitnessGoal | calorieGoal | proteinGoal | carbsGoal | fatsGoal | stepsGoal | ... }
  const contact = state.contact || getCurrentContact();
  if (!contact) throw new Error("Missing contact");
  const params = new URLSearchParams({ contact });
  const token = getAuthToken();
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/account/profile?${params.toString()}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ [field]: value }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PATCH /api/account/profile ${res.status}: ${body || res.statusText}`);
  }
  return res.json().catch(() => null);
}

// ---------- spotlight ----------

// Today's daily snapshot: calories + macros progress, current streak, weekly
// calories bars, and the user's current goal. Whatever the backend can't yet
// provide degrades to "—" gracefully.
function renderSpotlight(availableMap) {
  const today = todayIso();
  const lastPoint = (key) => {
    const arr = state.data.chartData?.[key];
    if (!Array.isArray(arr) || !arr.length) return null;
    return arr[arr.length - 1];
  };
  const todayValue = (key) => {
    const arr = state.data.chartData?.[key];
    if (!Array.isArray(arr)) return null;
    const exact = arr.find((p) => p.date === today);
    return exact ? exact.value : null;
  };

  // Pull goal/streak/targets from the backend if provided. Documented in
  // BACKEND_TODO.md – fields the chart endpoint may include:
  //   goal:    string   ("Maintain" | "Lose" | "Gain" | …)
  //   streak:  { currentDays:number, longestDays:number, lastLog:string }
  //   targets: { calories, protein, carbs, fats, water, steps }
  const goal = state.data.goal || state.data.profile?.goal || "Maintain";
  const streakDays = Number(state.data.streak?.currentDays ?? state.data.streak ?? 0) || 0;
  const targets = state.data.targets || state.data.goals || {};

  const cals = todayValue("calories");
  const calsTarget = numberOr(targets.calories, null);
  const calsPct = calsTarget && cals != null ? Math.min(100, Math.round((cals / calsTarget) * 100)) : null;

  // Maintenance calorie estimate (see NUTRITION_DETAIL_BACKEND.txt).
  // Backend supplies the full object when available; we tolerate the bare
  // number when an older response only sends a scalar.
  const maintRaw = state.data.maintenanceCalories;
  const maintenance =
    maintRaw && typeof maintRaw === "object"
      ? {
          value: numberOr(maintRaw.value, null),
          confidence: String(maintRaw.confidence || "").toLowerCase(),
          method: String(maintRaw.method || ""),
          explanation: maintRaw.explanation || "",
        }
      : maintRaw != null
      ? { value: numberOr(maintRaw, null), confidence: "", method: "", explanation: "" }
      : null;

  // Macros (Protein / Carbs / Fats). Fat row optionally expands to show
  // saturated / polyunsaturated / monounsaturated / trans when backend
  // exposes those keys. Empty sub-fat block stays hidden.
  const fatBreakdown = ["saturatedFat", "polyunsaturatedFat", "monounsaturatedFat", "transFat"]
    .map((k) => {
      const v = todayValue(k);
      if (v == null) return null;
      const tgt = numberOr(targets[k], null);
      return {
        key: k,
        label: ({
          saturatedFat: "Saturated",
          polyunsaturatedFat: "Polyunsat",
          monounsaturatedFat: "Monounsat",
          transFat: "Trans",
        })[k],
        value: v,
        target: tgt,
      };
    })
    .filter(Boolean);

  const macros = ["protein", "carbs", "fats"].map((k) => {
    const value = todayValue(k);
    const target = numberOr(targets[k], null);
    return {
      key: k,
      label: k[0].toUpperCase() + k.slice(1),
      unit: "g",
      value,
      target,
      pct: target && value != null ? Math.min(100, Math.round((value / target) * 100)) : null,
      color: { protein: "#64b5f6", carbs: "#ffb74d", fats: "#ba68c8" }[k],
      // Fats card carries the breakdown so the renderer can pop a sub-list.
      breakdown: k === "fats" ? fatBreakdown : null,
    };
  });

  // Week-of-calories bars (last 7 days, fill missing with 0).
  const weekBars = (() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const point = state.data.chartData?.calories?.find((p) => p.date === iso);
      out.push({
        date: iso,
        value: point ? point.value : 0,
        label: d.toLocaleDateString("en-US", { weekday: "short" })[0],
        weekdayShort: d.toLocaleDateString("en-US", { weekday: "short" }),
        // Pre-format a long, friendly tooltip date string ("Mon, May 19, 2026")
        // so we don't need to re-parse the ISO each hover.
        dateLong: d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        isToday: iso === today,
      });
    }
    return out;
  })();
  const weekMax = Math.max(1, ...weekBars.map((b) => b.value));

  return `
    <section class="spotlight">
      <article class="spotlight-card spotlight-calories">
        <header class="spotlight-card-head">
          <span class="spotlight-label">Calories today</span>
          <span class="spotlight-goal-pill goal-${goal.toLowerCase()} editable-goal" data-target-edit="fitnessGoal" tabindex="0" role="button" aria-label="Edit fitness goal">${escapeHtml(goal)}</span>
        </header>
        <div class="spotlight-cal-row">
          ${renderRing(calsPct, "kcal")}
          <div class="spotlight-cal-stats">
            <div class="spotlight-cal-big">
              ${cals == null ? "—" : `${Math.round(cals).toLocaleString()}<span class="spotlight-cal-unit">kcal</span>`}
            </div>
            <div class="spotlight-cal-sub editable-target" data-target-edit="calorieGoal" data-target-unit="kcal" tabindex="0" role="button" aria-label="Edit calorie target">${calsTarget ? `of ${Math.round(calsTarget).toLocaleString()} kcal` : "+ Set target"}</div>
            ${calsTarget && cals != null ? `<div class="spotlight-cal-delta ${cals > calsTarget ? "delta-over" : "delta-under"}">${cals > calsTarget ? "+" : ""}${Math.round(cals - calsTarget).toLocaleString()} kcal vs target</div>` : ""}
          </div>
        </div>
        ${renderMaintenanceRow(maintenance, cals)}
      </article>

      <article class="spotlight-card spotlight-macros">
        <header class="spotlight-card-head">
          <span class="spotlight-label">Macros today</span>
        </header>
        <div class="macros-bars">
          ${macros
            .map((m) => {
              const field = `${m.key}Goal`; // proteinGoal | carbsGoal | fatsGoal
              const unit = m.unit || "g";
              // Logged value (always include unit). Shows "—" when nothing logged today.
              const logged =
                m.value == null
                  ? `<span class="macro-row-empty">—</span>`
                  : `<span class="macro-row-logged">${Math.round(m.value)}${unit}</span>`;
              // Target / "+ Set target" button on the right side.
              const targetBtn = m.target
                ? `<span class="editable-target" data-target-edit="${field}" data-target-unit="${unit}" tabindex="0" role="button" aria-label="Edit ${m.label} target">${Math.round(m.target)}${unit}</span>`
                : `<span class="editable-target macro-target-empty" data-target-edit="${field}" data-target-unit="${unit}" tabindex="0" role="button" aria-label="Set ${m.label} target">+ Set target</span>`;
              // Fats row optionally expands to show sub-types (saturated /
              // polyunsaturated / monounsaturated / trans) when backend
              // includes the breakdown.
              const subRows =
                m.breakdown && m.breakdown.length
                  ? `<details class="macro-fat-breakdown"><summary>Fat breakdown</summary>${m.breakdown
                      .map(
                        (b) => `
                        <div class="macro-fat-row${b.key === "transFat" ? " is-trans" : ""}">
                          <span class="macro-fat-label">${escapeHtml(b.label)}</span>
                          <span class="macro-fat-value">${Math.round(b.value * 10) / 10}g${
                            b.target ? ` <span class="macro-fat-target">/ ${Math.round(b.target)}g</span>` : ""
                          }</span>
                        </div>`
                      )
                      .join("")}</details>`
                  : "";
              return `
            <div class="macro-row" style="--macro-color:${m.color}">
              <div class="macro-row-head">
                <span class="macro-row-label">${m.label}</span>
                <span class="macro-row-value">${logged}<span class="macro-row-divider"> / </span>${targetBtn}</span>
              </div>
              <div class="macro-bar"><div class="macro-bar-fill" style="width:${m.pct ?? 0}%"></div></div>
              ${subRows}
            </div>
          `;
            })
            .join("")}
        </div>
      </article>

      <article class="spotlight-card spotlight-streak">
        <header class="spotlight-card-head">
          <span class="spotlight-label">Logging streak</span>
        </header>
        <div class="streak-body">
          <div class="streak-emoji" aria-hidden="true">🔥</div>
          <div class="streak-stats">
            <div class="streak-count">${streakDays}</div>
            <div class="streak-sub">${streakDays === 1 ? "day in a row" : "days in a row"}</div>
          </div>
        </div>
      </article>

      <article class="spotlight-card spotlight-week">
        <header class="spotlight-card-head">
          <span class="spotlight-label">Calories — this week</span>
          <span class="spotlight-sub">Sun → Sat</span>
        </header>
        <div class="week-bars" role="img" aria-label="Calories for the last 7 days">
          ${weekBars
            .map(
              (b) => {
                const valueLine = b.value ? `${Math.round(b.value).toLocaleString()} kcal` : "No data";
                return `
            <div class="week-bar ${b.isToday ? "is-today" : ""}" tabindex="0" role="button"
                 data-day="${escapeAttr(b.date)}" data-value="${escapeAttr(String(b.value || 0))}"
                 aria-label="${escapeHtml(b.dateLong)} — ${escapeHtml(valueLine)}. Click to view entries.">
              <div class="week-bar-tooltip" role="tooltip">
                <span class="week-bar-tooltip-date">${escapeHtml(b.dateLong)}${b.isToday ? " · Today" : ""}</span>
                <span class="week-bar-tooltip-value ${b.value ? "" : "is-empty"}">${escapeHtml(valueLine)}</span>
                <span class="week-bar-tooltip-hint">Click to view entries</span>
              </div>
              <div class="week-bar-fill" style="height:${b.value ? Math.max(4, Math.round((b.value / weekMax) * 100)) : 2}%"></div>
              <span class="week-bar-label">${escapeHtml(b.label)}</span>
            </div>
          `;
              }
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

/**
 * Container for the four "info strips" beneath the spotlight:
 * Calories, Running (cardio), Workouts, Water. Each strip renders empty
 * to "" when it has no data — so users only see strips that are populated.
 */
function renderInfoStrips(availableMap) {
  const strips = [
    renderCaloriesStrip(availableMap),
    renderCardioStrip(),
    renderWorkoutStrip(availableMap),
    renderWaterStrip(availableMap),
  ].filter(Boolean);
  if (!strips.length) return "";
  return `<section class="info-strips" aria-label="Activity strips">${strips.join("")}</section>`;
}

/**
 * Calories strip: 7-day calories totals, vs target, biggest day, average.
 * Complements the spotlight ring by surfacing weekly trends.
 */
function renderCaloriesStrip(availableMap) {
  const m = availableMap.get("calories");
  if (!m) return "";
  const points = (state.data.chartData?.calories || []).slice();
  if (!points.length) return "";

  // Limit to last 7 days for the weekly figures.
  const today = todayIso();
  const sevenDayPoints = points.filter((p) => {
    const d = new Date(p.date);
    if (Number.isNaN(d.getTime())) return false;
    const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  });
  if (!sevenDayPoints.length) return "";
  const total = sevenDayPoints.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const avg = total / sevenDayPoints.length;
  const max = sevenDayPoints.reduce(
    (best, p) => (Number(p.value) > Number(best.value) ? p : best),
    sevenDayPoints[0],
  );
  const target = state.data.targets?.calories;
  const weekGoal = target ? target * 7 : null;
  const pct = weekGoal ? Math.min(100, Math.round((total / weekGoal) * 100)) : null;
  const todayValue = points.find((p) => p.date === today)?.value;

  return `
    <article class="info-strip strip-calories">
      <header class="info-strip-head">
        <span class="info-strip-icon">🍎</span>
        <div class="info-strip-headings">
          <span class="info-strip-title">Calories</span>
          <span class="info-strip-sub">Last 7 days</span>
        </div>
      </header>
      <div class="info-strip-row">
        <div class="info-stat">
          <span class="info-stat-label">Today</span>
          <span class="info-stat-value">${todayValue != null ? `${Math.round(todayValue).toLocaleString()}<span class="info-stat-unit"> kcal</span>` : "—"}</span>
        </div>
        <div class="info-stat">
          <span class="info-stat-label">7-day total</span>
          <span class="info-stat-value">${Math.round(total).toLocaleString()}<span class="info-stat-unit"> kcal</span></span>
        </div>
        <div class="info-stat">
          <span class="info-stat-label">Daily avg</span>
          <span class="info-stat-value">${Math.round(avg).toLocaleString()}<span class="info-stat-unit"> kcal</span></span>
        </div>
        <div class="info-stat">
          <span class="info-stat-label">Biggest day</span>
          <span class="info-stat-value">${Math.round(max.value).toLocaleString()}<span class="info-stat-unit"> kcal</span><span class="info-stat-date">${escapeHtml(formatShortDate(max.date))}</span></span>
        </div>
      </div>
      ${
        pct != null
          ? `
        <div class="info-strip-bar" style="--strip-color:#ff8a65">
          <div class="info-strip-bar-fill" style="width:${pct}%"></div>
          <span class="info-strip-bar-label">${pct}% of ${Math.round(weekGoal).toLocaleString()} kcal weekly target</span>
        </div>
      `
          : ""
      }
    </article>
  `;
}

/**
 * Workouts strip: counts logged strength workouts in the selected range and
 * surfaces PRs / heaviest lifts. Reads everything from the existing chart
 * data response (no extra endpoint).
 */
function renderWorkoutStrip(availableMap) {
  // The chart endpoint exposes strength lifts as their own keys (`bench`,
  // `squat`, `deadlift`) and may also expose a generic `workouts` series
  // counting sessions per day. Use whatever is available.
  const sessionMetric = availableMap.get("workouts");
  const totalSessions = sessionMetric?.stats?.count ?? null;

  const lifts = ["bench", "squat", "deadlift", "overheadPress", "row"].filter((k) =>
    availableMap.has(k),
  );
  if (!sessionMetric && lifts.length === 0) return "";

  const liftCards = lifts
    .slice(0, 4)
    .map((k) => {
      const m = availableMap.get(k);
      const last = m.stats?.last?.value;
      const max = m.stats?.max;
      const delta = m.stats?.delta;
      const unit = m.unit || "lb";
      return `
      <div class="info-strip-pr">
        <span class="info-strip-pr-label">${escapeHtml(m.label)}</span>
        <span class="info-strip-pr-value">${last != null ? `${Math.round(last)}<span class="info-stat-unit"> ${escapeHtml(unit)}</span>` : "—"}</span>
        <span class="info-strip-pr-meta">
          ${max != null ? `PR ${Math.round(max)} ${escapeHtml(unit)}` : ""}${delta ? ` · ${delta > 0 ? "+" : ""}${Math.round(delta)} ${escapeHtml(unit)}` : ""}
        </span>
      </div>
    `;
    })
    .join("");

  return `
    <article class="info-strip strip-workouts">
      <header class="info-strip-head">
        <span class="info-strip-icon">🏋️</span>
        <div class="info-strip-headings">
          <span class="info-strip-title">Workouts</span>
          <span class="info-strip-sub">${state.range.toUpperCase()}${
            totalSessions != null ? ` · ${totalSessions} session${totalSessions === 1 ? "" : "s"}` : ""
          }</span>
        </div>
      </header>
      ${
        lifts.length
          ? `<div class="info-strip-prs">${liftCards}</div>`
          : `<p class="info-strip-empty">Log a workout via text to see your PRs and weekly volume here.</p>`
      }
    </article>
  `;
}

/**
 * Water strip: today's intake vs target, 7-day total, longest hydration
 * streak (if we have it). Reads from chartData.water (oz).
 */
function renderWaterStrip(availableMap) {
  const m = availableMap.get("water");
  if (!m) return "";
  const points = state.data.chartData?.water || [];
  if (!points.length) return "";

  const today = todayIso();
  const todayValue = points.find((p) => p.date === today)?.value || 0;
  const target = state.data.targets?.water;
  const pct = target ? Math.min(100, Math.round((todayValue / target) * 100)) : null;

  const sevenDayPoints = points.filter((p) => {
    const d = new Date(p.date);
    if (Number.isNaN(d.getTime())) return false;
    const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  });
  const weekTotal = sevenDayPoints.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const daysMet = target
    ? sevenDayPoints.filter((p) => Number(p.value) >= target).length
    : null;

  return `
    <article class="info-strip strip-water">
      <header class="info-strip-head">
        <span class="info-strip-icon">💧</span>
        <div class="info-strip-headings">
          <span class="info-strip-title">Water</span>
          <span class="info-strip-sub">Today + last 7 days</span>
        </div>
      </header>
      <div class="info-strip-row">
        <div class="info-stat">
          <span class="info-stat-label">Today</span>
          <span class="info-stat-value">${Math.round(todayValue)}<span class="info-stat-unit"> oz</span></span>
        </div>
        ${
          target
            ? `<div class="info-stat">
                <span class="info-stat-label">Target</span>
                <span class="info-stat-value editable-target" data-target-edit="waterGoal" data-target-unit="oz" tabindex="0" role="button" aria-label="Edit water target">${Math.round(target)}<span class="info-stat-unit"> oz</span></span>
              </div>`
            : `<div class="info-stat">
                <span class="info-stat-label">Target</span>
                <span class="info-stat-value editable-target macro-target-empty" data-target-edit="waterGoal" data-target-unit="oz" tabindex="0" role="button">+ Set target</span>
              </div>`
        }
        <div class="info-stat">
          <span class="info-stat-label">7-day total</span>
          <span class="info-stat-value">${Math.round(weekTotal)}<span class="info-stat-unit"> oz</span></span>
        </div>
        ${
          daysMet != null
            ? `<div class="info-stat">
                <span class="info-stat-label">Days hit target</span>
                <span class="info-stat-value">${daysMet}<span class="info-stat-unit"> / 7</span></span>
              </div>`
            : ""
        }
      </div>
      ${
        pct != null
          ? `
        <div class="info-strip-bar" style="--strip-color:#4fc3f7">
          <div class="info-strip-bar-fill" style="width:${pct}%"></div>
          <span class="info-strip-bar-label">${pct}% of today's ${Math.round(target)} oz target</span>
        </div>
      `
          : ""
      }
    </article>
  `;
}

/**
 * Render a Cardio strip beneath the spotlight when the user has any cardio
 * activity in the selected range. Pulls from /api/cardio/stats. When there's
 * little to no activity we still surface a small "Log a run" CTA so the
 * section discovers itself.
 */
function renderCardioStrip() {
  const c = state.cardio;
  if (!c) return "";
  const summary = c.summary || {};
  const sessions = Number(summary.totalSessions || 0);
  if (sessions === 0) return ""; // No cardio yet → hide section entirely

  // Detect the dominant category to colour-code the headline.
  const cats = Array.isArray(c.byCategory) ? c.byCategory : [];
  const top = cats.slice().sort((a, b) => (b.sessions || 0) - (a.sessions || 0))[0];
  const goals = c.goals || {};
  const milesPct = goals.weeklyMiles
    ? Math.min(100, Math.round((Number(summary.totalMiles || 0) / Number(goals.weeklyMiles)) * 100))
    : null;
  const sessionsPct = goals.weeklySessions
    ? Math.min(100, Math.round((sessions / Number(goals.weeklySessions)) * 100))
    : null;
  const caloriesPct = goals.weeklyCalories
    ? Math.min(100, Math.round((Number(summary.totalCalories || 0) / Number(goals.weeklyCalories)) * 100))
    : null;

  const headline = top
    ? `${escapeHtml(CATEGORY_DISPLAY[top.category] || top.category)} focus`
    : "Cardio this period";

  const recent = (c.recentWorkouts || []).slice(0, 4);

  return `
    <section class="cardio-strip" aria-label="Cardio summary">
      <header class="cardio-strip-head">
        <div>
          <span class="spotlight-label">${escapeHtml(headline)}</span>
          <span class="spotlight-sub">${escapeHtml(state.range.toUpperCase())} · ${sessions} session${sessions === 1 ? "" : "s"}</span>
        </div>
        <div class="cardio-totals">
          <div class="cardio-total">
            <span class="cardio-total-value">${formatMiles(summary.totalMiles)}</span>
            <span class="cardio-total-label">mi total</span>
          </div>
          <div class="cardio-total">
            <span class="cardio-total-value">${Math.round(summary.totalCalories || 0).toLocaleString()}</span>
            <span class="cardio-total-label">kcal burned</span>
          </div>
          <div class="cardio-total">
            <span class="cardio-total-value">${escapeHtml(summary.totalTime || "0:00")}</span>
            <span class="cardio-total-label">total time</span>
          </div>
        </div>
      </header>

      ${
        milesPct != null || sessionsPct != null || caloriesPct != null
          ? `
        <div class="cardio-goal-bars">
          ${milesPct != null ? renderCardioGoalBar("Miles", summary.totalMiles, goals.weeklyMiles, "mi", milesPct, "#38ffd3") : ""}
          ${sessionsPct != null ? renderCardioGoalBar("Sessions", sessions, goals.weeklySessions, "", sessionsPct, "#64b5f6") : ""}
          ${caloriesPct != null ? renderCardioGoalBar("Calories", summary.totalCalories, goals.weeklyCalories, "kcal", caloriesPct, "#ff8a65") : ""}
        </div>
      `
          : ""
      }

      ${
        cats.length > 0
          ? `
        <div class="cardio-categories">
          ${cats
            .map(
              (cat) => `
            <div class="cardio-category" data-cat="${escapeAttr(cat.category)}">
              <span class="cardio-cat-emoji" aria-hidden="true">${escapeHtml(CATEGORY_EMOJI[cat.category] || "🏃")}</span>
              <div class="cardio-cat-info">
                <span class="cardio-cat-name">${escapeHtml(CATEGORY_DISPLAY[cat.category] || cat.category)}</span>
                <span class="cardio-cat-stats">${cat.sessions} · ${formatMiles(cat.totalMiles)} mi · ${Math.round(cat.totalCalories || 0)} kcal</span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `
          : ""
      }

      ${
        recent.length > 0
          ? `
        <div class="cardio-recent">
          <span class="cardio-recent-label">Recent</span>
          ${recent
            .map(
              (w) => `
            <div class="cardio-recent-row">
              <span class="cardio-recent-emoji">${escapeHtml(CATEGORY_EMOJI[w.category] || "🏃")}</span>
              <span class="cardio-recent-name">${escapeHtml(w.exercise || w.category || "Cardio")}</span>
              <span class="cardio-recent-sub">${escapeHtml(formatShortDate(w.date))} · ${formatMiles(w.distance?.miles)} mi${w.calories ? ` · ${Math.round(w.calories)} kcal` : ""}</span>
            </div>
          `
            )
            .join("")}
        </div>
      `
          : ""
      }
    </section>
  `;
}

function renderCardioGoalBar(label, value, target, unit, pct, color) {
  const u = unit ? ` ${unit}` : "";
  return `
    <div class="cardio-goal-bar" style="--cardio-color:${color}">
      <div class="cardio-goal-head">
        <span>${escapeHtml(label)}</span>
        <span class="cardio-goal-value">${formatMiles(value)}${u} <span class="cardio-goal-target">/ ${formatMiles(target)}${u}</span></span>
      </div>
      <div class="cardio-bar"><div class="cardio-bar-fill" style="width:${pct}%"></div></div>
    </div>
  `;
}

const CATEGORY_DISPLAY = {
  run: "Running",
  walk: "Walking",
  treadmill: "Treadmill",
  cycling: "Cycling",
  rowing: "Rowing",
  elliptical: "Elliptical",
  stairmaster: "Stairmaster",
  swimming: "Swimming",
  hiit: "HIIT",
  jump_rope: "Jump rope",
};

const CATEGORY_EMOJI = {
  run: "🏃",
  walk: "🚶",
  treadmill: "🏃‍♂️",
  cycling: "🚴",
  rowing: "🚣",
  elliptical: "🏋️",
  stairmaster: "🪜",
  swimming: "🏊",
  hiit: "🔥",
  jump_rope: "🪢",
};

function formatMiles(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  if (n >= 100) return Math.round(n).toLocaleString();
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2).replace(/\.?0+$/, "");
}

// Maintenance-calorie row that hangs under the calories ring. Shows the
// estimated daily calories needed to maintain weight, a confidence badge,
// and a tooltip explaining how the number was computed. Hidden entirely
// when the backend hasn't supplied a value.
function renderMaintenanceRow(maintenance, todayCals) {
  if (!maintenance || !Number.isFinite(maintenance.value)) {
    // Fall back to a "Set your maintenance" affordance so users know the
    // tile will light up once their profile is complete.
    return `
      <div class="spotlight-maint spotlight-maint-empty">
        <span class="spotlight-maint-label">Maintenance</span>
        <a class="spotlight-maint-link" href="/dashboard?view=stats#nutrition">Complete your profile to see this →</a>
      </div>
    `;
  }
  const confidenceClass = maintenance.confidence ? `is-${maintenance.confidence}` : "";
  const delta = todayCals != null ? Math.round(todayCals - maintenance.value) : null;
  const deltaLabel =
    delta == null
      ? ""
      : delta === 0
      ? "right at maintenance"
      : delta > 0
      ? `+${delta.toLocaleString()} above today`
      : `${delta.toLocaleString()} below today`;
  return `
    <div class="spotlight-maint ${confidenceClass}" role="group" aria-label="Maintenance calories">
      <div class="spotlight-maint-head">
        <span class="spotlight-maint-label">Maintenance</span>
        ${
          maintenance.confidence
            ? `<span class="spotlight-maint-conf">${escapeHtml(maintenance.confidence)} confidence</span>`
            : ""
        }
      </div>
      <div class="spotlight-maint-value">
        ${Math.round(maintenance.value).toLocaleString()}<span class="spotlight-maint-unit">kcal/day</span>
      </div>
      ${deltaLabel ? `<div class="spotlight-maint-delta">${escapeHtml(deltaLabel)}</div>` : ""}
      ${
        maintenance.explanation
          ? `<button type="button" class="spotlight-maint-why" data-why="${escapeAttr(maintenance.explanation)}" aria-label="How is this computed?">Why?</button>`
          : ""
      }
    </div>
  `;
}

function renderRing(pct, units) {
  const safe = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (safe / 100) * circ;
  return `
    <svg class="spotlight-ring" viewBox="0 0 88 88" aria-hidden="true">
      <circle cx="44" cy="44" r="${radius}" class="ring-track" />
      <circle cx="44" cy="44" r="${radius}" class="ring-fill" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" />
      <text x="44" y="46" class="ring-pct" text-anchor="middle">${pct == null ? "—" : `${safe}%`}</text>
    </svg>
  `;
}

function numberOr(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ============================================
// Body Measurements panel hydration
// ============================================
//
// Fills the static measurement cards in dashboard.html using the same
// /api/chart/data response that drives the charts. Each card gets:
//   - the latest value (e.g. "15.5 in")
//   - a "last May 19 · 12 entries" footnote
//   - an inline-editable "goal: 16 in" / "+ Set goal" pill that PATCHes
//     /api/account/profile?contact=<u>  { "<field>Goal": <value> }
//
// Run whenever new chart data lands so manual edits + new logs propagate
// without a page reload.
const GOAL_FIELDS_BY_MEASUREMENT = {
  weight: "weightGoal",
  height: "heightGoal",
  bodyFat: "bodyFatGoal",
  bicepL: "bicepLGoal",
  bicepR: "bicepRGoal",
  forearmL: "forearmLGoal",
  forearmR: "forearmRGoal",
  chest: "chestGoal",
  shoulders: "shouldersGoal",
  neck: "neckGoal",
  lats: "latsGoal",
  traps: "trapsGoal",
  serratusAnterior: "serratusAnteriorGoal",
  waist: "waistGoal",
  abs: "absGoal",
  obliques: "obliquesGoal",
  quadL: "quadLGoal",
  quadR: "quadRGoal",
  calfL: "calfLGoal",
  calfR: "calfRGoal",
  glutes: "glutesGoal",
};

function hydrateBodyMeasuresFromChartData(data) {
  if (!data) return;
  const metrics = Array.isArray(data.metrics) ? data.metrics : [];
  const targets = data.targets || data.goals || {};

  // Build a lookup by metric key so we can find each measurement's stats fast.
  const metricByKey = new Map(metrics.map((m) => [m.key, m]));

  // Walk every measurement card in the DOM. Each card has been tagged with a
  // data-field by the inline-edit wiring. We use that as the canonical key.
  document.querySelectorAll(".measurement-card .measurement-value[data-field]").forEach((valueEl) => {
    const field = valueEl.dataset.field;
    if (!field) return;
    const card = valueEl.closest(".measurement-card");
    if (!card) return;

    const m = metricByKey.get(field);
    const stats = m?.stats || {};
    const unit = valueEl.dataset.unit || m?.unit || "";

    // Last value
    const lastValue =
      stats.last && typeof stats.last === "object" ? stats.last.value : stats.last;
    if (lastValue !== undefined && lastValue !== null && lastValue !== "") {
      // Don't fight inline-edit: only update DOM when there's no active editor.
      if (!valueEl.querySelector("input")) {
        valueEl.innerHTML = `<span class="value">${escapeHtml(formatMeasurement(lastValue))}</span><span class="unit">${escapeHtml(unit || "")}</span>`;
      }
    }

    // Meta row (last entry date + count)
    const lastDate = stats.last && typeof stats.last === "object" ? stats.last.date : null;
    const count = Number(stats.count || 0);
    let metaEl = card.querySelector(".measurement-meta");
    if (!metaEl) {
      metaEl = document.createElement("div");
      metaEl.className = "measurement-meta";
      card.appendChild(metaEl);
    }
    const lastPart = lastDate ? `last ${formatShortDate(lastDate)}` : "no entries yet";
    const countPart = count > 0 ? `${count} ${count === 1 ? "entry" : "entries"}` : "";
    metaEl.textContent = [lastPart, countPart].filter(Boolean).join(" · ");

    // Goal row
    const goalField = GOAL_FIELDS_BY_MEASUREMENT[field];
    if (goalField) {
      const target = numberOr(targets[field], null);
      let goalEl = card.querySelector(".measurement-goal");
      if (!goalEl) {
        goalEl = document.createElement("div");
        goalEl.className = "measurement-goal";
        card.appendChild(goalEl);
      }
      goalEl.innerHTML = target
        ? `goal: <span class="editable-target measurement-goal-value" data-target-edit="${goalField}" data-target-unit="${escapeAttr(unit || "")}" tabindex="0" role="button" aria-label="Edit ${escapeAttr(field)} goal">${formatMeasurement(target)}${escapeHtml(unit || "")}</span>`
        : `<span class="editable-target measurement-goal-set" data-target-edit="${goalField}" data-target-unit="${escapeAttr(unit || "")}" tabindex="0" role="button" aria-label="Set ${escapeAttr(field)} goal">+ Set goal</span>`;
    }
  });

  // Re-bind editor handlers (covers both the spotlight cards we already had
  // and the new measurement-goal targets we just inserted).
  bindSpotlightEditors();
}

function formatMeasurement(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? "—");
  // Show up to 1 decimal but drop trailing zero (e.g. 15 / 15.5).
  return n % 1 === 0 ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

function formatShortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Default quick-look charts (weight, calories, protein, water). Renders a 2×2
// grid on desktop, single column on mobile.
function renderQuickCharts(availableMap) {
  const items = QUICK_METRICS.filter((k) => availableMap.has(k));
  if (!items.length) return "";

  return `
    <section class="grafana-panel quick-charts-panel">
      <header class="panel-header">
        <h3>Quick view</h3>
        <p class="panel-sub">Your most important metrics over ${escapeHtml(state.range.toUpperCase())}.</p>
      </header>
      <div class="quick-charts-grid">
        ${items
          .map((key, i) => {
            const m = availableMap.get(key);
            const color = colorFor(key, state.data.metrics.findIndex((x) => x.key === key));
            const safe = escapeAttr(key);
            return `
            <article class="metric-card" data-metric="${safe}" style="--metric-color:${color}">
              <header class="metric-card-head">
                <span class="metric-dot"></span>
                <span class="metric-card-label">${escapeHtml(m.label)}</span>
                <span class="metric-card-unit">${escapeHtml(m.unit || "")}</span>
                <span class="metric-card-last">${formatNum(m.stats?.last?.value)}</span>
              </header>
              <div class="chart-wrapper">
                <canvas id="quick-${safe}" class="grafana-canvas" data-h="170"></canvas>
                <div class="chart-tooltip" id="quick-tooltip-${safe}" hidden></div>
              </div>
              ${renderStatsTable([m], { mode: "single" })}
            </article>`;
          })
          .join("")}
      </div>
    </section>
  `;
}

// ============================================
// FOCUSED SUB-VIEWS (Workouts / Nutrition / Water)
// ============================================
//
// Each renders an isolated view of one data domain so users can drill into
// just that area. Shared toolbar + sub-tab nav stay above (rendered by the
// shell), and these renderers replace the "All" body content.

function renderWorkoutsView(availableMap, metricsByCategory) {
  const STRENGTH_KEYS = ["bench", "squat", "deadlift", "overheadPress", "ohp", "row", "pullup", "pushup"];
  const metrics = state.data.metrics || [];
  const strengthMetrics = metrics.filter(
    (m) =>
      m.available !== false &&
      m.stats &&
      (m.category === "strength" || STRENGTH_KEYS.includes(m.key)),
  );

  const cardio = state.cardio;
  const cardioSummary = cardio?.summary || null;
  const totals = computeWorkoutTotals(state.data, cardio);

  return `
    <section class="subview subview-workouts" aria-label="Workouts overview">
      <header class="subview-head">
        <h2 class="subview-title">Workouts</h2>
        <p class="subview-sub">${escapeHtml(state.range.toUpperCase())} · ${strengthMetrics.length} lift${strengthMetrics.length === 1 ? "" : "s"} tracked</p>
      </header>

      <div class="subview-kpis">
        ${renderKpi("Unique workouts (week)", totals.uniqueWorkoutsWeek, "")}
        ${renderKpi("Total workouts", totals.totalWorkouts, "")}
        ${renderKpi("Total reps", totals.totalReps?.toLocaleString(), "")}
        ${renderKpi("Total sets", totals.totalSets?.toLocaleString(), "")}
        ${renderKpi("Aggregate volume", totals.aggregateVolume?.toLocaleString(), "lb")}
        ${renderKpi("Cardio sessions", cardioSummary?.totalSessions ?? "—", "")}
      </div>

      ${cardioSummary ? renderCardioStrip() : ""}

      <article class="grafana-panel">
        <header class="panel-header">
          <h3>Top lifts</h3>
          <p class="panel-sub">Latest, all-time PR, and Δ over the range. Gold = current value is the PR.</p>
        </header>
        ${
          strengthMetrics.length
            ? `<table class="legend-table legend-table-wide">
                <thead><tr>
                  <th>Lift</th>
                  <th>Last</th>
                  <th>PR</th>
                  <th>Δ range</th>
                  <th>Entries</th>
                </tr></thead>
                <tbody>${strengthMetrics.map(renderLiftRow).join("")}</tbody>
              </table>`
            : `<p class="grafana-empty">No strength workouts logged yet — text "bench press 4x8 at 225" to log one.</p>`
        }
      </article>

      ${renderQuickChartsFor(strengthMetrics.map((m) => m.key))}
    </section>
  `;
}

function renderNutritionView(availableMap, metricsByCategory) {
  const nutritionKeys = ["calories", "protein", "carbs", "fats", "sugars", "sodium", "cholesterol", "fiber", "caffeine", "creatine"];
  const present = nutritionKeys.filter((k) => availableMap.has(k));
  const today = todayIso();
  const value = (key) =>
    Number((state.data.chartData?.[key] || []).find((p) => p.date === today)?.value) || 0;
  const target = (key) => Number(state.data.targets?.[key]) || 0;

  return `
    <section class="subview subview-nutrition" aria-label="Nutrition overview">
      <header class="subview-head">
        <h2 class="subview-title">Nutrition</h2>
        <p class="subview-sub">Today · ${escapeHtml(state.range.toUpperCase())} totals + breakdown</p>
      </header>

      <div class="subview-kpis">
        ${renderKpi("Today — calories", Math.round(value("calories")).toLocaleString(), "kcal")}
        ${renderKpi("Today — protein", Math.round(value("protein")), "g")}
        ${renderKpi("Today — carbs", Math.round(value("carbs")), "g")}
        ${renderKpi("Today — fats", Math.round(value("fats")), "g")}
        ${target("calories") ? renderKpi("Calorie target", Math.round(target("calories")).toLocaleString(), "kcal") : ""}
        ${renderKpi("Tracked metrics", present.length, "")}
      </div>

      ${renderCaloriesStrip(availableMap)}
      ${renderQuickChartsFor(present)}
    </section>
  `;
}

function renderWaterView(availableMap, metricsByCategory) {
  const points = state.data.chartData?.water || [];
  const today = todayIso();
  const todayValue = Number(points.find((p) => p.date === today)?.value) || 0;
  const target = Number(state.data.targets?.water) || 0;

  const sevenDayPoints = points.filter((p) => {
    const d = new Date(p.date);
    if (Number.isNaN(d.getTime())) return false;
    const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  });
  const weekTotal = sevenDayPoints.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const daysMet = target
    ? sevenDayPoints.filter((p) => Number(p.value) >= target).length
    : null;
  const avg = sevenDayPoints.length ? weekTotal / sevenDayPoints.length : 0;

  return `
    <section class="subview subview-water" aria-label="Water overview">
      <header class="subview-head">
        <h2 class="subview-title">Water</h2>
        <p class="subview-sub">Hydration · ${escapeHtml(state.range.toUpperCase())}</p>
      </header>

      <div class="subview-kpis">
        ${renderKpi("Today", Math.round(todayValue), "oz")}
        ${target ? renderKpi("Target", Math.round(target), "oz") : ""}
        ${renderKpi("7-day total", Math.round(weekTotal), "oz")}
        ${renderKpi("7-day avg", Math.round(avg), "oz/day")}
        ${daysMet != null ? renderKpi("Days hit target", `${daysMet} / 7`, "") : ""}
      </div>

      ${renderWaterStrip(availableMap)}
      ${renderQuickChartsFor(["water"])}
    </section>
  `;
}

// Re-usable KPI tile renderer (shared by all sub-views).
function renderKpi(label, value, unit) {
  if (value === undefined || value === null || value === "") return "";
  return `
    <div class="subview-kpi">
      <span class="subview-kpi-label">${escapeHtml(label)}</span>
      <span class="subview-kpi-value">${escapeHtml(String(value))}${unit ? `<span class="subview-kpi-unit">${escapeHtml(unit)}</span>` : ""}</span>
    </div>
  `;
}

// Reuse the existing quick-card markup, but for an arbitrary set of metric keys.
function renderQuickChartsFor(keys) {
  if (!Array.isArray(keys) || !keys.length || !state.data) return "";
  const dedup = Array.from(new Set(keys));
  const cards = dedup
    .map((key) => {
      const m = (state.data.metrics || []).find((x) => x.key === key);
      if (!m || m.available === false) return "";
      const points = state.data.chartData?.[key] || [];
      if (!points.length) return "";
      const i = (state.data.metrics || []).findIndex((x) => x.key === key);
      const color = colorFor(key, i >= 0 ? i : 0);
      const safe = escapeAttr(key);
      return `
        <article class="metric-card" data-metric="${safe}" style="--metric-color:${color}">
          <header class="metric-card-head">
            <span class="metric-dot"></span>
            <span class="metric-card-label">${escapeHtml(m.label || key)}</span>
            <span class="metric-card-unit">${escapeHtml(m.unit || "")}</span>
            <span class="metric-card-last">${formatNum(m.stats?.last?.value)}</span>
          </header>
          <div class="chart-wrapper">
            <canvas id="quick-${safe}" class="grafana-canvas" data-h="170"></canvas>
            <div class="chart-tooltip" id="quick-tooltip-${safe}" hidden></div>
          </div>
          ${renderStatsTable([m], { mode: "single" })}
        </article>`;
    })
    .filter(Boolean)
    .join("");
  if (!cards) return "";
  return `
    <section class="grafana-panel">
      <header class="panel-header">
        <h3>Charts</h3>
        <p class="panel-sub">One line per metric over ${escapeHtml(state.range.toUpperCase())}.</p>
      </header>
      <div class="quick-charts-grid">${cards}</div>
    </section>
  `;
}

function renderLiftRow(m) {
  const stats = m.stats || {};
  const unit = m.unit || "lb";
  const last = stats.last && typeof stats.last === "object" ? stats.last.value : stats.last;
  const max = stats.max;
  const delta = stats.delta;
  const isPR =
    Number.isFinite(Number(last)) &&
    Number.isFinite(Number(max)) &&
    Math.abs(Number(last) - Number(max)) < 0.001;
  return `
    <tr class="${isPR ? "is-pr" : ""}">
      <td>${escapeHtml(m.label || m.key)}</td>
      <td class="num">${formatNum(last)}${last != null ? ` ${escapeHtml(unit)}${isPR ? " 🏆" : ""}` : ""}</td>
      <td class="num">${formatNum(max)}${max != null ? ` ${escapeHtml(unit)}` : ""}</td>
      <td class="num ${delta > 0 ? "delta-pos" : delta < 0 ? "delta-neg" : ""}">${formatDelta(delta, unit)}</td>
      <td class="num">${stats.count ?? "—"}</td>
    </tr>
  `;
}

// Aggregate workout totals across whatever the backend exposes:
// - `metrics[]` strength lifts: count entries + sum reps × sets × weight
// - cardio.summary: session count + miles
// - `chartData.workouts[]`: daily session counter if available
function computeWorkoutTotals(data, cardio) {
  const metrics = data.metrics || [];
  const STRENGTH_KEYS = ["bench", "squat", "deadlift", "overheadPress", "ohp", "row", "pullup", "pushup"];
  const strengthMetrics = metrics.filter(
    (m) => m.category === "strength" || STRENGTH_KEYS.includes(m.key),
  );

  // Total reps / sets / volume from per-day datapoint metadata when available.
  // Frontend tolerates two shapes:
  //   A) per-point fields: { date, value, reps, sets, volume }
  //   B) backend-aggregated: data.workoutSummary = { totalReps, totalSets, totalVolume, totalWorkouts }
  let totalReps = Number(data.workoutSummary?.totalReps) || 0;
  let totalSets = Number(data.workoutSummary?.totalSets) || 0;
  let aggregateVolume = Number(data.workoutSummary?.totalVolume) || 0;
  let totalWorkouts = Number(data.workoutSummary?.totalWorkouts) || 0;
  let uniqueWorkoutsWeek = Number(data.workoutSummary?.uniqueWorkoutsWeek) || 0;

  // Derive from per-point reps/sets/value when present + nothing pre-aggregated.
  const cutoff = Date.now() - 7 * 86400000;
  const seenDates = new Set();
  for (const m of strengthMetrics) {
    const pts = data.chartData?.[m.key] || [];
    for (const p of pts) {
      if (Number.isFinite(p.reps) && Number.isFinite(p.sets)) {
        if (!data.workoutSummary?.totalReps) totalReps += p.reps * p.sets;
        if (!data.workoutSummary?.totalSets) totalSets += p.sets;
        if (Number.isFinite(p.value)) {
          if (!data.workoutSummary?.totalVolume)
            aggregateVolume += p.value * p.reps * p.sets;
        }
      }
      if (!data.workoutSummary?.totalWorkouts) totalWorkouts += 1;
      const ts = new Date(p.date).getTime();
      if (Number.isFinite(ts) && ts >= cutoff) seenDates.add(p.date);
    }
  }
  if (!data.workoutSummary?.uniqueWorkoutsWeek) uniqueWorkoutsWeek = seenDates.size;

  // Cardio sessions also count as "workouts done" for the unique-week metric.
  if (cardio?.summary?.totalSessions && !data.workoutSummary?.totalWorkouts) {
    totalWorkouts += Number(cardio.summary.totalSessions);
  }

  return {
    uniqueWorkoutsWeek,
    totalWorkouts,
    totalReps,
    totalSets,
    aggregateVolume: Math.round(aggregateVolume),
  };
}

function renderAggregatePanel(availableMap) {
  // Compact selected-as-pills view. The full per-category checkbox tree only
  // expands when the user clicks "Add metric".
  const overlay = new Set(state.overlay);
  const groups = groupAvailableByCategory(state.data.metricsByCategory, availableMap);
  const selectedPills = state.overlay
    .map((key) => {
      const m = availableMap.get(key);
      if (!m) return "";
      const i = state.data.metrics.findIndex((x) => x.key === key);
      const color = colorFor(key, i);
      return `
        <span class="overlay-pill" style="--metric-color:${color}">
          <span class="overlay-swatch"></span>
          ${escapeHtml(m.label)}
          <button type="button" class="overlay-pill-remove" data-remove="${escapeAttr(key)}" aria-label="Remove ${escapeHtml(m.label)}">×</button>
        </span>`;
    })
    .join("");

  const checkboxes = groups
    .map(
      ({ category, label, metrics }) => `
      <fieldset class="overlay-group">
        <legend>${escapeHtml(label)}</legend>
        <div class="overlay-checkboxes">
          ${metrics
            .map((m, i) => {
              const color = colorFor(m.key, i);
              return `
              <label class="overlay-check" style="--metric-color:${color}">
                <input type="checkbox" name="overlay" value="${escapeAttr(m.key)}" ${overlay.has(m.key) ? "checked" : ""}>
                <span class="overlay-swatch"></span>
                <span class="overlay-name">${escapeHtml(m.label)}</span>
              </label>`;
            })
            .join("")}
        </div>
      </fieldset>`
    )
    .join("");

  return `
    <section class="grafana-panel" id="aggregatePanel">
      <header class="panel-header">
        <h3>Overlay chart</h3>
        <p class="panel-sub">Compare multiple metrics on the same axes.</p>
      </header>

      <div class="overlay-pills">
        ${selectedPills}
        <button type="button" class="overlay-add" id="overlayAddBtn" aria-expanded="false">+ Add metric</button>
      </div>
      <div class="overlay-controls" id="overlayControls" hidden>${checkboxes}</div>

      <div class="chart-wrapper">
        <canvas id="aggregateCanvas" class="grafana-canvas"></canvas>
        <div class="chart-tooltip" id="aggregateTooltip" hidden></div>
      </div>

      ${renderStatsTable(state.overlay.map((k) => availableMap.get(k)).filter(Boolean), { mode: "overlay" })}
    </section>
  `;
}

function renderSymmetryPanels(availableMap) {
  const present = SYMMETRY_PAIRS.filter((p) => availableMap.has(p.left) && availableMap.has(p.right));
  if (!present.length) return "";

  return `
    <section class="grafana-panel">
      <header class="panel-header">
        <h3>Symmetry Tracking</h3>
        <p class="panel-sub">Left vs Right comparison for matched body parts.</p>
      </header>
      <div class="symmetry-grid">
        ${present
          .map((p) => {
            const safe = escapeAttr(`${p.left}_${p.right}`);
            return `
            <div class="symmetry-card" data-pair="${safe}">
              <h4>${escapeHtml(p.label)} — Left vs Right</h4>
              <div class="chart-wrapper">
                <canvas id="sym-${safe}" class="grafana-canvas" data-h="200"></canvas>
                <div class="chart-tooltip" id="sym-tooltip-${safe}" hidden></div>
              </div>
              ${renderStatsTable(
                [
                  { ...availableMap.get(p.left), label: `${p.label} (L)` },
                  { ...availableMap.get(p.right), label: `${p.label} (R)` },
                ],
                { mode: "symmetry" }
              )}
            </div>`;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderCategoryPanels(metricsByCategory, availableMap) {
  return CATEGORY_ORDER.filter((cat) => {
    const items = (metricsByCategory?.[cat] || []).filter((m) => availableMap.has(m.key));
    return items.length > 0;
  })
    .map((cat) => {
      const items = (metricsByCategory[cat] || []).filter((m) => availableMap.has(m.key));
      const idSafe = escapeAttr(cat);
      return `
      <section class="grafana-panel" data-category="${idSafe}">
        <header class="panel-header">
          <h3>${escapeHtml(CATEGORY_LABELS[cat] || cat)}</h3>
          <p class="panel-sub">${items.length} metric${items.length === 1 ? "" : "s"} · ${escapeHtml(state.range.toUpperCase())}</p>
        </header>
        <div class="metric-grid">
          ${items
            .map((m, i) => {
              const color = colorFor(m.key, i);
              const safe = escapeAttr(m.key);
              return `
              <article class="metric-card" data-metric="${safe}" style="--metric-color:${color}">
                <header class="metric-card-head">
                  <span class="metric-dot"></span>
                  <span class="metric-card-label">${escapeHtml(m.label)}</span>
                  <span class="metric-card-unit">${escapeHtml(m.unit || "")}</span>
                </header>
                <div class="chart-wrapper">
                  <canvas id="chart-${safe}" class="grafana-canvas" data-h="160"></canvas>
                  <div class="chart-tooltip" id="tooltip-${safe}" hidden></div>
                </div>
                ${renderStatsTable([m], { mode: "single" })}
              </article>`;
            })
            .join("")}
        </div>
      </section>`;
    })
    .join("");
}

function renderStatsTable(metricInfos, { mode } = {}) {
  if (!metricInfos.length) return "";
  const rows = metricInfos
    .map((m, i) => {
      const color = colorFor(m.key, i);
      const s = m.stats || {};
      const unit = m.unit ? ` ${m.unit}` : "";
      const last = s.last && typeof s.last === "object" ? s.last.value : s.last;
      return `
      <tr>
        <td><span class="legend-dot" style="background:${color}"></span>${escapeHtml(m.label)}</td>
        <td>${formatNum(s.avg)}${unit}</td>
        <td>${formatNum(s.min)}${unit}</td>
        <td>${formatNum(s.max)}${unit}</td>
        <td>${formatNum(last)}${unit}</td>
        <td class="${s.delta > 0 ? "delta-pos" : s.delta < 0 ? "delta-neg" : ""}">${formatDelta(s.delta, m.unit)}</td>
      </tr>`;
    })
    .join("");

  return `
    <table class="legend-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Mean</th>
          <th>Min</th>
          <th>Max</th>
          <th>Last</th>
          <th>Δ</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function bindOverlayCheckboxes(availableMap) {
  const root = rootEl?.querySelector("#aggregatePanel");
  if (!root) return;

  // Expand/collapse the full category checkbox grid.
  const addBtn = root.querySelector("#overlayAddBtn");
  const controls = root.querySelector("#overlayControls");
  if (addBtn && controls) {
    addBtn.addEventListener("click", () => {
      const open = !controls.hidden;
      controls.hidden = open;
      addBtn.setAttribute("aria-expanded", String(!open));
      addBtn.textContent = open ? "+ Add metric" : "− Hide options";
    });
  }

  // Pill close buttons.
  root.querySelectorAll(".overlay-pill-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.remove;
      state.overlay = state.overlay.filter((k) => k !== key);
      refreshAggregate(availableMap);
    });
  });

  // Category checkbox toggles.
  root.querySelectorAll('input[name="overlay"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const checked = Array.from(root.querySelectorAll('input[name="overlay"]:checked'));
      state.overlay = checked.map((c) => c.value);
      refreshAggregate(availableMap);
    });
  });
}

function refreshAggregate(availableMap) {
  const root = rootEl?.querySelector("#aggregatePanel");
  if (!root) return;
  root.outerHTML = renderAggregatePanel(availableMap);
  bindOverlayCheckboxes(availableMap);
  drawAggregateChart(availableMap);
  attachChartTooltips(availableMap);
}

function groupAvailableByCategory(metricsByCategory, availableMap) {
  return CATEGORY_ORDER
    .map((cat) => {
      const metrics = (metricsByCategory?.[cat] || []).filter((m) => availableMap.has(m.key));
      return { category: cat, label: CATEGORY_LABELS[cat] || cat, metrics };
    })
    .filter((g) => g.metrics.length > 0);
}

// ---------- canvas drawing ----------

function drawAllCharts(availableMap) {
  drawQuickCharts(availableMap);
  if (state.advancedOpen) {
    drawAggregateChart(availableMap);
    drawSymmetryCharts(availableMap);
    drawIndividualCharts(availableMap);
  }
  attachChartTooltips(availableMap);
}

function drawQuickCharts(availableMap) {
  for (const key of QUICK_METRICS) {
    if (!availableMap.has(key)) continue;
    const canvas = rootEl?.querySelector(`#quick-${cssEscape(key)}`);
    if (!canvas) continue;
    const m = availableMap.get(key);
    const i = state.data.metrics.findIndex((x) => x.key === key);
    const color = colorFor(key, i >= 0 ? i : 0);
    const points = (state.data.chartData[key] || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    drawLineChart(canvas, [{ key, label: m.label, unit: m.unit, color, points }], { height: 170, multi: false });
  }
}

function drawAggregateChart(availableMap) {
  const canvas = rootEl?.querySelector("#aggregateCanvas");
  if (!canvas) return;
  const series = state.overlay
    .map((key, i) => {
      const m = availableMap.get(key);
      if (!m) return null;
      const points = (state.data.chartData[key] || []).slice().sort((a, b) => a.date.localeCompare(b.date));
      return { key, label: m.label, unit: m.unit, color: colorFor(key, i), points };
    })
    .filter(Boolean);
  drawLineChart(canvas, series, { height: 300, multi: true });
}

function drawSymmetryCharts(availableMap) {
  for (const pair of SYMMETRY_PAIRS) {
    if (!availableMap.has(pair.left) || !availableMap.has(pair.right)) continue;
    const safe = `${pair.left}_${pair.right}`;
    const canvas = rootEl?.querySelector(`#sym-${safe}`);
    if (!canvas) continue;
    const series = [
      {
        key: pair.left,
        label: `${pair.label} (L)`,
        unit: pair.unit,
        color: "#64b5f6",
        points: (state.data.chartData[pair.left] || []).slice().sort((a, b) => a.date.localeCompare(b.date)),
      },
      {
        key: pair.right,
        label: `${pair.label} (R)`,
        unit: pair.unit,
        color: "#ef5350",
        points: (state.data.chartData[pair.right] || []).slice().sort((a, b) => a.date.localeCompare(b.date)),
      },
    ];
    drawLineChart(canvas, series, { height: 200, multi: true });
  }
}

function drawIndividualCharts(availableMap) {
  availableMap.forEach((m, key) => {
    const canvas = rootEl?.querySelector(`#chart-${cssEscape(key)}`);
    if (!canvas) return;
    const i = state.data.metrics.findIndex((x) => x.key === key);
    const color = colorFor(key, i >= 0 ? i : 0);
    const points = (state.data.chartData[key] || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const series = [{ key, label: m.label, unit: m.unit, color, points }];
    drawLineChart(canvas, series, { height: 160, multi: false });
  });
}

// Generic chart drawer. `series` = [{ label, unit, color, points: [{date,value}] }].
function drawLineChart(canvas, series, opts = {}) {
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const height = opts.height || parseInt(canvas.dataset.h || "180", 10);
  const width = Math.max(rect.width, 200);

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Background
  ctx.fillStyle = "#0b0e11";
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 16, right: 18, bottom: 32, left: 52 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const nonEmpty = series.filter((s) => s.points && s.points.length);
  if (!nonEmpty.length) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "12px Space Grotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No data for this period", width / 2, height / 2);
    canvas._chart = null;
    return;
  }

  // Build a shared time scale across all series.
  const allDates = new Set();
  nonEmpty.forEach((s) => s.points.forEach((p) => allDates.add(p.date)));
  const dates = Array.from(allDates).sort();
  const dateMin = dates[0];
  const dateMax = dates[dates.length - 1];
  const t0 = new Date(dateMin).getTime();
  const t1 = new Date(dateMax).getTime();
  const tRange = Math.max(t1 - t0, 1);

  const allValues = nonEmpty.flatMap((s) => s.points.map((p) => p.value));
  const valMinRaw = Math.min(...allValues);
  const valMaxRaw = Math.max(...allValues);
  // Pad the y-range a little so the line doesn't touch the edges.
  const valPad = (valMaxRaw - valMinRaw || 1) * 0.08;
  const valMin = valMinRaw - valPad;
  const valMax = valMaxRaw + valPad;
  const valRange = valMax - valMin || 1;

  const xOf = (date) => padding.left + (((new Date(date).getTime() - t0) / tRange) * plotW || 0);
  const yOf = (val) => padding.top + plotH - ((val - valMin) / valRange) * plotH;

  // Horizontal grid (5 lines) with y-axis labels.
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "10px Space Grotesk, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (plotH * i) / 5;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    const v = valMax - (valRange * i) / 5;
    ctx.fillText(formatAxisValue(v), padding.left - 6, y);
  }

  // Vertical dashed grid + date labels
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const xTickCount = Math.min(8, Math.max(2, Math.floor(plotW / 80)));
  for (let i = 0; i <= xTickCount; i++) {
    const x = padding.left + (plotW * i) / xTickCount;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotH);
    ctx.stroke();
    const t = t0 + (tRange * i) / xTickCount;
    ctx.fillText(formatAxisDate(new Date(t)), x, padding.top + plotH + 6);
  }
  ctx.setLineDash([]);

  // Draw each series.
  const renderedSeries = [];
  for (const s of nonEmpty) {
    const points = s.points.map((p) => ({
      x: xOf(p.date),
      y: yOf(p.value),
      date: p.date,
      value: p.value,
    }));

    // Area gradient fill
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
    grad.addColorStop(0, hexAlpha(s.color, 0.32));
    grad.addColorStop(0.7, hexAlpha(s.color, 0.07));
    grad.addColorStop(1, hexAlpha(s.color, 0.0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + plotH);
    drawSmoothPath(ctx, points);
    ctx.lineTo(points[points.length - 1].x, padding.top + plotH);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    drawSmoothPath(ctx, points);
    ctx.stroke();

    // Points (only when there are not too many)
    if (points.length <= 60) {
      ctx.fillStyle = s.color;
      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    renderedSeries.push({ ...s, points });
  }

  // Store the rendered geometry on the canvas for tooltips to use.
  canvas._chart = {
    padding,
    plotW,
    plotH,
    width,
    height,
    series: renderedSeries,
    xOf,
    yOf,
    dateMin,
    dateMax,
  };
}

function drawSmoothPath(ctx, points) {
  if (!points.length) return;
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) return;
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i];
    const next = points[i + 1];
    const midX = (prev.x + next.x) / 2;
    const midY = (prev.y + next.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

// ---------- hover tooltip ----------

function attachChartTooltips(availableMap) {
  rootEl?.querySelectorAll(".grafana-canvas").forEach((canvas) => {
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    const tooltip = wrapper.querySelector(".chart-tooltip");
    let crosshair = wrapper.querySelector(".chart-crosshair");
    if (!crosshair) {
      crosshair = document.createElement("div");
      crosshair.className = "chart-crosshair";
      crosshair.hidden = true;
      wrapper.appendChild(crosshair);
    }
    if (!tooltip) return;
    canvas.addEventListener("pointermove", (ev) => updateTooltip(canvas, tooltip, crosshair, ev));
    canvas.addEventListener("pointerleave", () => {
      tooltip.hidden = true;
      crosshair.hidden = true;
      // Clear focus dots on the canvas
      const chart = canvas._chart;
      if (chart) drawFocusOverlay(canvas, null);
    });
  });
}

function updateTooltip(canvas, tooltip, crosshair, ev) {
  const chart = canvas._chart;
  if (!chart) {
    tooltip.hidden = true;
    crosshair.hidden = true;
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  if (x < chart.padding.left || x > chart.width - chart.padding.right) {
    tooltip.hidden = true;
    crosshair.hidden = true;
    drawFocusOverlay(canvas, null);
    return;
  }

  // Find the nearest x for each series and pick the closest one.
  let closestDate = null;
  let closestX = null;
  let minDx = Infinity;
  for (const s of chart.series) {
    for (const p of s.points) {
      const dx = Math.abs(p.x - x);
      if (dx < minDx) {
        minDx = dx;
        closestDate = p.date;
        closestX = p.x;
      }
    }
  }
  if (!closestDate) {
    tooltip.hidden = true;
    crosshair.hidden = true;
    drawFocusOverlay(canvas, null);
    return;
  }

  const rows = chart.series
    .map((s) => {
      const p = s.points.find((pt) => pt.date === closestDate);
      if (!p) return "";
      const unit = s.unit ? ` ${s.unit}` : "";
      return `<div class="tt-row">
        <span class="tt-dot" style="background:${s.color}"></span>
        <span class="tt-label">${escapeHtml(s.label)}</span>
        <span class="tt-value">${formatNum(p.value)}${escapeHtml(unit)}</span>
      </div>`;
    })
    .filter(Boolean)
    .join("");

  tooltip.innerHTML = `
    <div class="tt-date">${escapeHtml(formatTooltipDate(closestDate))}</div>
    ${rows}
  `;
  tooltip.hidden = false;

  // Vertical crosshair that snaps to the nearest data x.
  crosshair.style.left = `${closestX}px`;
  crosshair.style.top = `${chart.padding.top}px`;
  crosshair.style.height = `${chart.plotH}px`;
  crosshair.hidden = false;

  // Redraw glow rings around each series' point at the focused date.
  drawFocusOverlay(canvas, closestDate);

  // Position tooltip: prefer right of crosshair, flip when near right edge.
  const tooltipWidth = tooltip.offsetWidth || 180;
  const flip = closestX + tooltipWidth + 24 > chart.width;
  tooltip.style.left = `${flip ? closestX - tooltipWidth - 12 : closestX + 12}px`;
  tooltip.style.top = `${Math.max(0, ev.offsetY - 10)}px`;
}

// Redraw the chart and add highlighted dots at the focused date. We don't
// keep a separate "focus" canvas – we simply re-run the line drawing and
// then paint a larger glowing circle on top of every series point at the
// focused x. Fast enough for the small datasets we render.
function drawFocusOverlay(canvas, focusedDate) {
  const chart = canvas._chart;
  if (!chart) return;
  // The full redraw is owned by drawLineChart; here we just paint focus dots
  // on top of the existing pixel buffer.
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // First clear any previous focus dots by re-painting a faint vertical strip
  // matching the background where the previous focus was. Instead of tracking
  // that, the simplest robust approach is to redraw the whole chart, but to
  // avoid flicker we only repaint the focus points.
  if (!focusedDate) {
    // Trigger a clean re-draw on leave to remove halos.
    if (chart._focusedDate) {
      chart._focusedDate = null;
      redrawChartFromChart(canvas);
    }
    return;
  }
  if (chart._focusedDate === focusedDate) return;
  chart._focusedDate = focusedDate;
  redrawChartFromChart(canvas);

  for (const s of chart.series) {
    const p = s.points.find((pt) => pt.date === focusedDate);
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = hexAlpha(s.color, 0.18);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = s.color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#0b0e11";
    ctx.fill();
  }
}

function redrawChartFromChart(canvas) {
  const chart = canvas._chart;
  if (!chart) return;
  drawLineChart(canvas, chart.series.map((s) => ({
    key: s.key, label: s.label, unit: s.unit, color: s.color,
    // The stored points carry x/y, but drawLineChart wants raw date/value.
    points: s.points.map((p) => ({ date: p.date, value: p.value })),
  })), { height: chart.height, multi: chart.series.length > 1 });
}

// ---------- formatting helpers ----------

function formatNum(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (abs >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function formatDelta(v, unit) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const u = unit ? ` ${unit}` : "";
  const sign = v > 0 ? "+" : "";
  return `${sign}${formatNum(v)}${u}`;
}

function formatAxisValue(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  const abs = Math.abs(v);
  if (abs >= 1000) return Math.round(v).toString();
  if (abs >= 100) return v.toFixed(0);
  return v.toFixed(abs < 10 ? 1 : 0);
}

function formatAxisDate(d) {
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

function formatTooltipDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function hexAlpha(hex, alpha) {
  // Accept #rgb / #rrggbb. Round alpha to 2 hex chars.
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s) {
  return escapeHtml(s);
}

function cssEscape(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

export default initDashboardCharts;
