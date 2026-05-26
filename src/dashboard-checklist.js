// Dashboard deferred-onboarding checklist + notification bell.
//
// API contract (from backend docs/FRONTEND_ONBOARDING_CHECKLIST.txt):
//   GET   /api/profile/deferred-checklist?contact=<u>
//   PATCH /api/account/profile      (per-field writes)
//
// Render strategy:
//   - A small bell button is injected into the dashboard nav. When there are
//     unfinished items, a red badge with the remaining count appears.
//   - Clicking the bell expands a panel listing items grouped by category
//     with per-field inline forms.
//   - A toolbar "Hide checklist" stores the user's preference in localStorage.
//   - Once `summary.remaining === 0` the panel auto-collapses and shows a
//     one-time congratulations banner.

const API_BASE = "https://api.thetrackerapp.io";
const LS_HIDE = "tracker.checklist.hidden";
const LS_DONE_BANNER = "tracker.checklist.doneBannerShown";

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

function getContact() {
  try {
    const raw = localStorage.getItem("tracker.auth.user");
    if (!raw) return "";
    const u = JSON.parse(raw);
    return (u?.username || u?.canonical || u?.credential || u?.maskedCredential || u?.accountId || "").toString().trim();
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
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

// Item field configuration.
// Each item id maps to the profile field(s) PATCHed and the widget rendered.
const ITEM_WIDGETS = {
  age_group: {
    type: "radio",
    field: "ageGroup",
    options: ["child", "teen", "adult", "elder"],
    labels: { child: "Child", teen: "Teen", adult: "Adult", elder: "Elder" },
  },
  sex: {
    type: "radio",
    field: "sex",
    options: ["male", "female", "prefer_not_to_say"],
    labels: { male: "Male", female: "Female", prefer_not_to_say: "Prefer not to say" },
  },
  current_weight: { type: "weight", field: "currentWeight" },
  current_height: { type: "height", field: "currentHeight" },
  body_goal: {
    type: "radio",
    field: "bodyGoal",
    options: ["lose", "maintain", "gain", "recomp"],
    labels: { lose: "Lose", maintain: "Maintain", gain: "Gain", recomp: "Recomp" },
    disclaimer: true,
  },
  calorie_target: { type: "calorie", field: "calorieGoal", disclaimer: true },
  water_goal: { type: "water", field: "waterGoal" },
  workout_split: {
    type: "chips",
    field: "workoutSplit",
    chips: ["PPL", "Upper/Lower", "Full body", "Bro split", "Custom"],
  },
  daily_reminders: { type: "reminders" },
  weekly_body_reminder: {
    type: "toggle-day",
    field: "weeklyBodyMeasurePromptEnabled",
    dayField: null,
    label: "Remind me to take body measurements weekly",
  },
  weekly_reports: {
    type: "toggle-day",
    field: "weeklyReportsEnabled",
    dayField: "weeklyReportDay",
    label: "Send me a weekly progress report",
  },
  phone_call_reminders: {
    type: "toggle",
    field: "phoneCallReminders",
    label: "Phone-call reminders (for missed days)",
  },
  notification_channel: {
    type: "radio",
    field: "preferredChannel",
    options: ["iMessage", "SMS", "WhatsApp", "email"],
    labels: { iMessage: "iMessage", SMS: "SMS", WhatsApp: "WhatsApp", email: "Email" },
  },
  nutrition_coaching: {
    type: "toggle",
    field: "nutritionCoachingEnabled",
    label: "Nutrition coaching",
    sub: "AI nudges based on your daily totals and goals.",
  },
  leaderboard_optin: {
    type: "toggle",
    field: "leaderboardOptIn",
    label: "Show me on public leaderboards",
    sub: "Your username + score; you control your flair and emoji.",
  },
  flair: { type: "flair" },
  reply_style: {
    type: "radio",
    field: "replyStyle",
    options: ["default", "concise", "verbose"],
    labels: { default: "Default", concise: "Concise", verbose: "Verbose" },
  },
  export_format: {
    type: "radio",
    field: "exportFormat",
    options: ["csv", "json", "pdf"],
    labels: { csv: "CSV", json: "JSON", pdf: "PDF" },
  },
};

const CATEGORY_ORDER = ["Profile", "Goals", "Notifications", "Coaching", "Community", "Preferences"];
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

let bellEl = null;
let panelEl = null;
let state = {
  items: [],
  summary: { total: 0, completed: 0, remaining: 0, completionPercent: 0 },
  panelOpen: false,
  hidden: false,
};

function isHidden() {
  try {
    return localStorage.getItem(LS_HIDE) === "1";
  } catch {
    return false;
  }
}

function setHidden(v) {
  try {
    localStorage.setItem(LS_HIDE, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export async function initChecklist() {
  // Only show for signed-in users.
  if (!getContact()) return;
  state.hidden = isHidden();
  mountBell();
  await refresh();
}

function mountBell() {
  if (bellEl) return;
  const nav = document.getElementById("dashboardNav");
  if (!nav) return;
  bellEl = document.createElement("button");
  bellEl.type = "button";
  bellEl.className = "checklist-bell";
  bellEl.setAttribute("aria-label", "Setup checklist");
  bellEl.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2zm-6 5a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    </svg>
    <span class="checklist-bell-badge" hidden>0</span>
  `;
  bellEl.addEventListener("click", togglePanel);
  // Insert at the top of the sidebar nav.
  nav.insertBefore(bellEl, nav.firstChild);
}

function syncBell() {
  if (!bellEl) return;
  const badge = bellEl.querySelector(".checklist-bell-badge");
  const remaining = state.summary.remaining;
  if (remaining > 0 && !state.hidden) {
    badge.textContent = remaining > 99 ? "99+" : String(remaining);
    badge.hidden = false;
    bellEl.classList.add("has-pending");
  } else {
    badge.hidden = true;
    bellEl.classList.remove("has-pending");
  }
}

function togglePanel() {
  state.panelOpen = !state.panelOpen;
  renderPanel();
}

async function refresh() {
  try {
    const contact = getContact();
    const data = await api(`/api/profile/deferred-checklist?contact=${encodeURIComponent(contact)}`);
    if (data?.ok) {
      state.items = Array.isArray(data.items) ? data.items : [];
      state.summary = data.summary || { total: 0, completed: 0, remaining: 0, completionPercent: 0 };
    }
  } catch {
    // If endpoint isn't deployed yet, hide the bell rather than show a broken UI.
    state.items = [];
    state.summary = { total: 0, completed: 0, remaining: 0, completionPercent: 0 };
  }
  syncBell();
  if (state.panelOpen) renderPanel();

  if (state.summary.remaining === 0 && state.summary.total > 0 && !localStorage.getItem(LS_DONE_BANNER)) {
    try {
      localStorage.setItem(LS_DONE_BANNER, "1");
    } catch {
      /* ignore */
    }
    setHidden(true);
    state.hidden = true;
    syncBell();
    showDoneBanner();
  }
}

function ensurePanel() {
  if (panelEl) return panelEl;
  panelEl = document.createElement("div");
  panelEl.className = "checklist-panel";
  panelEl.hidden = true;
  document.body.appendChild(panelEl);
  panelEl.addEventListener("click", (ev) => {
    if (ev.target.dataset.action === "close-panel") {
      state.panelOpen = false;
      renderPanel();
    }
  });
  return panelEl;
}

function renderPanel() {
  const root = ensurePanel();
  root.hidden = !state.panelOpen;
  if (!state.panelOpen) return;

  const groups = new Map();
  for (const item of state.items) {
    const cat = item.category || "Other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(item);
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
  }
  const orderedCats = [
    ...CATEGORY_ORDER.filter((c) => groups.has(c)),
    ...[...groups.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const pct = state.summary.completionPercent || 0;
  root.innerHTML = `
    <div class="checklist-backdrop" data-action="close-panel"></div>
    <aside class="checklist-window" role="dialog" aria-label="Profile setup checklist">
      <header class="checklist-head">
        <div>
          <h2>Finish setting up your profile</h2>
          <p class="checklist-sub">${state.summary.completed} of ${state.summary.total} done · ${pct}%</p>
        </div>
        <button type="button" class="checklist-close" data-action="close-panel" aria-label="Close">×</button>
      </header>
      <div class="checklist-progress">
        <div class="checklist-progress-fill" style="width: ${pct}%"></div>
      </div>
      <div class="checklist-body">
        ${orderedCats
          .map(
            (cat) => `
          <section class="checklist-group">
            <h3>${escapeHtml(cat)}</h3>
            ${groups.get(cat).map(renderItemCard).join("")}
          </section>
        `,
          )
          .join("")}
      </div>
      <footer class="checklist-foot">
        <button type="button" class="btn-ghost" data-action="hide-panel">Hide for now</button>
        <p class="checklist-foot-note">Updates save instantly. You can edit anything any time from this panel.</p>
      </footer>
    </aside>
  `;
  bindPanelEvents();
}

function renderItemCard(item) {
  const completed = !!item.completed;
  const widget = ITEM_WIDGETS[item.id];
  return `
    <article class="checklist-card ${completed ? "is-done" : ""} priority-${escapeHtml(item.priority || "low")}"
             data-item-id="${escapeHtml(item.id)}">
      <button type="button" class="checklist-card-head" data-action="toggle-item">
        <span class="checklist-card-check" aria-hidden="true">${completed ? "✓" : ""}</span>
        <span class="checklist-card-title">${escapeHtml(item.title)}</span>
        <span class="checklist-card-priority">${escapeHtml(item.priority || "")}</span>
      </button>
      <form class="checklist-card-form" data-item-id="${escapeHtml(item.id)}" hidden>
        ${renderWidget(item, widget)}
        ${
          widget?.disclaimer
            ? `<p class="checklist-disclaimer">These are general estimates. Consult a registered dietitian or physician for a personalized plan.</p>`
            : ""
        }
        <div class="checklist-card-actions">
          <button type="submit" class="btn-primary">Save</button>
          <button type="button" class="btn-ghost" data-action="skip-item">Skip for now</button>
          <span class="checklist-card-status" data-status></span>
        </div>
      </form>
    </article>
  `;
}

function renderWidget(item, w) {
  if (!w) {
    return `<p class="checklist-empty">Form widget not implemented for "${escapeHtml(item.id)}".</p>`;
  }
  switch (w.type) {
    case "radio":
      return `
        <div class="checklist-radio-row">
          ${w.options
            .map(
              (opt) =>
                `<label class="checklist-radio">
                  <input type="radio" name="value" value="${escapeHtml(opt)}">
                  <span>${escapeHtml(w.labels?.[opt] || opt)}</span>
                </label>`,
            )
            .join("")}
        </div>
      `;
    case "weight":
      return `
        <div class="checklist-inline-input">
          <input type="number" name="value" min="40" max="700" step="0.1" placeholder="175" required>
          <select name="unit">
            <option value="lb" selected>lb</option>
            <option value="kg">kg</option>
          </select>
        </div>
      `;
    case "height":
      return `
        <div class="checklist-inline-input">
          <input type="text" name="value" placeholder='5&apos;10" or 178 cm' required>
        </div>
      `;
    case "calorie":
      return `
        <div class="checklist-inline-input">
          <input type="number" name="value" min="800" max="6000" step="10" placeholder="2200">
          <button type="button" class="btn-ghost" data-action="calorie-auto">Auto-estimate from my profile</button>
        </div>
      `;
    case "water":
      return `
        <div class="checklist-inline-input">
          <input type="number" name="value" min="8" max="500" step="1" placeholder="128">
          <select name="unit">
            <option value="oz" selected>oz</option>
            <option value="ml">mL</option>
            <option value="l">L</option>
          </select>
        </div>
      `;
    case "chips":
      return `
        <div class="checklist-chips">
          ${w.chips.map((c) => `<button type="button" class="chip" data-chip="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}
        </div>
        <input type="text" name="value" placeholder="Or type your own" />
      `;
    case "reminders":
      return `
        <label class="checklist-toggle">
          <input type="checkbox" name="enabled">
          <span>Send me daily reminders</span>
        </label>
        <div class="checklist-times">
          <label>First reminder <input type="time" name="time1" value="08:00"></label>
          <label>Second (optional) <input type="time" name="time2"></label>
        </div>
      `;
    case "toggle-day":
      return `
        <label class="checklist-toggle">
          <input type="checkbox" name="enabled">
          <span>${escapeHtml(w.label || "Enable")}</span>
        </label>
        ${
          w.dayField
            ? `<label class="checklist-day-label">Day
                <select name="day">
                  ${["sunday","monday","tuesday","wednesday","thursday","friday","saturday"].map(
                    (d) => `<option value="${d}" ${d === "saturday" ? "selected" : ""}>${d[0].toUpperCase() + d.slice(1)}</option>`,
                  ).join("")}
                </select>
              </label>`
            : ""
        }
      `;
    case "toggle":
      return `
        <label class="checklist-toggle">
          <input type="checkbox" name="enabled">
          <span>${escapeHtml(w.label || "Enable")}</span>
        </label>
        ${w.sub ? `<p class="checklist-sub-help">${escapeHtml(w.sub)}</p>` : ""}
      `;
    case "flair":
      return `
        <div class="checklist-inline-input">
          <input type="text" name="emoji" maxlength="4" placeholder="🔥 emoji">
          <input type="text" name="text" maxlength="32" placeholder="Flair text (optional)">
        </div>
      `;
    default:
      return "";
  }
}

function bindPanelEvents() {
  if (!panelEl) return;

  panelEl.querySelectorAll('[data-action="toggle-item"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".checklist-card");
      const form = card?.querySelector(".checklist-card-form");
      if (!form) return;
      form.hidden = !form.hidden;
    });
  });

  panelEl.querySelectorAll('[data-action="skip-item"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = btn.closest(".checklist-card-form");
      if (form) form.hidden = true;
    });
  });

  panelEl.querySelectorAll(".checklist-card-form").forEach((form) => {
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      await submitItem(form);
    });
    // Chip selector
    form.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const input = form.querySelector('input[name="value"]');
        if (input) input.value = chip.dataset.chip;
      });
    });
    // "Auto-estimate" button for calorie target
    form.querySelector('[data-action="calorie-auto"]')?.addEventListener("click", async () => {
      const status = form.querySelector("[data-status]");
      try {
        if (status) status.textContent = "Estimating…";
        await api("/api/account/profile", {
          method: "PATCH",
          body: JSON.stringify({ calorieGoal: "auto" }),
        });
        if (status) {
          status.textContent = "Saved";
          status.className = "checklist-card-status is-ok";
        }
        await refresh();
      } catch (e) {
        if (status) {
          status.textContent = `Failed: ${e?.message || ""}`;
          status.className = "checklist-card-status is-error";
        }
      }
    });
  });

  panelEl.querySelector('[data-action="hide-panel"]')?.addEventListener("click", () => {
    setHidden(true);
    state.hidden = true;
    state.panelOpen = false;
    renderPanel();
    syncBell();
  });
}

