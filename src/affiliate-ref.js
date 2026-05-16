const REF_QUERY_KEYS = ["ref", "referral", "affiliate", "affiliateCode", "referralCode"];
const REF_STORAGE_KEY = "tracker.affiliateRef";
const REF_COOKIE_NAME = "tracker_ref";
const REF_TTL_DAYS = 30;

function safeWindow() {
  return typeof window !== "undefined" ? window : null;
}

function readCookie(name) {
  const win = safeWindow();
  if (!win || !win.document?.cookie) {
    return "";
  }

  const prefix = `${name}=`;
  const parts = win.document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return trimmed.slice(prefix.length);
      }
    }
  }
  return "";
}

function writeCookie(name, value) {
  const win = safeWindow();
  if (!win || !win.document) {
    return;
  }

  const expires = new Date(Date.now() + REF_TTL_DAYS * 24 * 60 * 60 * 1000).toUTCString();
  const encoded = encodeURIComponent(value);
  win.document.cookie = `${name}=${encoded}; expires=${expires}; path=/; SameSite=Lax`;
}

function readLocalStorage(key) {
  try {
    return safeWindow()?.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeLocalStorage(key, value) {
  try {
    safeWindow()?.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures (private mode, etc.)
  }
}

function sanitizeRef(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  // Affiliate codes are typically short alphanumeric. Strip anything else.
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return clean;
}

function readRefFromUrl() {
  const win = safeWindow();
  if (!win?.location) {
    return "";
  }

  try {
    const params = new URLSearchParams(win.location.search);
    for (const key of REF_QUERY_KEYS) {
      const value = sanitizeRef(params.get(key));
      if (value) {
        return value;
      }
    }
  } catch {
    return "";
  }
  return "";
}

function stripRefFromUrl() {
  const win = safeWindow();
  if (!win?.location || !win.history?.replaceState) {
    return;
  }

  try {
    const url = new URL(win.location.href);
    let changed = false;
    for (const key of REF_QUERY_KEYS) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const search = url.searchParams.toString();
      const newUrl = `${url.pathname}${search ? `?${search}` : ""}${url.hash || ""}`;
      win.history.replaceState({}, "", newUrl);
    }
  } catch {
    // Ignore URL manipulation errors.
  }
}

export function captureRefFromUrl({ stripFromUrl = true } = {}) {
  const fromUrl = readRefFromUrl();
  if (fromUrl) {
    writeCookie(REF_COOKIE_NAME, fromUrl);
    writeLocalStorage(REF_STORAGE_KEY, fromUrl);
    if (stripFromUrl) {
      stripRefFromUrl();
    }
    return fromUrl;
  }
  return getStoredRef();
}

export function getStoredRef() {
  const fromCookie = sanitizeRef(readCookie(REF_COOKIE_NAME));
  if (fromCookie) {
    return fromCookie;
  }

  const fromStorage = sanitizeRef(readLocalStorage(REF_STORAGE_KEY));
  if (fromStorage) {
    return fromStorage;
  }

  return "";
}

export function attachRefToPayload(payload) {
  const ref = getStoredRef();
  if (!ref || !payload || typeof payload !== "object") {
    return payload;
  }

  return {
    ...payload,
    affiliateCode: payload.affiliateCode || ref,
    referralCode: payload.referralCode || ref,
  };
}

export function clearStoredRef() {
  writeCookie(REF_COOKIE_NAME, "");
  try {
    safeWindow()?.localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    // ignore
  }
}
