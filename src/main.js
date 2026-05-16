import { API_BASE, fetchLiveMetrics, fetchPublicLeaderboardSnapshot, submitSignup } from "./api.js";
import { inject } from "@vercel/analytics";
import { initGoogleAnalytics } from "./google-analytics.js";
import { attachRefToPayload, captureRefFromUrl } from "./affiliate-ref.js";

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
  emailInput: document.getElementById("emailInput"),
  emailLabel: document.querySelector('label[for="emailInput"]'),
  consentWrap: document.getElementById("consentWrap"),
  consentCheckbox: document.getElementById("consentCheckbox"),
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

function setStepsTapeVisibility(visible) {
  if (els.stepsCounterPanel) {
    els.stepsCounterPanel.hidden = !visible;
  }

  if (els.mainContent) {
    els.mainContent.classList.toggle("steps-panel-hidden", !visible);
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
  if (els.emailLabel) {
    els.emailLabel.hidden = isTelegram;
  }
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

  els.consentWrap.classList.toggle("is-inactive", !needsSmsConsent || isTelegram);
  els.consentWrap.setAttribute("aria-hidden", needsSmsConsent && !isTelegram ? "false" : "true");
  els.consentCheckbox.required = needsSmsConsent && !isTelegram;
  els.consentCheckbox.disabled = !needsSmsConsent || isTelegram;

  if (!needsSmsConsent || isTelegram) {
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
  const email = els.emailInput.value.trim();
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

  if (email && !validEmail(email)) {
    return { ok: false, message: "Enter a valid email address or leave it blank." };
  }

  if (needsSmsConsent && !els.consentCheckbox.checked) {
    return { ok: false, message: "Consent is required for phone onboarding (10DLC/A2P)." };
  }

  if (service.provider === "iMessage") {
    return {
      ok: true,
      payload: {
        provider: "iMessage",
        contact,
        email: email || null,
      },
    };
  }

  return {
    ok: true,
    payload: {
      provider: service.provider,
      phone,
      username,
      email: email || null,
      sms_consent_10dlc: needsSmsConsent ? true : false,
      source: "hero_onboarding",
      requested_at: new Date().toISOString(),
    },
  };
}

async function handleSignup(event) {
  event.preventDefault();

  const validation = validateForm();
  if (validation.isBotLink) {
    return;
  }
  if (!validation.ok) {
    setStatus(els.signupStatus, validation.message, "error");
    return;
  }

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

inject();
initGoogleAnalytics();
init();
