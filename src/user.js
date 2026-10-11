const API_BASE = "https://api.thetrackerapp.io";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const els = {};

function cacheElements() {
  const ids = [
    "userLoading", "userError", "userErrorTitle", "userErrorMessage",
    "userProfileHeader", "userStatsBar", "userHeatmaps",
    "userAvatar", "userDisplayName", "userHandle", "userJoined", "userMotto",
    "userSocials",
    "userStatWorkouts", "userStatStreak", "userStatDays",
    "userWorkoutHeatmap", "userNutritionHeatmap", "userWaterHeatmap",
    "workoutHeatmapCard", "nutritionHeatmapCard", "waterHeatmapCard",
    "userMergedHeatmap", "mergedHeatmapCard",
    "userPageTitle", "userPageDescription",
    "ogTitle", "ogDescription", "ogUrl",
    "twitterTitle", "twitterDescription", "canonicalUrl",
    "userLeaderboard", "strengthCard", "calisthenicsCard", "streaksCard",
    "userStrengthRows", "userCalisthenicsRows", "userStreaksRows",
    "userRecentWorkouts", "userRecentWorkoutList",
    "userDayLog", "dayWeek", "dayBody", "dayPick", "dayTimeline",
    "dayPrevWeek", "dayNextWeek", "dayWeekLabel",
    "userBodyMap", "bmCanvas", "bmNote", "bmModeDay", "bmModeAll",
  ];
  ids.forEach(function (id) {
    els[id] = document.getElementById(id);
  });
}

