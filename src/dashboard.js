import { initGoogleAnalytics } from "./google-analytics.js";
import { initFeatureFlags, getCachedFlags } from "./feature-flags.js";
import {
  getBillingPrices,
  getBillingPricesSync,
  subscribeBillingPrices,
} from "./billing-prices.js";
import { initChecklist } from "./dashboard-checklist.js";
import { attachInlineEditMeasurements, hydrateInlineEditMeasurements } from "./inline-edit-measurements.js";
import { initDashboardCharts } from "./dashboard-charts.js";
import {
  initPersonalTrainerTab,
  initGroupsTab,
  initRunClubsTab,
} from "./dashboard-coach-community.js";
import { initCalendarTab } from "./dashboard-calendar.js";
import { initShortcutsTab } from "./dashboard-shortcuts.js";
import {
  API_BASE,
  affiliateAgreement,
  affiliateConnect,
  affiliateHistory,
  affiliateSignup,
  affiliateStatus,
  fetchWorkoutLeaderboard,
  readStoredAffiliateIdentity,
} from "./api.js";
import {
  buildAffiliateShape,
  hasAffiliateProfile,
  readAffiliateAgreementConnectBlocked,
  readAffiliateAgreementMessage,
  readAffiliateAgreementRequired,
  readAffiliateAgreementSigned,
  readAffiliateAgreementSigningUrl,
  readAffiliateCanConnectStripe,
  readAffiliateChargesEnabled,
  readAffiliateCode,
  readAffiliateOnboardingUrl,
  readAffiliatePayoutsEnabled,
  readAffiliateReferralUrl,
  readAffiliateStripeStatus,
} from "./affiliate-shape.js";

const AUTH_FLAG_KEY = "tracker.authenticated";
const AUTH_USER_KEY = "tracker.auth.user";
const AUTH_SESSION_KEY = "tracker.auth.session";
const MAIN_SITE_LOGOUT_URL = "https://thetrackerapp.io/logout?next=%2F";
const AFFILIATE_PENDING_KEY = "tracker.affiliate.pending";
const GOALS_STORAGE_KEY = "tracker.dashboard.goals";
const TAB_IDS = ["account", "setup", "stats", "calendar", "shortcuts", "export", "billing", "integrate", "sheet", "personal-trainer", "groups", "run-clubs", "affiliate"];
const RANGE_IDS = ["today", "week", "month", "year", "all"];
const RANGE_LABELS = {
  today: "D",
  week: "W",
  month: "M",
  year: "Y",
  all: "AT",
  custom: "CUSTOM",
};

const DEFAULT_MILESTONES = [
  { id: "pushups_100_day_1", name: "100 Pushups a Day Club 1", target: 100 },
  { id: "pushups_1000_day", name: "1000 Pushups a Day Club", target: 1000 },
  { id: "miles_100_ran", name: "100 Miles Ran Club", target: 100 },
];

const POPULAR_WORKOUT_PLANS = {
  "7": [
    {
      id: "7_push_pull_legs_strength",
      name: "Push Pull Legs + Strength",
      summary: "High frequency split for advanced users with two lower and two push/pull exposures.",
      days: [
        "Day 1: Push (chest/shoulders/triceps)",
        "Day 2: Pull (back/biceps)",
        "Day 3: Legs (quad focus)",
        "Day 4: Upper strength (bench/row/overhead press)",
        "Day 5: Lower strength (squat/deadlift variations)",
        "Day 6: Glute + hamstring hypertrophy",
        "Day 7: Conditioning + mobility",
      ],
    },
  ],
  "6": [
    {
      id: "6_ppl_x2",
      name: "PPL x2",
      summary: "Classic hypertrophy split repeated twice per week.",
      days: [
        "Day 1: Push A",
        "Day 2: Pull A",
        "Day 3: Legs A",
        "Day 4: Push B",
        "Day 5: Pull B",
        "Day 6: Legs B + core",
      ],
    },
  ],
  "5": [
    {
      id: "5_upper_lower_glute",
      name: "Upper/Lower + Glute Priority",
      summary: "Balanced split with extra glute volume.",
      days: [
        "Day 1: Upper (push emphasis)",
        "Day 2: Lower (quad emphasis)",
        "Day 3: Upper (pull emphasis)",
        "Day 4: Lower (hamstring/glute emphasis)",
        "Day 5: Glute specialization + conditioning",
      ],
    },
  ],
  "4": [
    {
      id: "4_upper_lower",
      name: "Upper Lower x2",
      summary: "Efficient split for most intermediates.",
      days: [
        "Day 1: Upper strength",
        "Day 2: Lower strength",
        "Day 3: Upper hypertrophy",
        "Day 4: Lower hypertrophy + core",
      ],
    },
  ],
  "3": [
    {
      id: "3_full_body",
      name: "Full Body 3-Day",
      summary: "Time-efficient strength + muscle plan.",
      days: [
        "Day 1: Full body (squat + push + pull)",
        "Day 2: Full body (hinge + overhead + row)",
        "Day 3: Full body (single-leg + incline push + pulldown)",
      ],
    },
  ],
  "2": [
    {
      id: "2_upper_lower_essentials",
      name: "Upper Lower Essentials",
      summary: "Two-day plan for busy schedules.",
      days: [
        "Day 1: Full upper + core",
        "Day 2: Full lower + conditioning",
      ],
    },
  ],
  "1": [
    {
      id: "1_full_body_priority",
      name: "Single-Day Full Body",
      summary: "One high-impact session per week.",
      days: ["Day 1: Squat/hinge/push/pull + finisher circuit"],
    },
  ],
};

const els = {
  navButtons: Array.from(document.querySelectorAll(".dashboard-tab[data-tab]")),
  panels: Array.from(document.querySelectorAll("[data-tab-panel]")),
  statsRangeButtons: Array.from(document.querySelectorAll(".stats-range-btn")),
  planDayButtons: Array.from(document.querySelectorAll(".plan-day-btn")),
  affiliateCopyButtons: Array.from(document.querySelectorAll(".affiliate-copy")),

  navGoals: document.getElementById("navGoals"),
  navIntegrate: document.getElementById("navIntegrate"),
  navSetup: document.getElementById("navSetup"),
  accountEmailValue: document.getElementById("accountEmailValue"),
  accountUsernameValue: document.getElementById("accountUsernameValue"),
  accountAgeValue: document.getElementById("accountAgeValue"),
  accountIdValue: document.getElementById("accountIdValue"),
  accountCanonicalValue: document.getElementById("accountCanonicalValue"),
  accountMethodValue: document.getElementById("accountMethodValue"),
  accountContactValue: document.getElementById("accountContactValue"),
  accountLoginAtValue: document.getElementById("accountLoginAtValue"),
  accountEmailInput: document.getElementById("accountEmailInput"),

  emailVerifyPrompt: document.getElementById("emailVerifyPrompt"),
  accountUsernameInput: document.getElementById("accountUsernameInput"),
  accountAgeInput: document.getElementById("accountAgeInput"),
  accountWeightInput: document.getElementById("accountWeightInput"),
  accountHeightInput: document.getElementById("accountHeightInput"),
  accountGoalWeightInput: document.getElementById("accountGoalWeightInput"),
  accountGoalBodyFatInput: document.getElementById("accountGoalBodyFatInput"),
  accountFitnessGoalInput: document.getElementById("accountFitnessGoalInput"),
  accountWorkoutSplitInput: document.getElementById("accountWorkoutSplitInput"),
  accountTimezoneInput: document.getElementById("accountTimezoneInput"),
  accountGoalSummaryInput: document.getElementById("accountGoalSummaryInput"),
  saveAccountEmailButton: document.getElementById("saveAccountEmailButton"),
  verifyAccountEmailButton: document.getElementById("verifyAccountEmailButton"),
  saveAccountUsernameButton: document.getElementById("saveAccountUsernameButton"),
  saveAccountAgeButton: document.getElementById("saveAccountAgeButton"),
  saveAccountWeightButton: document.getElementById("saveAccountWeightButton"),
  saveAccountHeightButton: document.getElementById("saveAccountHeightButton"),
  saveAccountGoalWeightButton: document.getElementById("saveAccountGoalWeightButton"),
  saveAccountGoalBodyFatButton: document.getElementById("saveAccountGoalBodyFatButton"),
  saveAccountFitnessGoalButton: document.getElementById("saveAccountFitnessGoalButton"),
  saveAccountWorkoutSplitButton: document.getElementById("saveAccountWorkoutSplitButton"),
  saveAccountTimezoneButton: document.getElementById("saveAccountTimezoneButton"),
  saveAccountGoalSummaryButton: document.getElementById("saveAccountGoalSummaryButton"),
  accountEmailSaved: document.getElementById("accountEmailSaved"),
  accountUsernameSaved: document.getElementById("accountUsernameSaved"),
  accountAgeSaved: document.getElementById("accountAgeSaved"),
  accountWeightSaved: document.getElementById("accountWeightSaved"),
  accountHeightSaved: document.getElementById("accountHeightSaved"),
  accountGoalWeightSaved: document.getElementById("accountGoalWeightSaved"),
  accountGoalBodyFatSaved: document.getElementById("accountGoalBodyFatSaved"),
  accountFitnessGoalSaved: document.getElementById("accountFitnessGoalSaved"),
  accountWorkoutSplitSaved: document.getElementById("accountWorkoutSplitSaved"),
  accountTimezoneSaved: document.getElementById("accountTimezoneSaved"),
  accountGoalSummarySaved: document.getElementById("accountGoalSummarySaved"),
  accountEmailStatus: document.getElementById("accountEmailStatus"),
  accountUsernameStatus: document.getElementById("accountUsernameStatus"),
  accountAgeStatus: document.getElementById("accountAgeStatus"),
  accountWeightStatus: document.getElementById("accountWeightStatus"),
  accountHeightStatus: document.getElementById("accountHeightStatus"),
  accountGoalWeightStatus: document.getElementById("accountGoalWeightStatus"),
  accountGoalBodyFatStatus: document.getElementById("accountGoalBodyFatStatus"),
  accountFitnessGoalStatus: document.getElementById("accountFitnessGoalStatus"),
  accountWorkoutSplitStatus: document.getElementById("accountWorkoutSplitStatus"),
  accountTimezoneStatus: document.getElementById("accountTimezoneStatus"),
  accountGoalSummaryStatus: document.getElementById("accountGoalSummaryStatus"),
  // Tracking preferences
  toggleTrackBodyMeasures: document.getElementById("toggleTrackBodyMeasures"),
  toggleTrackCreatine: document.getElementById("toggleTrackCreatine"),
  toggleLeaderboardOptIn: document.getElementById("toggleLeaderboardOptIn"),
  toggleWeeklyDigestOptOut: document.getElementById("toggleWeeklyDigestOptOut"),
  saveTrackingPrefsButton: document.getElementById("saveTrackingPrefsButton"),
  trackingPrefsSaved: document.getElementById("trackingPrefsSaved"),
  trackingPrefsStatus: document.getElementById("trackingPrefsStatus"),

  publicProfileUrl: document.getElementById("publicProfileUrl"),
  publicProfileUsername: document.getElementById("publicProfileUsername"),
  toggleWorkoutVisibility: document.getElementById("toggleWorkoutVisibility"),
  toggleNutritionVisibility: document.getElementById("toggleNutritionVisibility"),
  toggleWaterVisibility: document.getElementById("toggleWaterVisibility"),
  toggleLeaderboardVisibility: document.getElementById("toggleLeaderboardVisibility"),
  toggleRecentWorkoutsVisibility: document.getElementById("toggleRecentWorkoutsVisibility"),
  toggleMergedVisibility: document.getElementById("toggleMergedVisibility"),
  toggleStatsBarVisibility: document.getElementById("toggleStatsBarVisibility"),
  togglePublicLeaderboardConsent: document.getElementById("togglePublicLeaderboardConsent"),
  savePublicProfileButton: document.getElementById("savePublicProfileButton"),
  publicProfileSaved: document.getElementById("publicProfileSaved"),
  publicProfileStatus: document.getElementById("publicProfileStatus"),
  publicProfileToggles: document.getElementById("publicProfileToggles"),

  navPersonalTrainer: document.getElementById("navPersonalTrainer"),
  personalTrainerPanel: document.getElementById("tabPersonalTrainer"),
  personalTrainerStatusValue: document.getElementById("personalTrainerStatusValue"),
  personalTrainerNameValue: document.getElementById("personalTrainerNameValue"),

  navAffiliate: document.getElementById("navAffiliate"),
  affiliatePanel: document.getElementById("tabAffiliate"),
  affiliateTabEmpty: document.getElementById("affiliateTabEmpty"),
  affiliateTabMetrics: document.getElementById("affiliateTabMetrics"),
  affiliateApplyForm: document.getElementById("affiliateApplyForm"),
  affiliateFirstNameInput: document.getElementById("affiliateFirstNameInput"),
  affiliateLastNameInput: document.getElementById("affiliateLastNameInput"),
  affiliateEmailInput: document.getElementById("affiliateEmailInput"),
  affiliateConfirmEmailInput: document.getElementById("affiliateConfirmEmailInput"),
  affiliatePhoneInput: document.getElementById("affiliatePhoneInput"),
  affiliateTabBillingStatus: document.getElementById("affiliateTabBillingStatus"),
  affiliateApplyButton: document.getElementById("affiliateApplyButton"),
  affiliateApplySuccess: document.getElementById("affiliateApplySuccess"),
  affiliateOpenBillingButton: document.getElementById("affiliateOpenBillingButton"),
  affiliateTabEmptyStatus: document.getElementById("affiliateTabEmptyStatus"),
  affiliateTabAgreementBox: document.getElementById("affiliateTabAgreementBox"),
  affiliateAgreementHeading: document.getElementById("affiliateAgreementHeading"),
  affiliateAgreementMessage: document.getElementById("affiliateAgreementMessage"),
  affiliateAgreementEmailInput: document.getElementById("affiliateAgreementEmailInput"),
  affiliateAgreementConfirmEmailInput: document.getElementById("affiliateAgreementConfirmEmailInput"),
  affiliateTabTotalPaid: document.getElementById("affiliateTabTotalPaid"),

  sheetDatabaseLink: document.getElementById("sheetDatabaseLink"),
  sheetStatus: document.getElementById("sheetStatus"),

  milestonesList: document.getElementById("milestonesList"),
  milestonesStatus: document.getElementById("milestonesStatus"),
  // Setup tab
  setupProgressText: document.getElementById("setupProgressText"),
  setupProgressFill: document.getElementById("setupProgressFill"),
  setupChecklist: document.getElementById("setupChecklist"),
  // Billing
  billingStatusValue: document.getElementById("billingStatusValue"),
  billingPlanValue: document.getElementById("billingPlanValue"),
  billingPlanRow: document.getElementById("billingPlanRow"),
  billingLastPaymentValue: document.getElementById("billingLastPaymentValue"),
  billingLastPaymentRow: document.getElementById("billingLastPaymentRow"),
  billingNextBillingValue: document.getElementById("billingNextBillingValue"),
  billingNextBillingRow: document.getElementById("billingNextBillingRow"),
  billingNoAccount: document.getElementById("billingNoAccount"),
  billingManageLink: document.getElementById("billingManageLink"),
};

const state = {
  activeTab: "stats",
  activeRange: "today",
  metricsByRange: new Map(),
  bodyMeasures: [],
  leaderboardRank: null,
  goals: {
    weightGoal: "",
    bodyFatGoal: "",
    workoutPlan: "",
  },
  selectedPlanDays: "7",
  milestonesOpen: false,
  currentSheetUrl: "",
  userSheetUrl: "",
  backendSnapshot: null,
  availableIntegrations: [],
  affiliateProfile: null,
  billingPortalUrl: "",
  affiliateHistoryLoadedKey: "",
  affiliateHistoryLoading: false,
};

const ACCOUNT_FIELD_CONFIG = {
  email: {
    input: () => els.accountEmailInput,
    button: () => els.saveAccountEmailButton,
    status: () => els.accountEmailStatus,
    check: () => els.accountEmailSaved,
    label: "email",
  },
  username: {
    input: () => els.accountUsernameInput,
    button: () => els.saveAccountUsernameButton,
    status: () => els.accountUsernameStatus,
    check: () => els.accountUsernameSaved,
    label: "username",
  },
  age: {
    input: () => els.accountAgeInput,
    button: () => els.saveAccountAgeButton,
    status: () => els.accountAgeStatus,
    check: () => els.accountAgeSaved,
    label: "age",
  },
  currentWeight: {
    input: () => els.accountWeightInput,
    button: () => els.saveAccountWeightButton,
    status: () => els.accountWeightStatus,
    check: () => els.accountWeightSaved,
    label: "weight",
    backendKey: "currentWeight",
  },
  currentHeight: {
    input: () => els.accountHeightInput,
    button: () => els.saveAccountHeightButton,
    status: () => els.accountHeightStatus,
    check: () => els.accountHeightSaved,
    label: "height",
    backendKey: "currentHeight",
  },
  goalWeight: {
    input: () => els.accountGoalWeightInput,
    button: () => els.saveAccountGoalWeightButton,
    status: () => els.accountGoalWeightStatus,
    check: () => els.accountGoalWeightSaved,
    label: "goal weight",
  },
  goalBodyFat: {
    input: () => els.accountGoalBodyFatInput,
    button: () => els.saveAccountGoalBodyFatButton,
    status: () => els.accountGoalBodyFatStatus,
    check: () => els.accountGoalBodyFatSaved,
    label: "goal body fat",
  },
  fitnessGoal: {
    input: () => els.accountFitnessGoalInput,
    button: () => els.saveAccountFitnessGoalButton,
    status: () => els.accountFitnessGoalStatus,
    check: () => els.accountFitnessGoalSaved,
    label: "fitness goal",
  },
  workoutSplit: {
    input: () => els.accountWorkoutSplitInput,
    button: () => els.saveAccountWorkoutSplitButton,
    status: () => els.accountWorkoutSplitStatus,
    check: () => els.accountWorkoutSplitSaved,
    label: "workout split",
  },
  timezone: {
    input: () => els.accountTimezoneInput,
    button: () => els.saveAccountTimezoneButton,
    status: () => els.accountTimezoneStatus,
    check: () => els.accountTimezoneSaved,
    label: "timezone",
  },
  goalSummary: {
    input: () => els.accountGoalSummaryInput,
    button: () => els.saveAccountGoalSummaryButton,
    status: () => els.accountGoalSummaryStatus,
    check: () => els.accountGoalSummarySaved,
    label: "goal summary",
  },
};

function decodeAuthPayload(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    return null;
  }

  try {
    const binary = atob(raw);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function normalizeNullableBoolean(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return normalizeBoolean(value);
}

function validEmail(value) {
  return /^\S+@\S+\.\S+$/.test(String(value || "").trim());
}

function validUsername(value) {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,30}[a-zA-Z0-9])?$/.test(String(value || "").trim());
}

function normalizeAffiliatePhone(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return raw.startsWith("+") ? raw : `+${digits}`;
  }

  return "";
}

function formatAffiliatePhoneValue(value) {
  const normalized = normalizeAffiliatePhone(value);
  if (/^\+1\d{10}$/.test(normalized)) {
    return `+1 ${normalized.slice(2, 5)}-${normalized.slice(5, 8)}-${normalized.slice(8)}`;
  }
  return normalized || String(value || "").trim();
}

function pruneEmptyRecord(record) {
  const clean = {};
  Object.entries(record || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    clean[key] = value;
  });
  return clean;
}

function splitAffiliateNameParts(value) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function normalizeAuthUser(rawUser) {
  if (!rawUser || typeof rawUser !== "object") {
    return null;
  }

  return {
    accountId: String(rawUser.accountId || rawUser.id || "").trim(),
    maskedCredential: String(rawUser.maskedCredential || rawUser.credential || "").trim(),
    credential: String(rawUser.credential || rawUser.identifier || "").trim(),
    method: String(rawUser.method || "").trim(),
    canonical: String(rawUser.canonical || "").trim(),
    username: String(rawUser.username || "").trim(),
    email: String(rawUser.email || "").trim(),
    emailVerified: normalizeNullableBoolean(
      rawUser.emailVerified ??
        rawUser.primaryEmailVerified ??
        rawUser.email_verified ??
        rawUser.verifiedEmail ??
        rawUser.isEmailVerified,
    ),
    firstName: String(rawUser.firstName || rawUser.givenName || "").trim(),
    lastName: String(rawUser.lastName || rawUser.familyName || "").trim(),
    name: String(rawUser.name || rawUser.fullName || "").trim(),
    age: String(rawUser.age || "").trim(),
    billingStatus: String(rawUser.billingStatus || rawUser.subscriptionStatus || "").trim(),
    billingPlan: String(rawUser.billingPlan || rawUser.plan || rawUser.priceNickname || "").trim(),
    billingLastPaymentDate: String(rawUser.billingLastPaymentDate || rawUser.lastPaymentDate || "").trim(),
    billingNextBillingDate: String(rawUser.billingNextBillingDate || rawUser.nextBillingDate || "").trim(),
    emailVerifiedAt: String(rawUser.emailVerifiedAt || rawUser.email_verified_at || "").trim() || null,
    sheetUrl: String(rawUser.sheetUrl || rawUser.googleSheetUrl || "").trim(),
    affiliateCode: String(rawUser.affiliateCode || "").trim(),
    hasPersonalTrainer: normalizeBoolean(
      rawUser.hasPersonalTrainer || rawUser.personalTrainerAttached || rawUser.trainerAttached,
    ),
    personalTrainerName: String(rawUser.personalTrainerName || rawUser.trainerName || "").trim(),
    loginAt: String(rawUser.loginAt || "").trim(),
    phone: String(rawUser.phone || rawUser.primaryPhone || "").trim(),
    countryCode: String(rawUser.countryCode || rawUser.country || "").trim(),
    currentWeight: String(rawUser.currentWeight || rawUser.weight || "").trim(),
    currentHeight: String(rawUser.currentHeight || rawUser.height || "").trim(),
    goalWeight: String(rawUser.goalWeight || "").trim(),
    goalBodyFat: String(rawUser.goalBodyFat || "").trim(),
    fitnessGoal: String(rawUser.fitnessGoal || "").trim(),
    workoutSplit: String(rawUser.workoutSplit || "").trim(),
    timezone: String(rawUser.timezone || "").trim(),
    goalSummary: String(rawUser.goalSummary || "").trim(),
    trackBodyMeasures: normalizeBoolean(rawUser.trackBodyMeasures),
    trackCreatine: normalizeBoolean(rawUser.trackCreatine),
    leaderboardOptIn: normalizeNullableBoolean(rawUser.leaderboardOptIn),
    weeklyDigestOptOut: normalizeBoolean(rawUser.weeklyDigestOptOut),
    publicProfileVisibility: rawUser.publicProfileVisibility && typeof rawUser.publicProfileVisibility === "object" ? rawUser.publicProfileVisibility : null,
  };
}

function persistAuthFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const payloadUser = normalizeAuthUser(decodeAuthPayload(params.get("auth_payload")));
  const sessionToken = String(params.get("session_token") || "").trim();
  const sessionExpiresAt = String(params.get("session_expires_at") || "").trim();

  if (!payloadUser && !sessionToken) {
    return;
  }

  try {
    if (payloadUser) {
      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payloadUser));
      window.localStorage.setItem(AUTH_FLAG_KEY, "true");
    }

    if (sessionToken) {
      window.localStorage.setItem(
        AUTH_SESSION_KEY,
        JSON.stringify({
          token: sessionToken,
          expiresAt: sessionExpiresAt || null,
        }),
      );
    }
  } catch {
    // Ignore storage failures.
  }

  params.delete("auth_payload");
  params.delete("session_token");
  params.delete("session_expires_at");
  const cleanQuery = params.toString();
  const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash || ""}`;
  window.history.replaceState({}, "", cleanUrl);
}

function readAuthUser() {
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (!raw) {
      return null;
    }

    return normalizeAuthUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

function getAuthToken() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return String(parsed?.value || parsed?.token || parsed?.accessToken || "").trim();
  } catch {
    return "";
  }
}

function readSessionToken() {
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      return "";
    }

    const parsed = JSON.parse(raw);
    return String(parsed?.token || "").trim();
  } catch {
    return "";
  }
}

function buildAuthedProxyUrl(endpoint) {
  const raw = String(endpoint || "").trim();
  if (!raw) {
    return raw;
  }

  try {
    const parsed = new URL(raw, window.location.origin);
    const apiOrigin = new URL(API_BASE).origin;
    const isBackendApi = parsed.origin === apiOrigin && parsed.pathname.startsWith("/api/");

    if (isBackendApi) {
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return raw;
  }
}

function normalizeRequestError(error, fallback = "Request failed.") {
  const raw = String(error?.message || fallback).trim();
  if (!raw) {
    return new Error(fallback);
  }

  if (/failed to fetch|networkerror|network request failed|load failed/i.test(raw)) {
    return new Error("Dashboard could not reach the backend.");
  }

  return error instanceof Error ? error : new Error(raw);
}

async function fetchAuthedApi(endpoint, init = {}) {
  const token = readSessionToken();
  const headers = new Headers(init.headers || {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(buildAuthedProxyUrl(endpoint), {
    cache: "no-store",
    ...init,
    headers,
  });
}

function readBillingContactFromAuth() {
  const user = readAuthUser();
  const candidates = [user?.canonical, user?.email, user?.username, user?.credential, user?.maskedCredential];
  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim();
    if (!normalized) {
      continue;
    }
    if (/[*]/.test(normalized)) {
      continue;
    }
    return normalized;
  }
  return "";
}

function resolveBillingContact() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = String(params.get("contact") || "").trim();
  return fromQuery || readBillingContactFromAuth();
}

function firstFiniteNumber(record, keys) {
  if (!record || typeof record !== "object") {
    return null;
  }

  for (const key of keys) {
    const value = Number(record?.[key]);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function readRecordDate(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const candidates = [
    record.date,
    record.loggedAt,
    record.recordedAt,
    record.createdAt,
    record.timestamp,
    record.time,
  ];

  for (const candidate of candidates) {
    const raw = String(candidate || "").trim();
    if (!raw) {
      continue;
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfLocalWeek(date) {
  const day = (date.getDay() + 6) % 7;
  const clone = startOfLocalDay(date);
  clone.setDate(clone.getDate() - day);
  return clone;
}

function startOfLocalMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfLocalYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

function isDateInRange(date, rangeId) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  if (rangeId === "all") {
    return true;
  }

  if (rangeId === "today") {
    return date >= startOfLocalDay(now);
  }

  if (rangeId === "week") {
    return date >= startOfLocalWeek(now);
  }

  if (rangeId === "month") {
    return date >= startOfLocalMonth(now);
  }

  if (rangeId === "year") {
    return date >= startOfLocalYear(now);
  }

  return false;
}

function metricRecordFromSnapshot(value, sheetUrl = "") {
  return {
    value: Number.isFinite(Number(value)) ? Number(value) : 0,
    sheetUrl: sheetUrl || state.currentSheetUrl || "",
  };
}

function normalizeSheetUrlFromProfile(profile) {
  const direct = String(
    profile?.googleSheetUrl || profile?.sheetUrl || profile?.dashboardSheetUrl || "",
  ).trim();
  if (direct) {
    return direct;
  }

  const sheetId = String(profile?.googleSheetId || "").trim();
  return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : "";
}

function computeHistoryMetricsByRange(history, sheetUrl = "") {
  const workouts = Array.isArray(history?.workouts) ? history.workouts : [];
  const nutrition = Array.isArray(history?.nutrition) ? history.nutrition : [];
  const water = Array.isArray(history?.water) ? history.water : [];

  const byRange = new Map();

  RANGE_IDS.forEach((rangeId) => {
    let workoutsLogged = 0;
    let caloriesTracked = 0;
    let gallonsDrank = 0;

    workouts.forEach((entry) => {
      const date = readRecordDate(entry);
      if (date && isDateInRange(date, rangeId)) {
        workoutsLogged += 1;
      }
    });

    nutrition.forEach((entry) => {
      const date = readRecordDate(entry);
      if (!date || !isDateInRange(date, rangeId)) {
        return;
      }
      const calories = firstFiniteNumber(entry, ["calories", "kcal", "totalCalories", "caloriesTracked", "value"]);
      caloriesTracked += calories || 0;
    });

    water.forEach((entry) => {
      const date = readRecordDate(entry);
      if (!date || !isDateInRange(date, rangeId)) {
        return;
      }

      const gallons =
        firstFiniteNumber(entry, ["gallons", "gallonsDrank", "waterGallons"]) ??
        (() => {
          const ounces = firstFiniteNumber(entry, ["ounces", "oz", "waterOz"]);
          if (ounces !== null) {
            return ounces / 128;
          }
          const ml = firstFiniteNumber(entry, ["ml", "milliliters"]);
          if (ml !== null) {
            return ml / 3785.41;
          }
          return 0;
        })();
      gallonsDrank += gallons || 0;
    });

    byRange.set(rangeId, {
      requestedWindow: rangeId,
      generatedAt: new Date().toISOString(),
      masterLogSheetUrl: sheetUrl || "",
      usersUsingToday: metricRecordFromSnapshot(0, sheetUrl),
      totalUsersThisWeek: metricRecordFromSnapshot(0, sheetUrl),
      usersOnline: metricRecordFromSnapshot(0, sheetUrl),
      workoutsLogged: metricRecordFromSnapshot(workoutsLogged, sheetUrl),
      caloriesTracked: metricRecordFromSnapshot(caloriesTracked, sheetUrl),
      gallonsDrank: metricRecordFromSnapshot(gallonsDrank, sheetUrl),
    });
  });

  return byRange;
}

function normalizeBackendSnapshot(body) {
  const root = body?.portal || body?.data?.portal || body?.data || body;
  if (!root || typeof root !== "object") {
    return null;
  }

  const profile = root.profile && typeof root.profile === "object" ? root.profile : {};
  const membership = root.membership && typeof root.membership === "object" ? root.membership : {};
  const history = root.history && typeof root.history === "object" ? root.history : {};
  const sheetUrl = String(root.googleSheet || root.googleSheetUrl || "").trim() || normalizeSheetUrlFromProfile(profile);

  return {
    contact: String(root.contact || profile.contact || "").trim(),
    profile,
    membership,
    history,
    integrations: Array.isArray(root.integrations)
      ? root.integrations
      : Array.isArray(root?.data?.integrations)
        ? root.data.integrations
        : [],
    goals: (root.goals && typeof root.goals === "object" ? root.goals : {}) || {},
    sheetUrl,
    billingStatus: String(
      membership.status
      || root.billing?.status
      || root.subscription?.status
      || profile.stripeSubscriptionStatus
      || profile.subscriptionStatus
      || root.billingStatus
      || root.subscriptionStatus
      || root.status
      || "",
    ).trim(),
    billingPlan: String(
      membership.plan
      || membership.selectedPlan
      || root.billing?.plan
      || profile.stripePlanKey
      || profile.currentPlan
      || profile.planKey
      || root.plan
      || root.planName
      || "",
    ).trim(),
    billingLastPaymentDate: deriveLastPaymentDate(root),
    billingNextBillingDate: deriveNextBillingDate(root) || deriveCurrentPeriodEnd(root),
    billingPortalUrl: deriveBillingPortalUrl(root),
    publicProfileVisibility: root.publicProfileVisibility || root.publicVisibility || null,
  };
}

function persistAuthFromSnapshot(snapshot) {
  if (!snapshot) {
    return;
  }

  try {
    const current = readAuthUser() || {};
    const normalized = normalizeAuthUser({
      ...current,
      canonical: current.canonical || snapshot.contact || snapshot.profile?.contact || "",
      username: current.username || snapshot.profile?.username || "",
      email: current.email || snapshot.profile?.primaryEmail || snapshot.profile?.email || "",
      emailVerified:
        normalizeNullableBoolean(
          snapshot.profile?.emailVerified ??
            snapshot.profile?.primaryEmailVerified ??
            snapshot.profile?.email_verified ??
            snapshot.profile?.verifiedEmail ??
            snapshot.profile?.isEmailVerified ??
            snapshot.emailVerified ??
            snapshot.primaryEmailVerified,
        ) ?? current.emailVerified,
      emailVerifiedAt: current.emailVerifiedAt || snapshot.profile?.emailVerifiedAt || snapshot.profile?.email_verified_at || "",
      age: current.age || snapshot.profile?.age || "",
      billingStatus: snapshot.billingStatus || current.billingStatus || "",
      billingPlan: snapshot.billingPlan || current.billingPlan || "",
      billingLastPaymentDate: snapshot.billingLastPaymentDate || current.billingLastPaymentDate || "",
      billingNextBillingDate: snapshot.billingNextBillingDate || current.billingNextBillingDate || "",
      sheetUrl: snapshot.sheetUrl || current.sheetUrl || "",
      accountId: current.accountId || snapshot.profile?.accountId || snapshot.contact || "",
      canonical: current.canonical || snapshot.contact || snapshot.profile?.contact || "",
      method: current.method || snapshot.profile?.method || snapshot.profile?.signupMethod || snapshot.profile?.signInMethod || "",
      loginAt: current.loginAt || snapshot.loginAt || snapshot.profile?.lastLoginAt || "",
      maskedCredential: current.maskedCredential || snapshot.profile?.maskedCredential || snapshot.profile?.primaryEmail || "",
    });

    if (!normalized) {
      return;
    }
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalized));
    window.localStorage.setItem(AUTH_FLAG_KEY, "true");
  } catch {
    // Ignore storage failures.
  }
}

function applySnapshotToState(snapshot) {
  if (!snapshot) {
    return;
  }

  state.backendSnapshot = snapshot;
  if (snapshot.billingPortalUrl) {
    state.billingPortalUrl = snapshot.billingPortalUrl;
  }
  persistAuthFromSnapshot(snapshot);

  if (snapshot.sheetUrl) {
    state.userSheetUrl = snapshot.sheetUrl;
  }

  if (Array.isArray(snapshot.integrations) && snapshot.integrations.length) {
    state.availableIntegrations = snapshot.integrations;
  }

  const fromHistory = computeHistoryMetricsByRange(snapshot.history, snapshot.sheetUrl);
  fromHistory.forEach((metrics, rangeId) => {
    if (!state.metricsByRange.has(rangeId) || metricValue(state.metricsByRange.get(rangeId)?.workoutsLogged) <= 0) {
      state.metricsByRange.set(rangeId, metrics);
    }
  });

  if (!state.bodyMeasures.length && Array.isArray(snapshot.history?.bodyMetrics)) {
    state.bodyMeasures = normalizeBodyEntries(snapshot.history.bodyMetrics);
  }

  const bodyGoals = snapshot.goals?.body && typeof snapshot.goals.body === "object" ? snapshot.goals.body : {};
  if (!state.goals.weightGoal) {
    state.goals.weightGoal = String(
      bodyGoals.targetWeight || bodyGoals.weightGoal || snapshot.profile?.currentWeight || "",
    ).trim();
  }
  if (!state.goals.bodyFatGoal) {
    state.goals.bodyFatGoal = String(bodyGoals.bodyFatGoal || bodyGoals.targetBodyFat || "").trim();
  }
  if (!state.goals.workoutPlan) {
    state.goals.workoutPlan = String(snapshot.profile?.workoutSplit || snapshot.profile?.goalSummary || "").trim();
  }

  const activeMetrics = state.metricsByRange.get(state.activeRange) || state.metricsByRange.get("today");
  if (activeMetrics) {
    renderStatsMetrics(activeMetrics, state.activeRange || "today");
    renderAllCharts();
  }
  renderHistoryHeatmaps();
}

async function loadBackendUserSnapshot() {
  const contact = resolveBillingContact();
  if (!contact) {
    return null;
  }
  const contactQuery = contact ? `?contact=${encodeURIComponent(contact)}` : "";
  const endpoints = [
    `${API_BASE}/api/portal${contactQuery}`,
    `${API_BASE}/api/portal`,
    `${API_BASE}/api/account/portal${contactQuery}`,
    `${API_BASE}/api/user/profile${contactQuery}`,
    "/api/portal",
  ];

  try {
    const body = await getAuthedJson(endpoints);
    const snapshot = normalizeBackendSnapshot(body);
    if (!snapshot) {
      return null;
    }

    applySnapshotToState(snapshot);
    renderAccountInfo();
    renderSheetLink();
    renderGoals();
    renderBodyMeasures();
    renderWorkoutAnalytics();
    return snapshot;
  } catch {
    return null;
  }
}

function isAuthenticated() {
  const user = readAuthUser();

  try {
    return window.localStorage.getItem(AUTH_FLAG_KEY) === "true" && Boolean(user?.accountId || user?.username || user?.email);
  } catch {
    return false;
  }
}

function enforceDashboardAccess() {
  persistAuthFromQuery();

  if (isAuthenticated()) {
    return;
  }

  const nextTarget = window.location.href || DASHBOARD_HOME_URL;
  const loginUrl = `${LOGIN_PAGE_URL}?next=${encodeURIComponent(nextTarget)}`;
  window.location.replace(loginUrl);
}

function formatMethodLabel(method) {
  if (method === "phone") {
    return "Phone OTP";
  }
  if (method === "email") {
    return "Email OTP";
  }
  if (method === "username") {
    return "Username OTP";
  }
  return "Unknown";
}

function renderAiIdentity() {
  // AI tab removed.
}

function formatTimestamp(value) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleString();
}

function formatNumber(value, decimals = 0) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
}

function metricValue(metric) {
  if (metric && typeof metric === "object" && "value" in metric) {
    return Number(metric.value || 0);
  }

  return Number(metric || 0);
}

function normalizeTabId(rawTab) {
  const tab = String(rawTab || "")
    .trim()
    .toLowerCase();

  return TAB_IDS.includes(tab) ? tab : "";
}

function tabButtonFor(tabId) {
  return els.navButtons.find((button) => button.dataset.tab === tabId) || null;
}

function isTabAvailable(tabId) {
  const button = tabButtonFor(tabId);
  return Boolean(button) && !button.hidden;
}

function updateViewParam(tabId) {
  const params = new URLSearchParams(window.location.search);
  params.set("view", tabId);
  const cleanQuery = params.toString();
  const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`;
  window.history.replaceState({}, "", cleanUrl);
}

function setActiveTab(tabId, updateUrl = true) {
  let targetTab = normalizeTabId(tabId) || "stats";
  if (!isTabAvailable(targetTab)) {
    targetTab = "stats";
  }

  state.activeTab = targetTab;

  els.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === targetTab);
  });

  els.panels.forEach((panel) => {
    const active = panel.dataset.tabPanel === targetTab;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });

  if (updateUrl) {
    updateViewParam(targetTab);
  }

  // Re-init the Stats charts whenever the user lands on the Stats tab. This
  // refetches /api/chart/data so any new logs (or backend cleanup) show up
  // immediately without a full page reload.
  if (targetTab === "stats") {
    initBodyMeasurementCharts();
  }

  // Lazy-init (and refresh on every reopen) the Calendar / PT / Groups /
  // Run Clubs tabs so each visit pulls fresh data.
  if (targetTab === "calendar") {
    const body = document.getElementById("calendarPanelBody");
    if (body) {
      initCalendarTab(body).catch((e) => console.warn("calendar tab failed:", e));
    }
  } else if (targetTab === "shortcuts") {
    const body = document.getElementById("shortcutsPanelBody");
    if (body) {
      initShortcutsTab(body).catch((e) => console.warn("shortcuts tab failed:", e));
    }
  } else if (targetTab === "personal-trainer") {
    const body = document.getElementById("personalTrainerPanelBody");
    if (body) {
      initPersonalTrainerTab(body).catch((e) => console.warn("personal-trainer tab failed:", e));
    }
  } else if (targetTab === "groups") {
    const body = document.getElementById("groupsPanelBody");
    if (body) {
      initGroupsTab(body).catch((e) => console.warn("groups tab failed:", e));
    }
  } else if (targetTab === "setup") {
    renderSetupChecklist();
  } else if (targetTab === "run-clubs") {
    const body = document.getElementById("runClubsPanelBody");
    if (body) {
      initRunClubsTab(body).catch((e) => console.warn("run-clubs tab failed:", e));
    }
  }
}

function wireTabEvents() {
  els.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.hidden) {
        return;
      }

      setActiveTab(button.dataset.tab);
    });
  });
}

function createAffiliateLink(user) {
  const seed = String(user?.affiliateCode || user?.username || user?.accountId || "").trim();
  return seed ? `https://thetrackerapp.io/signup?ref=${encodeURIComponent(seed)}` : "";
}

/**
 * Visibility of the Personal Trainer tab is now driven by the
 * `dashboardTabs.personalTrainer` feature flag (data-feature attribute) and
 * the tab's content is rendered by initPersonalTrainerTab(). The old
 * `hasPersonalTrainer` short-circuit is no longer needed — even users without
 * a coach should still see the tab so they can apply or redeem a code.
 *
 * This function is kept for binary compatibility with the existing call sites
 * but is intentionally a no-op.
 */
function renderPersonalTrainer(_user) {
  // intentional no-op (see comment above)
}

function syncEditableAccountInputs(user) {
  // Always use the backend (SQLite) as the canonical source for profile fields.
  // The portal snapshot is the ground truth; localStorage may be stale.
  const profile = (state.backendSnapshot?.profile && typeof state.backendSnapshot.profile === "object")
    ? state.backendSnapshot.profile : {};

  if (els.accountEmailInput) els.accountEmailInput.value = profile.email || user?.email || "";
  if (els.accountUsernameInput) els.accountUsernameInput.value = profile.username || user?.username || "";
  if (els.accountAgeInput) els.accountAgeInput.value = profile.age ?? user?.age ?? "";
  if (els.accountWeightInput) els.accountWeightInput.value = user?.currentWeight || "";
  if (els.accountHeightInput) els.accountHeightInput.value = user?.currentHeight || "";
  if (els.accountGoalWeightInput) els.accountGoalWeightInput.value = user?.goalWeight || "";
  if (els.accountGoalBodyFatInput) els.accountGoalBodyFatInput.value = user?.goalBodyFat || "";
  if (els.accountFitnessGoalInput) els.accountFitnessGoalInput.value = user?.fitnessGoal || "";
  if (els.accountWorkoutSplitInput) els.accountWorkoutSplitInput.value = user?.workoutSplit || "";
  if (els.accountTimezoneInput) els.accountTimezoneInput.value = user?.timezone || "";
  if (els.accountGoalSummaryInput) els.accountGoalSummaryInput.value = user?.goalSummary || "";
  // Tracking toggles
  if (els.toggleTrackBodyMeasures) els.toggleTrackBodyMeasures.checked = user?.trackBodyMeasures === true;
  if (els.toggleTrackCreatine) els.toggleTrackCreatine.checked = user?.trackCreatine === true;
  if (els.toggleLeaderboardOptIn) els.toggleLeaderboardOptIn.checked = user?.leaderboardOptIn === true;
  if (els.toggleWeeklyDigestOptOut) els.toggleWeeklyDigestOptOut.checked = user?.weeklyDigestOptOut === true;
}

function readAccountEmailVerified(user = readAuthUser()) {
  const direct = normalizeNullableBoolean(user?.emailVerified);
  if (direct !== null) {
    return direct;
  }

  const profile = state.backendSnapshot?.profile || {};
  const snapshotValue = normalizeNullableBoolean(
    profile.emailVerified ??
      profile.primaryEmailVerified ??
      profile.email_verified ??
      profile.verifiedEmail ??
      profile.isEmailVerified ??
      state.backendSnapshot?.emailVerified ??
      state.backendSnapshot?.primaryEmailVerified,
  );

  return snapshotValue === true;
}

function renderEmailVerificationState(user = readAuthUser()) {
  const email = String(user?.email || "").trim();
  const verified = readAccountEmailVerified(user);
  const verifiedAt = readAccountEmailVerifiedAt(user);

  if (els.verifyAccountEmailButton) {
    els.verifyAccountEmailButton.hidden = !email || verified;
    els.verifyAccountEmailButton.disabled = !email || verified;
  }

  if (els.accountEmailStatus && email) {
    const current = String(els.accountEmailStatus.textContent || "").trim();
    if (!current || /email verified|email not verified|verify email/i.test(current)) {
      setStatus(
        els.accountEmailStatus,
        verified ? (verifiedAt ? `Email verified on ${new Date(verifiedAt).toLocaleDateString()}.` : "Email verified.") : "Email not verified. Verify before applying as an affiliate.",
        verified ? "is-success" : "is-error",
      );
    }
  }
}

function readAccountEmailVerifiedAt(user = readAuthUser()) {
  if (user?.emailVerifiedAt) return String(user.emailVerifiedAt).trim() || null;
  const profile = state.backendSnapshot?.profile || {};
  return String(
    profile.emailVerifiedAt ||
    profile.email_verified_at ||
    state.backendSnapshot?.emailVerifiedAt ||
    state.backendSnapshot?.email_verified_at ||
    ""
  ).trim() || null;
}

// ---- Incomplete Profile Banner ----

function renderIncompleteProfileBanner(_user) {
  // Disabled — no fields are marked as required for the banner
  if (els.settingsIncompleteBanner) els.settingsIncompleteBanner.hidden = true;
}

// ---- Tracking Preferences ----

async function saveTrackingPreferences() {
  if (els.saveTrackingPrefsButton) els.saveTrackingPrefsButton.disabled = true;
  if (els.trackingPrefsSaved) els.trackingPrefsSaved.hidden = true;
  if (els.trackingPrefsStatus) { els.trackingPrefsStatus.textContent = "Saving..."; els.trackingPrefsStatus.classList.remove("is-error", "is-success"); }

  const payload = pruneEmptyRecord({
    trackBodyMeasures: els.toggleTrackBodyMeasures?.checked,
    trackCreatine: els.toggleTrackCreatine?.checked,
    leaderboardOptIn: els.toggleLeaderboardOptIn?.checked,
    weeklyDigestOptOut: els.toggleWeeklyDigestOptOut?.checked,
  });

  try {
    const body = await postAuthedJson(
      [`${API_BASE}/api/account/profile`, `${API_BASE}/api/user/profile`],
      payload,
    );
    const updated = normalizeProfileUpdate(body, payload);
    persistAccountUpdate(updated);
    if (els.trackingPrefsSaved) els.trackingPrefsSaved.hidden = false;
    if (els.trackingPrefsStatus) setStatus(els.trackingPrefsStatus, "Preferences saved.", "is-success");
  } catch (error) {
    if (els.trackingPrefsStatus) setStatus(els.trackingPrefsStatus, String(error?.message || "Save failed."), "is-error");
  } finally {
    if (els.saveTrackingPrefsButton) els.saveTrackingPrefsButton.disabled = false;
  }
}

function wireTrackingPreferences() {
  if (els.saveTrackingPrefsButton) {
    els.saveTrackingPrefsButton.addEventListener("click", () => { void saveTrackingPreferences(); });
  }
  const trackingToggles = [els.toggleTrackBodyMeasures, els.toggleTrackCreatine, els.toggleLeaderboardOptIn, els.toggleWeeklyDigestOptOut];
  trackingToggles.forEach(toggle => {
    if (toggle) {
      toggle.addEventListener("change", () => {
        if (els.trackingPrefsSaved) els.trackingPrefsSaved.hidden = true;
        if (els.trackingPrefsStatus) { els.trackingPrefsStatus.textContent = ""; els.trackingPrefsStatus.classList.remove("is-error", "is-success"); }
      });
    }
  });
}

// ---- Setup Checklist ----

const SETUP_CHECKLIST_ITEMS = [
  { id: "age", label: "Pick your age group (for tailored guidance)", category: "Profile", priority: "high", check: () => !!(readAuthUser()?.age), focus: "accountAgeInput", tab: "account" },
  { id: "weight", label: "Add your current weight", category: "Profile", priority: "high", check: () => !!(readAuthUser()?.currentWeight), focus: "accountWeightInput" },
  { id: "height", label: "Add your height", category: "Profile", priority: "medium", check: () => !!(readAuthUser()?.currentHeight), focus: "accountHeightInput" },
  { id: "goalWeight", label: "Set a body goal (lose / maintain / gain)", category: "Profile", priority: "high", check: () => !!(readAuthUser()?.goalWeight), focus: "accountGoalWeightInput" },
  { id: "fitnessGoal", label: "Tell us your fitness goal", category: "Profile", priority: "high", check: () => !!(readAuthUser()?.fitnessGoal), focus: "accountFitnessGoalInput" },
  { id: "bodyMeasures", label: "Track body measurements (chest, waist, arms, thighs, hips, neck)", category: "Profile", priority: "medium", check: () => !!(readAuthUser()?.trackBodyMeasures), focus: "toggleTrackBodyMeasures" },
  { id: "workoutSplit", label: "Tell us your workout split (PPL, upper/lower, etc.)", category: "Goals", priority: "low", check: () => !!(readAuthUser()?.workoutSplit), focus: "accountWorkoutSplitInput" },
  { id: "digestOptOut", label: "Weekly report image (default: Saturdays)", category: "Notifications", priority: "low", check: () => !(readAuthUser()?.weeklyDigestOptOut), focus: "toggleWeeklyDigestOptOut" },
  { id: "leaderboardOptIn", label: "Opt in to the public leaderboard", category: "Community", priority: "low", check: () => !!(readAuthUser()?.leaderboardOptIn), focus: "toggleLeaderboardOptIn" },
  { id: "timezone", label: "Set your timezone", category: "Preferences", priority: "medium", check: () => !!(readAuthUser()?.timezone), focus: "accountTimezoneInput" },
];

function renderSetupChecklist() {
  if (!els.setupChecklist) return;
  const items = SETUP_CHECKLIST_ITEMS;
  let done = 0;
  const total = items.length;
  const categorized = {};
  for (const item of items) {
    const isDone = item.check();
    if (isDone) done++;
    if (!categorized[item.category]) categorized[item.category] = [];
    categorized[item.category].push({ ...item, isDone });
  }
  const pct = total ? Math.round((done / total) * 100) : 0;
  if (els.setupProgressText) els.setupProgressText.textContent = `${done} of ${total} done · ${pct}%`;
  if (els.setupProgressFill) els.setupProgressFill.style.width = `${pct}%`;
  let html = "";
  for (const [category, catItems] of Object.entries(categorized)) {
    html += `<div class="setup-category"><h4 class="setup-category-title">${category}</h4>`;
    for (const item of catItems) {
      const cls = item.isDone ? "is-done" : "";
      const prio = item.priority === "high"
        ? `<span class="setup-priority setup-priority-high">high</span>`
        : item.priority === "medium"
          ? `<span class="setup-priority setup-priority-medium">medium</span>`
          : `<span class="setup-priority setup-priority-low">low</span>`;
      const focusAttr = item.focus ? ` data-focus="${item.focus}"${item.tab ? ` data-tab="${item.tab}"` : ""}` : "";
      html += `<div class="setup-item ${cls}"${focusAttr}><span class="setup-check">${item.isDone ? "✓" : "○"}</span><span class="setup-label">${item.label}</span>${prio}</div>`;
    }
    html += "</div>";
  }
  els.setupChecklist.innerHTML = html;

  // Wire click handlers — scroll to the corresponding field
  els.setupChecklist.querySelectorAll(".setup-item[data-focus]").forEach(el => {
    el.style.cursor = "pointer";
    el.addEventListener("click", () => {
      const targetId = el.dataset.focus;
      const targetTab = el.dataset.tab;
      // Switch to the target tab if the field is in a different tab
      if (targetTab && state.activeTab !== targetTab) {
        setActiveTab(targetTab);
        // Wait for the panel to become visible, then scroll
        setTimeout(() => {
          const target = document.getElementById(targetId);
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            target.focus();
            target.style.transition = "box-shadow 0.15s";
            target.style.boxShadow = "0 0 0 3px rgba(56,255,211,0.4)";
            setTimeout(() => { target.style.boxShadow = ""; }, 1500);
          }
        }, 200);
      } else {
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.focus();
          target.style.transition = "box-shadow 0.15s";
          target.style.boxShadow = "0 0 0 3px rgba(56,255,211,0.4)";
          setTimeout(() => { target.style.boxShadow = ""; }, 1500);
        }
      }
    });
  });
}

// ---- Workout Analytics (per-exercise breakdown, styled after info/workout.html) ----

let waShowAll = false;
const WA_DEFAULT_VISIBLE = 12;

function waParseDate(value) {
  const d = new Date(String(value || ""));
  return Number.isNaN(d.getTime()) ? null : d;
}

function waFormatDate(value) {
  const d = waParseDate(value);
  if (!d) return "-";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function waDaysAgo(value) {
  const d = waParseDate(value);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function buildWorkoutAnalytics(workouts) {
  const byExercise = new Map();
  const daySet = new Set();
  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);
  const d7 = now - 7 * 86400000, d30 = now - 30 * 86400000, d90 = now - 90 * 86400000, d365 = now - 365 * 86400000;
  const activeDays30 = new Set();
  const weekDays = new Set(), monthDays = new Set();
  const yearDays = new Set();

  for (const entry of workouts) {
    const name = String(entry.exercise_name || entry.exercise || "").trim().toUpperCase();
    if (!name) continue;
    const date = String(entry.date || entry.loggedAt || "").slice(0, 10);
    if (date) daySet.add(date);
    const ts = waParseDate(date)?.getTime() || 0;
    if (ts >= d30 && date) activeDays30.add(date);
    if (ts >= d7 && date) weekDays.add(date);
    if (ts >= d30 && date) monthDays.add(date);
    if (ts >= d365 && date) yearDays.add(date);

    if (!byExercise.has(name)) {
      byExercise.set(name, {
        name, sessions: 0, totalReps: 0, maxReps: 0, maxWeight: 0, dates: [],
        weightUnit: "", lastDate: "", firstDate: "", hasWeight: false,
        totalWeight: 0, weightCount: 0,
      });
    }
    const ex = byExercise.get(name);
    ex.sessions += 1;
    ex.dates.push(date);
    const reps = Number(entry.reps) || Number(entry.count) || 0;
    const sets = Number(entry.sets) || 1;
    ex.totalReps += reps * Math.max(sets, 1);
    if (reps > ex.maxReps) ex.maxReps = reps;
    const weight = Number(entry.weight) || 0;
    if (weight > 0) {
      ex.hasWeight = true;
      ex.totalWeight += weight;
      ex.weightCount += 1;
      if (weight > ex.maxWeight) {
        ex.maxWeight = weight;
        ex.weightUnit = String(entry.weight_unit || "lb").trim() || "lb";
      }
    }
    if (!ex.lastDate || date > ex.lastDate) ex.lastDate = date;
    if (!ex.firstDate || (date && date < ex.firstDate)) ex.firstDate = date;
  }

  // Compute streka, per-exercise windows
  for (const [, ex] of byExercise) {
    ex.dates.sort();
    const dateSet = new Set(ex.dates);
    let streak = 0, bestStreak = 0;
    const check = new Date(todayStr);
    for (let i = 0; i < 365; i++) {
      const s = check.toISOString().slice(0, 10);
      if (dateSet.has(s)) { streak++; if (streak > bestStreak) bestStreak = streak; }
      else break;
      check.setDate(check.getDate() - 1);
    }
    ex.currentStreak = streak;
    ex.bestStreak = bestStreak;

    const nowMs = Date.now();
    ex.count7 = ex.dates.filter(d => waParseDate(d)?.getTime() >= nowMs - 7 * 86400000).length;
    ex.count30 = ex.dates.filter(d => waParseDate(d)?.getTime() >= nowMs - 30 * 86400000).length;
    ex.count90 = ex.dates.filter(d => waParseDate(d)?.getTime() >= nowMs - 90 * 86400000).length;
    ex.count365 = ex.dates.filter(d => waParseDate(d)?.getTime() >= nowMs - 365 * 86400000).length;
    ex.countToday = ex.dates.filter(d => d === todayStr).length;
    ex.countWeek = ex.dates.filter(d => waParseDate(d)?.getTime() >= nowMs - 7 * 86400000).length;
    ex.countMonth = ex.dates.filter(d => waParseDate(d)?.getTime() >= nowMs - 30 * 86400000).length;
    ex.countYear = ex.dates.filter(d => waParseDate(d)?.getTime() >= nowMs - 365 * 86400000).length;
    ex.avgReps = ex.sessions > 0 ? Math.round(ex.totalReps / ex.sessions) : 0;
    ex.avgWeight = ex.weightCount > 0 ? Math.round(ex.totalWeight / ex.weightCount) : 0;
  }

  const exercises = [...byExercise.values()].sort((a, b) => (b.lastDate || "").localeCompare(a.lastDate || ""));
  return {
    exercises,
    totalExercises: exercises.length,
    totalDays: daySet.size,
    totalLogs: workouts.length,
    active30: activeDays30.size,
    active90: exercises.filter(e => e.count90 > 0).length,
    active365: yearDays.size,
    days90: exercises.filter(e => e.count90 > 0).length > 0 ? Math.round(exercises.filter(e => e.count90 > 0).length / exercises.length * 100) : 0,
    days365: yearDays.size > 0 ? Math.round(yearDays.size / daySet.size * 100) : 0,
    activeDays30: activeDays30.size,
    activeDays90: new Set([...exercises.flatMap(e => e.dates)].filter(d => waParseDate(d)?.getTime() >= d90)).size,
    activeDays365: yearDays.size,
    dateRange: exercises.length
      ? `${waFormatDate([...daySet].sort()[0])} → ${waFormatDate([...daySet].sort().at(-1))}`
      : "-",
  };
}

function waLastLabel(date) {
  const daysAgo = waDaysAgo(date);
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo != null) return `${daysAgo}d ago`;
  return "-";
}

function waTrendBadge(ex) {
  if (ex.count30 === 0 && ex.count7 === 0) return `<span class="wa-trend wa-trend-flat">→ idle</span>`;
  if (ex.count7 > 0 && ex.count30 > ex.count7) return `<span class="wa-trend wa-trend-up">↑ active</span>`;
  return `<span class="wa-trend wa-trend-flat">→ flat</span>`;
}

