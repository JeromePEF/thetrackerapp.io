// Dashboard — "Your Shortcuts" tab.
//
// Lets users create /aliases that expand to longer text on send. Anything
// typed AFTER the alias gets appended to the expansion before the bot
// parser runs. See USER_QUICK_COMMANDS_BACKEND.txt for full backend contract.
//
// Endpoints:
//   GET    /api/user/quick-commands?contact=<contact>
//   POST   /api/user/quick-commands       { contact, key, expansion }
//   DELETE /api/user/quick-commands       { contact, key }
//
// The Reserved-key list is hardcoded client-side per backend's recommendation
// so we can warn the user inline as they type, before any network round-trip.

const API_BASE = "https://api.thetrackerapp.io";

// ----------------------------------------------------------------------------
// Reserved built-in commands — kept in sync with backend section 2.
// Frontend blocks user from creating these.
// ----------------------------------------------------------------------------
const RESERVED_KEYS = new Set(
  [
    // core & help
    "help", "tutorial", "presets", "ping", "stop", "resume", "goback",
    // signup / onboarding
    "start", "quickstart", "setup", "advanced", "advancedstart", "signup",
    // billing
    "plans", "upgrade", "premium", "billing",
    // reminders
    "reminders", "reminder",
    // body reminders
    "bodyreminder", "bodycheckin", "measurements",
    // location / timezone
    "country", "nation", "timezone", "tz", "city",
    // goals
    "goal", "goals",
    // workout logging
    "log", "today", "week", "month", "plan", "report", "workout", "suggest", "units",
    // nutrition / hydration / body / blood
    "nutrition", "food", "water", "body", "blood",
    // data / style / edit
    "export", "style", "response", "undo", "redo",
    // community
    "leaderboard", "emoji", "group", "club", "trainer",
    // admin
    "stats", "adminstats", "cost", "spend", "geminicost", "costjson",
  ].map((k) => k.toLowerCase())
);

// Starter gallery (seed cards on empty state). Mirrors backend section 6.
const STARTER_SHORTCUTS = [
  // WORKOUTS
  { group: "Workouts", key: "/mypush", expansion: "20 pushups" },
  { group: "Workouts", key: "/mypull", expansion: "10 pullups" },
  { group: "Workouts", key: "/core",   expansion: "20 crunches and 30 leg raises and 60 second plank" },
  { group: "Workouts", key: "/legday", expansion: "3 sets of 10 squats at 135 lb" },
  { group: "Workouts", key: "/amrap",  expansion: "5 rounds of 10 pushups 10 pullups 20 squats" },
  // MEALS
  { group: "Meals", key: "/breakfast", expansion: "oatmeal with blueberries and 2 boiled eggs" },
  { group: "Meals", key: "/lunch",     expansion: "chicken rice and broccoli" },
  { group: "Meals", key: "/dinner",    expansion: "salmon sweet potato and a salad" },
  { group: "Meals", key: "/snack",     expansion: "handful of almonds" },
  // DRINKS
  { group: "Drinks", key: "/coffee",   expansion: "black coffee 8 oz" },
  { group: "Drinks", key: "/shake",    expansion: "whey protein 25g and 1 banana" },
  { group: "Drinks", key: "/celsius",  expansion: "drank a celsius" },
  // HYDRATION
  { group: "Hydration", key: "/bottle", expansion: "drank 16 oz of water" },
  { group: "Hydration", key: "/h2o",    expansion: "drank 8 oz of water" },
  { group: "Hydration", key: "/chug",   expansion: "drank 32 oz of water" },
  // SUPPLEMENTS
  { group: "Supplements", key: "/preworkout", expansion: "took 1 scoop pre-workout and 200mg caffeine" },
  { group: "Supplements", key: "/vitamins",   expansion: "vitamin d 2000 IU, fish oil 1000 mg, magnesium 400 mg" },
  { group: "Supplements", key: "/creatine",   expansion: "took 5g creatine" },
  { group: "Supplements", key: "/bedtime",    expansion: "magnesium 400mg and melatonin 3mg" },
  // CARDIO
  { group: "Cardio", key: "/run",     expansion: "ran 3 miles in 28 minutes" },
  { group: "Cardio", key: "/commute", expansion: "walked 0.6 miles" },
  { group: "Cardio", key: "/spin",    expansion: "biked 30 minutes at moderate intensity" },
  // CHECK-IN
  { group: "Check-in", key: "/morning", expansion: "weight 175 lb" },
  { group: "Check-in", key: "/sat",     expansion: "chest 42 in, waist 33 in, arms 15 in" },
];

