// Dashboard Body Measurements Section
// Includes body measurements tracking, progress charts, and narrative journals

const API_BASE = "https://api.thetrackerapp.io";

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
            <span class="stat-value">${latestMeasurement.height || "--"}</span>
          </div>
          <div class="overview-stat">
            <span class="stat-label">Weight</span>
            <span class="stat-value">${latestMeasurement.weight || "--"}</span>
            <span class="stat-delta ${getDeltaClass(data.weightDelta)}">${formatDelta(data.weightDelta)}</span>
          </div>
          <div class="overview-stat">
            <span class="stat-label">Goal</span>
            <span class="stat-value goal-badge ${data.goal?.toLowerCase() || ""}">${data.goal || "Maintain"}</span>
          </div>
          <div class="overview-stat">
            <span class="stat-label">Date</span>
            <span class="stat-value">${formatDate(latestMeasurement.date) || "--"}</span>
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
                <div class="measurement-value">
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
      const entry = journals[part.toLowerCase().replace(/\s+/g, "")] || {};
      return `
      <div class="journal-entry" data-part="${part}">
        <h5 class="journal-part-name">${part}</h5>
        <p class="journal-content">${entry.content || `<em>No assessment yet. Click to add.</em>`}</p>
        ${entry.date ? `<span class="journal-date">Updated ${formatDate(entry.date)}</span>` : ""}
      </div>
    `;
    })
    .join("");
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
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };

  ctx.clearRect(0, 0, width, height);

  // Draw grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {
    const y = padding.top + ((height - padding.top - padding.bottom) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
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

    // Draw line
    ctx.strokeStyle = metric.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    filtered.forEach((point, i) => {
      const x = padding.left + ((width - padding.left - padding.right) * i) / (filtered.length - 1 || 1);
      const normalizedValue = (point.value - min) / range;
      const y = height - padding.bottom - normalizedValue * (height - padding.top - padding.bottom);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  });
}

function drawSingleLineChart(ctx, canvas, data, metric, days) {
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 10, right: 10, bottom: 25, left: 40 };

  ctx.clearRect(0, 0, width, height);

  // Filter to date range
  const now = new Date();
  const cutoff = new Date(now - days * 24 * 60 * 60 * 1000);
  const filtered = data.filter((d) => new Date(d.date) >= cutoff);

  if (!filtered.length) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.textAlign = "center";
    ctx.fillText("No data for this period", width / 2, height / 2);
    return;
  }

  const values = filtered.map((d) => d.value);
  const min = Math.min(...values) * 0.95;
  const max = Math.max(...values) * 1.05;
  const range = max - min || 1;

  // Draw grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + ((height - padding.top - padding.bottom) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  // Draw area fill
  ctx.fillStyle = `${metric.color}20`;
  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);

  filtered.forEach((point, i) => {
    const x = padding.left + ((width - padding.left - padding.right) * i) / (filtered.length - 1 || 1);
    const y = height - padding.bottom - ((point.value - min) / range) * (height - padding.top - padding.bottom);
    ctx.lineTo(x, y);
  });

  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.closePath();
  ctx.fill();

  // Draw line
  ctx.strokeStyle = metric.color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  filtered.forEach((point, i) => {
    const x = padding.left + ((width - padding.left - padding.right) * i) / (filtered.length - 1 || 1);
    const y = height - padding.bottom - ((point.value - min) / range) * (height - padding.top - padding.bottom);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Draw points
  ctx.fillStyle = metric.color;
  filtered.forEach((point, i) => {
    const x = padding.left + ((width - padding.left - padding.right) * i) / (filtered.length - 1 || 1);
    const y = height - padding.bottom - ((point.value - min) / range) * (height - padding.top - padding.bottom);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
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
        // Fetch chart data and render
        try {
          const session = localStorage.getItem("tracker.auth.session");
          const response = await fetch(`${API_BASE}/api/user/charts`, {
            headers: { Authorization: `Bearer ${session}` },
          });
          if (response.ok) {
            const data = await response.json();
            renderMultiMetricCharts(container, data);
            container.dataset.loaded = "true";
          }
        } catch (e) {
          container.innerHTML = '<p class="error-state">Failed to load chart data.</p>';
        }
      }
    }
  });

  // Add measurement modal
  document.getElementById("addMeasurementBtn")?.addEventListener("click", () => {
    // Would open a modal for adding measurements
    alert("Measurement input form coming soon!");
  });

  // Add journal entry
  document.getElementById("addJournalBtn")?.addEventListener("click", () => {
    // Would open a modal for adding journal entry
    alert("Journal entry form coming soon!");
  });

  // Click on journal entry to edit
  document.querySelectorAll(".journal-entry").forEach((entry) => {
    entry.addEventListener("click", () => {
      const part = entry.dataset.part;
      // Would open edit modal
      alert(`Edit journal for ${part} - coming soon!`);
    });
  });
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
