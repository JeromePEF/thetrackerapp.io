import { API_BASE, fetchLiveMetrics, fetchPublicLeaderboardSnapshot, submitSignup } from "./api.js";
import { inject } from "@vercel/analytics";
import { initGoogleAnalytics } from "./google-analytics.js";
import { attachRefToPayload, captureRefFromUrl } from "./affiliate-ref.js";
import { fetchFeatureFlags, applyFeatureFlags } from "./feature-flags.js";

const SERVICES = [
  {
    id: "imessage",
    label: "iMessage",
    logo: "/SVGS/IMessage_logo.svg",
    provider: "iMessage",
    identityKind: "imessage-contact",
  },
  {
    id: "sms",
    label: "SMS",
    logo: "/SVGS/SMS.svg",
    provider: "SMS",
    identityKind: "phone",
  },
  {
    id: "telegram",
    label: "Telegram",
    logo: "/SVGS/Telegram_logo.svg",
    provider: "Telegram",
    identityKind: "bot-link",
  },
];

const state = {
  serviceId: "imessage",
};
const AUTH_FLAG_KEY = "tracker.authenticated";
const DASHBOARD_HOME_URL = "https://dashboard.thetrackerapp.io/dashboard";
const DASHBOARD_HOST = "dashboard.thetrackerapp.io";

const RUN_CLUB_ENDPOINTS = ["/api/run-clubs", "/api/clubs/run", "/api/clubs?type=run", "/run-clubs"];
const PERSONAL_TRAINER_ENDPOINTS = ["/api/personal-trainers", "/api/trainers", "/api/coaches", "/personal-trainers"];
const RUN_CLUB_KEYS = ["runClubs", "clubs", "items", "results", "rows", "data"];
const PERSONAL_TRAINER_KEYS = ["personalTrainers", "trainers", "coaches", "items", "results", "rows", "data"];
const LIVE_LEADERBOARD_REFRESH_MS = 30000;
const LIVE_PEBBLE_STEPS_REFRESH_MS = 5000;
const LIVE_WORKOUT_TOAST_HIDE_MS = 4300;
const LIVE_WORKOUT_TOAST_INTERVAL_MS = 5000;
const LIVE_WORKOUT_TOAST_SNOOZE_MS = 5 * 60 * 1000;
const STEPS_TAPE_MAX_ROWS = 20;
const STEPS_PER_MILE = 2000;
const UNIT_SYSTEM_STORAGE_KEY = "tracker.unitSystem";
const DEV_SAMPLE_LIVE_EVENTS = [
  { name: "UN", exercise: "Bench Press", value: "1,315lb", streak: 100 },
  { name: "RB", exercise: "Run", value: "62 min", streak: 42 },
  { name: "KM", exercise: "Deadlift", value: "515lb", streak: 30 },
  { name: "TS", exercise: "Squat", value: "405lb", streak: 21 },
];
const DEV_SAMPLE_STEPS_TAPE_EVENTS = [
  { name: "UN", delta: 6, total: 12450, occurredAt: "2026-01-01T00:00:00.000Z" },
  { name: "RB", delta: 11, total: 20122, occurredAt: "2026-01-01T00:00:01.000Z" },
  { name: "KM", delta: 8, total: 18902, occurredAt: "2026-01-01T00:00:02.000Z" },
];
const els = {
  appShell: document.getElementById("appShell"),
  mainContent: document.getElementById("main-content"),
  headerStats: document.querySelector(".header-stats"),
  serviceShell: document.getElementById("serviceShell"),
  serviceSelect: document.getElementById("serviceSelect"),
  serviceCarousel: document.getElementById("serviceCarousel"),
  serviceCarouselLabel: document.getElementById("serviceCarouselLabel"),
  loginLink: document.getElementById("loginLink"),
  dashboardLink: document.getElementById("dashboardLink"),
  authBracketsList: document.getElementById("authBracketsList"),
  runClubsNavLink: document.getElementById("runClubsNavLink"),
  personalTrainersNavLink: document.getElementById("personalTrainersNavLink"),
  stepsCounterPanel: document.getElementById("stepsCounterPanel"),

  usersTodayCount: document.getElementById("usersTodayCount"),
  usersWeekCount: document.getElementById("usersWeekCount"),
  usersOnlineCount: document.getElementById("usersOnlineCount"),
  workoutsLoggedCount: document.getElementById("workoutsLoggedCount"),
  caloriesTrackedCount: document.getElementById("caloriesTrackedCount"),
  gallonsDrankCount: document.getElementById("gallonsDrankCount"),
  usersTodayLink: document.getElementById("usersTodayLink"),
  usersWeekLink: document.getElementById("usersWeekLink"),
  usersOnlineLink: document.getElementById("usersOnlineLink"),
  workoutsLoggedLink: document.getElementById("workoutsLoggedLink"),
  caloriesTrackedLink: document.getElementById("caloriesTrackedLink"),
  gallonsDrankLink: document.getElementById("gallonsDrankLink"),
  leaderboardList: document.getElementById("leaderboardList"),
  leaderboardState: document.getElementById("leaderboardState"),
  groupLeaderboardList: document.getElementById("groupLeaderboardList"),
  groupLeaderboardState: document.getElementById("groupLeaderboardState"),
  pebbleCaloriesList: document.getElementById("pebbleCaloriesList"),
  pebbleWorkoutsList: document.getElementById("pebbleWorkoutsList"),
  pebbleStepsList: document.getElementById("pebbleStepsList"),
  pebbleSleepList: document.getElementById("pebbleSleepList"),
  pebbleMilesList: document.getElementById("pebbleMilesList"),
  pebbleLeaderboardState: document.getElementById("pebbleLeaderboardState"),
  streakLeaderboardList: document.getElementById("streakLeaderboardList"),
  streakLeaderboardState: document.getElementById("streakLeaderboardState"),
  streakLiveCallout: document.getElementById("streakLiveCallout"),
  unitToggleButton: document.getElementById("unitToggleButton"),
  stepsTapeTotalSteps: document.getElementById("stepsTapeTotalSteps"),
  stepsTapeTotalMiles: document.getElementById("stepsTapeTotalMiles"),
  stepsTapeList: document.getElementById("stepsTapeList"),
  stepsTapeState: document.getElementById("stepsTapeState"),

  signupForm: document.getElementById("signupForm"),
  formIntro: document.querySelector(".signup-form .form-intro"),
  formFlow: document.querySelector(".signup-form .form-flow"),
  serviceIdentityText: document.getElementById("serviceIdentityText"),
  serviceIdentityHelp: document.getElementById("serviceIdentityHelp"),
  serviceIdentityInput: document.getElementById("serviceIdentityInput"),
  serviceIdentityLabel: document.getElementById("serviceIdentityLabel"),
  telegramLinkBox: document.getElementById("telegramLinkBox"),
  // Email collection was removed from the hero onboarding form — email is
  // captured + verified during text onboarding instead. Refs kept as null
  // so any straggling references no-op rather than throw.
  emailInput: null,
  emailLabel: null,
  consentWrap: document.getElementById("consentWrap"),
  consentCheckbox: document.getElementById("consentCheckbox"),
  // Terms / Privacy / AI checkboxes were removed from the hero form — the
  // single consent checkbox now covers SMS opt-in + implicit ToS/Privacy
  // acceptance (those disclosures live on the respective pages).
  termsConsentCheckbox: null,
  aiConsentCheckbox: null,
  aiConsentWrap: null,
  signupStatus: document.getElementById("signupStatus"),
  liveWorkoutToast: document.getElementById("liveWorkoutToast"),
  liveWorkoutToastMessage: document.getElementById("liveWorkoutToastMessage"),
};

let fitFrame = 0;
let liveWorkoutTicker = 0;
let liveWorkoutHideTimer = 0;
let liveWorkoutSnoozeUntil = 0;
let liveWorkoutVisibilityFrame = 0;
let leaderboardRefreshTicker = 0;
let pebbleStepsRefreshTicker = 0;
let ignoreCarouselClickUntil = 0;
let lastWheelChangeAt = 0;
let leaderboardRequestInFlight = false;
let pebbleStepsRequestInFlight = false;
let hasLoadedLeaderboard = false;
let hasLoadedUserMetrics = false;
let hasLoadedActivityMetrics = false;
let liveMetricsRequestToken = 0;
let latestStrengthEntries = [];
let latestCalisthenicsEntries = [];
let latestPebblePayload = null;
let latestStreakEntries = [];
let latestStreakCallout = "";
let activeUnitSystem = "imperial";

const carouselGesture = {
  active: false,
  startX: 0,
  startY: 0,
};

const liveWorkoutState = {
  events: [],
  index: 0,
};

const stepsTapeState = {
  events: [],
  previousTotals: new Map(),
  initialized: false,
};

const ACTIVITY_WINDOWS = ["week"];
const ACTIVITY_WINDOW_LABELS = {
  week: "Week",
};

let activeMetricsWindow = "week";

function normalizeActivityWindow(windowValue) {
  const normalized = String(windowValue || "week")
    .trim()
    .toLowerCase();

  return ACTIVITY_WINDOWS.includes(normalized) ? normalized : "week";
}

function activityWindowLabel(windowValue) {
  const normalized = normalizeActivityWindow(windowValue);
  return ACTIVITY_WINDOW_LABELS[normalized] || ACTIVITY_WINDOW_LABELS.week;
}

function isAuthenticated() {
  try {
    return window.localStorage.getItem(AUTH_FLAG_KEY) === "true";
  } catch {
    return false;
  }
}

function syncAuthNavigation() {
  const loggedIn = isAuthenticated();

  if (els.dashboardLink) {
    els.dashboardLink.hidden = true;
    els.dashboardLink.href = DASHBOARD_HOME_URL;
  }

  if (els.loginLink) {
    els.loginLink.textContent = loggedIn ? "Dashboard" : "Login";
    els.loginLink.href = loggedIn ? DASHBOARD_HOME_URL : `/login?next=${encodeURIComponent(DASHBOARD_HOME_URL)}`;
  }

  // Toggle leaderboard-focused view when authenticated
  if (document.body) {
    document.body.classList.toggle("is-authenticated", loggedIn);
  }

  // Load brackets preview when authenticated
  if (loggedIn) {
    loadAuthBrackets();
  }
}

async function loadAuthBrackets() {
  if (!els.authBracketsList) return;
  try {
    const res = await fetch("https://api.thetrackerapp.io/brackets/active", {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Brackets fetch failed");
    const data = await res.json();
    const brackets = Array.isArray(data?.brackets) ? data.brackets : [];
    if (brackets.length === 0) {
      els.authBracketsList.innerHTML = `<p class="panel-state">No active brackets. <a href="/brackets" style="color:var(--accent)">Browse all brackets</a></p>`;
      return;
    }
    els.authBracketsList.innerHTML = brackets
      .slice(0, 5)
      .map(
        (b) => `
        <a href="/brackets#${escapeHtml(String(b.id || ""))}" class="bracket-card">
          <span class="bracket-card-title">${escapeHtml(String(b.name || "Bracket"))}</span>
          <span class="bracket-card-meta">
            <span>👥 ${escapeHtml(String(b.participants || 0))} players</span>
            <span>🏆 ${escapeHtml(String(b.prize || "Glory"))}</span>
            <span>⏱ ${escapeHtml(String(b.endsIn || "Active"))}</span>
          </span>
        </a>`
      )
      .join("");
  } catch (err) {
    els.authBracketsList.innerHTML = `<p class="panel-state">Active brackets unavailable. <a href="/brackets" style="color:var(--accent)">View all</a></p>`;
  }
}

function redirectDashboardHostHomeToDashboardPage() {
  const path = window.location.pathname;
  if (window.location.hostname !== DASHBOARD_HOST) {
    return false;
  }

  if (path !== "/" && path !== "/index" && path !== "/index.html") {
    return false;
  }

  window.location.replace(DASHBOARD_HOME_URL);
  return true;
}

function syncHeaderStatsHint() {
  if (!els.headerStats) {
    return;
  }

  const label = activityWindowLabel(activeMetricsWindow).toUpperCase();
  els.headerStats.setAttribute(
    "data-window-hint",
    `Current ${label}`,
  );
}

function extractDiscoveryItems(payload, keys) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  const nestedContainers = [payload.data, payload.payload, payload.result, payload.results].filter(Boolean);
  for (const container of nestedContainers) {
    if (Array.isArray(container)) {
      return container;
    }

    if (container && typeof container === "object") {
      for (const value of Object.values(container)) {
        if (Array.isArray(value)) {
          return value;
        }
      }
    }
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function payloadHasDiscoveryRows(payload, keys) {
  const rows = extractDiscoveryItems(payload, keys);
  if (rows.length > 0) {
    return true;
  }

  if (!payload || typeof payload !== "object") {
    return false;
  }

  const singleName =
    payload.name ||
    payload.title ||
    payload.clubName ||
    payload.trainerName ||
    payload.fullName;

  return typeof singleName === "string" && singleName.trim().length > 0;
}

async function hasDiscoveryRows(endpoints, keys) {
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (!response.ok) {
        continue;
      }

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (payloadHasDiscoveryRows(payload, keys)) {
        return true;
      }
    } catch {
      // Continue trying fallback discovery endpoints.
    }
  }

  return false;
}

async function updateDiscoveryNavVisibility() {
  if (!els.runClubsNavLink || !els.personalTrainersNavLink) {
    return;
  }

  let hasRunClubs = false;
  let hasPersonalTrainers = false;

  try {
    const snapshot = await fetchPublicLeaderboardSnapshot();
    hasRunClubs = toNumber(snapshot.directories?.runClubsCount) > 0;
    hasPersonalTrainers = toNumber(snapshot.directories?.personalTrainersCount) > 0;
  } catch {
    const results = await Promise.all([
      hasDiscoveryRows(RUN_CLUB_ENDPOINTS, RUN_CLUB_KEYS),
      hasDiscoveryRows(PERSONAL_TRAINER_ENDPOINTS, PERSONAL_TRAINER_KEYS),
    ]);
    hasRunClubs = results[0];
    hasPersonalTrainers = results[1];
  }

  els.runClubsNavLink.hidden = !hasRunClubs;
  els.personalTrainersNavLink.hidden = !hasPersonalTrainers;
  requestViewportFit();
}

function currentService() {
  return SERVICES.find((service) => service.id === state.serviceId) || SERVICES[0];
}

function uppercaseText(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function formatWorkoutValue(rawValue) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\b\d{4,}\b/g, (digits) => {
    const parsed = Number(digits);
    if (!Number.isFinite(parsed)) {
      return digits;
    }
    return new Intl.NumberFormat("en-US").format(parsed);
  });
}

