// Dashboard Calendar tab.
//
// Renders the user's training schedule vs. what they actually did:
//   - Month grid (Sun → Sat columns) with per-day status (hit / partial /
//     missed / rest / future). Click a day to see planned vs. actual.
//   - Weekly summary tile ("3/3 committed days hit").
//   - Adherence trend mini-sparkline.
//   - Inline editor for committedWeekdays + per-weekday plan labels.
//
// Backend contract: CALENDAR_BACKEND.txt
//   GET    /api/calendar/schedule
//   PATCH  /api/calendar/schedule
//   GET    /api/calendar/month?month=YYYY-MM
//   GET    /api/calendar/week?weekStart=YYYY-MM-DD
//   GET    /api/calendar/adherence?range=30d
//   POST   /api/calendar/recompute     (after a fresh log)
//
// Every section degrades gracefully when its endpoint isn't ready yet —
// backend reported daily actuals + adherence aren't fully wired so the cells
// will read `logged:false` and adherence will show "No data yet."

const API_BASE = "https://api.thetrackerapp.io";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Local module state — survives across tab visits without leaking into other
// dashboard panels.
const state = {
  rootEl: null,
  schedule: null,
  month: null,           // YYYY-MM currently rendered
  monthData: null,
  weekData: null,
  adherence: null,
  programs: null,        // { presets, bespoke, active } from /api/programs
  showPlanPicker: false, // "Change plan" toggle when a schedule already exists
  loading: false,
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

// The calendar API is contact-keyed (same pattern as every dashboard data
// endpoint): ?contact= from the URL, else the logged-in auth user.
function resolveContact() {
  try {
    const fromQuery = String(new URLSearchParams(window.location.search).get("contact") || "").trim();
    if (fromQuery) return fromQuery;
  } catch { /* fall through */ }
  try {
    const raw = window.localStorage.getItem("tracker.auth.user");
    if (!raw) return "";
    const user = JSON.parse(raw) || {};
    for (const candidate of [user.canonical, user.email, user.username, user.credential, user.maskedCredential]) {
      const normalized = String(candidate || "").trim();
      if (normalized && !/[*]/.test(normalized)) return normalized;
    }
  } catch { /* ignore */ }
  return "";
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const contact = resolveContact();
  const sep = path.includes("?") ? "&" : "?";
  const url = contact ? `${path}${sep}contact=${encodeURIComponent(contact)}` : path;
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (!res.ok) {
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

function escapeAttr(s) {
  return escapeHtml(s).replace(/`/g, "&#96;");
}

// Structured prescription ({name, sets, reps, weight, unit, seconds}) or a
// legacy plain string → short human text. Paced weights (progression) get 🎯.
function describeRx(e) {
  if (!e) return "";
  if (typeof e === "string") return e;
  const name = String(e.name || "").toLowerCase();
  const paced = e.paced ? " 🎯" : "";
  if (e.seconds) return `${e.seconds}s ${name}`.trim();
  if (e.sets && e.reps) return `${e.sets}x${e.reps}${e.weight ? `@${e.weight}${e.unit || "lb"}` : ""} ${name}${paced}`.trim();
  if (e.reps) return `${e.reps} ${name}`.trim();
  return name + paced;
}

// Loose exercise-name matching (PUSHUPS ≡ pushup ≡ push ups) for judging
// which planned lifts were actually logged.
function nameStem(s) {
  const k = String(s || "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  return k.endsWith("S") && k.length > 3 ? k.slice(0, -1) : k;
}
function actualHasExercise(plannedName, actualNames) {
  const p = nameStem(plannedName);
  if (!p) return false;
  return (actualNames || []).some((a) => {
    const s = nameStem(a);
    return s === p || s.includes(p) || p.includes(s);
  });
}

// Copyable command chip (📋 → ✅ flash), used by every manage-by-text spot.
function copyChipHtml(cmd) {
  return `<button type="button" class="cal-copy-chip" data-cmd="${escapeAttr(cmd)}"><code>${escapeHtml(cmd)}</code> <span class="cal-copy-ico">📋</span></button>`;
}

function plannedCellLabel(planned, isCommitted) {
  if (!planned) return isCommitted ? "Scheduled" : "";
  if (planned.label) return planned.label;
  const first = (planned.exercises || [])[0];
  const desc = describeRx(first);
  if (desc) {
    const extra = (planned.exercises || []).length - 1;
    return extra > 0 ? `${desc} +${extra}` : desc;
  }
  return isCommitted ? "Scheduled" : "Scheduled";
}

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayMonth() {
  return todayIso().slice(0, 7);
}

function isoSundayForDate(d) {
  // d is a Date. Returns ISO YYYY-MM-DD for the Sunday that starts that week.
  const copy = new Date(d.getTime());
  copy.setDate(copy.getDate() - copy.getDay());
  const y = copy.getFullYear();
  const m = String(copy.getMonth() + 1).padStart(2, "0");
  const day = String(copy.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftMonth(yyyyMM, delta) {
  const [y, m] = yyyyMM.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(yyyyMM) {
  const [y, m] = yyyyMM.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ============================================================================
// Public entry — wired from dashboard.js when the user clicks the tab.
// ============================================================================

export async function initCalendarTab(container) {
  if (!container) return;
  state.rootEl = container;
  if (!state.month) state.month = todayMonth();
  container.innerHTML = renderShell();
  bindShellEvents();
  // Copy chips — delegated once so it survives every re-render.
  if (!container.__calCopyBound) {
    container.__calCopyBound = true;
    container.addEventListener("click", (e) => {
      const chip = e.target.closest(".cal-copy-chip");
      if (!chip || !chip.dataset.cmd) return;
      try { navigator.clipboard?.writeText(chip.dataset.cmd); } catch { /* ignore */ }
      const ico = chip.querySelector(".cal-copy-ico");
      if (ico) { ico.textContent = "✅"; setTimeout(() => { ico.textContent = "📋"; }, 1300); }
    });
  }
  // Fire all four fetches in parallel; the UI renders each section as it
  // resolves. Failures degrade to inline empty states.
  await refreshAll();
}

async function refreshAll() {
  state.loading = true;
  setLoadingState(true);
  const tasks = [loadSchedule(), loadMonth(state.month), loadWeek(), loadAdherence("30d"), loadPrograms()];
  await Promise.allSettled(tasks);
  state.loading = false;
  setLoadingState(false);
  renderAll();
}

async function loadSchedule() {
  try {
    const r = await apiRequest("/api/calendar/schedule");
    state.schedule = r?.schedule || null;
  } catch (e) {
    console.warn("calendar schedule load failed:", e);
    state.schedule = null;
  }
}

async function loadMonth(yyyyMM) {
  try {
    const r = await apiRequest(`/api/calendar/month?month=${encodeURIComponent(yyyyMM)}`);
    state.monthData = r || null;
  } catch (e) {
    console.warn("calendar month load failed:", e);
    state.monthData = null;
  }
}

async function loadWeek() {
  try {
    const ws = isoSundayForDate(new Date());
    const r = await apiRequest(`/api/calendar/week?weekStart=${encodeURIComponent(ws)}`);
    state.weekData = r || null;
  } catch (e) {
    console.warn("calendar week load failed:", e);
    state.weekData = null;
  }
}

async function loadPrograms() {
  try {
    const r = await apiRequest("/api/programs");
    state.programs = r && r.ok !== false ? r : null;
  } catch (e) {
    console.warn("programs load failed:", e);
    state.programs = null;
  }
}

// POST /api/program — the contact rides in the BODY for this endpoint.
async function programAction(payload) {
  return apiRequest("/api/program", {
    method: "POST",
    body: JSON.stringify({ contact: resolveContact(), ...payload }),
  });
}

async function loadAdherence(range) {
  try {
    const r = await apiRequest(`/api/calendar/adherence?range=${encodeURIComponent(range)}`);
    state.adherence = r || null;
  } catch (e) {
    console.warn("calendar adherence load failed:", e);
    state.adherence = null;
  }
}

function setLoadingState(loading) {
  if (!state.rootEl) return;
  const overlay = state.rootEl.querySelector("#calLoadingOverlay");
  if (overlay) overlay.hidden = !loading;
}

// ============================================================================
// Rendering
// ============================================================================

function renderShell() {
  return `
    <div class="calendar-tab">
      <div class="calendar-summary-row" id="calSummaryRow"></div>

      <section class="calendar-toolbar">
        <div class="calendar-month-nav">
          <button type="button" class="cal-nav-btn" id="calPrevMonth" aria-label="Previous month">‹</button>
          <h3 class="calendar-month-label" id="calMonthLabel">${escapeHtml(formatMonthLabel(state.month))}</h3>
          <button type="button" class="cal-nav-btn" id="calNextMonth" aria-label="Next month">›</button>
          <button type="button" class="cal-today-btn" id="calTodayBtn">Today</button>
        </div>
        <div class="calendar-legend" aria-label="Status legend">
          <span class="cal-legend-dot is-hit"></span><span>Hit</span>
          <span class="cal-legend-dot is-partial"></span><span>Partial</span>
          <span class="cal-legend-dot is-missed"></span><span>Missed</span>
          <span class="cal-legend-dot is-rest"></span><span>Rest</span>
        </div>
      </section>

      <div class="calendar-loading" id="calLoadingOverlay" hidden>Loading…</div>

      <div class="calendar-grid-wrap">
        <div class="calendar-grid" id="calMonthGrid" role="grid" aria-label="Workout calendar"></div>
      </div>

      <div class="calendar-bottom-row">
        <section class="calendar-schedule-card" id="calScheduleCard"></section>
        <section class="calendar-adherence-card" id="calAdherenceCard"></section>
      </div>

      <div class="calendar-day-drawer" id="calDayDrawer" hidden></div>
    </div>
  `;
}

function renderAll() {
  renderSummaryRow();
  renderMonthGrid();
  renderScheduleCard();
  renderAdherenceCard();
}

// ---- Summary row (this-week + adherence% + streak) ----

function renderSummaryRow() {
  const host = state.rootEl?.querySelector("#calSummaryRow");
  if (!host) return;
  const week = state.weekData;
  const summary = state.monthData?.summary || {};
  const adherencePct =
    week?.adherencePct ?? summary.adherencePct ?? state.adherence?.adherencePct ?? null;
  const currentStreak = summary.currentStreak ?? 0;
  const longestStreak = summary.longestStreak ?? 0;

  // "3/7" tile: prefer committedHits/committedDays when the user has named
  // weekdays. Falls back to totalDaysHit/7 for frequency-only plans.
  const committedHits = week?.committedHits ?? null;
  const committedDays = week?.committedDays ?? null;
  const totalDaysHit = week?.totalDaysHit ?? null;
  const hasCommitted = committedDays != null && committedDays > 0;

  const adherenceLabel =
    adherencePct == null ? "—" : `${Math.round(adherencePct * 100)}%`;
  const adherenceTone =
    adherencePct == null
      ? ""
      : adherencePct >= 0.8
      ? "is-good"
      : adherencePct >= 0.5
      ? "is-warn"
      : "is-bad";

  host.innerHTML = `
    <div class="cal-summary-tile cal-summary-adherence ${adherenceTone}">
      <span class="cal-summary-label">Plan followed</span>
      <span class="cal-summary-big">${escapeHtml(adherenceLabel)}</span>
      <span class="cal-summary-sub">${escapeHtml(
        state.adherence?.range ? `Over ${state.adherence.range.toUpperCase()}` : "This week"
      )}</span>
    </div>

    <div class="cal-summary-tile cal-summary-week">
      <span class="cal-summary-label">${hasCommitted ? "Committed days hit" : "Active days this week"}</span>
      <span class="cal-summary-big">${
        hasCommitted
          ? `${committedHits ?? 0}<span class="cal-summary-of">/${committedDays}</span>`
          : `${totalDaysHit ?? 0}<span class="cal-summary-of">/7</span>`
      }</span>
      <span class="cal-summary-sub">${escapeHtml(weekDaysStrip(week))}</span>
    </div>

    <div class="cal-summary-tile cal-summary-streak">
      <span class="cal-summary-label">Streak</span>
      <span class="cal-summary-big">${currentStreak}<span class="cal-summary-of"> 🔥</span></span>
      <span class="cal-summary-sub">${
        longestStreak ? `Best this month: ${longestStreak} days` : "Log a workout to start a streak"
      }</span>
    </div>
  `;
}

// Renders the per-day dot strip ("● · ● · ○ · ·") under the week tile.
function weekDaysStrip(week) {
  if (!week?.perDay?.length) return "M T W T F S S";
  return week.perDay
    .map((d) => {
      const sym =
        d.status === "hit"
          ? "●"
          : d.status === "partial"
          ? "◐"
          : d.status === "missed"
          ? "○"
          : d.logged
          ? "·"
          : d.isCommitted
          ? "○"
          : "·";
      return sym;
    })
    .join(" ");
}

// ---- Month grid ----

function renderMonthGrid() {
  const host = state.rootEl?.querySelector("#calMonthGrid");
  if (!host) return;

  const monthLabel = state.rootEl?.querySelector("#calMonthLabel");
  if (monthLabel) monthLabel.textContent = formatMonthLabel(state.month);

  const [yyyy, mm] = state.month.split("-").map(Number);
  const firstOfMonth = new Date(yyyy, mm - 1, 1);
  const lastOfMonth = new Date(yyyy, mm, 0);
  const lead = firstOfMonth.getDay(); // 0 = Sun
  const totalCells = Math.ceil((lead + lastOfMonth.getDate()) / 7) * 7;

  const daysByDate = new Map();
  (state.monthData?.days || []).forEach((d) => daysByDate.set(d.date, d));
  const todayKey = todayIso();
  const committedSet = new Set(state.schedule?.committedWeekdays || []);

  // Build cells. Empty leading cells for the days of the previous month so the
  // first row aligns to Sunday.
  let html = "";
  // Weekday headers
  html += `<div class="cal-grid-header">`;
  for (let i = 0; i < 7; i++) {
    html += `<div class="cal-grid-dow">${WEEKDAY_NAMES[i]}</div>`;
  }
  html += `</div>`;

  html += `<div class="cal-grid-body">`;
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - lead + 1;
    const inMonth = dayNum >= 1 && dayNum <= lastOfMonth.getDate();
    if (!inMonth) {
      html += `<div class="cal-cell is-empty" aria-hidden="true"></div>`;
      continue;
    }
    const date = new Date(yyyy, mm - 1, dayNum);
    const iso = `${yyyy}-${String(mm).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const dow = date.getDay();
    const backend = daysByDate.get(iso) || {};
    const isCommitted = backend.isCommitted ?? committedSet.has(dow);
    const status = backend.status || inferStatus(backend, isCommitted, iso, todayKey);
    const planned = backend.planned || state.schedule?.weekdayPlan?.[dow] || null;
    const actual = backend.actual || null;
    const isToday = iso === todayKey;
    const isFuture = iso > todayKey;

    const isDateEntry = backend.plannedSource === "date";
    const plannedLabel = plannedCellLabel(planned, isCommitted);
    const actualBadge = actual?.workouts ? `<span class="cal-cell-actual">${actual.workouts}×</span>` : "";

    html += `
      <button type="button"
              class="cal-cell is-${escapeAttr(status)} ${isCommitted ? "is-committed" : ""} ${isToday ? "is-today" : ""} ${isFuture ? "is-future" : ""}"
              data-date="${iso}"
              data-status="${escapeAttr(status)}"
              aria-label="${escapeAttr(`${date.toDateString()} — ${status}${plannedLabel ? `, planned ${plannedLabel}` : ""}${actual?.workouts ? `, ${actual.workouts} workout${actual.workouts === 1 ? "" : "s"} logged` : ""}`)}">
        <span class="cal-cell-day">${dayNum}${isDateEntry ? ' <span class="cal-cell-pin" title="Scheduled for this specific date">📌</span>' : ""}</span>
        ${plannedLabel ? `<span class="cal-cell-plan">${escapeHtml(plannedLabel)}</span>` : ""}
        ${status === "hit" ? '<span class="cal-cell-mark is-hit" title="Followed the schedule">✓</span>'
          : status === "missed" ? '<span class="cal-cell-mark is-missed" title="Scheduled but not logged">✗</span>'
          : status === "partial" ? '<span class="cal-cell-mark is-partial" title="Logged, but not the planned workout">◐</span>'
          : ""}
        ${actualBadge}
        <span class="cal-cell-status-dot" aria-hidden="true"></span>
      </button>
    `;
  }
  html += `</div>`;

  host.innerHTML = html;
  bindGridEvents();
}

function inferStatus(day, isCommitted, iso, todayKey) {
  if (iso > todayKey) return "future";
  if (!isCommitted) return "rest";
  if (day.actual?.logged || day.actual?.workouts) return "hit";
  return "missed";
}

// ---- Schedule card (sidebar editor) ----

function planPickerHtml() {
  const presets = state.programs?.presets || [];
  const bespoke = state.programs?.bespoke || [];
  const activeId = state.programs?.active?.id || null;
  if (!presets.length && !bespoke.length) return "";
  const card = (p, origin) => `
    <div class="cal-plan-card ${p.id === activeId ? "is-active" : ""}">
      <span class="cal-plan-name">${escapeHtml(p.name)}</span>
      <span class="cal-plan-meta">${escapeHtml(p.splitName || origin)}${p.targetDaysPerWeek ? ` · ${p.targetDaysPerWeek} days/wk` : ""}</span>
      <span class="cal-plan-actions">
        ${p.id === activeId
          ? `<span class="cal-plan-active-badge">✓ Active</span>`
          : `<button type="button" class="cal-plan-apply" data-plan-id="${escapeAttr(p.id)}">Use this plan</button>`}
        ${origin === "preset" ? `<button type="button" class="cal-inline-btn cal-plan-customize" data-plan-id="${escapeAttr(p.id)}">Customize</button>` : ""}
      </span>
    </div>`;
  return `
    <div class="cal-plan-grid">
      ${presets.map((p) => card(p, "preset")).join("")}
      ${bespoke.map((p) => card(p, "your plan")).join("")}
    </div>
    <p class="cal-card-foot"><button type="button" class="cal-inline-btn" id="calBuildOwnBtn">🛠 Build your own plan from scratch</button></p>`;
}

// ============================================================================
// Plan-builder wizard — pick a plan, get suggested workouts per day, keep /
// remove / search-add / drag between days, set special cadences ("abs every
// 2 weeks"), save as YOUR plan (persisted to the user's SQLite plan history).
// ============================================================================

const DAY_FILL_ORDER = [1, 3, 5, 2, 4, 6, 0]; // Mon Wed Fri Tue Thu Sat Sun

async function openPlanWizard(presetId) {
  let preset = null;
  if (presetId) {
    try {
      if (!state.templatesFull) {
        const r = await apiRequest("/api/program/templates?full=1");
        state.templatesFull = r?.presets || [];
      }
      preset = state.templatesFull.find((p) => p.id === presetId) || null;
    } catch (e) { console.warn("templates load failed:", e); }
  }
  const days = [0, 1, 2, 3, 4, 5, 6].map((dow) => {
    const src = preset?.weekdayPlan?.[String(dow)] || null;
    return {
      dow,
      on: Boolean(src),
      label: src?.label || "",
      cadence: 1,
      exercises: (src?.exercises || []).map((e) => (typeof e === "string" ? e : describeRx(e))).filter(Boolean),
    };
  });
  state.wizard = {
    name: preset ? `My ${preset.name}` : "My plan",
    daysPerWeek: preset?.targetDaysPerWeek || days.filter((d) => d.on).length || 3,
    sourceName: preset?.name || null,
    days,
  };
  renderScheduleCard();
}

function wizardSetDaysPerWeek(n) {
  const w = state.wizard;
  if (!w) return;
  w.daysPerWeek = n;
  const onCount = w.days.filter((d) => d.on).length;
  if (onCount < n) {
    for (const dow of DAY_FILL_ORDER) {
      const d = w.days[dow];
      if (!d.on) { d.on = true; if (w.days.filter((x) => x.on).length >= n) break; }
    }
  } else if (onCount > n) {
    for (const dow of [...DAY_FILL_ORDER].reverse()) {
      const d = w.days[dow];
      if (d.on && !d.exercises.length && !d.label) { d.on = false; if (w.days.filter((x) => x.on).length <= n) break; }
    }
    // still too many (all have content): trim from the end of fill order
    for (const dow of [...DAY_FILL_ORDER].reverse()) {
      if (w.days.filter((x) => x.on).length <= n) break;
      w.days[dow].on = false;
    }
  }
  renderScheduleCard();
}

function renderPlanWizard() {
  const w = state.wizard;
  const dayCards = w.days.map((d) => `
    <div class="cal-wiz-day ${d.on ? "is-on" : ""}" data-dow="${d.dow}">
      <div class="cal-wiz-day-head">
        <label><input type="checkbox" class="cal-wiz-on" ${d.on ? "checked" : ""}> <strong>${WEEKDAY_NAMES[d.dow]}</strong></label>
        <input class="cal-wiz-label" type="text" placeholder="label (Push, Abs…)" value="${escapeAttr(d.label)}" ${d.on ? "" : "disabled"}>
        <select class="cal-wiz-cadence" ${d.on ? "" : "disabled"} title="How often this day repeats">
          <option value="1" ${d.cadence === 1 ? "selected" : ""}>weekly</option>
          <option value="2" ${d.cadence === 2 ? "selected" : ""}>every 2 wks</option>
          <option value="3" ${d.cadence === 3 ? "selected" : ""}>every 3 wks</option>
          <option value="4" ${d.cadence === 4 ? "selected" : ""}>every 4 wks</option>
        </select>
      </div>
      <div class="cal-wiz-chips" data-dow="${d.dow}">
        ${d.exercises.map((ex, i) => `
          <span class="cal-wiz-chip" draggable="true" data-dow="${d.dow}" data-idx="${i}" title="Drag to reorder or move to another day">
            ${escapeHtml(ex)} <button type="button" class="cal-wiz-x" aria-label="Remove">×</button>
          </span>`).join("")}
        ${d.on ? `<input class="cal-wiz-add" type="text" list="calWizExList" placeholder="+ add exercise (search 2,000+)…">` : ""}
      </div>
    </div>`).join("");
  return `
    <header class="cal-card-head"><h4>🛠 Build your plan${w.sourceName ? ` <span class="cal-drawer-sub">from ${escapeHtml(w.sourceName)}</span>` : ""}</h4></header>
    <p class="cal-plan-row">
      Name: <input id="calWizName" class="cal-wiz-name" type="text" value="${escapeAttr(w.name)}" maxlength="60">
      · Days/week:
      <select id="calWizDays" class="cal-days-select">${[1,2,3,4,5,6,7].map((n) => `<option value="${n}" ${w.daysPerWeek === n ? "selected" : ""}>${n}</option>`).join("")}</select>
    </p>
    <datalist id="calWizExList"></datalist>
    <div class="cal-wiz-days">${dayCards}</div>
    <p class="cal-card-foot">Keep what you like, × what you don't, type to search-add, drag chips between days. Cadence handles "abs every 2 weeks".</p>
    <p class="cal-plan-row">
      <button type="button" class="cal-plan-apply" id="calWizSave">Save &amp; apply plan</button>
      <button type="button" class="cal-inline-btn" id="calWizCancel">Cancel</button>
    </p>`;
}

function bindPlanWizard() {
  const host = state.rootEl?.querySelector("#calScheduleCard");
  const w = state.wizard;
  if (!host || !w) return;

  host.querySelector("#calWizName")?.addEventListener("input", (e) => { w.name = e.target.value; });
  host.querySelector("#calWizDays")?.addEventListener("change", (e) => wizardSetDaysPerWeek(Number(e.target.value)));
  host.querySelector("#calWizCancel")?.addEventListener("click", () => { state.wizard = null; renderScheduleCard(); });

  host.querySelectorAll(".cal-wiz-day").forEach((card) => {
    const dow = Number(card.dataset.dow);
    const day = w.days[dow];
    card.querySelector(".cal-wiz-on")?.addEventListener("change", (e) => {
      day.on = e.target.checked;
      w.daysPerWeek = w.days.filter((x) => x.on).length || 1;
      renderScheduleCard();
    });
    card.querySelector(".cal-wiz-label")?.addEventListener("input", (e) => { day.label = e.target.value; });
    card.querySelector(".cal-wiz-cadence")?.addEventListener("change", (e) => { day.cadence = Number(e.target.value) || 1; });

    // search-add with live suggestions from the 2,000+ catalog
    const add = card.querySelector(".cal-wiz-add");
    if (add) {
      let t = null;
      add.addEventListener("input", () => {
        clearTimeout(t);
        const q = add.value.trim();
        if (q.length < 2) return;
        t = setTimeout(async () => {
          try {
            const r = await fetch(`${API_BASE}/api/exercises/search?q=${encodeURIComponent(q)}`).then((x) => x.json());
            const dl = state.rootEl.querySelector("#calWizExList");
            if (dl && r?.exercises) dl.innerHTML = r.exercises.slice(0, 15).map((e) => `<option value="${escapeAttr(e.canonical)}">`).join("");
          } catch { /* offline — free-typing still works */ }
        }, 220);
      });
      const commit = () => {
        const v = add.value.trim().replace(/,+$/, "");
        if (!v) return;
        day.exercises.push(v);
        add.value = "";
        renderScheduleCard();
        state.rootEl.querySelector(`.cal-wiz-day[data-dow="${dow}"] .cal-wiz-add`)?.focus();
      };
      add.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } });
      add.addEventListener("change", commit);
    }
  });

  // remove chip
  host.querySelectorAll(".cal-wiz-x").forEach((x) => {
    x.addEventListener("click", () => {
      const chip = x.closest(".cal-wiz-chip");
      const dow = Number(chip.dataset.dow), idx = Number(chip.dataset.idx);
      w.days[dow].exercises.splice(idx, 1);
      renderScheduleCard();
    });
  });

  // drag & drop between/within days
  host.querySelectorAll(".cal-wiz-chip").forEach((chip) => {
    chip.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", JSON.stringify({ dow: Number(chip.dataset.dow), idx: Number(chip.dataset.idx) }));
      e.dataTransfer.effectAllowed = "move";
    });
  });
  host.querySelectorAll(".cal-wiz-chips").forEach((zone) => {
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("is-over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("is-over");
      try {
        const from = JSON.parse(e.dataTransfer.getData("text/plain"));
        const toDow = Number(zone.dataset.dow);
        const [moved] = w.days[from.dow].exercises.splice(from.idx, 1);
        if (moved !== undefined) {
          w.days[toDow].exercises.push(moved);
          if (!w.days[toDow].on) w.days[toDow].on = true;
          renderScheduleCard();
        }
      } catch { /* bad payload */ }
    });
  });

  // save & apply → bespoke plan (persists in the user's plan history)
  host.querySelector("#calWizSave")?.addEventListener("click", async () => {
    const btn = host.querySelector("#calWizSave");
    const name = (w.name || "").trim() || "My plan";
    const weekdayPlan = {};
    const committed = [];
    for (const d of w.days) {
      if (!d.on) continue;
      committed.push(d.dow);
      weekdayPlan[String(d.dow)] = {
        label: d.label || "Workout",
        exercises: d.exercises,
        ...(d.cadence > 1 ? { cadence: { everyNWeeks: d.cadence } } : {}),
      };
    }
    if (!committed.length) { alert("Turn on at least one day."); return; }
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      const r = await programAction({
        action: "bespoke",
        name,
        applyNow: true,
        weekdayPlan,
        targetDaysPerWeek: committed.length,
        recurrence: { type: "weekly", weekdays: committed },
      });
      if (r?.ok === false) throw new Error(r?.error || "save failed");
      state.wizard = null;
      state.showPlanPicker = false;
      await refreshAll();
    } catch (e) {
      console.warn("wizard save failed:", e);
      btn.disabled = false;
      btn.textContent = "Save & apply plan";
      alert("Couldn't save the plan. Try again in a moment.");
    }
  });
}

