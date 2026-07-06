import { initGoogleAnalytics } from "./google-analytics.js";
import { affiliateSignup, affiliateStatus } from "./api.js";
import { buildAffiliateShape, hasAffiliateProfile } from "./affiliate-shape.js";

const AUTH_FLAG_KEY = "tracker.authenticated";
const AUTH_USER_KEY = "tracker.auth.user";
const AUTH_SESSION_KEY = "tracker.auth.session";
const DASHBOARD_ORIGIN = "https://dashboard.thetrackerapp.io";
const SELF_URL = `${DASHBOARD_ORIGIN}/affiliate/signup`;
const POST_SUCCESS_URL = `${DASHBOARD_ORIGIN}/dashboard`;

const els = {
  loading: document.getElementById("affiliateSignupLoading"),
  card: document.getElementById("affiliateSignupCard"),
  existing: document.getElementById("affiliateSignupExisting"),
  identity: document.getElementById("affiliateSignupIdentity"),
  form: document.getElementById("affiliateSignupForm"),
  name: document.getElementById("affiliateName"),
  button: document.getElementById("affiliateSignupButton"),
  status: document.getElementById("affiliateSignupStatus"),
};

function decodeAuthPayload(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;
  try {
    const binary = atob(raw);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function persistAuthFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const payloadUser = decodeAuthPayload(params.get("auth_payload"));
  const sessionToken = String(params.get("session_token") || "").trim();
  const sessionExpiresAt = String(params.get("session_expires_at") || "").trim();

  if (!payloadUser && !sessionToken) return;

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

function readAuthUser() {
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function redirectToLogin(email) {
  const params = new URLSearchParams();
  params.set("next", SELF_URL);
  if (email) {
    params.set("email", email);
  }
  window.location.href = `/login?${params.toString()}`;
}

function showOnly(node) {
  [els.loading, els.card, els.existing].forEach((n) => {
    if (n) n.hidden = n !== node;
  });
}

function setStatus(message, type = "") {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.classList.remove("is-error", "is-success");
  if (type === "error") els.status.classList.add("is-error");
  else if (type === "success") els.status.classList.add("is-success");
}

function setLoading(loading) {
  if (!els.button) return;
  els.button.disabled = loading;
  els.button.textContent = loading ? "Submitting..." : "Apply";
}

function trimValue(input) {
  return String(input?.value || "").trim();
}

function buildPayload(user) {
  const name = trimValue(els.name);

  if (!name) {
    return { ok: false, message: "Enter your full name." };
  }

  return {
    ok: true,
    payload: {
      name,
      accountId: String(user?.accountId || "").trim() || null,
      canonical: String(user?.canonical || "").trim() || null,
      email: String(user?.email || "").trim() || null,
      username: String(user?.username || "").trim() || null,
      source: "affiliate_signup_form",
      requestedAt: new Date().toISOString(),
    },
  };
}

function identityLabel(user) {
  return (
    String(user?.email || "").trim() ||
    String(user?.maskedCredential || "").trim() ||
    String(user?.credential || "").trim() ||
    String(user?.username || "").trim() ||
    "your account"
  );
}

function renderForm(user) {
  if (els.identity) {
    els.identity.textContent = `Signing up as ${identityLabel(user)}.`;
  }
  if (els.name) {
    const existingName =
      String(user?.name || user?.username || user?.canonical || "").trim();
    if (existingName && !els.name.value) {
      els.name.value = existingName;
    }
  }
  showOnly(els.card);
}

async function checkExistingAffiliateProfile() {
  try {
    const body = await affiliateStatus({});
    if (!body || typeof body !== "object" || body.ok === false) return false;
    return hasAffiliateProfile(buildAffiliateShape(body));
  } catch {
    return false;
  }
}

async function handleSubmit(event, user) {
  event.preventDefault();
  const validation = buildPayload(user);
  if (!validation.ok) {
    setStatus(validation.message, "error");
    return;
  }

  setLoading(true);
  setStatus("Submitting application...", "");

  try {
    await affiliateSignup(validation.payload);
    setStatus("Application received. Redirecting to your dashboard...", "success");
    window.setTimeout(() => {
      window.location.href = POST_SUCCESS_URL;
    }, 500);
  } catch (error) {
    setStatus(String(error?.message || "Application failed. Please try again."), "error");
    setLoading(false);
  }
}

async function boot() {
  persistAuthFromQuery();
  const user = readAuthUser();
  if (!user) {
    redirectToLogin();
    return;
  }

  const isExistingAffiliate = await checkExistingAffiliateProfile();
  if (isExistingAffiliate) {
    showOnly(els.existing);
    return;
  }

  renderForm(user);

  if (els.form) {
    els.form.addEventListener("submit", (event) => handleSubmit(event, user));
  }
}

initGoogleAnalytics();
boot();
