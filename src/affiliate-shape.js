const REFERRAL_LINK_BASE = "https://thetrackerapp.io";

export function pickValue(obj, keys) {
  if (!obj || typeof obj !== "object") {
    return undefined;
  }

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }

  return undefined;
}

export function pickString(obj, keys, fallback = "") {
  const value = pickValue(obj, keys);
  return value === undefined || value === null ? fallback : String(value).trim();
}

export function pickNumber(obj, keys, fallback = 0) {
  const value = pickValue(obj, keys);
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function pickBoolean(obj, keys) {
  const value = pickValue(obj, keys);
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  try {
    return new URL(raw, REFERRAL_LINK_BASE).toString();
  } catch {
    return raw;
  }
}

function findUrl(obj, keys, matcher = null) {
  if (!obj || typeof obj !== "object") {
    return "";
  }

  for (const key of keys) {
    const normalized = normalizeUrl(obj[key]);
    if (!normalized) {
      continue;
    }
    if (!matcher || matcher(normalized)) {
      return normalized;
    }
  }

  return "";
}

function sameTrackerHost(hostname) {
  const targetHost = new URL(REFERRAL_LINK_BASE).hostname.toLowerCase();
  const host = String(hostname || "").trim().toLowerCase();
  return host === targetHost || host.endsWith(`.${targetHost}`);
}

function looksLikeReferralUrl(value) {
  try {
    const parsed = new URL(normalizeUrl(value));
    if (!sameTrackerHost(parsed.hostname)) {
      return false;
    }
    return (
      parsed.pathname.startsWith("/r/") ||
      parsed.searchParams.has("ref") ||
      parsed.searchParams.has("referral") ||
      parsed.searchParams.has("affiliate") ||
      parsed.searchParams.has("affiliateCode") ||
      parsed.searchParams.has("referralCode")
    );
  } catch {
    return false;
  }
}

function looksLikeStripeUrl(value) {
  try {
    const parsed = new URL(normalizeUrl(value));
    const host = parsed.hostname.toLowerCase();
    return host === "stripe.com" || host.endsWith(".stripe.com");
  } catch {
    return false;
  }
}

function safeReferralUrlFromCode(code) {
  const normalizedCode = String(code || "").trim();
  if (!normalizedCode) {
    return "";
  }
  return `${REFERRAL_LINK_BASE}/?ref=${encodeURIComponent(normalizedCode)}`;
}

function looksLikeEmail(value) {
  return /^\S+@\S+\.\S+$/.test(String(value || "").trim());
}

function looksLikePhoneIdentifier(value) {
  const raw = String(value || "").trim();
  if (!raw || /[*•]/.test(raw) || /[a-z]/i.test(raw) || looksLikeEmail(raw)) {
    return false;
  }

  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && /^[+()\s.-\d]+$/.test(raw);
}

function sanitizePublicAffiliateCode(value) {
  const raw = String(value || "").trim();
  if (!raw || looksLikeEmail(raw) || looksLikePhoneIdentifier(raw) || /[*•]/.test(raw)) {
    return "";
  }
  return raw;
}

function pickPublicCode(obj, keys) {
  if (!obj || typeof obj !== "object") {
    return "";
  }

  for (const key of keys) {
    const safe = sanitizePublicAffiliateCode(obj[key]);
    if (safe) {
      return safe;
    }
  }

  return "";
}

function referralCodeFromTrackerUrl(parsed) {
  if (!(parsed instanceof URL) || !sameTrackerHost(parsed.hostname)) {
    return "";
  }

  if (parsed.pathname.startsWith("/r/")) {
    return decodeURIComponent(parsed.pathname.slice(3)).trim();
  }

  const keys = ["ref", "referral", "affiliate", "affiliateCode", "referralCode"];
  for (const key of keys) {
    const value = String(parsed.searchParams.get(key) || "").trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function normalizeReferralShareUrl(value, fallbackCode = "") {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(normalized);
    if (sameTrackerHost(parsed.hostname)) {
      const explicitCode = referralCodeFromTrackerUrl(parsed);
      if (explicitCode) {
        const safeCode = sanitizePublicAffiliateCode(explicitCode) || sanitizePublicAffiliateCode(fallbackCode);
        return safeCode ? safeReferralUrlFromCode(safeCode) : "";
      }
    }
    return parsed.toString();
  } catch {
    return normalized;
  }
}

export function buildAffiliateShape(body) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const affiliate = body.affiliate || body.profile || body.account || body;
  const agreement =
    affiliate?.agreement ||
    body.agreement ||
    affiliate?.contract ||
    body.contract ||
    {};
  const stripe =
    affiliate?.stripe ||
    body.stripe ||
    body.connect ||
    body.stripeConnect ||
    body.payouts ||
    {};

  const requirements =
    stripe?.requirements ||
    affiliate?.requirements ||
    body.requirements ||
    {};

  const totals =
    body.totals ||
    affiliate?.totals ||
    body.earnings ||
    affiliate?.earnings ||
    body.summary ||
    affiliate?.summary ||
    body.stats ||
    affiliate?.stats ||
    affiliate ||
    body;

  const counts =
    body.stats ||
    affiliate?.stats ||
    body.counts ||
    affiliate?.counts ||
    body.metrics ||
    affiliate?.metrics ||
    affiliate ||
    body;

  const history =
    body.history ||
    affiliate?.history ||
    {};

  const referrals =
    body.referrals ||
    body.referredSubscribers ||
    body.history?.referrals ||
    body.history?.referredSubscribers ||
    body.history?.subscribers ||
    (Array.isArray(body.history) ? body.history : []) ||
    body.subscribers ||
    body.list ||
    history?.referrals ||
    history?.referredSubscribers ||
    history?.subscribers ||
    affiliate?.referrals ||
    affiliate?.subscribers ||
    [];

  return {
    body,
    affiliate,
    agreement,
    stripe,
    requirements,
    totals,
    counts,
    history,
    referrals: asArray(referrals),
  };
}

export function readAffiliateCode(shape) {
  return (
    pickPublicCode(shape?.affiliate, [
      "code",
      "affiliateCode",
      "referralCode",
      "publicCode",
      "publicId",
      "slug",
      "handle",
      "username",
      "accountId",
      "uuid",
    ]) ||
    pickPublicCode(shape?.body, [
      "code",
      "affiliateCode",
      "referralCode",
      "publicCode",
      "publicId",
      "slug",
      "handle",
      "username",
      "accountId",
      "uuid",
    ])
  );
}

export function readAffiliateReferralUrl(shape) {
  const code = readAffiliateCode(shape);
  const explicitUrl =
    pickString(shape?.affiliate, ["referralUrl", "referralLink", "shareUrl", "share_url"]) ||
    pickString(shape?.body, ["referralUrl", "referralLink", "shareUrl", "share_url"]) ||
    findUrl(shape?.affiliate, ["url"], looksLikeReferralUrl) ||
    findUrl(shape?.body, ["url"], looksLikeReferralUrl);

  if (explicitUrl) {
    return normalizeReferralShareUrl(explicitUrl, code);
  }

  return safeReferralUrlFromCode(code);
}

export function readAffiliateStripeStatus(shape) {
  return (
    pickString(shape?.stripe, ["status", "stripeStatus", "stripeAccountStatus", "connectStatus", "payoutStatus"]) ||
    pickString(shape?.affiliate, ["stripeAccountStatus", "stripeStatus", "connectStatus", "payoutStatus"]) ||
    pickString(shape?.body, ["stripeAccountStatus", "stripeStatus", "connectStatus", "payoutStatus"]) ||
    "unknown"
  );
}

export function readAffiliateChargesEnabled(shape) {
  return (
    pickBoolean(shape?.stripe, ["chargesEnabled", "charges_enabled"]) ||
    pickBoolean(shape?.affiliate, ["chargesEnabled", "charges_enabled"]) ||
    pickBoolean(shape?.body, ["chargesEnabled", "charges_enabled"])
  );
}

export function readAffiliatePayoutsEnabled(shape) {
  return (
    pickBoolean(shape?.stripe, ["payoutsEnabled", "payouts_enabled"]) ||
    pickBoolean(shape?.affiliate, ["payoutsEnabled", "payouts_enabled"]) ||
    pickBoolean(shape?.body, ["payoutsEnabled", "payouts_enabled"])
  );
}

export function readAffiliateDetailsSubmitted(shape) {
  return (
    pickBoolean(shape?.stripe, ["detailsSubmitted", "details_submitted"]) ||
    pickBoolean(shape?.affiliate, ["detailsSubmitted", "details_submitted"]) ||
    pickBoolean(shape?.body, ["detailsSubmitted", "details_submitted"])
  );
}

export function readAffiliateAgreementRequired(shape) {
  return (
    pickBoolean(shape?.agreement, ["required", "isRequired"]) ||
    pickBoolean(shape?.affiliate, ["agreementRequired", "agreement_required"]) ||
    pickBoolean(shape?.body, ["agreementRequired", "agreement_required"])
  );
}

export function readAffiliateAgreementSigned(shape) {
  return (
    pickBoolean(shape?.agreement, ["signed", "completed", "isSigned"]) ||
    pickBoolean(shape?.affiliate, ["agreementSigned", "agreement_signed"]) ||
    pickBoolean(shape?.body, ["agreementSigned", "agreement_signed"])
  );
}

export function readAffiliateAgreementConnectBlocked(shape) {
  return (
    pickBoolean(shape?.agreement, ["connectBlocked", "connect_blocked"]) ||
    pickBoolean(shape?.affiliate, ["connectBlocked", "connect_blocked"]) ||
    pickBoolean(shape?.body, ["connectBlocked", "connect_blocked"])
  );
}

export function readAffiliateCanConnectStripe(shape) {
  if (!shape) {
    return false;
  }

  if (!readAffiliateAgreementRequired(shape)) {
    return true;
  }

  if (
    pickBoolean(shape?.agreement, ["canConnectStripe", "can_connect_stripe"]) ||
    pickBoolean(shape?.affiliate, ["canConnectStripe", "can_connect_stripe"]) ||
    pickBoolean(shape?.body, ["canConnectStripe", "can_connect_stripe"])
  ) {
    return true;
  }

  return readAffiliateAgreementSigned(shape) && !readAffiliateAgreementConnectBlocked(shape);
}

export function readAffiliateAgreementSigningUrl(shape) {
  return (
    pickString(shape?.agreement, ["signingUrl", "signing_url", "url", "signUrl", "sign_url"]) ||
    findUrl(shape?.agreement, ["href", "link"]) ||
    pickString(shape?.affiliate, ["agreementSigningUrl", "agreement_signing_url"]) ||
    pickString(shape?.body, ["agreementSigningUrl", "agreement_signing_url"])
  );
}

export function readAffiliateAgreementStatus(shape) {
  return (
    pickString(shape?.agreement, ["status", "state"]) ||
    pickString(shape?.affiliate, ["agreementStatus", "agreement_status"]) ||
    pickString(shape?.body, ["agreementStatus", "agreement_status"])
  );
}

export function readAffiliateAgreementMessage(shape) {
  return (
    pickString(shape?.agreement, ["message", "description"]) ||
    pickString(shape?.affiliate, ["agreementMessage", "agreement_message"]) ||
    pickString(shape?.body, ["agreementMessage", "agreement_message"])
  );
}

export function readAffiliateOnboardingUrl(shape) {
  return (
    pickString(shape?.stripe, [
      "onboardingUrl",
      "onboarding_url",
      "accountLinkUrl",
      "account_link_url",
      "dashboardUrl",
      "dashboard_url",
      "loginUrl",
      "login_url",
      "manageUrl",
      "manage_url",
      "managementUrl",
      "management_url",
      "redirectUrl",
      "redirect_url",
    ]) ||
    findUrl(shape?.stripe, ["url"], looksLikeStripeUrl) ||
    pickString(shape?.affiliate, [
      "onboardingUrl",
      "onboarding_url",
      "accountLinkUrl",
      "account_link_url",
      "dashboardUrl",
      "dashboard_url",
      "loginUrl",
      "login_url",
      "manageUrl",
      "manage_url",
      "managementUrl",
      "management_url",
      "redirectUrl",
      "redirect_url",
    ]) ||
    findUrl(shape?.affiliate, ["url"], looksLikeStripeUrl) ||
    pickString(shape?.body, [
      "onboardingUrl",
      "onboarding_url",
      "accountLinkUrl",
      "account_link_url",
      "dashboardUrl",
      "dashboard_url",
      "loginUrl",
      "login_url",
      "manageUrl",
      "manage_url",
      "managementUrl",
      "management_url",
      "redirectUrl",
      "redirect_url",
    ]) ||
    findUrl(shape?.body, ["url"], looksLikeStripeUrl)
  );
}

export function readAffiliateRequirements(shape) {
  const directDue =
    pickValue(shape?.stripe, ["currentlyDue", "currently_due"]) ||
    pickValue(shape?.requirements, ["currentlyDue", "currently_due"]) ||
    pickValue(shape?.affiliate, ["currentlyDue", "currently_due"]) ||
    pickValue(shape?.body, ["currentlyDue", "currently_due"]);

  if (Array.isArray(directDue)) {
    return directDue.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return [];
}

export function readAffiliateDisabledReason(shape) {
  return (
    pickString(shape?.stripe, ["disabledReason", "disabled_reason"]) ||
    pickString(shape?.requirements, ["disabledReason", "disabled_reason"]) ||
    pickString(shape?.affiliate, ["disabledReason", "disabled_reason"]) ||
    pickString(shape?.body, ["disabledReason", "disabled_reason"])
  );
}

export function hasAffiliateProfile(shape) {
  if (!shape) {
    return false;
  }

  if (shape.body?.found === false) {
    return false;
  }

  const code = readAffiliateCode(shape);
  const referralUrl = readAffiliateReferralUrl(shape);
  const agreementRequired = readAffiliateAgreementRequired(shape);
  const agreementSigned = readAffiliateAgreementSigned(shape);
  const agreementConnectBlocked = readAffiliateAgreementConnectBlocked(shape);
  const agreementSigningUrl = readAffiliateAgreementSigningUrl(shape);
  const agreementStatus = readAffiliateAgreementStatus(shape);
  const agreementMessage = readAffiliateAgreementMessage(shape);
  const stripeStatus = readAffiliateStripeStatus(shape).toLowerCase();
  const chargesEnabled = readAffiliateChargesEnabled(shape);
  const payoutsEnabled = readAffiliatePayoutsEnabled(shape);
  const detailsSubmitted = readAffiliateDetailsSubmitted(shape);
  const requirements = readAffiliateRequirements(shape);
  const disabledReason = readAffiliateDisabledReason(shape);
  const affiliateId =
    pickString(shape.affiliate, ["id", "affiliateId", "accountId", "stripeAccountId", "connectAccountId"]) ||
    pickString(shape.stripe, ["id", "accountId", "stripeAccountId", "connectAccountId"]);

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

  return Boolean(
    shape.body?.found === true ||
      affiliateId ||
      code ||
      referralUrl ||
      shape.referrals.length ||
      clicks ||
      signups ||
      conversions ||
      calculated ||
      held ||
      sent ||
      agreementRequired ||
      agreementSigned ||
      agreementConnectBlocked ||
      agreementSigningUrl ||
      agreementStatus ||
      agreementMessage ||
      chargesEnabled ||
      payoutsEnabled ||
      detailsSubmitted ||
      requirements.length ||
      disabledReason ||
      !["", "unknown", "none", "missing", "not_started", "not-started"].includes(stripeStatus),
  );
}