function renderWorkoutAnalytics() {
  const section = document.getElementById("workoutAnalytics");
  const grid = document.getElementById("waGrid");
  if (!section || !grid) return;

  const workouts = Array.isArray(state.backendSnapshot?.history?.workouts)
    ? state.backendSnapshot.history.workouts
    : [];
  if (!workouts.length) {
    section.hidden = true;
    return;
  }

  const analytics = buildWorkoutAnalytics(workouts);
  section.hidden = false;

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };
  set("waTotalExercises", analytics.totalExercises);
  set("waTotalDays", analytics.totalDays);
  set("waTotalLogs", analytics.totalLogs.toLocaleString());
  set("waActive30", `${analytics.active30}/30 (${analytics.days90}%)`);
  // Heatmap consistency
  set("waActiveDays30", analytics.activeDays30);
  set("waActive90", `${analytics.activeDays90}d`);
  set("waActive365", `${analytics.activeDays365}d (${analytics.days365}%)`);
  const subtitle = document.getElementById("waSubtitle");
  if (subtitle) subtitle.textContent = analytics.dateRange;

  const visible = waShowAll ? analytics.exercises : analytics.exercises.slice(0, WA_DEFAULT_VISIBLE);
  grid.innerHTML = visible.map((ex) => {
    const type = ex.hasWeight ? "srw" : "reps";
    const daysAgo = waDaysAgo(ex.lastDate);
    const lastLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : daysAgo != null ? `${daysAgo}d ago` : "-";
    const best = ex.hasWeight
      ? `${ex.maxWeight}<span class="wa-unit">${escapeWaHtml(ex.weightUnit)}</span>`
      : `${ex.maxReps}<span class="wa-unit">reps</span>`;
    const id = `wa-${ex.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const detailId = `wa-detail-${ex.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const pct7 = Math.min(100, Math.round(ex.count7 / 7 * 100));
    const pct30 = Math.min(100, Math.round(ex.count30 / 30 * 100));
    return `<article class="wa-card" data-type="${type}" id="${id}">
      <div class="wa-card-head wa-card-click" data-target="${detailId}">
        <h4>${escapeWaHtml(ex.name)}</h4>
        <span class="wa-expand-icon">▼</span>
        ${waTrendBadge(ex)}
      </div>
      <div class="wa-metric-row"><span class="wa-metric-label">Best</span><span class="wa-metric-value wa-highlight">${best}</span></div>
      <div class="wa-metric-row"><span class="wa-metric-label">Sessions</span><span class="wa-metric-value">${ex.sessions.toLocaleString()}</span></div>
      <div class="wa-metric-row"><span class="wa-metric-label">Avg reps</span><span class="wa-metric-value">${ex.avgReps.toLocaleString()}</span></div>
      <div class="wa-metric-row"><span class="wa-metric-label">Last done</span><span class="wa-metric-value">${waLastLabel(ex.lastDate)}</span></div>
      <div id="${detailId}" class="wa-detail" hidden>
        <div class="wa-detail-divider"></div>
        <div class="wa-metric-row"><span class="wa-metric-label">Streak</span><span class="wa-metric-value wa-highlight">${ex.currentStreak} days</span><span class="wa-metric-label">(best: ${ex.bestStreak})</span></div>
        <div class="wa-metric-row"><span class="wa-metric-label">This Week</span><span class="wa-metric-value">${ex.countWeek}/${Math.min(7, Math.ceil((Date.now() - (new Date() - new Date().getDay()*86400000))/86400000))}</span><span class="wa-metric-label">${pct7}%</span></div>
        <div class="wa-metric-row"><span class="wa-metric-label">This Month</span><span class="wa-metric-value">${ex.countMonth}/30</span><span class="wa-metric-label">${pct30}%</span></div>
        <div class="wa-metric-row"><span class="wa-metric-label">This Year</span><span class="wa-metric-value">${ex.countYear}</span></div>
        <div class="wa-metric-row"><span class="wa-metric-label">All-Time</span><span class="wa-metric-value wa-highlight">${ex.sessions} sessions</span></div>
        <div class="wa-detail-divider"></div>
        <div class="wa-metric-row"><span class="wa-metric-label">First Logged</span><span class="wa-metric-value">${waFormatDate(ex.firstDate)}</span></div>
        <div class="wa-metric-row"><span class="wa-metric-label">Last Logged</span><span class="wa-metric-value">${waFormatDate(ex.lastDate)}</span></div>
        <div class="wa-detail-divider"></div>
        <div class="wa-metric-row"><span class="wa-metric-label">Activity Frequency</span></div>
        <div class="wa-metric-row"><span class="wa-metric-label">7D</span><span class="wa-metric-value">${ex.count7}/${Math.min(7, Math.ceil((Date.now() - (new Date() - new Date().getDay()*86400000))/86400000))} days (${pct7}%)</span></div>
        <div class="wa-metric-row"><span class="wa-metric-label">30D</span><span class="wa-metric-value">${ex.count30}/30 days (${pct30}%)</span></div>
        <div class="wa-metric-row"><span class="wa-metric-label">90D</span><span class="wa-metric-value">${ex.count90}/90 days (${Math.min(100,Math.round(ex.count90/90*100))}%)</span></div>
        <div class="wa-metric-row"><span class="wa-metric-label">365D</span><span class="wa-metric-value">${ex.count365}/365 days (${Math.min(100,Math.round(ex.count365/365*100))}%)</span></div>
        ${ex.hasWeight ? `<div class="wa-detail-divider"></div><div class="wa-metric-row"><span class="wa-metric-label">Peak Weight</span><span class="wa-metric-value wa-highlight">${ex.maxWeight} ${escapeWaHtml(ex.weightUnit)}</span></div><div class="wa-metric-row"><span class="wa-metric-label">Avg Weight</span><span class="wa-metric-value">${ex.avgWeight} ${escapeWaHtml(ex.weightUnit)}</span></div>` : ""}
        <div class="wa-metric-row"><span class="wa-metric-label">Peak Reps</span><span class="wa-metric-value wa-highlight">${ex.maxReps}</span></div>
        <div class="wa-metric-row"><span class="wa-metric-label">Avg Reps</span><span class="wa-metric-value">${ex.avgReps}</span></div>
        <button class="wa-hide-detail-btn" data-target="${detailId}">▲ Hide Details</button>
      </div>
    </article>`;
  }).join("");

  // Wire click-to-expand handlers
  grid.querySelectorAll(".wa-card-click").forEach(head => {
    head.addEventListener("click", () => {
      const detail = document.getElementById(head.dataset.target);
      const icon = head.querySelector(".wa-expand-icon");
      if (detail) {
        const showing = !detail.hidden;
        detail.hidden = showing;
        if (icon) icon.textContent = showing ? "▼" : "▲";
      }
    });
  });
  grid.querySelectorAll(".wa-hide-detail-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const detail = document.getElementById(btn.dataset.target);
      if (detail) detail.hidden = true;
      const card = btn.closest(".wa-card");
      if (card) {
        const icon = card.querySelector(".wa-expand-icon");
        if (icon) icon.textContent = "▼";
      }
    });
  });

  const showAllBtn = document.getElementById("waShowAllButton");
  if (showAllBtn) {
    const total = analytics.exercises.length;
    if (total <= WA_DEFAULT_VISIBLE) { showAllBtn.hidden = true; return; }
    showAllBtn.textContent = waShowAll ? `Show less (${WA_DEFAULT_VISIBLE} of ${total})` : `Show all ${total} exercises`;
    if (!showAllBtn.dataset.wired) {
      showAllBtn.dataset.wired = "1";
      showAllBtn.addEventListener("click", () => {
        waShowAll = !waShowAll;
        renderWorkoutAnalytics();
      });
    }
  }
}

function escapeWaHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderAccountInfo() {
  const user = readAuthUser();

  syncEditableAccountInputs(user);
  hydratePublicProfileVisibility();

  if (els.accountEmailValue) {
    els.accountEmailValue.textContent = user?.email || "-";
  }

  if (els.accountUsernameValue) {
    const backendUsername = (state.backendSnapshot?.profile && typeof state.backendSnapshot.profile === "object")
      ? (state.backendSnapshot.profile.username || "") : "";
    els.accountUsernameValue.textContent = backendUsername || user?.username || "-";
  }

  if (els.accountAgeValue) {
    els.accountAgeValue.textContent = user?.age || "-";
  }

  if (els.accountIdValue) {
    els.accountIdValue.textContent = user?.accountId || "-";
  }

  if (els.accountCanonicalValue) {
    els.accountCanonicalValue.textContent = user?.canonical || "-";
  }

  if (els.accountMethodValue) {
    els.accountMethodValue.textContent = formatMethodLabel(user?.method || "");
  }

  if (els.accountContactValue) {
    els.accountContactValue.textContent = user?.maskedCredential || "-";
  }

  if (els.accountLoginAtValue) {
    els.accountLoginAtValue.textContent = formatTimestamp(user?.loginAt || "");
  }

  if (els.billingStatusValue) {
    const billingStatus = user?.billingStatus || state.backendSnapshot?.billingStatus || "";
    els.billingStatusValue.textContent = billingStatus || "-";
    const isActive = billingStatus === "active" || billingStatus === "trialing";
    els.billingStatusValue.style.color = isActive ? "#22c55e" : "#ef4444";
  }
  if (els.billingPlanValue) {
    els.billingPlanValue.textContent = formatPlanLabel(user?.billingPlan || state.backendSnapshot?.billingPlan) || "-";
  }
  if (els.billingLastPaymentValue) {
    els.billingLastPaymentValue.textContent = formatBillingDate(
      user?.billingLastPaymentDate || state.backendSnapshot?.billingLastPaymentDate || "",
    ) || "-";
  }
  if (els.billingNextBillingValue) {
    els.billingNextBillingValue.textContent = formatBillingDate(
      user?.billingNextBillingDate || state.backendSnapshot?.billingNextBillingDate || "",
    ) || "-";
  }

  if (els.affiliateTabBillingStatus) {
    els.affiliateTabBillingStatus.textContent = user?.billingStatus || state.backendSnapshot?.billingStatus || "Unknown";
  }

  renderEmailVerificationState(user);
  populateAffiliateApplyForm();
  renderAiIdentity();
  renderPersonalTrainer(user);
  renderIncompleteProfileBanner(user);
  renderSetupChecklist();
  void loadAffiliateProfile();
}

function accountFieldParts(field) {
  const config = ACCOUNT_FIELD_CONFIG[field];
  return config
    ? {
        input: config.input(),
        button: config.button(),
        status: config.status(),
        check: config.check(),
      }
    : { input: null, button: null, status: null, check: null };
}

function hideAccountFieldCheck(field) {
  const { check } = accountFieldParts(field);
  if (check) {
    check.hidden = true;
  }
}

function showAccountFieldCheck(field) {
  const { check } = accountFieldParts(field);
  if (check) {
    check.hidden = false;
  }
}

function setAccountFieldStatus(field, message, type = "") {
  const { status } = accountFieldParts(field);
  setStatus(status, message, type);
}

function normalizeProfileUpdate(body, fallbackPayload) {
  const root =
    body?.profile ||
    body?.data?.profile ||
    body?.account ||
    body?.user ||
    body?.data?.account ||
    body;

  const payload = root && typeof root === "object" ? root : {};
  return {
    email: String(
      payload.email ??
        payload.primaryEmail ??
        fallbackPayload.email ??
        readAuthUser()?.email ??
        "",
    ).trim(),
    emailVerified:
      normalizeNullableBoolean(
        payload.emailVerified ??
          payload.primaryEmailVerified ??
          payload.email_verified ??
          payload.verifiedEmail ??
          payload.isEmailVerified,
      ) ?? (fallbackPayload.email ? false : readAuthUser()?.emailVerified),
    emailVerifiedAt: String(
      payload.emailVerifiedAt ??
        payload.email_verified_at ??
        payload.profile?.emailVerifiedAt ??
        payload.profile?.email_verified_at ??
        "",
    ).trim() || null,
    username: String(
      payload.username ??
        payload.handle ??
        fallbackPayload.username ??
        readAuthUser()?.username ??
        "",
    ).trim(),
    age: String(
      payload.age ??
        fallbackPayload.age ??
        readAuthUser()?.age ??
        "",
    ).trim(),
    canonical: String(
      payload.canonical ??
        payload.contact ??
        readAuthUser()?.canonical ??
        "",
    ).trim(),
    phone: String(
      payload.phone ?? payload.primaryPhone ?? readAuthUser()?.phone ?? "",
    ).trim(),
    countryCode: String(payload.countryCode ?? payload.country ?? readAuthUser()?.countryCode ?? "").trim(),
    currentWeight: String(payload.currentWeight ?? payload.weight ?? fallbackPayload.currentWeight ?? fallbackPayload.weight ?? readAuthUser()?.currentWeight ?? "").trim(),
    currentHeight: String(payload.currentHeight ?? payload.height ?? fallbackPayload.currentHeight ?? fallbackPayload.height ?? readAuthUser()?.currentHeight ?? "").trim(),
    goalWeight: String(payload.goalWeight ?? fallbackPayload.goalWeight ?? readAuthUser()?.goalWeight ?? "").trim(),
    goalBodyFat: String(payload.goalBodyFat ?? fallbackPayload.goalBodyFat ?? readAuthUser()?.goalBodyFat ?? "").trim(),
    fitnessGoal: String(payload.fitnessGoal ?? fallbackPayload.fitnessGoal ?? readAuthUser()?.fitnessGoal ?? "").trim(),
    workoutSplit: String(payload.workoutSplit ?? fallbackPayload.workoutSplit ?? readAuthUser()?.workoutSplit ?? "").trim(),
    timezone: String(payload.timezone ?? fallbackPayload.timezone ?? readAuthUser()?.timezone ?? "").trim(),
    goalSummary: String(payload.goalSummary ?? fallbackPayload.goalSummary ?? readAuthUser()?.goalSummary ?? "").trim(),
    trackBodyMeasures: payload.trackBodyMeasures !== undefined ? normalizeBoolean(payload.trackBodyMeasures) : (readAuthUser()?.trackBodyMeasures ?? false),
    trackCreatine: payload.trackCreatine !== undefined ? normalizeBoolean(payload.trackCreatine) : (readAuthUser()?.trackCreatine ?? false),
    leaderboardOptIn: payload.leaderboardOptIn !== undefined ? normalizeNullableBoolean(payload.leaderboardOptIn) : readAuthUser()?.leaderboardOptIn,
    weeklyDigestOptOut: payload.weeklyDigestOptOut !== undefined ? normalizeBoolean(payload.weeklyDigestOptOut) : (readAuthUser()?.weeklyDigestOptOut ?? false),
    publicProfileVisibility: payload.publicProfileVisibility && typeof payload.publicProfileVisibility === "object"
      ? payload.publicProfileVisibility
      : readAuthUser()?.publicProfileVisibility,
  };
}

function persistAccountUpdate(profilePatch) {
  const current = readAuthUser() || {};
  const normalized = normalizeAuthUser({
    ...current,
    ...profilePatch,
  });

  if (!normalized) {
    return;
  }

  try {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalized));
    window.localStorage.setItem(AUTH_FLAG_KEY, "true");
  } catch {
    // Ignore storage failures.
  }

  if (state.backendSnapshot?.profile && typeof state.backendSnapshot.profile === "object") {
    Object.assign(state.backendSnapshot.profile, profilePatch);
  }
  if (profilePatch?.sheetUrl) {
    state.userSheetUrl = String(profilePatch.sheetUrl).trim();
  }
}

function normalizedAccountFieldValue(field) {
  const { input } = accountFieldParts(field);
  const raw = String(input?.value || "").trim();

  if (field === "email") return raw.toLowerCase();
  if (field === "username") return raw.replace(/^@/, "");

  return raw;
}

function validateAccountField(field, value) {
  if (field === "email") {
    if (!value) return { ok: true, value: "" };
    if (!validEmail(value)) return { ok: false, message: "Enter a valid email address." };
    return { ok: true, value };
  }

  if (field === "username") {
    if (!value || !validUsername(value)) return { ok: false, message: "Enter a valid username." };
    return { ok: true, value };
  }

  if (field === "age") {
    const age = String(value || "").trim();
    if (!age) return { ok: true, value: "" };
    const numericAge = Number(age);
    if (!Number.isFinite(numericAge) || numericAge < 0 || numericAge > 130) return { ok: false, message: "Enter a valid age." };
    return { ok: true, value: String(Math.round(numericAge)) };
  }

  // All other fields: accept any non-empty string, allow empty to clear
  return { ok: true, value: String(value || "") };
}

async function requestAccountEmailVerification() {
  const user = readAuthUser() || {};
  const overlayInput = document.getElementById("emailVerifyInput");
  const email = (
    els.accountEmailInput?.value ||
    overlayInput?.value ||
    user.email ||
    ""
  )
    .trim()
    .toLowerCase();

  if (!validEmail(email)) {
    setAccountFieldStatus("email", "Enter and save a valid email address first.", "is-error");
    return;
  }

  if (String(user.email || "").trim().toLowerCase() !== email) {
    setAccountFieldStatus("email", "Save this email before sending verification.", "is-error");
    return;
  }

  const payload = pruneEmptyRecord({
    email,
    contact: user.canonical || user.credential || user.maskedCredential || email,
    username: user.username,
    accountId: user.accountId,
    canonical: user.canonical,
    returnUrl: dashboardTabUrl("account"),
  });

  if (window.__billingDebug) {
    console.log("[email-verify] payload:", JSON.stringify(payload, null, 2));
  }
  console.log("[email-verify] endpoints:", [
    "/api/account/email/verify",
    "/api/account/verify-email",
    "/api/user/email/verify",
    `${API_BASE}/api/account/email/verify`,
    `${API_BASE}/api/account/verify-email`,
    `${API_BASE}/api/user/email/verify`,
  ]);

  if (els.verifyAccountEmailButton) {
    els.verifyAccountEmailButton.disabled = true;
  }
  setAccountFieldStatus("email", "Sending verification email...");

  try {
    const body = await postAuthedJson(
      [
        `${API_BASE}/api/account/email/verify`,
        `${API_BASE}/api/account/verify-email`,
        `${API_BASE}/api/user/email/verify`,
      ],
      payload,
    );

    const verified = normalizeNullableBoolean(
      body?.emailVerified ??
        body?.primaryEmailVerified ??
        body?.verified ??
        body?.profile?.emailVerified ??
        body?.profile?.primaryEmailVerified,
    );
    if (verified === true) {
      const verifiedAt = String(
        body?.emailVerifiedAt || body?.email_verified_at || "",
      ).trim() || null;
      persistAccountUpdate({ email, emailVerified: true, ...(verifiedAt ? { emailVerifiedAt: verifiedAt } : {}) });
      renderAccountInfo();
      setAccountFieldStatus("email", "Email verified.", "is-success");
      return;
    }

    persistAccountUpdate({ email, emailVerified: false });
    renderEmailVerificationState(readAuthUser());
    setAccountFieldStatus("email", "Verification email sent. Check your inbox.", "is-success");
  } catch (error) {
    setAccountFieldStatus("email", String(error?.message || "Could not send verification email."), "is-error");
  } finally {
    renderEmailVerificationState(readAuthUser());
  }
}

async function saveAccountField(field) {
  const current = readAuthUser() || {};
  const nextValue = normalizedAccountFieldValue(field);
  const validation = validateAccountField(field, nextValue);

  if (!validation.ok) {
    hideAccountFieldCheck(field);
    setAccountFieldStatus(field, validation.message, "is-error");
    return;
  }

  const outgoingValue = validation.value;
  const currentValue = String(current?.[field] || "").trim();
  if (outgoingValue === currentValue) {
    setAccountFieldStatus(field, "Already up to date.");
    return;
  }

  const backendKey = ACCOUNT_FIELD_CONFIG[field]?.backendKey || field;
  const payload = {
    [backendKey]: field === "age" ? (outgoingValue ? Number(outgoingValue) : null) : outgoingValue,
  };
  const { button } = accountFieldParts(field);

  if (button) {
    button.disabled = true;
  }

  hideAccountFieldCheck(field);
  setAccountFieldStatus(field, `Saving ${ACCOUNT_FIELD_CONFIG[field].label}...`);

  try {
    const body = await postAuthedJson(
      [
        `${API_BASE}/api/account/profile`,
        `${API_BASE}/api/user/profile`,
        `${API_BASE}/api/account/update-profile`,
      ],
      payload,
    );

    const updated = normalizeProfileUpdate(body, payload);
    persistAccountUpdate(updated);
    renderAccountInfo();
    showAccountFieldCheck(field);
    if (field === "email" && !readAccountEmailVerified(readAuthUser())) {
      setAccountFieldStatus(field, "Email updated. Send verification before applying as an affiliate.", "is-success");
      syncAffiliateApplyAvailability();
    } else {
      setAccountFieldStatus(field, `${ACCOUNT_FIELD_CONFIG[field].label} updated.`, "is-success");
    }
  } catch (error) {
    setAccountFieldStatus(field, String(error?.message || "Profile update failed."), "is-error");
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

function wireAccountEditing() {
  Object.keys(ACCOUNT_FIELD_CONFIG).forEach((field) => {
    const { input, button, status } = accountFieldParts(field);
    if (input) {
      input.addEventListener("input", () => {
        hideAccountFieldCheck(field);
        if (field === "email") {
          if (els.verifyAccountEmailButton) {
            els.verifyAccountEmailButton.hidden = true;
          }
        }
        if (status) {
          status.textContent = "";
          status.classList.remove("is-error", "is-success");
        }
      });
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") {
          return;
        }
        event.preventDefault();
        void saveAccountField(field);
      });
    }
    if (button) {
      button.addEventListener("click", () => {
        void saveAccountField(field);
      });
    }
  });
  if (els.verifyAccountEmailButton) {
    els.verifyAccountEmailButton.addEventListener("click", () => {
      void requestAccountEmailVerification();
    });
  }
}

function wirePublicProfileVisibility() {
  if (els.savePublicProfileButton) {
    els.savePublicProfileButton.addEventListener("click", () => {
      void savePublicProfileVisibility();
    });
  }
  const toggles = [els.toggleWorkoutVisibility, els.toggleNutritionVisibility, els.toggleWaterVisibility, els.toggleLeaderboardVisibility, els.toggleRecentWorkoutsVisibility, els.toggleMergedVisibility, els.toggleStatsBarVisibility, els.togglePublicLeaderboardConsent];
  toggles.forEach((toggle) => {
    if (toggle) {
      toggle.addEventListener("change", () => {
        if (els.publicProfileSaved) els.publicProfileSaved.hidden = true;
        if (els.publicProfileStatus) {
          els.publicProfileStatus.textContent = "";
          els.publicProfileStatus.classList.remove("is-error", "is-success");
        }
        updatePublicProfilePreview(readAuthUser());
      });
    }
  });
}

function hydratePublicProfileVisibility() {
  const user = readAuthUser();
  if (!user) return;

  const username = String(user.username || "").trim();
  if (els.publicProfileToggles) {
    els.publicProfileToggles.hidden = !username;
    if (username) els.publicProfileToggles.classList.add("is-loading");
  }
  if (els.savePublicProfileButton) {
    els.savePublicProfileButton.hidden = !username;
  }
  if (els.publicProfileUsername) {
    els.publicProfileUsername.textContent = username || "you";
  }
  if (els.publicProfileUrl) {
    els.publicProfileUrl.href = username ? `https://thetrackerapp.io/@${encodeURIComponent(username)}` : "https://thetrackerapp.io/@";
  }

  // Canonical state is the backend portal snapshot (SQLite).
  // After any save, the response body updates state.backendSnapshot directly.
  const visibility = state.backendSnapshot?.publicProfileVisibility
    || state.backendSnapshot?.profile?.publicVisibility
    || {};

  const hasData = visibility.merged !== undefined || visibility.workouts !== undefined;
  if (!hasData) return;

  if (els.publicProfileToggles) {
    els.publicProfileToggles.classList.remove("is-loading");
  }
  if (els.toggleWorkoutVisibility) {
    els.toggleWorkoutVisibility.checked = visibility.workouts === true;
  }
  if (els.toggleNutritionVisibility) {
    els.toggleNutritionVisibility.checked = visibility.nutrition === true;
  }
  if (els.toggleWaterVisibility) {
    els.toggleWaterVisibility.checked = visibility.water === true;
  }
  if (els.toggleLeaderboardVisibility) {
    els.toggleLeaderboardVisibility.checked = visibility.leaderboard === true;
  }
  if (els.toggleRecentWorkoutsVisibility) {
    els.toggleRecentWorkoutsVisibility.checked = visibility.recentWorkouts === true;
  }
  if (els.toggleMergedVisibility) {
    els.toggleMergedVisibility.checked = visibility.merged === true;
  }
  if (els.toggleStatsBarVisibility) {
    els.toggleStatsBarVisibility.checked = visibility.statsBar === true;
  }
  if (els.togglePublicLeaderboardConsent) {
    els.togglePublicLeaderboardConsent.checked = visibility.publicLeaderboard === true;
  }

  updatePublicProfilePreview(user);
}

function updatePublicProfilePreview(user) {
  const preview = document.getElementById("publicProfilePreview");
  const list = document.getElementById("publicProfilePreviewList");
  const previewUrl = document.getElementById("publicProfilePreviewUrl");
  const previewUsername = document.getElementById("publicProfilePreviewUsername");
  if (!preview || !list) return;

  const username = String(user?.username || "").trim();
  if (!username) {
    preview.hidden = true;
    return;
  }

  if (previewUrl) previewUrl.href = `https://thetrackerapp.io/@${encodeURIComponent(username)}`;
  if (previewUsername) previewUsername.textContent = username;

  const items = [];
  if (els.toggleMergedVisibility?.checked) items.push("Combined workout + nutrition + hydration heatmap");
  if (els.toggleWorkoutVisibility?.checked) items.push("52-week workout heatmap & activity calendar");
  if (els.toggleNutritionVisibility?.checked) items.push("52-week nutrition / meal logging heatmap");
  if (els.toggleWaterVisibility?.checked) items.push("52-week hydration / water intake heatmap");
  if (els.toggleStatsBarVisibility?.checked) items.push("Total workouts, current streak & active days count");
  if (els.toggleLeaderboardVisibility?.checked) items.push("Strength, calisthenics & streak leaderboard rankings");
  if (els.toggleRecentWorkoutsVisibility?.checked) items.push("Recent logged workouts with exercise details");
  if (els.togglePublicLeaderboardConsent?.checked) items.push("Your name & stats may appear on public site leaderboards");

  if (items.length === 0) {
    list.innerHTML = "<li>Only your display name and join date will be visible.</li>";
  } else {
    list.innerHTML = items.map(i => `<li>${i}</li>`).join("");
  }
  preview.hidden = false;
}

async function savePublicProfileVisibility() {
  if (els.publicProfileStatus) {
    els.publicProfileStatus.textContent = "Saving...";
    els.publicProfileStatus.classList.remove("is-error", "is-success");
  }
  if (els.publicProfileSaved) {
    els.publicProfileSaved.hidden = true;
  }

  const visibility = {
    merged: els.toggleMergedVisibility?.checked ?? false,
    workouts: els.toggleWorkoutVisibility?.checked ?? false,
    nutrition: els.toggleNutritionVisibility?.checked ?? false,
    water: els.toggleWaterVisibility?.checked ?? false,
    statsBar: els.toggleStatsBarVisibility?.checked ?? false,
    leaderboard: els.toggleLeaderboardVisibility?.checked ?? false,
    recentWorkouts: els.toggleRecentWorkoutsVisibility?.checked ?? false,
    publicLeaderboard: els.togglePublicLeaderboardConsent?.checked ?? false,
  };

  try {
    // Save to backend via the same authed path as other settings
    const body = await postAuthedJson(
      [`${API_BASE}/api/user/visibility`],
      { visibility },
    );

    // Use the backend response as the canonical state — no localStorage
    const savedVisibility = body?.visibility || body?.publicVisibility || visibility;
    if (state.backendSnapshot) {
      state.backendSnapshot.publicProfileVisibility = savedVisibility;
    }

    // Re-hydrate the checkboxes from the canonical backend state
    hydratePublicProfileVisibility();

    if (els.publicProfileSaved) els.publicProfileSaved.hidden = false;
    if (els.publicProfileStatus) setStatus(els.publicProfileStatus, "Visibility updated.", "is-success");
  } catch (err) {
    if (els.publicProfileStatus) setStatus(els.publicProfileStatus, err?.message || "Save failed.", "is-error");
    console.warn("savePublicProfileVisibility failed:", err);
  }
}

let affiliateProfileLoaded = false;
const AFFILIATE_AGREEMENT_POLL_MS = 5000;

let affiliateAgreementPollTimer = 0;
let affiliateAgreementPollInFlight = false;

