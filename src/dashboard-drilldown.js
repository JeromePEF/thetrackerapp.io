// Click-to-drill-down modal for the Stats tab.
//
// Two flavours so far:
//   * `openNutritionDay({ date, fallback })`
//       Fetches GET /api/user/nutrition/day?contact=<u>&date=YYYY-MM-DD and
//       shows every food entry that contributed to the day's calorie total.
//       Lets users delete individual entries (calls DELETE /api/user/nutrition/entry/:id).
//       Falls back to a "tracked X entries from <sources>" summary when the
//       new endpoint isn't implemented yet.
//
//   * `openMetricEntries({ key, label, unit, points })`
//       Lists every row the backend returned for a metric (e.g. weight),
//       complete with `source`, `id`, and the raw string. Users can spot
//       suspicious rows (like an old 175 lb sync row) and delete them via
//       DELETE /api/user/measurements/<id>.

const API_BASE = "https://api.thetrackerapp.io";

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

async function api(path, options = {}) {
  const token = getAuthToken();
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = `${API_BASE}${path}${path.includes("?") ? "&" : "?"}_=${Date.now()}`;
  const res = await fetch(url, { ...options, headers, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `API ${res.status}`);
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

function fmtTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function fmtDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// ---------- modal shell ----------

let modalEl = null;
function ensureShell() {
  if (modalEl) return modalEl;
  modalEl = document.createElement("div");
  modalEl.className = "tracker-modal";
  modalEl.setAttribute("role", "dialog");
  modalEl.setAttribute("aria-modal", "true");
  modalEl.hidden = true;
  modalEl.innerHTML = `
    <div class="tracker-modal-backdrop" data-action="close"></div>
    <div class="tracker-modal-window">
      <header class="tracker-modal-head">
        <h2 id="trackerModalTitle">Details</h2>
        <button type="button" class="tracker-modal-close" data-action="close" aria-label="Close">×</button>
      </header>
      <div class="tracker-modal-body" id="trackerModalBody"></div>
    </div>
  `;
  document.body.appendChild(modalEl);
  modalEl.addEventListener("click", (ev) => {
    if (ev.target.dataset.action === "close") closeModal();
  });
  document.addEventListener("keydown", (ev) => {
    if (!modalEl.hidden && ev.key === "Escape") closeModal();
  });
  return modalEl;
}

function openModal(title, bodyHtml) {
  const m = ensureShell();
  m.querySelector("#trackerModalTitle").textContent = title;
  m.querySelector("#trackerModalBody").innerHTML = bodyHtml;
  m.hidden = false;
  document.body.classList.add("tracker-modal-open");
  return m;
}

function setModalBody(html) {
  const body = modalEl?.querySelector("#trackerModalBody");
  if (body) body.innerHTML = html;
}

function closeModal() {
  if (!modalEl) return;
  modalEl.hidden = true;
  document.body.classList.remove("tracker-modal-open");
}

// ---------- NUTRITION DAY DRILL-DOWN ----------

/**
 * Open a modal listing the food entries logged on `date`.
 *
 * @param {string} date    YYYY-MM-DD
 * @param {object} fallback { total, entryCount, sources } — shown if backend
 *        doesn't yet implement /api/user/nutrition/day so users still see
 *        useful context.
 */
export async function openNutritionDay({ date, fallback = {} }) {
  if (!date) return;
  const contact = getContact();
  if (!contact) return;

  openModal(`Calories — ${fmtDate(date)}`, `<p class="tracker-modal-loading">Loading entries…</p>`);

  try {
    const data = await api(
      `/api/user/nutrition/day?contact=${encodeURIComponent(contact)}&date=${encodeURIComponent(date)}`,
    );
    if (!data || data.ok === false) throw new Error(data?.error || "No data");
    setModalBody(renderNutritionDay(data, date));
    bindNutritionDeleteButtons(date, fallback);
    bindNutritionConfidenceToggles();
  } catch (err) {
    // Graceful fallback when the endpoint isn't ready yet.
    setModalBody(renderNutritionFallback(date, fallback, err));
  }
}

function renderNutritionDay(data, date) {
  const totals = data.totals || {};
  const entries = Array.isArray(data.entries) ? data.entries : [];
  if (!entries.length) {
    return `
      <p class="tracker-modal-empty">No food entries logged on ${escapeHtml(fmtDate(date))}.</p>
    `;
  }
  return `
    <div class="drilldown-summary">
      ${renderNutTotal("Calories", totals.calories, "kcal")}
      ${renderNutTotal("Protein", totals.protein, "g")}
      ${renderNutTotal("Carbs", totals.carbs, "g")}
      ${renderNutTotal("Fats", totals.fats, "g")}
    </div>
    <table class="drilldown-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Item</th>
          <th class="num">kcal</th>
          <th class="num">P</th>
          <th class="num">C</th>
          <th class="num">F</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${entries
          .map((e, idx) => {
            const time = fmtTime(e.loggedAt || e.time || e.timestamp);
            const name = escapeHtml(e.name || e.item || e.raw || "Entry");
            const id = escapeHtml(e.id ?? "");
            const source = escapeHtml(
              (e.confidence && e.confidence.source) || e.source || ""
            );
            const conf = normalizeConfidence(e.confidence);
            const confBadge = conf
              ? `<button type="button" class="drilldown-conf-badge is-${conf.level}" data-action="toggle-conf" data-entry-idx="${idx}" aria-expanded="false" aria-controls="conf-${idx}" title="Tap to see how this was estimated">${conf.scorePct}% · ±${conf.plusMinusKcal} kcal</button>`
              : "";
            const confRow = conf
              ? `<tr class="drilldown-conf-row" id="conf-${idx}" hidden>
                  <td colspan="7">
                    <div class="drilldown-conf-panel">
                      <div class="drilldown-conf-head">
                        <span class="drilldown-conf-pill is-${conf.level}">${escapeHtml(conf.level)} confidence · ${conf.scorePct}%</span>
                        ${conf.sourceLabel ? `<span class="drilldown-conf-source">${escapeHtml(conf.sourceLabel)}</span>` : ""}
                      </div>
                      <div class="drilldown-conf-ranges">
                        ${renderRange("Calories", conf.ranges.calories, "kcal")}
                        ${renderRange("Protein", conf.ranges.protein, "g")}
                        ${renderRange("Carbs", conf.ranges.carbs, "g")}
                        ${renderRange("Fats", conf.ranges.fats, "g")}
                      </div>
                      ${conf.explanation ? `<p class="drilldown-conf-explain">${escapeHtml(conf.explanation)}</p>` : ""}
                      ${
                        conf.alternatives && conf.alternatives.length
                          ? `<div class="drilldown-conf-alts"><span class="drilldown-conf-alts-label">Wrong item?</span>${conf.alternatives
                              .map(
                                (a) =>
                                  `<span class="drilldown-conf-alt">${escapeHtml(a.name)}${a.calories != null ? ` · ${Math.round(a.calories)} kcal` : ""}</span>`
                              )
                              .join("")}</div>`
                          : ""
                      }
                    </div>
                  </td>
                </tr>`
              : "";
            return `
            <tr data-entry-id="${id}">
              <td>${time}</td>
              <td>
                <span class="drilldown-item-name">${name}</span>
                ${source ? `<span class="drilldown-source">${source}</span>` : ""}
                ${confBadge}
              </td>
              <td class="num">${formatNum(e.calories)}</td>
              <td class="num">${formatNum(e.protein)}</td>
              <td class="num">${formatNum(e.carbs)}</td>
              <td class="num">${formatNum(e.fats)}</td>
              <td class="num">
                ${id ? `<button type="button" class="drilldown-delete" data-action="delete-nut" data-entry-id="${id}" title="Delete entry">×</button>` : ""}
              </td>
            </tr>
            ${confRow}
          `;
          })
          .join("")}
      </tbody>
    </table>
    <p class="tracker-modal-foot">
      Spot something wrong? Click the × to remove an entry, or tap the confidence
      badge to see how an estimate was made. Changes update your stats immediately.
    </p>
  `;
}

function renderNutTotal(label, value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `
    <div class="drilldown-stat">
      <span class="drilldown-stat-label">${escapeHtml(label)}</span>
      <span class="drilldown-stat-value">${Math.round(n).toLocaleString()}<span class="drilldown-stat-unit">${escapeHtml(unit)}</span></span>
    </div>
  `;
}

// ---------- CONFIDENCE / TRANSPARENCY ----------
// See NUTRITION_DETAIL_BACKEND.txt for the contract. Backend may send either
// a 0..1 `score` or a "high"/"medium"/"low" `level`; we tolerate both and
// fall back to a deterministic level when one isn't present.

const SOURCE_LABELS = {
  natural_language_food: "Natural-language parse",
  barcode: "Barcode scan",
  photo_estimate: "Photo estimate",
  menu_match: "Restaurant menu match",
  user_manual: "Manual entry",
  restaurant_db: "Restaurant database",
  brand_db: "Brand database",
  recipe_compose: "Recipe (sum of ingredients)",
};

function normalizeConfidence(c) {
  if (!c || typeof c !== "object") return null;
  let score = Number(c.score);
  let level = String(c.level || "").toLowerCase();
  if (!Number.isFinite(score)) {
    score = level === "high" ? 0.9 : level === "medium" ? 0.7 : level === "low" ? 0.45 : NaN;
  }
  if (!level) {
    level = score >= 0.85 ? "high" : score >= 0.6 ? "medium" : "low";
  }
  if (!Number.isFinite(score)) return null;
  const ranges = c.ranges || {};
  const calRange = ranges.calories || {};
  const plusMinusKcal = Math.round(
    Number(calRange.plusMinus) ||
      (Number(calRange.high) && Number(calRange.low)
        ? (calRange.high - calRange.low) / 2
        : 0)
  );
  return {
    score,
    scorePct: Math.round(score * 100),
    level,
    plusMinusKcal,
    sourceLabel: SOURCE_LABELS[c.source] || c.source || "",
    explanation: c.explanation || "",
    ranges: {
      calories: ranges.calories,
      protein: ranges.protein,
      carbs: ranges.carbs,
      fats: ranges.fats,
    },
    alternatives: Array.isArray(c.alternativeMatches) ? c.alternativeMatches : [],
  };
}

function renderRange(label, r, unit) {
  if (!r || typeof r !== "object") return "";
  const pm = Number(r.plusMinus);
  const low = Number(r.low);
  const high = Number(r.high);
  const pmStr = Number.isFinite(pm)
    ? `±${Math.round(pm * 10) / 10}`
    : Number.isFinite(low) && Number.isFinite(high)
    ? `${Math.round(low)}–${Math.round(high)}`
    : "";
  if (!pmStr) return "";
  return `
    <div class="drilldown-conf-range">
      <span class="drilldown-conf-range-label">${escapeHtml(label)}</span>
      <span class="drilldown-conf-range-value">${escapeHtml(pmStr)}<span class="drilldown-conf-range-unit"> ${escapeHtml(unit)}</span></span>
    </div>
  `;
}

function bindNutritionConfidenceToggles() {
  modalEl?.querySelectorAll('[data-action="toggle-conf"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = btn.dataset.entryIdx;
      const row = modalEl.querySelector(`#conf-${idx}`);
      if (!row) return;
      const open = !row.hidden;
      row.hidden = open;
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      btn.classList.toggle("is-open", !open);
    });
  });
}

