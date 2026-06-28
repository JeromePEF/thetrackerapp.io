import { inject } from "@vercel/analytics";
import { initGoogleAnalytics } from "./google-analytics.js";
import { affiliateConnect, affiliateStatus, readStoredAffiliateIdentity } from "./api.js";
import {
  buildAffiliateShape,
  hasAffiliateProfile,
  pickNumber,
  pickString,
  readAffiliateAgreementRequired,
  readAffiliateAgreementSigned,
  readAffiliateAgreementConnectBlocked,
  readAffiliateCanConnectStripe,
  readAffiliateChargesEnabled,
  readAffiliateCode,
  readAffiliateDisabledReason,
  readAffiliateOnboardingUrl,
  readAffiliatePayoutsEnabled,
  readAffiliateReferralUrl,
  readAffiliateRequirements,
  readAffiliateStripeStatus,
  readAffiliateAgreementSigningUrl,
  readAffiliateAgreementMessage,
} from "./affiliate-shape.js";

const AUTH_FLAG_KEY = "tracker.authenticated";
const AUTH_USER_KEY = "tracker.auth.user";
const AUTH_SESSION_KEY = "tracker.auth.session";
const AFFILIATE_EMAIL_STORAGE_KEY = "tracker.affiliate.email";
const DASHBOARD_ORIGIN = "https://dashboard.thetrackerapp.io";
const SELF_URL = `${DASHBOARD_ORIGIN}/affiliate/dashboard`;
const MAIN_SITE_LOGOUT_URL = "https://thetrackerapp.io/logout?next=%2F";
const AGREEMENT_POLL_MS = 5000;

const els = {
  loading: document.getElementById("affiliateLoading"),
  empty: document.getElementById("affiliateEmpty"),
  error: document.getElementById("affiliateError"),
  errorMessage: document.getElementById("affiliateErrorMessage"),
  retryButton: document.getElementById("affiliateRetryButton"),
  dashboard: document.getElementById("affiliateDashboard"),
  greeting: document.getElementById("affiliateGreeting"),
  identity: document.getElementById("affiliateIdentity"),
  // Gated step cards
  pendingCard: document.getElementById("affiliatePendingCard"),
  agreementCard: document.getElementById("affiliateAgreementCard"),
  agreementMessage: document.getElementById("affiliateAgreementMessage"),
  signingLink: document.getElementById("affiliateSigningLink"),
  resendAgreementBtn: document.getElementById("affiliateResendAgreementBtn"),
  agreementStatus: document.getElementById("affiliateAgreementStatus"),
  connectCard: document.getElementById("affiliateConnectCard"),
  stripeStatusText: document.getElementById("affiliateStripeStatusText"),
  connectButton: document.getElementById("affiliateConnectButton"),
  connectStatus: document.getElementById("affiliateConnectStatus"),
  activeSection: document.getElementById("affiliateActiveSection"),
  // Active cards
  referralLink: document.getElementById("affiliateReferralLink"),
  affiliateCode: document.getElementById("affiliateCode"),
  copyButton: document.getElementById("affiliateCopyButton"),
  copyStatus: document.getElementById("affiliateCopyStatus"),
  clicks: document.getElementById("affiliateClicks"),
  signups: document.getElementById("affiliateSignups"),
  conversions: document.getElementById("affiliateConversions"),
  referralsEmpty: document.getElementById("affiliateReferralsEmpty"),
  referralsList: document.getElementById("affiliateReferralsList"),
  logoutLink: document.getElementById("affiliateLogoutLink"),
  navApplyLink: document.getElementById("affiliateNavApplyLink"),
};

let cachedAuth = null;
let cachedStatus = null;
let agreementPollTimer = null;

function showOnly(target) {
  [els.loading, els.empty, els.error, els.dashboard].forEach(function (el) {
    if (el) el.hidden = true;
  });
  if (target) target.hidden = false;
}

function showEmpty() {
  showOnly(els.empty);
}

function showLoading() {
  showOnly(els.loading);
}

function showError(message) {
  showOnly(els.error);
  if (els.errorMessage) {
    els.errorMessage.textContent = String(message || "Couldn't load dashboard.");
  }
}

function setStatus(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.classList.remove("is-error", "is-success");
  if (type) el.classList.add(type);
}

function setCopyStatus(message, type) {
  if (!els.copyStatus) return;
  els.copyStatus.textContent = message;
  els.copyStatus.classList.remove("is-error", "is-success");
  if (type) els.copyStatus.classList.add(type);
}

