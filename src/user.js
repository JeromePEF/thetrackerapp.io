const API_BASE = "https://api.thetrackerapp.io";

const els = {
  loading: document.getElementById("userLoading"),
  error: document.getElementById("userError"),
  errorTitle: document.getElementById("userErrorTitle"),
  errorMessage: document.getElementById("userErrorMessage"),
  profileHeader: document.getElementById("userProfileHeader"),
  statsBar: document.getElementById("userStatsBar"),
  heatmaps: document.getElementById("userHeatmaps"),
  avatar: document.getElementById("userAvatar"),
  displayName: document.getElementById("userDisplayName"),
  handle: document.getElementById("userHandle"),
  joined: document.getElementById("userJoined"),
  statWorkouts: document.getElementById("userStatWorkouts"),
  statStreak: document.getElementById("userStatStreak"),
  statDays: document.getElementById("userStatDays"),
  workoutHeatmap: document.getElementById("userWorkoutHeatmap"),
  nutritionHeatmap: document.getElementById("userNutritionHeatmap"),
  waterHeatmap: document.getElementById("userWaterHeatmap"),
  workoutCard: document.getElementById("workoutHeatmapCard"),
  nutritionCard: document.getElementById("nutritionHeatmapCard"),
  waterCard: document.getElementById("waterHeatmapCard"),
  pageTitle: document.getElementById("userPageTitle"),
  pageDescription: document.getElementById("userPageDescription"),
  ogTitle: document.getElementById("ogTitle"),
  ogDescription: document.getElementById("ogDescription"),
  ogUrl: document.getElementById("ogUrl"),
  twitterTitle: document.getElementById("twitterTitle"),
  twitterDescription: document.getElementById("twitterDescription"),
  canonicalUrl: document.getElementById("canonicalUrl"),
};

