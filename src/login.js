import { initGoogleAnalytics } from "./google-analytics.js";
import { requestLoginCode } from "./api.js";

const AUTH_PENDING_KEY = "tracker.auth.pending";
const DEFAULT_CODE_LENGTH = 8;
const DASHBOARD_ORIGIN = "https://dashboard.thetrackerapp.io";
const TELEGRAM_USERNAME_PATTERN = /^@?[a-zA-Z][a-zA-Z0-9_]{3,31}$/;

const els = {
  requestCodeForm: document.getElementById("requestCodeForm"),
  credentialInput: document.getElementById("credentialInput"),
  credentialFieldLabel: document.getElementById("credentialFieldLabel"),
  credentialSummary: document.getElementById("credentialSummary"),
  credentialHint: document.getElementById("credentialHint"),
  credentialIconImage: document.getElementById("credentialIconImage"),
  credentialIconEmoji: document.getElementById("credentialIconEmoji"),
  recoveryToggleButton: document.getElementById("recoveryToggleButton"),
  requestStatus: document.getElementById("requestStatus"),
  requestCodeButton: document.getElementById("requestCodeButton"),
};

const METHOD_CONFIG = {
  phone: {
    fieldLabel: "Phone, iMessage email, or Telegram username",
    inputMode: "text",
    placeholder: "+1 555-555-5555, yourname@icloud.com, or @fierylion",
    autocomplete: "off",
    summary: "Use the phone number, iMessage email, or Telegram username on your account. We will use the right delivery route based on what you enter.",
    hint: "Examples: +1 555-555-5555, yourname@icloud.com, or @fierylion.",
    iconEmoji: "📱",
  },
  email: {
    fieldLabel: "Account email",
    inputMode: "email",
    placeholder: "you@example.com",
    autocomplete: "email",
    summary: "Use the confirmed email on your account only if you no longer have access to your phone, iMessage address, or Telegram username.",
    hint: "Enter the confirmed email tied to your account.",
    iconEmoji: "📤",
  },
};

let selectedMethod = "phone";

// Strip characters commonly used in script / HTML injection attempts.
// These have no legitimate place in phone numbers, emails, or usernames
// but are dangerous if echoed into markup or JSON without escaping.
// Applied on every keystroke so the raw value is safe BEFORE any
// validation or submission.
function sanitizeCredentialInput(raw) {
  return String(raw || "").replace(/[<>&"'`\\\/\x00-\x1f\x7f]/g, "");
}

function setStatus(message, type = "") {
  if (!els.requestStatus) {
    return;
  }

  els.requestStatus.textContent = message;
  els.requestStatus.classList.remove("is-error", "is-success");
  if (type) {
    els.requestStatus.classList.add(type);
  }
}

function validEmail(value) {
  return /^\S+@\S+\.\S+$/.test(value);
}

function normalizeTelegramUsername(value) {
  return String(value || "").trim().replace(/^@+/, "");
}

function isTelegramUsername(value) {
  const normalized = normalizeTelegramUsername(value);
  return TELEGRAM_USERNAME_PATTERN.test(normalized);
}

function isPhoneLike(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.includes("@") || /[a-zA-Z]/.test(raw)) {
    return false;
  }
  return /^[+\-\(\)\s\d]+$/.test(raw) && /\d/.test(raw);
}

function normalizeE164FromDigits(digits) {
  const clean = String(digits || "").replace(/\D+/g, "");
  if (!clean) {
    return "";
  }

  if (clean.length === 10) {
    return `+1${clean}`;
  }

  if (clean.length === 11 && clean.startsWith("1")) {
    return `+${clean}`;
  }

  return `+${clean}`;
}

function formatPhoneDisplay(value) {
  const clean = String(value || "").replace(/\D+/g, "");
  if (!clean) {
    return "";
  }

  const hasCountryCode = clean.length === 11 && clean.startsWith("1");
  const local = hasCountryCode ? clean.slice(1) : clean.slice(0, 10);

  if (local.length <= 3) {
    return hasCountryCode ? `+1 ${local}` : local;
  }
  if (local.length <= 6) {
    const partial = `${local.slice(0, 3)}-${local.slice(3)}`;
    return hasCountryCode ? `+1 ${partial}` : partial;
  }

  const formatted = `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6, 10)}`;
  return hasCountryCode ? `+1 ${formatted}` : formatted;
}

function primaryInputKind(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return "phone";
  }

  if (isPhoneLike(value)) {
    return "phone";
  }

  if (validEmail(value)) {
    return "imessage_email";
  }

  if (isTelegramUsername(value)) {
    return "telegram_username";
  }

  return "unknown";
}