function renderScheduleCard() {
  const host = state.rootEl?.querySelector("#calScheduleCard");
  if (!host) return;
  if (state.wizard) {
    host.innerHTML = renderPlanWizard();
    bindPlanWizard();
    return;
  }
  const schedule = state.schedule;

  if (!schedule) {
    host.innerHTML = `
      <header class="cal-card-head"><h4>Choose a workout plan</h4></header>
      <p class="cal-empty-hint">Pick a proven plan and it fills your calendar — or build your own week below.</p>
      ${planPickerHtml()}
      <p class="cal-card-foot" style="margin-top:.7rem">Prefer your own days?
        <button type="button" class="cal-inline-btn" id="calSetupBtn">Start with Mon / Wed / Fri</button>
        — or text the bot <code>/schedule monday legs</code>.</p>
    `;
    bindSetupButton();
    bindPlanButtons();
    return;
  }

  const committedSet = new Set(schedule.committedWeekdays || []);
  const target = schedule.targetDaysPerWeek;
  const plan = schedule.weekdayPlan || {};
  const activePlanName = state.programs?.active?.name || schedule.activePlanName || null;

  host.innerHTML = `
    <header class="cal-card-head">
      <h4>Your schedule</h4>
      ${
        target
          ? `<span class="cal-card-sub">${committedSet.size || target} day${(committedSet.size || target) === 1 ? "" : "s"} / week</span>`
          : ""
      }
    </header>
    <p class="cal-plan-row">
      ${activePlanName
        ? `Plan: <strong>${escapeHtml(activePlanName)}</strong>
           <button type="button" class="cal-inline-btn" id="calChangePlanBtn">${state.showPlanPicker ? "Hide plans" : "Change"}</button>
           <button type="button" class="cal-inline-btn" id="calClearPlanBtn">Clear</button>`
        : `No plan applied.
           <button type="button" class="cal-inline-btn" id="calChangePlanBtn">${state.showPlanPicker ? "Hide plans" : "Choose a plan"}</button>`}
    </p>
    ${state.showPlanPicker ? planPickerHtml() : ""}
    <p class="cal-plan-row">Days per week:
      <select id="calDaysPerWeek" class="cal-days-select">
        ${[1,2,3,4,5,6,7].map((n) => `<option value="${n}" ${Number(target) === n ? "selected" : ""}>${n}</option>`).join("")}
      </select>
      <span class="cal-drawer-sub">how often you want to train</span>
    </p>
    <div class="cal-weekday-grid">
      ${[0, 1, 2, 3, 4, 5, 6]
        .map((d) => {
          const on = committedSet.has(d);
          const label = plan[d]?.label || "";
          return `
            <button type="button" class="cal-weekday-chip ${on ? "is-on" : ""}" data-dow="${d}" aria-pressed="${on}">
              <span class="cal-weekday-name">${WEEKDAY_NAMES[d]} <span class="cal-weekday-edit" data-edit-dow="${d}" title="Edit ${WEEKDAY_FULL[d]}'s workout">✎</span></span>
              <span class="cal-weekday-label">${escapeHtml(label || (on ? "Scheduled" : "Rest"))}</span>
            </button>
          `;
        })
        .join("")}
    </div>
    <p class="cal-card-foot">
      Tap a day to toggle it. Tap ✎ to name its workout ("abs", "push + cardio").
    </p>
    ${renderProgressionSection(schedule)}
    <div class="cal-card-foot cal-card-textcmd">
      📲 Manage from your phone (tap to copy):
      <div class="cal-chip-row">${copyChipHtml("/schedule tomorrow bench press 3x10")}${copyChipHtml("/schedule sunday abs")}</div>
      <div class="cal-chip-row">${copyChipHtml("/progression bench press 135 +5 goal 225")}${copyChipHtml("/calendar image")}</div>
    </div>
  `;
  bindWeekdayChips();
  bindPlanButtons();
  bindScheduleExtras(schedule);
}