function readPendingAffiliateProfile() {
  try {
    const raw = window.localStorage.getItem(AFFILIATE_PENDING_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function persistPendingAffiliateProfile(profile) {
  const shape = buildAffiliateShape(profile);
  if (
    !hasAffiliateProfile(shape) &&
    !readAffiliateAgreementRequired(shape) &&
    !readAffiliateAgreementSigningUrl(shape) &&
    !readAffiliateAgreementMessage(shape)
  ) {
    return;
  }

  try {
    window.localStorage.setItem(AFFILIATE_PENDING_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage failures.
  }
}

function clearPendingAffiliateProfile() {
  try {
    window.localStorage.removeItem(AFFILIATE_PENDING_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function pickAffiliateField(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }
  return undefined;
}

function pickAffiliateNumber(obj, keys, fallback = 0) {
  const value = pickAffiliateField(obj, keys);
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function pickAffiliateBoolean(obj, keys) {
  const value = pickAffiliateField(obj, keys);
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function formatAffiliateCents(cents) {
  const num = Number(cents);
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(safe / 100);
}

function pickAffiliateText(obj, keys, fallback = "") {
  const value = pickAffiliateField(obj, keys);
  return value === undefined || value === null ? fallback : String(value).trim();
}

function humanizeAffiliateValue(value, fallback = "—") {
  const raw = String(value || "").trim();
  if (!raw) {
    return fallback;
  }

  if (/^[A-Z0-9][A-Z0-9\s/+-]*$/.test(raw)) {
    return raw;
  }

  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([a-z])/gi, (match) => match.toUpperCase());
}

function readAffiliateSignupCount(shape) {
  return pickAffiliateNumber(shape?.counts, [
    "totalReferredSubscribers",
    "signups",
    "signupCount",
    "totalSignups",
    "leads",
  ]);
}

function formatAffiliateReferralDate(entry) {
  const raw = pickAffiliateField(entry, [
    "signedUpAt",
    "signupAt",
    "createdAt",
    "joinedAt",
    "date",
    "timestamp",
    "time",
  ]);
  return formatBillingDate(raw) || "—";
}

function readAffiliateReferralStatus(entry) {
  const explicitStatus = pickAffiliateText(entry, [
    "status",
    "billingStatus",
    "subscriptionStatus",
    "state",
    "planStatus",
  ]);
  if (explicitStatus) {
    return humanizeAffiliateValue(explicitStatus);
  }

  if (
    pickAffiliateBoolean(entry, [
      "converted",
      "qualified",
      "isQualified",
      "subscribed",
      "paid",
      "isPaidSubscriber",
    ])
  ) {
    return "Converted";
  }

  return "Signup";
}

function normalizeAffiliateReferralRows(shape) {
  const referrals = Array.isArray(shape?.referrals) ? shape.referrals : [];

  return referrals.map((entry, index) => {
    const fullName = pickAffiliateText(entry, ["name", "fullName", "displayName"]);
    const handle = pickAffiliateText(entry, ["username", "handle", "canonical"]);
    const email = pickAffiliateText(entry, ["email", "subscriberEmail", "userEmail", "contactEmail"]);
    const phone = pickAffiliateText(entry, ["phone", "maskedPhone", "phoneNumber"]);
    const fallbackIdentity = pickAffiliateText(entry, ["contact", "accountId", "userId", "subscriberId"]);

    const subscriber = fullName || handle || email || phone || fallbackIdentity || `Signup ${index + 1}`;
    let contact = email || phone || fallbackIdentity || "—";
    if (contact === subscriber) {
      contact = phone && phone !== subscriber ? phone : "—";
    }

    return {
      signedUp: formatAffiliateReferralDate(entry),
      subscriber,
      contact,
      plan: humanizeAffiliateValue(
        pickAffiliateText(entry, ["plan", "planName", "priceNickname", "billingPlan", "subscriptionPlan", "tier"]),
      ),
      status: readAffiliateReferralStatus(entry),
    };
  });
}

function affiliateHistoryKey(shape) {
  const code = readAffiliateCode(shape);
  const affiliate = shape?.affiliate || {};
  const accountId = pickAffiliateText(affiliate, ["accountId", "affiliateId", "id"]);
  const email = pickAffiliateText(affiliate, ["email"]);
  const username = pickAffiliateText(affiliate, ["username", "handle"]);
  const contact = pickAffiliateText(affiliate, ["contact", "phone", "canonical"]);
  return [code, accountId || email || username || contact].filter(Boolean).join("|");
}

function renderAffiliateReferralTable(shape, options = {}) {
  if (!els.affiliateReferralsRows || !els.affiliateReferralsStatus) {
    return;
  }

  const rows = normalizeAffiliateReferralRows(shape);
  const totalSignups = Math.max(readAffiliateSignupCount(shape), rows.length);

  clearElement(els.affiliateReferralsRows);

  if (!rows.length) {
    const row = document.createElement("tr");
    row.className = "is-empty";

    const cell = document.createElement("td");
    cell.colSpan = 5;

    const message = options.loading
      ? "Loading signup list..."
      : totalSignups > 0
        ? options.error
          ? "Backend has signup totals but did not return the signup rows yet."
          : "Waiting for signup rows from backend."
        : "No signups yet — share your link to get started.";

    cell.textContent = message;
    row.appendChild(cell);
    els.affiliateReferralsRows.appendChild(row);
    setStatus(els.affiliateReferralsStatus, message, options.error && totalSignups > 0 ? "is-error" : "");
    return;
  }

  rows.forEach((entry) => {
    const row = document.createElement("tr");
    [entry.signedUp, entry.subscriber, entry.contact, entry.plan, entry.status].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value || "—";
      row.appendChild(cell);
    });
    els.affiliateReferralsRows.appendChild(row);
  });

  const label =
    totalSignups > rows.length
      ? `Showing ${rows.length} of ${totalSignups} signups returned by backend.`
      : `Showing ${rows.length} signup${rows.length === 1 ? "" : "s"} returned by backend.`;
  setStatus(els.affiliateReferralsStatus, label);
}

async function ensureAffiliateReferralHistory(shape) {
  if (!shape) {
    return;
  }

  const key = affiliateHistoryKey(shape);
  if (!key || state.affiliateHistoryLoading || state.affiliateHistoryLoadedKey === key) {
    return;
  }

  const identity = buildAffiliateIdentityPayload(shape?.affiliate || {});
  const hasIdentity = identity.contact || identity.phone || identity.email || identity.username || identity.accountId || identity.canonical;
  if (!hasIdentity) {
    return;
  }

  const hasExistingRows = normalizeAffiliateReferralRows(shape).length > 0;
  state.affiliateHistoryLoading = true;

  if (!hasExistingRows) {
    renderAffiliateReferralTable(shape, { loading: true });
  }

  try {
    const body = await affiliateHistory({ ...identity, refresh: 1 });
    state.affiliateHistoryLoadedKey = key;
    state.affiliateHistoryLoading = false;

    if (body && typeof body === "object" && body.ok !== false) {
      showAffiliatePanel(mergeAffiliateProfileData(state.affiliateProfile, body));
      return;
    }

    if (!hasExistingRows) {
      renderAffiliateReferralTable(buildAffiliateShape(state.affiliateProfile), { error: true });
    }
  } catch {
    state.affiliateHistoryLoadedKey = key;
    state.affiliateHistoryLoading = false;
    if (!hasExistingRows) {
      renderAffiliateReferralTable(buildAffiliateShape(state.affiliateProfile), { error: true });
    }
  }
}

function affiliateBillingStatusValue() {
  return String(readAuthUser()?.billingStatus || state.backendSnapshot?.billingStatus || "").trim();
}

function billingNeedsStripePortal(status) {
  return ["pending_confirmation", "incomplete", "incomplete_expired", "requires_payment_method", "unpaid"].includes(
    String(status || "").trim().toLowerCase(),
  );
}

function resolveBillingPortalUrl() {
  return String(
    state.billingPortalUrl || state.backendSnapshot?.billingPortalUrl || deriveBillingPortalUrl(state.backendSnapshot || {}) || "",
  ).trim();
}

function syncAffiliateBillingButton() {
  if (!els.affiliateOpenBillingButton) {
    return;
  }

  els.affiliateOpenBillingButton.textContent = resolveBillingPortalUrl() ? "Open Stripe Billing" : "Open Billing Tab";
}

function dashboardTabUrl(tabId = "affiliate") {
  const url = new URL("/dashboard", window.location.origin);
  url.searchParams.set("view", normalizeTabId(tabId) || "affiliate");
  return url.toString();
}

function setAffiliateApplySuccess(visible) {
  if (els.affiliateApplySuccess) {
    els.affiliateApplySuccess.hidden = !visible;
  }
}

function affiliateEmailVerificationMessage() {
  return "";
}

function syncAffiliateApplyAvailability() {
  const message = affiliateEmailVerificationMessage();
  if (els.affiliateApplyButton) {
    els.affiliateApplyButton.disabled = Boolean(message);
  }
  return message;
}

function clearAffiliateAgreementPoll() {
  if (affiliateAgreementPollTimer) {
    window.clearTimeout(affiliateAgreementPollTimer);
    affiliateAgreementPollTimer = 0;
  }
}

function affiliateNeedsAgreementPolling(shape) {
  if (!shape || !readAffiliateAgreementRequired(shape)) {
    return false;
  }

  return (
    !readAffiliateAgreementSigned(shape) ||
    readAffiliateAgreementConnectBlocked(shape) ||
    !readAffiliateCanConnectStripe(shape)
  );
}

function scheduleAffiliateAgreementPoll(delay = AFFILIATE_AGREEMENT_POLL_MS) {
  clearAffiliateAgreementPoll();
  affiliateAgreementPollTimer = window.setTimeout(() => {
    void pollAffiliateAgreementStatus();
  }, delay);
}

function pickAffiliateCandidate(candidates, normalize = null) {
  for (const candidate of candidates) {
    const raw = String(candidate || "").trim();
    if (!raw) {
      continue;
    }
    const value = typeof normalize === "function" ? normalize(raw) : raw;
    if (value) {
      return value;
    }
  }

  return "";
}

function inferAffiliateNameFields() {
  const authUser = readAuthUser() || {};
  const profile = state.backendSnapshot?.profile || {};
  const shape = buildAffiliateShape(state.affiliateProfile);
  const affiliate = shape?.affiliate || {};

  const firstName = pickAffiliateCandidate([
    affiliate.firstName,
    affiliate.legalFirstName,
    profile.firstName,
    authUser.firstName,
  ]);
  const lastName = pickAffiliateCandidate([
    affiliate.lastName,
    affiliate.legalLastName,
    profile.lastName,
    authUser.lastName,
  ]);

  if (firstName || lastName) {
    return { firstName, lastName };
  }

  return splitAffiliateNameParts(
    pickAffiliateCandidate([
      affiliate.name,
      affiliate.fullName,
      profile.name,
      profile.fullName,
      authUser.name,
    ]),
  );
}

function resolveAffiliateEmailValue(shape = buildAffiliateShape(state.affiliateProfile)) {
  const authUser = readAuthUser() || {};
  const profile = state.backendSnapshot?.profile || {};
  const affiliate = shape?.affiliate || {};
  const agreement = shape?.agreement || {};
  const storedIdentity = readStoredAffiliateIdentity();

  return pickAffiliateCandidate(
    [
      affiliate.email,
      agreement.email,
      agreement.signerEmail,
      agreement.recipientEmail,
      profile.primaryEmail,
      profile.email,
      storedIdentity.email,
      authUser.email,
      els.affiliateEmailInput?.value,
    ],
    (value) => (validEmail(value) ? value.toLowerCase() : ""),
  );
}

function readConfirmedAffiliateEmail(primaryInput, confirmInput, options = {}) {
  const primaryLabel = String(options.primaryLabel || "email address").trim() || "email address";
  const email = String(primaryInput?.value || "")
    .trim()
    .toLowerCase();
  const confirmEmail = String(confirmInput?.value || "")
    .trim()
    .toLowerCase();

  if (primaryInput) {
    primaryInput.value = email;
  }
  if (confirmInput) {
    confirmInput.value = confirmEmail;
  }

  if (!validEmail(email)) {
    return {
      ok: false,
      message: `Enter a valid ${primaryLabel}.`,
    };
  }
  if (!confirmEmail) {
    return {
      ok: false,
      message: `Confirm the ${primaryLabel}.`,
    };
  }
  if (!validEmail(confirmEmail)) {
    return {
      ok: false,
      message: `Enter a valid confirmation email.`,
    };
  }
  if (email !== confirmEmail) {
    return {
      ok: false,
      message: `The ${primaryLabel} entries do not match.`,
    };
  }

  return { ok: true, email };
}

function populateAffiliateAgreementEmailInputs(shape = buildAffiliateShape(state.affiliateProfile)) {
  const email = resolveAffiliateEmailValue(shape);
  if (els.affiliateAgreementEmailInput && !String(els.affiliateAgreementEmailInput.value || "").trim()) {
    els.affiliateAgreementEmailInput.value = email;
  }
  if (
    els.affiliateConfirmEmailInput &&
    els.affiliateAgreementConfirmEmailInput &&
    !String(els.affiliateAgreementConfirmEmailInput.value || "").trim()
  ) {
    const confirmedEmail = String(els.affiliateConfirmEmailInput.value || "")
      .trim()
      .toLowerCase();
    if (validEmail(confirmedEmail) && confirmedEmail === email) {
      els.affiliateAgreementConfirmEmailInput.value = confirmedEmail;
    }
  }
}

function populateAffiliateApplyForm() {
  const profile = state.backendSnapshot?.profile || {};
  const authUser = readAuthUser() || {};
  const storedIdentity = readStoredAffiliateIdentity();
  const nameFields = inferAffiliateNameFields();

  if (els.affiliateFirstNameInput && !String(els.affiliateFirstNameInput.value || "").trim()) {
    els.affiliateFirstNameInput.value = nameFields.firstName || "";
  }
  if (els.affiliateLastNameInput && !String(els.affiliateLastNameInput.value || "").trim()) {
    els.affiliateLastNameInput.value = nameFields.lastName || "";
  }

  const email = pickAffiliateCandidate(
    [profile.primaryEmail, profile.email, storedIdentity.email, authUser.email],
    (value) => (validEmail(value) ? value.toLowerCase() : ""),
  );
  if (els.affiliateEmailInput && !String(els.affiliateEmailInput.value || "").trim()) {
    els.affiliateEmailInput.value = email;
  }
  if (
    els.affiliateConfirmEmailInput &&
    !String(els.affiliateConfirmEmailInput.value || "").trim() &&
    validEmail(String(els.affiliateConfirmEmailInput?.defaultValue || ""))
  ) {
    els.affiliateConfirmEmailInput.value = String(els.affiliateConfirmEmailInput.defaultValue || "").trim().toLowerCase();
  }

  const phone = pickAffiliateCandidate(
    [storedIdentity.phone, storedIdentity.contact, profile.contact, authUser.credential, authUser.maskedCredential],
    (value) => {
      const normalized = normalizeAffiliatePhone(value);
      return normalized ? formatAffiliatePhoneValue(normalized) : "";
    },
  );
  if (els.affiliatePhoneInput && !String(els.affiliatePhoneInput.value || "").trim()) {
    els.affiliatePhoneInput.value = phone;
  }

  populateAffiliateAgreementEmailInputs(buildAffiliateShape(state.affiliateProfile));
}

function buildAffiliateIdentityPayload(extra = {}) {
  const authUser = readAuthUser() || {};
  const profile = state.backendSnapshot?.profile || {};
  const shape = buildAffiliateShape(state.affiliateProfile);
  const affiliate = shape?.affiliate || {};
  const storedIdentity = readStoredAffiliateIdentity();
  const inferredNames = inferAffiliateNameFields();

  const firstName = pickAffiliateCandidate([
    extra.firstName,
    affiliate.firstName,
    affiliate.legalFirstName,
    inferredNames.firstName,
  ]);
  const lastName = pickAffiliateCandidate([
    extra.lastName,
    affiliate.lastName,
    affiliate.legalLastName,
    inferredNames.lastName,
  ]);
  const name =
    pickAffiliateCandidate([extra.name, affiliate.name, affiliate.fullName]) ||
    [firstName, lastName].filter(Boolean).join(" ").trim();

  const email = pickAffiliateCandidate(
    [extra.email, affiliate.email, profile.primaryEmail, profile.email, storedIdentity.email, authUser.email],
    (value) => (validEmail(value) ? value.toLowerCase() : ""),
  );
  const phone = pickAffiliateCandidate(
    [
      extra.phone,
      affiliate.phone,
      affiliate.contact,
      storedIdentity.phone,
      storedIdentity.contact,
      profile.contact,
      authUser.credential,
    ],
    normalizeAffiliatePhone,
  );
  const username = pickAffiliateCandidate([extra.username, affiliate.username, storedIdentity.username, authUser.username]);
  const accountId = pickAffiliateCandidate([extra.accountId, affiliate.accountId, storedIdentity.accountId, authUser.accountId]);
  const canonical = pickAffiliateCandidate([extra.canonical, affiliate.canonical, storedIdentity.canonical, authUser.canonical]);
  const contact = pickAffiliateCandidate([
    extra.contact,
    affiliate.contact,
    storedIdentity.contact,
    phone,
    email,
    username,
    accountId,
    canonical,
  ]);

  return pruneEmptyRecord({
    firstName,
    lastName,
    legalFirstName: firstName,
    legalLastName: lastName,
    name,
    email,
    phone,
    contact,
    username,
    accountId,
    canonical,
    source: String(extra.source || "dashboard_affiliate_tab").trim(),
    requestedAt: String(extra.requestedAt || "").trim() || undefined,
    returnUrl: String(extra.returnUrl || "").trim() || undefined,
    refreshUrl: String(extra.refreshUrl || "").trim() || undefined,
    refresh: extra.refresh,
  });
}

function buildAffiliateSignupPayload() {
  const firstName = String(els.affiliateFirstNameInput?.value || "").trim();
  const lastName = String(els.affiliateLastNameInput?.value || "").trim();
  const phoneInput = String(els.affiliatePhoneInput?.value || "").trim();
  const phone = normalizeAffiliatePhone(phoneInput);
  const emailValidation = readConfirmedAffiliateEmail(els.affiliateEmailInput, els.affiliateConfirmEmailInput, {
    primaryLabel: "affiliate email address",
  });

  if (!firstName) {
    return { ok: false, message: "Enter the affiliate's legal first name." };
  }
  if (!lastName) {
    return { ok: false, message: "Enter the affiliate's legal last name." };
  }
  if (!emailValidation.ok) {
    return { ok: false, message: emailValidation.message };
  }
  if (!phone) {
    return { ok: false, message: "Enter a valid affiliate phone number." };
  }

  const email = emailValidation.email;

  if (els.affiliateEmailInput) {
    els.affiliateEmailInput.value = email;
  }
  if (els.affiliateConfirmEmailInput) {
    els.affiliateConfirmEmailInput.defaultValue = email;
  }
  if (els.affiliatePhoneInput) {
    els.affiliatePhoneInput.value = formatAffiliatePhoneValue(phone);
  }
  if (els.affiliateAgreementEmailInput) {
    els.affiliateAgreementEmailInput.value = email;
  }
  if (els.affiliateAgreementConfirmEmailInput) {
    els.affiliateAgreementConfirmEmailInput.value = email;
  }

  return {
    ok: true,
    payload: buildAffiliateIdentityPayload({
      firstName,
      lastName,
      email,
      phone,
      contact: phone,
      source: "dashboard_affiliate_apply",
      requestedAt: new Date().toISOString(),
    }),
  };
}

function mergeAffiliateProfileData(base, incoming, applicationPayload = null) {
  const current = base && typeof base === "object" ? base : {};
  const next = incoming && typeof incoming === "object" ? incoming : {};
  const affiliate = {
    ...(current.affiliate && typeof current.affiliate === "object" ? current.affiliate : {}),
    ...(next.affiliate && typeof next.affiliate === "object" ? next.affiliate : {}),
  };
  const stripe = {
    ...(current.stripe && typeof current.stripe === "object" ? current.stripe : {}),
    ...(next.stripe && typeof next.stripe === "object" ? next.stripe : {}),
  };
  const agreement = {
    ...(current.agreement && typeof current.agreement === "object" ? current.agreement : {}),
    ...(next.agreement && typeof next.agreement === "object" ? next.agreement : {}),
  };

  if (applicationPayload && typeof applicationPayload === "object") {
    const source = String(applicationPayload.source || "").trim().toLowerCase();
    const preferSubmittedIdentity = source === "dashboard_affiliate_apply" || source === "dashboard_affiliate_agreement";
    const fullName =
      String(applicationPayload.name || "").trim() ||
      [applicationPayload.firstName, applicationPayload.lastName].filter(Boolean).join(" ").trim();

    if (applicationPayload.firstName && (preferSubmittedIdentity || !affiliate.firstName)) affiliate.firstName = applicationPayload.firstName;
    if (applicationPayload.lastName && (preferSubmittedIdentity || !affiliate.lastName)) affiliate.lastName = applicationPayload.lastName;
    if (applicationPayload.firstName && (preferSubmittedIdentity || !affiliate.legalFirstName)) {
      affiliate.legalFirstName = applicationPayload.firstName;
    }
    if (applicationPayload.lastName && (preferSubmittedIdentity || !affiliate.legalLastName)) {
      affiliate.legalLastName = applicationPayload.lastName;
    }
    if (fullName && (preferSubmittedIdentity || !affiliate.name)) affiliate.name = fullName;
    if (applicationPayload.email && (preferSubmittedIdentity || !affiliate.email)) affiliate.email = applicationPayload.email;
    if (applicationPayload.phone && (preferSubmittedIdentity || !affiliate.phone)) affiliate.phone = applicationPayload.phone;
    if (applicationPayload.contact && (preferSubmittedIdentity || !affiliate.contact)) affiliate.contact = applicationPayload.contact;
    if (applicationPayload.username && !affiliate.username) affiliate.username = applicationPayload.username;
    if (applicationPayload.accountId && !affiliate.accountId) affiliate.accountId = applicationPayload.accountId;
    if (applicationPayload.canonical && !affiliate.canonical) affiliate.canonical = applicationPayload.canonical;
    if (applicationPayload.email && (preferSubmittedIdentity || !agreement.email)) {
      agreement.email = applicationPayload.email;
    }
  }

  const merged = { ...current, ...next };
  if (Object.keys(affiliate).length) {
    merged.affiliate = affiliate;
  }
  if (Object.keys(stripe).length) {
    merged.stripe = stripe;
  }
  if (Object.keys(agreement).length) {
    merged.agreement = agreement;
  }

  return merged;
}

function hideAffiliateAgreementBox() {
  if (els.affiliateTabAgreementBox) {
    els.affiliateTabAgreementBox.hidden = true;
  }
  if (els.affiliateAgreementHeading) {
    els.affiliateAgreementHeading.textContent = "Affiliate Agreement Required";
  }
  if (els.affiliateAgreementMessage) {
    els.affiliateAgreementMessage.textContent = "We emailed your affiliate agreement. Sign it before connecting Stripe.";
  }
  if (els.affiliateAgreementLink) {
    els.affiliateAgreementLink.hidden = true;
    els.affiliateAgreementLink.href = "#";
  }
  if (els.affiliateAgreementResendButton) {
    els.affiliateAgreementResendButton.hidden = true;
    els.affiliateAgreementResendButton.disabled = false;
  }
  setStatus(els.affiliateAgreementStatus, "");
}

function renderAffiliateAgreementBox(shape) {
  const required = readAffiliateAgreementRequired(shape);
  const signed = readAffiliateAgreementSigned(shape);
  const connectBlocked = readAffiliateAgreementConnectBlocked(shape);
  const canConnectStripe = readAffiliateCanConnectStripe(shape);
  const signingUrl = String(readAffiliateAgreementSigningUrl(shape) || "").trim();
  const message = String(readAffiliateAgreementMessage(shape) || "").trim();

  if (!required || (signed && canConnectStripe && !connectBlocked)) {
    hideAffiliateAgreementBox();
    return { required, signed, connectBlocked, canConnectStripe, signingUrl, message };
  }

  if (els.affiliateTabAgreementBox) {
    els.affiliateTabAgreementBox.hidden = false;
  }

  populateAffiliateAgreementEmailInputs(shape);

  const agreementEmail = resolveAffiliateEmailValue(shape);

  let heading = "Affiliate Agreement Required";
  let description = message || "We emailed your affiliate agreement. Sign it before connecting Stripe.";
  let statusMessage = signingUrl
    ? "Open the agreement, sign it, and this tab will refresh automatically."
    : "Use Resend Agreement if you need a fresh signing link.";
  let statusType = "";
  let showOpenAgreement = Boolean(signingUrl) && !signed;
  let showResendAgreement = !signed || connectBlocked;

  if (signed && (!canConnectStripe || connectBlocked)) {
    heading = "Finalizing Affiliate Setup";
    description = message || "Your agreement is signed. We are refreshing Stripe access now.";
    statusMessage = "Checking agreement status...";
    statusType = "is-success";
    showOpenAgreement = false;
    showResendAgreement = false;
  } else if (!signingUrl) {
    statusMessage = agreementEmail
      ? "Confirm the email below and resend the agreement for a fresh signing link."
      : "Enter and confirm your email below, then resend the agreement.";
  }

  if (els.affiliateAgreementHeading) {
    els.affiliateAgreementHeading.textContent = heading;
  }
  if (els.affiliateAgreementMessage) {
    els.affiliateAgreementMessage.textContent = description;
  }
  if (els.affiliateAgreementLink) {
    els.affiliateAgreementLink.hidden = !showOpenAgreement;
    els.affiliateAgreementLink.href = showOpenAgreement ? signingUrl : "#";
  }
  if (els.affiliateAgreementResendButton) {
    els.affiliateAgreementResendButton.hidden = !showResendAgreement;
    els.affiliateAgreementResendButton.disabled = false;
  }
  setStatus(els.affiliateAgreementStatus, statusMessage, statusType);

  return { required, signed, connectBlocked, canConnectStripe, signingUrl, message };
}

function showAffiliateCta() {
  clearAffiliateAgreementPoll();
  state.affiliateProfile = null;
  state.affiliateHistoryLoadedKey = "";
  state.affiliateHistoryLoading = false;
  if (els.navAffiliate) els.navAffiliate.hidden = false;
  if (els.affiliateTabMetrics) els.affiliateTabMetrics.hidden = true;
  if (els.affiliateTabEmpty) els.affiliateTabEmpty.hidden = false;
  if (els.affiliateApplyButton) els.affiliateApplyButton.disabled = false;
  setAffiliateApplySuccess(false);
  syncAffiliateBillingButton();
  hideAffiliateAgreementBox();
  populateAffiliateApplyForm();
  renderAffiliateReferralTable(null);
  const emailGateMessage = syncAffiliateApplyAvailability();

  if (els.affiliateTabEmptyStatus) {
    els.affiliateTabEmptyStatus.classList.remove("is-error", "is-success");
    if (emailGateMessage) {
      els.affiliateTabEmptyStatus.textContent = emailGateMessage;
      els.affiliateTabEmptyStatus.classList.add("is-error");
    } else {
      els.affiliateTabEmptyStatus.textContent =
        "Enter your legal details so we can send the affiliate agreement and unlock Stripe Connect once it is signed.";
    }
  }
}

function showAffiliatePanel(profile) {
  const mergedProfile = mergeAffiliateProfileData(state.affiliateProfile, profile);
  state.affiliateProfile = mergedProfile;
  const shape = buildAffiliateShape(mergedProfile);
  const historyKey = affiliateHistoryKey(shape);
  if (state.affiliateHistoryLoadedKey && historyKey && state.affiliateHistoryLoadedKey !== historyKey) {
    state.affiliateHistoryLoadedKey = "";
  }
  const affiliate = shape?.affiliate || mergedProfile;
  const counts = shape?.counts || affiliate;
  const totals = shape?.totals || affiliate;
  const agreementGate = renderAffiliateAgreementBox(shape);

  const code = String(readAffiliateCode(shape));
  const referralUrl = String(readAffiliateReferralUrl(shape));

  if (els.navAffiliate) els.navAffiliate.hidden = false;
  if (els.affiliateTabEmpty) els.affiliateTabEmpty.hidden = true;
  if (els.affiliateTabMetrics) els.affiliateTabMetrics.hidden = false;
  if (els.affiliateTabConnectButton) els.affiliateTabConnectButton.disabled = false;
  setAffiliateApplySuccess(false);
  syncAffiliateBillingButton();

  if (els.affiliateTabLinkInput) {
    els.affiliateTabLinkInput.value = referralUrl || "";
  }

  if (els.affiliateTabCode) {
    els.affiliateTabCode.textContent = code || "—";
  }

  if (els.affiliateTabClicks) {
    els.affiliateTabClicks.textContent = pickAffiliateNumber(counts, ["clicks", "clickCount", "totalClicks"]).toLocaleString();
  }
  if (els.affiliateTabSignups) {
    els.affiliateTabSignups.textContent = pickAffiliateNumber(counts, [
      "totalReferredSubscribers",
      "signups",
      "signupCount",
      "totalSignups",
      "leads",
    ]).toLocaleString();
  }
  if (els.affiliateTabConversions) {
    els.affiliateTabConversions.textContent = pickAffiliateNumber(counts, [
      "totalQualifiedSubscribers",
      "conversions",
      "conversionCount",
      "paidConversions",
      "subscribers",
    ]).toLocaleString();
  }

  if (els.affiliateTabCalculated) {
    els.affiliateTabCalculated.textContent = formatAffiliateCents(
      pickAffiliateNumber(totals, [
        "totalPayoutsCalculatedCents",
        "calculatedCents",
        "calculated_cents",
        "calculated",
      ]),
    );
  }
  if (els.affiliateTabHeld) {
    els.affiliateTabHeld.textContent = formatAffiliateCents(
      pickAffiliateNumber(totals, ["totalPayoutsHeldCents", "heldCents", "held_cents", "held"]),
    );
  }
  if (els.affiliateTabSent) {
    els.affiliateTabSent.textContent = formatAffiliateCents(
      pickAffiliateNumber(totals, ["totalPayoutsSentCents", "sentCents", "sent_cents", "sent"]),
    );
  }

  // Payment Summary
  const totalPaid = pickAffiliateNumber(totals, ["totalPayoutsSentCents", "totalPaidCents", "paidCents", "sentCents", "sent_cents", "sent"]);
  const upcomingCents = pickAffiliateNumber(totals, ["upcomingPayoutCents", "upcomingCents", "nextPayoutCents", "heldCents", "held_cents", "held"]);
  const lastPaymentCents = pickAffiliateNumber(totals, ["lastPayoutAmountCents", "lastPaymentCents", "lastPayoutCents"]);
  const lastPaymentAt = pickAffiliateText(totals, ["lastPayoutAt", "lastPaymentDate", "lastPayoutDate", "lastPaidAt"])
    || pickAffiliateText(affiliate, ["lastPayoutAt", "lastPaymentDate"]);
  const estPayoutAt = pickAffiliateText(totals, ["nextPayoutDate", "estPayoutDate", "upcomingPayoutDate", "nextPayoutAt"])
    || pickAffiliateText(affiliate, ["nextPayoutDate", "estPayoutDate"]);

  if (els.affiliateTabTotalPaid) els.affiliateTabTotalPaid.textContent = formatAffiliateCents(totalPaid);
  if (els.affiliateTabLastPayment) els.affiliateTabLastPayment.textContent = lastPaymentCents > 0 ? formatAffiliateCents(lastPaymentCents) : "\u2014";
  if (els.affiliateTabLastPaymentDate) {
    if (lastPaymentAt) {
      const d = new Date(lastPaymentAt);
      els.affiliateTabLastPaymentDate.textContent = Number.isNaN(d.getTime()) ? lastPaymentAt : d.toLocaleDateString();
    } else {
      els.affiliateTabLastPaymentDate.textContent = "";
    }
  }
  if (els.affiliateTabUpcomingPayout) els.affiliateTabUpcomingPayout.textContent = formatAffiliateCents(upcomingCents);
  if (els.affiliateTabEstPayoutDate) {
    if (estPayoutAt) {
      const d = new Date(estPayoutAt);
      els.affiliateTabEstPayoutDate.textContent = Number.isNaN(d.getTime()) ? estPayoutAt : d.toLocaleDateString();
    } else {
      els.affiliateTabEstPayoutDate.textContent = "\u2014";
    }
  }

  const stripeStatus = String(readAffiliateStripeStatus(shape)).toLowerCase();
  const chargesEnabled = readAffiliateChargesEnabled(shape);
  const payoutsEnabled = readAffiliatePayoutsEnabled(shape);

  if (els.affiliateTabStripeStatus && els.affiliateTabConnectButton) {
    els.affiliateTabConnectButton.hidden = false;
    els.affiliateTabConnectButton.disabled = false;
    els.affiliateTabConnectButton.classList.remove("btn-secondary");
    els.affiliateTabConnectButton.classList.add("btn-primary");
    if (agreementGate.required && (!agreementGate.signed || agreementGate.connectBlocked || !agreementGate.canConnectStripe)) {
      els.affiliateTabStripeStatus.textContent = agreementGate.signed
        ? "Agreement signed. Waiting for Stripe Connect access to refresh."
        : "Sign the affiliate agreement before connecting Stripe.";
      els.affiliateTabConnectButton.hidden = true;
    } else if (stripeStatus === "active" || (chargesEnabled && payoutsEnabled)) {
      els.affiliateTabStripeStatus.textContent = "Stripe connected — you're eligible for payouts.";
      els.affiliateTabConnectButton.textContent = "Manage Stripe account";
      els.affiliateTabConnectButton.classList.remove("btn-primary");
      els.affiliateTabConnectButton.classList.add("btn-secondary");
    } else if (stripeStatus === "onboarding" || stripeStatus === "pending" || stripeStatus === "restricted") {
      els.affiliateTabStripeStatus.textContent = "Stripe onboarding in progress. Finish setup to start receiving payouts.";
      els.affiliateTabConnectButton.textContent = "Continue Stripe onboarding";
    } else {
      els.affiliateTabStripeStatus.textContent = "Connect Stripe to receive your earnings.";
      els.affiliateTabConnectButton.textContent = "Connect Stripe";
    }
  }
  if (els.affiliateTabConnectStatus) {
    els.affiliateTabConnectStatus.textContent = "";
    els.affiliateTabConnectStatus.classList.remove("is-error", "is-success");
  }

  renderAffiliateReferralTable(shape);

  if (affiliateNeedsAgreementPolling(shape)) {
    persistPendingAffiliateProfile(mergedProfile);
    scheduleAffiliateAgreementPoll();
  } else {
    clearAffiliateAgreementPoll();
    clearPendingAffiliateProfile();
  }

  void ensureAffiliateReferralHistory(shape);
}

async function handleAffiliateApplyClick(event) {
  if (event) {
    event.preventDefault();
  }
  if (!els.affiliateApplyButton) return;

  const button = els.affiliateApplyButton;
  const statusEl = els.affiliateTabEmptyStatus;
  const emailGateMessage = affiliateEmailVerificationMessage();
  if (emailGateMessage) {
    syncAffiliateApplyAvailability();
    setStatus(statusEl, emailGateMessage, "is-error");
    return;
  }

  const validation = buildAffiliateSignupPayload();
  if (!validation.ok) {
    setStatus(statusEl, validation.message, "is-error");
    return;
  }

  const payload = validation.payload;
  const hasIdentity = payload.accountId || payload.canonical || payload.username || payload.email || payload.phone;

  if (!hasIdentity) {
    setStatus(statusEl, "Missing account identity. Log out and sign back in, then try again.", "is-error");
    return;
  }

  button.disabled = true;
  setAffiliateApplySuccess(false);
  setStatus(statusEl, "Submitting affiliate application...");

  try {
    const result = await affiliateSignup(payload);
    const mergedResult = mergeAffiliateProfileData(state.affiliateProfile, result, payload);
    persistPendingAffiliateProfile(mergedResult);
    setAffiliateApplySuccess(true);
    const resultShape = buildAffiliateShape(mergedResult);
    setStatus(
      statusEl,
      readAffiliateAgreementRequired(resultShape) && !readAffiliateAgreementSigned(resultShape)
        ? `Agreement sent to ${payload.email}. Open it to finish affiliate onboarding.`
        : "Affiliate profile confirmed.",
      "is-success",
    );
    window.setTimeout(() => {
      showAffiliatePanel(mergedResult);
    }, 280);
  } catch (error) {
    const message = String(error?.message || "Couldn't submit affiliate application.");
    if (/already.*affiliate|affiliate.*already|already exists|existing affiliate/i.test(message)) {
      setAffiliateApplySuccess(true);
      setStatus(statusEl, "Affiliate profile already exists. Loading your dashboard...", "is-success");
      try {
        const existing = await affiliateStatus({ ...payload, refresh: 1 });
        showAffiliatePanel(mergeAffiliateProfileData(state.affiliateProfile, existing, payload));
      } catch {
        // Leave the existing status message in place if the refresh fails.
      }
      return;
    }

    setStatus(statusEl, message, "is-error");
    button.disabled = false;
  }
}

async function loadAffiliateProfile() {
  if (affiliateProfileLoaded) return;
  affiliateProfileLoaded = true;

  const pendingProfile = readPendingAffiliateProfile();

  try {
    const body = await affiliateStatus(buildAffiliateIdentityPayload(pendingProfile?.affiliate || {}));
    const shape = buildAffiliateShape(body);
    if (body && typeof body === "object" && body.ok !== false && hasAffiliateProfile(shape)) {
      showAffiliatePanel(mergeAffiliateProfileData(pendingProfile, body));
      return;
    }
  } catch {
    // Fall through to local draft or CTA.
  }

  const pendingShape = buildAffiliateShape(pendingProfile);
  if (
    pendingProfile &&
    (hasAffiliateProfile(pendingShape) ||
      readAffiliateAgreementRequired(pendingShape) ||
      readAffiliateAgreementSigningUrl(pendingShape) ||
      readAffiliateAgreementMessage(pendingShape))
  ) {
    showAffiliatePanel(pendingProfile);
    return;
  }

  clearPendingAffiliateProfile();
  showAffiliateCta();
}

async function pollAffiliateAgreementStatus() {
  clearAffiliateAgreementPoll();
  if (affiliateAgreementPollInFlight) {
    return;
  }

  const currentShape = buildAffiliateShape(state.affiliateProfile);
  if (!affiliateNeedsAgreementPolling(currentShape)) {
    return;
  }

  const identity = buildAffiliateIdentityPayload({ refresh: 1 });
  const hasIdentity = identity.contact || identity.phone || identity.email || identity.username || identity.accountId || identity.canonical;
  if (!hasIdentity) {
    return;
  }

  affiliateAgreementPollInFlight = true;
  try {
    const body = await affiliateStatus(identity);
    if (body && typeof body === "object" && body.ok !== false) {
      showAffiliatePanel(mergeAffiliateProfileData(state.affiliateProfile, body));
    }
  } catch {
    if (affiliateNeedsAgreementPolling(buildAffiliateShape(state.affiliateProfile))) {
      scheduleAffiliateAgreementPoll();
    }
  } finally {
    affiliateAgreementPollInFlight = false;
    if (affiliateNeedsAgreementPolling(buildAffiliateShape(state.affiliateProfile)) && !affiliateAgreementPollTimer) {
      scheduleAffiliateAgreementPoll();
    }
  }
}

async function handleAffiliateAgreementResendClick() {
  if (!els.affiliateAgreementResendButton) {
    return;
  }

  const button = els.affiliateAgreementResendButton;
  const emailValidation = readConfirmedAffiliateEmail(
    els.affiliateAgreementEmailInput,
    els.affiliateAgreementConfirmEmailInput,
    { primaryLabel: "agreement email address" },
  );
  if (!emailValidation.ok) {
    setStatus(els.affiliateAgreementStatus, emailValidation.message, "is-error");
    return;
  }

  const payload = buildAffiliateIdentityPayload({
    email: emailValidation.email,
    contact: emailValidation.email,
    requestedAt: new Date().toISOString(),
    source: "dashboard_affiliate_agreement",
  });
  const hasIdentity = payload.contact || payload.phone || payload.email || payload.username || payload.accountId || payload.canonical;

  if (!hasIdentity) {
    setStatus(els.affiliateAgreementStatus, "Missing affiliate identity. Refresh and try again.", "is-error");
    return;
  }

  button.disabled = true;
  setStatus(els.affiliateAgreementStatus, "Sending a fresh agreement...");

  try {
    const result = await affiliateAgreement(payload);
    const mergedResult = mergeAffiliateProfileData(state.affiliateProfile, result, payload);
    showAffiliatePanel(mergedResult);
    persistPendingAffiliateProfile(mergedResult);
    const signingUrl = readAffiliateAgreementSigningUrl(buildAffiliateShape(mergedResult));
    setStatus(
      els.affiliateAgreementStatus,
      signingUrl ? "Fresh agreement ready. Open it to continue." : "Fresh agreement sent. Check your email.",
      "is-success",
    );
  } catch (error) {
    setStatus(els.affiliateAgreementStatus, String(error?.message || "Couldn't resend the agreement."), "is-error");
  } finally {
    button.disabled = false;
  }
}

async function handleAffiliateConnectClick() {
  if (!els.affiliateTabConnectButton) return;
  const button = els.affiliateTabConnectButton;
  const statusEl = els.affiliateTabConnectStatus;
  const currentShape = buildAffiliateShape(state.affiliateProfile);
  if (
    readAffiliateAgreementRequired(currentShape) &&
    (!readAffiliateAgreementSigned(currentShape) ||
      readAffiliateAgreementConnectBlocked(currentShape) ||
      !readAffiliateCanConnectStripe(currentShape))
  ) {
    setStatus(
      statusEl,
      readAffiliateAgreementMessage(currentShape) || "Sign the affiliate agreement before connecting Stripe.",
      "is-error",
    );
    return;
  }

  button.disabled = true;
  if (statusEl) {
    statusEl.textContent = "Requesting a fresh Stripe link...";
    statusEl.classList.remove("is-error", "is-success");
  }

  const returnUrl = dashboardTabUrl("affiliate");

  try {
    const result = await affiliateConnect(buildAffiliateIdentityPayload({ returnUrl, refreshUrl: returnUrl }));
    const mergedResult = mergeAffiliateProfileData(state.affiliateProfile, result);
    const resultShape = buildAffiliateShape(mergedResult);
    showAffiliatePanel(mergedResult);

    if (
      readAffiliateAgreementRequired(resultShape) &&
      (!readAffiliateAgreementSigned(resultShape) ||
        readAffiliateAgreementConnectBlocked(resultShape) ||
        !readAffiliateCanConnectStripe(resultShape))
    ) {
      setStatus(
        statusEl,
        readAffiliateAgreementMessage(resultShape) || "Affiliate agreement required before connecting Stripe.",
        "is-error",
      );
      button.disabled = false;
      return;
    }

    const onboardingUrl = String(
      readAffiliateOnboardingUrl(resultShape) ||
        result?.onboardingUrl ||
        result?.accountLinkUrl ||
        result?.redirectUrl ||
        result?.dashboardUrl ||
        result?.loginUrl ||
        result?.manageUrl ||
        result?.managementUrl ||
        "",
    ).trim();
    if (!onboardingUrl) {
      throw new Error("Stripe did not return an onboarding link.");
    }
    window.location.assign(onboardingUrl);
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = String(error?.message || "Couldn't start Stripe onboarding.");
      statusEl.classList.add("is-error");
    }
    button.disabled = false;
  }
}

function setStatus(target, message, type = "") {
  if (!target) {
    return;
  }

  target.textContent = message;
  target.classList.remove("is-error", "is-success");
  if (type) {
    target.classList.add(type);
  }
}

function setActiveRangeButton(rangeId) {
  els.statsRangeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.range === rangeId);
  });
}

function clearElement(node) {
  if (node) {
    node.innerHTML = "";
  }
}

function formatTrendMetricValue(value, decimals = 0, metricLabel = "") {
  return `${formatNumber(value, decimals)} ${metricLabel}`.trim();
}

function trendPaletteFor(container) {
  const id = String(container?.id || "").trim();

  if (id === "chartNutritionRows") {
    return { stroke: "#ffb65a", fill: "rgba(255, 182, 90, 0.18)", dot: "#ffd59b" };
  }
  if (id === "chartWaterRows") {
    return { stroke: "#59b9ff", fill: "rgba(89, 185, 255, 0.18)", dot: "#9bd8ff" };
  }
  if (id === "chartCombinedRows") {
    return { stroke: "#8d78ff", fill: "rgba(141, 120, 255, 0.18)", dot: "#c0afff" };
  }

  return { stroke: "#39d9c0", fill: "rgba(57, 217, 192, 0.18)", dot: "#8af1e1" };
}

function linePathFromPoints(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function areaPathFromPoints(points, baselineY) {
  if (!points.length) {
    return "";
  }

  return [
    `M ${points[0].x} ${baselineY}`,
    ...points.map((point, index) => `${index === 0 ? "L" : "L"} ${point.x} ${point.y}`),
    `L ${points[points.length - 1].x} ${baselineY}`,
    "Z",
  ].join(" ");
}

function appendTrendStat(target, label, value) {
  const stat = document.createElement("div");
  stat.className = "trend-chart-stat";

  const statLabel = document.createElement("span");
  statLabel.className = "trend-chart-stat-label";
  statLabel.textContent = label;

  const statValue = document.createElement("strong");
  statValue.className = "trend-chart-stat-value";
  statValue.textContent = value;

  stat.appendChild(statLabel);
  stat.appendChild(statValue);
  target.appendChild(stat);
}

function renderMetricBars(container, metricLabel, values, decimals = 0) {
  if (!container) {
    return;
  }

  clearElement(container);
  const safeValues = Array.isArray(values)
    ? values.map((entry) => ({
        rangeId: entry.rangeId,
        value: Number(entry.value || 0),
      }))
    : [];

  if (!safeValues.length) {
    return;
  }

  const palette = trendPaletteFor(container);
  const chart = document.createElement("div");
  chart.className = "trend-chart";
  chart.style.setProperty("--trend-stroke", palette.stroke);
  chart.style.setProperty("--trend-fill", palette.fill);
  chart.style.setProperty("--trend-dot", palette.dot);

  const summary = document.createElement("div");
  summary.className = "trend-chart-summary";

  const maxEntry = safeValues.reduce((best, entry) => (entry.value > best.value ? entry : best), safeValues[0]);
  const average = safeValues.reduce((sum, entry) => sum + entry.value, 0) / safeValues.length;
  appendTrendStat(summary, "Peak", formatTrendMetricValue(maxEntry.value, decimals, metricLabel));
  appendTrendStat(summary, "Average", formatTrendMetricValue(average, decimals, metricLabel));
  chart.appendChild(summary);

  const width = 320;
  const height = 164;
  const paddingX = 18;
  const paddingY = 16;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;
  const maxValue = Math.max(...safeValues.map((entry) => Math.max(entry.value, 0)), 1);
  const minValue = Math.min(...safeValues.map((entry) => Math.min(entry.value, 0)), 0);
  const valueSpan = Math.max(maxValue - minValue, 1);

  const points = safeValues.map((entry, index) => {
    const x = safeValues.length === 1
      ? width / 2
      : paddingX + (plotWidth * index) / (safeValues.length - 1);
    const normalized = (entry.value - minValue) / valueSpan;
    const y = height - paddingY - normalized * plotHeight;
    return { ...entry, x, y };
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "trend-chart-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Trend chart");

  for (let line = 0; line < 4; line += 1) {
    const y = paddingY + (plotHeight * line) / 3;
    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    gridLine.setAttribute("x1", String(paddingX));
    gridLine.setAttribute("x2", String(width - paddingX));
    gridLine.setAttribute("y1", String(y));
    gridLine.setAttribute("y2", String(y));
    gridLine.setAttribute("class", "trend-chart-gridline");
    svg.appendChild(gridLine);
  }

  const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
  area.setAttribute("d", areaPathFromPoints(points, height - paddingY));
  area.setAttribute("class", "trend-chart-area");
  svg.appendChild(area);

  const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  linePath.setAttribute("d", linePathFromPoints(points));
  linePath.setAttribute("class", "trend-chart-line");
  svg.appendChild(linePath);

  points.forEach((point) => {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(point.x));
    dot.setAttribute("cy", String(point.y));
    dot.setAttribute("r", "4");
    dot.setAttribute("class", "trend-chart-point");

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${RANGE_LABELS[point.rangeId] || point.rangeId.toUpperCase()}: ${formatTrendMetricValue(point.value, decimals, metricLabel)}`;
    dot.appendChild(title);
    svg.appendChild(dot);
  });

  chart.appendChild(svg);

  const axis = document.createElement("div");
  axis.className = "trend-chart-axis";
  safeValues.forEach((entry) => {
    const chip = document.createElement("div");
    chip.className = "trend-chart-chip";

    const label = document.createElement("span");
    label.className = "trend-chart-chip-label";
    label.textContent = RANGE_LABELS[entry.rangeId] || entry.rangeId.toUpperCase();

    const value = document.createElement("span");
    value.className = "trend-chart-chip-value";
    value.textContent = formatTrendMetricValue(entry.value, decimals, metricLabel);

    chip.appendChild(label);
    chip.appendChild(value);
    axis.appendChild(chip);
  });

  chart.appendChild(axis);
  container.appendChild(chart);
}

function renderCombinedBars() {
  if (!els.chartCombinedRows) {
    return;
  }

  const combinedValues = RANGE_IDS.map((rangeId) => {
    const metrics = state.metricsByRange.get(rangeId) || null;
    const workouts = metricValue(metrics?.workoutsLogged);
    const calories = metricValue(metrics?.caloriesTracked);
    const gallons = metricValue(metrics?.gallonsDrank);

    const scaledCalories = calories / 100;
    const scaledWater = gallons * 10;
    const composite = (workouts + scaledCalories + scaledWater) / 3;

    return { rangeId, value: Math.max(composite, 0) };
  });

  renderMetricBars(els.chartCombinedRows, "score", combinedValues, 1);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function recordDateKey(record) {
  const parsed = readRecordDate(record);
  if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) {
    return "";
  }
  return startOfDay(parsed).toISOString().slice(0, 10);
}

function renderHistoryHeatmap(target, entries, emptyText) {
  if (!target) {
    return;
  }

  clearElement(target);

  const safeEntries = Array.isArray(entries) ? entries : [];
  if (!safeEntries.length) {
    const empty = document.createElement("p");
    empty.className = "stats-status";
    empty.textContent = emptyText;
    target.appendChild(empty);
    return;
  }

  const counts = new Map();
  safeEntries.forEach((entry) => {
    const key = recordDateKey(entry);
    if (!key) {
      return;
    }
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const today = startOfDay(new Date());
  const cells = [];
  for (let offset = 83; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    cells.push(day);
  }

  const maxCount = Math.max(
    1,
    ...cells.map((day) => counts.get(day.toISOString().slice(0, 10)) || 0),
  );

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

function renderHistoryHeatmaps() {
  const history = state.backendSnapshot?.history || {};
  renderHistoryHeatmap(els.workoutHeatmap, history.workouts, "Workout history unavailable from backend.");
  renderHistoryHeatmap(els.nutritionHeatmap, history.nutrition, "Nutrition history unavailable from backend.");
  renderHistoryHeatmap(els.waterHeatmap, history.water, "Water history unavailable from backend.");
}

function computeCustomRangeMetricsFromHistory(history, sheetUrl, fromDate, toDate) {
  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T23:59:59.999`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  let workoutsLogged = 0;
  let caloriesTracked = 0;
  let gallonsDrank = 0;

  const workouts = Array.isArray(history?.workouts) ? history.workouts : [];
  const nutrition = Array.isArray(history?.nutrition) ? history.nutrition : [];
  const water = Array.isArray(history?.water) ? history.water : [];

  workouts.forEach((entry) => {
    const date = readRecordDate(entry);
    if (date && date >= start && date <= end) {
      workoutsLogged += 1;
    }
  });

  nutrition.forEach((entry) => {
    const date = readRecordDate(entry);
    if (!date || date < start || date > end) {
      return;
    }
    const calories = firstFiniteNumber(entry, ["calories", "kcal", "totalCalories", "caloriesTracked", "value"]);
    caloriesTracked += calories || 0;
  });

  water.forEach((entry) => {
    const date = readRecordDate(entry);
    if (!date || date < start || date > end) {
      return;
    }

    const gallons =
      firstFiniteNumber(entry, ["gallons", "gallonsDrank", "waterGallons"]) ??
      (() => {
        const ounces = firstFiniteNumber(entry, ["ounces", "oz", "waterOz"]);
        if (ounces !== null) {
          return ounces / 128;
        }
        const ml = firstFiniteNumber(entry, ["ml", "milliliters"]);
        if (ml !== null) {
          return ml / 3785.41;
        }
        return 0;
      })();

    gallonsDrank += gallons || 0;
  });

  return {
    requestedWindow: "custom",
    generatedAt: new Date().toISOString(),
    masterLogSheetUrl: sheetUrl || state.currentSheetUrl || "",
    usersUsingToday: metricRecordFromSnapshot(0, sheetUrl),
    totalUsersThisWeek: metricRecordFromSnapshot(0, sheetUrl),
    usersOnline: metricRecordFromSnapshot(0, sheetUrl),
    workoutsLogged: metricRecordFromSnapshot(workoutsLogged, sheetUrl),
    caloriesTracked: metricRecordFromSnapshot(caloriesTracked, sheetUrl),
    gallonsDrank: metricRecordFromSnapshot(gallonsDrank, sheetUrl),
  };
}

function normalizeBodyEntries(body) {
  const rows = Array.isArray(body)
    ? body
    : body?.measurements ||
      body?.entries ||
      body?.data?.measurements ||
      body?.data?.entries ||
      body?.bodyMeasures ||
      [];

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => ({
      date: String(row?.date || row?.recordedAt || row?.createdAt || "").trim(),
      weight: Number(row?.weight ?? row?.weightLb ?? row?.bodyWeight ?? NaN),
      bodyFat: Number(row?.bodyFat ?? row?.bodyFatPct ?? NaN),
      waist: Number(row?.waist ?? row?.waistIn ?? NaN),
      glute: Number(row?.glute ?? row?.hips ?? row?.hipIn ?? NaN),
    }))
    .filter((row) => row.date || [row.weight, row.bodyFat, row.waist, row.glute].some(Number.isFinite))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

async function fetchBodyMeasures() {
  const endpoints = ["/api/body-measures", "/api/account/body-measures", `${API_BASE}/api/body-measures`];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetchAuthedApi(endpoint);

      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok || (body && typeof body === "object" && "ok" in body && !body.ok)) {
        throw new Error(body?.error || body?.message || `Body measures request failed (${response.status})`);
      }

      const entries = normalizeBodyEntries(body);
      return entries;
    } catch (error) {
      lastError = normalizeRequestError(error);
    }
  }

  if (lastError) {
    return [];
  }

  return [];
}

function renderBodyMeasures() {
  if (!els.bodyMeasureRows) {
    return;
  }

  clearElement(els.bodyMeasureRows);

  const entries = state.bodyMeasures;
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "stats-status";
    empty.textContent = "Body measures unavailable from backend.";
    els.bodyMeasureRows.appendChild(empty);
    return;
  }

  const latest = entries[entries.length - 1];
  const first = entries[0];

  const metrics = [
    { key: "weight", label: "Weight", unit: "lb" },
    { key: "bodyFat", label: "Body Fat", unit: "%" },
    { key: "waist", label: "Waist", unit: "in" },
    { key: "glute", label: "Glute/Hips", unit: "in" },
  ];

  metrics.forEach((metric) => {
    const latestValue = Number(latest?.[metric.key]);
    const firstValue = Number(first?.[metric.key]);

    if (!Number.isFinite(latestValue) && !Number.isFinite(firstValue)) {
      return;
    }

    const delta = Number.isFinite(latestValue) && Number.isFinite(firstValue) ? latestValue - firstValue : null;
    const row = document.createElement("div");
    row.className = "measure-row";

    const left = document.createElement("span");
    left.textContent = `${metric.label}: ${Number.isFinite(latestValue) ? formatNumber(latestValue, 1) : "-"} ${metric.unit}`;

    const right = document.createElement("span");
    if (delta === null) {
      right.textContent = "delta -";
    } else {
      const sign = delta > 0 ? "+" : "";
      right.textContent = `delta ${sign}${formatNumber(delta, 1)} ${metric.unit}`;
    }

    row.appendChild(left);
    row.appendChild(right);
    els.bodyMeasureRows.appendChild(row);
  });
}