function escapeHtml(value) {
  const str = String(value ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractUsernameFromPath() {
  const path = window.location.pathname;
  const match = /^\/@(.+)$/.exec(path);
  if (match) {
    const raw = match[1];
    try {
      return decodeURIComponent(raw).trim();
    } catch {
      return raw.trim();
    }
  }
  return "";
}

function showError(title, message) {
  if (els.loading) els.loading.hidden = true;
  if (els.profileHeader) els.profileHeader.hidden = true;
  if (els.statsBar) els.statsBar.hidden = true;
  if (els.heatmaps) els.heatmaps.hidden = true;
  if (els.error) {
    els.error.hidden = false;
    els.errorTitle.textContent = title;
    els.errorMessage.textContent = message;
  }
}

function showProfile() {
  if (els.loading) els.loading.hidden = true;
  if (els.error) els.error.hidden = true;
  if (els.profileHeader) els.profileHeader.hidden = false;
  if (els.statsBar) els.statsBar.hidden = false;
  if (els.heatmaps) els.heatmaps.hidden = false;
}

function setMeta(name, displayName) {
  const title = `${displayName || name} | The Tracker App`;
  const desc = `View ${displayName || name}'s fitness activity, workout heatmaps, and tracking stats on The Tracker App.`;
  const profileUrl = `https://thetrackerapp.io/@${encodeURIComponent(name)}`;

  if (els.pageTitle) els.pageTitle.textContent = title;
  if (els.pageDescription) els.pageDescription.setAttribute("content", desc);
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
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

function formatNumber(n) {
  if (n === null || n === undefined) return "-";
  return Number(n).toLocaleString();
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function readRecordDate(record) {
  if (!record) return null;
  const candidates = [record.date, record.loggedAt, record.createdAt, record.timestamp, record.recordedAt];
  for (const c of candidates) {
    if (c) {
      const parsed = new Date(c);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

function recordDateKey(record) {
  const parsed = readRecordDate(record);
  if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) return "";
  return startOfDay(parsed).toISOString().slice(0, 10);
}

function renderHeatmap(target, entries) {
  if (!target) return;

  target.innerHTML = "";

  const safeEntries = Array.isArray(entries) ? entries : [];
  if (!safeEntries.length) {
    const empty = document.createElement("p");
    empty.className = "heatmap-empty";
    empty.textContent = "No activity data available.";
    target.appendChild(empty);
    return;
  }

  const counts = new Map();
  safeEntries.forEach((entry) => {
    const key = recordDateKey(entry);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const today = startOfDay(new Date());
  const cells = [];
  for (let offset = 83; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    cells.push(day);
  }

  const maxCount = Math.max(1, ...cells.map((day) => counts.get(day.toISOString().slice(0, 10)) || 0));

  cells.forEach((day) => {
    const key = day.toISOString().slice(0, 10);
    const count = counts.get(key) || 0;
    let level = 0;
    if (count > 0) {
      level = Math.min(4, Math.max(1, Math.ceil((count / maxCount) * 4)));
    }
    const cell = document.createElement("div");
    cell.className = "heatmap-cell";
    cell.dataset.level = String(level);
    cell.title = `${key}: ${count}`;
    target.appendChild(cell);
  });
}

function renderProfile(data) {
  const profile = data.profile || {};
  const username = data.username || profile.username || "";
  const displayName = data.displayName || profile.displayName || username || "User";
  const joined = formatDate(data.joinedAt || profile.joinedAt || data.createdAt || profile.createdAt);
  const totalWorkouts = data.totalWorkouts ?? profile.totalWorkouts ?? data.stats?.totalWorkouts ?? null;
  const streak = data.currentStreak ?? profile.currentStreak ?? data.stats?.currentStreak ?? null;
  const activeDays = data.activeDays ?? profile.activeDays ?? data.stats?.activeDays ?? null;

  setMeta(username, displayName);

  const initial = (displayName.replace(/[^\p{L}\p{N}]/gu, " ").trim()[0] || "?").toUpperCase();
  if (els.avatar) els.avatar.textContent = initial;
  if (els.displayName) els.displayName.textContent = displayName;
  if (els.handle) els.handle.textContent = `@${username}`;
  if (els.joined) els.joined.textContent = joined ? `Joined ${joined}` : "";

  if (els.statWorkouts) els.statWorkouts.textContent = formatNumber(totalWorkouts);
  if (els.statStreak) els.statStreak.textContent = formatNumber(streak);
  if (els.statDays) els.statDays.textContent = formatNumber(activeDays);

  const history = data.history || {};
  const visibility = data.publicVisibility || {};

  if (visibility.workouts !== false) {
    renderHeatmap(els.workoutHeatmap, history.workouts);
    if (els.workoutCard) els.workoutCard.hidden = false;
  } else if (els.workoutCard) {
    els.workoutCard.hidden = true;
  }

  if (visibility.nutrition !== false) {
    renderHeatmap(els.nutritionHeatmap, history.nutrition);
    if (els.nutritionCard) els.nutritionCard.hidden = false;
  } else if (els.nutritionCard) {
    els.nutritionCard.hidden = true;
  }

  if (visibility.water !== false) {
    renderHeatmap(els.waterHeatmap, history.water);
    if (els.waterCard) els.waterCard.hidden = false;
  } else if (els.waterCard) {
    els.waterCard.hidden = true;
  }

  showProfile();
}

async function fetchPublicProfile(username) {
  const url = `${API_BASE}/api/u/${encodeURIComponent(username)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("NOT_FOUND");
    }
    throw new Error(`Server error (${res.status})`);
  }

  const data = await res.json();
  if (!data || !data.ok) {
    throw new Error(data?.error || "Profile unavailable");
  }

  return data;
}

async function init() {
  const username = extractUsernameFromPath();

  if (!username) {
    showError("Invalid URL", "No username found in the URL. Try /@yourname");
    return;
  }

  try {
    const data = await fetchPublicProfile(username);
    renderProfile(data);
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      showError("User Not Found", `@${escapeHtml(username)} doesn't exist or hasn't set up a public profile yet.`);
    } else {
      showError("Something went wrong", "Couldn't load this profile. Please try again later.");
      console.warn("User page fetch error:", err);
    }
  }
}

init();
