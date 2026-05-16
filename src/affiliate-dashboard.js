import { inject } from "@vercel/analytics";
import { initGoogleAnalytics } from "./google-analytics.js";
import { affiliateConnect, affiliateStatus, readStoredAffiliateIdentity } from "./api.js";
import {
  buildAffiliateShape,
  hasAffiliateProfile,
  pickNumber,
  pickString,
  readAffiliateChargesEnabled,
  readAffiliateCode,
  readAffiliateDisabledReason,
  readAffiliateOnboardingUrl,
  readAffiliatePayoutsEnabled,
  readAffiliateReferralUrl,
  readAffiliateRequirements,
  readAffiliateStripeStatus,
} from "./affiliate-shape.js";

const AUTH_FLAG_KEY = "tracker.authenticated";
const AUTH_USER_KEY = "tracker.auth.user";
const AUTH_SESSION_KEY = "tracker.auth.session";
const AFFILIATE_EMAIL_STORAGE_KEY = "tracker.affiliate.email";
const DASHBOARD_ORIGIN = "https://dashboard.thetrackerapp.io";
const SELF_URL = `${DASHBOARD_ORIGIN}/affiliate/dashboard`;
const MAIN_SITE_LOGOUT_URL = "https://thetrackerapp.io/logout?next=%2F";

const els = {
  loading: document.getElementById("affiliateLoading"),
  empty: document.getElementById("affiliateEmpty"),
  error: document.getElementById("affiliateError"),
  errorMessage: document.getElementById("affiliateErrorMessage"),
  retryButton: document.getElementById("affiliateRetryButton"),
  dashboard: document.getElementById("affiliateDashboard"),
  greeting: document.getElementById("affiliateGreeting"),
  identity: document.getElementById("affiliateIdentity"),
  referralLink: document.getElementById("affiliateReferralLink"),
  affiliateCode: document.getElementById("affiliateCode"),
  copyButton: document.getElementById("affiliateCopyButton"),
  copyStatus: document.getElementById("affiliateCopyStatus"),
  clicks: document.getElementById("affiliateClicks"),
  signups: document.getElementById("affiliateSignups"),
  conversions: document.getElementById("affiliateConversions"),
  calculated: document.getElementById("affiliateCalculated"),
  held: document.getElementById("affiliateHeld"),
  sent: document.getElementById("affiliateSent"),
  stripeStatusText: document.getElementById("affiliateStripeStatusText"),
  connectButton: document.getElementById("affiliateConnectButton"),
  connectStatus: document.getElementById("affiliateConnectStatus"),
  referralsEmpty: document.getElementById("affiliateReferralsEmpty"),
  referralsList: document.getElementById("affiliateReferralsList"),
  logoutLink: document.getElementById("affiliateLogoutLink"),
  navApplyLink: document.getElementById("affiliateNavApplyLink"),
};

let cachedAuth = null;
let cachedStatus = null;

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

function persistAuthFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const payloadUser = decodeAuthPayload(params.get("auth_payload"));
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
        JSON.stringify({ token: sessionToken, expiresAt: sessionExpiresAt || null }),
      );
    }
  } catch {
    // Ignore storage failures.
  }

  params.delete("auth_payload");
  params.delete("session_token");
  params.delete("session_expires_at");
  const clean = params.toString();
  window.history.replaceState({}, "", `${window.location.pathname}${clean ? `?${clean}` : ""}${window.location.hash || ""}`);
}

function readStoredAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function readStoredAffiliateEmail() {
  try {
    return window.localStorage.getItem(AFFILIATE_EMAIL_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function resolveAffiliateIdentity() {
  const auth = readStoredAuth();
  const fallbackEmail = String(auth?.email || readStoredAffiliateEmail() || "").trim().toLowerCase();
  const identity = {
    ...readStoredAffiliateIdentity(),
    ...(fallbackEmail ? { email: fallbackEmail } : {}),
  };

  if (!identity.email && !identity.username && !identity.contact && !identity.phone && !identity.accountId) {
    return null;
  }
  return { ...identity, auth: auth || null };
}

function redirectToLogin() {
  const next = encodeURIComponent(SELF_URL);
  window.location.href = `/login?next=${next}`;
}

function showOnly(section) {
  [els.loading, els.empty, els.error, els.dashboard].forEach((node) => {
    if (!node) return;
    node.hidden = node !== section;
  });
}

function showLoading() {
  if (els.navApplyLink) {
    els.navApplyLink.hidden = true;
  }
  showOnly(els.loading);
}
function showEmpty() {
  if (els.navApplyLink) {
    els.navApplyLink.hidden = false;
  }
  showOnly(els.empty);
}
function showError(message) {
  if (els.errorMessage) {
    els.errorMessage.textContent = message || "Something went wrong.";
  }
  if (els.navApplyLink) {
    els.navApplyLink.hidden = true;
  }
  showOnly(els.error);
}
function showDashboard() {
  if (els.navApplyLink) {
    els.navApplyLink.hidden = true;
  }
  showOnly(els.dashboard);
}

function formatCents(cents) {
  const num = Number(cents);
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(safe / 100);
}

function renderHeader(identity, shape) {
  const name = pickString(shape.affiliate, ["name", "fullName", "displayName"]);
  const label =
    pickString(shape.affiliate, ["email", "username", "handle"]) ||
    String(identity?.email || identity?.username || identity?.contact || identity?.accountId || "").trim();

  if (els.greeting) {
    els.greeting.textContent = name ? `Welcome back, ${name}` : "Your affiliate dashboard";
  }
  if (els.identity) {
    els.identity.textContent = label || "your account";
  }
}

function renderReferralLink(shape) {
  const code = readAffiliateCode(shape);
  const url = readAffiliateReferralUrl(shape);

  if (els.referralLink) {
    els.referralLink.value = url || "";
  }
  if (els.affiliateCode) {
    els.affiliateCode.textContent = code || "—";
  }
}

function renderCounts(shape) {
  const clicks = pickNumber(shape.counts, ["clicks", "clickCount", "totalClicks", "linkClicks"]);
  const signups = pickNumber(shape.counts, [
    "totalReferredSubscribers",
    "signups",
    "signupCount",
    "totalSignups",
    "leads",
  ]);
  const conversions = pickNumber(shape.counts, [
    "totalQualifiedSubscribers",
    "conversions",
    "conversionCount",
    "paidConversions",
    "subscribers",
    "subscriberCount",
  ]);

  if (els.clicks) els.clicks.textContent = clicks.toLocaleString();
  if (els.signups) els.signups.textContent = signups.toLocaleString();
  if (els.conversions) els.conversions.textContent = conversions.toLocaleString();
}

function renderTotals(shape) {
  const calculated = pickNumber(shape.totals, [
    "totalPayoutsCalculatedCents",
    "calculatedCents",
    "calculated_cents",
    "calculated",
  ]);
  const held = pickNumber(shape.totals, [
    "totalPayoutsHeldCents",
    "heldCents",
    "held_cents",
    "held",
    "pendingCents",
  ]);
  const sent = pickNumber(shape.totals, [
    "totalPayoutsSentCents",
    "sentCents",
    "sent_cents",
    "sent",
    "paidCents",
  ]);

  if (els.calculated) els.calculated.textContent = formatCents(calculated);
  if (els.held) els.held.textContent = formatCents(held);
  if (els.sent) els.sent.textContent = formatCents(sent);
}

function renderStripeConnect(shape) {
  const status = readAffiliateStripeStatus(shape).toLowerCase();
  const payoutsEnabled = readAffiliatePayoutsEnabled(shape);
  const chargesEnabled = readAffiliateChargesEnabled(shape);
  const currentlyDue = readAffiliateRequirements(shape);
  const disabledReason = readAffiliateDisabledReason(shape);

  if (!els.connectButton || !els.stripeStatusText) {
    return;
  }

  if (status === "active" || (payoutsEnabled && chargesEnabled)) {
    els.stripeStatusText.textContent = "Stripe connected — charges and payouts are enabled.";
    els.connectButton.textContent = "Manage Stripe account";
    els.connectButton.classList.remove("btn-primary");
    els.connectButton.classList.add("btn-secondary");
    return;
  }

  if (currentlyDue.length) {
    els.stripeStatusText.textContent = `Stripe needs ${currentlyDue.length} more item${currentlyDue.length === 1 ? "" : "s"} before payouts are enabled.`;
    els.connectButton.textContent = "Continue Stripe onboarding";
    return;
  }

  if (disabledReason) {
    els.stripeStatusText.textContent = `Stripe needs more information before payouts are enabled: ${disabledReason}.`;
    els.connectButton.textContent = "Continue Stripe onboarding";
    return;
  }

  if (status === "onboarding" || status === "pending" || status === "restricted") {
    els.stripeStatusText.textContent = "Stripe onboarding is in progress. Finish setup to start receiving payouts.";
    els.connectButton.textContent = "Continue Stripe onboarding";
    return;
  }

  els.stripeStatusText.textContent = "Connect Stripe to receive your earnings.";
  els.connectButton.textContent = "Connect Stripe";
}

function renderReferrals(shape) {
  const referrals = shape.referrals || [];
  if (!els.referralsList || !els.referralsEmpty) {
    return;
  }

  if (!referrals.length) {
    els.referralsList.hidden = true;
    els.referralsList.replaceChildren();
    els.referralsEmpty.hidden = false;
    return;
  }

  els.referralsEmpty.hidden = true;
  els.referralsList.hidden = false;
  els.referralsList.replaceChildren(
    ...referrals.map((entry) => {
      const li = document.createElement("li");
      li.className = "affiliate-referral-item";

      const identityLabel =
        pickString(entry, ["email", "contact", "username", "name"]) || "Anonymous subscriber";
      const statusLabel = pickString(entry, ["status", "billingStatus", "subscriptionStatus"]);
      const signedUpAt = pickString(entry, ["signedUpAt", "createdAt", "joinedAt", "convertedAt"]);

      const main = document.createElement("p");
      main.className = "affiliate-referral-main";
      main.textContent = identityLabel;
      li.appendChild(main);

      const meta = document.createElement("p");
      meta.className = "affiliate-referral-meta";
      const parts = [];
      if (statusLabel) parts.push(statusLabel);
      if (signedUpAt) {
        const parsed = new Date(signedUpAt);
        parts.push(Number.isNaN(parsed.getTime()) ? signedUpAt : parsed.toLocaleDateString());
      }
      meta.textContent = parts.join(" • ");
      if (parts.length) {
        li.appendChild(meta);
      }
      return li;
    }),
  );
}

function setCopyStatus(message, type = "") {
  if (!els.copyStatus) return;
  els.copyStatus.textContent = message;
  els.copyStatus.classList.remove("is-error", "is-success");
  if (type) {
    els.copyStatus.classList.add(type === "error" ? "is-error" : "is-success");
  }
}

async function handleCopy() {
  const url = els.referralLink?.value || "";
  if (!url) {
    setCopyStatus("No referral link yet.", "error");
    return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else if (els.referralLink) {
      els.referralLink.select();
      document.execCommand("copy");
    }
    setCopyStatus("Copied to clipboard.", "success");
  } catch {
    setCopyStatus("Couldn't copy — try selecting the link manually.", "error");
  }
}

function setConnectStatus(message, type = "") {
  if (!els.connectStatus) return;
  els.connectStatus.textContent = message;
  els.connectStatus.classList.remove("is-error", "is-success");
  if (type) {
    els.connectStatus.classList.add(type === "error" ? "is-error" : "is-success");
  }
}

async function handleConnectClick() {
  const identity = resolveAffiliateIdentity();
  if (!identity) {
    redirectToLogin();
    return;
  }

  if (els.connectButton) {
    els.connectButton.disabled = true;
  }
  setConnectStatus("Requesting a fresh Stripe link...", "");

  const returnUrl = `${DASHBOARD_ORIGIN}/dashboard?view=affiliate`;

  try {
    const result = await affiliateConnect({
      email: identity.email,
      username: identity.username,
      contact: identity.contact,
      phone: identity.phone,
      accountId: identity.accountId,
      canonical: identity.canonical,
      returnUrl,
      refreshUrl: returnUrl,
    });
    const resultShape = buildAffiliateShape(result);
    const onboardingUrl =
      readAffiliateOnboardingUrl(resultShape) ||
      pickString(result, ["onboardingUrl", "accountLinkUrl", "redirectUrl", "dashboardUrl", "loginUrl", "manageUrl", "managementUrl"]) ||
      pickString(result?.account, ["onboardingUrl", "accountLinkUrl", "redirectUrl", "dashboardUrl", "loginUrl", "manageUrl", "managementUrl"]);

    if (!onboardingUrl) {
      throw new Error("Stripe did not return an onboarding link.");
    }

    window.location.href = onboardingUrl;
  } catch (error) {
    setConnectStatus(String(error?.message || "Couldn't start Stripe onboarding."), "error");
    if (els.connectButton) {
      els.connectButton.disabled = false;
    }
  }
}

function handleLogout(event) {
  event.preventDefault();
  try {
    window.localStorage.removeItem(AUTH_FLAG_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    window.localStorage.removeItem(AFFILIATE_EMAIL_STORAGE_KEY);
  } catch {
    // ignore
  }
  window.location.replace(MAIN_SITE_LOGOUT_URL);
}

async function loadDashboard(identity) {
  showLoading();

  try {
    const body = await affiliateStatus(identity);

    if (body && typeof body === "object" && body.ok === false) {
      throw new Error(body.error || body.message || "Status request failed.");
    }

    const shape = buildAffiliateShape(body);
    if (!shape) {
      throw new Error("Empty response from status endpoint.");
    }

    cachedStatus = shape;

    if (!hasAffiliateProfile(shape)) {
      showEmpty();
      return;
    }

    renderHeader(identity, shape);
    renderReferralLink(shape);
    renderCounts(shape);
    renderTotals(shape);
    renderStripeConnect(shape);
    renderReferrals(shape);
    showDashboard();
  } catch (error) {
    showError(String(error?.message || "Couldn't load dashboard."));
  }
}

function wireEvents() {
  if (els.copyButton) {
    els.copyButton.addEventListener("click", handleCopy);
  }
  if (els.connectButton) {
    els.connectButton.addEventListener("click", handleConnectClick);
  }
  if (els.retryButton) {
    els.retryButton.addEventListener("click", () => {
      if (cachedAuth) {
        loadDashboard(cachedAuth);
      } else {
        boot();
      }
    });
  }
  if (els.logoutLink) {
    els.logoutLink.hidden = false;
    els.logoutLink.addEventListener("click", handleLogout);
  }
}

function boot() {
  persistAuthFromQuery();
  const identity = resolveAffiliateIdentity();
  if (!identity) {
    redirectToLogin();
    return;
  }
  cachedAuth = identity;
  try {
    if (identity.email) {
      window.localStorage.setItem(AFFILIATE_EMAIL_STORAGE_KEY, identity.email);
    }
  } catch {
    // ignore
  }
  loadDashboard(identity);
}

inject();
initGoogleAnalytics();
wireEvents();
boot();