function renderStatsMetrics(data, rangeId, customLabel = "") {
  const workouts = metricValue(data?.workoutsLogged);
  const calories = metricValue(data?.caloriesTracked);
  const gallons = metricValue(data?.gallonsDrank);

  if (els.statsWorkoutsValue) {
    els.statsWorkoutsValue.textContent = formatNumber(workouts);
  }

  if (els.statsCaloriesValue) {
    els.statsCaloriesValue.textContent = formatNumber(calories);
  }

  if (els.statsGallonsValue) {
    els.statsGallonsValue.textContent = formatNumber(gallons, 1);
  }

  if (els.statsWindowLabel) {
    const label = customLabel || RANGE_LABELS[rangeId] || rangeId.toUpperCase();
    els.statsWindowLabel.textContent = `Range: ${label}`;
  }

  if (els.statsGeneratedAtValue) {
    els.statsGeneratedAtValue.textContent = data?.generatedAt ? formatTimestamp(data.generatedAt) : "Unknown";
  }

  const sheetUrl = data?.masterLogSheetUrl || data?.sheetUrl || data?.workoutsLogged?.sheetUrl || state.currentSheetUrl || "";
  if (sheetUrl) {
    state.currentSheetUrl = sheetUrl;
  }

  if (els.statsSheetLink) {
    els.statsSheetLink.href = sheetUrl || "#";
  }

  renderSheetLink();
}

function renderAllCharts() {
  const workoutSeries = RANGE_IDS.map((rangeId) => ({
    rangeId,
    value: metricValue(state.metricsByRange.get(rangeId)?.workoutsLogged),
  }));

  const nutritionSeries = RANGE_IDS.map((rangeId) => ({
    rangeId,
    value: metricValue(state.metricsByRange.get(rangeId)?.caloriesTracked),
  }));

  const waterSeries = RANGE_IDS.map((rangeId) => ({
    rangeId,
    value: metricValue(state.metricsByRange.get(rangeId)?.gallonsDrank),
  }));

  renderMetricBars(els.chartWorkoutsRows, "", workoutSeries, 0);
  renderMetricBars(els.chartNutritionRows, "", nutritionSeries, 0);
  renderMetricBars(els.chartWaterRows, "", waterSeries, 1);
  renderCombinedBars();
  renderBodyMeasures();
}

async function primeRangeMetrics() {
  if (state.metricsByRange.size >= RANGE_IDS.length) {
    return;
  }

  if (!state.backendSnapshot) {
    return;
  }

  const metricsByRange = computeHistoryMetricsByRange(
    state.backendSnapshot?.history || {},
    state.backendSnapshot?.sheetUrl || state.userSheetUrl || "",
  );
  metricsByRange.forEach((metrics, rangeId) => {
    state.metricsByRange.set(rangeId, metrics);
  });
}

function normalizeCustomRangeBody(body) {
  const root = body?.data && typeof body.data === "object" ? body.data : body;

  const workouts = Number(root?.workoutsLogged ?? root?.workouts ?? root?.metrics?.workoutsLogged ?? root?.metrics?.workouts ?? NaN);
  const calories = Number(root?.caloriesTracked ?? root?.calories ?? root?.metrics?.caloriesTracked ?? root?.metrics?.calories ?? NaN);
  const gallons = Number(root?.gallonsDrank ?? root?.waterGallons ?? root?.metrics?.gallonsDrank ?? root?.metrics?.waterGallons ?? NaN);
  const users = Number(root?.usersActive ?? root?.activeUsers ?? root?.users ?? root?.metrics?.usersActive ?? NaN);

  if (![workouts, calories, gallons, users].some(Number.isFinite)) {
    return null;
  }

  const sheetUrl = String(root?.sheetUrl || root?.masterLogSheetUrl || "").trim() || null;

  return {
    requestedWindow: "custom",
    generatedAt: root?.generatedAt || new Date().toISOString(),
    masterLogSheetUrl: sheetUrl,
    workoutsLogged: { value: Number.isFinite(workouts) ? workouts : 0, sheetUrl },
    caloriesTracked: { value: Number.isFinite(calories) ? calories : 0, sheetUrl },
    gallonsDrank: { value: Number.isFinite(gallons) ? gallons : 0, sheetUrl },
    usersUsingToday: { value: Number.isFinite(users) ? users : 0, sheetUrl },
  };
}

async function fetchCustomRangeMetrics(fromDate, toDate) {
  if (state.backendSnapshot?.history) {
    const customMetrics = computeCustomRangeMetricsFromHistory(
      state.backendSnapshot.history,
      state.backendSnapshot.sheetUrl || state.userSheetUrl || "",
      fromDate,
      toDate,
    );
    if (customMetrics) {
      return customMetrics;
    }
  }

  const query = new URLSearchParams({ from: fromDate, to: toDate }).toString();
  const endpoints = [`/api/stats/range?${query}`, `/api/dashboard/stats/range?${query}`, `${API_BASE}/api/stats/range?${query}`];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetchAuthedApi(endpoint);

      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok || (body && typeof body === "object" && "ok" in body && !body.ok)) {
        throw new Error(body?.error || body?.message || `Range request failed (${response.status})`);
      }

      const normalized = normalizeCustomRangeBody(body);
      if (!normalized) {
        throw new Error("Range endpoint returned no usable metrics.");
      }

      return normalized;
    } catch (error) {
      lastError = normalizeRequestError(error);
    }
  }

  throw lastError || new Error("Custom range endpoint is unavailable.");
}

