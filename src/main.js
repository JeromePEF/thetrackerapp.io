import { API_BASE, fetchLiveMetrics, fetchPebbleLeaderboard, fetchWorkoutLeaderboard, submitSignup } from "./api.js";
import { inject } from "@vercel/analytics";
import { initGoogleAnalytics } from "./google-analytics.js";

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
    id: "whatsapp",
    label: "WhatsApp",
    logo: "/SVGS/WhatsApp.svg",
    provider: "WhatsApp",
    identityKind: "phone",
  },
  {
    id: "telegram",
    label: "Telegram",
    logo: "/SVGS/Telegram_logo.svg",
    provider: "Telegram",
    identityKind: "username",
  },
  {
    id: "discord",
    label: "Discord",
    logo: "/SVGS/discord-icon-svgrepo-com.svg",
    provider: "Discord",
    identityKind: "username",
  },
  {
    id: "groupme",
    label: "GroupMe",
    logo: "/SVGS/GroupMe_idFawIHcaz_1.svg",
    provider: "GroupMe",
    identityKind: "username",
  },
  {
    id: "signal",
    label: "Signal",
    logo: "/SVGS/Signal-Logo-Ultramarine.svg",
    provider: "Signal",
    identityKind: "phone",
  },
];

const state = {
  serviceId: "imessage",
};

const RUN_CLUB_ENDPOINTS = ["/api/run-clubs", "/api/clubs/run", "/api/clubs?type=run", "/run-clubs"];
const PERSONAL_TRAINER_ENDPOINTS = ["/api/personal-trainers", "/api/trainers", "/api/coaches", "/personal-trainers"];
const RUN_CLUB_KEYS = ["runClubs", "clubs", "items", "results", "rows", "data"];
const PERSONAL_TRAINER_KEYS = ["personalTrainers", "trainers", "coaches", "items", "results", "rows", "data"];
const LIVE_LEADERBOARD_REFRESH_MS = 30000;
const LIVE_PEBBLE_STEPS_REFRESH_MS = 5000;
const STEPS_TAPE_MAX_ROWS = 20;
const STEPS_PER_MILE = 2000;
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
  serviceShell: document.getElementById("serviceShell"),
  serviceSelect: document.getElementById("serviceSelect"),
  serviceCarousel: document.getElementById("serviceCarousel"),
  serviceCarouselLabel: document.getElementById("serviceCarouselLabel"),
  runClubsNavLink: document.getElementById("runClubsNavLink"),
  personalTrainersNavLink: document.getElementById("personalTrainersNavLink"),
  stepsCounterPanel: document.getElementById("stepsCounterPanel"),

  usersTodayCount: document.getElementById("usersTodayCount"),
  usersWeekCount: document.getElementById("usersWeekCount"),
  usersOnlineCount: document.getElementById("usersOnlineCount"),
  workoutsLoggedCount: document.getElementById("workoutsLoggedCount"),
  minutesRanCount: document.getElementById("minutesRanCount"),
  caloriesTrackedCount: document.getElementById("caloriesTrackedCount"),
  gallonsDrankCount: document.getElementById("gallonsDrankCount"),
  usersTodayLink: document.getElementById("usersTodayLink"),
  usersWeekLink: document.getElementById("usersWeekLink"),
  usersOnlineLink: document.getElementById("usersOnlineLink"),
  workoutsLoggedLink: document.getElementById("workoutsLoggedLink"),
  minutesRanLink: document.getElementById("minutesRanLink"),
  caloriesTrackedLink: document.getElementById("caloriesTrackedLink"),
  gallonsDrankLink: document.getElementById("gallonsDrankLink"),
  leaderboardList: document.getElementById("leaderboardList"),
  leaderboardState: document.getElementById("leaderboardState"),
  groupLeaderboardList: document.getElementById("groupLeaderboardList"),
  groupLeaderboardState: document.getElementById("groupLeaderboardState"),
  streakLeaderboardList: document.getElementById("streakLeaderboardList"),
  streakLeaderboardState: document.getElementById("streakLeaderboardState"),
  pebbleCaloriesList: document.getElementById("pebbleCaloriesList"),
  pebbleWorkoutsList: document.getElementById("pebbleWorkoutsList"),
  pebbleStepsList: document.getElementById("pebbleStepsList"),
  pebbleLeaderboardState: document.getElementById("pebbleLeaderboardState"),
  stepsTapeTotalSteps: document.getElementById("stepsTapeTotalSteps"),
  stepsTapeTotalMiles: document.getElementById("stepsTapeTotalMiles"),
  stepsTapeList: document.getElementById("stepsTapeList"),
  stepsTapeState: document.getElementById("stepsTapeState"),

  signupForm: document.getElementById("signupForm"),
  serviceIdentityText: document.getElementById("serviceIdentityText"),
  serviceIdentityHelp: document.getElementById("serviceIdentityHelp"),
  serviceIdentityInput: document.getElementById("serviceIdentityInput"),
  emailInput: document.getElementById("emailInput"),
  consentWrap: document.getElementById("consentWrap"),
  consentCheckbox: document.getElementById("consentCheckbox"),
  signupStatus: document.getElementById("signupStatus"),
  liveWorkoutToast: document.getElementById("liveWorkoutToast"),
  liveWorkoutToastMessage: document.getElementById("liveWorkoutToastMessage"),
};

