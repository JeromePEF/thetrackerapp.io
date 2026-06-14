// Public leaderboard page (/leaderboard).
//
// Calls GET /api/leaderboard?category=&metric=&range=&limit=&offset=
// (See PERSONAL_TRAINERS_AND_LEADERBOARD_SPEC.txt → PART C.)
//
// Every name links to /@<username> (a public profile page).

const API_BASE = "https://api.thetrackerapp.io";

const CATEGORIES = [
  { key: "strength",     label: "Strength",     metrics: ["bench","squat","deadlift"] },
  { key: "calisthenics", label: "Calisthenics", metrics: ["pushups","pullups","squats","dips"] },
  { key: "streaks",      label: "Streaks",      metrics: ["days"] },
  { key: "steps",        label: "Steps",        metrics: [] },
  { key: "calories",     label: "Calories",     metrics: [] },
  { key: "sleep",        label: "Sleep",        metrics: [] },
  { key: "miles",        label: "Miles",        metrics: [] },
];

const state = {
  category: "strength",
  metric: "bench",
  range: "30d",
  offset: 0,
  limit: 50,
  data: null,
};

const elsByQuery = {
  categories: document.querySelector(".lb-categories"),
  metrics:    document.querySelector(".lb-metrics"),
  ranges:     document.querySelectorAll(".lb-range-btn"),
  body:       document.getElementById("leaderboardBody"),
  prev:       document.getElementById("lbPrevBtn"),
  next:       document.getElementById("lbNextBtn"),
  pageLabel:  document.getElementById("lbPageLabel"),
};

init();

function init() {
  renderCategoryTabs();
  renderMetricTabs();

  elsByQuery.ranges.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.range = btn.dataset.range;
      state.offset = 0;
      elsByQuery.ranges.forEach((b) => b.classList.toggle("active", b === btn));
      void load();
    });
  });

  elsByQuery.prev?.addEventListener("click", () => {
    if (state.offset <= 0) return;
    state.offset = Math.max(0, state.offset - state.limit);
    void load();
  });

  elsByQuery.next?.addEventListener("click", () => {
    if (!state.data?.entries?.length) return;
    state.offset += state.limit;
    void load();
  });

  // Honour deep-links: /leaderboard?category=streaks
  const params = new URLSearchParams(location.search);
  if (params.get("category")) state.category = params.get("category");
  if (params.get("metric")) state.metric = params.get("metric");
  if (params.get("range")) state.range = params.get("range");
  syncRangeUI();
  renderCategoryTabs();
  renderMetricTabs();

  void load();
}

function syncRangeUI() {
  elsByQuery.ranges.forEach((b) => b.classList.toggle("active", b.dataset.range === state.range));
}

function renderCategoryTabs() {
  if (!elsByQuery.categories) return;
  elsByQuery.categories.innerHTML = CATEGORIES.map(
    (c) => `<button type="button" class="${c.key === state.category ? "active" : ""}" data-cat="${c.key}">${c.label}</button>`
  ).join("");
  elsByQuery.categories.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.category = btn.dataset.cat;
      const cat = CATEGORIES.find((c) => c.key === state.category);
      state.metric = cat?.metrics?.[0] || "";
      state.offset = 0;
      renderCategoryTabs();
      renderMetricTabs();
      void load();
    });
  });
}

function renderMetricTabs() {
  if (!elsByQuery.metrics) return;
  const cat = CATEGORIES.find((c) => c.key === state.category);
  const metrics = cat?.metrics || [];
  if (metrics.length === 0) {
    elsByQuery.metrics.innerHTML = "";
    return;
  }
  elsByQuery.metrics.innerHTML = metrics.map(
    (m) => `<button type="button" class="${m === state.metric ? "active" : ""}" data-metric="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`
  ).join("");
  elsByQuery.metrics.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.metric = btn.dataset.metric;
      state.offset = 0;
      renderMetricTabs();
      void load();
    });
  });
}