function iconStateFor(kind) {
  if (kind === "imessage_email") {
    return { iconSrc: "/SVGS/IMessage_logo.svg", iconEmoji: "" };
  }

  if (kind === "telegram_username") {
    return { iconSrc: "/SVGS/Telegram_logo.svg", iconEmoji: "" };
  }

  if (selectedMethod === "email") {
    return { iconSrc: "", iconEmoji: "📤" };
  }

  return { iconSrc: "", iconEmoji: "📱" };
}

function primaryPresentation(rawValue) {
  const kind = primaryInputKind(rawValue);

  if (kind === "imessage_email") {
    return {
      fieldLabel: "iMessage email",
      summary: "Enter the email address tied to your iMessage account. We will send your code through iMessage.",
      hint: "Example: yourname@icloud.com, yourname@me.com, or yourname@example.com.",
      placeholder: "yourname@icloud.com",
      inputMode: "email",
      autocomplete: "email",
      ...iconStateFor(kind),
    };
  }

  if (kind === "telegram_username") {
    return {
      fieldLabel: "Telegram username",
      summary: "Enter the Telegram username on your account. We will use that to route your login code.",
      hint: "Example: @fierylion",
      placeholder: "@fierylion",
      inputMode: "text",
      autocomplete: "username",
      ...iconStateFor(kind),
    };
  }

  return {
    ...METHOD_CONFIG.phone,
    ...iconStateFor(kind),
  };
}

function currentPresentation() {
  if (selectedMethod === "email") {
    return {
      ...METHOD_CONFIG.email,
      ...iconStateFor("email"),
    };
  }

  return primaryPresentation(els.credentialInput?.value || "");
}

function renderCredentialDecor() {
  const config = currentPresentation();

  if (els.credentialFieldLabel) {
    els.credentialFieldLabel.textContent = config.fieldLabel;
  }

  if (els.credentialSummary) {
    els.credentialSummary.textContent = config.summary;
  }

  if (els.credentialHint) {
    els.credentialHint.textContent = config.hint;
  }

  if (els.credentialInput) {
    els.credentialInput.placeholder = config.placeholder || "";
    els.credentialInput.inputMode = config.inputMode || "text";
    els.credentialInput.autocomplete = config.autocomplete || "off";
  }

  if (els.credentialIconImage && els.credentialIconEmoji) {
    if (config.iconSrc) {
      els.credentialIconImage.src = config.iconSrc;
      els.credentialIconImage.hidden = false;
      els.credentialIconEmoji.hidden = true;
      els.credentialIconEmoji.textContent = "";
    } else {
      els.credentialIconImage.hidden = true;
      els.credentialIconImage.removeAttribute("src");
      els.credentialIconEmoji.hidden = false;
      els.credentialIconEmoji.textContent = config.iconEmoji || "📤";
    }
  }
}

function applyCredentialInputMode(method = selectedMethod) {
  const input = els.credentialInput;
  if (!input) {
    return;
  }

  input.type = "text";
  if (method === "email") {
    input.inputMode = METHOD_CONFIG.email.inputMode;
    input.autocomplete = METHOD_CONFIG.email.autocomplete;
    input.placeholder = METHOD_CONFIG.email.placeholder;
    return;
  }

  input.inputMode = "text";
  input.autocomplete = "off";
  input.placeholder = METHOD_CONFIG.phone.placeholder;
}

function updateRecoveryToggle() {
  if (!els.recoveryToggleButton) {
    return;
  }

  els.recoveryToggleButton.textContent =
    selectedMethod === "email" ? "Use phone, iMessage, or Telegram instead." : "Trouble logging in? Use email instead.";
}

function syncCredentialPresentation() {
  renderCredentialDecor();
  updateRecoveryToggle();
}

function setSelectedMethod(method, { preserveValue = false } = {}) {
  if (!METHOD_CONFIG[method]) {
    return;
  }

  selectedMethod = method;
  applyCredentialInputMode(method);

  if (els.credentialInput) {
    if (!preserveValue) {
      els.credentialInput.value = "";
    }
    if (method === "phone") {
      applyPhoneFormatting(els.credentialInput);
    }
  }

  syncCredentialPresentation();
  setStatus("", "");
}