async function loadRange(rangeId) {
  state.activeRange = rangeId;
  setActiveRangeButton(rangeId);
  setStatus(els.statsRangeStatus, "Loading stats...");

  try {
    await primeRangeMetrics();
    const metrics = state.metricsByRange.get(rangeId);
    if (!metrics) {
      throw new Error("User-specific stats are unavailable from backend.");
    }

    renderStatsMetrics(metrics, rangeId);
    renderAllCharts();
    setStatus(els.statsRangeStatus, `Loaded ${RANGE_LABELS[rangeId]} stats.`, "is-success");
  } catch (error) {
    setStatus(els.statsRangeStatus, String(error?.message || "Unable to load stats."), "is-error");
  }
}

async function applyCustomRange() {
  const fromDate = String(els.statsFromDate?.value || "").trim();
  const toDate = String(els.statsToDate?.value || "").trim();

  if (!fromDate || !toDate) {
    setStatus(els.statsRangeStatus, "Select both From and To dates.", "is-error");
    return;
  }

  if (fromDate > toDate) {
    setStatus(els.statsRangeStatus, "From date must be before To date.", "is-error");
    return;
  }

  state.activeRange = "custom";
  setActiveRangeButton("");
  setStatus(els.statsRangeStatus, "Loading custom range...");

  try {
    const customMetrics = await fetchCustomRangeMetrics(fromDate, toDate);
    renderStatsMetrics(customMetrics, "custom", `${fromDate} to ${toDate}`);
    setStatus(els.statsRangeStatus, `Loaded custom range ${fromDate} to ${toDate}.`, "is-success");
  } catch (error) {
    setStatus(els.statsRangeStatus, String(error?.message || "Custom range unavailable."), "is-error");
  }
}

function wireStatsControls() {
  els.statsRangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      void loadRange(button.dataset.range);
    });
  });

  if (els.applyCustomRangeButton) {
    els.applyCustomRangeButton.addEventListener("click", () => {
      void applyCustomRange();
    });
  }
}

function normalizeRankBody(body) {
  const root = body?.data && typeof body.data === "object" ? body.data : body;
  const rank = Number(root?.rank ?? root?.leaderboardRank ?? root?.position ?? NaN);
  return Number.isFinite(rank) ? Math.max(1, Math.round(rank)) : null;
}

async function fetchLeaderboardRank() {
  const user = readAuthUser();
  const key = user?.username || user?.canonical || user?.accountId || "";
  if (!key) {
    return null;
  }

  const query = new URLSearchParams({ user: key }).toString();
  const endpoints = [
    `/api/leaderboard/rank?${query}`,
    `/api/stats/rank?${query}`,
    `${API_BASE}/api/leaderboard/rank?${query}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetchAuthedApi(endpoint);

      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok || (body && typeof body === "object" && "ok" in body && !body.ok)) {
        continue;
      }

      const rank = normalizeRankBody(body);
      if (rank) {
        return rank;
      }
    } catch {
      // try fallback
    }
  }

  try {
    const leaderboard = await fetchWorkoutLeaderboard();
    const names = [];

    (leaderboard?.entries || []).forEach((entry, index) => {
      names.push({ name: String(entry?.name || "").toLowerCase(), rank: index + 1 });
    });

    (leaderboard?.groupEntries || []).forEach((entry, index) => {
      names.push({ name: String(entry?.name || "").toLowerCase(), rank: index + 1 });
    });

    const candidates = [user?.username, user?.canonical, user?.email].map((value) => String(value || "").toLowerCase()).filter(Boolean);

    for (const candidate of candidates) {
      const match = names.find((entry) => entry.name && (entry.name === candidate || entry.name.includes(candidate)));
      if (match) {
        return match.rank;
      }
    }
  } catch {
    // keep null
  }

  return null;
}

async function loadLeaderboardRank() {
  if (els.leaderboardLink) {
    els.leaderboardLink.href = LEADERBOARD_URL;
  }

  if (els.leaderboardRankValue) {
    els.leaderboardRankValue.textContent = "Loading...";
  }

  const rank = await fetchLeaderboardRank();
  state.leaderboardRank = rank;

  if (els.leaderboardRankValue) {
    els.leaderboardRankValue.textContent = rank ? `#${rank}` : "Unranked";
  }
}

function buildExportPayload() {
  const snapshot = state.backendSnapshot || {};
  const history = snapshot.history || {};
  return {
    exportedAt: new Date().toISOString(),
    profile: snapshot.profile || {},
    workouts: history.workouts || [],
    nutrition: history.nutrition || [],
    water: history.water || [],
    bodyMetrics: history.bodyMetrics || [],
    bodyMeasures: history.bodyMeasures || [],
    bloodWork: history.bloodWork || [],
    goals: state.goals || {},
  };
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function convertExportToCsv(payload) {
  const lines = [];
  
  // Workouts
  lines.push("# Workouts");
  lines.push("date,exercise,sets,reps,weight,weight_unit,type,seconds");
  for (const w of payload.workouts || []) {
    lines.push([
      csvEscape((w.date || "").slice(0,10)),
      csvEscape(w.exercise_name || w.exercise || ""),
      csvEscape(w.sets ?? ""),
      csvEscape(w.reps ?? w.count ?? ""),
      csvEscape(w.weight ?? ""),
      csvEscape(w.weight_unit || ""),
      csvEscape(w.type || ""),
      csvEscape(w.seconds ?? ""),
    ].join(","));
  }
  
  // Nutrition
  lines.push("");
  lines.push("# Nutrition");
  lines.push("date,description,calories,protein,carbs,fats,fiber,sugar,sodium");
  for (const n of payload.nutrition || []) {
    lines.push([
      csvEscape(String(n.timestamp || n.date || "").slice(0,10)),
      csvEscape(n.description || n.name || ""),
      csvEscape(n.calories ?? n.kcal ?? n.kcals ?? ""),
      csvEscape(n.protein ?? ""),
      csvEscape(n.carbs ?? ""),
      csvEscape(n.fats ?? ""),
      csvEscape(n.fiber ?? ""),
      csvEscape(n.sugar ?? ""),
      csvEscape(n.sodium ?? ""),
    ].join(","));
  }
  
  // Water
  lines.push("");
  lines.push("# Water");
  lines.push("date,amount_oz");
  for (const w of payload.water || []) {
    lines.push([
      csvEscape(String(w.timestamp || w.date || "").slice(0,10)),
      csvEscape(w.amount ?? w.ounces ?? w.oz ?? ""),
    ].join(","));
  }
  
  // Body metrics
  lines.push("");
  lines.push("# Body Metrics");
  if ((payload.bodyMetrics || []).length) {
    const keys = new Set();
    for (const bm of payload.bodyMetrics || []) Object.keys(bm).forEach(k => keys.add(k));
    const cols = ["date", ...Array.from(keys).filter(k => !["id","date","timestamp","canonical_contact","loggedAt","recordedAt","createdAt","time"].includes(k))];
    lines.push(cols.join(","));
    for (const bm of payload.bodyMetrics || []) {
      lines.push(cols.map(c => csvEscape(bm[c] ?? "")).join(","));
    }
  }
  
  // Body measures (legacy format)
  if ((payload.bodyMeasures || []).length) {
    lines.push("");
    lines.push("# Body Measures (Legacy)");
    lines.push("date,weight,bodyFat,waist,glute");
    for (const bm of payload.bodyMeasures || []) {
      lines.push([
        csvEscape(bm.date || ""),
        csvEscape(bm.weight ?? ""),
        csvEscape(bm.bodyFat ?? ""),
        csvEscape(bm.waist ?? ""),
        csvEscape(bm.glute ?? ""),
      ].join(","));
    }
  }
  
  return lines.join("\n");
}

// ---- IMPORT ----

const IMPORT_FORMATS = {
  myfitnesspal: {
    name: "MyFitnessPal",
    detect: (headers, rows) => {
      const h = headers.map(h => h.toLowerCase());
      return h.includes("date") && (h.includes("calories") || h.includes("meal"));
    },
    parse: (rows, headers) => {
      const h = headers.map(h => h.toLowerCase());
      const col = (name) => h.indexOf(name);
      const dateCol = col("date");
      const calCol = col("calories");
      const descCol = col("description") >= 0 ? col("description") : col("food") >= 0 ? col("food") : col("item");
      const proCol = col("protein"); const carbCol = col("carbs") >= 0 ? col("carbs") : col("carbohydrates");
      const fatCol = col("fat"); const fibCol = col("fiber"); const sugCol = col("sugar"); const sodCol = col("sodium");
      return rows.slice(1).filter(r => r[calCol]).map(r => ({
        type: "nutrition",
        date: String(r[dateCol] || "").trim(),
        description: String(r[descCol] || "").trim(),
        calories: parseFloat(r[calCol]) || 0,
        protein: parseFloat(r[proCol]) || 0,
        carbs: parseFloat(r[carbCol]) || 0,
        fats: parseFloat(r[fatCol]) || 0,
        fiber: parseFloat(r[fibCol]) || 0,
        sugar: parseFloat(r[sugCol]) || 0,
        sodium: parseFloat(r[sodCol]) || 0,
      })).filter(e => e.description);
    }
  },
  cronometer: {
    name: "Cronometer",
    detect: (headers) => {
      const h = headers.map(h => h.toLowerCase());
      return h.includes("day") && h.includes("food") && h.includes("energy (kcal)");
    },
    parse: (rows, headers) => {
      const h = headers.map(h => h.toLowerCase());
      const col = (name) => h.indexOf(name);
      return rows.slice(1).filter(r => r[col("day")]).map(r => ({
        type: "nutrition",
        date: String(r[col("day")] || "").trim(),
        description: String(r[col("food")] || "").trim(),
        calories: parseFloat(r[col("energy (kcal)")]) || 0,
        protein: parseFloat(r[col("protein (g)")]) || 0,
        carbs: parseFloat(r[col("carbs (g)")]) || 0,
        fats: parseFloat(r[col("fat (g)")]) || 0,
      })).filter(e => e.description);
    }
  },
  hevy: {
    name: "Hevy / Strong",
    detect: (headers) => {
      const h = headers.map(h => h.toLowerCase());
      return h.includes("exercise_name") && h.includes("reps") ||
             (h.includes("exercise") && h.includes("weight_kg") || h.includes("weight_lbs"));
    },
    parse: (rows, headers) => {
      const h = headers.map(h => h.toLowerCase());
      const col = (name) => h.indexOf(name);
      const exCol = col("exercise_name") >= 0 ? col("exercise_name") : col("exercise");
      const dateCol = col("date") >= 0 ? col("date") : col("workout_date") >= 0 ? col("workout_date") : col("start_time");
      const setsCol = col("sets") >= 0 ? col("sets") : col("set_order");
      const repsCol = col("reps");
      const wtCol = col("weight_kg") >= 0 ? col("weight_kg") : col("weight_lbs") >= 0 ? col("weight_lbs") : col("weight");
      const wtUnitCol = col("weight_unit");
      return rows.slice(1).filter(r => r[exCol]).map(r => ({
        type: "workout",
        date: String(r[dateCol] || "").trim().slice(0,10),
        exercise: String(r[exCol] || "").trim(),
        sets: parseInt(r[setsCol]) || 1,
        reps: parseInt(r[repsCol]) || 0,
        weight: parseFloat(r[wtCol]) || 0,
        weightUnit: r[wtUnitCol] || (h.includes("weight_lbs") ? "lb" : "kg"),
      })).filter(e => e.exercise);
    }
  },
  generic: {
    name: "Generic CSV",
    detect: () => true,
    parse: (rows, headers) => {
      const h = headers.map(h => h.toLowerCase());
      const dateCol = h.indexOf("date") >= 0 ? h.indexOf("date") : 0;
      const type = h.includes("calories") || h.includes("protein") ? "nutrition" :
                   h.includes("exercise") || h.includes("reps") ? "workout" :
                   h.includes("amount") || h.includes("oz") ? "water" : "unknown";
      return rows.slice(1).filter(r => r[dateCol]).map(r => ({ type, raw: r }));
    }
  }
};

function detectImportFormat(headers, rows) {
  for (const [key, fmt] of Object.entries(IMPORT_FORMATS)) {
    if (key === "generic") continue;
    if (fmt.detect(headers, rows)) return key;
  }
  return "generic";
}

function parseImportCSV(text) {
  const lines = text.split(/\n/).filter(l => l.trim() && !l.trim().startsWith("#"));
  if (!lines.length) return null;
  const headers = lines[0].split(/[,\t]/).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  const rows = lines.map(l => l.split(/[,\t]/).map(c => c.trim().replace(/^"|"$/g, "")));
  const formatKey = detectImportFormat(headers, rows);
  const format = IMPORT_FORMATS[formatKey];
  const entries = format.parse(rows, headers);
  return { formatKey, formatName: format.name, entries, headers, rows };
}

function wireImport() {
  const dropZone = document.getElementById("importDropZone");
  const fileInput = document.getElementById("importFileInput");
  const detected = document.getElementById("importDetected");
  const status = document.getElementById("importStatus");
  if (!dropZone || !fileInput) return;

  let pendingEntries = [];
  let pendingFormat = "";

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseImportCSV(reader.result);
      if (!result) {
        if (status) setStatus(status, "Could not parse CSV file.", "is-error");
        return;
      }
      pendingEntries = result.entries;
      pendingFormat = result.formatName;
      const srcEl = document.getElementById("importDetectedSource");
      const countEl = document.getElementById("importDetectedCount");
      const preview = document.getElementById("importPreview");
      if (srcEl) srcEl.textContent = result.formatName;
      if (countEl) countEl.textContent = result.entries.length;
      if (preview) {
        preview.innerHTML = result.entries.slice(0, 8).map(e =>
          `<div>${csvEscape(e.type)} | ${csvEscape(e.date || "?")} | ${csvEscape(e.description || e.exercise || e.raw?.[0] || "?")}</div>`
        ).join("");
        if (result.entries.length > 8) preview.innerHTML += `<div>... and ${result.entries.length - 8} more</div>`;
      }
      if (detected) detected.hidden = false;
    };
    reader.readAsText(file);
  };

  dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("import-dragover"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("import-dragover"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("import-dragover");
    handleFile(e.dataTransfer.files[0]);
  });
  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));

  const startBtn = document.getElementById("importStartButton");
  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      const dryRun = document.getElementById("importDryRun")?.checked ?? true;
      if (!pendingEntries.length) return;
      startBtn.disabled = true;
      if (status) setStatus(status, `Importing ${pendingEntries.length} entries...`, "");
      
      const token = readSessionToken();
      try {
        const res = await fetch(`${API_BASE}/api/import/csv`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            entries: pendingEntries,
            source: pendingFormat,
            dryRun,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || `Server error (${res.status})`);
        
        if (dryRun) {
          if (status) setStatus(status, `Preview: ${data.count} entries ready to import. Uncheck "Preview only" to save.`, "is-success");
        } else {
          if (status) setStatus(status, `Imported ${data.count} entries successfully!`, "is-success");
          // Reload the portal to reflect new data
          if (typeof loadBackendUserSnapshot === "function") {
            loadBackendUserSnapshot().then(() => renderAccountInfo());
          }
        }
      } catch (err) {
        if (status) setStatus(status, err?.message || "Import failed.", "is-error");
      } finally {
        startBtn.disabled = false;
      }
    });
  }
}