// ---- Adherence card (mini sparkline) ----

function renderAdherenceCard() {
  const host = state.rootEl?.querySelector("#calAdherenceCard");
  if (!host) return;
  const weeks = state.adherence?.weeks || [];

  if (!weeks.length) {
    host.innerHTML = `
      <header class="cal-card-head"><h4>Adherence trend</h4></header>
      <p class="cal-empty">Not enough data yet.</p>
      <p class="cal-empty-hint">Log a few weeks of workouts to see your trend line.</p>
    `;
    return;
  }

  const maxPct = 1;
  const bars = weeks
    .map((w) => {
      const pct = Math.max(0, Math.min(1, Number(w.pct) || 0));
      const tone = pct >= 0.8 ? "is-good" : pct >= 0.5 ? "is-warn" : "is-bad";
      return `
        <div class="cal-adherence-bar ${tone}" style="--bar-h:${Math.round(pct * 100)}%"
             title="Week of ${escapeAttr(w.weekStart)} — ${Math.round(pct * 100)}% (${w.hits}/${w.committed})">
          <span class="cal-adherence-bar-fill"></span>
          <span class="cal-adherence-bar-label">${Math.round(pct * 100)}%</span>
        </div>
      `;
    })
    .join("");

  const best = state.adherence?.bestWeek;
  const worst = state.adherence?.worstWeek;
  host.innerHTML = `
    <header class="cal-card-head"><h4>Adherence trend</h4>
      <span class="cal-card-sub">${escapeHtml(state.adherence?.range?.toUpperCase() || "")}</span>
    </header>
    <div class="cal-adherence-bars">${bars}</div>
    ${
      best || worst
        ? `<p class="cal-card-foot">
            ${best ? `Best: ${Math.round((best.pct || 0) * 100)}% (week of ${escapeHtml(best.weekStart)})` : ""}
            ${best && worst ? " · " : ""}
            ${worst ? `Worst: ${Math.round((worst.pct || 0) * 100)}%` : ""}
           </p>`
        : ""
    }
  `;
}

