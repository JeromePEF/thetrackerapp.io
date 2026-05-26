// Weekly snapshot generator — exports a branded PNG of the user's week that
// they can post to Instagram / X / TikTok stories.
//
// Renders entirely on a 1080×1350 (Instagram portrait 4:5) offscreen canvas
// so the output is identical regardless of the user's screen size or zoom.
// Pulls from the same chart + cardio state the Stats tab already has, so
// nothing extra is fetched.
//
// API:
//   import { downloadWeeklySnapshot } from "./weekly-snapshot.js";
//   downloadWeeklySnapshot({ data, cardio, username });
//
//   - data    : the /api/chart/data response object (must include
//               chartData.calories + chartData.water + metrics + targets + streak)
//   - cardio  : the /api/cardio/stats response (optional)
//   - username: string used in the headline and watermark

// 1080 × 1920 — fits Instagram Stories, TikTok, X portrait, and gives us
// enough room for Workouts + Nutrition rows on top of everything else.
const WIDTH = 1080;
const HEIGHT = 1920;

const BG = "#0a0a0c";
const PANEL = "#11131a";
const PANEL_BORDER = "rgba(255, 255, 255, 0.08)";
const ACCENT = "#38ffd3";
const TEXT = "#ecf4ff";
const TEXT_DIM = "#93a5b8";
const TEXT_FAINT = "#6b7c91";

// Macros + cardio palette to match the dashboard
const PROTEIN = "#64b5f6";
const CARBS = "#ffb74d";
const FATS = "#ba68c8";
const CALORIES_C = "#ff8a65";
const WATER_C = "#4fc3f7";
const PR_GOLD = "#ffd166";

export function downloadWeeklySnapshot({ data, cardio, username }) {
  if (!data) return false;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  drawBackground(ctx);
  drawHeader(ctx, username);

  // Section layout: each draw* call returns the y-coordinate where it ended,
  // so the next section can flow underneath it. Constant 20px gap between.
  const GAP = 20;
  let y = 250;
  y = drawCaloriesBars(ctx, data, y) + GAP;
  y = drawMacrosRow(ctx, data, y) + GAP;
  y = drawWorkoutsRow(ctx, data, y) + GAP;
  y = drawNutritionRow(ctx, data, y) + GAP;
  y = drawCardioRow(ctx, cardio, y) + GAP;
  y = drawWaterAndStreakRow(ctx, data, y) + GAP;

  drawWatermark(ctx);

  const filename = `tracker-week-${todayIso()}.png`;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }, "image/png");

  return true;
}

// ---------- drawing primitives ----------

function drawBackground(ctx) {
  // Soft gradient + grid texture
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, "#0e1117");
  grad.addColorStop(1, "#06080b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Faint diagonal accent strip in the upper-right
  ctx.save();
  ctx.translate(WIDTH - 220, -120);
  ctx.rotate(0.45);
  const accentGrad = ctx.createLinearGradient(0, 0, 320, 0);
  accentGrad.addColorStop(0, "rgba(56, 255, 211, 0.0)");
  accentGrad.addColorStop(1, "rgba(56, 255, 211, 0.18)");
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, 320, 380);
  ctx.restore();
}

function drawHeader(ctx, username) {
  const name = (username || "you").replace(/^@/, "");
  // Title
  ctx.fillStyle = ACCENT;
  ctx.font = "700 22px 'Orbitron', system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("THE TRACKER APP", 60, 60);

  ctx.fillStyle = TEXT_DIM;
  ctx.font = "500 18px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillText("WEEKLY SNAPSHOT", 60, 92);

  // Username + date range
  ctx.fillStyle = TEXT;
  ctx.font = "800 56px 'Orbitron', system-ui, sans-serif";
  ctx.fillText(`@${name}`, 60, 140);

  const range = weekRangeLabel();
  ctx.fillStyle = TEXT_DIM;
  ctx.font = "500 22px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillText(range, 60, 210);
}

