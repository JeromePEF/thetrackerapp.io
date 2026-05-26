// Dashboard Body Measurements Section
// Includes body measurements tracking, progress charts, and narrative journals
//
// All measurement values, goals, height, weight, body fat, date, and journal
// entries are inline-editable. Edits debounce to the backend via:
//   PATCH /api/user/profile          (height, goal)
//   POST  /api/user/measurements     (current-day measurements)
//   POST  /api/user/journals/:part   (qualitative assessments per body part)
// See BACKEND_TODO.md for the complete contract.

const API_BASE = "https://api.thetrackerapp.io";

function getAuthToken() {
  try {
    return localStorage.getItem("tracker.auth.session") || "";
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
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}

// Body measurement types
const BODY_MEASUREMENTS = [
  { id: "weight", label: "Weight", unit: "lb", category: "core" },
  { id: "bodyFat", label: "Body Fat", unit: "%", category: "core" },
  { id: "height", label: "Height", unit: "in", category: "core" },
  { id: "chest", label: "Chest", unit: "in", category: "upper" },
  { id: "shoulders", label: "Shoulders", unit: "in", category: "upper" },
  { id: "bicepL", label: "Bicep (L)", unit: "in", category: "arms" },
  { id: "bicepR", label: "Bicep (R)", unit: "in", category: "arms" },
  { id: "forearmL", label: "Forearm (L)", unit: "in", category: "arms" },
  { id: "forearmR", label: "Forearm (R)", unit: "in", category: "arms" },
  { id: "waist", label: "Waist", unit: "in", category: "core" },
  { id: "abs", label: "Abs", unit: "in", category: "core" },
  { id: "hips", label: "Hips", unit: "in", category: "lower" },
  { id: "glutes", label: "Glutes", unit: "in", category: "lower" },
  { id: "quadL", label: "Quad (L)", unit: "in", category: "legs" },
  { id: "quadR", label: "Quad (R)", unit: "in", category: "legs" },
  { id: "calfL", label: "Calf (L)", unit: "in", category: "legs" },
  { id: "calfR", label: "Calf (R)", unit: "in", category: "legs" },
  { id: "neck", label: "Neck", unit: "in", category: "upper" },
  { id: "lats", label: "Lats", unit: "in", category: "upper" },
  { id: "traps", label: "Traps", unit: "in", category: "upper" },
  { id: "serratusAnterior", label: "Serratus Anterior", unit: "in", category: "upper" },
  { id: "obliques", label: "Obliques", unit: "in", category: "core" },
];

// Tracking metrics for charts
const TRACKING_METRICS = [
  { id: "weight", label: "Weight", unit: "lb", color: "#38ffd3" },
  { id: "calories", label: "Calories", unit: "kcal", color: "#ff7f7f" },
  { id: "protein", label: "Protein", unit: "g", color: "#64b5f6" },
  { id: "carbs", label: "Carbs", unit: "g", color: "#ffb74d" },
  { id: "fats", label: "Fats", unit: "g", color: "#ba68c8" },
  { id: "water", label: "Water", unit: "oz", color: "#4fc3f7" },
  { id: "steps", label: "Steps", unit: "steps", color: "#81c784" },
  { id: "restingHR", label: "Resting HR", unit: "bpm", color: "#ef5350" },
  { id: "creatine", label: "Creatine", unit: "g", color: "#9575cd" },
  { id: "sugars", label: "Sugars", unit: "g", color: "#f48fb1" },
  { id: "sodium", label: "Sodium", unit: "mg", color: "#90a4ae" },
  { id: "cholesterol", label: "Cholesterol", unit: "mg", color: "#ffcc80" },
  { id: "vitamins", label: "Vitamins", unit: "count", color: "#a5d6a7" },
  { id: "minerals", label: "Minerals", unit: "count", color: "#80deea" },
  { id: "tongkatAli", label: "Tongkat Ali", unit: "mg", color: "#ce93d8" },
  { id: "otherSupps", label: "Other Supps", unit: "count", color: "#bcaaa4" },
];

// State
let measurementsData = [];
let journalEntries = {};
let chartData = {};
let selectedChartMetrics = ["weight", "calories", "protein"];

// ============================================
// RENDER BODY MEASUREMENTS SECTION
// ============================================

export function renderBodyMeasurementsSection(container, data = {}) {
  if (!container) return;

  measurementsData = data.measurements || [];
  journalEntries = data.journals || {};

  const latestMeasurement = measurementsData[0] || {};

  container.innerHTML = `
    <section class="body-measurements-section" data-feature="bodyMeasurements">
      <div class="section-header-row">
        <h2>Body Measurements</h2>
        <div class="measurement-actions">
          <button id="addMeasurementBtn" class="btn-secondary">+ Add Measurement</button>
          <button id="viewProgressChartsBtn" class="btn-primary">View Progress Charts</button>
        </div>
      </div>

      <div class="master-overview">
        <div class="overview-stats">
          <div class="overview-stat">
            <span class="stat-label">Height</span>
            <span class="stat-value editable" data-edit="profile" data-field="height" data-type="number" data-unit="in" tabindex="0" role="button" aria-label="Edit height">${latestMeasurement.height || "--"}</span>
          </div>
          <div class="overview-stat">
            <span class="stat-label">Weight</span>
            <span class="stat-value editable" data-edit="measurement" data-field="weight" data-type="number" data-unit="lb" tabindex="0" role="button" aria-label="Edit weight">${latestMeasurement.weight || "--"}</span>
            <span class="stat-delta ${getDeltaClass(data.weightDelta)}">${formatDelta(data.weightDelta)}</span>
          </div>
          <div class="overview-stat">
            <span class="stat-label">Body Fat</span>
            <span class="stat-value editable" data-edit="measurement" data-field="bodyFat" data-type="number" data-unit="%" tabindex="0" role="button" aria-label="Edit body fat">${latestMeasurement.bodyFat || "--"}</span>
          </div>
          <div class="overview-stat">
            <span class="stat-label">Goal</span>
            <span class="stat-value goal-badge editable ${data.goal?.toLowerCase() || ""}" data-edit="profile" data-field="goal" data-type="goal" tabindex="0" role="button" aria-label="Edit goal">${data.goal || "Maintain"}</span>
          </div>
          <div class="overview-stat">
            <span class="stat-label">Date</span>
            <span class="stat-value editable" data-edit="measurement" data-field="date" data-type="date" tabindex="0" role="button" aria-label="Edit measurement date">${formatDate(latestMeasurement.date) || "--"}</span>
          </div>
        </div>
      </div>

      <div class="measurements-grid">
        ${renderMeasurementCards(latestMeasurement, data.goals || {}, data.averages || {})}
      </div>

      <div class="progress-charts-toggle">
        <button class="expand-charts-btn" id="expandChartsBtn">
          <span class="expand-icon">▼</span> View Progress Charts
        </button>
      </div>

      <div id="progressChartsContainer" class="progress-charts-container" hidden>
        <!-- Charts will be rendered here -->
      </div>

      <div class="qualitative-assessments">
        <h3>Qualitative Assessments</h3>
        <div class="journal-entries">
          ${renderJournalEntries(journalEntries)}
        </div>
        <button id="addJournalBtn" class="btn-secondary">+ Add Journal Entry</button>
      </div>
    </section>
  `;

  initBodyMeasurementsEvents();
}

function renderMeasurementCards(latest, goals, averages) {
  const categories = {
    upper: "Upper Body",
    arms: "Arms",
    core: "Core",
    lower: "Lower Body",
    legs: "Legs",
  };

  let html = "";

  Object.entries(categories).forEach(([cat, label]) => {
    const catMeasurements = BODY_MEASUREMENTS.filter((m) => m.category === cat);

    html += `
      <div class="measurement-category">
        <h4>${label}</h4>
        <div class="measurement-cards">
          ${catMeasurements
            .map((m) => {
              const value = latest[m.id];
              const goal = goals[m.id];
              const avg = averages[m.id];
              const percentOfGoal = goal && value ? Math.round((value / goal) * 100) : null;

              return `
              <div class="measurement-card" data-metric="${m.id}">
                <div class="measurement-header">
                  <span class="measurement-label">${m.label}</span>
                  ${
                    m.id.includes("L") || m.id.includes("R")
                      ? ""
                      : `
                    <span class="measurement-side-toggle">
                      ${latest[m.id + "L"] ? `L: ${latest[m.id + "L"]}` : ""}
                      ${latest[m.id + "R"] ? `R: ${latest[m.id + "R"]}` : ""}
                    </span>
                  `
                  }
                </div>
                <div class="measurement-value editable" data-edit="measurement" data-field="${m.id}" data-type="number" data-unit="${m.unit}" tabindex="0" role="button" aria-label="Edit ${m.label}">
                  <span class="value">${value || "--"}</span>
                  <span class="unit">${value ? m.unit : ""}</span>
                </div>
                ${
                  percentOfGoal
                    ? `
                  <div class="measurement-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${Math.min(percentOfGoal, 100)}%"></div>
                    </div>
                    <span class="progress-text">${percentOfGoal}% of goal</span>
                  </div>
                `
                    : ""
                }
                ${
                  avg
                    ? `
                  <div class="measurement-avg">
                    Avg: ${avg} ${m.unit}
                  </div>
                `
                    : ""
                }
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  });

  return html;
}

function renderJournalEntries(journals) {
  const bodyParts = ["Abs", "Arms", "Back", "Calves", "Chest", "Lats", "Neck", "Obliques", "Quads", "Serratus Anterior", "Shoulders", "Traps"];

  return bodyParts
    .map((part) => {
      const partKey = part.toLowerCase().replace(/\s+/g, "");
      const entry = journals[partKey] || {};
      const content = entry.content || "";
      return `
      <div class="journal-entry editable" data-edit="journal" data-part="${partKey}" data-display="${escapeAttr(part)}" tabindex="0" role="button" aria-label="Edit ${part} assessment">
        <h5 class="journal-part-name">${part}</h5>
        <p class="journal-content">${content ? escapeHtml(content) : `<em>Click to add assessment...</em>`}</p>
        ${entry.date ? `<span class="journal-date">Updated ${formatDate(entry.date)}</span>` : ""}
      </div>
    `;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s) {
  return escapeHtml(s);
}

// ============================================
// MULTI-METRIC OVERLAY CHARTS
// ============================================

export function renderMultiMetricCharts(container, data = {}) {
  if (!container) return;

  chartData = data;

  container.innerHTML = `
    <div class="charts-controls">
      <h3>Progress Charts</h3>
      <p class="charts-description">View individual metrics or overlay multiple metrics on the aggregate chart.</p>
      
      <div class="metric-selector">
        <label>Select metrics to display:</label>
        <div class="metric-checkboxes">
          ${TRACKING_METRICS.map(
            (m) => `
            <label class="metric-checkbox" style="--metric-color: ${m.color}">
              <input type="checkbox" name="chartMetric" value="${m.id}" ${selectedChartMetrics.includes(m.id) ? "checked" : ""} />
              <span class="checkbox-label">${m.label}</span>
            </label>
          `
          ).join("")}
        </div>
      </div>
      
      <div class="chart-time-range">
        <button class="time-btn" data-range="7">7D</button>
        <button class="time-btn active" data-range="30">30D</button>
        <button class="time-btn" data-range="90">90D</button>
        <button class="time-btn" data-range="365">1Y</button>
        <button class="time-btn" data-range="all">All</button>
      </div>
    </div>

    <div class="charts-grid">
      <div class="aggregate-chart-container">
        <h4>Aggregate Overview</h4>
        <canvas id="aggregateChart" width="800" height="300"></canvas>
        <div class="chart-legend" id="aggregateLegend"></div>
      </div>
      
      <div class="individual-charts">
        ${TRACKING_METRICS.slice(0, 6)
          .map(
            (m) => `
          <div class="individual-chart-container" data-metric="${m.id}">
            <h4>${m.label}</h4>
            <canvas id="chart-${m.id}" width="400" height="200"></canvas>
            <div class="chart-stats">
              <span class="stat">Mean: <strong id="mean-${m.id}">--</strong></span>
              <span class="stat">Min: <strong id="min-${m.id}">--</strong></span>
              <span class="stat">Max: <strong id="max-${m.id}">--</strong></span>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  initChartEvents(container);
  drawCharts(data, 30);
}

function drawCharts(data, days) {
  // Draw aggregate chart with multiple overlaid lines
  const aggregateCanvas = document.getElementById("aggregateChart");
  if (aggregateCanvas) {
    const ctx = aggregateCanvas.getContext("2d");
    drawMultiLineChart(ctx, aggregateCanvas, data, selectedChartMetrics, days);
    updateAggregateLegend();
  }

  // Draw individual charts
  TRACKING_METRICS.slice(0, 6).forEach((metric) => {
    const canvas = document.getElementById(`chart-${metric.id}`);
    if (canvas && data[metric.id]) {
      const ctx = canvas.getContext("2d");
      drawSingleLineChart(ctx, canvas, data[metric.id], metric, days);
      updateChartStats(metric.id, data[metric.id], days);
    }
  });
}

function drawMultiLineChart(ctx, canvas, data, metrics, days) {
  // Scale for high DPI displays
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const width = rect.width;
  const height = rect.height;
  const padding = { top: 25, right: 60, bottom: 40, left: 60 };

  // Dark background like Grafana
  ctx.fillStyle = "#0b0e11";
  ctx.fillRect(0, 0, width, height);

  // Draw grid lines (Grafana style - horizontal)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {
    const y = padding.top + ((height - padding.top - padding.bottom) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  // Draw vertical grid lines
  for (let i = 0; i <= 6; i++) {
    const x = padding.left + ((width - padding.left - padding.right) * i) / 6;
    ctx.beginPath();
    ctx.setLineDash([2, 4]);
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw each metric line
  metrics.forEach((metricId) => {
    const metric = TRACKING_METRICS.find((m) => m.id === metricId);
    const metricData = data[metricId];

    if (!metric || !metricData?.length) return;

    // Filter to date range
    const now = new Date();
    const cutoff = new Date(now - days * 24 * 60 * 60 * 1000);
    const filtered = metricData.filter((d) => new Date(d.date) >= cutoff);

    if (!filtered.length) return;

    // Normalize values to 0-1 range for overlay
    const values = filtered.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    // Draw area fill (subtle gradient like Grafana)
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, metric.color + "40");
    gradient.addColorStop(1, metric.color + "05");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);

    filtered.forEach((point, i) => {
      const x = padding.left + ((width - padding.left - padding.right) * i) / (filtered.length - 1 || 1);
      const normalizedValue = (point.value - min) / range;
      const y = height - padding.bottom - normalizedValue * (height - padding.top - padding.bottom);
      ctx.lineTo(x, y);
    });

    ctx.lineTo(padding.left + width - padding.left - padding.right, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Draw smooth line (using bezier curves for Grafana-like smoothness)
    ctx.strokeStyle = metric.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();

    const points = filtered.map((point, i) => {
      const x = padding.left + ((width - padding.left - padding.right) * i) / (filtered.length - 1 || 1);
      const normalizedValue = (point.value - min) / range;
      const y = height - padding.bottom - normalizedValue * (height - padding.top - padding.bottom);
      return { x, y };
    });

    // Draw smooth curve through points
    if (points.length > 1) {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + curr.y) / 2);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }
    ctx.stroke();

    // Draw data points
    ctx.fillStyle = metric.color;
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // Draw axes
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  // Draw date labels on X axis
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "11px Space Grotesk, sans-serif";
  ctx.textAlign = "center";
  const dateLabels = getDaysLabels(days);
  dateLabels.forEach((label, i) => {
    const x = padding.left + ((width - padding.left - padding.right) * i) / (dateLabels.length - 1);
    ctx.fillText(label, x, height - padding.bottom + 20);
  });
}

function getDaysLabels(days) {
  const labels = [];
  const now = new Date();
  const count = Math.min(days, 7);
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now - i * (days / count) * 24 * 60 * 60 * 1000);
    labels.push(date.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  }
  return labels;
}

function drawSingleLineChart(ctx, canvas, data, metric, days) {
  // Scale for high DPI displays
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const width = rect.width;
  const height = rect.height;
  const padding = { top: 15, right: 50, bottom: 30, left: 50 };

  // Dark background like Grafana
  ctx.fillStyle = "#0b0e11";
  ctx.fillRect(0, 0, width, height);

  // Filter to date range
  const now = new Date();
  const cutoff = new Date(now - days * 24 * 60 * 60 * 1000);
  const filtered = data.filter((d) => new Date(d.date) >= cutoff);

  if (!filtered.length) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "12px Space Grotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No data for this period", width / 2, height / 2);
    return;
  }

  const values = filtered.map((d) => d.value);
  const min = Math.min(...values) * 0.95;
  const max = Math.max(...values) * 1.05;
  const range = max - min || 1;

  // Draw horizontal grid lines (Grafana style)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + ((height - padding.top - padding.bottom) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    
    // Y-axis labels
    const value = max - (range * i) / 4;
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "10px Space Grotesk, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(value.toFixed(0), padding.left - 8, y + 3);
  }

  // Draw area gradient fill (Grafana style)
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, metric.color + "50");
  gradient.addColorStop(0.5, metric.color + "20");
  gradient.addColorStop(1, metric.color + "05");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);

  const points = filtered.map((point, i) => {
    const x = padding.left + ((width - padding.left - padding.right) * i) / (filtered.length - 1 || 1);
    const y = height - padding.bottom - ((point.value - min) / range) * (height - padding.top - padding.bottom);
    return { x, y, value: point.value, date: point.date };
  });

  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.closePath();
  ctx.fill();

  // Draw smooth line
  ctx.strokeStyle = metric.color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();

  if (points.length > 1) {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + curr.y) / 2);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  }
  ctx.stroke();

  // Draw data points with glow
  points.forEach((point) => {
    // Glow effect
    ctx.shadowColor = metric.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = metric.color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Inner white dot
    ctx.fillStyle = "#0b0e11";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw current value label (like Grafana "Last" value)
  if (points.length > 0) {
    const last = points[points.length - 1];
    ctx.fillStyle = metric.color;
    ctx.font = "bold 12px Orbitron, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(last.value.toFixed(1), last.x + 8, last.y + 4);
  }
}

function updateChartStats(metricId, data, days) {
  const now = new Date();
  const cutoff = new Date(now - days * 24 * 60 * 60 * 1000);
  const filtered = data.filter((d) => new Date(d.date) >= cutoff);

  if (!filtered.length) return;

  const values = filtered.map((d) => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  const meanEl = document.getElementById(`mean-${metricId}`);
  const minEl = document.getElementById(`min-${metricId}`);
  const maxEl = document.getElementById(`max-${metricId}`);

  if (meanEl) meanEl.textContent = mean.toFixed(1);
  if (minEl) minEl.textContent = min.toFixed(1);
  if (maxEl) maxEl.textContent = max.toFixed(1);
}

function updateAggregateLegend() {
  const legendContainer = document.getElementById("aggregateLegend");
  if (!legendContainer) return;

  legendContainer.innerHTML = selectedChartMetrics
    .map((metricId) => {
      const metric = TRACKING_METRICS.find((m) => m.id === metricId);
      if (!metric) return "";
      return `
      <span class="legend-item" style="--color: ${metric.color}">
        <span class="legend-dot"></span>
        ${metric.label}
      </span>
    `;
    })
    .join("");
}

// ============================================
// EVENT HANDLERS
// ============================================

function initBodyMeasurementsEvents() {
  // Expand charts
  document.getElementById("expandChartsBtn")?.addEventListener("click", async () => {
    const container = document.getElementById("progressChartsContainer");
    if (container) {
      container.hidden = !container.hidden;
      if (!container.hidden && !container.dataset.loaded) {
        try {
          const data = await apiRequest("/api/user/charts");
          renderMultiMetricCharts(container, data || {});
          container.dataset.loaded = "true";
        } catch (e) {
          container.innerHTML = '<p class="error-state">Failed to load chart data.</p>';
        }
      }
    }
  });

  // "Add Measurement" jumps to today's date and opens weight editor.
  document.getElementById("addMeasurementBtn")?.addEventListener("click", () => {
    const weightEl = document.querySelector('[data-edit="measurement"][data-field="weight"]');
    if (weightEl) startInlineEdit(weightEl);
  });

  // "Add Journal Entry" focuses the first journal that has no content yet.
  document.getElementById("addJournalBtn")?.addEventListener("click", () => {
    const empty = Array.from(document.querySelectorAll('.journal-entry .journal-content em')).find(
      (em) => em.textContent.includes("Click to add")
    );
    if (empty) {
      const journal = empty.closest(".journal-entry");
      if (journal) startInlineEdit(journal);
    } else {
      const first = document.querySelector(".journal-entry");
      if (first) startInlineEdit(first);
    }
  });

  // Delegate clicks on all .editable elements (overview, measurement cards, journals).
  document.querySelectorAll(".body-measurements-section .editable").forEach((el) => {
    el.addEventListener("click", (ev) => {
      // Don't trigger if user is already editing inside this element
      if (el.querySelector("input, textarea, select")) return;
      ev.preventDefault();
      startInlineEdit(el);
    });
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        startInlineEdit(el);
      }
    });
  });
}