function escapeHtml(value) {
  var str = String(value ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractUsernameFromPath() {
  var path = window.location.pathname;
  var match = /^\/@(.+)$/.exec(path);
  if (match) {
    try { return decodeURIComponent(match[1]).trim(); }
    catch (e) { return match[1].trim(); }
  }
  return "";
}

function hideAll() {
  [els.userLoading, els.userProfileHeader, els.userStatsBar, els.userHeatmaps, els.userLeaderboard, els.userRecentWorkouts].forEach(function (el) {
    if (el) el.hidden = true;
  });
  if (els.userError) els.userError.hidden = true;
}

function showLoading() {
  hideAll();
  if (els.userLoading) els.userLoading.hidden = false;
}

function showError(title, message) {
  hideAll();
  if (els.userError) {
    els.userError.hidden = false;
    if (els.userErrorTitle) els.userErrorTitle.textContent = title;
    if (els.userErrorMessage) els.userErrorMessage.textContent = message;
  }
}

function showProfile() {
  if (els.userLoading) els.userLoading.hidden = true;
  if (els.userError) els.userError.hidden = true;
  if (els.userProfileHeader) els.userProfileHeader.hidden = false;
  if (els.userStatsBar) els.userStatsBar.hidden = false;
  if (els.userHeatmaps) els.userHeatmaps.hidden = false;
  if (els.userLeaderboard) els.userLeaderboard.hidden = false;
  if (els.userRecentWorkouts) els.userRecentWorkouts.hidden = false;
}

/* These links get posted to TikTok and YouTube, where the preview card IS the
   advert. "View someone's fitness activity" says nothing; "3,340 workouts · a
   56-day streak" is the proof, and it costs nothing to put the real numbers in
   the text the scraper already reads. */
function setMeta(name, displayName, stats, memberNo) {
  var s = stats || {};
  var bits = [];
  if (s.totalWorkouts) bits.push(formatNumber(s.totalWorkouts) + " workouts");
  if (s.currentStreak) bits.push(s.currentStreak + "-day streak");
  if (s.activeDays) bits.push(formatNumber(s.activeDays) + " active days");
  var title = "@" + name + (bits.length ? " — " + bits.slice(0, 2).join(" · ") : "")
    + " | The Tracker App";
  var desc = bits.length
    ? "@" + name + (memberNo ? " (member #" + memberNo + ")" : "") + " on The Tracker App: "
      + bits.join(" · ") + ". Every set and every meal, logged by text."
    : "View @" + name + "'s workouts, nutrition and streak on The Tracker App.";
  var profileUrl = "https://thetrackerapp.io/@" + encodeURIComponent(name);

  if (els.userPageTitle) els.userPageTitle.textContent = title;
  if (els.userPageDescription) els.userPageDescription.setAttribute("content", desc);
  if (els.ogTitle) els.ogTitle.setAttribute("content", title);
  if (els.ogDescription) els.ogDescription.setAttribute("content", desc);
  if (els.ogUrl) els.ogUrl.setAttribute("content", profileUrl);
  if (els.twitterTitle) els.twitterTitle.setAttribute("content", title);
  if (els.twitterDescription) els.twitterDescription.setAttribute("content", desc);
  if (els.canonicalUrl) els.canonicalUrl.setAttribute("href", profileUrl);
  document.title = title;
}

function formatDate(isoString) {
  if (!isoString) return "";
  try {
    var date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch (e) { return ""; }
}

function formatShortDate(isoString) {
  if (!isoString) return "";
  try {
    var date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch (e) { return ""; }
}

function formatNumber(n) {
  if (n === null || n === undefined) return "-";
  return Number(n).toLocaleString();
}

function rankMedal(rank) {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
  return "#" + rank;
}

/* ======== Heatmap ======== */

function parseDateYMD(str) {
  if (!str) return null;
  try {
    var date = new Date(String(str).trim());
    if (Number.isNaN(date.getTime())) return null;
    return date;
  } catch (e) { return null; }
}

function buildWeekGrid(days) {
  var safe = Array.isArray(days) ? days : [];
  if (!safe.length) return { weeks: [], monthLabels: [] };

  var dates = safe.map(function (d) { return parseDateYMD(d.date); });
  var validDates = dates.filter(function (d) { return d !== null; });
  if (!validDates.length) return { weeks: [], monthLabels: [] };

  validDates.sort(function (a, b) { return a - b; });

  var first = validDates[0];
  var last = validDates[validDates.length - 1];

  function startOfWeek(d) {
    var day = d.getDay();
    var s = new Date(d);
    s.setDate(s.getDate() - day);
    s.setHours(0, 0, 0, 0);
    return s;
  }

  var weekStart = startOfWeek(first);
  var weekEnd = startOfWeek(last);
  var totalWeeks = Math.max(1, Math.round((weekEnd - weekStart) / (7 * 86400000)) + 1);

  var buckets = {};
  safe.forEach(function (d) {
    var parsed = parseDateYMD(d.date);
    if (!parsed) return;
    var key = parsed.toISOString().slice(0, 10);
    if (!buckets[key]) {
      buckets[key] = { date: key, workouts: 0, nutrition: 0, water: 0 };
    }
    buckets[key].workouts += Number(d.workouts ?? 0);
    buckets[key].nutrition += Number(d.nutrition ?? 0);
    buckets[key].water += Number(d.water ?? d.gallons ?? 0);
  });

  var weeks = [];
  for (var w = 0; w < totalWeeks; w++) {
    var week = [];
    for (var dow = 0; dow < 7; dow++) {
      var cellDate = new Date(weekStart);
      cellDate.setDate(cellDate.getDate() + (w * 7) + dow);
      var key = cellDate.toISOString().slice(0, 10);
      var entry = buckets[key] || { date: key, workouts: 0, nutrition: 0, water: 0 };
      week.push(entry);
    }
    weeks.push(week);
  }

  return { weeks: weeks, colCount: totalWeeks };
}

function computeThresholds(values) {
  var nonzero = values.filter(function (v) { return v > 0; }).sort(function (a, b) { return a - b; });
  if (!nonzero.length) return [0, 0, 0, 0, 0];

  function pct(p) {
    var idx = Math.round((p / 100) * (nonzero.length - 1));
    return nonzero[Math.min(idx, nonzero.length - 1)];
  }

  return [pct(20), pct(40), pct(60), pct(80), pct(95)];
}

function cellLevelFromThresholds(value, t) {
  if (value <= 0) return "0";
  if (value <= t[0]) return "1";
  if (value <= t[1]) return "2";
  if (value <= t[2]) return "3";
  if (value <= t[3]) return "4";
  return "5";
}

function cellTooltipText(category, entry) {
  var d = parseDateYMD(entry.date);
  var dateStr = d ? d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : entry.date;

  if (category === "water") {
    var gal = Number(entry.water ?? entry.gallons ?? 0);
    return dateStr + ": " + gal.toFixed(2) + " gal";
  }
  if (category === "merged") {
    var wv = Number(entry.workouts ?? 0);
    var nv = Number(entry.nutrition ?? 0);
    var hv = Number(entry.water ?? entry.gallons ?? 0);
    return dateStr + ": " + wv + " workout" + (wv === 1 ? "" : "s") + ", " + nv + " nutrition, " + hv.toFixed(2) + " gal";
  }
  var val = Number(entry[category] ?? 0);
  var label = category === "workouts" ? "workout" : "nutrition entry";
  return dateStr + ": " + val + " " + label + (val === 1 ? "" : "s");
}

function cellValueForCategory(entry, category) {
  if (category === "merged") {
    return Number(entry.workouts ?? 0) + Number(entry.nutrition ?? 0) + Number(entry.water ?? entry.gallons ?? 0);
  }
  return Number(entry[category] ?? 0);
}

function renderSkeletonChart(target) {
  if (!target) return;
  target.innerHTML = "";
  for (var i = 0; i < 371; i++) {
    var cell = document.createElement("div");
    cell.className = "hc-cell hc-skeleton";
    target.appendChild(cell);
  }
}

function renderHeatmapChart(target, days, category) {
  if (!target) return;
  target.innerHTML = "";

  var grid = buildWeekGrid(days);
  var weeks = grid.weeks;
  var colCount = grid.colCount;

  if (!weeks.length) {
    target.innerHTML = '<p class="heatmap-empty">No activity data available.</p>';
    return;
  }

  var allValues = [];
  weeks.forEach(function (week) {
    week.forEach(function (entry) {
      allValues.push(cellValueForCategory(entry, category));
    });
  });
  var thresholds = computeThresholds(allValues);

  var table = document.createElement("div");
  table.className = "heatmap-table";

  var dayLabelWidth = 30;
  var cellSize = 13;
  var gap = 2;

  var monthRow = document.createElement("div");
  monthRow.className = "heatmap-month-row";
  monthRow.style.display = "grid";
  monthRow.style.gridTemplateColumns = dayLabelWidth + "px repeat(" + colCount + ", " + cellSize + "px)";
  monthRow.style.gap = gap + "px";
  monthRow.style.marginBottom = "2px";

  var placeholder = document.createElement("span");
  monthRow.appendChild(placeholder);

  var monthSpans = [];
  for (var w = 0; w < colCount; w++) {
    var midDay = weeks[w] ? weeks[w][3] : null;
    var d = midDay ? parseDateYMD(midDay.date) : null;
    var label = d ? MONTH_NAMES[d.getMonth()] : "";
    if (!monthSpans.length || monthSpans[monthSpans.length - 1].label !== label) {
      monthSpans.push({ col: w, label: label });
    }
  }

  monthSpans.forEach(function (m, i) {
    var span = document.createElement("span");
    span.className = "heatmap-month-label";
    span.textContent = m.label;
    var endCol = i < monthSpans.length - 1 ? monthSpans[i + 1].col : colCount;
    span.style.gridColumn = (m.col + 2) + " / " + (endCol + 2);
    monthRow.appendChild(span);
  });
  table.appendChild(monthRow);

  var bodyRow = document.createElement("div");
  bodyRow.className = "heatmap-body-row";

  var dayLabels = document.createElement("div");
  dayLabels.className = "heatmap-day-labels";
  dayLabels.style.width = dayLabelWidth + "px";
  DAY_LABELS.forEach(function (label) {
    var span = document.createElement("span");
    span.style.height = cellSize + "px";
    span.style.lineHeight = cellSize + "px";
    span.textContent = label;
    dayLabels.appendChild(span);
  });
  bodyRow.appendChild(dayLabels);

  var cellGrid = document.createElement("div");
  cellGrid.className = "heatmap-week-grid";
  cellGrid.style.gridTemplateColumns = "repeat(" + colCount + ", " + cellSize + "px)";
  cellGrid.style.gridTemplateRows = "repeat(7, " + cellSize + "px)";
  cellGrid.style.gap = gap + "px";

  var tooltip = document.createElement("div");
  tooltip.className = "heatmap-tooltip";

  weeks.forEach(function (week) {
    week.forEach(function (entry) {
      var cell = document.createElement("div");
      cell.className = "hc-cell";

      var value = cellValueForCategory(entry, category);
      var level = cellLevelFromThresholds(value, thresholds);

      cell.dataset.level = level;
      cell.dataset.category = category;
      cell.title = cellTooltipText(category, entry);

      cell.addEventListener("mouseenter", function () {
        tooltip.textContent = cellTooltipText(category, entry);
        tooltip.style.display = "block";
        var rect = cell.getBoundingClientRect();
        var tableRect = table.getBoundingClientRect();
        tooltip.style.left = (rect.left - tableRect.left + rect.width / 2) + "px";
        tooltip.style.top = (rect.top - tableRect.top - 8) + "px";
      });
      cell.addEventListener("mouseleave", function () {
        tooltip.style.display = "none";
      });

      cellGrid.appendChild(cell);
    });
  });

  bodyRow.appendChild(cellGrid);
  table.appendChild(bodyRow);
  table.appendChild(tooltip);
  target.appendChild(table);

  // SHOW THE END, NOT THE BEGINNING.
  // The chart spans 52 weeks at a fixed 13px per column — about 690px — so on
  // any phone it scrolls. Scroll position starts at the LEFT, which is a year
  // ago: for an account that began logging in August, the entire visible area
  // is empty cells and the heatmap reads as broken. Recent activity is the
  // point of it, so it opens on today.
  requestAnimationFrame(function () {
    try { target.scrollLeft = target.scrollWidth; } catch (e) {}
  });
}

/* ======== Leaderboard ======== */

function renderLeaderboardRows(target, entries) {
  if (!target) return;

  var safe = Array.isArray(entries) ? entries : [];
  if (!safe.length) {
    target.innerHTML = '<p class="heatmap-empty">No standings yet.</p>';
    return;
  }

  target.innerHTML = safe.map(function (entry) {
    var rank = entry.rank ?? "-";
    var exercise = escapeHtml(entry.exercise || entry.label || "");
    var value = formatNumber(entry.value ?? entry.score);
    var unit = escapeHtml(entry.unit || "");
    return '<div class="user-lb-row">' +
      '<span class="user-lb-rank">' + escapeHtml(rankMedal(rank)) + '</span>' +
      '<span class="user-lb-exercise">' + exercise + '</span>' +
      '<span class="user-lb-value">' + value + ' ' + unit + '</span>' +
      '</div>';
  }).join("");
}

function renderStreaksRow(target, entry) {
  if (!target) return;

  if (!entry || (!entry.days && !entry.rank)) {
    target.innerHTML = '<p class="heatmap-empty">No streak data yet.</p>';
    return;
  }

  var rank = entry.rank ?? "-";
  var days = entry.days ?? 0;
  var summary = escapeHtml(entry.summary || "");

  target.innerHTML = '<div class="user-lb-row">' +
    '<span class="user-lb-rank">' + escapeHtml(rankMedal(rank)) + '</span>' +
    '<span class="user-lb-exercise">Streak</span>' +
    '<span class="user-lb-value">' + days + ' day' + (days === 1 ? "" : "s") + '</span>' +
    '</div>' +
    (summary ? '<p class="user-streak-summary">' + summary + '</p>' : "");
}

/* ======== Recent Workouts ======== */

/* Clock time in the PROFILE OWNER's zone, to the second.
   Stored timestamps are UTC, so rendering them raw showed a 6am session for
   someone who trained at 2am — and milliseconds are noise nobody reads. */
function formatWorkoutTime(iso, timeZone) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric", minute: "2-digit", second: "2-digit",
      hour12: true, timeZone: timeZone || undefined,
      timeZoneName: "short"
    }).format(d);
  } catch (err) {
    // An unknown zone must not blank the whole row.
    return d.toISOString().slice(11, 19) + " UTC";
  }
}