// Validation limits — match the backend caps. Server is authoritative; these
// just give us inline feedback before the user hits Save.
const LIMITS = {
  maxKeyLength: 32,
  maxExpansionLength: 400,
  maxCommandsPerUser: 50,
};

// ----------------------------------------------------------------------------
// State
// ----------------------------------------------------------------------------
const state = {
  rootEl: null,
  commands: [],
  loading: false,
  modalMode: null, // "create" | "edit" | null
  editingKey: null, // when modalMode === "edit"
};

// ----------------------------------------------------------------------------
// Auth + API helpers
// ----------------------------------------------------------------------------
function getCurrentContact() {
  try {
    const raw = localStorage.getItem("tracker.auth.user");
    if (!raw) return "";
    const u = JSON.parse(raw);
    return (
      u?.username ||
      u?.canonical ||
      u?.credential ||
      u?.maskedCredential ||
      u?.accountId ||
      ""
    )
      .toString()
      .trim();
  } catch {
    return "";
  }
}

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
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* may be empty */
  }
  if (!res.ok) {
    const err = new Error(body?.error || body?.note || `${path} ${res.status}`);
    err.code = body?.error || "";
    err.note = body?.note || "";
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

// ----------------------------------------------------------------------------
// Validation (mirrors backend rules — normalize, then check)
// ----------------------------------------------------------------------------

// Normalize per spec: strip leading slash, lowercase, drop disallowed chars,
// then re-add leading slash. Returns "" when input is invalid.
function normalizeKey(raw) {
  let s = String(raw || "").trim().toLowerCase();
  if (s.startsWith("/")) s = s.slice(1);
  s = s.replace(/[^a-z0-9_]/g, "");
  if (!s) return "";
  s = s.slice(0, LIMITS.maxKeyLength - 1); // -1 for slash
  return "/" + s;
}

// Returns { ok: true } when valid, otherwise { ok: false, error, message }.
function validateKey(rawKey, { skipDuplicateCheck = false, allowKey = "" } = {}) {
  const normalized = normalizeKey(rawKey);
  if (!normalized) {
    return { ok: false, error: "invalid_key", message: "Use letters, numbers, or underscores." };
  }
  if (normalized.length < 3) {
    // "/" + at least 2 chars
    return { ok: false, error: "key_too_short", message: "At least 2 characters after the /." };
  }
  const bareKey = normalized.slice(1);
  if (RESERVED_KEYS.has(bareKey)) {
    return {
      ok: false,
      error: "reserved_key",
      message: `${normalized} is a built-in command. Pick something else.`,
    };
  }
  if (!skipDuplicateCheck) {
    const existing = state.commands.find((c) => c.key === normalized);
    if (existing && existing.key !== allowKey) {
      return {
        ok: false,
        error: "duplicate_key",
        message: `You already have ${normalized}. Edit it instead.`,
      };
    }
  }
  return { ok: true, normalized };
}

function validateExpansion(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    return { ok: false, error: "expansion_required", message: "What should this expand to?" };
  }
  if (trimmed.length > LIMITS.maxExpansionLength) {
    return {
      ok: false,
      error: "expansion_too_long",
      message: `Keep it under ${LIMITS.maxExpansionLength} characters.`,
    };
  }
  return { ok: true, trimmed };
}

