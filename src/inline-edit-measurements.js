// Inline-edit handler for the dashboard Body Measurements panel.
//
// Walks the panel after it has been rendered and turns every element that
// carries `data-edit="..."` into a click-to-edit field. Saves changes to the
// backend via:
//
//   PATCH /api/user/profile          – data-edit="profile"
//   POST  /api/user/measurements     – data-edit="measurement"
//   POST  /api/user/journals/:part   – data-edit="journal"
//
// See BACKEND_TODO.md → "Body Measurements & Journals" for the full contract.

const API_BASE = "https://api.thetrackerapp.io";
const GOAL_OPTIONS = ["Maintain", "Lose", "Gain", "Recomp", "Bulk", "Cut"];

// The dashboard stores the session as JSON at `tracker.auth.session`:
//   { "token": "...", "expiresAt": "..." }
// Extract the raw token for the Authorization header.
function getAuthToken() {
  try {
    const raw = localStorage.getItem("tracker.auth.session");
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      const token = parsed && (parsed.token || parsed.accessToken);
      if (token) return String(token).trim();
    } catch {
      /* fall through – value might already be a plain token */
    }
    return String(raw).trim();
  } catch {
    return "";
  }
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
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

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toIsoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function readActiveMeasurementDate(scope) {
  const dateEl = scope.querySelector('[data-edit="measurement"][data-field="date"]');
  if (dateEl) {
    const iso = toIsoDate(dateEl.textContent.trim());
    if (iso) return iso;
  }
  return todayIso();
}

function readCurrentValue(el, type) {
  const text = (el.querySelector(".value")?.textContent || el.textContent || "").trim();
  if (!text || text === "--") return null;
  if (type === "number") {
    const n = parseFloat(text);
    return Number.isNaN(n) ? null : n;
  }
  return text;
}

function renderDisplayValue(value, type, unit, el) {
  if (type === "goal") {
    const lower = String(value).toLowerCase();
    el.classList.remove("lose", "gain", "maintain", "recomp", "bulk", "cut");
    el.classList.add(lower);
    return escapeHtml(String(value));
  }
  if (type === "date") {
    return escapeHtml(formatDate(value) || String(value));
  }
  if (el.classList.contains("measurement-value")) {
    return `<span class="value">${escapeHtml(String(value))}</span><span class="unit">${escapeHtml(unit || "")}</span>`;
  }
  return escapeHtml(String(value));
}

async function saveField(editKind, field, value, scope) {
  if (editKind === "profile") {
    return apiRequest("/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ [field]: value }),
    });
  }
  // measurement
  const date = readActiveMeasurementDate(scope);
  return apiRequest("/api/user/measurements", {
    method: "POST",
    body: JSON.stringify({ date, [field]: value }),
  });
}

function startInlineEdit(el, scope) {
  const editKind = el.dataset.edit;
  if (editKind === "journal") return startJournalEdit(el);

  const field = el.dataset.field;
  const type = el.dataset.type || "number";
  const unit = el.dataset.unit || "";

  const originalHtml = el.innerHTML;
  const currentValue = readCurrentValue(el, type);

  let input;
  if (type === "goal") {
    input = document.createElement("select");
    input.className = "inline-edit-input";
    GOAL_OPTIONS.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      if (currentValue && opt.toLowerCase() === String(currentValue).toLowerCase()) o.selected = true;
      input.appendChild(o);
    });
  } else if (type === "date") {
    input = document.createElement("input");
    input.className = "inline-edit-input";
    input.type = "date";
    input.value = toIsoDate(currentValue) || todayIso();
  } else {
    input = document.createElement("input");
    input.className = "inline-edit-input";
    input.type = "number";
    input.inputMode = "decimal";
    input.step = "0.1";
    input.placeholder = unit ? `value (${unit})` : "value";
    input.value = currentValue ?? "";
  }
  input.setAttribute("aria-label", el.getAttribute("aria-label") || el.dataset.field || "Edit");

  el.innerHTML = "";
  el.appendChild(input);
  if (type === "number" && unit) {
    const u = document.createElement("span");
    u.className = "unit";
    u.textContent = unit;
    el.appendChild(u);
  }
  input.focus();
  if (input.select) input.select();

  let settled = false;
  const commit = async () => {
    if (settled) return;
    settled = true;
    const raw = input.value;
    if (raw === "" || raw === null || raw === undefined) {
      el.innerHTML = originalHtml;
      return;
    }
    const value = type === "number" ? Number(raw) : raw;
    if (type === "number" && (Number.isNaN(value) || value < 0)) {
      el.innerHTML = originalHtml;
      return;
    }
    try {
      await saveField(editKind, field, value, scope);
      el.innerHTML = renderDisplayValue(value, type, unit, el);
      el.classList.add("just-saved");
      setTimeout(() => el.classList.remove("just-saved"), 700);
    } catch (e) {
      el.innerHTML = originalHtml;
      el.classList.add("save-failed");
      setTimeout(() => el.classList.remove("save-failed"), 1200);
      console.warn("Save failed:", e);
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

function startJournalEdit(el) {
  const partKey = el.dataset.part;
  const display = el.dataset.display || partKey;
  const contentEl = el.querySelector(".journal-content");
  const dateEl = el.querySelector(".journal-date");
  if (!contentEl) return;

  const currentText = contentEl.querySelector("em") ? "" : contentEl.textContent.trim();
  const textarea = document.createElement("textarea");
  textarea.className = "inline-edit-textarea";
  textarea.rows = 3;
  textarea.placeholder = `How does your ${display.toLowerCase()} look and feel?`;
  textarea.value = currentText;

  contentEl.replaceChildren(textarea);
  textarea.focus();

  let settled = false;
  const commit = async () => {
    if (settled) return;
    settled = true;
    const value = textarea.value.trim();

    if (!value && !currentText) {
      contentEl.innerHTML = `<em>Click to add assessment...</em>`;
      return;
    }
    if (!value && currentText) {
      try {
        await apiRequest(`/api/user/journals/${encodeURIComponent(partKey)}`, { method: "DELETE" });
        contentEl.innerHTML = `<em>Click to add assessment...</em>`;
        if (dateEl) dateEl.remove();
      } catch {
        contentEl.textContent = currentText;
      }
      return;
    }
    try {
      const result = await apiRequest(`/api/user/journals/${encodeURIComponent(partKey)}`, {
        method: "POST",
        body: JSON.stringify({ content: value }),
      });
      contentEl.textContent = value;
      const updatedAt = (result && (result.date || result.updatedAt)) || new Date().toISOString();
      if (dateEl) {
        dateEl.textContent = `Updated ${formatDate(updatedAt)}`;
      } else {
        const span = document.createElement("span");
        span.className = "journal-date";
        span.textContent = `Updated ${formatDate(updatedAt)}`;
        el.appendChild(span);
      }
      el.classList.add("just-saved");
      setTimeout(() => el.classList.remove("just-saved"), 700);
    } catch (e) {
      contentEl.textContent = currentText;
      el.classList.add("save-failed");
      setTimeout(() => el.classList.remove("save-failed"), 1200);
      console.warn("Journal save failed:", e);
    }
  };

  textarea.addEventListener("blur", commit);
  textarea.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      textarea.blur();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      settled = true;
      contentEl.innerHTML = currentText ? escapeHtml(currentText) : `<em>Click to add assessment...</em>`;
    }
  });
}