/* What one logged row actually was, in the unit its movement is measured in -
   the same rule the bot's own reports follow. `type` and `seconds` used to be
   dropped before this reached the page, so every hold rendered as "0 reps". */
function recentDetail(w) {
  var type = String(w.type || "").toLowerCase();
  if (type === "time" || Number(w.seconds) > 0) {
    var sec = Math.round(Number(w.seconds) || 0);
    if (sec >= 60) {
      var m = Math.floor(sec / 60), rs = sec % 60;
      return rs ? m + "m " + rs + "s" : m + "m";
    }
    return sec + "s";
  }
  var sets = Number(w.sets) || 0;
  var reps = Number(w.reps) || 0;
  var weight = Number(w.weight) || 0;
  if (reps && weight) {
    return (sets || 1) + "\u00d7" + reps + " @ " + weight + (w.unit || "");
  }
  if (reps) return (sets || 1) + "\u00d7" + reps;
  if (Number(w.count) > 0) return w.count + " reps";
  if (weight) return weight + (w.unit || "");
  return escapeHtml(w.detail || w.notes || "");
}

/* Shared profile facts the row renderers need but are not handed directly:
   the owner's timezone (stored timestamps are UTC) and their per-exercise
   habit stats. Declared with var above its readers so neither sees a hoisted
   undefined — the mistake that once hid the stats bar unconditionally. */
var profileState = { timezone: "", habits: null };

function renderRecentWorkouts(target, workouts) {
  if (!target) return;

  var safe = Array.isArray(workouts) ? workouts : [];
  if (!safe.length) {
    target.innerHTML = '<p class="heatmap-empty">No recent workouts logged.</p>';
    return;
  }

  target.innerHTML = safe.slice(0, 10).map(function (w) {
    var iso = w.date || w.loggedAt || w.createdAt;
    var date = formatShortDate(iso);
    var time = formatWorkoutTime(iso, profileState.timezone);
    var name = w.exercise || w.name || w.label || "Workout";
    var exercise = escapeHtml(name);
    var detailStr = recentDetail(w);
    /* HOW OFTEN this movement has been done, and whether it is on a live run.
       A list of exercise names cannot say which of them are the staples. */
    var habit = (profileState.habits || {})[name] || null;
    var meta = "";
    if (habit && habit.times) {
      meta = '<span class="user-recent-count"'
        + ' title="' + escapeHtml(name + " done " + habit.times + " time"
            + (habit.times === 1 ? "" : "s")
            + (habit.streak > 1 ? ", " + habit.streak + " days in a row" : "")) + '">'
        + "\u00d7" + habit.times
        + (habit.onStreak ? ' <span class="user-recent-fire">\ud83d\udd25' + habit.streak + "</span>" : "")
        + "</span>";
    }

    return '<div class="user-recent-item' + (habit && habit.daily ? " is-daily" : "") + '">' +
      '<span class="user-recent-date">' + escapeHtml(date) +
        (time ? ' <span class="user-recent-time">' + escapeHtml(time) + "</span>" : "") +
      '</span>' +
      '<span class="user-recent-exercise">' + exercise + '</span>' +
      (detailStr ? '<span class="user-recent-detail">' + detailStr + '</span>' : "") +
      meta +
      '</div>';
  }).join("");
}

/* SOCIAL LINKS. Handles are stored server-side and the URL is built there, so
   nothing here can be pointed at an arbitrary destination. rel on every link
   regardless, and the website link is nofollow because that one IS arbitrary. */
function renderSocials(target, links) {
  if (!target) return;
  var safe = Array.isArray(links) ? links : [];
  if (!safe.length) { target.hidden = true; target.innerHTML = ""; return; }
  target.hidden = false;
  target.innerHTML = safe.map(function (l) {
    var rel = l.external ? "noopener noreferrer nofollow" : "noopener noreferrer";
    return '<a class="user-social" href="' + escapeHtml(l.url) + '"'
      + ' target="_blank" rel="' + rel + '"'
      + ' title="' + escapeHtml(l.label + " " + l.handle) + '">'
      + '<span class="user-social-label">' + escapeHtml(l.label) + "</span>"
      + '<span class="user-social-handle">' + escapeHtml(l.handle) + "</span>"
      + "</a>";
  }).join("");
}