// ============================================================================
// Drawer — opens when a day cell is clicked. Shows planned vs actual detail.
// ============================================================================

function openDayDrawer(iso) {
  const drawer = state.rootEl?.querySelector("#calDayDrawer");
  if (!drawer) return;
  const day = (state.monthData?.days || []).find((d) => d.date === iso) || { date: iso };
  const planned = day.planned || state.schedule?.weekdayPlan?.[new Date(iso).getDay()] || null;
  const actual = day.actual || null;
  const status = day.status || "future";

  drawer.hidden = false;
  drawer.innerHTML = `
    <div class="cal-drawer-inner" role="dialog" aria-modal="false" aria-labelledby="calDrawerTitle">
      <button type="button" class="cal-drawer-close" id="calDrawerClose" aria-label="Close">×</button>
      <h3 id="calDrawerTitle" class="cal-drawer-title">${escapeHtml(
        new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      )}</h3>
      <span class="cal-drawer-status is-${escapeAttr(status)}">${escapeHtml(statusCopy(status))}</span>

      ${renderDrawerScheduledSection(day, planned, actual, iso)}
      ${renderDrawerUnscheduledSection(planned, actual, iso)}
      ${day.notes ? `<section class="cal-drawer-section"><h4>Notes</h4><p>${escapeHtml(day.notes)}</p></section>` : ""}

      <section class="cal-drawer-section cal-drawer-textcmd">
        <h4>📲 Manage by text <span class="cal-drawer-sub">(iMessage · Telegram · Signal — tap to copy)</span></h4>
        <div class="cal-chip-row">${copyChipHtml(`/schedule ${iso} bench press 3x10, squats`)}</div>
        <div class="cal-chip-row">${copyChipHtml(`/schedule clear ${iso}`)}${copyChipHtml("/calendar image")}</div>
      </section>
    </div>
  `;
  drawer
    .querySelector("#calDrawerClose")
    ?.addEventListener("click", () => closeDayDrawer());
  drawer.addEventListener("click", (e) => {
    if (e.target === drawer) closeDayDrawer();
  }, { once: true });
}