function normalizeIdentifier(method, rawValue) {
  // Defense in depth: strip injection chars even though the input handler
  // already does this, in case the value sneaks in via another path.
  const value = sanitizeCredentialInput(rawValue).trim();

  if (!value) {
    return {
      ok: false,
      message:
        method === "email"
          ? "Enter the email on your account."
          : "Enter the phone number, iMessage email, or Telegram username on your account.",
    };
  }

  if (method === "email") {
    const email = value.toLowerCase();
    if (!validEmail(email)) {
      return { ok: false, message: "Enter a valid email address." };
    }

    return {
      ok: true,
      method: "email",
      identifier: email,
      email,
      displayValue: email,
      provider: "Email",
      deliveryChannel: "email",
      recovery: true,
    };
  }

  const kind = primaryInputKind(value);

  if (kind === "phone") {
    const digits = value.replace(/\D+/g, "");
    const validUsNumber = digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
    if (!validUsNumber) {
      return { ok: false, message: "Enter a valid phone number. +1 is optional." };
    }

    const e164 = normalizeE164FromDigits(digits);
    return {
      ok: true,
      method: "phone",
      identifier: digits,
      contact: e164,
      phone: e164,
      phoneDigits: digits,
      displayValue: formatPhoneDisplay(e164) || value,
      provider: "SMS",
      deliveryChannel: "auto",
      recovery: false,
    };
  }

  if (kind === "imessage_email") {
    const email = value.toLowerCase();
    return {
      ok: true,
      method: "email",
      identifier: email,
      email,
      displayValue: email,
      provider: "iMessage",
      deliveryChannel: "imessage",
      recovery: false,
    };
  }

  if (kind === "telegram_username") {
    const username = normalizeTelegramUsername(value).toLowerCase();
    return {
      ok: true,
      method: "username",
      identifier: username,
      username,
      displayValue: `@${username}`,
      provider: "Telegram",
      deliveryChannel: "telegram",
      recovery: false,
    };
  }

  return {
    ok: false,
    message: "Enter a phone number, an iMessage email, or a Telegram username.",
  };
}

function extractRequestMetadata(responsePayload, fallbackDisplayValue) {
  const body = responsePayload?.body && typeof responsePayload.body === "object" ? responsePayload.body : responsePayload;

  const requestId =
    String(
      body?.requestId ||
        body?.request_id ||
        body?.challengeId ||
        body?.challenge_id ||
        body?.verificationId ||
        body?.verification_id ||
        "",
    ).trim() || null;

  const requestedTarget =
    String(
      body?.maskedDestination ||
        body?.masked_destination ||
        body?.destinationMasked ||
        body?.toMasked ||
        body?.to ||
        fallbackDisplayValue,
    ).trim() || fallbackDisplayValue;

  const expiresAtRaw =
    body?.expiresAt ||
    body?.expires_at ||
    body?.expiresOn ||
    body?.expiry ||
    null;

  const codeLengthRaw = Number(body?.codeLength || body?.code_length || body?.otpLength || DEFAULT_CODE_LENGTH);
  const codeLength = Number.isFinite(codeLengthRaw) && codeLengthRaw > 0 ? Math.round(codeLengthRaw) : DEFAULT_CODE_LENGTH;

  const channel = String(body?.channel || "").trim() || null;

  return {
    requestId,
    requestedTarget,
    expiresAt: expiresAtRaw ? String(expiresAtRaw) : null,
    codeLength,
    channel,
    rawResponse: body,
  };
}