function workoutEmoji(exerciseName) {
  const text = String(exerciseName || "").toLowerCase();
  if (text.includes("run")) {
    return "🏃";
  }
  if (text.includes("bench")) {
    return "💪";
  }
  if (text.includes("squat")) {
    return "🦵";
  }
  if (text.includes("deadlift")) {
    return "🏋️";
  }
  if (text.includes("bike") || text.includes("cycle")) {
    return "🚴";
  }
  if (text.includes("swim")) {
    return "🏊";
  }
  return "🔥";
}

function singleEmojiToken(value, fallback = "🔥") {
  const raw = String(value || "").trim();
  if (!raw) {
    return fallback;
  }

  const match = raw.match(/\p{Extended_Pictographic}/u);
  return match ? match[0] : fallback;
}

function normalizeLiveDisplayName(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "SOMEONE";
  }

  const withoutEmoji = raw.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, " ");
  const withoutSymbols = withoutEmoji.replace(/[^\p{L}\p{N}@._\-\s]/gu, " ");
  const compacted = withoutSymbols.replace(/\s+/g, " ").trim();
  return uppercaseText(compacted || "Someone");
}

function buildLiveWorkoutMessage(event) {
  const name = normalizeLiveDisplayName(event?.name);
  const exercise = uppercaseText(event?.exercise || "WORKOUT");
  const value = formatWorkoutValue(event?.value);
  const streak = Number(event?.streak || 0);
  const emoji = singleEmojiToken(event?.emoji, workoutEmoji(exercise));
  const workoutPart = value ? `${exercise} workout for ${value}` : `${exercise} workout`;
  const streakPart = streak > 0 ? `(${new Intl.NumberFormat("en-US").format(streak)} Day Streak)` : "(Streak)";
  return `[${emoji}] ${name}: just did ${workoutPart} ${streakPart}`;
}

function hideLiveWorkoutToast() {
  if (!els.liveWorkoutToast) {
    return;
  }

  els.liveWorkoutToast.classList.remove("is-visible");
}

function rectsOverlap(a, b, padding = 0) {
  return !(
    a.right < b.left - padding ||
    a.left > b.right + padding ||
    a.bottom < b.top - padding ||
    a.top > b.bottom + padding
  );
}

function measureToastRect(message) {
  if (!els.liveWorkoutToast || !els.liveWorkoutToastMessage) {
    return null;
  }

  const toast = els.liveWorkoutToast;
  const toastMessage = els.liveWorkoutToastMessage;
  const previousHidden = toast.hidden;
  const wasVisible = toast.classList.contains("is-visible");
  const previousVisibility = toast.style.visibility;
  const previousText = toastMessage.textContent;

  toast.hidden = false;
  toastMessage.textContent = message;
  toast.classList.add("is-visible");
  toast.style.visibility = "hidden";

  const measured = toast.getBoundingClientRect();
  const rect = {
    top: measured.top,
    right: measured.right,
    bottom: measured.bottom,
    left: measured.left,
    width: measured.width,
    height: measured.height,
  };

  toast.style.visibility = previousVisibility;
  if (!wasVisible) {
    toast.classList.remove("is-visible");
  }
  toast.hidden = previousHidden;
  toastMessage.textContent = previousText;

  return rect;
}

function toastWouldCoverSignupFields(message) {
  if (!els.signupForm) {
    return false;
  }

  const toastRect = measureToastRect(message);
  if (!toastRect) {
    return false;
  }

  const fields = els.signupForm.querySelectorAll("input, select, textarea, button");
  for (const field of fields) {
    const rect = field.getBoundingClientRect();
    const isVisible =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth;

    if (!isVisible) {
      continue;
    }

    if (rectsOverlap(toastRect, rect, 8)) {
      return true;
    }
  }

  return false;
}

function shouldSuppressLiveWorkoutToast(message) {
  if (Date.now() < liveWorkoutSnoozeUntil) {
    return true;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement && activeElement.closest("#signupForm")) {
    return true;
  }

  return toastWouldCoverSignupFields(message);
}

function evaluateLiveWorkoutToastVisibility() {
  if (!els.liveWorkoutToast || !els.liveWorkoutToast.classList.contains("is-visible")) {
    return;
  }

  const message = els.liveWorkoutToastMessage?.textContent || "";
  if (shouldSuppressLiveWorkoutToast(message)) {
    hideLiveWorkoutToast();
  }
}

function scheduleLiveWorkoutToastVisibilityCheck() {
  window.cancelAnimationFrame(liveWorkoutVisibilityFrame);
  liveWorkoutVisibilityFrame = window.requestAnimationFrame(() => {
    liveWorkoutVisibilityFrame = 0;
    evaluateLiveWorkoutToastVisibility();
  });
}

function showLiveWorkoutToast() {
  if (!els.liveWorkoutToast || !els.liveWorkoutToastMessage || !liveWorkoutState.events.length) {
    return;
  }

  const nextEvent = liveWorkoutState.events[liveWorkoutState.index];
  const nextMessage = buildLiveWorkoutMessage(nextEvent);
  if (shouldSuppressLiveWorkoutToast(nextMessage)) {
    hideLiveWorkoutToast();
    return;
  }

  liveWorkoutState.index = (liveWorkoutState.index + 1) % liveWorkoutState.events.length;

  els.liveWorkoutToast.hidden = false;
  els.liveWorkoutToastMessage.textContent = nextMessage;
  els.liveWorkoutToast.classList.add("is-visible");

  window.clearTimeout(liveWorkoutHideTimer);
  liveWorkoutHideTimer = window.setTimeout(hideLiveWorkoutToast, LIVE_WORKOUT_TOAST_HIDE_MS);
  scheduleLiveWorkoutToastVisibilityCheck();
}

function setLiveWorkoutEvents(events) {
  const incomingEvents = Array.isArray(events) ? events.filter((event) => event && event.exercise && event.name) : [];
  liveWorkoutState.events = import.meta.env.DEV ? [...DEV_SAMPLE_LIVE_EVENTS, ...incomingEvents] : incomingEvents;
  liveWorkoutState.index = 0;

  window.clearInterval(liveWorkoutTicker);
  window.clearTimeout(liveWorkoutHideTimer);
  hideLiveWorkoutToast();

  if (!liveWorkoutState.events.length) {
    if (els.liveWorkoutToast) {
      els.liveWorkoutToast.hidden = true;
    }
    return;
  }

  showLiveWorkoutToast();
  liveWorkoutTicker = window.setInterval(showLiveWorkoutToast, LIVE_WORKOUT_TOAST_INTERVAL_MS);
}

function serviceIndexById(serviceId) {
  const index = SERVICES.findIndex((service) => service.id === serviceId);
  return index >= 0 ? index : 0;
}

function wrapServiceIndex(index) {
  const total = SERVICES.length;
  return ((index % total) + total) % total;
}

function shortestCircularOffset(index, activeIndex, total) {
  let offset = index - activeIndex;
  const midpoint = total / 2;

  if (offset > midpoint) {
    offset -= total;
  } else if (offset < -midpoint) {
    offset += total;
  }

  return offset;
}

function renderServiceCarousel() {
  if (!els.serviceCarousel) {
    return;
  }

  els.serviceCarousel.innerHTML = SERVICES.map((service, index) => {
    return `<button type="button" class="service-carousel-item" data-service-index="${index}" role="option" aria-label="${service.label}" aria-selected="false">
      <span class="service-icon-frame">
        <img src="${service.logo}" alt="${service.label} logo" loading="lazy" decoding="async" />
      </span>
    </button>`;
  }).join("");
}

function syncServiceCarousel() {
  if (!els.serviceCarousel) {
    return;
  }

  const activeIndex = serviceIndexById(state.serviceId);
  const total = SERVICES.length;
  const buttons = els.serviceCarousel.querySelectorAll(".service-carousel-item");
  const width = els.serviceCarousel.clientWidth || 640;
  const isCompactViewport = window.matchMedia("(max-width: 640px)").matches;
  const minStep = isCompactViewport ? 88 : 140;
  const maxStep = isCompactViewport ? 150 : 220;
  const xStep = Math.max(minStep, Math.min(maxStep, Math.round(width * (isCompactViewport ? 0.22 : 0.26))));

  buttons.forEach((button, index) => {
    const offset = shortestCircularOffset(index, activeIndex, total);
    const distance = Math.abs(offset);
    const scale = isCompactViewport
      ? distance === 0
        ? 1
        : distance === 1
          ? 0.9
          : distance === 2
            ? 0.82
            : 0.74
      : distance === 0
        ? 1
        : distance === 1
          ? 0.82
          : distance === 2
            ? 0.66
            : 0.54;
    const opacity = isCompactViewport
      ? distance === 0
        ? 1
        : distance === 1
          ? 0.9
          : distance === 2
            ? 0.78
            : 0.64
      : distance === 0
        ? 1
        : distance === 1
          ? 0.8
          : distance === 2
            ? 0.62
            : 0.48;
    const rotate = offset * (isCompactViewport ? -5 : -10);
    const shiftX = offset * xStep;
    const shiftY = distance * (isCompactViewport ? 8 : 14);

    button.style.transform = `translate(-50%, -50%) translate(${shiftX}px, ${shiftY}px) scale(${scale}) rotate(${rotate}deg)`;
    button.style.opacity = String(opacity);
    button.style.zIndex = String(100 - distance);
    button.classList.toggle("is-active", distance === 0);
    button.classList.toggle("is-ghost", distance !== 0);
    button.setAttribute("aria-selected", distance === 0 ? "true" : "false");
    button.tabIndex = distance === 0 ? 0 : -1;
  });
}

function setServiceByIndex(index) {
  const next = SERVICES[wrapServiceIndex(index)];
  if (!next) {
    return;
  }

  state.serviceId = next.id;
  updateServiceVisual();
}

function selectRelativeService(step) {
  setServiceByIndex(serviceIndexById(state.serviceId) + step);
}

function handleCarouselClick(event) {
  if (Date.now() < ignoreCarouselClickUntil) {
    return;
  }

  const button = event.target.closest(".service-carousel-item");
  if (!button) {
    return;
  }

  const index = Number(button.dataset.serviceIndex);
  if (Number.isNaN(index)) {
    return;
  }

  setServiceByIndex(index);
}