function drawCaloriesBars(ctx, data, yStart) {
  const bars = lastNDays(7, data.chartData?.calories || []);
  const target = Number(data.targets?.calories) || 0;
  const max = Math.max(target || 0, ...bars.map((b) => b.value || 0), 1);
  const totalCals = bars.reduce((s, b) => s + (b.value || 0), 0);
  const avgCals = totalCals / bars.length;

  const x0 = 60;
  const y0 = yStart;
  const w = WIDTH - 120;
  const h = 300;

  panel(ctx, x0, y0, w, h);

  // Section header
  sectionHead(ctx, "🍎  Calories — last 7 days", x0 + 24, y0 + 24);

  // Stats row inside the panel
  drawStat(ctx, "TOTAL", `${Math.round(totalCals).toLocaleString()} kcal`, x0 + 24, y0 + 86);
  drawStat(ctx, "DAILY AVG", `${Math.round(avgCals).toLocaleString()} kcal`, x0 + 280, y0 + 86);
  if (target) drawStat(ctx, "TARGET / DAY", `${Math.round(target).toLocaleString()} kcal`, x0 + 540, y0 + 86);

  // Bars
  const chartX = x0 + 24;
  const chartY = y0 + 168;
  const chartW = w - 48;
  const chartH = h - 168 - 24;
  const barGap = 18;
  const barW = (chartW - barGap * (bars.length - 1)) / bars.length;

  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const ratio = (b.value || 0) / max;
    const bh = Math.max(4, Math.round(ratio * chartH));
    const bx = chartX + i * (barW + barGap);
    const by = chartY + (chartH - bh);

    const grad = ctx.createLinearGradient(0, by, 0, by + bh);
    grad.addColorStop(0, ACCENT);
    grad.addColorStop(1, "#1c7d6c");
    ctx.fillStyle = b.isToday ? "#ffeb3b" : grad;
    roundedRect(ctx, bx, by, barW, bh, 8);
    ctx.fill();

    // Day label
    ctx.fillStyle = b.isToday ? "#ffeb3b" : TEXT_DIM;
    ctx.font = "600 18px 'Space Grotesk', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(b.label, bx + barW / 2, chartY + chartH + 12);

    // Value on top
    if ((b.value || 0) > 0) {
      ctx.fillStyle = TEXT;
      ctx.font = "600 16px 'Space Grotesk', system-ui, sans-serif";
      ctx.fillText(Math.round(b.value).toLocaleString(), bx + barW / 2, by - 22);
    }
  }
  ctx.textAlign = "left";
  return y0 + h;
}

function drawMacrosRow(ctx, data, yStart) {
  const today = todayIso();
  const find = (key) =>
    Number((data.chartData?.[key] || []).find((p) => p.date === today)?.value) || 0;
  const p = find("protein");
  const c = find("carbs");
  const f = find("fats");

  const tP = Number(data.targets?.protein) || 0;
  const tC = Number(data.targets?.carbs) || 0;
  const tF = Number(data.targets?.fats) || 0;

  const x0 = 60;
  const y0 = yStart;
  const w = WIDTH - 120;
  const h = 150;

  panel(ctx, x0, y0, w, h);
  sectionHead(ctx, "💪  Macros today", x0 + 24, y0 + 22);

  const cellW = (w - 48) / 3;
  drawMacroCell(ctx, "Protein", p, tP, "g", PROTEIN, x0 + 24, y0 + 70, cellW);
  drawMacroCell(ctx, "Carbs",   c, tC, "g", CARBS,   x0 + 24 + cellW, y0 + 70, cellW);
  drawMacroCell(ctx, "Fats",    f, tF, "g", FATS,    x0 + 24 + cellW * 2, y0 + 70, cellW);
  return y0 + h;
}