async function submitItem(form) {
  const id = form.dataset.itemId;
  const widget = ITEM_WIDGETS[id];
  if (!widget) return;
  const status = form.querySelector("[data-status]");
  const body = buildPayload(form, widget);
  if (!body) {
    if (status) {
      status.textContent = "Please fill in a value.";
      status.className = "checklist-card-status is-error";
    }
    return;
  }
  try {
    if (status) {
      status.textContent = "Saving…";
      status.className = "checklist-card-status";
    }
    await api("/api/account/profile", { method: "PATCH", body: JSON.stringify(body) });
    if (status) {
      status.textContent = "Saved";
      status.className = "checklist-card-status is-ok";
    }
    await refresh();
  } catch (e) {
    if (status) {
      status.textContent = `Failed: ${e?.message || ""}`;
      status.className = "checklist-card-status is-error";
    }
  }
}

function buildPayload(form, widget) {
  const fd = new FormData(form);
  switch (widget.type) {
    case "radio": {
      const v = fd.get("value");
      if (!v) return null;
      return { [widget.field]: v };
    }
    case "weight": {
      const v = fd.get("value");
      const u = fd.get("unit") || "lb";
      if (!v) return null;
      return { [widget.field]: `${v} ${u}` };
    }
    case "height":
    case "chips": {
      const v = (fd.get("value") || "").toString().trim();
      if (!v) return null;
      return { [widget.field]: v };
    }
    case "calorie": {
      const v = fd.get("value");
      if (!v) return null;
      return { [widget.field]: Number(v) };
    }
    case "water": {
      const v = Number(fd.get("value"));
      const u = fd.get("unit") || "oz";
      if (!v) return null;
      const oz = u === "ml" ? v * 0.033814 : u === "l" ? v * 33.814 : v;
      return { [widget.field]: Math.round(oz) };
    }
    case "reminders": {
      const enabled = fd.get("enabled") === "on";
      const times = [fd.get("time1"), fd.get("time2")].filter(Boolean);
      return {
        dailyReminderEnabled: enabled,
        dailyReminderTimes: enabled ? times : [],
      };
    }
    case "toggle-day": {
      const enabled = fd.get("enabled") === "on";
      const day = fd.get("day");
      const payload = { [widget.field]: enabled };
      if (widget.dayField && day) payload[widget.dayField] = day;
      return payload;
    }
    case "toggle": {
      return { [widget.field]: fd.get("enabled") === "on" };
    }
    case "flair": {
      const emoji = (fd.get("emoji") || "").toString().trim();
      const text = (fd.get("text") || "").toString().trim();
      if (!emoji && !text) return null;
      return { flair: text || emoji, leaderboardEmoji: emoji };
    }
    default:
      return null;
  }
}

function showDoneBanner() {
  const banner = document.createElement("div");
  banner.className = "checklist-done-banner";
  banner.innerHTML = `
    <span class="checklist-done-emoji" aria-hidden="true">🎉</span>
    <span>Profile setup complete — nice work.</span>
    <button type="button" class="checklist-done-close" aria-label="Dismiss">×</button>
  `;
  banner.querySelector(".checklist-done-close").addEventListener("click", () => banner.remove());
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 8000);
}

export default initChecklist;