function handleCarouselKeydown(event) {
  if (event.key === "ArrowRight") {
    event.preventDefault();
    selectRelativeService(1);
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    selectRelativeService(-1);
  }
}

function handleCarouselPointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  carouselGesture.active = true;
  carouselGesture.startX = event.clientX;
  carouselGesture.startY = event.clientY;
}

function handleCarouselPointerUp(event) {
  if (!carouselGesture.active) {
    return;
  }

  carouselGesture.active = false;
  const deltaX = event.clientX - carouselGesture.startX;
  const deltaY = event.clientY - carouselGesture.startY;

  if (Math.abs(deltaX) < 30 || Math.abs(deltaX) <= Math.abs(deltaY)) {
    return;
  }

  ignoreCarouselClickUntil = Date.now() + 220;
  selectRelativeService(deltaX < 0 ? 1 : -1);
}

function handleCarouselPointerCancel() {
  carouselGesture.active = false;
}

function handleCarouselWheel(event) {
  const now = Date.now();
  if (now - lastWheelChangeAt < 180) {
    return;
  }

  const travel = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (Math.abs(travel) < 14) {
    return;
  }

  event.preventDefault();
  lastWheelChangeAt = now;
  selectRelativeService(travel > 0 ? 1 : -1);
}

function setActiveMetricsWindow(windowValue) {
  activeMetricsWindow = normalizeActivityWindow(windowValue);
  syncHeaderStatsHint();
}

function nextActivityWindow(step) {
  const currentIndex = ACTIVITY_WINDOWS.indexOf(normalizeActivityWindow(activeMetricsWindow));
  const baseIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (baseIndex + step + ACTIVITY_WINDOWS.length) % ACTIVITY_WINDOWS.length;
  return ACTIVITY_WINDOWS[nextIndex];
}

function shouldIgnoreMetricsWindowHotkey(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest("#signupForm"));
}

function handleMetricsWindowKeydown(event) {
  if (shouldIgnoreMetricsWindowHotkey(event)) {
    return;
  }

  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
    return;
  }

  event.preventDefault();
  const nextWindow = event.key === "ArrowRight" ? nextActivityWindow(1) : nextActivityWindow(-1);
  setActiveMetricsWindow(nextWindow);
  void refreshLiveMetricsCounters(nextWindow);
}

function setStatus(target, message, type = "") {
  if (!target) {
    return;
  }

  target.textContent = message;
  target.classList.remove("success", "error");

  if (type) {
    target.classList.add(type);
  }

  requestViewportFit();
}

function splitLeaderboardLine(lineText) {
  const text = String(lineText || "").trim();
  if (!text) {
    return null;
  }

  const separatorIndex = text.indexOf("|");
  if (separatorIndex < 0) {
    return {
      left: text,
      right: "",
    };
  }

  return {
    left: text.slice(0, separatorIndex).trim(),
    right: text.slice(separatorIndex + 1).trim(),
  };
}

function normalizeLeaderboardEntry(entry) {
  const name = String(entry?.name || entry?.username || entry?.user || "User").trim() || "User";
  const exercise = String(entry?.exercise || entry?.metric || entry?.label || "")
    .trim()
    .toUpperCase();

  const rawEmoji = String(entry?.emoji || "").trim();
  const emojiMatch = rawEmoji.match(/\p{Extended_Pictographic}/u);
  const emoji = emojiMatch ? emojiMatch[0] : "";

  const valueLabel = String(entry?.valueLabel || entry?.value || entry?.details || "").trim();
  const score = Math.max(toNumber(entry?.score), 0);
  const lineValue = valueLabel || (score > 0 ? formatNumber(score) : "-");
  const rawLine = String(entry?.line || "").trim();
  const line = rawLine || `${emoji ? `${emoji} ` : ""}${name} | ${lineValue}`;
  const splitLine = splitLeaderboardLine(line);

  return {
    exercise,
    name: splitLine?.left || `${emoji ? `${emoji} ` : ""}${name}`,
    value: splitLine?.right || lineValue,
    line,
  };
}

function setStatsLink(linkEl, metricSheetUrl, masterSheetUrl) {
  if (!linkEl) {
    return;
  }

  const url = typeof metricSheetUrl === "string" && metricSheetUrl.trim() ? metricSheetUrl.trim() : masterSheetUrl;
  if (typeof url === "string" && url.trim()) {
    linkEl.href = url.trim();
  }
}

function setCounterValue(target, value) {
  if (!target) {
    return;
  }

  target.textContent = formatNumber(value || 0);
}

function setCounterValueWithDecimals(target, value, fractionDigits = 1) {
  if (!target) {
    return;
  }

  target.textContent = formatDecimal(typeof value === "number" ? value : toNumber(value), fractionDigits);
}

function applyUserLiveMetrics(liveMetrics) {
  if (!liveMetrics) {
    return;
  }

  const master = liveMetrics.masterLogSheetUrl || "";

  setCounterValue(els.usersTodayCount, liveMetrics.usersUsingToday?.value);
  setCounterValue(els.usersWeekCount, liveMetrics.totalUsersThisWeek?.value);
  setCounterValue(els.usersOnlineCount, liveMetrics.usersOnline?.value);
  setStatsLink(els.usersTodayLink, liveMetrics.usersUsingToday?.sheetUrl, master);
  setStatsLink(els.usersWeekLink, liveMetrics.totalUsersThisWeek?.sheetUrl, master);
  setStatsLink(els.usersOnlineLink, liveMetrics.usersOnline?.sheetUrl, master);
}