// "Scheduled" — the plan for the day, each exercise judged against the logs.
function renderDrawerScheduledSection(day, planned, actual, iso) {
  const isFuture = iso > todayIso();
  const actualNames = actual?.exercises || [];
  let body;
  if (!planned) {
    body = `<p class="cal-empty">Nothing scheduled for this day.</p>`;
  } else {
    const head = `<p class="cal-drawer-line"><strong>${escapeHtml(planned.label || plannedCellLabel(planned, true))}</strong>${
      planned.type && planned.type !== "other" ? ` · ${escapeHtml(planned.type)}` : ""
    }${day.plannedSource === "date" ? ` · <span title="Scheduled for this specific date">📌 this date</span>` : ""}</p>`;
    const items = (planned.exercises || []).map((e) => {
      const done = !isFuture && actualHasExercise(e?.name || e, actualNames);
      const mark = isFuture ? "•" : done ? `<span class="cal-rx-done">✓</span>` : `<span class="cal-rx-missed">✗</span>`;
      return `<li class="cal-rx ${done ? "is-done" : isFuture ? "" : "is-missed"}">${mark} ${escapeHtml(describeRx(e))}</li>`;
    }).join("");
    body = head +
      (items ? `<ul class="cal-rx-list">${items}</ul>` : "") +
      (planned.notes ? `<p class="cal-drawer-meta">${escapeHtml(planned.notes)}</p>` : "");
  }
  return `<section class="cal-drawer-section"><h4>Scheduled</h4>${body}</section>`;
}