// Public: populate the Body Measurements panel from a backend response shaped
// like `GET /api/user/measurements` (see BACKEND_TODO.md). Safe to call before
// or after attachInlineEditMeasurements; we only write to elements that exist.
export function hydrateInlineEditMeasurements(data = {}, scope = document) {
  if (!scope) return;
  const latest =
    (Array.isArray(data.measurements) && data.measurements[0]) ||
    (data.latest && typeof data.latest === "object" ? data.latest : null);
  if (latest) {
    scope.querySelectorAll('[data-edit="measurement"], [data-edit="profile"]').forEach((el) => {
      const field = el.dataset.field;
      if (!field) return;
      const value = latest[field];
      if (value === undefined || value === null || value === "") return;
      const type = el.dataset.type || "number";
      const unit = el.dataset.unit || "";
      el.innerHTML = renderDisplayValue(value, type, unit, el);
    });
  }
  if (data.goal) {
    const goalEl = scope.querySelector('[data-edit="profile"][data-field="goal"]');
    if (goalEl) goalEl.innerHTML = renderDisplayValue(data.goal, "goal", "", goalEl);
  }
  if (data.journals && typeof data.journals === "object") {
    Object.entries(data.journals).forEach(([partKey, entry]) => {
      const el = scope.querySelector(`[data-edit="journal"][data-part="${CSS.escape(partKey)}"]`);
      if (!el || !entry) return;
      const contentEl = el.querySelector(".journal-content");
      if (contentEl && entry.content) {
        contentEl.textContent = entry.content;
      }
      if (entry.date) {
        let dateEl = el.querySelector(".journal-date");
        if (!dateEl) {
          dateEl = document.createElement("span");
          dateEl.className = "journal-date";
          el.appendChild(dateEl);
        }
        dateEl.textContent = `Updated ${formatDate(entry.date)}`;
      }
    });
  }
}

// Public: attach inline editing to every [data-edit] element inside `scope`.
// Safe to call multiple times – we tag elements with `.inline-edit-bound` to
// prevent double-wiring after the dashboard re-renders.
export function attachInlineEditMeasurements(scope = document) {
  if (!scope) return;
  const elements = scope.querySelectorAll("[data-edit]");
  elements.forEach((el) => {
    if (el.dataset.inlineEditBound === "1") return;
    el.dataset.inlineEditBound = "1";
    el.classList.add("editable");
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    if (!el.hasAttribute("role")) el.setAttribute("role", "button");

    el.addEventListener("click", (ev) => {
      if (el.querySelector("input, textarea, select")) return;
      // Inside a journal entry only the content paragraph should trigger edit,
      // not the date span (which contains a non-interactive timestamp).
      if (ev.target.closest(".journal-date")) return;
      ev.preventDefault();
      startInlineEdit(el, scope);
    });
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        startInlineEdit(el, scope);
      }
    });
  });
}

export default attachInlineEditMeasurements;