function applyActivityLiveMetrics(liveMetrics) {
  if (!liveMetrics) {
    return;
  }

  const master = liveMetrics.masterLogSheetUrl || "";

  setCounterValue(els.workoutsLoggedCount, liveMetrics.workoutsLogged?.value);
  setCounterValue(els.caloriesTrackedCount, liveMetrics.caloriesTracked?.value);
  setCounterValueWithDecimals(els.gallonsDrankCount, liveMetrics.gallonsDrank?.value, 1);

  setStatsLink(els.workoutsLoggedLink, liveMetrics.workoutsLogged?.sheetUrl, master);
  setStatsLink(els.caloriesTrackedLink, liveMetrics.caloriesTracked?.sheetUrl, master);
  setStatsLink(els.gallonsDrankLink, liveMetrics.gallonsDrank?.sheetUrl, master);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatDecimal(value, fractionDigits = 1) {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(numeric);
}

function defaultUnitSystemFromLocale() {
  const locale = String(Intl.NumberFormat().resolvedOptions().locale || navigator.language || "")
    .trim()
    .toLowerCase();

  if (locale.startsWith("en-us") || locale.startsWith("en-lr") || locale.startsWith("my")) {
    return "imperial";
  }

  return "metric";
}

function storedUnitSystem() {
  try {
    const value = String(window.localStorage.getItem(UNIT_SYSTEM_STORAGE_KEY) || "")
      .trim()
      .toLowerCase();
    return value === "metric" || value === "imperial" ? value : "";
  } catch {
    return "";
  }
}

function setStoredUnitSystem(unitSystem) {
  try {
    window.localStorage.setItem(UNIT_SYSTEM_STORAGE_KEY, unitSystem);
  } catch {
    // Ignore storage failures.
  }
}

function useMetric() {
  return activeUnitSystem === "metric";
}

function formatConvertedNumber(value) {
  const rounded = Math.round(value * 10) / 10;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(rounded);
}

function convertUnitValueLabel(rawValue) {
  const text = String(rawValue || "").trim();
  if (!text || text === "-" || text.toLowerCase().includes("no data")) {
    return text;
  }

  return text.replace(/(\d[\d,]*(?:\.\d+)?)\s*(lb|lbs|kg|mi|mile|miles|km|kilometer|kilometers)\b/gi, (match, numberPart, unitPart) => {
    const numeric = Number(String(numberPart || "").replace(/,/g, ""));
    if (!Number.isFinite(numeric)) {
      return match;
    }

    const unit = String(unitPart || "").toLowerCase();

    if (useMetric() && (unit === "lb" || unit === "lbs")) {
      return `${formatConvertedNumber(numeric * 0.45359237)} kg`;
    }

    if (!useMetric() && unit === "kg") {
      return `${formatConvertedNumber(numeric * 2.2046226218)} lb`;
    }

    if (useMetric() && (unit === "mi" || unit === "mile" || unit === "miles")) {
      return `${formatConvertedNumber(numeric * 1.60934)} km`;
    }

    if (!useMetric() && (unit === "km" || unit === "kilometer" || unit === "kilometers")) {
      return `${formatConvertedNumber(numeric * 0.6213711922)} mi`;
    }

    return match;
  });
}

function formatDistance(miles) {
  if (useMetric()) {
    const km = miles * 1.60934;
    return `${formatDecimal(km)} km`;
  }
  return `${formatDecimal(miles)} mi`;
}

function syncUnitToggleButtonLabel() {
  if (!els.unitToggleButton) {
    return;
  }

  const label = useMetric() ? "Metric" : "US";
  els.unitToggleButton.textContent = label;
  els.unitToggleButton.setAttribute(
    "aria-label",
    useMetric() ? "Switch to imperial units" : "Switch to metric units",
  );
}

function applyUnitSystem(unitSystem, persist = true) {
  activeUnitSystem = unitSystem === "metric" ? "metric" : "imperial";
  syncUnitToggleButtonLabel();

  if (persist) {
    setStoredUnitSystem(activeUnitSystem);
  }

  renderLeaderboard(latestStrengthEntries);
  renderGroupLeaderboard(latestCalisthenicsEntries);
  renderStreakLeaderboard(latestStreakEntries);
  renderStreakLiveCallout(latestStreakCallout);

  if (latestPebblePayload) {
    renderPebbleLeaderboard(latestPebblePayload);
    applyPebbleStepsTapePayload(latestPebblePayload);
  }
}

async function hydrateUnitSystemFromIp() {
  if (storedUnitSystem()) {
    return;
  }

  try {
    const response = await fetch("/api/unit-system", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const body = await response.json().catch(() => null);
    const unitSystem = String(body?.unitSystem || "")
      .trim()
      .toLowerCase();

    if (unitSystem !== "metric" && unitSystem !== "imperial") {
      return;
    }

    if (unitSystem !== activeUnitSystem) {
      applyUnitSystem(unitSystem, false);
    }
  } catch {
    // Keep locale default on network failure.
  }
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "").trim();
    if (!cleaned) {
      return 0;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeStepTapeEvent(event) {
  const name = String(event?.name || event?.username || event?.contact || "User").trim() || "User";
  const delta = Math.max(Math.round(toNumber(event?.delta)), 0);
  const total = Math.max(Math.round(toNumber(event?.total)), 0);
  const occurredAt = String(event?.occurredAt || event?.timestamp || event?.date || new Date().toISOString()).trim();

  return { name, delta, total, occurredAt };
}

function deriveStepTapeDeltasFromTopRows(stepRows) {
  const nowIso = new Date().toISOString();
  const currentTotals = new Map();
  const deltas = [];

  (Array.isArray(stepRows) ? stepRows : []).forEach((entry) => {
    const name = String(entry?.name || "User").trim() || "User";
    const total = Math.max(Math.round(toNumber(entry?.score)), 0);
    currentTotals.set(name, total);

    if (!stepsTapeState.initialized) {
      return;
    }

    if (!stepsTapeState.previousTotals.has(name)) {
      return;
    }

    const previousTotal = stepsTapeState.previousTotals.get(name) || 0;
    const delta = total - previousTotal;

    if (delta > 0) {
      deltas.push({
        name,
        delta,
        total,
        occurredAt: nowIso,
      });
    }
  });

  stepsTapeState.previousTotals = currentTotals;
  stepsTapeState.initialized = true;
  return deltas;
}

function pushStepTapeEvents(events) {
  const incoming = (Array.isArray(events) ? events : [])
    .map(normalizeStepTapeEvent)
    .filter((event) => event.delta > 0);

  if (!incoming.length) {
    return;
  }

  const dedupe = new Set(stepsTapeState.events.map((event) => `${event.name}|${event.delta}|${event.total}|${event.occurredAt}`));

  incoming.forEach((event) => {
    const key = `${event.name}|${event.delta}|${event.total}|${event.occurredAt}`;
    if (!dedupe.has(key)) {
      stepsTapeState.events.unshift(event);
      dedupe.add(key);
    }
  });

  stepsTapeState.events = stepsTapeState.events.slice(0, STEPS_TAPE_MAX_ROWS);
}

// Cached step-tape flag — populated by main.js's flag-fetch sequence. Defaults
// to `false` so the panel stays hidden until /api/control explicitly says
// otherwise. Prevents the step-tape from flashing visible on page load.
let stepTapeFeatureEnabled = false;

function setStepsTapeVisibility(visible) {
  // Honor the stepTape control flag — if the admin has turned it off, we
  // NEVER show the panel, regardless of whether live data is available.
  const effective = visible && stepTapeFeatureEnabled;
  if (els.stepsCounterPanel) {
    els.stepsCounterPanel.hidden = !effective;
  }

  if (els.mainContent) {
    els.mainContent.classList.toggle("steps-panel-hidden", !effective);
  }

  requestViewportFit();
}

function renderStepsTape() {
  if (!els.stepsTapeList || !els.stepsTapeTotalSteps || !els.stepsTapeTotalMiles || !els.stepsTapeState) {
    return;
  }

  const events = stepsTapeState.events;

  if (!events.length) {
    els.stepsTapeList.innerHTML = `<li class="steps-tape-row"><span class="steps-tape-row-user">Waiting for step activity...</span><span class="steps-tape-row-delta">+0</span><span class="steps-tape-row-meta">Recent Pebble step deltas will appear here.</span></li>`;
    return;
  }

  els.stepsTapeList.innerHTML = events
    .map((event) => {
      const milesForUser = event.total / STEPS_PER_MILE;
      return `<li class="steps-tape-row">
        <span class="steps-tape-row-user">${escapeHtml(event.name)}</span>
        <span class="steps-tape-row-delta">+${formatNumber(event.delta)} steps</span>
        <span class="steps-tape-row-meta">${formatNumber(event.total)} total steps • ${formatDistance(milesForUser)}</span>
      </li>`;
    })
    .join("");
}

function applyPebbleStepsTapePayload(pebblePayload) {
  if (!els.stepsTapeList || !els.stepsTapeTotalSteps || !els.stepsTapeTotalMiles || !els.stepsTapeState) {
    return;
  }

  const stepsTop = Array.isArray(pebblePayload?.stepsTop) ? pebblePayload.stepsTop : [];
  const fallbackTotalSteps = stepsTop.reduce((sum, row) => sum + Math.max(Math.round(toNumber(row?.score)), 0), 0);
  const payloadTotalSteps = Math.max(Math.round(toNumber(pebblePayload?.totalStepsAllTime)), 0);
  const payloadTotalMiles = Math.max(toNumber(pebblePayload?.totalMilesAllTime), 0);

  const totalSteps = payloadTotalSteps > 0 ? payloadTotalSteps : fallbackTotalSteps;
  const totalMiles = payloadTotalMiles > 0 ? payloadTotalMiles : totalSteps / STEPS_PER_MILE;

  els.stepsTapeTotalSteps.textContent = formatNumber(totalSteps);
  els.stepsTapeTotalMiles.textContent = formatDistance(totalMiles);

  const apiEvents = Array.isArray(pebblePayload?.stepEvents) ? pebblePayload.stepEvents : [];
  const derivedEvents = deriveStepTapeDeltasFromTopRows(stepsTop);
  const mergedEvents = apiEvents.length ? apiEvents : derivedEvents;

  const hasNonZeroTopRows = stepsTop.some((row) => Math.max(Math.round(toNumber(row?.score)), 0) > 0);
  const hasNonZeroIncomingEvents = mergedEvents.some(
    (event) => Math.max(Math.round(toNumber(event?.delta)), 0) > 0 || Math.max(Math.round(toNumber(event?.total)), 0) > 0,
  );
  const hasNonZeroLiveData = totalSteps > 0 || totalMiles > 0 || hasNonZeroTopRows || hasNonZeroIncomingEvents;
  setStepsTapeVisibility(hasNonZeroLiveData);

  if (!hasNonZeroLiveData) {
    stepsTapeState.events = [];
    renderStepsTape();
    return;
  }

  if (import.meta.env.DEV && !mergedEvents.length && !stepsTapeState.events.length) {
    pushStepTapeEvents(DEV_SAMPLE_STEPS_TAPE_EVENTS);
  } else {
    pushStepTapeEvents(mergedEvents);
  }

  if (!stepsTapeState.events.length) {
    els.stepsTapeState.textContent = "Waiting for live step deltas...";
  } else {
    els.stepsTapeState.textContent = "Latest step deltas (orderbook style).";
  }

  renderStepsTape();
}

function normalizePhone(value) {
  return value.replace(/\D+/g, "");
}

function validEmail(value) {
  return /^\S+@\S+\.\S+$/.test(value);
}

function normalizeUsername(value) {
  return value.trim().replace(/^@/, "");
}

function syncServiceInputRequirements() {
  const service = currentService();
  const input = els.serviceIdentityInput;
  if (!input || !els.consentWrap || !els.consentCheckbox || !els.serviceIdentityText || !els.serviceIdentityHelp) {
    return;
  }

  const isTelegram = service.identityKind === "bot-link";
  const needsSmsConsent = service.identityKind === "phone";

  if (els.telegramLinkBox) {
    els.telegramLinkBox.hidden = !isTelegram;
  }
  if (els.serviceIdentityLabel) {
    els.serviceIdentityLabel.hidden = isTelegram;
  }
  // Email field removed — nothing to toggle here.
  if (els.signupForm) {
    const submitBtn = els.signupForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.hidden = isTelegram;
    }
  }

  if (els.formIntro) {
    els.formIntro.textContent = isTelegram
      ? "To get started with Telegram, use the link below to message our bot."
      : "Select an app, enter your info, then submit onboarding.";
  }

  if (els.formFlow) {
    els.formFlow.hidden = isTelegram;
  }

  // Consent checkbox now covers BOTH SMS opt-in AND ToS/Privacy acceptance,
  // so it must remain visible + required for EVERY channel — including
  // iMessage and Telegram users (the ToS/Privacy half applies regardless).
  // We hide it only when the form itself is hidden (e.g. Telegram bot-link
  // flow takes over).
  els.consentWrap.classList.toggle("is-inactive", isTelegram);
  els.consentWrap.setAttribute("aria-hidden", isTelegram ? "true" : "false");
  els.consentCheckbox.required = !isTelegram;
  els.consentCheckbox.disabled = isTelegram;
  if (isTelegram) {
    els.consentCheckbox.checked = false;
  }

  if (isTelegram) {
    return;
  }

  if (service.identityKind === "imessage-contact") {
    input.type = "text";
    input.inputMode = "text";
    input.placeholder = "(555) 123-4567 or appleid@example.com";
    input.autocomplete = "off";
    input.required = true;
    els.serviceIdentityText.textContent = "iMessage Contact";
    els.serviceIdentityHelp.textContent = "Use the iMessage phone number or email.";
    return;
  }

  if (service.identityKind === "phone") {
    input.type = "tel";
    input.inputMode = "tel";
    input.placeholder = "(555) 555-5555";
    input.autocomplete = "tel";
    input.required = true;
    els.serviceIdentityText.textContent = "Phone Number";
    els.serviceIdentityHelp.textContent = "Required for phone-based onboarding.";
    return;
  }

  input.type = "text";
  input.inputMode = "text";
  input.placeholder = "username or @username";
  input.autocomplete = "off";
  input.required = true;
  els.serviceIdentityText.textContent = "Username";
  els.serviceIdentityHelp.textContent = "Required for username-based onboarding.";
}

function updateServiceVisual() {
  const service = currentService();
  if (els.serviceSelect) {
    els.serviceSelect.value = service.id;
  }
  syncServiceCarousel();

  if (els.serviceCarouselLabel) {
    els.serviceCarouselLabel.textContent = `${service.label} selected`;
  }

  syncServiceInputRequirements();
}

function renderServiceOptions() {
  if (!els.serviceSelect) {
    return;
  }

  els.serviceSelect.innerHTML = SERVICES.map((service) => {
    const selected = service.id === state.serviceId ? "selected" : "";
    return `<option value="${service.id}" ${selected}>${service.label}</option>`;
  }).join("");
}

function renderLeaderboard(entries) {
  latestStrengthEntries = Array.isArray(entries) ? entries : [];

  if (!entries.length) {
    els.leaderboardList.innerHTML = "";
    els.leaderboardState.textContent = "No strength rows yet.";
    return;
  }

  els.leaderboardList.innerHTML = entries
    .map((entry, index) => {
      const normalized = normalizeLeaderboardEntry(entry);
      const displayName = normalized.name || "No data";
      const displayValue = convertUnitValueLabel(normalized.value || "-") || "-";
      const displayExercise = normalized.exercise || "N/A";
      return `<li>
        <span class="leaderboard-cell leaderboard-cell-rank leaderboard-rank">#${index + 1}</span>
        <span class="leaderboard-cell leaderboard-cell-exercise leaderboard-user">${escapeHtml(displayExercise)}</span>
        <span class="leaderboard-cell leaderboard-cell-name leaderboard-user">${escapeHtml(displayName)}</span>
        <span class="leaderboard-cell leaderboard-cell-value leaderboard-score">${escapeHtml(displayValue)}</span>
      </li>`;
    })
    .join("");

  els.leaderboardState.textContent = "";
  requestViewportFit();
}

function renderGroupLeaderboard(entries) {
  latestCalisthenicsEntries = Array.isArray(entries) ? entries : [];

  if (!entries.length) {
    els.groupLeaderboardList.innerHTML = "";
    els.groupLeaderboardState.textContent = "No calisthenics rows yet.";
    return;
  }

  els.groupLeaderboardList.innerHTML = entries
    .map((entry, index) => {
      const normalized = normalizeLeaderboardEntry(entry);
      const displayName = normalized.name || "No data";
      const displayValue = convertUnitValueLabel(normalized.value || "-") || "-";
      const displayExercise = normalized.exercise || "N/A";
      return `<li>
        <span class="leaderboard-cell leaderboard-cell-rank leaderboard-rank">#${index + 1}</span>
        <span class="leaderboard-cell leaderboard-cell-exercise leaderboard-user">${escapeHtml(displayExercise)}</span>
        <span class="leaderboard-cell leaderboard-cell-name leaderboard-user">${escapeHtml(displayName)}</span>
        <span class="leaderboard-cell leaderboard-cell-value leaderboard-score">${escapeHtml(displayValue)}</span>
      </li>`;
    })
    .join("");

  els.groupLeaderboardState.textContent = "";
  requestViewportFit();
}

function renderStreakLeaderboard(entries) {
  latestStreakEntries = Array.isArray(entries) ? entries : [];

  if (!els.streakLeaderboardList) {
    return;
  }

  if (!entries.length) {
    els.streakLeaderboardList.innerHTML = "";
    setStatus(els.streakLeaderboardState, "No streak rows yet.", "");
    return;
  }

  els.streakLeaderboardList.innerHTML = entries
    .map((entry, index) => {
      const normalized = normalizeLeaderboardEntry(entry);
      const displayName = normalized.name || "No data";
      const displayValue = convertUnitValueLabel(normalized.value || "-") || "-";
      return `<li>
        <span class="streak-cell leaderboard-rank">#${index + 1}</span>
        <span class="streak-cell streak-cell-name leaderboard-user">${escapeHtml(displayName)}</span>
        <span class="streak-cell streak-cell-value leaderboard-score">${escapeHtml(displayValue)}</span>
      </li>`;
    })
    .join("");

  setStatus(els.streakLeaderboardState, "", "");
  requestViewportFit();
}

function renderStreakLiveCallout(message) {
  latestStreakCallout = String(message || "").trim();

  if (!els.streakLiveCallout) {
    return;
  }

  els.streakLiveCallout.textContent = latestStreakCallout || "Waiting for live streak activity...";
}

function renderPebbleMetricList(target, entries, unitLabel, options = {}) {
  if (!target) {
    return;
  }

  const zeroFallback = Boolean(options.zeroFallback);

  if (!entries.length) {
    if (zeroFallback) {
      target.innerHTML = `<li><span class="leaderboard-rank">#1</span><span class="leaderboard-user">User</span><span class="leaderboard-score">0 ${escapeHtml(
        unitLabel,
      )}</span></li>`;
      return;
    }

    target.innerHTML = `<li><span class="leaderboard-user">No data</span><span class="leaderboard-score">-</span></li>`;
    return;
  }

  target.innerHTML = entries
    .map((entry, index) => {
      const unit = entry.unit || unitLabel;
      const valueLabel = String(entry.valueLabel || "").trim();
      const scoreLabelRaw = valueLabel || `${formatNumber(entry.score)} ${unit}`.trim();
      const scoreLabel = convertUnitValueLabel(scoreLabelRaw) || scoreLabelRaw;
      return `<li>
        <span class="leaderboard-rank">#${index + 1}</span>
        <span class="leaderboard-user">${escapeHtml(entry.name)}</span>
        <span class="leaderboard-score">${escapeHtml(scoreLabel)}</span>
      </li>`;
    })
    .join("");
}

function renderPebbleLeaderboard(pebble) {
  latestPebblePayload = pebble || null;

  renderPebbleMetricList(els.pebbleCaloriesList, pebble?.caloriesTop || [], "cal", { zeroFallback: true });
  renderPebbleMetricList(els.pebbleWorkoutsList, pebble?.workoutsTop || [], "sessions", { zeroFallback: true });
  renderPebbleMetricList(els.pebbleStepsList, pebble?.stepsTop || [], "steps", { zeroFallback: true });
  renderPebbleMetricList(els.pebbleSleepList, pebble?.sleepTop || [], "score");
  renderPebbleMetricList(els.pebbleMilesList, pebble?.milesTop || [], "mi");
  els.pebbleLeaderboardState.textContent = "";
  requestViewportFit();
}

function fitAppToViewport() {
  const shell = els.appShell;
  if (!shell) {
    return;
  }

  syncServiceCarousel();

  if (window.matchMedia("(max-width: 900px)").matches) {
    shell.style.transform = "none";
    shell.style.left = "0px";
    shell.style.top = "0px";
    return;
  }

  shell.style.transform = "scale(1)";
  shell.style.left = "0px";
  shell.style.top = "0px";

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const contentWidth = shell.scrollWidth;
  const contentHeight = shell.scrollHeight;

  if (!contentWidth || !contentHeight || !viewportWidth || !viewportHeight) {
    return;
  }

  const scale = Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight, 1);
  const offsetX = Math.max((viewportWidth - contentWidth * scale) / 2, 0);
  const offsetY = Math.max((viewportHeight - contentHeight * scale) / 2, 0);

  shell.style.left = `${offsetX}px`;
  shell.style.top = `${offsetY}px`;
  shell.style.transform = `scale(${scale})`;
}

function requestViewportFit() {
  window.cancelAnimationFrame(fitFrame);
  fitFrame = window.requestAnimationFrame(fitAppToViewport);
}

async function refreshLiveMetricsCounters(windowValue = activeMetricsWindow) {
  const requestedWindow = normalizeActivityWindow(windowValue);
  const requestToken = ++liveMetricsRequestToken;

  const todayPromise = fetchLiveMetrics("today");
  const activityPromise = requestedWindow === "today" ? todayPromise : fetchLiveMetrics(requestedWindow);
  const [todayResult, activityResult] = await Promise.allSettled([todayPromise, activityPromise]);

  if (requestToken !== liveMetricsRequestToken) {
    return {
      stale: true,
      hasUsers: false,
      hasActivity: false,
      error: null,
    };
  }

  let hasUsers = false;
  let hasActivity = false;
  let firstError = null;

  if (todayResult.status === "fulfilled") {
    applyUserLiveMetrics(todayResult.value);
    hasUsers = true;
    hasLoadedUserMetrics = true;
  } else {
    firstError = todayResult.reason;
  }

  if (activityResult.status === "fulfilled") {
    applyActivityLiveMetrics(activityResult.value);
    hasActivity = true;
    hasLoadedActivityMetrics = true;
  } else if (requestedWindow !== "today" && todayResult.status === "fulfilled") {
    applyActivityLiveMetrics(todayResult.value);
    hasActivity = true;
    hasLoadedActivityMetrics = true;
  } else if (!firstError) {
    firstError = activityResult.reason;
  }

  return {
    stale: false,
    hasUsers,
    hasActivity,
    error: firstError,
  };
}

async function loadLeaderboard() {
  if (leaderboardRequestInFlight) {
    return;
  }
  leaderboardRequestInFlight = true;

  if (!hasLoadedLeaderboard) {
    setStatus(els.leaderboardState, "Loading leaderboard...", "");
    setStatus(els.groupLeaderboardState, "Loading calisthenics leaderboard...", "");
    setStatus(els.pebbleLeaderboardState, "Loading Pebble leaderboard...", "");
    setStatus(els.streakLeaderboardState, "Loading streak leaderboard...", "");
  }

  try {
    const payload = await fetchPublicLeaderboardSnapshot();
    renderLeaderboard(payload.entries);
    renderGroupLeaderboard(payload.groupEntries || []);
    renderStreakLeaderboard(payload.streakEntries || []);
    renderStreakLiveCallout(payload.streakLiveMessage || payload.streakEntries?.[0]?.message || "");
    setLiveWorkoutEvents(payload.liveEvents || []);

    if (!hasLoadedUserMetrics) {
      setCounterValue(els.usersTodayCount, payload.usersToday);
      setCounterValue(els.usersWeekCount, payload.usersThisWeek);
      setCounterValue(els.usersOnlineCount, payload.usersOnline);
    }

    if (!hasLoadedActivityMetrics) {
      setCounterValue(els.workoutsLoggedCount, payload.workoutsLogged);
      setCounterValue(els.caloriesTrackedCount, payload.caloriesTracked);
      setCounterValueWithDecimals(els.gallonsDrankCount, payload.gallonsDrank, 1);
    }

    renderPebbleLeaderboard(payload.pebble || {});
    applyPebbleStepsTapePayload(payload.pebble || {});
    hasLoadedLeaderboard = true;
  } catch (error) {
    latestStrengthEntries = [];
    latestCalisthenicsEntries = [];
    latestPebblePayload = null;
    latestStreakEntries = [];
    latestStreakCallout = "";
    els.leaderboardList.innerHTML = "";
    els.groupLeaderboardList.innerHTML = "";
    els.pebbleCaloriesList.innerHTML = "";
    els.pebbleWorkoutsList.innerHTML = "";
    els.pebbleStepsList.innerHTML = "";
    if (els.streakLeaderboardList) {
      els.streakLeaderboardList.innerHTML = "";
    }
    if (els.streakLiveCallout) {
      els.streakLiveCallout.textContent = "";
    }
    if (els.pebbleSleepList) {
      els.pebbleSleepList.innerHTML = "";
    }
    if (els.pebbleMilesList) {
      els.pebbleMilesList.innerHTML = "";
    }
    setLiveWorkoutEvents([]);
    setCounterValue(els.usersOnlineCount, 0);
    setCounterValue(els.workoutsLoggedCount, 0);
    setCounterValue(els.caloriesTrackedCount, 0);
    setCounterValueWithDecimals(els.gallonsDrankCount, 0, 1);
    setStepsTapeVisibility(false);
    if (els.stepsTapeState) {
      els.stepsTapeState.textContent = `Step counter unavailable: ${error.message}`;
    }
    setStatus(els.leaderboardState, `Leaderboard unavailable: ${error.message}`, "error");
    setStatus(els.groupLeaderboardState, `Calisthenics unavailable: ${error.message}`, "error");
    setStatus(els.pebbleLeaderboardState, `Pebble leaderboard unavailable: ${error.message}`, "error");
    setStatus(els.streakLeaderboardState, `Streak leaderboard unavailable: ${error.message}`, "error");
  } finally {
    leaderboardRequestInFlight = false;
  }
}

function canUseDesktopStepTape() {
  if (!els.stepsTapeList) {
    return false;
  }

  return !window.matchMedia("(max-width: 1180px)").matches;
}

async function refreshPebbleStepTape() {
  if (!canUseDesktopStepTape()) {
    return;
  }

  if (pebbleStepsRequestInFlight) {
    return;
  }

  pebbleStepsRequestInFlight = true;

  try {
    const snapshot = await fetchPublicLeaderboardSnapshot();
    renderPebbleLeaderboard(snapshot.pebble || {});
    applyPebbleStepsTapePayload(snapshot.pebble || {});
  } catch (error) {
    if (els.stepsTapeState && !stepsTapeState.events.length) {
      els.stepsTapeState.textContent = `Step counter unavailable: ${error.message}`;
    }
  } finally {
    pebbleStepsRequestInFlight = false;
  }
}

function validateForm() {
  const service = currentService();
  if (service.identityKind === "bot-link") {
    return { ok: true, payload: null, isBotLink: true };
  }

  const identityRaw = els.serviceIdentityInput.value.trim();
  const needsSmsConsent = service.identityKind === "phone";

  if (!identityRaw) {
    return { ok: false, message: service.identityKind === "phone" ? "Enter a valid phone number." : "Enter a valid username." };
  }

  let phone = null;
  let username = null;
  let contact = null;

  if (service.identityKind === "imessage-contact") {
    const normalizedPhone = normalizePhone(identityRaw);
    const contactEmail = identityRaw.toLowerCase();
    const looksLikeEmail = validEmail(contactEmail);

    if (!looksLikeEmail && normalizedPhone.length < 7) {
      return { ok: false, message: "Enter a valid iMessage phone number or iMessage email." };
    }

    contact = looksLikeEmail ? contactEmail : normalizedPhone;
  }

  if (service.identityKind === "phone") {
    phone = normalizePhone(identityRaw);

    if (phone.length < 7) {
      return { ok: false, message: "Enter a valid phone number." };
    }
  } else if (service.identityKind === "username") {
    username = normalizeUsername(identityRaw);

    if (username.length < 2) {
      return { ok: false, message: "Enter a valid username." };
    }
  }

  // Single consent checkbox now covers BOTH the 10DLC/A2P SMS opt-in AND
  // the ToS/Privacy acceptance. The label text on /index makes both
  // explicit. We always require it (even for iMessage/Telegram users)
  // because the ToS/Privacy half applies regardless of channel.
  if (!els.consentCheckbox?.checked) {
    return {
      ok: false,
      message: needsSmsConsent
        ? "Please confirm SMS consent and agree to the Terms + Privacy Policy."
        : "Please agree to the Terms of Service and Privacy Policy before signing up.",
    };
  }

  // Consent record persisted on the user profile for audit. AI processing
  // defaults to allowed because the disclosure lives in the Privacy Policy
  // — users who don't want AI parsing can text /stop or change the
  // preference from their account settings later.
  const consent = {
    tos: true,
    privacy: true,
    aiProcessing: true,
    acceptedAt: new Date().toISOString(),
    version: "v1",
  };

  if (service.provider === "iMessage") {
    return {
      ok: true,
      payload: {
        provider: "iMessage",
        contact,
        consent,
      },
    };
  }

  return {
    ok: true,
    payload: {
      provider: service.provider,
      phone,
      username,
      sms_consent_10dlc: needsSmsConsent ? true : false,
      consent,
      source: "hero_onboarding",
      requested_at: new Date().toISOString(),
    },
  };
}

// Apply / clear red-glow error highlighting on a field. Adds the .is-error
// class and a one-shot listener that removes it the moment the user
// changes the value, so the error melts away as they fix it.
function markFieldError(field) {
  if (!field) return;
  // The consent checkbox lives inside <label class="consent-row"> — mark
  // the label so the surrounding text + glow show together. Text inputs
  // get the class directly so .is-error rules in CSS fire.
  if (field.type === "checkbox") {
    const wrap = field.closest(".consent-row") || field;
    wrap.classList.add("is-error");
    const clear = () => {
      wrap.classList.remove("is-error");
      field.removeEventListener("change", clear);
    };
    field.addEventListener("change", clear);
  } else {
    field.classList.add("is-error");
    const clear = () => {
      field.classList.remove("is-error");
      field.removeEventListener("input", clear);
      field.removeEventListener("change", clear);
    };
    field.addEventListener("input", clear);
    field.addEventListener("change", clear);
  }
}

function clearAllFieldErrors() {
  document.querySelectorAll(".signup-form .is-error").forEach((el) =>
    el.classList.remove("is-error"),
  );
}

// Walk the form and flag every required field that's still empty / unchecked.
// Returns true when at least one field was flagged (so caller can shift focus
// to the first one). Called BEFORE the structural validateForm() so the user
// sees red glow on every empty field at once, not just the first error.
function highlightEmptyRequiredFields() {
  clearAllFieldErrors();
  let firstBad = null;

  // Identity input (phone / iMessage handle / Telegram nothing-needed)
  const identity = els.serviceIdentityInput;
  if (identity && !identity.disabled && !identity.value.trim()) {
    markFieldError(identity);
    firstBad ||= identity;
  }

  // Consent checkbox — required for every channel that's not Telegram
  const consent = els.consentCheckbox;
  if (consent && !consent.disabled && !consent.checked) {
    markFieldError(consent);
    firstBad ||= consent;
  }

  if (firstBad && typeof firstBad.focus === "function") {
    try { firstBad.focus({ preventScroll: false }); } catch { /* ignore */ }
  }
  return !!firstBad;
}

async function handleSignup(event) {
  event.preventDefault();

  const validation = validateForm();
  if (validation.isBotLink) {
    return;
  }
  if (!validation.ok) {
    // Paint every empty required field red so the user sees exactly which
    // ones to fill in (not just the first error in the cascade).
    highlightEmptyRequiredFields();
    setStatus(els.signupStatus, validation.message, "error");
    return;
  }

  // All good — drop any prior error highlights before the network call.
  clearAllFieldErrors();
  setStatus(els.signupStatus, "Submitting signup...", "");

  try {
    await submitSignup(attachRefToPayload(validation.payload));
    setStatus(els.signupStatus, "Signup sent. Check your messages to continue onboarding.", "success");
  } catch (error) {
    const rawMessage = String(error?.message || "").trim();
    const isNetworkError = /load failed|failed to fetch|networkerror|network request failed/i.test(rawMessage);
    const friendlyMessage = isNetworkError
      ? "Network issue reaching onboarding service. Please try again in a few seconds."
      : rawMessage || "Signup request failed.";
    setStatus(els.signupStatus, friendlyMessage, "error");
  }
}

function wireEvents() {
  window.addEventListener("storage", (event) => {
    if (event.key === AUTH_FLAG_KEY) {
      syncAuthNavigation();
    }
  });

  if (els.liveWorkoutToast) {
    els.liveWorkoutToast.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.clearTimeout(liveWorkoutHideTimer);
      hideLiveWorkoutToast();
      liveWorkoutSnoozeUntil = Date.now() + LIVE_WORKOUT_TOAST_SNOOZE_MS;
    });
  }

  window.addEventListener("scroll", scheduleLiveWorkoutToastVisibilityCheck, { passive: true });
  window.addEventListener("resize", scheduleLiveWorkoutToastVisibilityCheck);
  window.addEventListener("orientationchange", scheduleLiveWorkoutToastVisibilityCheck);
  document.addEventListener("focusin", scheduleLiveWorkoutToastVisibilityCheck);
  document.addEventListener("focusout", scheduleLiveWorkoutToastVisibilityCheck);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleLiveWorkoutToastVisibilityCheck);
    window.visualViewport.addEventListener("scroll", scheduleLiveWorkoutToastVisibilityCheck);
  }

  if (els.serviceSelect) {
    els.serviceSelect.addEventListener("change", (event) => {
      state.serviceId = event.target.value;
      updateServiceVisual();
    });
  }

  if (els.signupForm) {
    els.signupForm.addEventListener("submit", handleSignup);
  }

  if (els.serviceCarousel) {
    els.serviceCarousel.addEventListener("click", handleCarouselClick);
    els.serviceCarousel.addEventListener("keydown", handleCarouselKeydown);
  }

  if (els.serviceShell) {
    els.serviceShell.addEventListener("pointerdown", handleCarouselPointerDown);
    els.serviceShell.addEventListener("pointerup", handleCarouselPointerUp);
    els.serviceShell.addEventListener("pointercancel", handleCarouselPointerCancel);
    els.serviceShell.addEventListener("pointerleave", handleCarouselPointerCancel);
    els.serviceShell.addEventListener("wheel", handleCarouselWheel, { passive: false });
  }

  if (els.unitToggleButton) {
    els.unitToggleButton.addEventListener("click", () => {
      applyUnitSystem(useMetric() ? "imperial" : "metric");
    });
  }

}