/* ======== Render ======== */

/* ======== Body map ======== */
/* A blank figure with the trained muscles lit: front and back, because half
   the groups are not visible from the front and a diagram that cannot show
   lats or glutes would misrepresent a pulling day entirely.
   Two modes from the same drawing — THIS DAY (what was trained) and ALL TIME
   (how the work is distributed, hottest group red) — because "what did I do
   today" and "what am I neglecting" are different questions. */

var BODY_SHAPES = [
  // group,        view,    shape          (coords in a 0-100 x 0-260 box)
  ["neck",        "front", "rect", 44, 30, 12, 10, 3],
  ["traps",       "front", "path", "M30,42 L50,38 L70,42 L64,50 L36,50 Z"],
  ["frontDelts",  "front", "circle", 27, 54, 9],
  ["frontDelts",  "front", "circle", 73, 54, 9],
  ["chest",       "front", "path", "M36,50 L50,54 L50,76 L34,72 Z"],
  ["chest",       "front", "path", "M64,50 L50,54 L50,76 L66,72 Z"],
  ["biceps",      "front", "rect", 17, 64, 10, 26, 5],
  ["biceps",      "front", "rect", 73, 64, 10, 26, 5],
  ["forearms",    "front", "rect", 14, 92, 9, 30, 4],
  ["forearms",    "front", "rect", 77, 92, 9, 30, 4],
  ["abs",         "front", "rect", 42, 78, 16, 34, 3],
  ["obliques",    "front", "path", "M34,76 L42,80 L42,112 L34,104 Z"],
  ["obliques",    "front", "path", "M66,76 L58,80 L58,112 L66,104 Z"],
  ["quads",       "front", "rect", 34, 126, 14, 46, 6],
  ["quads",       "front", "rect", 52, 126, 14, 46, 6],
  ["calves",      "front", "rect", 36, 186, 11, 34, 5],
  ["calves",      "front", "rect", 53, 186, 11, 34, 5],
  // back view, drawn in its own 0-100 box and translated
  ["traps",       "back",  "path", "M30,42 L50,37 L70,42 L62,62 L50,56 L38,62 Z"],
  ["rearDelts",   "back",  "circle", 27, 54, 9],
  ["rearDelts",   "back",  "circle", 73, 54, 9],
  ["upperBack",   "back",  "rect", 38, 60, 24, 18, 3],
  ["lats",        "back",  "path", "M36,62 L50,70 L50,96 L32,86 Z"],
  ["lats",        "back",  "path", "M64,62 L50,70 L50,96 L68,86 Z"],
  ["lowerBack",   "back",  "rect", 42, 96, 16, 20, 3],
  ["triceps",     "back",  "rect", 17, 64, 10, 26, 5],
  ["triceps",     "back",  "rect", 73, 64, 10, 26, 5],
  ["forearms",    "back",  "rect", 14, 92, 9, 30, 4],
  ["forearms",    "back",  "rect", 77, 92, 9, 30, 4],
  ["glutes",      "back",  "path", "M34,116 L50,112 L66,116 L66,134 L50,138 L34,134 Z"],
  ["hamstrings",  "back",  "rect", 34, 138, 14, 42, 6],
  ["hamstrings",  "back",  "rect", 52, 138, 14, 42, 6],
  ["calves",      "back",  "rect", 36, 186, 11, 34, 5],
  ["calves",      "back",  "rect", 53, 186, 11, 34, 5],
];

var MUSCLE_LABELS = {
  chest: "Chest", frontDelts: "Front delts", sideDelts: "Side delts",
  rearDelts: "Rear delts", biceps: "Biceps", triceps: "Triceps",
  forearms: "Forearms", traps: "Traps", lats: "Lats", upperBack: "Upper back",
  lowerBack: "Lower back", abs: "Abs", obliques: "Obliques", glutes: "Glutes",
  quads: "Quads", hamstrings: "Hamstrings", calves: "Calves", neck: "Neck",
  cardio: "Cardio"
};

/* Female figures get narrower shoulders and wider hips. Applied as a transform
   about the body's own centre line so every region moves together rather than
   needing a second table of coordinates to drift out of sync with the first. */
function bodySilhouette(view, female) {
  var shoulder = female ? 0.9 : 1;
  var hip = female ? 1.1 : 1;
  return '<path class="bm-silhouette" d="'
    + "M50,22 C56,22 60,26 60,31 C60,36 56,40 50,40 C44,40 40,36 40,31 C40,26 44,22 50,22 Z"
    + "M" + (50 - 22 * shoulder) + ",46 C" + (50 - 26 * shoulder) + ",52 " + (50 - 20 * shoulder) + ",70 "
    + (50 - 18 * shoulder) + ",96 L" + (50 - 20 * hip) + ",124 L" + (50 - 17 * hip) + ",180 L" + (50 - 15 * hip) + ",232 "
    + "L" + (50 - 4) + ",232 L" + (50 - 6) + ",150 L50,140 L" + (50 + 6) + ",150 L" + (50 + 4) + ",232 "
    + "L" + (50 + 15 * hip) + ",232 L" + (50 + 17 * hip) + ",180 L" + (50 + 20 * hip) + ",124 "
    + "L" + (50 + 18 * shoulder) + ",96 C" + (50 + 20 * shoulder) + ",70 " + (50 + 26 * shoulder) + ",52 "
    + (50 + 22 * shoulder) + ",46 Z"
    + '" />';
}

function bodyShapeSvg(def) {
  var group = def[0], view = def[1], kind = def[2];
  var attrs = 'class="bm-m" data-m="' + group + '"';
  if (kind === "rect") {
    return "<rect " + attrs + ' x="' + def[3] + '" y="' + def[4] + '" width="' + def[5]
      + '" height="' + def[6] + '" rx="' + (def[7] || 2) + '" />';
  }
  if (kind === "circle") {
    return "<circle " + attrs + ' cx="' + def[3] + '" cy="' + def[4] + '" r="' + def[5] + '" />';
  }
  return "<path " + attrs + ' d="' + def[3] + '" />';
}