function savePendingAuth(payload) {
  try {
    window.localStorage.setItem(AUTH_PENDING_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

function setLoading(loading) {
  if (!els.requestCodeButton) {
    return;
  }

  els.requestCodeButton.disabled = loading;
  els.requestCodeButton.textContent = loading ? "Sending..." : "Continue";
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

function getNextDestination() {
  const params = new URLSearchParams(window.location.search);
  return normalizeNextDestination(params.get("next"));
}

function authorizeUrlFromPending(pending) {
  const params = new URLSearchParams();

  if (pending.requestId) {
    params.set("request_id", pending.requestId);
  }

  params.set("method", pending.method);
  if (pending.next) {
    params.set("next", pending.next);
  }

  return `/authorize${params.toString() ? `?${params.toString()}` : ""}`;
}

async function handleRequestCode(event) {
  event.preventDefault();

  if (!els.credentialInput) {
    return;
  }

  const normalized = normalizeIdentifier(selectedMethod, els.credentialInput.value);

  if (!normalized.ok) {
    setStatus(normalized.message, "is-error");
    return;
  }

  setLoading(true);
  setStatus("Requesting code...", "");

  const payload = {
    method: normalized.method,
    identifier: normalized.identifier,
    contact: normalized.contact,
    phone: normalized.phone,
    phoneDigits: normalized.phoneDigits,
    email: normalized.email,
    username: normalized.username,
    provider: normalized.provider,
    deliveryChannel: normalized.deliveryChannel,
    recovery: normalized.recovery,
    requestedAt: new Date().toISOString(),
  };

  try {
    const response = await requestLoginCode(payload);
    const meta = extractRequestMetadata(response, normalized.displayValue);
    const body = response?.body && typeof response.body === "object" ? response.body : response;
    const channel = String(body?.channel || "").trim() || null;

    const pending = {
      method: normalized.method,
      provider: normalized.provider || "",
      deliveryChannel: channel || normalized.deliveryChannel || "",
      recovery: Boolean(normalized.recovery),
      identifier: normalized.identifier,
      displayValue: normalized.displayValue,
      requestedTarget: meta.requestedTarget,
      requestId: meta.requestId,
      codeLength: meta.codeLength,
      expiresAt: meta.expiresAt,
      requestedAt: payload.requestedAt,
      sessionLabel: `${navigator.userAgentData?.platform || navigator.platform || "Unknown platform"} • ${navigator.language || "en-US"}`,
      backendResponse: meta.rawResponse,
      next: getNextDestination(),
      channel: channel,
    };

    savePendingAuth(pending);
    window.location.href = authorizeUrlFromPending(pending);
  } catch (error) {
    setStatus(String(error?.message || "Unable to request login code."), "is-error");
  } finally {
    setLoading(false);
  }
}

function looksLikePhoneEntry(value) {
  return selectedMethod === "phone" && primaryInputKind(value) === "phone";
}

function formatPhoneProgressive(digits) {
  const clean = String(digits || "").replace(/\D+/g, "").slice(0, 11);
  const hasCountryCode = clean.length > 10 && clean.startsWith("1");
  const local = hasCountryCode ? clean.slice(1, 11) : clean.slice(0, 10);

  if (!local) {
    return hasCountryCode ? "+1" : "";
  }
  if (local.length <= 3) {
    return hasCountryCode ? `+1 ${local}` : local;
  }
  if (local.length <= 6) {
    const partial = `${local.slice(0, 3)}-${local.slice(3)}`;
    return hasCountryCode ? `+1 ${partial}` : partial;
  }

  const formatted = `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6, 10)}`;
  return hasCountryCode ? `+1 ${formatted}` : formatted;
}

function applyPhoneFormatting(input) {
  if (!input) {
    return;
  }

  const value = input.value;
  if (!looksLikePhoneEntry(value)) {
    return;
  }

  const cursorPos = typeof input.selectionStart === "number" ? input.selectionStart : value.length;
  const digitsBeforeCursor = value.slice(0, cursorPos).replace(/\D+/g, "").length;
  const digits = value.replace(/\D+/g, "");
  if (!digits) {
    return;
  }

  const formatted = formatPhoneProgressive(digits);
  if (formatted === value) {
    return;
  }

  let newCursor = formatted.length;
  let digitsSeen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (digitsSeen >= digitsBeforeCursor) {
      newCursor = index;
      break;
    }
    if (/\d/.test(formatted[index])) {
      digitsSeen += 1;
    }
  }

  input.value = formatted;
  try {
    input.setSelectionRange(newCursor, newCursor);
  } catch {
    // Ignore browser selection quirks.
  }
}

function detectPrefillMethod(rawValue) {
  return "phone";
}

function wireEvents() {
  if (els.requestCodeForm) {
    els.requestCodeForm.addEventListener("submit", handleRequestCode);
  }

  if (els.credentialInput) {
    els.credentialInput.addEventListener("input", () => {
      // Prevent script/HTML injection in the raw value.
      els.credentialInput.value = sanitizeCredentialInput(els.credentialInput.value);
      if (selectedMethod === "phone") {
        applyPhoneFormatting(els.credentialInput);
      }
      syncCredentialPresentation();
      setStatus("", "");
    });
  }

  if (els.recoveryToggleButton) {
    els.recoveryToggleButton.addEventListener("click", () => {
      const nextMethod = selectedMethod === "email" ? "phone" : "email";
      setSelectedMethod(nextMethod, { preserveValue: false });
      els.credentialInput?.focus();
    });
  }
}

function prefillFromQuery() {
  if (!els.credentialInput) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const email = sanitizeCredentialInput(params.get("email")).trim();
  const phone = sanitizeCredentialInput(params.get("phone")).trim();
  const identifier = sanitizeCredentialInput(params.get("identifier")).trim();

  if (email) {
    setSelectedMethod("phone", { preserveValue: false });
    els.credentialInput.value = email;
    syncCredentialPresentation();
    return;
  }

  if (phone) {
    setSelectedMethod("phone", { preserveValue: false });
    els.credentialInput.value = phone;
    applyPhoneFormatting(els.credentialInput);
    syncCredentialPresentation();
    return;
  }

  if (identifier) {
    setSelectedMethod("phone", { preserveValue: false });
    els.credentialInput.value = identifier;
    if (primaryInputKind(identifier) === "phone") {
      applyPhoneFormatting(els.credentialInput);
    }
    syncCredentialPresentation();
    return;
  }

  setSelectedMethod("phone", { preserveValue: true });
}

function init() {
  prefillFromQuery();
  syncCredentialPresentation();
  wireEvents();
}

initGoogleAnalytics();
init();
