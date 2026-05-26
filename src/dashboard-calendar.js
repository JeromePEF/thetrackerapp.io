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
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
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
  // Fire all four fetches in parallel; the UI renders each section as it
  // resolves. Failures degrade to inline empty states.
  await refreshAll();
}

async function refreshAll() {
  state.loading = true;
  setLoadingState(true);
  const tasks = [loadSchedule(), loadMonth(state.month), loadWeek(), loadAdherence("30d")];
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

    const plannedLabel = planned?.label || (isCommitted ? "Scheduled" : "");
    const actualBadge = actual?.workouts ? `<span class="cal-cell-actual">${actual.workouts}×</span>` : "";

    html += `
      <button type="button"
              class="cal-cell is-${escapeAttr(status)} ${isCommitted ? "is-committed" : ""} ${isToday ? "is-today" : ""} ${isFuture ? "is-future" : ""}"
              data-date="${iso}"
              data-status="${escapeAttr(status)}"
              aria-label="${escapeAttr(`${date.toDateString()} — ${status}${plannedLabel ? `, planned ${plannedLabel}` : ""}${actual?.workouts ? `, ${actual.workouts} workout${actual.workouts === 1 ? "" : "s"} logged` : ""}`)}">
        <span class="cal-cell-day">${dayNum}</span>
        ${plannedLabel ? `<span class="cal-cell-plan">${escapeHtml(plannedLabel)}</span>` : ""}
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

function renderScheduleCard() {
  const host = state.rootEl?.querySelector("#calScheduleCard");
  if (!host) return;
  const schedule = state.schedule;

  if (!schedule) {
    host.innerHTML = `
      <header class="cal-card-head"><h4>Your schedule</h4></header>
      <p class="cal-empty">You haven't set up a workout schedule yet.</p>
      <p class="cal-empty-hint">Tell the bot something like "I work out Mon, Wed, Fri" and refresh — or click below to set it now.</p>
      <button type="button" class="btn-primary cal-setup-btn" id="calSetupBtn">Set up schedule</button>
    `;
    bindSetupButton();
    return;
  }

  const committedSet = new Set(schedule.committedWeekdays || []);
  const target = schedule.targetDaysPerWeek;
  const plan = schedule.weekdayPlan || {};

  host.innerHTML = `
    <header class="cal-card-head">
      <h4>Your schedule</h4>
      ${
        target
          ? `<span class="cal-card-sub">${committedSet.size || target} day${(committedSet.size || target) === 1 ? "" : "s"} / week</span>`
          : ""
      }
    </header>
    <div class="cal-weekday-grid">
      ${[0, 1, 2, 3, 4, 5, 6]
        .map((d) => {
          const on = committedSet.has(d);
          const label = plan[d]?.label || "";
          return `
            <button type="button" class="cal-weekday-chip ${on ? "is-on" : ""}" data-dow="${d}" aria-pressed="${on}">
              <span class="cal-weekday-name">${WEEKDAY_NAMES[d]}</span>
              <span class="cal-weekday-label">${escapeHtml(label || (on ? "Scheduled" : "Rest"))}</span>
            </button>
          `;
        })
        .join("")}
    </div>
    <p class="cal-card-foot">
      Tap a day to toggle commitment. Long-press to edit the workout label.
    </p>
  `;
  bindWeekdayChips();
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

      <section class="cal-drawer-section">
        <h4>Planned</h4>
        ${
          planned
            ? `<p class="cal-drawer-line"><strong>${escapeHtml(planned.label || "Scheduled")}</strong>${
                planned.type ? ` · ${escapeHtml(planned.type)}` : ""
              }</p>${
                planned.exercises?.length
                  ? `<p class="cal-drawer-meta">Exercises: ${planned.exercises.map(escapeHtml).join(", ")}</p>`
                  : ""
              }${planned.notes ? `<p class="cal-drawer-meta">${escapeHtml(planned.notes)}</p>` : ""}`
            : `<p class="cal-empty">Nothing scheduled for this day.</p>`
        }
      </section>

      <section class="cal-drawer-section">
        <h4>Actual</h4>
        ${
          actual?.logged || actual?.workouts
            ? `<p class="cal-drawer-line"><strong>${actual.workouts || 0}</strong> workout${(actual.workouts || 0) === 1 ? "" : "s"} logged</p>${
                actual.exercises?.length
                  ? `<p class="cal-drawer-meta">Did: ${actual.exercises.map(escapeHtml).join(", ")}</p>`
                  : ""
              }${
                actual.totalVolumeLb
                  ? `<p class="cal-drawer-meta">Volume: ${actual.totalVolumeLb.toLocaleString()} lb${
                      actual.totalReps ? ` · ${actual.totalReps} reps · ${actual.totalSets} sets` : ""
                    }</p>`
                  : ""
              }${
                actual.cardioMinutes
                  ? `<p class="cal-drawer-meta">Cardio: ${actual.cardioMinutes} min</p>`
                  : ""
              }`
            : iso > todayIso()
            ? `<p class="cal-empty">Future day — not logged yet.</p>`
            : `<p class="cal-empty">No workouts logged for this day.</p>`
        }
      </section>

      ${day.notes ? `<section class="cal-drawer-section"><h4>Notes</h4><p>${escapeHtml(day.notes)}</p></section>` : ""}
    </div>
  `;
  drawer
    .querySelector("#calDrawerClose")
    ?.addEventListener("click", () => closeDayDrawer());
  drawer.addEventListener("click", (e) => {
    if (e.target === drawer) closeDayDrawer();
  }, { once: true });
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