function readAuthUser() {
  try {
    var raw = window.localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function resolveIdentity() {
  var user = readAuthUser();
  if (!user) return null;

  var stored = readStoredAffiliateIdentity();
  return {
    email: stored.email || user.email || "",
    username: stored.username || user.username || "",
    canonical: stored.canonical || user.canonical || "",
    accountId: stored.accountId || user.accountId || "",
    contact: stored.contact || user.email || user.credential || "",
    phone: stored.phone || "",
  };
}

function stringOr(value, fallback) {
  return String(value || "").trim() || fallback;
}

// ── Render functions ────────────────────────────────────────────────

function renderHeader(identity, shape) {
  var name = pickString(shape.affiliate, ["name", "fullName", "displayName"]) || stringOr(identity.username, "Affiliate");
  var label = pickString(shape.affiliate, ["email", "username", "handle"]) || identity.email || identity.username;

  if (els.greeting) els.greeting.textContent = name ? "Welcome back, " + name : "Your dashboard";
  if (els.identity) els.identity.textContent = label || identity.email || identity.username || "";
}

function renderReferralLink(shape) {
  var url = readAffiliateReferralUrl(shape);
  var code = readAffiliateCode(shape);
  if (els.referralLink) els.referralLink.value = url || "";
  if (els.affiliateCode) els.affiliateCode.textContent = code || "—";
}

function renderCounts(shape) {
  var clicks = pickNumber(shape.counts, ["clicks", "clickCount", "totalClicks", "linkClicks"]);
  var signups = pickNumber(shape.counts, ["totalReferredSubscribers", "signups", "signupCount", "totalSignups", "leads"]);
  var conversions = pickNumber(shape.counts, ["totalQualifiedSubscribers", "conversions", "conversionCount", "paidConversions", "subscribers", "subscriberCount"]);

  if (els.clicks) els.clicks.textContent = clicks.toLocaleString();
  if (els.signups) els.signups.textContent = signups.toLocaleString();
  if (els.conversions) els.conversions.textContent = conversions.toLocaleString();
}

function renderStripeConnect(shape) {
  if (els.connectCard) els.connectCard.hidden = false;

  var status = readAffiliateStripeStatus(shape).toLowerCase();
  var payoutsEnabled = readAffiliatePayoutsEnabled(shape);
  var chargesEnabled = readAffiliateChargesEnabled(shape);
  var reqs = readAffiliateRequirements(shape);
  var disabledReason = readAffiliateDisabledReason(shape);

  if (!els.connectButton || !els.stripeStatusText) return;

  if (status === "active" || (payoutsEnabled && chargesEnabled)) {
    els.stripeStatusText.textContent = "Stripe connected — charges and payouts are enabled.";
    els.connectButton.textContent = "Manage Stripe account";
    els.connectButton.classList.remove("btn-primary");
    els.connectButton.classList.add("btn-secondary");
    return;
  }

  if (reqs && reqs.length) {
    els.stripeStatusText.textContent = "Stripe needs more information before payouts are enabled.";
    els.connectButton.textContent = "Continue Stripe onboarding";
    return;
  }

  if (disabledReason) {
    els.stripeStatusText.textContent = "Stripe needs more information: " + disabledReason + ".";
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
  var referrals = shape.referrals || [];
  if (!els.referralsList || !els.referralsEmpty) return;

  if (!referrals.length) {
    els.referralsList.hidden = true;
    els.referralsList.replaceChildren();
    els.referralsEmpty.hidden = false;
    return;
  }

  els.referralsEmpty.hidden = true;
  els.referralsList.hidden = false;
  els.referralsList.replaceChildren.apply(els.referralsList, referrals.map(function (entry) {
    var li = document.createElement("li");
    li.className = "affiliate-referral-item";

    var identityLabel = pickString(entry, ["email", "contact", "username", "name"]) || "Anonymous subscriber";
    var statusLabel = pickString(entry, ["status", "billingStatus", "subscriptionStatus"]);
    var signedUpAt = pickString(entry, ["signedUpAt", "createdAt", "joinedAt", "convertedAt"]);

    var main = document.createElement("p");
    main.className = "affiliate-referral-main";
    main.textContent = identityLabel;
    li.appendChild(main);

    var meta = document.createElement("p");
    meta.className = "affiliate-referral-meta";
    var parts = [];
    if (statusLabel) parts.push(statusLabel);
    if (signedUpAt) {
      var d = new Date(signedUpAt);
      parts.push(Number.isNaN(d.getTime()) ? signedUpAt : d.toLocaleDateString());
    }
    meta.textContent = parts.join(" · ");
    li.appendChild(meta);

    return li;
  }));
}

function renderAgreementCard(shape) {
  if (!els.agreementCard) return;
  els.agreementCard.hidden = false;

  var msg = readAffiliateAgreementMessage(shape) || "Please sign the affiliate agreement to continue.";
  if (els.agreementMessage) els.agreementMessage.textContent = msg;

  var signingUrl = readAffiliateAgreementSigningUrl(shape);
  if (els.signingLink && signingUrl) {
    els.signingLink.href = signingUrl;
    els.signingLink.hidden = false;
  } else if (els.signingLink) {
    els.signingLink.hidden = true;
  }
}

// ── State machine ────────────────────────────────────────────────────

function isFullyActive(shape) {
  var stripeStatus = readAffiliateStripeStatus(shape).toLowerCase();
  var payoutsEnabled = readAffiliatePayoutsEnabled(shape);
  var chargesEnabled = readAffiliateChargesEnabled(shape);
  return stripeStatus === "active" || (payoutsEnabled && chargesEnabled);
}

function reshowDashboard() {
  loadDashboard(resolveIdentity());
}

function startAgreementPolling() {
  stopAgreementPolling();
  agreementPollTimer = window.setInterval(function () {
    var identity = resolveIdentity();
    if (!identity) return;
    affiliateStatus(identity).then(function (body) {
      if (!body || body.ok === false) return;
      var shape = buildAffiliateShape(body);
      if (!shape) return;
      cachedStatus = shape;

      // If agreement is now signed, stop polling and re-render
      if (readAffiliateAgreementSigned(shape)) {
        stopAgreementPolling();
        reshowDashboard();
      }
    }).catch(function () {});
  }, AGREEMENT_POLL_MS);
}

function stopAgreementPolling() {
  if (agreementPollTimer) {
    window.clearInterval(agreementPollTimer);
    agreementPollTimer = null;
  }
}

function hasApproval(shape) {
  var approved = pickString(shape.affiliate, ["approvalStatus", "status", "state"]) || "";
  return approved === "approved" || approved === "active";
}

function isPending(shape) {
  var status = pickString(shape.affiliate, ["approvalStatus", "status", "state"]) || "";
  return status === "pending" || status === "reviewing" || (!readAffiliateAgreementRequired(shape) && !isFullyActive(shape));
}

// ── Main dashboard rendering ─────────────────────────────────────────

function showDashboard() {
  showOnly(els.dashboard);
}

async function loadDashboard(identity) {
  showLoading();

  try {
    var body;
    try {
      body = identity ? await affiliateStatus(identity) : await affiliateStatus({});
    } catch (e) {
      body = null;
    }

    if (body && typeof body === "object" && body.ok === false) {
      throw new Error(body.error || body.message || "Status request failed.");
    }

    var shape = buildAffiliateShape(body);
    if (!shape) throw new Error("Empty response from status endpoint.");
    cachedStatus = shape;

    if (!hasAffiliateProfile(shape)) {
      showEmpty();
      return;
    }

    stopAgreementPolling();
    renderHeader(identity, shape);

    // Determine which step we're on
    var agreementRequired = readAffiliateAgreementRequired(shape);
    var agreementSigned = readAffiliateAgreementSigned(shape);
    var fullyActive = isFullyActive(shape);
    var approved = hasApproval(shape);

    // Reset all card visibility
    if (els.pendingCard) els.pendingCard.hidden = true;
    if (els.agreementCard) els.agreementCard.hidden = true;
    if (els.connectCard) els.connectCard.hidden = true;
    if (els.activeSection) els.activeSection.hidden = true;

    if (fullyActive) {
      // STEP 4: Fully active — show referral + performance + subscribers
      renderReferralLink(shape);
      renderCounts(shape);
      renderReferrals(shape);
      renderStripeConnect(shape);
      if (els.activeSection) els.activeSection.hidden = false;
    } else if (agreementSigned && !fullyActive) {
      // STEP 3: Agreement signed but Stripe not connected
      renderStripeConnect(shape);
    } else if (agreementRequired && !agreementSigned) {
      // STEP 2: Agreement required, not yet signed
      renderAgreementCard(shape);
      startAgreementPolling();
    } else if (!approved) {
      // STEP 1: Pending admin approval (or hasn't been approved yet)
      if (els.pendingCard) els.pendingCard.hidden = false;
    } else {
      // Fallback — show agreement/connect if available
      if (agreementRequired && !agreementSigned) {
        renderAgreementCard(shape);
        startAgreementPolling();
      } else {
        renderStripeConnect(shape);
      }
    }

    showDashboard();
  } catch (error) {
    showError(String(error?.message || "Couldn't load dashboard."));
  }
}

// ── Event handlers ───────────────────────────────────────────────────

function handleCopy() {
  var url = els.referralLink ? els.referralLink.value : "";
  if (!url) {
    setCopyStatus("No referral link yet.", "error");
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function () {
      setCopyStatus("Copied!", "is-success");
    }).catch(function () {
      if (els.referralLink) {
        els.referralLink.select();
        setCopyStatus("Press Ctrl+C to copy.", "is-success");
      }
    });
  } else if (els.referralLink) {
    els.referralLink.select();
    setCopyStatus("Press Ctrl+C to copy.", "is-success");
  }
}

async function handleConnectClick() {
  if (!els.connectButton) return;
  els.connectButton.disabled = true;
  setStatus(els.connectStatus, "Connecting to Stripe...");

  try {
    var identity = resolveIdentity();
    var body = await affiliateConnect({
      email: identity.email,
      username: identity.username,
      contact: identity.contact,
      phone: identity.phone,
      accountId: identity.accountId,
      canonical: identity.canonical,
      returnUrl: SELF_URL + "?complete=1",
      refreshUrl: SELF_URL + "?complete=1",
    });

    var result = body && typeof body === "object" ? body : {};
    var onboardingUrl = readAffiliateOnboardingUrl({ stripe: result, affiliate: result, body: result });

    var topUrl = result.onboardingUrl || result.accountLinkUrl || result.redirectUrl || result.dashboardUrl || result.loginUrl || result.manageUrl || result.managementUrl;
    if (!onboardingUrl && topUrl) onboardingUrl = topUrl;

    if (onboardingUrl) {
      window.location.href = onboardingUrl;
      return;
    }

    throw new Error("Stripe did not return an onboarding link.");
  } catch (error) {
    setStatus(els.connectStatus, String(error?.message || "Unable to connect Stripe."), "is-error");
  } finally {
    if (els.connectButton) els.connectButton.disabled = false;
  }
}

async function handleResendAgreement() {
  if (!els.resendAgreementBtn) return;
  els.resendAgreementBtn.disabled = true;
  setStatus(els.agreementStatus, "Resending agreement...");

  try {
    var identity = resolveIdentity();
    var body = await affiliateStatus(identity);
    setStatus(els.agreementStatus, "Agreement resent. Check your email.", "is-success");
    reshowDashboard();
  } catch (error) {
    setStatus(els.agreementStatus, String(error?.message || "Could not resend agreement."), "is-error");
  } finally {
    if (els.resendAgreementBtn) els.resendAgreementBtn.disabled = false;
  }
}

function handleLogout() {
  try {
    window.localStorage.removeItem(AUTH_FLAG_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    window.localStorage.removeItem(AFFILIATE_EMAIL_STORAGE_KEY);
  } catch (e) {}
  window.location.replace(MAIN_SITE_LOGOUT_URL);
}

// ── Init ─────────────────────────────────────────────────────────────

function wireEvents() {
  if (els.copyButton) els.copyButton.addEventListener("click", handleCopy);
  if (els.connectButton) els.connectButton.addEventListener("click", handleConnectClick);
  if (els.resendAgreementBtn) els.resendAgreementBtn.addEventListener("click", handleResendAgreement);
  if (els.logoutLink) {
    els.logoutLink.addEventListener("click", function (e) { e.preventDefault(); handleLogout(); });
  }
  if (els.retryButton) {
    els.retryButton.addEventListener("click", function () { loadDashboard(resolveIdentity()); });
  }
}

function init() {
  wireEvents();

  var user = readAuthUser();
  if (els.navApplyLink) els.navApplyLink.hidden = !user;
  if (els.logoutLink) els.logoutLink.hidden = !user;

  if ("affiliateSignup" in window) {
    els.navApplyLink.hidden = true;
    els.loading.hidden = true;
    var checkAff = document.getElementById("affiliateSignupExisting");
    if (checkAff) checkAff.hidden = true;
  }

  var identity = resolveIdentity();
  loadDashboard(identity);
}

inject();
initGoogleAnalytics();
init();
