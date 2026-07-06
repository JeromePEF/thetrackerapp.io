import { initGoogleAnalytics } from "./google-analytics.js";
import { requestLoginCode, verifyLoginCode } from "./api.js";

const AUTH_FLAG_KEY = "tracker.authenticated";
const AUTH_USER_KEY = "tracker.auth.user";
const AUTH_SESSION_KEY = "tracker.auth.session";
const AUTH_PENDING_KEY = "tracker.auth.pending";
const DASHBOARD_ORIGIN = "https://dashboard.thetrackerapp.io";
const DASHBOARD_HOME_URL = "https://dashboard.thetrackerapp.io/dashboard";
const DASHBOARD_STATS_VIEW_URL = `${DASHBOARD_HOME_URL}?view=stats`;
const DEFAULT_CODE_LENGTH = 8;

const els = {
  requestedTargetValue: document.getElementById("requestedTargetValue"),
  requestedDeviceValue: document.getElementById("requestedDeviceValue"),
  deviceSessionValue: document.getElementById("deviceSessionValue"),
  requestedAtValue: document.getElementById("requestedAtValue"),
  otpContainer: document.getElementById("otpContainer"),
  authorizeHeading: document.getElementById("authorizeHeading"),
  channelMessage: document.getElementById("channelMessage"),
  verifyStatus: document.getElementById("verifyStatus"),
  verifyCodeForm: document.getElementById("verifyCodeForm"),
  deviceCodeInput: document.getElementById("deviceCodeInput"),
  otpSlots: Array.from(document.querySelectorAll(".otp-slot")),
  resendCodeButton: document.getElementById("resendCodeButton"),
  editIdentifierButton: document.getElementById("editIdentifierButton"),
  emailFallbackButton: document.getElementById("emailFallbackButton"),
};

let pendingAuth = null;

function setStatus(message, type = "") {
  if (!els.verifyStatus) {
    return;
  }

  els.verifyStatus.textContent = message;
  els.verifyStatus.classList.remove("is-error", "is-success");
  if (type) {
    els.verifyStatus.classList.add(type);
  }
}

function sanitizeDeviceCode(rawValue) {
  const source = String(rawValue || "").trim().toUpperCase();
  const clean = source.replace(/[^A-Z0-9]/g, "");
  const maxLength = Number(pendingAuth?.codeLength || DEFAULT_CODE_LENGTH);
  return clean.slice(0, maxLength);
}

function buildOtpSlots(codeLength) {
  if (!els.otpContainer) return;
  const count = Math.max(codeLength || DEFAULT_CODE_LENGTH, 4);
  const mid = Math.ceil(count / 2);

  els.otpContainer.querySelectorAll(".otp-slot, .otp-divider").forEach(el => el.remove());

  for (let i = 0; i < count; i++) {
    if (i === mid) {
      const div = document.createElement("span");
      div.className = "otp-divider";
      div.setAttribute("aria-hidden", "true");
      div.textContent = "-";
      els.otpContainer.insertBefore(div, els.deviceCodeInput || els.otpContainer.lastChild);
    }
    const slot = document.createElement("span");
    slot.className = "otp-slot";
    slot.dataset.otpIndex = String(i);
    els.otpContainer.insertBefore(slot, els.deviceCodeInput || els.otpContainer.lastChild);
  }

  els.otpSlots = Array.from(els.otpContainer.querySelectorAll(".otp-slot"));
}

function updateCodeSlots(code) {
  const normalized = sanitizeDeviceCode(code);

  els.otpSlots.forEach((slot, index) => {
    const char = normalized[index] || "";
    slot.textContent = char;
    slot.classList.toggle("is-filled", Boolean(char));
    slot.classList.toggle("is-active", !char && index === normalized.length);
    slot.hidden = index >= Number(pendingAuth?.codeLength || DEFAULT_CODE_LENGTH);
  });
}

function loadPendingAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_PENDING_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const channel = String(parsed.channel || "").trim() || null;
    const isTelegram = channel === "Telegram" || channel === "telegram";

    return {
      method: String(parsed.method || "").trim(),
      provider: String(parsed.provider || "").trim(),
      deliveryChannel: String(parsed.deliveryChannel || parsed.channel || "").trim(),
      recovery: Boolean(parsed.recovery),
      identifier: String(parsed.identifier || "").trim(),
      displayValue: String(parsed.displayValue || "").trim(),
      requestedTarget: isTelegram
        ? (parsed.displayValue || parsed.requestedTarget || "").trim()
        : String(parsed.requestedTarget || parsed.displayValue || "").trim(),
      requestId: String(parsed.requestId || "").trim() || null,
      codeLength: Math.max(Number(parsed.codeLength) || DEFAULT_CODE_LENGTH, 4),
      expiresAt: parsed.expiresAt ? String(parsed.expiresAt) : null,
      requestedAt: parsed.requestedAt ? String(parsed.requestedAt) : new Date().toISOString(),
      sessionLabel: String(parsed.sessionLabel || "Current device").trim(),
      next: String(parsed.next || "").trim() || null,
      channel,
    };
  } catch {
    return null;
  }
}

function savePendingAuth(payload) {
  try {
    window.localStorage.setItem(AUTH_PENDING_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

function clearPendingAuth() {
  try {
    window.localStorage.removeItem(AUTH_PENDING_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function formatTimestamp(isoValue) {
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleString();
}

function renderPendingAuth() {
  if (!pendingAuth) {
    return;
  }

  const channel = pendingAuth.channel || pendingAuth.deliveryChannel || "";
  const isImessage = channel === "iMessage" || channel === "imessage";
  const isEmail = channel === "Email" || channel === "email";
  const isSms = channel === "SMS" || channel === "sms";
  const isTelegram = channel === "Telegram" || channel === "telegram";

  const requested = isTelegram
    ? (pendingAuth.displayValue || pendingAuth.requestedTarget || "-")
    : (pendingAuth.requestedTarget || pendingAuth.displayValue || "-");
  const codeLength = pendingAuth.codeLength || DEFAULT_CODE_LENGTH;

  if (els.authorizeHeading) {
    if (isEmail) {
      els.authorizeHeading.textContent = "Check your email";
    } else {
      els.authorizeHeading.textContent = "Check your messages";
    }
  }

  if (els.channelMessage) {
    const viaLabel = isEmail ? "via email" : isSms ? "via text message" : isTelegram ? "via Telegram" : "via iMessage";
    els.channelMessage.textContent = `We sent a ${codeLength}-digit code ${viaLabel} to ${requested}.`;
  }

  if (els.requestedTargetValue) {
    els.requestedTargetValue.textContent = requested;
  }

  if (els.requestedDeviceValue) {
    els.requestedDeviceValue.textContent = pendingAuth.displayValue || requested;
  }

  if (els.deviceSessionValue) {
    els.deviceSessionValue.textContent = pendingAuth.sessionLabel || "Current device";
  }

  if (els.requestedAtValue) {
    els.requestedAtValue.textContent = formatTimestamp(pendingAuth.requestedAt);
  }

  if (els.emailFallbackButton) {
    els.emailFallbackButton.hidden = isEmail || pendingAuth.recovery || !(isImessage || isSms || isTelegram);
  }

  if (els.deviceCodeInput) {
    els.deviceCodeInput.value = "";
    els.deviceCodeInput.maxLength = codeLength;
    buildOtpSlots(codeLength);
    updateCodeSlots("");
    els.deviceCodeInput.focus();
  }
}

function fallbackAccountId(identifier) {
  const seed = String(identifier || "");
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000000;
  }

  return `TRK-${String(hash).padStart(6, "0")}`;
}

function normalizeNextDestination(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== DASHBOARD_ORIGIN) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function encodeAuthPayload(value) {
  try {
    const json = JSON.stringify(value);
    const utf8 = new TextEncoder().encode(json);
    let binary = "";
    utf8.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  } catch {
    return "";
  }
}

function resolveLoginNextDestination(verifyBody, authUser) {
  const preferred = normalizeNextDestination(pendingAuth?.next || "");
  const targetUrl = new URL(preferred || DASHBOARD_STATS_VIEW_URL);
  const sessionToken = String(verifyBody?.sessionToken || verifyBody?.session_token || "").trim();
  const sessionExpiresAt = String(verifyBody?.sessionExpiresAt || verifyBody?.session_expires_at || "").trim();
  const encodedAuth = encodeAuthPayload(authUser);

  if (sessionToken) {
    targetUrl.searchParams.set("session_token", sessionToken);
  }

  if (sessionExpiresAt) {
    targetUrl.searchParams.set("session_expires_at", sessionExpiresAt);
  }

  if (encodedAuth) {
    targetUrl.searchParams.set("auth_payload", encodedAuth);
  }

  return targetUrl.toString();
}

function createAuthUser(verifyBody) {
  const account = verifyBody?.account || verifyBody?.user || {};

  return {
    method: pendingAuth?.method || "unknown",
    credential: pendingAuth?.identifier || "",
    maskedCredential: pendingAuth?.displayValue || pendingAuth?.requestedTarget || "",
    accountId: String(account?.accountId || account?.id || fallbackAccountId(pendingAuth?.identifier || "")),
    canonical: String(account?.canonical || "").trim(),
    username: String(account?.username || "").trim(),
    email: String(account?.email || account?.primaryEmail || "").trim(),
    age: String(account?.age || account?.profile?.age || "").trim(),
    billingStatus: String(account?.billingStatus || account?.subscriptionStatus || "").trim(),
    sheetUrl: String(account?.sheetUrl || account?.googleSheetUrl || "").trim(),
    affiliateCode: String(account?.affiliateCode || account?.referralCode || "").trim(),
    hasPersonalTrainer: Boolean(account?.hasPersonalTrainer || account?.personalTrainerAttached || account?.trainerAttached),
    personalTrainerName: String(account?.personalTrainerName || account?.trainerName || "").trim(),
    loginAt: new Date().toISOString(),
  };
}

function setLoading(loading) {
  if (!els.verifyCodeForm) {
    return;
  }

  const buttons = els.verifyCodeForm.querySelectorAll("button");
  buttons.forEach((button) => {
    button.disabled = loading;
  });
}

async function handleVerifyCode(event) {
  event.preventDefault();

  if (!pendingAuth || !els.deviceCodeInput) {
    setStatus("Missing login request. Start again from login.", "is-error");
    return;
  }

  const code = sanitizeDeviceCode(els.deviceCodeInput.value);
  els.deviceCodeInput.value = code;
  updateCodeSlots(code);

  if (code.length !== pendingAuth.codeLength) {
    setStatus(`Enter the full ${pendingAuth.codeLength}-character code.`, "is-error");
    return;
  }

  setLoading(true);
  setStatus("Verifying code...", "");

  const payload = {
    method: pendingAuth.method,
    identifier: pendingAuth.identifier,
    requestId: pendingAuth.requestId,
    request_id: pendingAuth.requestId,
    code,
  };

  try {
    const response = await verifyLoginCode(payload);
    const body = response?.body && typeof response.body === "object" ? response.body : response;
    const authUser = createAuthUser(body);
    const sessionToken = String(body?.sessionToken || body?.session_token || "").trim();
    const sessionExpiresAt = String(body?.sessionExpiresAt || body?.session_expires_at || "").trim();

    try {
      window.localStorage.setItem(AUTH_FLAG_KEY, "true");
      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
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
      // Ignore storage failures and continue redirect.
    }

    clearPendingAuth();
    setStatus("Code verified. Redirecting to your dashboard...", "is-success");

    window.setTimeout(() => {
      window.location.href = resolveLoginNextDestination(body, authUser);
    }, 300);
  } catch (error) {
    setStatus(String(error?.message || "Unable to verify code."), "is-error");
  } finally {
    setLoading(false);
  }
}

function normalizeRequestMetadata(responsePayload) {
  const body = responsePayload?.body && typeof responsePayload.body === "object" ? responsePayload.body : responsePayload;

  const requestId =
    String(
      body?.requestId || body?.request_id || body?.challengeId || body?.challenge_id || body?.verificationId || body?.verification_id || "",
    ).trim() || pendingAuth?.requestId || null;

  const requestedTarget =
    String(body?.maskedDestination || body?.masked_destination || body?.destinationMasked || body?.toMasked || body?.to || "").trim() ||
    pendingAuth?.requestedTarget ||
    pendingAuth?.displayValue ||
    "-";

  const codeLengthRaw = Number(body?.codeLength || body?.code_length || body?.otpLength || pendingAuth?.codeLength || DEFAULT_CODE_LENGTH);
  const codeLength = Number.isFinite(codeLengthRaw) && codeLengthRaw > 0 ? Math.round(codeLengthRaw) : DEFAULT_CODE_LENGTH;

  const channel = String(body?.channel || "").trim() || null;

  return {
    requestId,
    requestedTarget,
    codeLength,
    channel,
  };
}

function buildResendPayload(auth, opts = {}) {
  const payload = {
    identifier: auth.identifier,
    requestId: auth.requestId,
    resend: true,
  };

  if (opts.method) {
    payload.method = opts.method;
  }

  if (opts.recovery) {
    payload.recovery = true;
  }

  return payload;
}

async function handleResendCode(opts = {}) {
  if (!pendingAuth) {
    setStatus("Missing login request. Start again from login.", "is-error");
    return;
  }

  setLoading(true);
  setStatus(opts.recovery ? "Requesting email code..." : "Requesting new code...", "");

  const payload = buildResendPayload(pendingAuth, opts);

  try {
    const response = await requestLoginCode(payload);
    const meta = normalizeRequestMetadata(response);

    pendingAuth = {
      ...pendingAuth,
      requestId: meta.requestId,
      requestedTarget: meta.requestedTarget,
      channel: meta.channel || (opts.recovery ? "Email" : pendingAuth.channel),
      codeLength: meta.codeLength,
      requestedAt: new Date().toISOString(),
      method: opts.method || pendingAuth.method,
      recovery: opts.recovery === true ? true : pendingAuth.recovery,
    };

    savePendingAuth(pendingAuth);
    renderPendingAuth();
    setStatus(`New code sent to ${pendingAuth.requestedTarget}.`, "is-success");
  } catch (error) {
    setStatus(String(error?.message || "Unable to resend code."), "is-error");
  } finally {
    setLoading(false);
  }
}

async function handleEmailFallback() {
  await handleResendCode({ method: "email", recovery: true });
}

function handleUseDifferentLogin() {
  clearPendingAuth();
  window.location.href = "/login";
}

function wireEvents() {
  if (els.verifyCodeForm) {
    els.verifyCodeForm.addEventListener("submit", handleVerifyCode);
  }

  if (els.resendCodeButton) {
    els.resendCodeButton.addEventListener("click", () => handleResendCode());
  }

  if (els.emailFallbackButton) {
    els.emailFallbackButton.addEventListener("click", handleEmailFallback);
  }

  if (els.editIdentifierButton) {
    els.editIdentifierButton.addEventListener("click", handleUseDifferentLogin);
  }

  if (els.deviceCodeInput) {
    els.deviceCodeInput.addEventListener("input", (event) => {
      const normalized = sanitizeDeviceCode(event.target.value);
      event.target.value = normalized;
      updateCodeSlots(normalized);
      if (normalized.length === pendingAuth?.codeLength) {
        handleVerifyCode(new Event("submit", { cancelable: true }));
      }
    });

    els.deviceCodeInput.addEventListener("focus", () => {
      const normalized = sanitizeDeviceCode(els.deviceCodeInput.value);
      updateCodeSlots(normalized);
    });
  }
}

function hydratePendingAuth() {
  pendingAuth = loadPendingAuth();

  const params = new URLSearchParams(window.location.search);
  const queryRequestId = String(params.get("request_id") || "").trim();
  const queryNext = normalizeNextDestination(params.get("next"));

  if (!pendingAuth) {
    setStatus("No active login request found. Start from login.", "is-error");
    return false;
  }

  if (queryRequestId && pendingAuth.requestId && queryRequestId !== pendingAuth.requestId) {
    setStatus("This code link does not match your latest request. Start again from login.", "is-error");
    return false;
  }

  if (queryRequestId && !pendingAuth.requestId) {
    pendingAuth.requestId = queryRequestId;
  }

  if (queryNext) {
    pendingAuth.next = queryNext;
  }

  savePendingAuth(pendingAuth);
  renderPendingAuth();
  return true;
}

function init() {
  wireEvents();
  hydratePendingAuth();
}

initGoogleAnalytics();
init();