function renderNutritionFallback(date, fallback, err) {
  const sources = Array.isArray(fallback.sources) ? fallback.sources.filter(Boolean) : [];
  return `
    <p class="tracker-modal-empty">
      Detailed per-meal breakdown isn't available from the backend yet.
    </p>
    <div class="drilldown-summary">
      ${fallback.total ? renderNutTotal("Total", fallback.total, "kcal") : ""}
      ${fallback.entryCount ? renderNutTotal("Entries", fallback.entryCount, "") : ""}
    </div>
    ${
      sources.length
        ? `<p class="tracker-modal-foot">Sources for this day: ${sources.map((s) => `<code>${escapeHtml(s)}</code>`).join(", ")}</p>`
        : ""
    }
    <p class="tracker-modal-foot tracker-modal-error">
      Endpoint <code>GET /api/user/nutrition/day?contact=…&amp;date=${escapeHtml(date)}</code>
      not yet implemented on the backend. (${escapeHtml(err?.message || "request failed")})
    </p>
  `;
}

function bindNutritionDeleteButtons(date, fallback) {
  modalEl
    ?.querySelectorAll('[data-action="delete-nut"]')
    .forEach((btn) =>
      btn.addEventListener("click", async () => {
        const id = btn.dataset.entryId;
        if (!id) return;
        if (!confirm("Delete this food entry?")) return;
        btn.disabled = true;
        try {
          await api(`/api/user/nutrition/entry/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          // Re-open to refetch; this also refreshes totals.
          openNutritionDay({ date, fallback });
          // Tell the chart panel to refresh on next view.
          window.dispatchEvent(new CustomEvent("tracker:nutrition-changed", { detail: { date } }));
        } catch (e) {
          btn.disabled = false;
          alert(`Delete failed: ${e?.message || e}`);
        }
      }),
    );
}

// ---------- METRIC ENTRY DRILL-DOWN (weight + body measurements) ----------

/**
 * Open a modal listing every row backend returned for a metric, with source +
 * id + raw value so the user can investigate (e.g. "where did this 175 lb
 * come from?"). Provides a per-row delete if the row has an id.
 *
 * @param {object} opts
 * @param {string} opts.key    The metric key, e.g. "weight"
 * @param {string} opts.label  Display label, e.g. "Weight"
 * @param {string} opts.unit   Unit suffix, e.g. "lb"
 * @param {Array}  opts.points chartData[key] array from /api/chart/data
 */
export function openMetricEntries({ key, label, unit, points }) {
  if (!Array.isArray(points)) points = [];
  const rows = points
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map((p) => {
      const id = p.id ?? p.entryId ?? "";
      const source = p.source || "";
      const raw = p.raw || "";
      return `
      <tr data-entry-id="${escapeHtml(id)}">
        <td>${escapeHtml(fmtDate(p.date))}</td>
        <td class="num">${formatNum(p.value)}<span class="drilldown-stat-unit"> ${escapeHtml(unit || "")}</span></td>
        <td><span class="drilldown-source">${escapeHtml(source || "—")}</span></td>
        <td class="drilldown-raw">${escapeHtml(raw || "")}</td>
        <td class="num">
          ${id ? `<button type="button" class="drilldown-delete" data-action="delete-measure" data-entry-id="${escapeHtml(id)}" data-metric="${escapeHtml(key)}" title="Delete entry">×</button>` : ""}
        </td>
      </tr>
    `;
    })
    .join("");

  const body = points.length
    ? `
    <p class="tracker-modal-sub">Every ${escapeHtml(label.toLowerCase())} entry the backend has for you, newest first. If something here is wrong or wasn't logged by you, delete it with ×.</p>
    <table class="drilldown-table">
      <thead>
        <tr>
          <th>Date</th>
          <th class="num">Value</th>
          <th>Source</th>
          <th>Raw</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `
    : `<p class="tracker-modal-empty">No ${escapeHtml(label.toLowerCase())} entries yet.</p>`;

  openModal(`${label} — all entries`, body);

  modalEl?.querySelectorAll('[data-action="delete-measure"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.entryId;
      const metric = btn.dataset.metric;
      if (!id) return;
      if (!confirm(`Delete this ${metric} entry?`)) return;
      btn.disabled = true;
      try {
        await api(`/api/user/measurements/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        const row = btn.closest("tr");
        if (row) row.remove();
        window.dispatchEvent(
          new CustomEvent("tracker:measurement-changed", { detail: { metric, id } }),
        );
      } catch (e) {
        btn.disabled = false;
        alert(`Delete failed: ${e?.message || e}`);
      }
    });
  });
}

function formatNum(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2).replace(/\.?0+$/, "");
}