// "Also did" — everything logged that day that wasn't on the plan.
function renderDrawerUnscheduledSection(planned, actual, iso) {
  const isFuture = iso > todayIso();
  if (isFuture) return `<section class="cal-drawer-section"><h4>Logged</h4><p class="cal-empty">Future day — not logged yet.</p></section>`;
  if (!(actual?.logged || actual?.workouts)) {
    return `<section class="cal-drawer-section"><h4>Logged</h4><p class="cal-empty">No workouts logged for this day.</p></section>`;
  }
  const plannedNames = (planned?.exercises || []).map((e) => e?.name || e);
  const extras = (actual.exercises || []).filter((a) => !plannedNames.some((p) => actualHasExercise(p, [a])));
  const reps = Number.isFinite(actual.totalReps) ? Math.round(actual.totalReps) : null;
  const totals = [
    actual.totalVolumeLb ? `${Math.round(actual.totalVolumeLb).toLocaleString()} lb volume` : "",
    reps ? `${reps.toLocaleString()} reps` : "",
    actual.totalSets ? `${actual.totalSets} sets` : "",
    actual.cardioMinutes ? `${actual.cardioMinutes} min cardio` : "",
  ].filter(Boolean).join(" · ");
  return `
    <section class="cal-drawer-section">
      <h4>Also did <span class="cal-drawer-sub">(not scheduled)</span></h4>
      ${extras.length
        ? `<p class="cal-drawer-meta">${extras.slice(0, 12).map((a) => escapeHtml(String(a).toLowerCase())).join(", ")}${extras.length > 12 ? ` +${extras.length - 12} more` : ""}</p>`
        : `<p class="cal-empty">Nothing beyond the plan.</p>`}
      <p class="cal-drawer-meta">${(actual.workouts || 0).toLocaleString()} ${actual.workouts === 1 ? "entry" : "entries"} logged${totals ? ` — ${totals}` : ""}</p>
    </section>`;
}