function renderBodyMap(target, loads, female) {
  if (!target) return;
  var values = Object.keys(loads || {}).map(function (k) { return loads[k]; })
    .filter(function (v) { return v > 0; });
  if (!values.length) {
    target.innerHTML = '<p class="daylog-empty">No mapped movements for this view.</p>';
    return;
  }
  var max = Math.max.apply(null, values);

  function svgFor(view) {
    var shapes = BODY_SHAPES.filter(function (d) { return d[1] === view; })
      .map(bodyShapeSvg).join("");
    return '<svg viewBox="0 0 100 250" class="bm-svg" role="img" aria-label="'
      + (view === "front" ? "Front" : "Back") + ' muscle map">'
      + bodySilhouette(view, female) + shapes + "</svg>";
  }

  target.innerHTML = '<div class="bm-wrap">'
    + '<figure><figcaption>Front</figcaption>' + svgFor("front") + "</figure>"
    + '<figure><figcaption>Back</figcaption>' + svgFor("back") + "</figure>"
    + "</div>";

  // Intensity is applied AFTER the markup exists, so the same drawing serves
  // both modes and nothing about the figure is duplicated per mode.
  target.querySelectorAll(".bm-m").forEach(function (el) {
    var g = el.dataset.m;
    var v = (loads && loads[g]) || 0;
    // Square-root scaling: a linear ramp against a 948-set maximum left
    // everything except the top two or three groups looking untrained.
    var t = v > 0 ? Math.sqrt(v / max) : 0;
    el.style.opacity = v > 0 ? String(0.18 + 0.82 * t) : "0";
    el.setAttribute("data-on", v > 0 ? "1" : "0");
    if (v > 0) {
      el.innerHTML = "<title>" + escapeHtml((MUSCLE_LABELS[g] || g) + " — "
        + (Math.round(v * 10) / 10) + " sets") + "</title>";
    }
  });

  var top = Object.keys(loads).filter(function (k) { return loads[k] > 0; })
    .sort(function (a, b) { return loads[b] - loads[a]; });
  var legend = top.slice(0, 6).map(function (k) {
    return '<span class="bm-chip">' + escapeHtml(MUSCLE_LABELS[k] || k) + " "
      + (Math.round(loads[k] * 10) / 10) + "</span>";
  }).join("");
  target.insertAdjacentHTML("beforeend", '<div class="bm-legend">' + legend + "</div>");
}

/* ======== Daily log ======== */
/* A streak is a claim; the day's actual sets are the evidence. The strip runs
   Sunday to Saturday because that is how a training week is read, and it can
   be walked backwards through the whole history rather than only showing the
   current week. */

var dayState = { username: "", weekStart: null, activity: {}, selected: "", earliest: "" };
var bodyState = { mode: "day", day: null, all: null, female: false };

function paintBodyMap() {
  if (!els.userBodyMap || els.userBodyMap.hidden) return;
  var isDay = bodyState.mode === "day";
  var loads = isDay ? (bodyState.day || {}) : (bodyState.all || {});
  if (els.bmModeDay) els.bmModeDay.setAttribute("aria-pressed", String(isDay));
  if (els.bmModeAll) els.bmModeAll.setAttribute("aria-pressed", String(!isDay));
  renderBodyMap(els.bmCanvas, loads, bodyState.female);
  if (els.bmNote) {
    els.bmNote.textContent = isDay
      ? "Lit regions are what this day's movements trained. Intensity is sets."
      : "Heat is total sets per muscle over the last year — the hottest region is the most trained.";
  }
}

function wireBodyMap() {
  if (els.bmModeDay) els.bmModeDay.addEventListener("click", function () {
    bodyState.mode = "day"; paintBodyMap();
  });
  if (els.bmModeAll) els.bmModeAll.addEventListener("click", function () {
    bodyState.mode = "all"; paintBodyMap();
  });
}

function isoDay(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")
    + "-" + String(d.getDate()).padStart(2, "0");
}
function parseDay(key) {
  var p = String(key || "").split("-");
  // Constructed in LOCAL time on purpose: new Date("2026-10-02") parses as UTC
  // and renders as the 1st for anyone west of Greenwich, which would put every
  // day in the strip under the wrong weekday.
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}
function sundayOf(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function renderDayWeek() {
  var host = els.dayWeek;
  if (!host || !dayState.weekStart) return;
  var names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var todayKey = isoDay(new Date());
  host.innerHTML = "";
  for (var i = 0; i < 7; i += 1) {
    var d = new Date(dayState.weekStart.getFullYear(), dayState.weekStart.getMonth(),
      dayState.weekStart.getDate() + i);
    var key = isoDay(d);
    var has = (dayState.activity[key] || 0) > 0;
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.dataset.day = key;
    b.dataset.has = has ? "1" : "0";
    b.setAttribute("aria-selected", String(key === dayState.selected));
    // A future day is not "empty", it has not happened — so it is disabled
    // rather than shown as a day with nothing logged.
    if (key > todayKey) b.disabled = true;
    b.innerHTML = '<span class="dw-dow">' + names[i] + "</span>"
      + '<span class="dw-num">' + d.getDate() + "</span>"
      + '<span class="dw-dot"></span>';
    host.appendChild(b);
  }
  var end = new Date(dayState.weekStart.getFullYear(), dayState.weekStart.getMonth(),
    dayState.weekStart.getDate() + 6);
  if (els.dayWeekLabel) {
    els.dayWeekLabel.textContent = dayState.weekStart.toLocaleDateString(undefined,
      { month: "short", day: "numeric" }) + " – " + end.toLocaleDateString(undefined,
      { month: "short", day: "numeric", year: "numeric" });
  }
  if (els.dayNextWeek) {
    els.dayNextWeek.disabled = isoDay(dayState.weekStart) >= isoDay(sundayOf(new Date()));
  }
  if (els.dayPrevWeek) {
    els.dayPrevWeek.disabled = !!dayState.earliest
      && isoDay(end) <= dayState.earliest;
  }
}

/* Three row shapes, and a label that reads naturally for each:
     weighted      sets + reps + weight   ->  "1×25 @ 135lb"
     calisthenics  a bare count           ->  "25 reps"
     hold          seconds only           ->  "60s"
   Mixing them produced "NonexNone" for pullups and dead hangs, which are most
   of a real log. */
function setsLabel(set) {
  if (set.seconds) return set.seconds + "s";
  if (set.sets && set.reps) {
    return set.sets + "×" + set.reps + (set.weight ? " @ " + set.weight + (set.unit || "") : "");
  }
  var n = set.reps || set.count;
  if (n) return n + " reps" + (set.weight ? " @ " + set.weight + (set.unit || "") : "");
  if (set.weight) return set.weight + (set.unit || "");
  return "—";
}

// ── MIRROR A WORKOUT ────────────────────────────────────────────────────────
// Every set on a public profile is something another person might want to go
// and do. These build the exact /log command that reproduces it, so mirroring
// someone's session is a copy and a paste rather than retyping numbers off a
// screen.
//
// The grammar is the one the bot actually accepts (verified against the
// parser): `sets,reps,weight` with an optional unit suffix, a bare number for
// a rep count, and `30s` / `2m` for a hold.
function trimNum(value) {
  var n = Number(value) || 0;
  return String(Number(n.toFixed(2)));
}

function secondsToLogInput(seconds) {
  var sec = Math.round(Number(seconds) || 0);
  if (sec <= 0) return "";
  return sec % 60 === 0 ? (sec / 60) + "m" : sec + "s";
}

// ONE set — "so the single would be 1,10,135". The unit rides along because a
// bare 27.5 copied out of a kg log would be re-read as pounds.
function logCommandForSet(exercise, st) {
  var ex = String(exercise || "").trim();
  if (!ex || !st) return "";
  if (Number(st.seconds) > 0) return "/log " + ex + " " + secondsToLogInput(st.seconds);
  var reps = Number(st.reps) || 0;
  var weight = Number(st.weight) || 0;
  var unit = st.unit || "";
  if (reps && weight) return "/log " + ex + " 1," + reps + "," + trimNum(weight) + unit;
  if (reps) return "/log " + ex + " 1," + reps;
  if (Number(st.count) > 0) return "/log " + ex + " " + trimNum(st.count);
  return "";
}

// THE WHOLE DAY for one movement — "or the full copy 5,10,135".
//
// Collapses to a single command only when the day was uniform weighted work,
// which is the case that example describes. Otherwise it returns one command
// PER SET: /log takes a single set shape, and given two groups on one line it
// silently keeps the first and drops the rest, so emitting "1,10,135 1,8,145"
// would quietly lose half the work.
function logCommandsForExercise(exercise, sets) {
  var rows = (sets || []).filter(Boolean);
  if (!rows.length) return [];
  var first = rows[0];
  var uniformWeighted = rows.every(function (st) {
    return Number(st.weight) > 0 && Number(st.reps) > 0
      && Number(st.reps) === Number(first.reps)
      && Number(st.weight) === Number(first.weight)
      && (st.unit || "") === (first.unit || "");
  });
  if (uniformWeighted) {
    var totalSets = rows.reduce(function (n, st) { return n + (Number(st.sets) || 1); }, 0);
    return ["/log " + String(exercise).trim() + " " + totalSets + "," + Number(first.reps)
      + "," + trimNum(first.weight) + (first.unit || "")];
  }
  return rows.map(function (st) { return logCommandForSet(exercise, st); })
    .filter(Boolean);
}

function fallbackCopy(text) {
  try {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    var ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    return false;
  }
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text)
      .then(function () { return true; })
      .catch(function () { return fallbackCopy(text); });
  }
  return Promise.resolve(fallbackCopy(text));
}

