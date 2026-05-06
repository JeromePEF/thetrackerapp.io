import { inject } from "@vercel/analytics";
import { initGoogleAnalytics } from "./google-analytics.js";

const AUTH_FLAG_KEY = "tracker.authenticated";
const AUTH_USER_KEY = "tracker.auth.user";
const LOGIN_PAGE_URL = "https://thetrackerapp.io/login";
const DASHBOARD_HOME_URL = "https://dashboard.thetrackerapp.io/dashboard";

const els = {
  accountIdValue: document.getElementById("accountIdValue"),
  accountContactValue: document.getElementById("accountContactValue"),
  accountMethodValue: document.getElementById("accountMethodValue"),
  accountLoginAtValue: document.getElementById("accountLoginAtValue"),
  navAccount: document.getElementById("navAccount"),
  accountInfoCard: document.getElementById("accountInfoCard"),
};

function isAuthenticated() {
  try {
    return window.localStorage.getItem(AUTH_FLAG_KEY) === "true";
  } catch {
    return false;
  }
}

function enforceDashboardAccess() {
  if (isAuthenticated()) {
    return;
  }

  const nextTarget = window.location.href || DASHBOARD_HOME_URL;
  const loginUrl = `${LOGIN_PAGE_URL}?next=${encodeURIComponent(nextTarget)}`;
  window.location.replace(loginUrl);
}

function readAuthUser() {
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      accountId: String(parsed.accountId || "").trim(),
      maskedCredential: String(parsed.maskedCredential || parsed.credential || "").trim(),
      method: String(parsed.method || "").trim(),
      loginAt: String(parsed.loginAt || "").trim(),
    };
  } catch {
    return null;
  }
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
  if (method === "google") {
    return "Google OTP";
  }
  return "Unknown";
}

function formatLoginTimestamp(value) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleString();
}

function renderAccountInfo() {
  const user = readAuthUser();

  if (els.accountIdValue) {
    els.accountIdValue.textContent = user?.accountId || "Pending";
  }

  if (els.accountContactValue) {
    els.accountContactValue.textContent = user?.maskedCredential || "Pending";
  }

  if (els.accountMethodValue) {
    els.accountMethodValue.textContent = formatMethodLabel(user?.method || "");
  }

  if (els.accountLoginAtValue) {
    els.accountLoginAtValue.textContent = formatLoginTimestamp(user?.loginAt || "");
  }
}

function focusAccountViewIfRequested() {
  const params = new URLSearchParams(window.location.search);
  const accountRequested = params.get("view") === "account" || window.location.hash === "#accountInfoCard";
  if (!accountRequested) {
    return;
  }

  if (els.navAccount) {
    els.navAccount.classList.add("is-active");
  }

  if (els.accountInfoCard) {
    els.accountInfoCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function init() {
  enforceDashboardAccess();
  renderAccountInfo();
  focusAccountViewIfRequested();
}

inject();
initGoogleAnalytics();
init();