/**
 * Workouts row — lists the user's lifts in the selected range and highlights
 * cells that match their all-time PR (stats.max) with a gold border + medal.
 * Pulls from `metrics[]` so any strength metric the backend exposes shows up.
 */
function drawWorkoutsRow(ctx, data, yStart) {
  // Pick every metric that looks like a strength lift. We rely on either
  // category === "strength" or one of the common keys.
  const STRENGTH_KEYS = ["bench", "squat", "deadlift", "overheadPress", "ohp", "row", "pullup", "pushup"];
  const all = Array.isArray(data.metrics) ? data.metrics : [];
  const lifts = all.filter(
    (m) =>
      m.available !== false &&
      m.stats &&
      ((m.category === "strength") || STRENGTH_KEYS.includes(m.key)),
  );
  const x0 = 60;
  const y0 = yStart;
  const w = WIDTH - 120;
  const h = 280;
  panel(ctx, x0, y0, w, h);
  sectionHead(ctx, "🏋️  Workouts — your top lifts", x0 + 24, y0 + 22);

  if (!lifts.length) {
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = "500 22px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillText("No strength workouts logged yet — text one to add it!", x0 + 24, y0 + 90);
    return y0 + h;
  }

  // Header row
  const cellY = y0 + 60;
  const rowH = 44;
  const colName = x0 + 24;
  const colLast = x0 + 380;
  const colPr = x0 + 580;
  const colDelta = x0 + 780;

  ctx.fillStyle = TEXT_DIM;
  ctx.font = "600 14px 'Orbitron', system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("LIFT", colName, cellY);
  ctx.fillText("LAST", colLast, cellY);
  ctx.fillText("PR", colPr, cellY);
  ctx.fillText("Δ RANGE", colDelta, cellY);

  // Faint divider under the header
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(x0 + 24, cellY + 24);
  ctx.lineTo(x0 + w - 24, cellY + 24);
  ctx.stroke();

  // Rows
  const rowsY = cellY + 38;
  const maxRows = Math.min(lifts.length, 4);
  for (let i = 0; i < maxRows; i++) {
    const m = lifts[i];
    const s = m.stats || {};
    const unit = m.unit || "lb";
    const lastValue = s.last && typeof s.last === "object" ? s.last.value : s.last;
    const max = s.max;
    const delta = s.delta;
    const last = Number(lastValue);
    const pr = Number(max);
    const isPR = Number.isFinite(last) && Number.isFinite(pr) && Math.abs(last - pr) < 0.001;

    const rowTop = rowsY + i * rowH;

    // Highlight strip when last == PR
    if (isPR) {
      const grad = ctx.createLinearGradient(x0 + 24, 0, x0 + w - 24, 0);
      grad.addColorStop(0, "rgba(255, 209, 102, 0.18)");
      grad.addColorStop(1, "rgba(255, 209, 102, 0)");
      ctx.fillStyle = grad;
      roundedRect(ctx, x0 + 14, rowTop - 6, w - 28, rowH - 6, 8);
      ctx.fill();
    }

    // Name
    ctx.fillStyle = TEXT;
    ctx.font = "600 22px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillText(m.label || m.key, colName, rowTop);

    // Last value (gold + 🏆 when it equals the PR)
    if (isPR) {
      ctx.fillStyle = PR_GOLD;
      ctx.font = "700 22px 'Orbitron', system-ui, sans-serif";
      ctx.fillText(`${formatLift(last)} ${unit} 🏆`, colLast, rowTop);
    } else {
      ctx.fillStyle = TEXT;
      ctx.font = "600 22px 'Orbitron', system-ui, sans-serif";
      ctx.fillText(Number.isFinite(last) ? `${formatLift(last)} ${unit}` : "—", colLast, rowTop);
    }

    // PR cell
    ctx.fillStyle = isPR ? PR_GOLD : TEXT;
    ctx.font = "600 22px 'Orbitron', system-ui, sans-serif";
    ctx.fillText(Number.isFinite(pr) ? `${formatLift(pr)} ${unit}` : "—", colPr, rowTop);

    // Delta cell
    if (Number.isFinite(Number(delta)) && Number(delta) !== 0) {
      const d = Number(delta);
      ctx.fillStyle = d > 0 ? "#5be7a9" : "#ff8585";
      ctx.font = "600 22px 'Orbitron', system-ui, sans-serif";
      ctx.fillText(`${d > 0 ? "+" : ""}${formatLift(d)} ${unit}`, colDelta, rowTop);
    } else {
      ctx.fillStyle = TEXT_FAINT;
      ctx.font = "500 22px 'Space Grotesk', system-ui, sans-serif";
      ctx.fillText("—", colDelta, rowTop);
    }
  }

  if (lifts.length > maxRows) {
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = "500 16px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillText(`+ ${lifts.length - maxRows} more on the dashboard`, x0 + 24, rowsY + maxRows * rowH);
  }

  return y0 + h;
}