function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function wireExport() {
  if (els.exportCsvButton) {
    els.exportCsvButton.addEventListener("click", () => {
      try {
        const payload = buildExportPayload();
        const csv = convertExportToCsv(payload);
        const workoutCount = (payload.workouts || []).length;
        const nutritionCount = (payload.nutrition || []).length;
        const waterCount = (payload.water || []).length;
        triggerDownload(`tracker-export-${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
        setStatus(els.exportStatus, `Exported ${workoutCount} workouts, ${nutritionCount} nutrition, ${waterCount} water entries.`, "is-success");
      } catch (err) {
        setStatus(els.exportStatus, "Export failed: " + (err?.message || "unknown error"), "is-error");
      }
    });
  }

  if (els.exportJsonButton) {
    els.exportJsonButton.addEventListener("click", () => {
      try {
        const payload = buildExportPayload();
        const json = JSON.stringify(payload, null, 2);
        triggerDownload(`tracker-export-${Date.now()}.json`, json, "application/json;charset=utf-8");
        setStatus(els.exportStatus, "JSON exported.", "is-success");
      } catch (err) {
        setStatus(els.exportStatus, "Export failed: " + (err?.message || "unknown error"), "is-error");
      }
    });
  }
}

async function postAuthedJson(endpoints, payload) {
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetchAuthedApi(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok || (body && typeof body === "object" && "ok" in body && !body.ok)) {
        throw new Error(body?.error || body?.message || `Request failed (${response.status})`);
      }

      return body;
    } catch (error) {
      lastError = normalizeRequestError(error);
    }
  }

  throw lastError || new Error("Request failed.");
}

async function getAuthedJson(endpoints) {
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetchAuthedApi(endpoint, {
        method: "GET",
      });

      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok || (body && typeof body === "object" && "ok" in body && !body.ok)) {
        throw new Error(body?.error || body?.message || `Request failed (${response.status})`);
      }

      return body;
    } catch (error) {
      lastError = normalizeRequestError(error);
    }
  }

  throw lastError || new Error("Request failed.");
}

function deriveBillingStatus(payload) {
  const candidates = [
    payload?.membership?.status,
    payload?.billing?.status,
    payload?.billing?.subscriptionStatus,
    payload?.profile?.stripeSubscriptionStatus,
    payload?.profile?.subscriptionStatus,
    payload?.billingStatus,
    payload?.subscriptionStatus,
    payload?.status,
    payload?.subscription?.status,
    payload?.portal?.membership?.status,
    payload?.portal?.billing?.status,
    payload?.portal?.billingStatus,
    payload?.portal?.subscriptionStatus,
    payload?.portal?.status,
    payload?.portal?.subscription?.status,
    payload?.data?.billingStatus,
    payload?.data?.subscriptionStatus,
    payload?.data?.status,
    payload?.data?.subscription?.status,
  ];

  for (const value of candidates) {
    const normalized = String(value || "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function deriveBillingPlan(payload) {
  const candidates = [
    payload?.membership?.plan,
    payload?.membership?.planName,
    payload?.membership?.selectedPlan,
    payload?.billing?.plan,
    payload?.billing?.selectedPlan,
    payload?.profile?.stripePlanKey,
    payload?.profile?.currentPlan,
    payload?.profile?.planKey,
    payload?.plan,
    payload?.planName,
    payload?.priceNickname,
    payload?.subscription?.plan,
    payload?.subscription?.priceNickname,
    payload?.subscription?.interval,
    payload?.portal?.membership?.plan,
    payload?.portal?.billing?.plan,
    payload?.portal?.plan,
    payload?.portal?.planName,
    payload?.portal?.priceNickname,
    payload?.portal?.subscription?.plan,
    payload?.portal?.subscription?.priceNickname,
    payload?.portal?.subscription?.interval,
    payload?.data?.plan,
    payload?.data?.planName,
    payload?.data?.priceNickname,
  ];

  for (const value of candidates) {
    const normalized = String(value || "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function deriveCancelAtPeriodEnd(payload) {
  const candidates = [
    payload?.cancelAtPeriodEnd,
    payload?.profile?.stripeCancelAtPeriodEnd,
    payload?.membership?.stripeCancelAtPeriodEnd,
    payload?.billing?.cancelAtPeriodEnd,
    payload?.subscription?.cancelAtPeriodEnd,
    payload?.subscription?.cancel_at_period_end,
    payload?.portal?.cancelAtPeriodEnd,
  ];

  for (const value of candidates) {
    if (value === true || value === false) {
      return value;
    }
  }
  return null;
}

function deriveCurrentPeriodEnd(payload) {
  const candidates = [
    payload?.currentPeriodEnd,
    payload?.profile?.stripeCurrentPeriodEnd,
    payload?.profile?.currentPeriodEnd,
    payload?.profile?.current_period_end,
    payload?.membership?.stripeCurrentPeriodEnd,
    payload?.membership?.currentPeriodEnd,
    payload?.membership?.trialEnd,
    payload?.membership?.nextBillingDate,
    payload?.subscription?.currentPeriodEnd,
    payload?.subscription?.current_period_end,
  ];

  for (const value of candidates) {
    const raw = String(value || "").trim();
    if (raw) {
      return raw;
    }
  }
  return "";
}

function deriveLastPaymentDate(payload) {
  const candidates = [
    payload?.lastPaymentDate,
    payload?.lastPaymentAt,
    payload?.latestPaymentDate,
    payload?.latestInvoicePaidAt,
    payload?.lastInvoicePaidAt,
    payload?.membership?.lastPaymentDate,
    payload?.membership?.lastPaymentAt,
    payload?.membership?.latestPaymentDate,
    payload?.membership?.latestInvoicePaidAt,
    payload?.membership?.lastInvoicePaidAt,
    payload?.billing?.lastPaymentDate,
    payload?.billing?.lastPaymentAt,
    payload?.billing?.latestPaymentDate,
    payload?.billing?.latestInvoicePaidAt,
    payload?.billing?.lastInvoicePaidAt,
    payload?.subscription?.lastPaymentDate,
    payload?.subscription?.lastPaymentAt,
    payload?.subscription?.latestInvoicePaidAt,
    payload?.subscription?.lastInvoicePaidAt,
    payload?.portal?.lastPaymentDate,
    payload?.portal?.lastPaymentAt,
    payload?.portal?.membership?.lastPaymentDate,
    payload?.portal?.membership?.latestInvoicePaidAt,
    payload?.portal?.billing?.lastPaymentDate,
    payload?.portal?.billing?.latestInvoicePaidAt,
    payload?.data?.lastPaymentDate,
    payload?.data?.lastPaymentAt,
    payload?.data?.latestInvoicePaidAt,
  ];

  for (const value of candidates) {
    const raw = String(value || "").trim();
    if (raw) {
      return raw;
    }
  }

  return "";
}

function deriveNextBillingDate(payload) {
  const direct = deriveCurrentPeriodEnd(payload);
  if (direct) {
    return direct;
  }

  const candidates = [
    payload?.nextBillingDate,
    payload?.nextInvoiceDate,
    payload?.nextChargeDate,
    payload?.membership?.nextBillingDate,
    payload?.membership?.nextInvoiceDate,
    payload?.membership?.nextChargeDate,
    payload?.billing?.nextBillingDate,
    payload?.billing?.nextInvoiceDate,
    payload?.subscription?.nextBillingDate,
    payload?.subscription?.nextInvoiceDate,
    payload?.subscription?.current_period_end,
    payload?.portal?.nextBillingDate,
    payload?.portal?.membership?.nextBillingDate,
    payload?.portal?.billing?.nextBillingDate,
    payload?.data?.nextBillingDate,
    payload?.data?.nextInvoiceDate,
  ];

  for (const value of candidates) {
    const raw = String(value || "").trim();
    if (raw) {
      return raw;
    }
  }

  return "";
}

function formatBillingDate(raw) {
  if (raw === null || raw === undefined || raw === "") return "";

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toLocaleDateString();
  }

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && /^\d+$/.test(String(raw).trim())) {
    const ms = numeric > 1e12 ? numeric : numeric * 1000;
    const parsedNumeric = new Date(ms);
    if (!Number.isNaN(parsedNumeric.getTime())) {
      return parsedNumeric.toLocaleDateString();
    }
  }

  // Already a Date-style string (e.g. "6/10/2026")
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(raw))) {
    return raw;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString();
  }
  return raw;
}

function deriveBillingPortalUrl(payload) {
  const candidates = [
    payload?.stripeBillingUrl,
    payload?.billingPortalUrl,
    payload?.portalUrl,
    payload?.manageUrl,
    payload?.url,
    payload?.membership?.stripeBillingUrl,
    payload?.membership?.billingPortalUrl,
    payload?.membership?.portalUrl,
    payload?.membership?.manageUrl,
    payload?.profile?.stripeBillingUrl,
    payload?.profile?.billingPortalUrl,
    payload?.profile?.portalUrl,
    payload?.profile?.manageUrl,
    payload?.portal?.stripeBillingUrl,
    payload?.portal?.billingPortalUrl,
    payload?.portal?.portalUrl,
    payload?.portal?.manageUrl,
    payload?.portal?.url,
    payload?.data?.stripeBillingUrl,
    payload?.data?.billingPortalUrl,
    payload?.data?.portalUrl,
    payload?.data?.manageUrl,
    payload?.data?.url,
  ];

  for (const value of candidates) {
    const normalized = String(value || "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function persistBillingOverview(status, plan = "", lastPaymentDate = "", nextBillingDate = "") {
  const normalized = String(status || "").trim();
  const normalizedPlan = String(plan || "").trim();
  const normalizedLastPaymentDate = String(lastPaymentDate || "").trim();
  const normalizedNextBillingDate = String(nextBillingDate || "").trim();
  if (!normalized && !normalizedPlan && !normalizedLastPaymentDate && !normalizedNextBillingDate) {
    return;
  }

  try {
    const user = readAuthUser();
    if (!user) {
      return;
    }
    if (normalized) {
      user.billingStatus = normalized;
    }
    if (normalizedPlan) {
      user.billingPlan = normalizedPlan;
    }
    user.billingLastPaymentDate = normalizedLastPaymentDate;
    user.billingNextBillingDate = normalizedNextBillingDate;
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    window.localStorage.setItem(AUTH_FLAG_KEY, "true");
  } catch {
    // Ignore storage failures.
  }
}

// Set of subscription statuses that mean "actually subscribed". Anything
// outside this set (checkout_pending, incomplete, etc.) is treated as
// NOT-subscribed — the dashboard hides plan/billing-date and shows the
// checkout-in-progress card instead. Matches backend handoff doc.
const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due"]);

// Set of statuses that mean "you started checkout but haven't completed
// payment yet". When the user lands in any of these, we render a clear
// "Checkout in progress" card with a button to resume the existing Stripe
// session (or start a new one if we don't have a URL stored).
const CHECKOUT_PENDING_STATUSES = new Set([
  "checkout_pending",
  "incomplete",
  "incomplete_expired",
  "trialing_pending_payment",
  "requires_payment_method",
  "unpaid",
]);

// Pull the Stripe Checkout URL the backend may have stashed when the user
// initiated checkout. Looks at the obvious places first, then falls back to
// the membership block if present.
function deriveCheckoutUrl(payload) {
  if (!payload || typeof payload !== "object") return "";
  const sources = [
    payload.checkoutUrl,
    payload.checkout_url,
    payload.membership?.checkoutUrl,
    payload.membership?.checkout_url,
    payload.subscription?.checkoutUrl,
    payload.stripe?.checkoutUrl,
    payload.stripe?.checkout_url,
    payload.checkoutSessionUrl,
  ];
  for (const v of sources) {
    const s = String(v || "").trim();
    if (s && /^https?:\/\//i.test(s)) return s;
  }
  return "";
}

function formatPlanLabel(raw) {
  const key = String(raw || "").trim().toLowerCase();
  const labels = {
    "weekly": "Weekly",
    "monthly": "Monthly",
    "yearly": "Yearly",
    "premium": "Monthly – Premium",
    "premiumyearly": "Yearly – Premium",
    "free": "Free",
  };
  return labels[key] || raw || "-";
}

function wireBillingPlanButtons() {
  const container = document.getElementById("billingPlanButtons");
  if (!container) return;

  const buttons = container.querySelectorAll(".billing-plan-btn");
  buttons.forEach((btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", async () => {
      const plan = btn.dataset.plan;
      if (!plan) return;
      btn.disabled = true;
      btn.textContent = "Redirecting to Stripe...";
      try {
        await startStripeCheckoutForPlan(plan, btn);
      } catch (err) {
        btn.textContent = "Failed — try again";
        btn.disabled = false;
      }
    });
  });
}

function applyBillingPayload(payload) {
  if (window.__billingDebug) {
    console.log("[billing] applyBillingPayload", JSON.stringify(payload, null, 2));
  }
  const status = deriveBillingStatus(payload);
  const plan = deriveBillingPlan(payload);
  const portalUrl = deriveBillingPortalUrl(payload);
  const lastPaymentDate = deriveLastPaymentDate(payload);
  const nextBillingDate = deriveNextBillingDate(payload);

  if (els.billingStatusValue) {
    els.billingStatusValue.textContent = status || "-";
    const isActive = status === "active" || status === "trialing";
    els.billingStatusValue.style.color = isActive ? "#22c55e" : "#ef4444";
  }
  if (els.billingPlanValue) {
    els.billingPlanValue.textContent = formatPlanLabel(plan);
  }
  if (els.billingLastPaymentValue) {
    els.billingLastPaymentValue.textContent = formatBillingDate(lastPaymentDate) || "-";
  }
  if (els.billingNextBillingValue) {
    els.billingNextBillingValue.textContent = formatBillingDate(nextBillingDate) || "-";
  }

  const hasPortalUrl = Boolean(portalUrl);
  const isActive = status === "active" || status === "trialing";
  const hasActivePlan = isActive || Boolean(plan);

  if (els.billingManageLink) {
    els.billingManageLink.hidden = !hasPortalUrl;
    els.billingManageLink.href = hasPortalUrl ? portalUrl : "#";
  }

  if (els.billingNoAccount) {
    els.billingNoAccount.hidden = hasActivePlan;
  }

  const subscribeLink = document.getElementById("billingSubscribeLink");
  if (subscribeLink) {
    subscribeLink.hidden = hasActivePlan;
  }

  const planButtons = document.getElementById("billingPlanButtons");
  if (planButtons) {
    planButtons.hidden = hasActivePlan;
  }

  const upgradeGrid = document.getElementById("billingUpgradeGrid");
  if (upgradeGrid && hasActivePlan && !hasPortalUrl) {
    upgradeGrid.hidden = true;
  }

  if (!hasActivePlan) {
    wireBillingPlanButtons();
  }

  state.billingPortalUrl = portalUrl || "";
  persistBillingOverview(status, plan, lastPaymentDate, nextBillingDate);
  return status;
}

// ---------- Upgrade tier cards ----------
//
// Renders cards showing the plans the user can move TO from their current
// plan. ALL prices come from /api/billing/stripe-prices (Stripe → backend
// 15-min cache → this client). NEVER hardcode a price string here — if you
// want to change what users see, change the Stripe Price object.
//
// Feature bullet copy still comes from the /control billing block (admins
// can tune it without touching Stripe).

const PLAN_ALIAS_MAP = {
  monthly: "monthly", "monthlyTier": "monthly", "month": "monthly",
  yearly: "yearly",   "yearlyTier":  "yearly",  "annual": "yearly", "year": "yearly",
  premium: "premium", "premiumTier": "premium",
  premiumYearly: "premiumYearly", "premium_yearly": "premiumYearly", "premiumYearlyTier": "premiumYearly",
  weekly: "weekly",   "weeklyTier":  "weekly",
  free: "free",
};

function normalizePlanKey(raw) {
  const key = String(raw || "").trim().toLowerCase().replace(/\s+/g, "");
  return PLAN_ALIAS_MAP[key] || key;
}

// Which tiers a user on `currentPlan` can upgrade INTO. Ordered by recommended
// path. Weekly is intentionally NEVER offered as an upgrade target — it's a
// downgrade in disguise and the product rule is "weekly isn't on the pricing
// page". Free / weekly subscribers still get the monthly / yearly / premium
// paths.
function upgradePathsFor(currentPlan) {
  const cur = normalizePlanKey(currentPlan);
  if (cur === "free" || cur === "" || cur === "-") {
    return ["monthly", "yearly", "premium", "premiumYearly"];
  }
  if (cur === "weekly") return ["monthly", "yearly", "premium", "premiumYearly"];
  if (cur === "monthly") return ["yearly", "premium", "premiumYearly"];
  if (cur === "yearly") return ["premium", "premiumYearly"];
  if (cur === "premium") return ["premiumYearly"];
  if (cur === "premiumyearly") return [];
  return ["yearly", "premium", "premiumYearly"];
}

// Canonical feature bullets per plan key — used when the /control admin
// flags don't include features OR include stale ones ("Pro", "API access",
// "White-label"). The backend doc explicitly listed Premium's real bullets
// (image-based logging, AI vision, etc.), so the frontend keeps a copy as
// a safety net. Admins can still tune via /control once the flag's
// features[] is curated.
const STALE_BULLET_TOKENS = ["everything in pro", "api access", "white-label", "custom goals"];

const CANONICAL_FEATURES = {
  monthly: [
    "Unlimited workout, nutrition & water logging",
    "Body measurements & progress charts",
    "Leaderboards, brackets & streaks",
    "Wearable integrations",
    "Cancel anytime",
  ],
  yearly: [
    "Everything in Monthly",
    "2 months free vs monthly",
    "Priority support",
    "Early access to new features",
  ],
  premium: [
    "📷 Photo-based meal logging (AI calories + macros)",
    "📷 Photo-based scale logging",
    "📷 Photo-based workout logging",
    "Nutrition-label scanning",
    "Priority AI processing",
  ],
  premiumYearly: [
    "Everything in Premium",
    "Save vs monthly Premium",
    "Priority AI processing",
    "Early access to new features",
  ],
  weekly: [
    "All Premium features",
    "Unlimited history",
    "Cancel anytime — no commitment",
  ],
};

function hasStaleBullet(features) {
  return features.some((f) =>
    STALE_BULLET_TOKENS.some((token) => String(f).toLowerCase().includes(token))
  );
}

// Resolve feature bullets for a given plan key. Backend's /control billing
// block carries admin-tunable copy under billing.<key>Tier.features[].
// Falls back to CANONICAL_FEATURES when admin features are empty OR contain
// stale tokens (Pro / API access / White-label) — that way the dashboard
// never shows "API access" for users who don't actually get an API.
function featuresForPlan(planKey) {
  const flags = getCachedFlags();
  const billing = flags?.billing || {};
  const tier =
    billing[
      ({
        monthly: "monthlyTier",
        yearly: "yearlyTier",
        premium: "premiumTier",
        premiumYearly: "premiumYearlyTier",
        weekly: "weeklyTier",
      })[planKey]
    ];
  const adminFeatures = Array.isArray(tier?.features) ? tier.features : [];
  // Use admin copy only when it's both non-empty AND free of stale tokens.
  if (adminFeatures.length && !hasStaleBullet(adminFeatures)) {
    return adminFeatures.slice(0, 5);
  }
  return (CANONICAL_FEATURES[planKey] || []).slice(0, 5);
}

function isPremiumPlan(planKey) {
  return planKey === "premium" || planKey === "premiumYearly";
}

function planDisplayName(planKey) {
  return ({
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
    premium: "Premium",
    premiumYearly: "Premium Yearly",
  })[planKey] || planKey;
}

// Honor admin's `flags.billing.tierVisibility.<plan>` toggle so the dashboard
// stops offering a hidden tier as an upgrade target. Same rule as the
// /pricing page — false hides, anything else shows.
function isUpgradeTierVisible(planKey) {
  const flags = getCachedFlags();
  const v = flags?.billing?.tierVisibility;
  if (!v || typeof v !== "object") return true;
  return v[planKey] !== false;
}

async function renderBillingUpgrades({ currentPlan, hasActiveSub }) {
  const grid = document.getElementById("billingUpgradeGrid");
  const section = document.getElementById("billingUpgradeSection");
  if (!grid || !section) return;

  // First filter: upgrade-path logic (yearly > monthly, premium > yearly, ...)
  // Second filter: admin tier-visibility toggle from /control.
  const paths = upgradePathsFor(currentPlan).filter((p) => isUpgradeTierVisible(p));
  if (!paths.length) {
    section.hidden = true;
    return;
  }

  // Ensure we have prices BEFORE we render so we never paint a card without
  // a price. Sync getter returns localStorage/fallback for immediate paint;
  // background fetch (force:true) updates with fresh tierVisibility + price
  // values so admin toggles in /control show up here within seconds, not
  // 15-min cache cycles.
  const prices = getBillingPricesSync();
  if (window.__billingDebug) {
    console.log("[billing] upgradeGrid prices:", JSON.stringify(prices, null, 2));
    console.log("[billing] upgradeGrid currentPlan:", currentPlan, "hasActiveSub:", hasActiveSub, "paths:", paths);
  }
  getBillingPrices({ force: true }).then((fresh) => {
    if (fresh && fresh !== prices) {
      // Re-render only if the panel is still in the DOM (user might've
      // navigated away).
      if (document.getElementById("billingUpgradeGrid")) {
        renderBillingUpgrades({ currentPlan, hasActiveSub });
      }
    }
  }).catch(() => {});

  const cards = paths
    .map((plan) => {
      const p = prices?.[plan];
      if (!p?.formatted) return null;
      const isPremium = isPremiumPlan(plan);
      const features = featuresForPlan(plan);
      const name = planDisplayName(plan);
      const saveBadge = p.savingsVsMonthlyFormatted || "";
      const monthlyEqLine = p.perMonthFormatted
        ? `<span class="bill-card-mo-eq">${escapeHtmlAttr(p.perMonthFormatted)}</span>`
        : "";

      return `
        <article class="billing-upgrade-card ${isPremium ? "is-premium" : ""}" data-plan="${escapeHtmlAttr(plan)}">
          ${saveBadge ? `<span class="billing-upgrade-badge">${escapeHtmlAttr(saveBadge)}</span>` : ""}
          ${isPremium ? `<span class="billing-upgrade-tier">Premium</span>` : ""}
          <h4 class="billing-upgrade-name">${escapeHtmlAttr(name)}</h4>
          <div class="billing-upgrade-price">${escapeHtmlAttr(p.formatted)}${monthlyEqLine}</div>
          ${
            features.length
              ? `<ul class="billing-upgrade-features">${features
                  .map((f) => `<li>${escapeHtmlAttr(String(f))}</li>`)
                  .join("")}</ul>`
              : ""
          }
          <button type="button" class="btn-primary billing-upgrade-btn" data-action="upgrade" data-plan="${escapeHtmlAttr(plan)}">
            ${hasActiveSub ? `Switch to ${name}` : `Start ${name}`}
          </button>
        </article>
      `;
    })
    .filter(Boolean);

  if (!cards.length) {
    section.hidden = true;
    return;
  }

  grid.innerHTML = cards.join("");
  section.hidden = false;
  // Bind upgrade clicks (idempotent — replaces with fresh handlers each render).
  grid.querySelectorAll('[data-action="upgrade"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const plan = btn.dataset.plan;
      if (plan) startStripeCheckoutForPlan(plan, btn);
    });
  });
}

function escapeHtmlAttr(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function startStripeCheckoutForPlan(plan, originBtn) {
  setStatus(els.billingActionStatus, `Starting checkout for ${plan}…`);
  const contact = resolveBillingContact();
  if (!contact) {
    setStatus(
      els.billingActionStatus,
      "Missing contact. Re-login so checkout can be linked to your account.",
      "is-error"
    );
    return;
  }
  if (originBtn) originBtn.disabled = true;
  try {
    if (window.__billingDebug) {
      console.log("[billing] startStripeCheckoutForPlan plan:", plan, "contact:", contact);
    }
    const body = await postAuthedJson(
      [
        `${API_BASE}/api/stripe/checkout-session`,
        "/api/stripe/checkout-session",
        "/api/stripe/checkout",
        "/api/billing/checkout-session",
      ],
      {
        contact,
        plan,
        successUrl: STRIPE_CHECKOUT_SUCCESS_URL,
        cancelUrl: STRIPE_CHECKOUT_CANCEL_URL,
      },
    );
    const checkoutUrl = checkoutSessionUrlFromBody(body);
    if (!checkoutUrl) throw new Error("Checkout session created but no URL was returned.");
    setStatus(els.billingActionStatus, "Redirecting to Stripe…", "is-success");
    window.location.assign(checkoutUrl);
  } catch (e) {
    if (originBtn) originBtn.disabled = false;
    setStatus(els.billingActionStatus, String(e?.message || "Unable to start checkout."), "is-error");
  }
}

function clearBillingRedirectParams() {
  const params = new URLSearchParams(window.location.search);
  params.delete("billing");
  params.delete("session_id");
  params.delete("contact");
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash || ""}`;
  window.history.replaceState({}, "", nextUrl);
}

function checkoutSessionUrlFromBody(body) {
  const candidates = [
    body?.url,
    body?.checkoutUrl,
    body?.checkout_url,
    body?.sessionUrl,
    body?.session_url,
    body?.data?.url,
    body?.data?.checkoutUrl,
    body?.data?.checkout_url,
  ];

  for (const value of candidates) {
    const normalized = String(value || "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

async function startStripeCheckout() {
  setStatus(els.billingActionStatus, "Starting Stripe checkout...");

  const contact = resolveBillingContact();
  if (!contact) {
    setStatus(els.billingActionStatus, "Missing contact. Re-login so checkout can be linked to your account.", "is-error");
    return;
  }

  try {
    const body = await postAuthedJson(
      [
        `${API_BASE}/api/stripe/checkout-session`,
        "/api/stripe/checkout-session",
        "/api/stripe/checkout",
        "/api/billing/checkout-session",
      ],
      {
        contact,
        plan: "monthly",
        successUrl: STRIPE_CHECKOUT_SUCCESS_URL,
        cancelUrl: STRIPE_CHECKOUT_CANCEL_URL,
      },
    );

    const checkoutUrl = checkoutSessionUrlFromBody(body);
    if (!checkoutUrl) {
      throw new Error("Checkout session created but no checkout URL was returned.");
    }

    setStatus(els.billingActionStatus, "Redirecting to Stripe checkout...", "is-success");
    window.location.assign(checkoutUrl);
  } catch (error) {
    setStatus(els.billingActionStatus, String(error?.message || "Unable to start checkout."), "is-error");
  }
}

async function hydratePortalForContact(contact) {
  const query = contact ? `?contact=${encodeURIComponent(contact)}` : "";
  const body = await getAuthedJson([
    `${API_BASE}/api/portal${query}`,
    `${API_BASE}/api/account/portal${query}`,
    `${API_BASE}/api/user/profile${query}`,
    `${API_BASE}/api/portal`,
    "/api/portal",
  ]);
  return body?.portal || body?.data?.portal || body;
}

async function finalizeBillingFromRedirect() {
  const params = new URLSearchParams(window.location.search);
  const billingState = String(params.get("billing") || "")
    .trim()
    .toLowerCase();

  if (!billingState) {
    return;
  }

  if (billingState === "cancelled" || billingState === "canceled") {
    setStatus(els.billingActionStatus, "Checkout cancelled.", "is-error");
    clearBillingRedirectParams();
    return;
  }

  if (billingState !== "success") {
    return;
  }

  const sessionId = String(params.get("session_id") || "").trim();
  if (!sessionId) {
    setStatus(els.billingActionStatus, "Missing Stripe session id in success redirect.", "is-error");
    clearBillingRedirectParams();
    return;
  }

  setStatus(els.billingActionStatus, "Finalizing Stripe checkout...");

  try {
    const completeBody = await getAuthedJson([
      `${API_BASE}/api/stripe/checkout-complete?session_id=${encodeURIComponent(sessionId)}`,
      `/api/stripe/checkout-complete?session_id=${encodeURIComponent(sessionId)}`,
    ]);

    if (completeBody?.ok === false) {
      throw new Error(completeBody?.error || completeBody?.message || "Stripe checkout completion failed.");
    }

    let billingPayload = completeBody?.portal || completeBody?.data?.portal || completeBody;
    if (!completeBody?.portal && !completeBody?.data?.portal) {
      try {
        const hydratedPortal = await hydratePortalForContact(resolveBillingContact());
        if (hydratedPortal) {
          billingPayload = hydratedPortal;
        }
      } catch {
        // Keep checkout-complete payload as fallback.
      }
    }

    const status = applyBillingPayload(billingPayload);

    if (status) {
      renderAccountInfo();
      setStatus(els.billingActionStatus, `Billing active: ${status}.`, "is-success");
    } else {
      setStatus(els.billingActionStatus, "Checkout completed and portal synced.", "is-success");
    }
  } catch (error) {
    setStatus(els.billingActionStatus, String(error?.message || "Unable to finalize checkout."), "is-error");
  } finally {
    clearBillingRedirectParams();
  }
}

async function loadBillingOverview() {
  const contact = resolveBillingContact();
  if (window.__billingDebug) {
    console.log("[billing] loadBillingOverview contact:", contact);
  }
  if (!contact) {
    return;
  }

  try {
    const portalPayload = await hydratePortalForContact(contact);
    if (portalPayload && typeof portalPayload === "object") {
      applyBillingPayload(portalPayload);
    }
    renderAccountInfo();
  } catch (error) {
    const message = String(error?.message || "Unable to load billing status.");
    if (/404/.test(message)) {
      setStatus(els.billingActionStatus, "Billing profile not found yet for this user.", "is-error");
      return;
    }
    setStatus(els.billingActionStatus, message, "is-error");
  }
}

function loadGoalsFromStorage() {
  try {
    const raw = window.localStorage.getItem(GOALS_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    state.goals = {
      weightGoal: String(parsed.weightGoal || "").trim(),
      bodyFatGoal: String(parsed.bodyFatGoal || "").trim(),
      workoutPlan: String(parsed.workoutPlan || "").trim(),
    };
    state.selectedPlanDays = String(parsed.selectedPlanDays || state.selectedPlanDays || "7");
  } catch {
    // Ignore invalid local data.
  }
}

function setActivePlanDay(days) {
  const normalized = String(days || "7");
  state.selectedPlanDays = POPULAR_WORKOUT_PLANS[normalized] ? normalized : "7";

  els.planDayButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.days === state.selectedPlanDays);
  });
}

function planTextForTextarea(plan) {
  const lines = [plan.name, "", ...plan.days];
  if (plan.summary) {
    lines.splice(1, 0, plan.summary);
  }
  return lines.join("\n");
}

function renderPopularPlans(days = state.selectedPlanDays) {
  if (!els.popularPlansList) {
    return;
  }

  setActivePlanDay(days);
  clearElement(els.popularPlansList);

  const plans = POPULAR_WORKOUT_PLANS[state.selectedPlanDays] || [];
  if (!plans.length) {
    setStatus(els.plansStatus, "No plans available for this split.", "is-error");
    return;
  }

  plans.forEach((plan) => {
    const card = document.createElement("article");
    card.className = "plan-card";

    const head = document.createElement("div");
    head.className = "plan-card-head";

    const title = document.createElement("h4");
    title.className = "plan-name";
    title.textContent = plan.name;

    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "btn-secondary";
    pick.dataset.planId = plan.id;
    pick.textContent = "Use This Plan";

    head.appendChild(title);
    head.appendChild(pick);

    const summary = document.createElement("p");
    summary.className = "plan-summary";
    summary.textContent = plan.summary;

    const list = document.createElement("ul");
    list.className = "plan-days-list";
    plan.days.forEach((dayText) => {
      const item = document.createElement("li");
      item.textContent = dayText;
      list.appendChild(item);
    });

    card.appendChild(head);
    card.appendChild(summary);
    card.appendChild(list);
    els.popularPlansList.appendChild(card);
  });

  setStatus(els.plansStatus, `${state.selectedPlanDays}-day plans loaded.`, "is-success");
}

function pickPlanById(planId) {
  const plans = POPULAR_WORKOUT_PLANS[state.selectedPlanDays] || [];
  return plans.find((plan) => plan.id === planId) || null;
}

function renderGoals() {
  if (els.goalWeightInput) {
    els.goalWeightInput.value = state.goals.weightGoal || "";
  }

  if (els.goalBodyFatInput) {
    els.goalBodyFatInput.value = state.goals.bodyFatGoal || "";
  }

  if (els.goalWorkoutPlanInput) {
    els.goalWorkoutPlanInput.value = state.goals.workoutPlan || "";
  }

  renderPopularPlans(state.selectedPlanDays);
}

async function saveGoals() {
  state.goals = {
    weightGoal: String(els.goalWeightInput?.value || "").trim(),
    bodyFatGoal: String(els.goalBodyFatInput?.value || "").trim(),
    workoutPlan: String(els.goalWorkoutPlanInput?.value || "").trim(),
    selectedPlanDays: state.selectedPlanDays,
  };

  try {
    window.localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(state.goals));
  } catch {
    // Ignore local storage failures.
  }

  try {
    await postAuthedJson(["/api/account/goals", `${API_BASE}/api/account/goals`], state.goals);
    setStatus(els.goalsStatus, "Goals saved to backend.", "is-success");
  } catch {
    setStatus(els.goalsStatus, "Goals saved locally.", "is-success");
  }
}

function wireGoals() {
  loadGoalsFromStorage();
  renderGoals();

  els.planDayButtons.forEach((button) => {
    button.addEventListener("click", () => {
      renderPopularPlans(button.dataset.days);
    });
  });

  if (els.popularPlansList) {
    els.popularPlansList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest("button[data-plan-id]");
      if (!button) {
        return;
      }

      const plan = pickPlanById(button.dataset.planId);
      if (!plan) {
        return;
      }

      if (els.goalWorkoutPlanInput) {
        els.goalWorkoutPlanInput.value = planTextForTextarea(plan);
      }

      setStatus(els.plansStatus, `${plan.name} inserted into workout plan.`, "is-success");
    });
  }

  if (els.saveGoalsButton) {
    els.saveGoalsButton.addEventListener("click", () => {
      void saveGoals();
    });
  }
}

function wireAffiliateCopy() {
  els.affiliateCopyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const targetId = button.dataset.copyTarget;
      const input = document.getElementById(targetId);
      const value = String(input?.value || "").trim();
      if (!value) {
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        setStatus(els.goalsStatus, "Affiliate link copied.", "is-success");
      } catch {
        setStatus(els.goalsStatus, "Copy failed. Copy manually.", "is-error");
      }
    });
  });
}

async function runBillingAction(action) {
  if (action === "monthly") {
    await startStripeCheckout();
    return;
  }

  if (action === "cancel") {
    const proceed = window.confirm(
      "Cancel your subscription? You'll keep access until the end of the current billing period, and you can resume any time before then.",
    );
    if (!proceed) return;
  }

  setStatus(els.billingActionStatus, action === "resume" ? "Resuming subscription..." : "Cancelling subscription...");

  const contact = resolveBillingContact();
  const endpoints = action === "resume"
    ? [
        `${API_BASE}/api/billing/resume`,
        `${API_BASE}/api/stripe/subscription/resume`,
        "/api/billing/resume",
      ]
    : [
        `${API_BASE}/api/billing/cancel`,
        `${API_BASE}/api/stripe/subscription/cancel`,
        `${API_BASE}/api/stripe/cancel`,
        "/api/billing/cancel",
      ];

  try {
    const body = await postAuthedJson(endpoints, { action, contact });
    applyBillingPayload(body);
    const successMessage = action === "resume"
      ? "Subscription resumed. Welcome back."
      : "Subscription set to cancel at period end.";
    setStatus(els.billingActionStatus, successMessage, "is-success");
    await loadBillingOverview();
  } catch (error) {
    const message = String(error?.message || "Billing action failed.");
    if (/404/.test(message)) {
      setStatus(
        els.billingActionStatus,
        action === "resume"
          ? "Resume endpoint is not configured on backend yet."
          : "Cancel endpoint is not configured on backend yet.",
        "is-error",
      );
      return;
    }
    setStatus(els.billingActionStatus, message, "is-error");
  }
}

function wireBilling() {
  if (els.billingYearlyButton) {
    els.billingYearlyButton.addEventListener("click", () => {
      void runBillingAction("monthly");
    });
  }

  if (els.billingCancelButton) {
    els.billingCancelButton.addEventListener("click", () => {
      void runBillingAction("cancel");
    });
  }

  if (els.billingResumeButton) {
    els.billingResumeButton.addEventListener("click", () => {
      void runBillingAction("resume");
    });
  }

  // Resume an in-progress Stripe Checkout when the user lands back on the
  // dashboard mid-payment. If backend gave us the existing checkout URL we
  // open it directly; otherwise we POST a fresh checkout-session for the
  // pending plan so they don't have to re-pick.
  if (els.billingResumeCheckoutBtn) {
    els.billingResumeCheckoutBtn.addEventListener("click", () => {
      const existingUrl = state.billingCheckoutUrl || "";
      if (existingUrl) {
        setStatus(els.billingActionStatus, "Resuming checkout…", "is-success");
        window.location.assign(existingUrl);
        return;
      }
      const plan = state.billingPendingPlan || "monthly";
      void startStripeCheckoutForPlan(plan, els.billingResumeCheckoutBtn);
    });
  }

  // Abandon the pending checkout and reveal the upgrade-options grid so the
  // user can pick a different plan. We can't cancel the existing Stripe
  // session client-side (it expires on its own); we just bring the picker
  // back into view.
  if (els.billingAbandonCheckoutBtn) {
    els.billingAbandonCheckoutBtn.addEventListener("click", () => {
      if (els.billingCheckoutPendingCard) els.billingCheckoutPendingCard.hidden = true;
      // Re-render upgrades treating the user as fresh (no active sub).
      renderBillingUpgrades({ currentPlan: "", hasActiveSub: false });
      // Scroll to the grid so it's obvious where the next step is.
      document.getElementById("billingUpgradeSection")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }
}

function normalizeIntegrationItems(body) {
  const rows = Array.isArray(body)
    ? body
    : body?.integrations ||
      body?.items ||
      body?.data?.integrations ||
      body?.data?.items ||
      [];

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((item, index) => ({
      id: String(item?.id || item?.provider || item?.key || `integration_${index + 1}`).trim(),
      name: String(item?.name || item?.label || item?.provider || `Integration ${index + 1}`).trim(),
      description: String(item?.description || item?.summary || "").trim(),
      provider: String(item?.provider || item?.id || item?.key || "").trim(),
      connectUrl: String(item?.connectUrl || item?.url || item?.redirectUrl || "").trim(),
      connected: normalizeBoolean(item?.connected || item?.isConnected),
      actionLabel: String(item?.actionLabel || item?.buttonLabel || (item?.connected ? "Manage" : "Connect")).trim(),
      statusLabel: String(item?.statusLabel || item?.status || "").trim(),
    }))
    .filter((item) => item.name);
}

function renderIntegrations(items) {
  state.availableIntegrations = Array.isArray(items) ? items : [];

  const hasItems = state.availableIntegrations.length > 0;
  if (els.navIntegrate) {
    els.navIntegrate.hidden = !hasItems;
  }
  if (els.integrationCards) {
    clearElement(els.integrationCards);
  }

  if (!hasItems) {
    if (state.activeTab === "integrate") {
      setActiveTab("stats");
    }
    return;
  }

  state.availableIntegrations.forEach((item) => {
    const card = document.createElement("article");
    card.className = "integration-card";

    const title = document.createElement("h3");
    title.textContent = item.name;

    const description = document.createElement("p");
    description.textContent = item.description || "Integration available from backend.";

    const actions = document.createElement("div");
    actions.className = "panel-actions";

    const button = document.createElement(item.connectUrl ? "a" : "button");
    button.className = item.connected ? "btn-secondary" : "btn-primary";
    button.textContent = item.actionLabel || (item.connected ? "Manage" : "Connect");
    if (item.connectUrl) {
      button.href = item.connectUrl;
      button.target = "_blank";
      button.rel = "noopener noreferrer";
    } else {
      button.type = "button";
      button.dataset.provider = item.provider || item.id;
    }
    actions.appendChild(button);

    if (item.statusLabel) {
      const status = document.createElement("p");
      status.className = "stats-status";
      status.textContent = item.statusLabel;
      card.appendChild(title);
      card.appendChild(description);
      card.appendChild(actions);
      card.appendChild(status);
    } else {
      card.appendChild(title);
      card.appendChild(description);
      card.appendChild(actions);
    }

    els.integrationCards?.appendChild(card);
  });
}

async function loadAvailableIntegrations() {
  const localSnapshotItems = normalizeIntegrationItems(state.backendSnapshot?.integrations || []);
  if (localSnapshotItems.length) {
    renderIntegrations(localSnapshotItems);
    setStatus(els.integrateStatus, "Integrations loaded from portal snapshot.", "is-success");
    return localSnapshotItems;
  }

  try {
    const body = await getAuthedJson([
      "/api/integrations",
      `${API_BASE}/api/integrations`,
      "/api/account/integrations",
      `${API_BASE}/api/account/integrations`,
    ]);
    const items = normalizeIntegrationItems(body);
    renderIntegrations(items);
    if (items.length) {
      setStatus(els.integrateStatus, "Integrations loaded.", "is-success");
    }
    return items;
  } catch {
    renderIntegrations([]);
    return [];
  }
}

function wireIntegrations() {
  if (!els.integrationCards) {
    return;
  }

  els.integrationCards.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest("button[data-provider]");
    if (!button) {
      return;
    }

    const provider = String(button.dataset.provider || "").trim();
    if (!provider) {
      return;
    }

    setStatus(els.integrateStatus, `Connecting ${provider}...`);
    try {
      await postAuthedJson(
        ["/api/integrations/connect", `${API_BASE}/api/integrations/connect`],
        { provider },
      );
      setStatus(els.integrateStatus, `${provider} connected.`, "is-success");
    } catch {
      setStatus(els.integrateStatus, `${provider} integration endpoint unavailable.`, "is-error");
    }
  });
}

async function hydrateSheetLinkFromBackend() {
  if (state.userSheetUrl) {
    return state.userSheetUrl;
  }

  try {
    const body = await getAuthedJson([
      "/api/account/sheet",
      `${API_BASE}/api/account/sheet`,
      "/api/sheet",
      `${API_BASE}/api/sheet`,
    ]);

    const sheetUrl = String(
      body?.sheetUrl ||
        body?.googleSheetUrl ||
        body?.url ||
        body?.data?.sheetUrl ||
        body?.data?.googleSheetUrl ||
        "",
    ).trim();

    if (!sheetUrl) {
      return "";
    }

    state.userSheetUrl = sheetUrl;
    persistAccountUpdate({ sheetUrl });
    renderSheetLink();
    return sheetUrl;
  } catch {
    return "";
  }
}

function renderSheetLink() {
  const user = readAuthUser();
  const sheetUrl = String(user?.sheetUrl || state.userSheetUrl || "").trim();

  if (els.sheetDatabaseLink) {
    els.sheetDatabaseLink.href = sheetUrl || "#";
  }

  if (els.sheetStatus) {
    els.sheetStatus.textContent = sheetUrl ? "Sheet link available." : "No sheet link found in account yet.";
    els.sheetStatus.classList.toggle("is-error", !sheetUrl);
    els.sheetStatus.classList.toggle("is-success", Boolean(sheetUrl));
  }
}