function closeDayDrawer() {
  const drawer = state.rootEl?.querySelector("#calDayDrawer");
  if (drawer) drawer.hidden = true;
}

function statusCopy(status) {
  return (
    {
      hit: "✓ Hit",
      partial: "◐ Partial",
      missed: "✗ Missed",
      rest: "· Rest day",
      future: "Upcoming",
    }[status] || status
  );
}

// ============================================================================
// Events
// ============================================================================

function bindShellEvents() {
  state.rootEl
    ?.querySelector("#calPrevMonth")
    ?.addEventListener("click", () => navigateMonth(-1));
  state.rootEl
    ?.querySelector("#calNextMonth")
    ?.addEventListener("click", () => navigateMonth(1));
  state.rootEl?.querySelector("#calTodayBtn")?.addEventListener("click", () => {
    state.month = todayMonth();
    refreshAll();
  });
}

async function navigateMonth(delta) {
  state.month = shiftMonth(state.month, delta);
  setLoadingState(true);
  await loadMonth(state.month);
  setLoadingState(false);
  renderMonthGrid();
  // Adherence / week tiles are pinned to today — don't refetch on month-only nav.
}

function bindGridEvents() {
  state.rootEl?.querySelectorAll(".cal-cell[data-date]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const date = btn.dataset.date;
      if (date) openDayDrawer(date);
    });
  });
}

function bindWeekdayChips() {
  state.rootEl?.querySelectorAll(".cal-weekday-chip").forEach((chip) => {
    chip.addEventListener("click", async () => {
      const dow = Number(chip.dataset.dow);
      if (!Number.isInteger(dow)) return;
      const current = new Set(state.schedule?.committedWeekdays || []);
      if (current.has(dow)) current.delete(dow);
      else current.add(dow);
      const next = Array.from(current).sort((a, b) => a - b);
      // Optimistic update — flip immediately, roll back if the backend rejects.
      const prev = state.schedule;
      state.schedule = { ...(state.schedule || {}), committedWeekdays: next };
      renderScheduleCard();
      try {
        const r = await apiRequest("/api/calendar/schedule", {
          method: "PATCH",
          body: JSON.stringify({ schedule: { committedWeekdays: next } }),
        });
        if (r?.schedule) {
          state.schedule = r.schedule;
          renderScheduleCard();
        }
      } catch (e) {
        console.warn("schedule patch failed:", e);
        state.schedule = prev;
        renderScheduleCard();
        alert("Couldn't save schedule. Try again in a moment.");
      }
    });
  });
}

// 📈 Progression: start weight → weekly rate → goal, per planned lift.
function renderProgressionSection(schedule) {
  const prog = schedule?.progression || {};
  // Candidate lifts = every named exercise in the weekly plan + existing configs
  const names = new Set(Object.keys(prog));
  for (const day of Object.values(schedule?.weekdayPlan || {})) {
    for (const e of day?.exercises || []) {
      const n = String(e?.name || "").toLowerCase().trim();
      if (n) names.add(n);
    }
  }
  if (!names.size) return "";
  const rows = [...names].slice(0, 10).map((name) => {
    const cfg = prog[name] || null;
    return `
      <div class="cal-prog-row" data-prog-name="${escapeAttr(name)}">
        <span class="cal-prog-name">${escapeHtml(name)}</span>
        <input class="cal-prog-in" data-k="start" type="number" min="0" step="2.5" placeholder="start" value="${cfg ? cfg.start : ""}" aria-label="${escapeAttr(name)} starting weight">
        <span class="cal-prog-sep">+</span>
        <input class="cal-prog-in" data-k="increment" type="number" step="2.5" placeholder="5" value="${cfg ? cfg.increment : ""}" aria-label="weekly increase">
        <span class="cal-prog-sep">/wk →</span>
        <input class="cal-prog-in" data-k="goal" type="number" min="0" step="5" placeholder="goal" value="${cfg && cfg.goal !== null ? cfg.goal : ""}" aria-label="goal weight">
        <button type="button" class="cal-inline-btn cal-prog-save">${cfg ? "Update" : "Set"}</button>
        ${cfg ? `<button type="button" class="cal-inline-btn cal-prog-clear" title="Remove progression">✕</button>` : ""}
      </div>`;
  }).join("");
  return `
    <div class="cal-prog-card">
      <h5 class="cal-prog-head">📈 Progression <span class="cal-drawer-sub">starting weight · weekly increase · goal — your calendar paces each week's target (🎯)</span></h5>
      ${rows}
    </div>`;
}