// DELEGATED, and wired once. The command text rides in data-cmd rather than an
// inline onclick: the site sends a Content-Security-Policy, and an inline
// handler would simply not fire.
function wireDayCopy() {
  if (!els.dayBody || els.dayBody.getAttribute("data-copy-wired") === "1") return;
  els.dayBody.setAttribute("data-copy-wired", "1");
  els.dayBody.addEventListener("click", function (event) {
    var btn = event.target && event.target.closest
      ? event.target.closest(".daylog-copybtn") : null;
    if (!btn) return;
    var text = btn.getAttribute("data-cmd") || "";
    if (!text) return;
    var original = btn.getAttribute("data-label") || btn.textContent;
    copyText(text).then(function (ok) {
      btn.textContent = ok ? "Copied" : "Copy failed";
      btn.classList.add("is-copied");
      window.setTimeout(function () {
        btn.textContent = original;
        btn.classList.remove("is-copied");
      }, 1600);
    });
  });
}

/* ── TIMELINE RAIL ──────────────────────────────────────────────────────────
   When the day's work happened, down the side of the log. A list of movements
   says WHAT was trained; this says the session started at 8:33am and ran an
   hour, and that the two sets logged at 1pm were a separate trip.

   Sessions are clustered SERVER-SIDE by services/workoutSessionClock.js and
   arrive on the payload, so this and the bot's own "Session: 48m" line can
   never disagree about where one workout ended and the next began.

   The rail renders identically on phone and desktop - the gutter narrows and
   the entries wrap, but the line and the dots are always there. */
function renderDayTimeline(payload) {
  var host = els.dayTimeline;
  if (!host) return;
  var workouts = (payload && payload.workouts) || [];
  if (!workouts.length) { host.hidden = true; host.innerHTML = ""; return; }

  /* One entry per logged set, placed by its own timestamp, so four sets
     spread over twenty minutes appear as four marks rather than one. */
  var marks = [];
  workouts.forEach(function (ex) {
    (ex.sets || []).forEach(function (st) {
      if (!st || !st.at) return;
      var ms = new Date(st.at).getTime();
      if (isNaN(ms)) return;
      marks.push({ ms: ms, exercise: ex.exercise, detail: recentDetail(st) });
    });
  });
  if (!marks.length) { host.hidden = true; host.innerHTML = ""; return; }
  marks.sort(function (a, b) { return a.ms - b.ms; });

  var tz = (payload && payload.timezone) || profileState.timezone || "";
  var sessions = (payload && payload.sessions) || [];
  var gap = (payload && payload.sessionGapMinutes) || 25;

  /* Which session a mark belongs to, so a break in training shows as a break
     in the rail instead of one unbroken hour-long run. */
  function sessionIndexFor(ms) {
    for (var i = 0; i < sessions.length; i++) {
      var a = new Date(sessions[i].startedAt).getTime();
      var b = new Date(sessions[i].endedAt).getTime();
      if (ms >= a && ms <= b) return i;
    }
    return -1;
  }

  var html = '<p class="daylog-sub">Timeline</p>';
  var lastSession = null;
  marks.forEach(function (m) {
    var idx = sessionIndexFor(m.ms);
    if (idx !== lastSession) {
      lastSession = idx;
      var sess = sessions[idx];
      if (sess) {
        html += '<div class="tl-session">'
          + '<span class="tl-session-time">' + escapeHtml(sess.startLabel) + "</span>"
          + '<span class="tl-session-meta">'
          + escapeHtml(sess.elapsedLabel) + " \u00b7 " + sess.sets
          + " set" + (sess.sets === 1 ? "" : "s") + "</span>"
          + "</div>";
      }
    }
    html += '<div class="tl-row">'
      + '<span class="tl-time">' + escapeHtml(formatClockOnly(m.ms, tz)) + "</span>"
      + '<span class="tl-dot" aria-hidden="true"></span>'
      + '<span class="tl-body">'
      + '<span class="tl-exercise">' + escapeHtml(m.exercise) + "</span>"
      + (m.detail ? '<span class="tl-detail">' + escapeHtml(m.detail) + "</span>" : "")
      + "</span>"
      + "</div>";
  });
  if (sessions.length > 1) {
    html += '<p class="tl-note">Separate sessions: a gap over '
      + gap + " minutes starts a new one.</p>";
  }
  host.innerHTML = html;
  host.hidden = false;
}