function mergeMilestones(remoteItems) {
  const byId = new Map();

  DEFAULT_MILESTONES.forEach((item) => {
    byId.set(item.id, {
      ...item,
      progress: 0,
      completed: false,
    });
  });

  remoteItems.forEach((item) => {
    const key = String(item.id || item.key || item.slug || "").trim();
    const target = Number(item.target ?? item.goal ?? NaN);
    const progress = Number(item.progress ?? item.current ?? item.value ?? NaN);

    const normalized = {
      id: key || `milestone_${byId.size + 1}`,
      name: String(item.name || item.title || "Milestone").trim(),
      target: Number.isFinite(target) && target > 0 ? target : 1,
      progress: Number.isFinite(progress) && progress > 0 ? progress : 0,
      completed: normalizeBoolean(item.completed),
    };

    byId.set(normalized.id, normalized);
  });

  return [...byId.values()].map((item) => {
    const progress = Math.max(0, Number(item.progress || 0));
    const target = Math.max(1, Number(item.target || 1));
    return {
      ...item,
      progress,
      target,
      completed: item.completed || progress >= target,
      pct: Math.min(100, (progress / target) * 100),
    };
  });
}

function normalizeMilestonePayload(body) {
  const rows = Array.isArray(body)
    ? body
    : body?.milestones ||
      body?.data?.milestones ||
      body?.data?.items ||
      body?.items ||
      [];

  return Array.isArray(rows) ? rows : [];
}

function wireMilestonesToggle() {
  if (!els.toggleMilestonesButton || !els.milestonesSection) {
    return;
  }

  const sync = () => {
    els.milestonesSection.hidden = !state.milestonesOpen;
    els.toggleMilestonesButton.textContent = state.milestonesOpen ? "Hide Milestones" : "Show Milestones";
  };

  sync();
  els.toggleMilestonesButton.addEventListener("click", () => {
    state.milestonesOpen = !state.milestonesOpen;
    sync();
  });
}

async function loadMilestones() {
  setStatus(els.milestonesStatus, "Loading milestones...");

  let rows = [];
  const endpoints = ["/api/milestones", "/api/account/milestones", `${API_BASE}/api/milestones`];

  for (const endpoint of endpoints) {
    try {
      const response = await fetchAuthedApi(endpoint);
      let body = null;

      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok || (body && typeof body === "object" && "ok" in body && !body.ok)) {
        continue;
      }

      rows = normalizeMilestonePayload(body);
      break;
    } catch {
      // try next endpoint
    }
  }

  const milestones = mergeMilestones(rows);
  renderMilestones(milestones);

  if (rows.length) {
    setStatus(els.milestonesStatus, "Milestones synced from backend.", "is-success");
  } else {
    setStatus(els.milestonesStatus, "Using default milestone tracks.", "is-success");
  }
}

function renderMilestones(milestones) {
  if (!els.milestonesList) {
    return;
  }

  clearElement(els.milestonesList);

  milestones.forEach((milestone) => {
    const item = document.createElement("article");
    item.className = "milestone-item";

    const top = document.createElement("div");
    top.className = "milestone-top";

    const name = document.createElement("p");
    name.className = "milestone-name";
    name.textContent = milestone.name;

    const badge = document.createElement("span");
    badge.className = "trend-value";
    badge.textContent = milestone.completed ? "Unlocked" : "In Progress";

    top.appendChild(name);
    top.appendChild(badge);

    const progress = document.createElement("p");
    progress.className = "milestone-progress";
    progress.textContent = `${formatNumber(milestone.progress)} / ${formatNumber(milestone.target)}`;

    const track = document.createElement("div");
    track.className = "milestone-track";

    const fill = document.createElement("div");
    fill.className = "milestone-fill";
    fill.style.width = `${milestone.pct}%`;

    track.appendChild(fill);
    item.appendChild(top);
    item.appendChild(progress);
    item.appendChild(track);

    els.milestonesList.appendChild(item);
  });
}

async function loadBodyMeasuresAndRender() {
  if (!state.bodyMeasures.length && Array.isArray(state.backendSnapshot?.history?.bodyMetrics)) {
    state.bodyMeasures = normalizeBodyEntries(state.backendSnapshot.history.bodyMetrics);
  }

  if (!state.bodyMeasures.length) {
    state.bodyMeasures = await fetchBodyMeasures();
  }

  renderBodyMeasures();
}

function resolveInitialTab() {
  const params = new URLSearchParams(window.location.search);
  const requested = normalizeTabId(params.get("view"));

  if (requested) {
    return requested;
  }

  const billingState = String(params.get("billing") || "")
    .trim()
    .toLowerCase();
  if (billingState === "success" || billingState === "cancelled" || billingState === "canceled") {
    return "billing";
  }

  return "stats";
}

function wireAffiliate() {
  wireAffiliateCopy();
  if (els.affiliateApplyForm) {
    els.affiliateApplyForm.addEventListener("submit", handleAffiliateApplyClick);
  } else if (els.affiliateApplyButton) {
    els.affiliateApplyButton.addEventListener("click", handleAffiliateApplyClick);
  }
  [
    els.affiliateFirstNameInput,
    els.affiliateLastNameInput,
    els.affiliateEmailInput,
    els.affiliateConfirmEmailInput,
    els.affiliatePhoneInput,
  ].forEach((input) => {
    if (!input) {
      return;
    }
    input.addEventListener("input", () => {
      setAffiliateApplySuccess(false);
      if (els.affiliateTabEmptyStatus) {
        els.affiliateTabEmptyStatus.classList.remove("is-error", "is-success");
      }
    });
  });
  if (els.affiliatePhoneInput) {
    els.affiliatePhoneInput.addEventListener("blur", () => {
      const normalized = normalizeAffiliatePhone(els.affiliatePhoneInput?.value || "");
      if (normalized) {
        els.affiliatePhoneInput.value = formatAffiliatePhoneValue(normalized);
      }
    });
  }
  [els.affiliateEmailInput, els.affiliateConfirmEmailInput, els.affiliateAgreementEmailInput, els.affiliateAgreementConfirmEmailInput].forEach(
    (input) => {
      if (!input) {
        return;
      }
      input.addEventListener("blur", () => {
        input.value = String(input.value || "").trim().toLowerCase();
      });
      input.addEventListener("input", () => {
        if (els.affiliateAgreementStatus) {
          els.affiliateAgreementStatus.classList.remove("is-error", "is-success");
        }
      });
    },
  );
  if (els.affiliateOpenBillingButton) {
    els.affiliateOpenBillingButton.addEventListener("click", () => {
      const portalUrl = resolveBillingPortalUrl();
      if (portalUrl) {
        window.open(portalUrl, "_blank", "noopener,noreferrer");
        return;
      }
      setActiveTab("billing");
    });
  }
  if (els.affiliateTabConnectButton) {
    els.affiliateTabConnectButton.addEventListener("click", handleAffiliateConnectClick);
  }
  if (els.affiliateAgreementResendButton) {
    els.affiliateAgreementResendButton.addEventListener("click", () => {
      void handleAffiliateAgreementResendClick();
    });
  }
  if (els.affiliateAgreementLink) {
    els.affiliateAgreementLink.addEventListener("click", () => {
      setStatus(els.affiliateAgreementStatus, "Once you sign, this tab will refresh automatically.");
      scheduleAffiliateAgreementPoll(1500);
    });
  }
}

function wireInitialActions() {
  wireStatsControls();
  wireMilestonesToggle();
  wireExport();
  wireImport();
  wireGoals();
  wireAccountEditing();
  wirePublicProfileVisibility();
  wireTrackingPreferences();
  wireBilling();
  wireIntegrations();
  wireAffiliate();
}

async function bootData() {
  await Promise.allSettled([
    loadRange("today"),
    loadBodyMeasuresAndRender(),
    loadLeaderboardRank(),
    loadMilestones(),
    loadAvailableIntegrations(),
    hydrateSheetLinkFromBackend(),
  ]);
}

function handleLogout(event) {
  if (event) {
    event.preventDefault();
  }
  clearAffiliateAgreementPoll();
  try {
    window.localStorage.removeItem(AUTH_FLAG_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    window.localStorage.removeItem("tracker.affiliate.email");
    window.localStorage.removeItem(AFFILIATE_PENDING_KEY);
    window.localStorage.removeItem("tracker.auth.pending");
  } catch {
    // Ignore storage failures.
  }
  window.location.replace(MAIN_SITE_LOGOUT_URL);
}

function wireLogout() {
  const link = document.getElementById("dashboardLogoutLink");
  if (link) {
    link.addEventListener("click", handleLogout);
  }
}

function showEmailVerificationOnce() {
  if (window.__emailOverlayShown) return;
  window.__emailOverlayShown = true;
  initEmailVerificationOverlay();
}

function showCalcConsentPromptOnce() {
  if (window.__calcConsentPromptShown) return;
  window.__calcConsentPromptShown = true;
  void initCalcConsentPrompt();
}

function formatConsentConfirmationDate(iso) {
  const parsed = iso ? new Date(iso) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function updateAlgoConsentUI(enabled, updatedAt, answered) {
  const toggle = document.getElementById("toggleAlgoConsent");
  const meta = document.getElementById("algoConsentMeta");
  if (toggle) toggle.checked = enabled === true;
  if (meta) {
    if (answered) {
      const when = formatConsentConfirmationDate(updatedAt);
      meta.textContent = `${enabled ? "Opted in" : "Opted out"}${when ? ` — confirmed ${when}` : ""}`;
      meta.classList.remove("is-error");
    } else {
      meta.textContent = "Not answered yet — flip the toggle to choose.";
      meta.classList.remove("is-error");
    }
  }
}

// Privacy toggle (Setup tab): persistent on/off for algo-improvement consent
// with the confirmation date. Saves instantly on change.
async function initAlgoConsentToggle() {
  const toggle = document.getElementById("toggleAlgoConsent");
  if (!toggle) return;
  const meta = document.getElementById("algoConsentMeta");

  try {
    const response = await fetchAuthedApi(`${API_BASE}/api/user/calculation-logging`);
    if (response.ok) {
      const payload = await response.json();
      if (payload?.ok) {
        updateAlgoConsentUI(payload.enabled === true, payload.updatedAt, payload.answered === true);
      }
    } else if (meta) {
      meta.textContent = "Sign in again to manage this setting.";
    }
  } catch {
    if (meta) meta.textContent = "Could not load this setting.";
  }

  toggle.addEventListener("change", async () => {
    const enabled = toggle.checked;
    toggle.disabled = true;
    if (meta) meta.textContent = "Saving…";
    try {
      const response = await fetchAuthedApi(`${API_BASE}/api/user/calculation-logging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, source: "settings" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Save failed");
      updateAlgoConsentUI(payload.enabled === true, payload.updatedAt, true);
    } catch (error) {
      toggle.checked = !enabled;
      if (meta) {
        meta.textContent = `Could not save: ${String(error?.message || "try again")}`;
        meta.classList.add("is-error");
      }
    } finally {
      toggle.disabled = false;
    }
  });
}

// Algo-improvement consent notification (2026-07-11). Consent is opt-in only
// and defaults to OFF on the backend; this sign-in prompt is the ONLY place
// the question is asked (the old text-message prompt was removed). It shows
// until the user explicitly answers yes or no — `answered` from the backend
// distinguishes "chose no" (never re-prompt) from "never asked".
async function initCalcConsentPrompt() {
  const overlay = document.getElementById("calcConsentOverlay");
  if (!overlay) return;

  let answered = true;
  try {
    const response = await fetchAuthedApi(`${API_BASE}/api/user/calculation-logging`);
    if (!response.ok) return;
    const payload = await response.json();
    if (!payload?.ok) return;
    answered = payload.answered === true;
  } catch {
    return;
  }
  if (answered) return;

  const show = () => {
    // Deletion status card takes priority — same rule as the email overlay.
    const card = document.getElementById("deletionStatusCard");
    if (card && !card.hidden) return;
    overlay.hidden = false;
  };

  // Don't stack on top of the email-verify overlay: wait for it to close.
  const emailOverlay = document.getElementById("emailVerifyOverlay");
  if (emailOverlay && !emailOverlay.hidden) {
    const observer = new MutationObserver(() => {
      if (emailOverlay.hidden) {
        observer.disconnect();
        show();
      }
    });
    observer.observe(emailOverlay, { attributes: true, attributeFilter: ["hidden"] });
  } else {
    show();
  }

  const yesBtn = document.getElementById("calcConsentYesBtn");
  const noBtn = document.getElementById("calcConsentNoBtn");
  const status = document.getElementById("calcConsentStatus");

  const submit = async (enabled) => {
    if (yesBtn) yesBtn.disabled = true;
    if (noBtn) noBtn.disabled = true;
    if (status) { status.textContent = "Saving..."; status.classList.remove("is-error", "is-success"); }
    try {
      const response = await fetchAuthedApi(`${API_BASE}/api/user/calculation-logging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, source: "dashboard_prompt" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not save your choice.");
      }
      if (status) {
        status.textContent = enabled
          ? "Thanks for helping improve TheTrackerApp! 💪"
          : "No problem — everything works normally.";
        status.classList.add("is-success");
      }
      updateAlgoConsentUI(payload.enabled === true, payload.updatedAt, true);
      setTimeout(() => { overlay.hidden = true; }, 1200);
    } catch (error) {
      if (status) {
        status.textContent = String(error?.message || "Could not save your choice. Try again.");
        status.classList.add("is-error");
      }
      if (yesBtn) yesBtn.disabled = false;
      if (noBtn) noBtn.disabled = false;
    }
  };

  if (yesBtn) yesBtn.addEventListener("click", () => { void submit(true); });
  if (noBtn) noBtn.addEventListener("click", () => { void submit(false); });
}

function initEmailVerificationOverlay() {
  const overlay = document.getElementById("emailVerifyOverlay");
  if (!overlay) return;

  const card = document.getElementById("deletionStatusCard");
  if (card && !card.hidden) return;

  const user = readAuthUser() || {};
  // The backend snapshot is fresher than the login-time localStorage user —
  // an email verified after login exists only in the snapshot until
  // persistAuthFromSnapshot heals localStorage.
  const snapProfile = state.backendSnapshot?.profile || {};
  const email = String(user.email || snapProfile.primaryEmail || snapProfile.email || "").trim();
  const verified = user.emailVerified === true || user.emailVerified === "true"
    || snapProfile.emailVerified === true || snapProfile.emailVerified === "true";

  if (verified) {
    overlay.hidden = true;
    return;
  }

  const prompt = document.getElementById("emailVerifyPrompt");
  const inputRow = document.getElementById("emailVerifyInputRow");
  const input = document.getElementById("emailVerifyInput");
  const sendBtn = document.getElementById("emailVerifySendBtn");
  const skipBtn = document.getElementById("emailVerifySkipBtn");
  const status = document.getElementById("emailVerifyStatus");

  if (!email) {
    if (prompt) prompt.textContent = "Add your email address to unlock all features including affiliate access, data export, and account recovery.";
    if (sendBtn) sendBtn.textContent = "Save & Verify";
  } else {
    if (prompt) prompt.textContent = `Verify ${email} to unlock all features including affiliate access, data export, and account recovery.`;
    if (sendBtn) sendBtn.textContent = "Send Verification Email";
  }

  if (inputRow) inputRow.hidden = false;
  if (input) input.value = email;

  const timestampsEl = document.getElementById("emailVerifyTimestamp");
  const verifiedAt = readAccountEmailVerifiedAt(user);
  const verifiedDate = verifiedAt ? new Date(verifiedAt) : null;
  // Guard the parse — a non-date value here previously rendered
  // "Verified on Invalid Date."
  if (timestampsEl && verifiedDate && !Number.isNaN(verifiedDate.getTime())) {
    timestampsEl.textContent = `Verified on ${verifiedDate.toLocaleDateString()}.`;
    timestampsEl.hidden = false;
  }

  overlay.hidden = false;

  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      overlay.hidden = true;
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", async () => {
      if (sendBtn.disabled) return;

      const newEmail = (input?.value || "").trim();
      if (!email && !newEmail) {
        if (status) { status.textContent = "Enter an email address."; status.classList.add("is-error"); }
        return;
      }

      sendBtn.disabled = true;
      sendBtn.textContent = "Sending...";
      if (status) { status.textContent = ""; status.classList.remove("is-error", "is-success"); }

      try {
        if (!email && newEmail) {
          if (els.accountEmailInput) els.accountEmailInput.value = newEmail;
          console.log("[email-verify] saving new email:", newEmail);
          await saveAccountField("email");
        }
        console.log("[email-verify] calling requestAccountEmailVerification");
        await requestAccountEmailVerification();
        if (status) {
          status.textContent = "Verification email sent! Check your inbox.";
          status.classList.add("is-success");
        }
        sendBtn.textContent = "Verification Sent ✓";
      } catch (err) {
        if (status) {
          status.textContent = err.message || "Failed. Try again.";
          status.classList.add("is-error");
        }
        sendBtn.disabled = false;
        sendBtn.textContent = !email ? "Save & Verify" : "Send Verification Email";
      }
    });
  }
}

async function checkDeletionStatus() {
  const card = document.getElementById("deletionStatusCard");
  if (!card) return;

  const user = readAuthUser() || {};
  const contact = user.canonical || user.email || "";
  if (!contact) return;

  try {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/api/account/deletion-status?contact=${encodeURIComponent(contact)}`, {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    });
    const data = await res.json().catch(() => null);
    if (!data?.deleted) return false;

    card.hidden = false;

    const sidebar = document.querySelector(".dashboard-sidebar");
    if (sidebar) sidebar.hidden = true;

    const mainLayout = document.querySelector(".dashboard-layout");
    if (mainLayout) {
      mainLayout.style.display = "flex";
      mainLayout.style.alignItems = "center";
      mainLayout.style.justifyContent = "center";
      mainLayout.style.minHeight = "80vh";
      mainLayout.style.padding = "0";
    }

    document.querySelectorAll("[data-tab-panel]").forEach(el => el.hidden = true);
    document.querySelector(".dashboard-sidebar")?.setAttribute("hidden", "");

    const countdown = document.getElementById("deletionCountdown");
    const expiry = document.getElementById("deletionExpiry");
    const downloadLink = document.getElementById("deletionDownloadLink");
    const restoreBtn = document.getElementById("deletionRestoreBtn");
    const status = document.getElementById("deletionStatus");

    if (data.expiresAt) {
      const exp = new Date(data.expiresAt);
      if (expiry) expiry.textContent = `Expires: ${exp.toLocaleString()}`;

      const update = () => {
        const diff = exp - Date.now();
        if (diff <= 0) {
          if (countdown) countdown.textContent = "Deletion window has expired.";
          return;
        }
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        if (countdown) countdown.textContent = `Time remaining: ${days}d ${hours}h ${mins}m ${secs}s`;
      };
      update();
      setInterval(update, 1000);
    }

    if (data.downloadUrl && downloadLink) {
      downloadLink.href = data.downloadUrl;
      downloadLink.hidden = false;
    }

    if (data.canRestore !== false && restoreBtn && data.recoveryCode) {
      restoreBtn.hidden = false;
      restoreBtn.addEventListener("click", async () => {
        restoreBtn.disabled = true;
        restoreBtn.textContent = "Restoring...";
        try {
          const r = await fetch(`${API_BASE}/api/account/restore`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ recoveryCode: data.recoveryCode }),
          });
          const rd = await r.json().catch(() => null);
          if (!r.ok || (rd && rd.ok === false)) throw new Error(rd?.error || `Error ${r.status}`);
          if (status) { status.textContent = "Account restored! Redirecting to dashboard..."; status.classList.add("is-success"); }
          setTimeout(() => { window.location.reload(); }, 2000);
        } catch (err) {
          if (status) { status.textContent = err.message || "Restore failed."; status.classList.add("is-error"); }
          restoreBtn.disabled = false;
          restoreBtn.textContent = "Restore My Account";
        }
      });
    }
    return true;
  } catch {
    return false;
  }
}

function init() {
  enforceDashboardAccess();
  renderAccountInfo();
  renderSheetLink();
  renderHistoryHeatmaps();

  wireTabEvents();
  wireInitialActions();
  wireLogout();

  const initialTab = resolveInitialTab();
  setActiveTab(initialTab, false);

  const deletionReady = checkDeletionStatus();

  void finalizeBillingFromRedirect().finally(() => {
    void loadBillingOverview();
  });
  const snapshotReady = loadBackendUserSnapshot().finally(() => {
    void bootData();
  });

  initDeleteAccountFlow();
  void initAlgoConsentToggle();

  // Show the email-verify overlay only after BOTH the backend snapshot and
  // the deletion check settle. Previously two racing callers triggered the
  // run-once overlay; when the deletion check won, the overlay rendered from
  // the stale login-time localStorage user and re-prompted already-verified
  // accounts.
  Promise.allSettled([snapshotReady, deletionReady]).then(([, deletion]) => {
    const isDeleted = deletion.status === "fulfilled" && deletion.value === true;
    if (!isDeleted && document.getElementById("deletionStatusCard")?.hidden !== false) {
      showEmailVerificationOnce();
      // Algo-improvement consent notification — queues behind the email
      // overlay if that is showing, and only appears until answered.
      showCalcConsentPromptOnce();
    }
  });
}

function initDeleteAccountFlow() {
  const deleteBtn = document.getElementById("deleteAccountBtn");
  const confirmSection = document.getElementById("deleteConfirmSection");
  const confirmInput = document.getElementById("deleteConfirmInput");
  const confirmBtn = document.getElementById("deleteConfirmBtn");
  const cancelBtn = document.getElementById("deleteCancelBtn");
  const confirmText = document.getElementById("deleteConfirmText");
  const status = document.getElementById("deleteStatus");

  if (!deleteBtn || !confirmSection) return;

  const user = readAuthUser() || {};
  const username = String(user.username || "user").trim();
  const deletePhrase = `${username}-Delete`;

  if (confirmText) confirmText.textContent = deletePhrase;

  deleteBtn.addEventListener("click", () => {
    deleteBtn.parentElement.hidden = true;
    confirmSection.hidden = false;
    if (confirmInput) {
      confirmInput.value = "";
      confirmInput.focus();
    }
  });

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      confirmSection.hidden = true;
      deleteBtn.parentElement.hidden = false;
      if (status) {
        status.textContent = "";
        status.classList.remove("is-error", "is-success");
      }
    });
  }

  if (confirmInput && confirmBtn) {
    confirmInput.addEventListener("input", () => {
      confirmBtn.disabled = confirmInput.value.trim() !== deletePhrase;
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {
      if (confirmBtn.disabled) return;
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Deleting...";
      if (status) {
        status.textContent = "";
        status.classList.remove("is-error", "is-success");
      }

      try {
        const token = getAuthToken();
        const res = await fetch(`${API_BASE}/api/account/delete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            confirmation: deletePhrase,
            requestedAt: new Date().toISOString(),
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || (data && data.ok === false)) {
          throw new Error(data?.error || `Server error (${res.status})`);
        }

        const downloadUrl = data?.downloadUrl || "";
        const recoveryCode = data?.recoveryCode || "";
        const expiresAt = data?.expiresAt || "";

        const msgParts = ["Account deletion started."];
        if (downloadUrl) msgParts.push(`Download your data: ${downloadUrl}`);
        if (recoveryCode) msgParts.push(`Recovery code: ${recoveryCode}`);
        if (expiresAt) msgParts.push(`Restore available until: ${new Date(expiresAt).toLocaleDateString()}`);

        if (status) {
          status.innerHTML = msgParts.join("<br>");
          status.classList.add("is-success");
        }

        setTimeout(() => {
          localStorage.removeItem("tracker.auth.session");
          localStorage.removeItem("tracker.auth.user");
          localStorage.removeItem("tracker.authenticated");
          window.location.href = "https://thetrackerapp.io/login?deleted=1";
        }, 2000);
      } catch (err) {
        if (status) {
          status.textContent = err.message || "Failed to submit deletion request.";
          status.classList.add("is-error");
        }
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Yes, Delete All My Data";
      }
    });
  }
}

// ============================================
// ENHANCED BODY MEASUREMENTS & GRAFANA CHARTS
// ============================================

// Populate the static measurement spans in dashboard.html from the most-recent
// body-measure entry in `state.bodyMeasures`. This runs after the existing
// `loadBodyMeasuresAndRender()` finishes loading. The chart code now lives in
// `src/dashboard-charts.js` and is invoked separately via expand button.
function renderEnhancedBodyMeasurements() {
  const entries = state.bodyMeasures || [];
  if (!entries.length) return;
  const latest = entries[entries.length - 1] || {};
  const previous = entries.length > 1 ? entries[entries.length - 2] : null;

  const fields = {
    measureHeight: latest.height,
    measureWeight: latest.weight || latest.bodyweight,
    measureBodyFat: latest.bodyFat,
    measureDate: latest.date ? new Date(latest.date).toLocaleDateString() : null,
    measureBicepL: latest.bicepL || latest.bicepLeft,
    measureBicepR: latest.bicepR || latest.bicepRight,
    measureForearmL: latest.forearmL || latest.forearmLeft,
    measureForearmR: latest.forearmR || latest.forearmRight,
    measureChest: latest.chest,
    measureShoulders: latest.shoulders,
    measureNeck: latest.neck,
    measureLats: latest.lats,
    measureTraps: latest.traps,
    measureSerratus: latest.serratus || latest.serratusAnterior,
    measureWaist: latest.waist,
    measureAbs: latest.abs,
    measureObliques: latest.obliques,
    measureQuadL: latest.quadL || latest.quadLeft,
    measureQuadR: latest.quadR || latest.quadRight,
    measureCalfL: latest.calfL || latest.calfLeft,
    measureCalfR: latest.calfR || latest.calfRight,
    measureGlutes: latest.glutes || latest.glute,
  };

  for (const [id, value] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (!el || value === undefined || value === null || value === "") continue;
    // Re-render display while preserving the unit suffix that inline-edit looks
    // for (`<span class="value">` + `<span class="unit">`).
    const unit = el.dataset?.unit || "";
    if (el.classList.contains("measurement-value")) {
      el.innerHTML = `<span class="value">${typeof value === "number" ? value.toFixed(1) : value}</span><span class="unit">${unit}</span>`;
    } else {
      el.textContent = typeof value === "number" ? value.toFixed(1) : value;
    }
  }

  const deltaEl = document.getElementById("measureWeightDelta");
  if (deltaEl && latest.weight && previous?.weight) {
    const delta = latest.weight - previous.weight;
    deltaEl.textContent = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} lb`;
    deltaEl.className = `stat-delta ${delta > 0 ? "positive" : delta < 0 ? "negative" : ""}`;
  }
}

// Auto-initialise the Grafana-style chart panel at the top of the Stats tab.
// The container is now visible by default (no expand toggle); the module
// fetches /api/chart/data and renders the spotlight + quick + advanced view.
// We intentionally re-init on every call so the Stats data refreshes whenever
// the user navigates back to this tab (no stale-data on tab-switch surprises).
function initBodyMeasurementCharts() {
  const chartsContainer = document.getElementById("progressChartsContainer");
  if (!chartsContainer) return;
  initDashboardCharts(chartsContainer).catch((err) => {
    console.warn("initDashboardCharts failed:", err);
  });
}

// Initialize on page load
function initEnhancedDashboard() {
  renderEnhancedBodyMeasurements();
  initBodyMeasurementCharts();
  // Mount the deferred-onboarding checklist bell (top of the sidebar nav).
  initChecklist().catch((e) => console.warn("initChecklist failed:", e));

  // Apply backend-driven feature flags so dashboardTabs.* / footer.* / etc.
  // take effect on this page. Without this call the Stats / Personal Trainer /
  // Groups / Run Clubs tab buttons ignore the `data-feature` attribute and
  // always render visible. After flags resolve, if the URL pointed at a tab
  // that just got hidden, snap back to Stats so the user isn't stranded on
  // an invisible panel.
  initFeatureFlags()
    .then(() => {
      const activeBtn = document.querySelector(`[data-tab="${state.activeTab}"]`);
      if (activeBtn?.hidden) setActiveTab("stats");
    })
    .catch((e) => console.warn("initFeatureFlags failed:", e));
  // Wire up click-to-edit on every measurement value, goal, height, date and
  // qualitative-assessment journal in the Body Measurements panel.
  const panel = document.getElementById("bodyMeasurementsSection");
  if (panel) {
    attachInlineEditMeasurements(panel);
    // Also fetch the consolidated measurements + journals + goal endpoint so
    // qualitative-assessment text and the goal badge are populated on load.
    // The existing /api/body-measures fetch only returns the measurements
    // array, not journals/goal/etc.
    fetchAuthedApi(`${API_BASE}/api/user/measurements`)
      .then((res) => (res && res.ok ? res.json() : null))
      .then((data) => {
        if (data) hydrateInlineEditMeasurements(data, panel);
      })
      .catch(() => {
        // Endpoint may not exist yet on the backend - the panel is still
        // editable, just without pre-populated journals.
      });
  }
}

// Debug helper: run `__billingDebugOn()` in console to show billing payloads
window.__billingDebugOn = function () { window.__billingDebug = true; console.log("[billing] debug ON — billing payloads will now log"); };
window.__billingDebugOff = function () { window.__billingDebug = false; console.log("[billing] debug OFF"); };
window.__fetchBillingPayload = async function () {
  window.__billingDebug = true;
  console.log("[billing] Re-fetching billing payload...");
  await loadBillingOverview();
};

// Hook into existing body measures load after init
function enhanceBodyMeasuresAfterLoad() {
  const origLoad = loadBodyMeasuresAndRender;
  window.loadBodyMeasuresAndRender = async function() {
    await origLoad();
    renderEnhancedBodyMeasurements();
    const panel = document.getElementById("bodyMeasurementsSection");
    if (panel) attachInlineEditMeasurements(panel);
  };
}

initGoogleAnalytics();
init();
setTimeout(() => {
  initEnhancedDashboard();
  renderEnhancedBodyMeasurements();
}, 500);