function init() {
  if (redirectDashboardHostHomeToDashboardPage()) {
    return;
  }

  captureRefFromUrl();

  activeUnitSystem = storedUnitSystem() || defaultUnitSystemFromLocale();
  syncUnitToggleButtonLabel();
  void hydrateUnitSystemFromIp();

  renderServiceOptions();
  renderServiceCarousel();
  updateServiceVisual();
  syncAuthNavigation();
  syncHeaderStatsHint();
  wireEvents();

  if (els.stepsTapeState) {
    els.stepsTapeState.textContent = "Loading live step counter...";
  }
  renderStreakLiveCallout("");
  setStepsTapeVisibility(false);
  renderStepsTape();

  void updateDiscoveryNavVisibility();
  loadLeaderboard();
  window.clearInterval(leaderboardRefreshTicker);
  leaderboardRefreshTicker = window.setInterval(loadLeaderboard, LIVE_LEADERBOARD_REFRESH_MS);
  window.clearInterval(pebbleStepsRefreshTicker);
  pebbleStepsRefreshTicker = window.setInterval(() => {
    void refreshPebbleStepTape();
  }, LIVE_PEBBLE_STEPS_REFRESH_MS);
  window.addEventListener("resize", requestViewportFit);
  window.addEventListener("orientationchange", requestViewportFit);
  if (document.fonts?.ready) {
    document.fonts.ready.then(requestViewportFit).catch(() => {});
  }
  requestViewportFit();
}