/* Clock time without the zone suffix - the rail repeats it on every row, so
   the zone is stated once in the heading instead. */
function formatClockOnly(ms, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
      timeZone: timeZone || undefined
    }).format(new Date(ms));
  } catch (err) {
    return new Date(ms).toISOString().slice(11, 16);
  }
}

function renderDayBody(payload) {
  var host = els.dayBody;
  if (!host) return;
  if (!payload) { host.innerHTML = '<p class="daylog-empty">Could not load that day.</p>'; return; }
  if (payload.consent === false) {
    host.innerHTML = '<p class="daylog-empty">This profile has not shared its daily log.</p>';
    return;
  }
  var html = "";
  var w = payload.workouts || [];
  if (w.length) {
    html += '<p class="daylog-sub">Workouts</p>';
    w.forEach(function (ex) {
      var single = logCommandForSet(ex.exercise, (ex.sets || [])[0]);
      var all = logCommandsForExercise(ex.exercise, ex.sets);
      var allText = all.join("\n");
      // "Copy all" is only a distinct offer when it differs from one set.
      var showAll = allText && allText !== single;
      var allLabel = all.length > 1 ? "Copy all (" + all.length + ")" : "Copy all";
      html += '<div class="daylog-ex"><div class="daylog-exhead">'
        + "<h4>" + escapeHtml(ex.exercise) + "</h4>"
        + '<span class="daylog-copy">'
        + (single
          ? '<button type="button" class="daylog-copybtn" data-label="Copy set"'
            + ' title="' + escapeHtml(single) + '"'
            + ' data-cmd="' + escapeHtml(single) + '">Copy set</button>'
          : "")
        + (showAll
          ? '<button type="button" class="daylog-copybtn" data-label="' + escapeHtml(allLabel) + '"'
            + ' title="' + escapeHtml(all.length > 1
              ? all.length + " commands - send them one at a time"
              : allText) + '"'
            + ' data-cmd="' + escapeHtml(allText) + '">' + escapeHtml(allLabel) + "</button>"
          : "")
        + "</span></div>"
        + '<div class="daylog-sets">'
        + ex.sets.map(function (st) { return "<span>" + escapeHtml(setsLabel(st)) + "</span>"; }).join("")
        + "</div></div>";
    });
  }
  var n = payload.nutrition;
  if (n && n.items && n.items.length) {
    html += '<p class="daylog-sub">Food</p><table class="daylog-food"><tbody>';
    n.items.forEach(function (it) {
      html += "<tr><td>" + escapeHtml(it.name) + "</td><td>"
        + Math.round(it.calories) + " kcal</td></tr>";
    });
    html += "</tbody></table>";
    var t = n.totals || {};
    html += '<p class="daylog-totals">' + Math.round(t.calories || 0) + " kcal · "
      + Math.round(t.protein || 0) + "g protein · " + Math.round(t.carbs || 0) + "g carbs · "
      + Math.round(t.fats || 0) + "g fat</p>";
  }
  if (payload.water && payload.water.ounces) {
    html += '<p class="daylog-totals">' + Math.round(payload.water.ounces) + " oz water</p>";
  }
  host.innerHTML = html || '<p class="daylog-empty">Nothing logged on this day.</p>';
  wireDayCopy();
}

async function loadDay(key) {
  dayState.selected = key;
  renderDayWeek();
  if (els.dayPick) els.dayPick.value = key;
  if (els.dayBody) els.dayBody.innerHTML = '<p class="daylog-empty">Loading…</p>';
  try {
    var res = await fetch(API_BASE + "/api/u/" + encodeURIComponent(dayState.username)
      + "/day/" + encodeURIComponent(key), { headers: { Accept: "application/json" } });
    var body = await res.json().catch(function () { return null; });
    // 403 carries consent:false and is a real answer, not a failure — the
    // difference between "not shared" and "nothing logged" has to survive.
    renderDayBody(body);
    renderDayTimeline(body);
    // The day's muscles ride along with the day payload, so the diagram and
    // the log below it can never describe different days.
    bodyState.day = (body && body.muscles) || {};
    if (bodyState.mode === "day") paintBodyMap();
  } catch (err) {
    renderDayBody(null);
    renderDayTimeline(null);
  }
}

function initBodyMap(data) {
  var visibility = data.publicVisibility || {};
  var shown = visibility.workouts === true && !!data.muscleTotals;
  if (els.userBodyMap) els.userBodyMap.hidden = !shown;
  if (!shown) return;
  bodyState.all = data.muscleTotals || {};
  // Figure proportions follow the stated gender; male is the fallback rather
  // than a claim, since the field is optional and often blank.
  var g = String((data.profile || {}).emojiGender || (data.profile || {}).sex || "").toLowerCase();
  bodyState.female = g.indexOf("f") === 0 || g === "woman" || g === "female";
  paintBodyMap();
}

function initDayLog(data) {
  var visibility = data.publicVisibility || {};
  var shared = visibility.workouts === true || visibility.nutrition === true
    || visibility.water === true;
  if (els.userDayLog) els.userDayLog.hidden = !shared;
  if (!shared) return;

  dayState.username = data.username || "";
  dayState.activity = {};
  var days = (data.heatmap || {}).days || [];
  var earliest = "";
  days.forEach(function (d) {
    var n = (d.workouts || 0) + (d.nutrition || 0) + (d.water || 0);
    if (n > 0) {
      dayState.activity[d.date] = n;
      if (!earliest || d.date < earliest) earliest = d.date;
    }
  });
  dayState.earliest = earliest;

  // Open on the most recent day that actually has something in it, so the
  // section never greets a reader with an empty Saturday.
  var keys = Object.keys(dayState.activity).sort();
  var start = keys.length ? keys[keys.length - 1] : isoDay(new Date());
  dayState.weekStart = sundayOf(parseDay(start));
  if (els.dayPick) {
    els.dayPick.max = isoDay(new Date());
    if (earliest) els.dayPick.min = earliest;
  }
  loadDay(start);
}

function wireDayLog() {
  if (els.dayWeek) {
    els.dayWeek.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-day]");
      if (!b || b.disabled) return;
      loadDay(b.dataset.day);
    });
  }
  function shiftWeek(delta) {
    if (!dayState.weekStart) return;
    dayState.weekStart = new Date(dayState.weekStart.getFullYear(),
      dayState.weekStart.getMonth(), dayState.weekStart.getDate() + delta * 7);
    renderDayWeek();
  }
  if (els.dayPrevWeek) els.dayPrevWeek.addEventListener("click", function () { shiftWeek(-1); });
  if (els.dayNextWeek) els.dayNextWeek.addEventListener("click", function () { shiftWeek(1); });
  if (els.dayPick) {
    els.dayPick.addEventListener("change", function (e) {
      var v = String(e.target.value || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
      dayState.weekStart = sundayOf(parseDay(v));
      loadDay(v);
    });
  }
}