async function load() {
  if (!elsByQuery.body) return;
  elsByQuery.body.innerHTML = `<tr><td colspan="6" class="lb-loading">Loading leaderboard…</td></tr>`;
  try {
    const params = new URLSearchParams({
      category: state.category,
      range: state.range,
      limit: String(state.limit),
      offset: String(state.offset),
    });
    if (state.metric) params.set("metric", state.metric);
    const res = await fetch(`${API_BASE}/api/leaderboard?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error || "Bad response");
    state.data = data;
    renderRows(data);
    updatePagination(data);
    // Update URL state without page reload
    const q = new URLSearchParams({ category: state.category, range: state.range });
    if (state.metric) q.set("metric", state.metric);
    history.replaceState({}, "", `/leaderboard?${q.toString()}`);
  } catch (err) {
    elsByQuery.body.innerHTML = `<tr><td colspan="6" class="lb-empty">Leaderboard unavailable: ${escapeHtml(err.message)}</td></tr>`;
    updatePagination({ entries: [], total: 0 });
  }
}

function renderRows(data) {
  const entries = data.entries || [];
  if (!entries.length) {
    elsByQuery.body.innerHTML = `<tr><td colspan="6" class="lb-empty">No rows yet — try another category or range.</td></tr>`;
    return;
  }
  elsByQuery.body.innerHTML = entries.map(renderRow).join("");
}

function renderRow(entry) {
  const rank = entry.rank ?? "—";
  const username = entry.username || "";
  const displayName = entry.displayName || entry.username || "User";
  const initial = (displayName.replace(/[^\p{L}\p{N}]/gu, " ").trim()[0] || "?").toUpperCase();
  const valueLabel = entry.valueLabel || `${formatNum(entry.score)}${entry.unit ? ` ${entry.unit}` : ""}`;
  const flair = entry.flair || {};
  const flairPill = flair.primary
    ? `<span class="flair-pill rarity-${flair.rarity || "common"}" style="${flair.color ? `--flair-color:${flair.color};` : ""}">${escapeHtml(flair.primary)}</span>`
    : "";
  const badges = Array.isArray(flair.badges)
    ? `<span class="flair-badges">${flair.badges.slice(0, 3).map((b) => `<span title="${escapeHtml(typeof b === "string" ? b : b.label || b.id)}">${escapeHtml(typeof b === "string" ? "🏅" : b.emoji || "🏅")}</span>`).join("")}</span>`
    : "";
  const pt = entry.personalTrainer
    ? `<a class="coach-link" href="/@${encodeURIComponent(entry.personalTrainer.username)}">@${escapeHtml(entry.personalTrainer.username)}</a>`
    : `<span class="coach-link">—</span>`;
  const trend = entry.trend
    ? `<span class="trend-delta ${/^[-]/.test(entry.trend) ? "down" : /^[+]/.test(entry.trend) ? "up" : ""}">${escapeHtml(entry.trend)}</span>`
    : "";

  return `
    <tr>
      <td class="col-rank rank-${rank}"><span class="rank-medal">${rank}</span></td>
      <td class="col-name">
        <a class="athlete-cell" href="/@${encodeURIComponent(username)}">
          <span class="athlete-avatar">${escapeHtml(initial)}</span>
          <span>
            <span class="athlete-name">${escapeHtml(displayName)}</span>
            <span class="athlete-handle">@${escapeHtml(username)}</span>
          </span>
        </a>
      </td>
      <td class="col-flair">${flairPill}${badges}</td>
      <td class="col-coach">${pt}</td>
      <td class="col-trend">${trend}</td>
      <td class="col-value">${escapeHtml(valueLabel)}</td>
    </tr>
  `;
}

function updatePagination(data) {
  const total = data?.total || 0;
  const page = Math.floor(state.offset / state.limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / state.limit));
  elsByQuery.pageLabel.textContent = `Page ${page} of ${totalPages || 1} · ${total.toLocaleString()} athletes`;
  elsByQuery.prev.disabled = state.offset <= 0;
  elsByQuery.next.disabled = state.offset + state.limit >= total;
}

function formatNum(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