// ============================================
// FEATURE FLAGS & NEW SECTIONS
// ============================================

const DEFAULT_TESTIMONIALS = [
  {
    name: "Mike R.",
    location: "Austin, TX",
    platform: "iMessage",
    rating: 5,
    content: "I've tried every fitness app out there. This is the first one that actually stuck because I don't have to open anything - just text what I did.",
    stats: "Lost 23 lbs in 4 months",
  },
  {
    name: "Sarah K.",
    location: "NYC",
    platform: "SMS",
    rating: 5,
    content: "The simplicity is genius. I text my meals and workouts throughout the day, then check my dashboard weekly. Finally hit my protein goals consistently.",
    stats: "180 day streak",
  },
  {
    name: "James L.",
    location: "Chicago",
    platform: "Telegram",
    rating: 5,
    content: "Love the Pebble integration! My watch syncs automatically and I can see everything in one place. The leaderboard keeps me motivated.",
    stats: "Top 10 on strength board",
  },
  {
    name: "Emily T.",
    location: "LA",
    platform: "iMessage",
    rating: 5,
    content: "Finally a tracker that doesn't make me feel like I need a PhD to log a sandwich. Just text it and done.",
    stats: "Gained 8 lbs muscle",
  },
  {
    name: "David M.",
    location: "Seattle",
    platform: "SMS",
    rating: 5,
    content: "The body measurement tracking is incredible. I can see my biceps and chest growing week over week.",
    stats: "+2 inches on arms",
  },
  {
    name: "Lisa P.",
    location: "Miami",
    platform: "Telegram",
    rating: 4,
    content: "Great for water tracking! I always forgot to drink enough water until I started texting every glass.",
    stats: "Hydration: 100% daily",
  },
];

const DEFAULT_FAQS = [
  {
    question: "How do I log a workout?",
    answer: "Just text naturally! Say 'Just did 20 pushups' or 'bench press 185x8x3' or 'ran 3 miles in 28 minutes'. You can also use voice dictation - tap the mic and say what you did. We understand natural language and log it automatically.",
  },
  {
    question: "How do I track what I eat?",
    answer: "Text your meals in plain English: 'I ate 2 eggs and a banana' or 'grilled chicken salad with olive oil dressing'. We'll break it down and calculate calories, protein, carbs, and fats for you.",
  },
  {
    question: "Can I track water intake?",
    answer: "Absolutely! Just text 'Drank 16 ounces of water' or even simpler: '16oz water'. Ask 'How much today?' anytime to see your daily total and progress toward your hydration goal.",
  },
  {
    question: "What messaging apps work?",
    answer: "We support iMessage, SMS, and Telegram - pick whichever you prefer. Wearable integrations include Pebble, Fitbit, Garmin, Whoop, Oura, and Apple Watch for automatic syncing.",
  },
  {
    question: "Can I track body measurements?",
    answer: "Yes! Track weight, body fat, and specific measurements like biceps, chest, waist, quads, and more. We'll chart your progress over time with visual graphs and goal tracking.",
  },
  {
    question: "Is my data private?",
    answer: "Your health data is encrypted and never sold to third parties. You own your data - export or delete it anytime from your dashboard.",
  },
];

function renderTestimonials(testimonials = DEFAULT_TESTIMONIALS) {
  const track = document.getElementById("testimonialsTrack");
  const dotsContainer = document.getElementById("testimonialsDots");
  if (!track) return;

  track.innerHTML = testimonials.map((t) => {
    const stars = "★".repeat(t.rating || 5) + "☆".repeat(5 - (t.rating || 5));
    const initials = t.name.split(" ").map(n => n[0]).join("").toUpperCase();
    return `
      <article class="testimonial-card">
        <div class="testimonial-header">
          <div class="testimonial-avatar">${initials}</div>
          <div class="testimonial-info">
            <h4>${t.name}</h4>
            <p class="testimonial-meta">${t.location || ""} via ${t.platform || ""}</p>
          </div>
        </div>
        <div class="testimonial-rating">${stars}</div>
        <blockquote class="testimonial-content">"${t.content}"</blockquote>
        ${t.stats ? `<p class="testimonial-stats">${t.stats}</p>` : ""}
      </article>
    `;
  }).join("");

  // Carousel logic
  const cardsPerView = window.innerWidth > 900 ? 3 : window.innerWidth > 600 ? 2 : 1;
  const totalSlides = Math.ceil(testimonials.length / cardsPerView);
  let currentSlide = 0;

  if (dotsContainer && totalSlides > 1) {
    dotsContainer.innerHTML = "";
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement("button");
      dot.className = `carousel-dot ${i === 0 ? "active" : ""}`;
      dot.addEventListener("click", () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
  }

  function goToSlide(index) {
    currentSlide = Math.max(0, Math.min(index, totalSlides - 1));
    track.style.transform = `translateX(-${currentSlide * (100 / cardsPerView) * cardsPerView}%)`;
    dotsContainer?.querySelectorAll(".carousel-dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === currentSlide);
    });
  }

  document.getElementById("testimonialsPrev")?.addEventListener("click", () => goToSlide(currentSlide - 1));
  document.getElementById("testimonialsNext")?.addEventListener("click", () => goToSlide(currentSlide + 1));

  // Auto-advance
  setInterval(() => goToSlide((currentSlide + 1) % totalSlides), 6000);
}

function renderFAQ(faqs = DEFAULT_FAQS) {
  const list = document.getElementById("faqList");
  if (!list) return;

  list.innerHTML = faqs.map((faq) => `
    <details class="faq-item">
      <summary>${faq.question}</summary>
      <p>${faq.answer}</p>
    </details>
  `).join("");
}