function renderProfile(data) {
  var profile = data.profile || {};
  var stats = data.stats || {};

  // Set BEFORE any row renderer runs, since they read it rather than
  // receiving it as an argument.
  profileState.timezone = profile.timezone || "";
  profileState.habits = data.habits || null;

  var username = data.username || profile.username || "";
  var displayName = profile.displayName || username || "User";
  var joined = formatDate(profile.joinedAt || data.joinedAt);

  var totalWorkouts = stats.totalWorkouts ?? null;
  var streak = stats.currentStreak ?? null;
  var activeDays = stats.activeDays ?? null;

  setMeta(username, displayName, stats, profile.memberNumber);

  // THE HEADING IS THE USERNAME. displayName resolves to the flair emoji
  // first, so the page's <h1> was literally "👨" with the actual name demoted
  // to the line beneath it.
  var flair = /^[\p{L}\p{N}]/u.test(displayName) ? "" : displayName;
  if (els.userAvatar) els.userAvatar.textContent = flair
    || (username.replace(/[^\p{L}\p{N}]/gu, " ").trim()[0] || "?").toUpperCase();
  if (els.userDisplayName) els.userDisplayName.textContent = username ? "@" + username : displayName;

  // MEMBER NUMBER as a standing credential: joining early is a thing you keep,
  // and it only means anything next to the date it came from.
  var memberNo = profile.memberNumber;
  if (els.userHandle) {
    els.userHandle.textContent = memberNo ? "Member #" + memberNo : "";
  }
  if (els.userJoined) {
    els.userJoined.textContent = joined
      ? (memberNo ? "Joined " + joined : "Joined " + joined)
      : "";
  }

  // MOTTO — the user's own words, set over text with /motto. textContent, not
  // innerHTML: this is the one string on the page that a user authored, so it
  // is never parsed as markup no matter what the API returned.
  if (els.userMotto) {
    var motto = typeof profile.motto === "string" ? profile.motto.trim() : "";
    els.userMotto.textContent = motto;
    els.userMotto.hidden = !motto;
  }

  renderSocials(els.userSocials, profile.socials);

  if (els.userStatWorkouts) els.userStatWorkouts.textContent = formatNumber(totalWorkouts);
  if (els.userStatStreak) els.userStatStreak.textContent = formatNumber(streak);
  if (els.userStatDays) els.userStatDays.textContent = formatNumber(activeDays);
  // `visibility` is declared BELOW with var, so reading it here saw the
  // hoisted `undefined` and the stats bar was hidden unconditionally — no
  // consent setting could ever reveal it. Declared before first use now.
  var visibility = data.publicVisibility || {};
  if (els.userStatsBar) els.userStatsBar.hidden = visibility.statsBar !== true;

  var heatmap = data.heatmap || {};
  var days = heatmap.days || [];

  if (visibility.merged === true) {
    renderHeatmapChart(els.userMergedHeatmap, days, "merged");
    if (els.mergedHeatmapCard) els.mergedHeatmapCard.hidden = false;
  } else if (els.mergedHeatmapCard) {
    els.mergedHeatmapCard.hidden = true;
  }

  if (visibility.workouts === true) {
    renderHeatmapChart(els.userWorkoutHeatmap, days, "workouts");
    if (els.workoutHeatmapCard) els.workoutHeatmapCard.hidden = false;
  } else if (els.workoutHeatmapCard) {
    els.workoutHeatmapCard.hidden = true;
  }

  if (visibility.nutrition === true) {
    renderHeatmapChart(els.userNutritionHeatmap, days, "nutrition");
    if (els.nutritionHeatmapCard) els.nutritionHeatmapCard.hidden = false;
  } else if (els.nutritionHeatmapCard) {
    els.nutritionHeatmapCard.hidden = true;
  }

  if (visibility.water === true) {
    renderHeatmapChart(els.userWaterHeatmap, days, "water");
    if (els.waterHeatmapCard) els.waterHeatmapCard.hidden = false;
  } else if (els.waterHeatmapCard) {
    els.waterHeatmapCard.hidden = true;
  }

  var leaderboard = data.leaderboard || {};

  if (visibility.leaderboard === true) {
    renderLeaderboardRows(els.userStrengthRows, leaderboard.strength);
    renderLeaderboardRows(els.userCalisthenicsRows, leaderboard.calisthenics);
    renderStreaksRow(els.userStreaksRows, leaderboard.streaks);
    if (els.strengthCard) els.strengthCard.hidden = !leaderboard.strength;
    if (els.calisthenicsCard) els.calisthenicsCard.hidden = !leaderboard.calisthenics;
    if (els.streaksCard) els.streaksCard.hidden = !leaderboard.streaks;
    if (els.userLeaderboard) els.userLeaderboard.hidden = false;
  } else if (els.userLeaderboard) {
    els.userLeaderboard.hidden = true;
  }

  if (visibility.recentWorkouts === true) {
    renderRecentWorkouts(els.userRecentWorkoutList, data.recentWorkouts);
    if (els.userRecentWorkouts) {
      els.userRecentWorkouts.hidden = !Array.isArray(data.recentWorkouts) || !data.recentWorkouts.length;
    }
  } else if (els.userRecentWorkouts) {
    els.userRecentWorkouts.hidden = true;
  }

  initBodyMap(data);
  initDayLog(data);
  showProfile();
}

/* ======== Fetch ======== */

async function fetchPublicProfile(username) {
  var url = API_BASE + "/api/u/" + encodeURIComponent(username);
  var res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error("NOT_FOUND");
    throw new Error("Server error (" + res.status + ")");
  }

  var data = await res.json();
  if (!data || !data.ok) {
    throw new Error(data?.error || "Profile unavailable");
  }

  return data;
}

/* ======== Init ======== */

async function init() {
  cacheElements();
  wireDayLog();        // listeners bind once; the data arrives later
  wireBodyMap();

  var username = extractUsernameFromPath();

  if (!username) {
    showError("Invalid URL", "No username found in the URL. Try /@yourname");
    return;
  }

  showLoading();
  renderSkeletonChart(els.userMergedHeatmap);
  renderSkeletonChart(els.userWorkoutHeatmap);
  renderSkeletonChart(els.userNutritionHeatmap);
  renderSkeletonChart(els.userWaterHeatmap);

  try {
    var data = await fetchPublicProfile(username);
    renderProfile(data);
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      showError("User Not Found", "@" + escapeHtml(username) + " doesn't exist or hasn't set up a public profile yet.");
    } else {
      showError("Something went wrong", "Couldn't load this profile. Please try again later.");
      console.warn("User page fetch error:", err);
    }
  }
}

init();