function formatLift(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

/**
 * Nutrition row — shows the top 4 food entries logged today (when the backend
 * surfaces per-entry data) plus the day's macro totals. Degrades gracefully
 * when entries aren't available: shows just totals.
 */
function drawNutritionRow(ctx, data, yStart) {
  const today = todayIso();
  const entries =
    (data.todayNutrition && Array.isArray(data.todayNutrition.entries)
      ? data.todayNutrition.entries
      : null) ||
    (data.nutritionByDay && Array.isArray(data.nutritionByDay[today])
      ? data.nutritionByDay[today]
      : null) ||
    [];
  const totalsToday = data.todayNutrition?.totals || {};
  const x0 = 60;
  const y0 = yStart;
  const w = WIDTH - 120;
  const h = 230;
  panel(ctx, x0, y0, w, h);
  sectionHead(ctx, "🍎  Nutrition — today", x0 + 24, y0 + 22);

  // Summary line under the title with macro totals
  const cTotal =
    Number(totalsToday.calories) ||
    Number((data.chartData?.calories || []).find((p) => p.date === today)?.value) ||
    0;
  const pTotal = Number(totalsToday.protein) || 0;
  const carbsTotal = Number(totalsToday.carbs) || 0;
  const fTotal = Number(totalsToday.fats) || 0;

  ctx.fillStyle = TEXT_DIM;
  ctx.font = "500 18px 'Space Grotesk', system-ui, sans-serif";
  const summary = `${Math.round(cTotal).toLocaleString()} kcal · ${Math.round(pTotal)}g P · ${Math.round(carbsTotal)}g C · ${Math.round(fTotal)}g F`;
  ctx.fillText(summary, x0 + 24, y0 + 56);

  if (!entries.length) {
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = "500 20px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillText("Click a day on the dashboard to see line-by-line entries.", x0 + 24, y0 + 110);
    return y0 + h;
  }

  // Entry rows (up to 4)
  const startY = y0 + 92;
  const rowH = 32;
  const max = Math.min(4, entries.length);
  for (let i = 0; i < max; i++) {
    const e = entries[i];
    const rowTop = startY + i * rowH;
    ctx.fillStyle = TEXT;
    ctx.font = "600 18px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillText(truncate(e.name || e.item || e.raw || "Entry", 48), x0 + 24, rowTop);

    const kcal = Math.round(Number(e.calories) || 0);
    ctx.fillStyle = CALORIES_C;
    ctx.font = "700 18px 'Orbitron', system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${kcal.toLocaleString()} kcal`, x0 + w - 24, rowTop);
    ctx.textAlign = "left";
  }

  if (entries.length > max) {
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = "500 16px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillText(`+ ${entries.length - max} more entries today`, x0 + 24, startY + max * rowH);
  }

  return y0 + h;
}

function truncate(s, n) {
  s = String(s ?? "");
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

function drawCardioRow(ctx, cardio, yStart) {
  const x0 = 60;
  const y0 = yStart;
  const w = WIDTH - 120;
  const h = 150;

  panel(ctx, x0, y0, w, h);
  if (!cardio || !cardio.summary || !cardio.summary.totalSessions) {
    // Quiet "no cardio this week" panel
    sectionHead(ctx, "🏃  Cardio — last 7 days", x0 + 24, y0 + 22);
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = "500 22px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillText("No cardio logged this week.", x0 + 24, y0 + 78);
    return y0 + h;
  }
  const s = cardio.summary;
  sectionHead(ctx, "🏃  Cardio — last 7 days", x0 + 24, y0 + 22);
  const cellW = (w - 48) / 4;
  drawStat(ctx, "SESSIONS", String(s.totalSessions || 0), x0 + 24 + cellW * 0, y0 + 70);
  drawStat(ctx, "MILES", formatMilesLocal(s.totalMiles), x0 + 24 + cellW * 1, y0 + 70);
  drawStat(ctx, "KCAL", String(Math.round(s.totalCalories || 0).toLocaleString()), x0 + 24 + cellW * 2, y0 + 70);
  drawStat(ctx, "TIME", s.totalTime || "0:00", x0 + 24 + cellW * 3, y0 + 70);
  return y0 + h;
}

/**
 * Water + Streak rendered side-by-side as a single row. Replaces the old
 * pair of half-width functions that called drawStat() at overlapping y
 * coordinates. Stat labels (14px) and values (30px) need at least 60px of
 * vertical space each, so the whole row gets a comfortable 200px height.
 */
function drawWaterAndStreakRow(ctx, data, yStart) {
  const x0 = 60;
  const y0 = yStart;
  const totalW = WIDTH - 120;
  const gap = 24;
  const w = (totalW - gap) / 2;
  const h = 200;

  // ----- Water (left) -----
  panel(ctx, x0, y0, w, h);
  sectionHead(ctx, "💧  Water — today", x0 + 24, y0 + 22);

  const today = todayIso();
  const water = data.chartData?.water || [];
  const todayValue = Number(water.find((p) => p.date === today)?.value) || 0;
  const target = Number(data.targets?.water) || 0;
  const last7 = lastNDays(7, water).reduce((s, b) => s + (b.value || 0), 0);

  // Left column: stacked stats with explicit 70px row height so they never overlap
  const colX = x0 + 24;
  drawStat(ctx, "TODAY",       `${Math.round(todayValue)} oz`, colX, y0 + 70);
  drawStat(ctx, "7-DAY TOTAL", `${Math.round(last7)} oz`,      colX, y0 + 140);

  // Right column: progress ring
  if (target > 0) {
    const cx = x0 + w - 76;
    const cy = y0 + h / 2 + 18;
    const r = 50;
    const pct = Math.min(1, todayValue / target);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = WATER_C;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = "butt";

    ctx.fillStyle = TEXT;
    ctx.font = "700 24px 'Orbitron', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(pct * 100)}%`, cx, cy);
    ctx.fillStyle = TEXT_DIM;
    ctx.font = "500 12px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillText(`of ${Math.round(target)} oz`, cx, cy + 28);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  }

  // ----- Streak (right) -----
  const sx = x0 + w + gap;
  panel(ctx, sx, y0, w, h);
  sectionHead(ctx, "🔥  Streak", sx + 24, y0 + 22);

  const streakDays = Number(data.streak?.currentDays ?? data.streak ?? 0) || 0;
  const longest = Number(data.streak?.longestDays) || 0;
  const goal = data.goal || data.profile?.goal || "Maintain";

  ctx.fillStyle = TEXT;
  ctx.font = "800 80px 'Orbitron', system-ui, sans-serif";
  ctx.fillText(`${streakDays}`, sx + 24, y0 + 80);

  ctx.fillStyle = TEXT_DIM;
  ctx.font = "500 20px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillText(
    `days in a row${longest ? `  ·  best ${longest}` : ""}`,
    sx + 24,
    y0 + 170,
  );

  // Goal pill in the top-right of the streak panel
  ctx.font = "600 16px 'Orbitron', system-ui, sans-serif";
  const pillText = String(goal).toUpperCase();
  const tm = ctx.measureText(pillText);
  const pw = tm.width + 28;
  const ph = 32;
  const pillX = sx + w - 24 - pw;
  const pillY = y0 + 22;
  ctx.fillStyle = "rgba(56,255,211,0.16)";
  roundedRect(ctx, pillX, pillY, pw, ph, 999);
  ctx.fill();
  ctx.fillStyle = ACCENT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pillText, pillX + pw / 2, pillY + ph / 2 + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  return y0 + h;
}

function drawWatermark(ctx) {
  const y = HEIGHT - 110;
  ctx.fillStyle = TEXT_DIM;
  ctx.font = "600 24px 'Space Grotesk', system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("Track yours via text →", 60, y);

  ctx.fillStyle = ACCENT;
  ctx.font = "800 32px 'Orbitron', system-ui, sans-serif";
  ctx.fillText("thetrackerapp.io", 60, y + 34);

  // Tagline upper-right
  ctx.fillStyle = TEXT_FAINT;
  ctx.font = "500 16px 'Space Grotesk', system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("iMessage · SMS · Telegram", WIDTH - 60, y + 42);
  ctx.textAlign = "left";
}

// ---------- helpers ----------

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  roundedRect(ctx, x, y, w, h, 20);
  ctx.fill();
  ctx.strokeStyle = PANEL_BORDER;
  ctx.lineWidth = 1;
  roundedRect(ctx, x, y, w, h, 20);
  ctx.stroke();
}

function sectionHead(ctx, text, x, y) {
  ctx.fillStyle = TEXT_DIM;
  ctx.font = "700 18px 'Orbitron', system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
}

function drawStat(ctx, label, value, x, y) {
  ctx.fillStyle = TEXT_DIM;
  ctx.font = "600 14px 'Orbitron', system-ui, sans-serif";
  ctx.fillText(label, x, y);
  ctx.fillStyle = TEXT;
  ctx.font = "700 30px 'Orbitron', system-ui, sans-serif";
  ctx.fillText(value, x, y + 22);
}

function drawMacroCell(ctx, label, value, target, unit, color, x, y, w) {
  ctx.fillStyle = TEXT_DIM;
  ctx.font = "600 14px 'Orbitron', system-ui, sans-serif";
  ctx.fillText(label.toUpperCase(), x + 8, y);

  ctx.fillStyle = TEXT;
  ctx.font = "700 26px 'Orbitron', system-ui, sans-serif";
  const valueText = target
    ? `${Math.round(value)} / ${Math.round(target)}${unit}`
    : `${Math.round(value)}${unit}`;
  ctx.fillText(valueText, x + 8, y + 22);

  // Bar
  const bx = x + 8;
  const by = y + 58;
  const bw = w - 24;
  const bh = 8;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundedRect(ctx, bx, by, bw, bh, 4);
  ctx.fill();
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  if (pct > 0) {
    ctx.fillStyle = color;
    roundedRect(ctx, bx, by, bw * pct, bh, 4);
    ctx.fill();
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function lastNDays(n, points) {
  const out = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const point = points.find((p) => p.date === iso);
    out.push({
      date: iso,
      value: Number(point?.value) || 0,
      label: d.toLocaleDateString("en-US", { weekday: "short" })[0],
      isToday: i === 0,
    });
  }
  return out;
}

function weekRangeLabel() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  const opts = { month: "short", day: "numeric" };
  const left = start.toLocaleDateString("en-US", opts);
  const right = end.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${left} – ${right}`.toUpperCase();
}

function formatMilesLocal(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  if (n >= 100) return Math.round(n).toLocaleString();
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2).replace(/\.?0+$/, "");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