// ============================================
// INLINE EDIT MACHINERY
// ============================================

const GOAL_OPTIONS = ["Maintain", "Lose", "Gain", "Recomp", "Bulk", "Cut"];

function startInlineEdit(el) {
  const editKind = el.dataset.edit;
  if (editKind === "journal") return startJournalEdit(el);

  const field = el.dataset.field;
  const type = el.dataset.type || "number";
  const unit = el.dataset.unit || "";

  // Capture the current displayed text so we can revert on cancel.
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
  input.setAttribute("aria-label", el.getAttribute("aria-label") || "Edit");

  // Replace contents with the input.
  el.innerHTML = "";
  el.appendChild(input);
  // Preserve the unit suffix for number editors so the user sees what they're typing.
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
      await saveField(editKind, field, value);
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
  const currentText = contentEl?.querySelector("em") ? "" : (contentEl?.textContent || "").trim();

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
      // Empty value with prior content = delete
      try {
        await apiRequest(`/api/user/journals/${encodeURIComponent(partKey)}`, { method: "DELETE" });
        contentEl.innerHTML = `<em>Click to add assessment...</em>`;
        if (dateEl) dateEl.remove();
      } catch (e) {
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
        const newDate = document.createElement("span");
        newDate.className = "journal-date";
        newDate.textContent = `Updated ${formatDate(updatedAt)}`;
        el.appendChild(newDate);
      }
      el.classList.add("just-saved");
      setTimeout(() => el.classList.remove("just-saved"), 700);
    } catch (e) {
      contentEl.textContent = currentText;
      el.classList.add("save-failed");
      setTimeout(() => el.classList.remove("save-failed"), 1200);
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

function readCurrentValue(el, type) {
  const text = (el.querySelector(".value")?.textContent || el.textContent || "").trim();
  if (!text || text === "--") return null;
  if (type === "number") {
    const n = parseFloat(text);
    return Number.isNaN(n) ? null : n;
  }
  if (type === "date") return text;
  if (type === "goal") return text;
  return text;
}

function renderDisplayValue(value, type, unit, el) {
  if (type === "goal") {
    const goalLower = String(value).toLowerCase();
    // Reset goal classes
    el.classList.remove("lose", "gain", "maintain", "recomp", "bulk", "cut");
    el.classList.add(goalLower);
    return String(value);
  }
  if (type === "date") {
    return formatDate(value) || String(value);
  }
  if (el.classList.contains("measurement-value")) {
    return `<span class="value">${escapeHtml(String(value))}</span><span class="unit">${escapeHtml(unit || "")}</span>`;
  }
  return `${escapeHtml(String(value))}`;
}

async function saveField(editKind, field, value) {
  if (editKind === "profile") {
    // Profile-level changes (height, goal, units, etc.)
    return apiRequest("/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ [field]: value }),
    });
  }
  // Default: a single measurement entry for the most recent date.
  // The backend should upsert a row keyed by (user, date) and merge the
  // single field into that day's record.
  const date = readActiveMeasurementDate();
  return apiRequest("/api/user/measurements", {
    method: "POST",
    body: JSON.stringify({ date, [field]: value }),
  });
}

function readActiveMeasurementDate() {
  // Use whatever date is currently shown in the overview, or today.
  const dateEl = document.querySelector('[data-edit="measurement"][data-field="date"]');
  if (dateEl) {
    const iso = toIsoDate(dateEl.textContent.trim());
    if (iso) return iso;
  }
  return todayIso();
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

function initChartEvents(container) {
  // Metric checkboxes
  container.querySelectorAll('input[name="chartMetric"]').forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        selectedChartMetrics.push(e.target.value);
      } else {
        selectedChartMetrics = selectedChartMetrics.filter((m) => m !== e.target.value);
      }
      const days = parseInt(container.querySelector(".time-btn.active")?.dataset.range || "30");
      drawCharts(chartData, days === "all" ? 9999 : days);
    });
  });

  // Time range buttons
  container.querySelectorAll(".time-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".time-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const days = btn.dataset.range === "all" ? 9999 : parseInt(btn.dataset.range);
      drawCharts(chartData, days);
    });
  });
}

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatDelta(delta) {
  if (!delta && delta !== 0) return "";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} lb`;
}

function getDeltaClass(delta) {
  if (!delta) return "";
  return delta > 0 ? "positive" : delta < 0 ? "negative" : "";
}