// Real conversation examples matching the simulator API responses
const MOCKUP_CONVERSATION_SETS = [
  // Workout logging
  [
    { type: "sent", text: "Just did 20 pushups" },
    { type: "received", text: "✅ Logged 20 pushups.\nToday's pushups total: 20." },
    { type: "sent", text: "Add another 15" },
    { type: "received", text: "✅ Logged 15 pushups.\nToday's pushups total: 35." },
    { type: "sent", text: "bench press 4x8 at 225" },
    { type: "received", text: "🏋️ Logged Bench Press: 4x8 @ 225lb.\nVolume: 7,200 lb" },
  ],
  // Nutrition logging
  [
    { type: "sent", text: "I had a Five Guys little burger" },
    { type: "received", text: "Logged:\n• Five Guys Little Hamburger\n\nToday's totals:\nCalories: 540 cal\nProtein: 23g\nCarbs: 39g\nFats: 26g" },
    { type: "sent", text: "Also add a medium fry" },
    { type: "received", text: "Logged:\n• Medium French Fries\n\nToday's totals:\nCalories: 860 cal\nProtein: 27g\nCarbs: 82g\nFats: 41g" },
    { type: "sent", text: "Drank a Celsius" },
    { type: "received", text: "Logged:\n• Celsius Energy Drink\n\nToday's totals:\nCalories: 870 cal\nProtein: 27g\nCarbs: 84g\nFats: 41g" },
  ],
  // Water tracking
  [
    { type: "sent", text: "/water 20" },
    { type: "received", text: "💧 Added 20 oz.\nToday's water: 20 oz / 128 oz." },
    { type: "sent", text: "Drank 32 oz of water" },
    { type: "received", text: "💧 Added 32 oz.\nToday's water: 52 oz / 128 oz." },
    { type: "sent", text: "Had a bottle of water" },
    { type: "received", text: "💧 Added 16 oz (bottle = 16 oz).\nToday's water: 68 oz / 128 oz." },
    { type: "sent", text: "Drank 1 liter" },
    { type: "received", text: "💧 Added 33.8 oz (1 L).\nToday's water: 101.8 oz / 128 oz." },
  ],
  // Mixed day
  [
    { type: "sent", text: "Treadmill 20 min 6.5 mph 2% incline" },
    { type: "received", text: "🏃 Logged Treadmill\n• 20 min • 6.5 mph • 2% incline\n~215 calories burned" },
    { type: "sent", text: "Had grilled chicken and rice" },
    { type: "received", text: "Logged:\n• Grilled Chicken (6 oz)\n• White Rice (1 cup)\n\nCalories: 485 cal\nProtein: 57g" },
    { type: "sent", text: "water 24oz" },
    { type: "received", text: "💧 Added 24 oz.\nToday's water: 24 oz / 128 oz." },
  ],
  // 📸 NEW: photo → AI calorie estimate
  // The user attaches a photo of their meal and the AI parses it directly,
  // returning a breakdown without a single typed word.
  [
    {
      type: "image",
      // Inline SVG so the demo works offline + matches the dark-mode aesthetic.
      // Self-contained "chicken teriyaki bowl" illustration.
      svg: `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#8d6e63"/>
            <stop offset="1" stop-color="#3e2723"/>
          </linearGradient>
        </defs>
        <rect width="240" height="240" fill="url(#bg)"/>
        <ellipse cx="120" cy="160" rx="100" ry="22" fill="#1b1b1b" opacity="0.25"/>
        <circle cx="120" cy="130" r="86" fill="#f5f5f5"/>
        <circle cx="120" cy="130" r="78" fill="#e0e0e0"/>
        <!-- rice bed -->
        <ellipse cx="120" cy="138" rx="68" ry="46" fill="#fafafa"/>
        <ellipse cx="100" cy="128" rx="14" ry="9" fill="#ffffff" opacity="0.6"/>
        <ellipse cx="140" cy="148" rx="12" ry="8" fill="#ffffff" opacity="0.6"/>
        <!-- chicken -->
        <ellipse cx="115" cy="118" rx="38" ry="22" fill="#bf6e2a"/>
        <ellipse cx="105" cy="112" rx="14" ry="9" fill="#d98a3a"/>
        <ellipse cx="128" cy="120" rx="16" ry="10" fill="#a55520"/>
        <!-- broccoli florets -->
        <circle cx="78" cy="148" r="11" fill="#43a047"/>
        <circle cx="74" cy="142" r="6" fill="#66bb6a"/>
        <circle cx="84" cy="143" r="6" fill="#66bb6a"/>
        <circle cx="80" cy="155" r="6" fill="#388e3c"/>
        <circle cx="160" cy="156" r="11" fill="#43a047"/>
        <circle cx="156" cy="150" r="6" fill="#66bb6a"/>
        <circle cx="166" cy="151" r="6" fill="#66bb6a"/>
        <circle cx="162" cy="163" r="6" fill="#388e3c"/>
        <!-- sesame seeds -->
        <circle cx="110" cy="112" r="1.5" fill="#fff8e1"/>
        <circle cx="118" cy="110" r="1.5" fill="#fff8e1"/>
        <circle cx="124" cy="116" r="1.5" fill="#fff8e1"/>
        <circle cx="105" cy="120" r="1.5" fill="#fff8e1"/>
        <!-- carrot bits -->
        <circle cx="98" cy="142" r="3.5" fill="#ff8a3d"/>
        <circle cx="146" cy="132" r="3.5" fill="#ff8a3d"/>
        <circle cx="132" cy="148" r="3" fill="#ff8a3d"/>
        <!-- chopsticks -->
        <rect x="48" y="62" width="148" height="4" fill="#5d4037" transform="rotate(-12 48 64)"/>
        <rect x="48" y="74" width="148" height="4" fill="#4e342e" transform="rotate(-12 48 76)"/>
      </svg>`,
      alt: "Photo of a chicken teriyaki bowl",
    },
    {
      type: "received",
      text:
        "📸 Analyzing your photo…",
    },
    {
      type: "received",
      text:
        "Detected: Chicken Teriyaki Bowl\n" +
        "• Grilled chicken (6 oz)\n" +
        "• Steamed broccoli (1 cup)\n" +
        "• White rice (1 cup)\n" +
        "• Teriyaki sauce (2 tbsp)\n\n" +
        "Estimated:\nCalories: 620 cal\nProtein: 45g\nCarbs: 72g\nFats: 14g\n\n" +
        "Logged ✓ Reply 'edit' to tweak.",
    },
  ],
];

// Pick a random conversation set
const MOCKUP_CONVERSATIONS = MOCKUP_CONVERSATION_SETS[Math.floor(Math.random() * MOCKUP_CONVERSATION_SETS.length)];

// ----- iOS-style keyboard tap audio (synthetic, generated by Web Audio API) -----
//
// We synthesise the tap/send sounds at runtime so there's nothing to download
// and the iPhone-on-the-homepage animation always has audio available.
// Sound is OFF until the user has at least one click/scroll on the page; this
// satisfies browser autoplay policy and keeps things quiet for new visitors.
// Users can also mute permanently via the speaker toggle (renderMockupSoundToggle
// below) — that preference is persisted in localStorage.
const MOCKUP_SOUND_PREF_KEY = "tracker.mockup.soundMuted";
// Sound is OFF by default. Users explicitly opt in via the speaker
// toggle on the iPhone mockup. Once they do, the choice persists in
// localStorage and they're not asked again.
//   - localStorage value "0" → user explicitly unmuted
//   - localStorage value "1" → user explicitly muted
//   - no value (default)     → muted (safe default for autoplay sensitivity)
let mockupSoundMuted = (() => {
  try {
    const v = localStorage.getItem(MOCKUP_SOUND_PREF_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
    return true; // default: off
  } catch {
    return true;
  }
})();

let audioCtx = null;
let audioUnlocked = false;
function getAudioCtx() {
  if (audioCtx) return audioCtx;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}
function unlockAudio() {
  if (audioUnlocked) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  audioUnlocked = true;
}
if (typeof document !== "undefined") {
  ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    document.addEventListener(ev, unlockAudio, { once: true, passive: true }),
  );
}

function isMockupSoundEnabled() {
  if (mockupSoundMuted) return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return false;
  return true;
}

function setMockupSoundMuted(muted) {
  mockupSoundMuted = !!muted;
  try {
    localStorage.setItem(MOCKUP_SOUND_PREF_KEY, mockupSoundMuted ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
  syncMockupSoundToggleUI();
}

function playTapSound() {
  const ctx = getAudioCtx();
  if (!ctx || !audioUnlocked) return;
  if (!isMockupSoundEnabled()) return;
  const now = ctx.currentTime;
  // Two layered oscillators – a high "tick" and a softer body – matching the
  // iOS keyboard tap timbre. Total duration ~30ms.
  const tickOsc = ctx.createOscillator();
  const tickGain = ctx.createGain();
  tickOsc.type = "square";
  // Tiny pitch variance so repeated taps don't feel robotic.
  tickOsc.frequency.value = 1750 + Math.random() * 250;
  tickGain.gain.setValueAtTime(0.0001, now);
  tickGain.gain.exponentialRampToValueAtTime(0.18, now + 0.002);
  tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  tickOsc.connect(tickGain).connect(ctx.destination);
  tickOsc.start(now);
  tickOsc.stop(now + 0.05);

  const bodyOsc = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  bodyOsc.type = "sine";
  bodyOsc.frequency.value = 380 + Math.random() * 60;
  bodyGain.gain.setValueAtTime(0.0001, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.12, now + 0.003);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  bodyOsc.connect(bodyGain).connect(ctx.destination);
  bodyOsc.start(now);
  bodyOsc.stop(now + 0.07);
}
function playSendSound() {
  const ctx = getAudioCtx();
  if (!ctx || !audioUnlocked) return;
  if (!isMockupSoundEnabled()) return;
  const now = ctx.currentTime;
  // Ascending "swoosh" – classic iMessage send.
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.exponentialRampToValueAtTime(1180, now + 0.22);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.33);
}
function playReceiveSound() {
  const ctx = getAudioCtx();
  if (!ctx || !audioUnlocked) return;
  if (!isMockupSoundEnabled()) return;
  const now = ctx.currentTime;
  // Short descending blip – incoming bubble.
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(560, now + 0.12);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

// ----- Sound toggle UI -----
//
// Floating speaker icon (top-left of every iPhone mockup) that lets users
// silence the phone demonstration. Click toggles mute and the choice is
// persisted in localStorage. The icon swaps between speaker-on and
// speaker-muted SVGs and announces its state for screen readers.
const SPEAKER_ON_SVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
</svg>`;
const SPEAKER_OFF_SVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <line x1="23" y1="9" x2="17" y2="15"></line>
  <line x1="17" y1="9" x2="23" y2="15"></line>
</svg>`;

function syncMockupSoundToggleUI() {
  document.querySelectorAll(".mockup-sound-toggle").forEach((btn) => {
    btn.innerHTML = mockupSoundMuted ? SPEAKER_OFF_SVG : SPEAKER_ON_SVG;
    btn.classList.toggle("is-muted", mockupSoundMuted);
    btn.setAttribute("aria-pressed", mockupSoundMuted ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      mockupSoundMuted ? "Unmute phone demo sound" : "Mute phone demo sound",
    );
    btn.title = mockupSoundMuted ? "Sound off — click to unmute" : "Sound on — click to mute";
  });
}

function ensureMockupSoundToggle(containerEl) {
  if (!containerEl) return;
  // Anchor the button inside the .iphone-frame so it visually belongs to the
  // phone (top-left, like a hardware toggle). One per phone instance.
  const phone = containerEl.closest(".iphone-frame, .iphone-frame-compact, .hero-mockup, .hero-mockup-compact") || containerEl;
  if (phone.querySelector(":scope > .mockup-sound-toggle")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mockup-sound-toggle";
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    setMockupSoundMuted(!mockupSoundMuted);
    // Ensure the audio context unlocks on first interaction even if mute was on.
    unlockAudio();
    // Tiny feedback chirp when unmuting (so the user knows it worked).
    if (!mockupSoundMuted) playTapSound();
  });
  phone.appendChild(btn);
  syncMockupSoundToggleUI();
}

// ----- Conversation animation -----
function initMockupAnimation(containerId, conversations = MOCKUP_CONVERSATIONS) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // The composer lives next to the messages thread in the same iphone-screen.
  const screenRoot = container.closest(".messages-app") || container.parentElement;
  const composer = screenRoot?.querySelector(".composer-placeholder");
  const originalComposerText = composer?.textContent || "iMessage";

  // Sound toggle (one per iPhone mockup on the page).
  ensureMockupSoundToggle(container);

  let cancelled = false;

  // Allow the page to stop the animation (used by maintenance mode etc.)
  container._stopMockupAnimation = () => {
    cancelled = true;
  };

  async function typeIntoComposer(text) {
    if (!composer || cancelled) return;
    composer.classList.add("is-typing");
    composer.textContent = "";
    const cursor = '<span class="composer-cursor" aria-hidden="true">|</span>';
    for (let i = 0; i < text.length; i++) {
      if (cancelled) return;
      composer.innerHTML = escapeForComposer(text.slice(0, i + 1)) + cursor;
      playTapSound();
      // Slight variation so the typing feels human.
      const base = 38; // ms per char
      const variance = Math.random() * 28;
      const punctuationPause = /[.,!?\n]/.test(text[i]) ? 90 : 0;
      const spacePause = text[i] === " " ? 30 : 0;
      await wait(base + variance + punctuationPause + spacePause);
    }
    // Brief pause before "send"
    composer.innerHTML = escapeForComposer(text) + cursor;
    await wait(220);
  }

  function resetComposer() {
    if (!composer) return;
    composer.classList.remove("is-typing");
    composer.textContent = originalComposerText;
  }

  function addBubble(msg) {
    const bubble = document.createElement("div");
    // `image` is treated as a sent bubble (the user-side of the chat) but
    // styled like an iMessage photo attachment — a square, rounded thumbnail
    // with the food image instead of a text bubble.
    if (msg.type === "image") {
      bubble.className = "message-bubble sent message-image-bubble";
      const inner = msg.svg
        ? msg.svg
        : msg.imageUrl
        ? `<img src="${escapeForComposer(msg.imageUrl)}" alt="${escapeForComposer(msg.alt || "Photo")}" />`
        : "📷";
      bubble.innerHTML = `<div class="message-image-frame" role="img" aria-label="${escapeForComposer(msg.alt || "Photo of meal")}">${inner}</div>`;
    } else {
      bubble.className = `message-bubble ${msg.type}`;
      bubble.textContent = msg.text;
    }
    bubble.style.opacity = "0";
    bubble.style.transform = "translateY(10px) scale(0.98)";
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    requestAnimationFrame(() => {
      bubble.style.transition = "opacity 0.3s ease, transform 0.35s cubic-bezier(.2,.8,.2,1)";
      bubble.style.opacity = "1";
      bubble.style.transform = "translateY(0) scale(1)";
    });
    return bubble;
  }

  function addTypingIndicator() {
    const bubble = document.createElement("div");
    bubble.className = "message-bubble received typing-indicator";
    bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    bubble.style.opacity = "0";
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    requestAnimationFrame(() => {
      bubble.style.transition = "opacity 0.2s ease";
      bubble.style.opacity = "1";
    });
    return bubble;
  }

  async function runConversation() {
    while (!cancelled) {
      for (let i = 0; i < conversations.length; i++) {
        if (cancelled) return;
        const msg = conversations[i];
        if (msg.type === "sent") {
          await typeIntoComposer(msg.text);
          resetComposer();
          playSendSound();
          addBubble(msg);
          await wait(900);
        } else if (msg.type === "image") {
          // Show a small "picking a photo" hint in the composer for realism,
          // then drop the image bubble in. Plays the send swoosh but skips
          // the typing animation since there's no text to type.
          if (composer) {
            composer.classList.add("is-typing");
            composer.innerHTML = `<span class="composer-photo-hint">📎 Photo</span>`;
          }
          await wait(620);
          resetComposer();
          playSendSound();
          addBubble(msg);
          await wait(1100);
        } else {
          // Show typing dots, then deliver the bubble.
          const indicator = addTypingIndicator();
          await wait(900 + Math.random() * 600);
          indicator.remove();
          playReceiveSound();
          addBubble(msg);
          await wait(1700);
        }
      }
      // Pause then loop
      await wait(2400);
      if (!cancelled) container.innerHTML = "";
    }
  }

  runConversation();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeForComposer(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, " ");
}

