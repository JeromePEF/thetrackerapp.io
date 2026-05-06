import { inject } from "@vercel/analytics";
import { initGoogleAnalytics } from "./google-analytics.js";
import { requestLoginCode } from "./api.js";

const AUTH_PENDING_KEY = "tracker.auth.pending";
const DEFAULT_CODE_LENGTH = 8;

const els = {
  requestCodeForm: document.getElementById("requestCodeForm"),
  credentialLabel: document.getElementById("credentialLabel"),
  credentialInput: document.getElementById("credentialInput"),
  requestStatus: document.getElementById("requestStatus"),
  requestCodeButton: document.getElementById("requestCodeButton"),
};

function activeLoginMethod() {
  return document.querySelector('input[name="loginMethod"]:checked')?.value || "email";
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

function syncCredentialInput() {
  if (!els.credentialInput || !els.credentialLabel) {
    return;
  }

  const method = activeLoginMethod();

  if (method === "phone") {
    els.credentialLabel.textContent = "Phone";
    els.credentialInput.type = "tel";
    els.credentialInput.placeholder = "(555) 555-5555";
    els.credentialInput.autocomplete = "tel";
    return;
  }

  if (method === "username") {
    els.credentialLabel.textContent = "Username";
    els.credentialInput.type = "text";
    els.credentialInput.placeholder = "@username";
    els.credentialInput.autocomplete = "username";
    return;
  }

  els.credentialLabel.textContent = "Email";
  els.credentialInput.type = "email";
  els.credentialInput.placeholder = "you@example.com";
  els.credentialInput.autocomplete = "email";
}

function validEmail(value) {
  return /^\S+@\S+\.\S+$/.test(value);
}

function validUsername(value) {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,30}[a-zA-Z0-9])?$/.test(value);
}

function normalizeIdentifier(method, rawValue) {
  const value = String(rawValue || "").trim();

  if (!value) {
    return { ok: false, message: "Enter your login value first." };
  }

  if (method === "phone") {
    const digits = value.replace(/\D+/g, "");
    if (digits.length < 7) {
      return { ok: false, message: "Enter a valid phone number." };
    }

    return {
      ok: true,
      identifier: digits,
      displayValue: value,
    };
  }

  if (method === "username") {
    const username = value.replace(/^@/, "");
    if (!validUsername(username)) {
      return { ok: false, message: "Enter a valid username." };
    }

    return {
      ok: true,
      identifier: username.toLowerCase(),
      displayValue: `@${username}`,
    };
  }

  const email = value.toLowerCase();
  if (!validEmail(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  return {
    ok: true,
    identifier: email,
    displayValue: email,
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

  return {
    requestId,
    requestedTarget,
    expiresAt: expiresAtRaw ? String(expiresAtRaw) : null,
    codeLength,
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

function authorizeUrlFromPending(pending) {
  const params = new URLSearchParams();

  if (pending.requestId) {
    params.set("request_id", pending.requestId);
  }

  params.set("method", pending.method);

  return `/authorize${params.toString() ? `?${params.toString()}` : ""}`;
}

async function handleRequestCode(event) {
  event.preventDefault();

  if (!els.credentialInput) {
    return;
  }

  const method = activeLoginMethod();
  const normalized = normalizeIdentifier(method, els.credentialInput.value);

  if (!normalized.ok) {
    setStatus(normalized.message, "is-error");
    return;
  }

  setLoading(true);
  setStatus("Requesting code...", "");

  const payload = {
    method,
    identifier: normalized.identifier,
    requestedAt: new Date().toISOString(),
    client: {
      userAgent: navigator.userAgent || null,
      language: navigator.language || null,
      platform: navigator.userAgentData?.platform || navigator.platform || null,
    },
  };

  try {
    const response = await requestLoginCode(payload);
    const meta = extractRequestMetadata(response, normalized.displayValue);

    const pending = {
      method,
      identifier: normalized.identifier,
      displayValue: normalized.displayValue,
      requestedTarget: meta.requestedTarget,
      requestId: meta.requestId,
      codeLength: meta.codeLength,
      expiresAt: meta.expiresAt,
      requestedAt: payload.requestedAt,
      sessionLabel: `${navigator.userAgentData?.platform || navigator.platform || "Unknown platform"} • ${navigator.language || "en-US"}`,
      backendResponse: meta.rawResponse,
    };

    savePendingAuth(pending);
    window.location.href = authorizeUrlFromPending(pending);
  } catch (error) {
    setStatus(String(error?.message || "Unable to request login code."), "is-error");
  } finally {
    setLoading(false);
  }
}

function wireEvents() {
  document.querySelectorAll('input[name="loginMethod"]').forEach((input) => {
    input.addEventListener("change", () => {
      syncCredentialInput();
      setStatus("", "");
    });
  });

  if (els.requestCodeForm) {
    els.requestCodeForm.addEventListener("submit", handleRequestCode);
  }
}

function init() {
  syncCredentialInput();
  wireEvents();
}

inject();
initGoogleAnalytics();
init();