function bindScheduleExtras(schedule) {
  // Days-per-week selector
  state.rootEl?.querySelector("#calDaysPerWeek")?.addEventListener("change", async (e) => {
    const n = Number(e.target.value);
    if (!Number.isInteger(n) || n < 1 || n > 7) return;
    try {
      const r = await apiRequest("/api/calendar/schedule", {
        method: "PATCH",
        body: JSON.stringify({ schedule: { targetDaysPerWeek: n } }),
      });
      if (r?.schedule) { state.schedule = r.schedule; renderScheduleCard(); }
    } catch (err) {
      console.warn("days/week patch failed:", err);
      alert("Couldn't save. Try again in a moment.");
    }
  });

  // ✎ weekday workout editor ("abs every Sunday")
  state.rootEl?.querySelectorAll(".cal-weekday-edit").forEach((pen) => {
    pen.addEventListener("click", async (e) => {
      e.stopPropagation();
      const d = Number(pen.dataset.editDow);
      if (!Number.isInteger(d)) return;
      const current = state.schedule?.weekdayPlan?.[d] || state.schedule?.weekdayPlan?.[String(d)] || null;
      const answer = prompt(`Every ${WEEKDAY_FULL[d]} — what's the workout? (e.g. "abs", "push + cardio"; empty to clear)`, current?.label || "");
      if (answer === null) return;
      const label = answer.trim();
      const committed = new Set(state.schedule?.committedWeekdays || []);
      if (label) committed.add(d);
      try {
        const r = await apiRequest("/api/calendar/schedule", {
          method: "PATCH",
          body: JSON.stringify({ schedule: {
            committedWeekdays: [...committed].sort((a, b) => a - b),
            weekdayPlan: { [String(d)]: label ? { label, exercises: current?.exercises || [] } : null },
          } }),
        });
        if (r?.schedule) { state.schedule = r.schedule; renderScheduleCard(); await loadMonth(state.month); renderMonthGrid(); }
      } catch (err) {
        console.warn("weekday plan patch failed:", err);
        alert("Couldn't save. Try again in a moment.");
      }
    });
  });

  // Progression save/clear
  state.rootEl?.querySelectorAll(".cal-prog-save").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".cal-prog-row");
      const name = row?.dataset.progName;
      if (!name) return;
      const val = (k) => {
        const v = row.querySelector(`.cal-prog-in[data-k="${k}"]`)?.value.trim();
        return v === "" || v === undefined ? null : Number(v);
      };
      const start = val("start");
      if (!Number.isFinite(start)) { alert("Enter a starting weight."); return; }
      const cfg = { start, increment: Number.isFinite(val("increment")) ? val("increment") : 5, goal: Number.isFinite(val("goal")) ? val("goal") : null };
      btn.disabled = true;
      try {
        const r = await apiRequest("/api/calendar/schedule", {
          method: "PATCH",
          body: JSON.stringify({ schedule: { progression: { [name]: cfg } } }),
        });
        if (r?.schedule) { state.schedule = r.schedule; renderScheduleCard(); await loadMonth(state.month); renderMonthGrid(); }
      } catch (err) {
        console.warn("progression patch failed:", err);
        btn.disabled = false;
        alert("Couldn't save the progression. Try again in a moment.");
      }
    });
  });
  state.rootEl?.querySelectorAll(".cal-prog-clear").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const name = btn.closest(".cal-prog-row")?.dataset.progName;
      if (!name) return;
      try {
        const r = await apiRequest("/api/calendar/schedule", {
          method: "PATCH",
          body: JSON.stringify({ schedule: { progression: { [name]: null } } }),
        });
        if (r?.schedule) { state.schedule = r.schedule; renderScheduleCard(); }
      } catch (err) { console.warn("progression clear failed:", err); }
    });
  });
}

function bindPlanButtons() {
  state.rootEl?.querySelectorAll(".cal-plan-apply").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.planId;
      if (!id) return;
      btn.disabled = true;
      btn.textContent = "Applying…";
      try {
        const r = await programAction({ action: "apply", id });
        if (r?.ok === false) throw new Error(r?.error || "apply failed");
        // Paint instantly from the apply response — don't wait on the
        // (eventually-consistent) reader fetches.
        if (r?.schedule) state.schedule = r.schedule;
        if (r?.active && state.programs) state.programs = { ...state.programs, active: r.active };
        state.showPlanPicker = false;
        renderScheduleCard();
        await refreshAll();
      } catch (e) {
        console.warn("plan apply failed:", e);
        btn.disabled = false;
        btn.textContent = "Use this plan";
        alert("Couldn't apply that plan. Try again in a moment.");
      }
    });
  });
  state.rootEl?.querySelectorAll(".cal-plan-customize").forEach((btn) => {
    btn.addEventListener("click", () => openPlanWizard(btn.dataset.planId));
  });
  state.rootEl?.querySelector("#calBuildOwnBtn")?.addEventListener("click", () => openPlanWizard(null));
  state.rootEl?.querySelector("#calChangePlanBtn")?.addEventListener("click", () => {
    state.showPlanPicker = !state.showPlanPicker;
    renderScheduleCard();
  });
  state.rootEl?.querySelector("#calClearPlanBtn")?.addEventListener("click", async () => {
    if (!confirm("Clear the active plan? Your weekday commitments stay; the plan's day labels are removed.")) return;
    try {
      await programAction({ action: "clear" });
      await refreshAll();
    } catch (e) {
      console.warn("plan clear failed:", e);
      alert("Couldn't clear the plan. Try again in a moment.");
    }
  });
}

function bindSetupButton() {
  state.rootEl?.querySelector("#calSetupBtn")?.addEventListener("click", async () => {
    // Default to Mon/Wed/Fri as a sensible starting point. User can edit
    // after the chip grid appears.
    try {
      const r = await apiRequest("/api/calendar/schedule", {
        method: "PATCH",
        body: JSON.stringify({ schedule: { committedWeekdays: [1, 3, 5], targetDaysPerWeek: 3 } }),
      });
      state.schedule = r?.schedule || { committedWeekdays: [1, 3, 5], targetDaysPerWeek: 3 };
      renderScheduleCard();
    } catch (e) {
      console.warn("setup failed:", e);
      alert("Couldn't set up schedule. Try again in a moment.");
    }
  });
}