let fitFrame = 0;
let liveWorkoutTicker = 0;
let liveWorkoutHideTimer = 0;
let leaderboardRefreshTicker = 0;
let pebbleStepsRefreshTicker = 0;
let ignoreCarouselClickUntil = 0;
let lastWheelChangeAt = 0;
let leaderboardRequestInFlight = false;
let pebbleStepsRequestInFlight = false;
let hasLoadedLeaderboard = false;

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

  const [hasRunClubs, hasPersonalTrainers] = await Promise.all([
    hasDiscoveryRows(RUN_CLUB_ENDPOINTS, RUN_CLUB_KEYS),
    hasDiscoveryRows(PERSONAL_TRAINER_ENDPOINTS, PERSONAL_TRAINER_KEYS),
  ]);

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

function showLiveWorkoutToast() {
  if (!els.liveWorkoutToast || !els.liveWorkoutToastMessage || !liveWorkoutState.events.length) {
    return;
  }

  const nextEvent = liveWorkoutState.events[liveWorkoutState.index];
  liveWorkoutState.index = (liveWorkoutState.index + 1) % liveWorkoutState.events.length;

  els.liveWorkoutToast.hidden = false;
  els.liveWorkoutToastMessage.textContent = buildLiveWorkoutMessage(nextEvent);
  els.liveWorkoutToast.classList.add("is-visible");

  window.clearTimeout(liveWorkoutHideTimer);
  liveWorkoutHideTimer = window.setTimeout(hideLiveWorkoutToast, 4300);
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
  liveWorkoutTicker = window.setInterval(showLiveWorkoutToast, 5000);
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
  const xStep = Math.max(140, Math.min(220, Math.round(width * 0.26)));

  buttons.forEach((button, index) => {
    const offset = shortestCircularOffset(index, activeIndex, total);
    const distance = Math.abs(offset);
    const scale = distance === 0 ? 1 : distance === 1 ? 0.82 : distance === 2 ? 0.66 : 0.54;
    const opacity = distance === 0 ? 1 : distance === 1 ? 0.8 : distance === 2 ? 0.62 : 0.48;
    const rotate = offset * -10;
    const shiftX = offset * xStep;
    const shiftY = distance * 14;

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

function setStatus(target, message, type = "") {
  target.textContent = message;
  target.classList.remove("success", "error");

  if (type) {
    target.classList.add(type);
  }

  requestViewportFit();
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

function applyLiveMetricsResponse(liveMetrics) {
  if (!liveMetrics) {
    return;
  }

  const master = liveMetrics.masterLogSheetUrl || "";

  setCounterValue(els.usersTodayCount, liveMetrics.usersUsingToday?.value);
  setCounterValue(els.usersWeekCount, liveMetrics.totalUsersThisWeek?.value);
  setCounterValue(els.usersOnlineCount, liveMetrics.usersOnline?.value);
  setCounterValue(els.workoutsLoggedCount, liveMetrics.workoutsLogged?.value);
  setCounterValue(els.minutesRanCount, liveMetrics.minutesRan?.value);
  setCounterValue(els.caloriesTrackedCount, liveMetrics.caloriesTracked?.value);
  setCounterValue(els.gallonsDrankCount, liveMetrics.gallonsDrank?.value);

  setStatsLink(els.usersTodayLink, liveMetrics.usersUsingToday?.sheetUrl, master);
  setStatsLink(els.usersWeekLink, liveMetrics.totalUsersThisWeek?.sheetUrl, master);
  setStatsLink(els.usersOnlineLink, liveMetrics.usersOnline?.sheetUrl, master);
  setStatsLink(els.workoutsLoggedLink, liveMetrics.workoutsLogged?.sheetUrl, master);
  setStatsLink(els.minutesRanLink, liveMetrics.minutesRan?.sheetUrl, master);
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
        <span class="steps-tape-row-meta">${formatNumber(event.total)} total steps • ${formatDecimal(milesForUser)} mi</span>
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
  els.stepsTapeTotalMiles.textContent = formatDecimal(totalMiles);

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
  const needsSmsConsent = service.identityKind === "phone";

  els.consentWrap.classList.toggle("is-inactive", !needsSmsConsent);
  els.consentWrap.setAttribute("aria-hidden", needsSmsConsent ? "false" : "true");
  els.consentCheckbox.required = needsSmsConsent;
  els.consentCheckbox.disabled = !needsSmsConsent;

  if (!needsSmsConsent) {
    els.consentCheckbox.checked = false;
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
  els.serviceSelect.value = service.id;
  syncServiceCarousel();

  if (els.serviceCarouselLabel) {
    els.serviceCarouselLabel.textContent = `${service.label} selected`;
  }

  syncServiceInputRequirements();
}

function renderServiceOptions() {
  els.serviceSelect.innerHTML = SERVICES.map((service) => {
    const selected = service.id === state.serviceId ? "selected" : "";
    return `<option value="${service.id}" ${selected}>${service.label}</option>`;
  }).join("");
}

function renderLeaderboard(entries) {
  if (!entries.length) {
    els.leaderboardList.innerHTML = "";
    els.leaderboardState.textContent = "No workout rows yet in this sheet.";
    return;
  }

  els.leaderboardList.innerHTML = entries
    .map((entry, index) => {
      return `<li>
        <span class="leaderboard-rank">#${index + 1}</span>
        <span class="leaderboard-user">${entry.name}</span>
        <span class="leaderboard-score">${formatNumber(entry.score)} workouts</span>
      </li>`;
    })
    .join("");

  els.leaderboardState.textContent = "";
  requestViewportFit();
}

function renderGroupLeaderboard(entries) {
  if (!entries.length) {
    els.groupLeaderboardList.innerHTML = "";
    els.groupLeaderboardState.textContent = "No group leaderboard rows yet.";
    return;
  }

  els.groupLeaderboardList.innerHTML = entries
    .map((entry, index) => {
      return `<li>
        <span class="leaderboard-rank">#${index + 1}</span>
        <span class="leaderboard-user">${entry.name}</span>
        <span class="leaderboard-score">${formatNumber(entry.score)} workouts</span>
      </li>`;
    })
    .join("");

  els.groupLeaderboardState.textContent = "";
  requestViewportFit();
}

function renderStreakLeaderboard(entries) {
  if (!entries.length) {
    els.streakLeaderboardList.innerHTML = "";
    els.streakLeaderboardState.textContent = "No streak data yet.";
    return;
  }

  els.streakLeaderboardList.innerHTML = entries
    .map((entry, index) => {
      const dayLabel = entry.score === 1 ? "day" : "days";
      return `<li>
        <span class="leaderboard-rank">#${index + 1}</span>
        <span class="leaderboard-user">${entry.name}</span>
        <span class="leaderboard-score">${formatNumber(entry.score)} ${dayLabel}</span>
      </li>`;
    })
    .join("");

  els.streakLeaderboardState.textContent = "";
  requestViewportFit();
}

function renderPebbleMetricList(target, entries, unitLabel) {
  if (!entries.length) {
    target.innerHTML = `<li><span class="leaderboard-user">No data</span><span class="leaderboard-score">-</span></li>`;
    return;
  }

  target.innerHTML = entries
    .map((entry, index) => {
      const unit = entry.unit || unitLabel;
      return `<li>
        <span class="leaderboard-rank">#${index + 1}</span>
        <span class="leaderboard-user">${entry.name}</span>
        <span class="leaderboard-score">${formatNumber(entry.score)} ${unit}</span>
      </li>`;
    })
    .join("");
}

function renderPebbleLeaderboard(pebble) {
  renderPebbleMetricList(els.pebbleCaloriesList, pebble?.caloriesTop || [], "cal");
  renderPebbleMetricList(els.pebbleWorkoutsList, pebble?.workoutsTop || [], "sessions");
  renderPebbleMetricList(els.pebbleStepsList, pebble?.stepsTop || [], "steps");
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

async function loadLeaderboard() {
  if (leaderboardRequestInFlight) {
    return;
  }
  leaderboardRequestInFlight = true;

  if (!hasLoadedLeaderboard) {
    setStatus(els.leaderboardState, "Loading leaderboard...", "");
    setStatus(els.groupLeaderboardState, "Loading groups leaderboard...", "");
    setStatus(els.streakLeaderboardState, "Loading streak leaderboard...", "");
    setStatus(els.pebbleLeaderboardState, "Loading Pebble leaderboard...", "");
  }

  try {
    const [leaderboardResult, pebbleResult, liveMetricsResult] = await Promise.allSettled([
      fetchWorkoutLeaderboard(),
      fetchPebbleLeaderboard(),
      fetchLiveMetrics(),
    ]);

    if (leaderboardResult.status !== "fulfilled") {
      throw leaderboardResult.reason;
    }

    const payload = leaderboardResult.value;
    renderLeaderboard(payload.entries);
    renderGroupLeaderboard(payload.groupEntries || []);
    renderStreakLeaderboard(payload.streakEntries || []);
    setLiveWorkoutEvents(payload.liveEvents || []);

    if (liveMetricsResult.status === "fulfilled") {
      applyLiveMetricsResponse(liveMetricsResult.value);
    } else {
      setCounterValue(els.usersTodayCount, payload.usersToday);
      setCounterValue(els.usersWeekCount, payload.usersThisWeek);
      setCounterValue(els.usersOnlineCount, payload.usersOnline);
      setCounterValue(els.workoutsLoggedCount, payload.workoutsLogged);
      setCounterValue(els.minutesRanCount, payload.minutesRan);
      setCounterValue(els.caloriesTrackedCount, 0);
      setCounterValue(els.gallonsDrankCount, 0);
    }

    if (pebbleResult.status === "fulfilled") {
      renderPebbleLeaderboard(pebbleResult.value);
      applyPebbleStepsTapePayload(pebbleResult.value);
    } else {
      renderPebbleLeaderboard(payload.pebble || {});
      applyPebbleStepsTapePayload(payload.pebble || {});
    }
    hasLoadedLeaderboard = true;
  } catch (error) {
    els.leaderboardList.innerHTML = "";
    els.groupLeaderboardList.innerHTML = "";
    els.streakLeaderboardList.innerHTML = "";
    els.pebbleCaloriesList.innerHTML = "";
    els.pebbleWorkoutsList.innerHTML = "";
    els.pebbleStepsList.innerHTML = "";
    setLiveWorkoutEvents([]);
    setCounterValue(els.usersOnlineCount, 0);
    setCounterValue(els.workoutsLoggedCount, 0);
    setCounterValue(els.minutesRanCount, 0);
    setCounterValue(els.caloriesTrackedCount, 0);
    setCounterValue(els.gallonsDrankCount, 0);
    setStepsTapeVisibility(false);
    if (els.stepsTapeState) {
      els.stepsTapeState.textContent = `Step counter unavailable: ${error.message}`;
    }
    setStatus(els.leaderboardState, `Leaderboard unavailable: ${error.message}`, "error");
    setStatus(els.groupLeaderboardState, `Groups unavailable: ${error.message}`, "error");
    setStatus(els.streakLeaderboardState, `Streaks unavailable: ${error.message}`, "error");
    setStatus(els.pebbleLeaderboardState, `Pebble leaderboard unavailable: ${error.message}`, "error");
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
    const pebble = await fetchPebbleLeaderboard();
    renderPebbleLeaderboard(pebble);
    applyPebbleStepsTapePayload(pebble);
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
  if (!validation.ok) {
    setStatus(els.signupStatus, validation.message, "error");
    return;
  }

  setStatus(els.signupStatus, "Submitting signup...", "");

  try {
    await submitSignup(validation.payload);
    setStatus(els.signupStatus, "Signup sent. Check your messages to continue onboarding.", "success");
  } catch (error) {
    setStatus(els.signupStatus, error.message || "Signup request failed.", "error");
  }
}

function wireEvents() {
  els.serviceSelect.addEventListener("change", (event) => {
    state.serviceId = event.target.value;
    updateServiceVisual();
  });

  els.signupForm.addEventListener("submit", handleSignup);

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
}

function init() {
  renderServiceOptions();
  renderServiceCarousel();
  updateServiceVisual();
  wireEvents();

  if (els.stepsTapeState) {
    els.stepsTapeState.textContent = "Loading live step counter...";
  }
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

init();
inject();
initGoogleAnalytics();
