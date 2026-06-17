const API_BASE = "https://api.thetrackerapp.io";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const els = {};

function cacheElements() {
  const ids = [
    "userLoading", "userError", "userErrorTitle", "userErrorMessage",
    "userProfileHeader", "userStatsBar", "userHeatmaps",
    "userAvatar", "userDisplayName", "userHandle", "userJoined",
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

function setMeta(name, displayName) {
  var title = (displayName || name) + " | The Tracker App";
  var desc = "View " + (displayName || name) + "'s fitness activity, workout heatmaps, and tracking stats on The Tracker App.";
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

function renderRecentWorkouts(target, workouts) {
  if (!target) return;

  var safe = Array.isArray(workouts) ? workouts : [];
  if (!safe.length) {
    target.innerHTML = '<p class="heatmap-empty">No recent workouts logged.</p>';
    return;
  }

  target.innerHTML = safe.slice(0, 10).map(function (w) {
    var date = formatShortDate(w.date || w.loggedAt || w.createdAt);
    var exercise = escapeHtml(w.exercise || w.name || w.label || "Workout");
    var details = [w.sets, w.reps, w.weight].filter(function (v) { return v !== undefined && v !== null; });
    var detailStr = details.length
      ? details.join("\u00d7") + (w.unit ? " " + escapeHtml(w.unit) : "")
      : escapeHtml(w.detail || w.notes || "");

    return '<div class="user-recent-item">' +
      '<span class="user-recent-date">' + escapeHtml(date) + '</span>' +
      '<span class="user-recent-exercise">' + exercise + '</span>' +
      (detailStr ? '<span class="user-recent-detail">' + detailStr + '</span>' : "") +
      '</div>';
  }).join("");
}

/* ======== Render ======== */

function renderProfile(data) {
  var profile = data.profile || {};
  var stats = data.stats || {};

  var username = data.username || profile.username || "";
  var displayName = profile.displayName || username || "User";
  var joined = formatDate(profile.joinedAt || data.joinedAt);

  var totalWorkouts = stats.totalWorkouts ?? null;
  var streak = stats.currentStreak ?? null;
  var activeDays = stats.activeDays ?? null;

  setMeta(username, displayName);

  var initial = (displayName.replace(/[^\p{L}\p{N}]/gu, " ").trim()[0] || "?").toUpperCase();
  if (els.userAvatar) els.userAvatar.textContent = initial;
  if (els.userDisplayName) els.userDisplayName.textContent = displayName;
  if (els.userHandle) els.userHandle.textContent = username ? "@" + username : "";
  if (els.userJoined) els.userJoined.textContent = joined ? "Joined " + joined : "";

  if (els.userStatWorkouts) els.userStatWorkouts.textContent = formatNumber(totalWorkouts);
  if (els.userStatStreak) els.userStatStreak.textContent = formatNumber(streak);
  if (els.userStatDays) els.userStatDays.textContent = formatNumber(activeDays);
  if (els.userStatsBar) els.userStatsBar.hidden = visibility.statsBar !== true;

  var heatmap = data.heatmap || {};
  var days = heatmap.days || [];
  var visibility = data.publicVisibility || {};

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