// Mobile breakpoint matches the styles.css rule that sets
// .hero-right-column { display:none } at ≤768px. Used to short-circuit the
// iPhone mockup animation entirely so it doesn't tick / synth audio / spin
// timers on phones where the visual element isn't even rendered.
const MOBILE_BREAKPOINT_PX = 768;
function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
}

function initIPhoneMockup() {
  // Skip both mockups on mobile — the right-column container is
  // display:none at this breakpoint so there's nothing to animate and we
  // save the timer + Web-Audio setup overhead.
  if (isMobileViewport()) return;
  // Initialize hero mockup (inline next to form)
  initMockupAnimation("heroMockupMessages");
  // Initialize section mockup (below fold)
  initMockupAnimation("mockupMessages");
}

async function initFeatureSections() {
  // Initialize the hero mockup unless we're on a mobile viewport where
  // the iPhone column is hidden via CSS (display:none under 768px).
  if (!isMobileViewport()) {
    initMockupAnimation("heroMockupMessages");
  }

  try {
    const flags = await fetchFeatureFlags();
    applyFeatureFlags(flags);
    // Footer socials + chatbot widget run as side-effects of feature flags.
    // initFeatureFlags() does both already, but the homepage uses the
    // lower-level fetch+apply pair so we kick them off manually here.
    try {
      const { applyFooterSocials } = await import("./footer-socials.js");
      applyFooterSocials(flags?.socials);
    } catch {
      /* socials optional */
    }
    try {
      const { initChatbot } = await import("./chatbot.js");
      initChatbot(flags);
    } catch {
      /* chatbot optional */
    }

    // Show/hide sections based on flags
    const iphoneSection = document.getElementById("iphoneMockupSection");
    const testimonialsSection = document.getElementById("testimonialsSection");
    const faqSection = document.getElementById("faqSection");

    if (flags.iphoneMockup && iphoneSection && !isMobileViewport()) {
      iphoneSection.hidden = false;
      // Initialize section mockup (below fold). Skipped on mobile so the
      // animation never runs on phones — saves battery and prevents any
      // chance of synthesized audio firing on a touch tap that elsewhere
      // triggered the audio-context unlock.
      initMockupAnimation("mockupMessages");
    } else if (iphoneSection && isMobileViewport()) {
      // Belt-and-suspenders: hide the section element on mobile even if
      // the flag is true. styles.css already hides the right-column
      // version of the mockup at this breakpoint, but the below-fold
      // section has its own visibility rules.
      iphoneSection.hidden = true;
    }

    if (flags.testimonials && testimonialsSection) {
      testimonialsSection.hidden = false;
      // Fetch from API or use defaults
      try {
        const res = await fetch(`${API_BASE}/api/testimonials`);
        if (res.ok) {
          const data = await res.json();
          renderTestimonials(data.testimonials || DEFAULT_TESTIMONIALS);
        } else {
          renderTestimonials(DEFAULT_TESTIMONIALS);
        }
      } catch {
        renderTestimonials(DEFAULT_TESTIMONIALS);
      }
    }

    if (flags.faq && faqSection) {
      faqSection.hidden = false;
      renderFAQ(DEFAULT_FAQS);
    }
  } catch (error) {
    console.warn("Failed to fetch feature flags:", error);
  }
}

// ============================================
// HERO LIVE ACTIVITY FEED
// ============================================

async function initHeroLiveFeed() {
  const feed = document.getElementById("heroFeedItems");
  const activeUsers = document.getElementById("heroActiveUsers");
  const totalSteps = document.getElementById("heroTotalSteps");
  const totalMiles = document.getElementById("heroTotalMiles");
  const totalWorkouts = document.getElementById("heroTotalWorkouts");
  
  if (!feed) return;

  // Try to fetch from API
  async function fetchLiveData() {
    try {
      const res = await fetch("https://api.thetrackerapp.io/api/activity/live");
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Could not fetch live activity:", e);
    }
    return null;
  }

  function renderEvents(events) {
    feed.innerHTML = "";
    events.slice(0, 6).forEach(event => {
      const item = document.createElement("div");
      item.className = "live-feed-item";
      item.innerHTML = `
        <span class="feed-icon">${event.icon || "👟"}</span>
        <div class="feed-info">
          <span class="feed-name">${escapeHtml(event.name)}</span>
          <span class="feed-location">${escapeHtml(event.location || "")}</span>
        </div>
        <span class="feed-value">+${event.delta || event.steps || 0}</span>
      `;
      feed.appendChild(item);
    });
  }

  function updateStats(stats) {
    if (activeUsers && stats.activeUsers) {
      activeUsers.textContent = `${stats.activeUsers} active`;
    }
    if (totalSteps && stats.totalStepsToday) {
      totalSteps.textContent = stats.totalStepsToday.toLocaleString();
    }
    if (totalMiles && stats.totalMilesToday) {
      totalMiles.textContent = stats.totalMilesToday.toFixed(1);
    }
    if (totalWorkouts && stats.totalWorkoutsToday) {
      totalWorkouts.textContent = stats.totalWorkoutsToday;
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  // Initial fetch
  const data = await fetchLiveData();
  if (data) {
    if (data.events) renderEvents(data.events);
    if (data.stats) updateStats(data.stats);
  } else {
    // Fallback to simulated data
    useFallbackData();
  }

  // Poll for updates
  setInterval(async () => {
    const data = await fetchLiveData();
    if (data) {
      if (data.events) renderEvents(data.events);
      if (data.stats) updateStats(data.stats);
    }
  }, 5000);

  function useFallbackData() {
    const names = ["John D.", "Sarah M.", "Alex K.", "Emily R.", "Mike T.", "Lisa W."];
    const locations = ["Austin", "NYC", "LA", "Chicago", "Seattle", "Miami"];
    const icons = ["👟", "🏃", "🚶", "💪", "🏋️", "🚴"];
    let stepTotal = Math.floor(Math.random() * 5000) + 2000;
    let workoutTotal = Math.floor(Math.random() * 5) + 1;

    if (totalSteps) totalSteps.textContent = stepTotal.toLocaleString();
    if (totalMiles) totalMiles.textContent = (stepTotal / 2000).toFixed(1);
    if (totalWorkouts) totalWorkouts.textContent = workoutTotal;
    if (activeUsers) activeUsers.textContent = `${Math.floor(Math.random() * 30) + 15} active`;

    for (let i = 0; i < 4; i++) addFallbackItem();

    function addFallbackItem() {
      const steps = Math.floor(Math.random() * 400) + 50;
      const item = document.createElement("div");
      item.className = "live-feed-item";
      item.innerHTML = `
        <span class="feed-icon">${icons[Math.floor(Math.random() * icons.length)]}</span>
        <div class="feed-info">
          <span class="feed-name">${names[Math.floor(Math.random() * names.length)]}</span>
          <span class="feed-location">${locations[Math.floor(Math.random() * locations.length)]}</span>
        </div>
        <span class="feed-value">+${steps}</span>
      `;
      feed.insertBefore(item, feed.firstChild);
      while (feed.children.length > 6) feed.removeChild(feed.lastChild);
      stepTotal += steps;
      if (totalSteps) totalSteps.textContent = stepTotal.toLocaleString();
      if (totalMiles) totalMiles.textContent = (stepTotal / 2000).toFixed(1);
    }

    setInterval(() => {
      addFallbackItem();
      if (activeUsers) activeUsers.textContent = `${Math.floor(Math.random() * 30) + 15} active`;
    }, 3000 + Math.random() * 2000);
  }
}

// ============================================
// MAINTENANCE MODE CHECK
// ============================================

async function checkMaintenanceMode() {
  try {
    // Use our edge-cached proxy (/api/control) instead of hitting the
    // upstream backend on every page load. Vercel caches this response
    // for 30 minutes at the edge.
    const res = await fetch("/api/control");
    if (!res.ok) return false;
    const flags = await res.json();
    
    if (flags.maintenanceMode) {
      // Hide ALL page content
      document.body.innerHTML = "";
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.body.style.overflow = "hidden";
      
      // Create maintenance page
      const overlay = document.createElement("div");
      overlay.className = "maintenance-overlay";
      overlay.innerHTML = `
        <div class="maintenance-icon">🔧</div>
        <h1>We'll Be Right Back</h1>
        <p>${flags.maintenanceMessage || "We're making some improvements. Check back soon!"}</p>
      `;
      document.body.appendChild(overlay);
      return true;
    }
  } catch (e) {
    console.warn("Could not check maintenance mode:", e);
  }
  return false;
}

// Handle live feed visibility based on feature flag
async function handleLiveFeedVisibility() {
  try {
    // Use the edge-cached /api/control proxy (30 min cache) instead of
    // hammering the upstream backend on every page load.
    const res = await fetch("/api/control");
    if (!res.ok) throw new Error("Failed to fetch flags");
    const flags = await res.json();
    
    const liveFeed = document.getElementById("heroLiveFeed");
    const iphoneFrame = document.getElementById("iphoneFrame");
    const rightColumn = document.getElementById("heroRightColumn");

    // RULE: show ONLY when flag is explicitly true. Anything else (false,
    // undefined, null, missing flag entirely) → keep hidden. Matches the
    // dashboard's flag policy and stops the live feed from flashing before
    // /api/control replies.
    const liveFeedEnabled = flags.liveActivityFeed === true;

    if (!liveFeedEnabled) {
      if (liveFeed) {
        liveFeed.style.display = "none";
        liveFeed.hidden = true;
      }
      if (iphoneFrame) iphoneFrame.classList.add("iphone-frame-expanded");
      if (rightColumn) rightColumn.classList.add("hero-right-column-expanded");
    } else {
      if (liveFeed) {
        liveFeed.style.display = "";
        liveFeed.hidden = false;
      }
      initHeroLiveFeed();
    }

    // Same rule for the step-tape panel. Cache the value so the data-driven
    // setStepsTapeVisibility() can honor it later when step events arrive.
    stepTapeFeatureEnabled = flags.stepTape === true;
    if (els.stepsCounterPanel && !stepTapeFeatureEnabled) {
      els.stepsCounterPanel.hidden = true;
    }
  } catch (e) {
    // Default: show live feed
    initHeroLiveFeed();
  }
}

inject();
initGoogleAnalytics();
init();
initFeatureSections();
handleLiveFeedVisibility();