// ----------------------------------------------------------------------------
// Escapers
// ----------------------------------------------------------------------------
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttr(s) { return escapeHtml(s).replace(/`/g, "&#96;"); }

// ----------------------------------------------------------------------------
// Public entry
// ----------------------------------------------------------------------------
export async function initShortcutsTab(container) {
  if (!container) return;
  state.rootEl = container;
  container.innerHTML = renderShell();
  bindShellEvents();
  await loadCommands();
  renderList();
}

// ----------------------------------------------------------------------------
// Data
// ----------------------------------------------------------------------------
async function loadCommands() {
  const contact = getCurrentContact();
  if (!contact) {
    state.commands = [];
    return;
  }
  state.loading = true;
  setLoading(true);
  try {
    const r = await apiRequest(
      `/api/user/quick-commands?contact=${encodeURIComponent(contact)}`
    );
    state.commands = Array.isArray(r?.commands) ? r.commands.slice() : [];
    if (r?.limits) {
      LIMITS.maxKeyLength = r.limits.maxKeyLength ?? LIMITS.maxKeyLength;
      LIMITS.maxExpansionLength = r.limits.maxExpansionLength ?? LIMITS.maxExpansionLength;
      LIMITS.maxCommandsPerUser = r.limits.maxCommandsPerUser ?? LIMITS.maxCommandsPerUser;
    }
  } catch (e) {
    console.warn("shortcuts load failed:", e);
    state.commands = [];
  } finally {
    state.loading = false;
    setLoading(false);
  }
}

async function saveCommand({ key, expansion }) {
  const contact = getCurrentContact();
  if (!contact) throw new Error("Sign in to manage shortcuts.");
  return apiRequest(`/api/user/quick-commands`, {
    method: "POST",
    body: JSON.stringify({ contact, key, expansion }),
  });
}

async function deleteCommand(key) {
  const contact = getCurrentContact();
  if (!contact) throw new Error("Sign in to manage shortcuts.");
  return apiRequest(`/api/user/quick-commands`, {
    method: "DELETE",
    body: JSON.stringify({ contact, key }),
  });
}

// ----------------------------------------------------------------------------
// Rendering — shell
// ----------------------------------------------------------------------------
function renderShell() {
  return `
    <div class="shortcuts-tab">
      <div class="shortcuts-toolbar">
        <div class="shortcuts-count" id="shortcutsCount">—</div>
        <button type="button" class="btn-primary" id="shortcutsNewBtn">+ New shortcut</button>
      </div>
      <p class="shortcuts-tip">
        Type a shortcut on its own (<code>/coffee</code>) or follow it with extra text
        (<code>/coffee with 2 sugars</code>) — both work. Anything after the alias gets
        appended before the bot parser runs.
      </p>
      <div id="shortcutsListHost" class="shortcuts-list-host" aria-live="polite"></div>
    </div>
  `;
}

function bindShellEvents() {
  state.rootEl?.querySelector("#shortcutsNewBtn")?.addEventListener("click", () => {
    openModal("create");
  });
}

function setLoading(loading) {
  const host = state.rootEl?.querySelector("#shortcutsListHost");
  if (!host) return;
  if (loading && !state.commands.length) {
    host.innerHTML = `<p class="shortcuts-loading">Loading your shortcuts…</p>`;
  }
}

// ----------------------------------------------------------------------------
// Rendering — list
// ----------------------------------------------------------------------------
function renderList() {
  const host = state.rootEl?.querySelector("#shortcutsListHost");
  if (!host) return;
  updateCount();

  if (!state.commands.length) {
    host.innerHTML = renderEmptyState();
    bindStarterEvents();
    return;
  }

  // Sort: most-used first, then alphabetical.
  const sorted = state.commands
    .slice()
    .sort((a, b) => {
      const ua = Number(a.usageCount) || 0;
      const ub = Number(b.usageCount) || 0;
      if (ua !== ub) return ub - ua;
      return String(a.key).localeCompare(String(b.key));
    });

  host.innerHTML = `
    <table class="shortcuts-table" aria-label="Your shortcuts">
      <thead>
        <tr>
          <th class="shortcuts-th-key">Shortcut</th>
          <th>Expands to</th>
          <th class="shortcuts-th-usage" title="How many times you've used it">Used</th>
          <th class="shortcuts-th-actions" aria-label="Actions"></th>
        </tr>
      </thead>
      <tbody>
        ${sorted
          .map(
            (c) => `
          <tr data-key="${escapeAttr(c.key)}">
            <td class="shortcuts-td-key"><code>${escapeHtml(c.key)}</code></td>
            <td class="shortcuts-td-expansion">${escapeHtml(c.expansion)}</td>
            <td class="shortcuts-td-usage">${Number(c.usageCount) || 0}</td>
            <td class="shortcuts-td-actions">
              <button type="button" class="shortcuts-action-btn" data-action="copy" data-key="${escapeAttr(c.key)}" title="Copy shortcut">⧉</button>
              <button type="button" class="shortcuts-action-btn" data-action="edit" data-key="${escapeAttr(c.key)}" title="Edit">✎</button>
              <button type="button" class="shortcuts-action-btn shortcuts-action-danger" data-action="delete" data-key="${escapeAttr(c.key)}" title="Delete">×</button>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <details class="shortcuts-starter-fold">
      <summary>+ Browse starter shortcuts (${STARTER_SHORTCUTS.length})</summary>
      ${renderStarterGallery()}
    </details>
  `;
  bindRowEvents();
  bindStarterEvents();
}

function updateCount() {
  const el = state.rootEl?.querySelector("#shortcutsCount");
  if (!el) return;
  const n = state.commands.length;
  el.textContent =
    n === 0
      ? "0 shortcuts"
      : `${n} of ${LIMITS.maxCommandsPerUser} shortcut${n === 1 ? "" : "s"}`;
}

function renderEmptyState() {
  return `
    <div class="shortcuts-empty">
      <p class="shortcuts-empty-title">No shortcuts yet.</p>
      <p class="shortcuts-empty-sub">Create one to save typing on things you log every day. Tap any starter below to add it instantly.</p>
    </div>
    ${renderStarterGallery()}
  `;
}

function renderStarterGallery() {
  const existing = new Set(state.commands.map((c) => c.key));
  const groups = {};
  STARTER_SHORTCUTS.forEach((s) => {
    if (!groups[s.group]) groups[s.group] = [];
    groups[s.group].push(s);
  });
  return `
    <div class="shortcuts-gallery">
      ${Object.entries(groups)
        .map(
          ([group, items]) => `
        <section class="shortcuts-gallery-group">
          <h4>${escapeHtml(group)}</h4>
          <div class="shortcuts-gallery-grid">
            ${items
              .map((s) => {
                const added = existing.has(s.key);
                return `
                  <button type="button"
                          class="shortcuts-gallery-card ${added ? "is-added" : ""}"
                          data-starter-key="${escapeAttr(s.key)}"
                          data-starter-expansion="${escapeAttr(s.expansion)}"
                          ${added ? "disabled" : ""}>
                    <code class="shortcuts-gallery-key">${escapeHtml(s.key)}</code>
                    <span class="shortcuts-gallery-expansion">${escapeHtml(s.expansion)}</span>
                    <span class="shortcuts-gallery-add">${added ? "✓ Added" : "+ Add"}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </section>
      `
        )
        .join("")}
    </div>
  `;
}

// ----------------------------------------------------------------------------
// Events
// ----------------------------------------------------------------------------
function bindRowEvents() {
  state.rootEl?.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      const action = btn.dataset.action;
      const key = btn.dataset.key;
      if (!key) return;
      if (action === "copy") {
        try {
          await navigator.clipboard.writeText(key);
          flashBtn(btn, "✓");
        } catch {
          /* clipboard may be unavailable */
        }
      } else if (action === "edit") {
        openModal("edit", key);
      } else if (action === "delete") {
        if (confirm(`Delete ${key}?`)) {
          await handleDelete(key);
        }
      }
    });
  });
  // Row click → edit (skipping the action-cell so buttons still work alone)
  state.rootEl?.querySelectorAll("tr[data-key]").forEach((row) => {
    row.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-action]")) return;
      const key = row.dataset.key;
      if (key) openModal("edit", key);
    });
  });
}

function bindStarterEvents() {
  state.rootEl?.querySelectorAll("[data-starter-key]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.starterKey;
      const expansion = btn.dataset.starterExpansion;
      if (!key || !expansion) return;
      btn.disabled = true;
      try {
        await handleSave({ key, expansion });
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function flashBtn(btn, text) {
  const orig = btn.textContent;
  btn.textContent = text;
  setTimeout(() => {
    btn.textContent = orig;
  }, 900);
}

// ----------------------------------------------------------------------------
// Save / Delete
// ----------------------------------------------------------------------------
async function handleSave({ key, expansion, oldKey }) {
  const keyResult = validateKey(key, { allowKey: oldKey || "" });
  if (!keyResult.ok) {
    alert(keyResult.message);
    return false;
  }
  const expResult = validateExpansion(expansion);
  if (!expResult.ok) {
    alert(expResult.message);
    return false;
  }
  if (
    state.commands.length >= LIMITS.maxCommandsPerUser &&
    !state.commands.find((c) => c.key === keyResult.normalized) &&
    !oldKey
  ) {
    alert(`You've hit the ${LIMITS.maxCommandsPerUser}-shortcut limit. Delete one before adding a new one.`);
    return false;
  }
  try {
    // If renaming, delete the old key first so we don't end up with two rows.
    if (oldKey && oldKey !== keyResult.normalized) {
      try {
        await deleteCommand(oldKey);
      } catch {
        /* ignore — maybe already gone */
      }
    }
    await saveCommand({ key: keyResult.normalized, expansion: expResult.trimmed });
    await loadCommands();
    renderList();
    closeModal();
    return true;
  } catch (e) {
    handleApiError(e);
    return false;
  }
}

async function handleDelete(key) {
  try {
    await deleteCommand(key);
    state.commands = state.commands.filter((c) => c.key !== key);
    renderList();
  } catch (e) {
    handleApiError(e);
  }
}

function handleApiError(e) {
  // Map server error codes to friendly strings (mirrors backend section 7).
  const messages = {
    invalid_key: "That shortcut name isn't valid. Use letters, numbers, or underscores.",
    key_too_short: "Shortcut needs at least 2 characters after the /.",
    reserved_key: e.note || "That's a built-in command. Pick something else.",
    expansion_required: "Add what the shortcut should expand to.",
    limit_reached: `You've hit the ${LIMITS.maxCommandsPerUser}-shortcut limit. Delete one before adding a new one.`,
    not_found: "That shortcut wasn't found — maybe it's already gone.",
  };
  alert(messages[e.code] || e.message || "Couldn't save. Try again in a moment.");
}

// ----------------------------------------------------------------------------
// Create / Edit modal
// ----------------------------------------------------------------------------
function openModal(mode, key = "") {
  state.modalMode = mode;
  state.editingKey = mode === "edit" ? key : null;
  const existing = mode === "edit" ? state.commands.find((c) => c.key === key) : null;
  const initialKey = existing?.key || "";
  const initialExpansion = existing?.expansion || "";

  const overlay = document.createElement("div");
  overlay.className = "shortcuts-modal-overlay";
  overlay.id = "shortcutsModal";
  overlay.innerHTML = `
    <div class="shortcuts-modal" role="dialog" aria-modal="true" aria-labelledby="shortcutsModalTitle">
      <header class="shortcuts-modal-head">
        <h3 id="shortcutsModalTitle">${mode === "edit" ? "Edit shortcut" : "New shortcut"}</h3>
        <button type="button" class="shortcuts-modal-close" id="shortcutsModalClose" aria-label="Close">×</button>
      </header>

      <form id="shortcutsModalForm" class="shortcuts-modal-form" novalidate>
        <label class="shortcuts-field">
          <span class="shortcuts-field-label">Shortcut</span>
          <span class="shortcuts-field-help">What you'll type. Letters, numbers, underscores. We'll add the / for you.</span>
          <div class="shortcuts-field-input-wrap">
            <span class="shortcuts-field-prefix">/</span>
            <input
              type="text"
              id="shortcutsKeyInput"
              class="shortcuts-field-input"
              maxlength="${LIMITS.maxKeyLength - 1}"
              autocomplete="off"
              spellcheck="false"
              autocapitalize="none"
              placeholder="coffee"
              value="${escapeAttr((initialKey || "").replace(/^\//, ""))}"
            />
          </div>
          <span class="shortcuts-field-error" id="shortcutsKeyError" role="status"></span>
        </label>

        <label class="shortcuts-field">
          <span class="shortcuts-field-label">Expands to</span>
          <span class="shortcuts-field-help">What gets sent to the bot when you type the shortcut. Anything you'd normally text — food, workouts, supplements, water, weight, all at once.</span>
          <textarea
            id="shortcutsExpansionInput"
            class="shortcuts-field-textarea"
            maxlength="${LIMITS.maxExpansionLength}"
            placeholder="black coffee 8 oz"
            rows="3"
          >${escapeHtml(initialExpansion)}</textarea>
          <div class="shortcuts-field-counter">
            <span id="shortcutsExpansionCount">${initialExpansion.length}</span> / ${LIMITS.maxExpansionLength}
          </div>
          <span class="shortcuts-field-error" id="shortcutsExpansionError" role="status"></span>
        </label>

        <div class="shortcuts-modal-foot">
          ${mode === "edit" ? `<button type="button" class="btn-danger" id="shortcutsModalDelete">Delete</button>` : ""}
          <div class="shortcuts-modal-foot-right">
            <button type="button" class="btn-secondary" id="shortcutsModalCancel">Cancel</button>
            <button type="submit" class="btn-primary" id="shortcutsModalSave">${mode === "edit" ? "Save" : "Create"}</button>
          </div>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  bindModalEvents(overlay, { oldKey: initialKey });
  // Focus the key input on open
  setTimeout(() => overlay.querySelector("#shortcutsKeyInput")?.focus(), 30);
}

function closeModal() {
  document.getElementById("shortcutsModal")?.remove();
  state.modalMode = null;
  state.editingKey = null;
}

function bindModalEvents(overlay, { oldKey }) {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  overlay.querySelector("#shortcutsModalClose")?.addEventListener("click", closeModal);
  overlay.querySelector("#shortcutsModalCancel")?.addEventListener("click", closeModal);

  const keyInput = overlay.querySelector("#shortcutsKeyInput");
  const keyError = overlay.querySelector("#shortcutsKeyError");
  const expInput = overlay.querySelector("#shortcutsExpansionInput");
  const expCount = overlay.querySelector("#shortcutsExpansionCount");
  const expError = overlay.querySelector("#shortcutsExpansionError");

  const refreshKeyState = () => {
    const raw = keyInput.value;
    const v = validateKey(raw, { allowKey: oldKey });
    if (v.ok) {
      keyError.textContent = "";
      keyInput.classList.remove("is-error");
    } else {
      keyError.textContent = v.message;
      keyInput.classList.add("is-error");
    }
  };
  const refreshExpState = () => {
    const raw = expInput.value;
    expCount.textContent = raw.length;
    expCount.parentElement.classList.toggle("is-warn", raw.length > LIMITS.maxExpansionLength * 0.8);
    expCount.parentElement.classList.toggle("is-error", raw.length >= LIMITS.maxExpansionLength);
    const v = validateExpansion(raw);
    if (v.ok) {
      expError.textContent = "";
      expInput.classList.remove("is-error");
    } else {
      expError.textContent = v.message;
      expInput.classList.add("is-error");
    }
  };
  keyInput.addEventListener("input", refreshKeyState);
  expInput.addEventListener("input", refreshExpState);

  overlay.querySelector("#shortcutsModalDelete")?.addEventListener("click", async () => {
    if (!oldKey) return;
    if (confirm(`Delete ${oldKey}?`)) {
      await handleDelete(oldKey);
      closeModal();
    }
  });

  overlay.querySelector("#shortcutsModalForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtn = overlay.querySelector("#shortcutsModalSave");
    if (saveBtn) saveBtn.disabled = true;
    await handleSave({
      key: keyInput.value,
      expansion: expInput.value,
      oldKey,
    });
    if (saveBtn) saveBtn.disabled = false;
  });
}
