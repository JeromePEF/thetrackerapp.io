import { initGoogleAnalytics } from "./google-analytics.js";
import { affiliateConnect, affiliateStatus, readStoredAffiliateIdentity } from "./api.js";
import {
  buildAffiliateShape,
  readAffiliateChargesEnabled,
  readAffiliateDisabledReason,
  readAffiliateOnboardingUrl,
  readAffiliatePayoutsEnabled,
  readAffiliateRequirements,
  readAffiliateStripeStatus,
} from "./affiliate-shape.js";

const AUTH_USER_KEY = "tracker.auth.user";
const AFFILIATE_EMAIL_STORAGE_KEY = "tracker.affiliate.email";
const DASHBOARD_ORIGIN = "https://dashboard.thetrackerapp.io";
const AFFILIATE_TAB_URL = `${DASHBOARD_ORIGIN}/dashboard?view=affiliate`;
const SELF_URL = `${DASHBOARD_ORIGIN}/affiliate/connect?complete=1`;

const els = {
  heading: document.getElementById("connectHeading"),
  message: document.getElementById("connectMessage"),
  statusList: document.getElementById("connectStatusList"),
  statusValue: document.getElementById("connectStatusValue"),
  chargesValue: document.getElementById("connectChargesValue"),
  payoutsValue: document.getElementById("connectPayoutsValue"),
  retryButton: document.getElementById("connectRetryButton"),
  dashboardLink: document.getElementById("connectDashboardLink"),
};

function resolveAffiliateIdentity() {
  let fallbackEmail = "";
  try {
    const stored = window.localStorage.getItem(AFFILIATE_EMAIL_STORAGE_KEY);
    if (stored) {
      fallbackEmail = String(stored).trim().toLowerCase();
    } else {
      const raw = window.localStorage.getItem(AUTH_USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        fallbackEmail = String(parsed?.email || "").trim().toLowerCase();
      }
    }
  } catch {
    // Ignore.
  }

  const identity = {
    ...readStoredAffiliateIdentity(),
    ...(fallbackEmail ? { email: fallbackEmail } : {}),
  };

  if (!identity.email && !identity.username && !identity.contact && !identity.phone && !identity.accountId) {
    return null;
  }

  return identity;
}

function setMessage(text) {
  if (els.message) {
    els.message.textContent = text;
  }
}

function setHeading(text) {
  if (els.heading) {
    els.heading.textContent = text;
  }
}

function renderStatus(body) {
  const shape = buildAffiliateShape(body);
  const status = readAffiliateStripeStatus(shape) || "unknown";
  const chargesEnabled = readAffiliateChargesEnabled(shape);
  const payoutsEnabled = readAffiliatePayoutsEnabled(shape);
  const requirements = readAffiliateRequirements(shape);
  const disabledReason = readAffiliateDisabledReason(shape);

  if (els.statusList) els.statusList.hidden = false;
  if (els.statusValue) els.statusValue.textContent = status;
  if (els.chargesValue) els.chargesValue.textContent = chargesEnabled ? "Yes" : "Not yet";
  if (els.payoutsValue) els.payoutsValue.textContent = payoutsEnabled ? "Yes" : "Not yet";

  if (status === "active" || (chargesEnabled && payoutsEnabled)) {
    setHeading("You're all set");
    setMessage("Your Stripe account is connected and eligible for payouts.");
    if (els.retryButton) els.retryButton.hidden = true;
    return;
  }

  if (requirements.length) {
    setHeading("Almost there");
    setMessage(`Stripe still needs ${requirements.length} additional item${requirements.length === 1 ? "" : "s"} before payouts are enabled.`);
    if (els.retryButton) els.retryButton.hidden = false;
    return;
  }

  if (disabledReason) {
    setHeading("Almost there");
    setMessage(`Stripe is waiting on more information: ${disabledReason}.`);
    if (els.retryButton) els.retryButton.hidden = false;
    return;
  }

  setHeading("Almost there");
  setMessage(
    "Stripe hasn't confirmed your account is ready for payouts yet. This can happen if onboarding was interrupted, or if Stripe needs to finish reviewing your details.",
  );
  if (els.retryButton) els.retryButton.hidden = false;
}

async function handleResume() {
  const identity = resolveAffiliateIdentity();
  if (!identity) {
    window.location.href = `/login?next=${encodeURIComponent(SELF_URL)}`;
    return;
  }

  if (els.retryButton) {
    els.retryButton.disabled = true;
  }
  setMessage("Restarting Stripe onboarding...");

  try {
    const result = await affiliateConnect({
      email: identity.email,
      username: identity.username,
      contact: identity.contact,
      phone: identity.phone,
      accountId: identity.accountId,
      canonical: identity.canonical,
      returnUrl: SELF_URL,
      refreshUrl: SELF_URL,
    });
    const onboardingUrl = String(
      readAffiliateOnboardingUrl(buildAffiliateShape(result)) ||
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
    window.location.href = onboardingUrl;
  } catch (error) {
    setMessage(String(error?.message || "Couldn't resume Stripe onboarding."));
    if (els.retryButton) {
      els.retryButton.disabled = false;
    }
  }
}

async function refresh() {
  const identity = resolveAffiliateIdentity();
  if (!identity) {
    setHeading("Sign in to continue");
    setMessage("Log in so we can confirm your Stripe account status.");
    if (els.dashboardLink) {
      els.dashboardLink.href = `/login?next=${encodeURIComponent(AFFILIATE_TAB_URL)}`;
      els.dashboardLink.textContent = "Log in";
    }
    return;
  }

  setMessage("Confirming your Stripe account status with our system...");
  try {
    const body = await affiliateStatus(identity);
    renderStatus(body);
  } catch (error) {
    setHeading("Couldn't refresh status");
    setMessage(String(error?.message || "Stripe status check failed. You can try again from your dashboard."));
  }
}

function init() {
  if (els.dashboardLink) {
    els.dashboardLink.href = AFFILIATE_TAB_URL;
  }
  if (els.retryButton) {
    els.retryButton.addEventListener("click", handleResume);
  }
  refresh();
}

initGoogleAnalytics();
init();
