const API_BASE = process.env.API_BASE || "https://api.thetrackerapp.io";

function normalizeName(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function toWelcomePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const provider = normalizeName(payload.provider, "SMS");
  const email = normalizeName(payload.email, "") || null;
  const contact = normalizeName(payload.contact, "") || normalizeName(payload.phone, "");
  const username = normalizeName(payload.username, "");

  if (provider === "iMessage") {
    return {
      provider: "iMessage",
      contact: contact || username || null,
      email,
    };
  }

  if (contact) {
    return {
      provider,
      contact,
      email,
    };
  }

  if (username) {
    return {
      provider,
      username,
      email,
    };
  }

  return {
    provider,
    email,
  };
}

function buildWelcomePayloadVariants(payload) {
  const base = toWelcomePayload(payload) || {};
  const provider = normalizeName(payload?.provider, "iMessage");
  const email = normalizeName(payload?.email, "") || null;
  const phoneOrContact = normalizeName(payload?.phone, "") || normalizeName(payload?.contact, "");
  const username = normalizeName(payload?.username, "");

  const variants = [];

  if (phoneOrContact) {
    variants.push({
      provider: "iMessage",
      phone: phoneOrContact,
      email,
    });

    variants.push({
      provider: "iMessage",
      contact: phoneOrContact,
      email,
    });

    variants.push({
      provider,
      contact: phoneOrContact,
      email,
    });

    variants.push({
      provider,
      phone: phoneOrContact,
      email,
    });
  }

  if (username) {
    variants.push({
      provider,
      username,
      email,
    });
  }

  variants.push(base);

  const deduped = new Map();
  variants.forEach((variant) => {
    if (!variant || typeof variant !== "object") {
      return;
    }

    const entries = Object.entries(variant)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
      .sort(([a], [b]) => a.localeCompare(b));

    if (!entries.length) {
      return;
    }

    const normalizedVariant = Object.fromEntries(entries);
    const key = JSON.stringify(normalizedVariant);
    if (!deduped.has(key)) {
      deduped.set(key, normalizedVariant);
    }
  });

  return [...deduped.values()];
}

function parseRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return null;
}

async function postToBackend(endpoint, payload) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") || "";
  let body = null;
  let text = "";

  if (contentType.includes("application/json")) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  } else {
    try {
      text = await response.text();
    } catch {
      text = "";
    }
  }

  const bodyOk = !(body && typeof body === "object" && "ok" in body && !body.ok);
  if (response.ok && bodyOk) {
    return {
      ok: true,
      endpoint,
      status: response.status,
      body: body ?? { ok: true, message: text || "ok" },
    };
  }

  const normalizedText = String(text || "").toLowerCase();
  const isCloudflareTunnel1033 =
    normalizedText.includes("cloudflare tunnel error") ||
    normalizedText.includes("error code: 1033") ||
    normalizedText.includes("api.thetrackerapp.io") && normalizedText.includes("tunnel");

  const message =
    isCloudflareTunnel1033
      ? "Backend onboarding service is temporarily unreachable (Cloudflare Tunnel 1033)."
      :
    body?.error ||
    body?.message ||
    text ||
    `Request failed (${response.status})`;

  return {
    ok: false,
    endpoint,
    status: response.status,
    body,
    message,
  };
}

async function tryEndpointsWithPayloads(endpoints, payloads) {
  let lastFailure = null;

  for (const endpoint of endpoints) {
    for (const payload of payloads) {
      const result = await postToBackend(endpoint, payload);
      if (result.ok) {
        return result;
      }
      lastFailure = result;
    }
  }

  return {
    ok: false,
    endpoint: lastFailure?.endpoint || null,
    status: lastFailure?.status || 502,
    body: lastFailure?.body || null,
    message: lastFailure?.message || "Request failed.",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  const payload = parseRequestBody(req);
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({
      ok: false,
      error: "Invalid JSON payload",
    });
  }

  const onboardingEndpoints = ["/api/onboarding", "/signup"];
  const welcomeEndpoints = ["/api/welcome", "/api/onboarding/trigger", "/api/onboarding/send-welcome"];
  const onboardingPayloads = [payload];
  const welcomePayloads = buildWelcomePayloadVariants(payload);
  const phoneOrContact = normalizeName(payload.phone, "") || normalizeName(payload.contact, "");

  if (phoneOrContact) {
    const welcomeFirst = await tryEndpointsWithPayloads(welcomeEndpoints, welcomePayloads);
    if (welcomeFirst.ok) {
      return res.status(200).json({
        ok: true,
        proxied: true,
        via: welcomeFirst.endpoint,
        ...welcomeFirst.body,
      });
    }
  }

  const onboardingResult = await tryEndpointsWithPayloads(onboardingEndpoints, onboardingPayloads);

  const followUpWelcomePayloads = [...welcomePayloads];
  const onboardingContact = normalizeName(onboardingResult?.body?.contact, "");
  if (onboardingContact) {
    followUpWelcomePayloads.unshift({
      provider: "iMessage",
      phone: onboardingContact,
      email: normalizeName(payload.email, "") || null,
    });
  }

  const welcomeResult = await tryEndpointsWithPayloads(welcomeEndpoints, followUpWelcomePayloads);
  if (welcomeResult.ok) {
    return res.status(200).json({
      ok: true,
      proxied: true,
      via: welcomeResult.endpoint,
      ...welcomeResult.body,
    });
  }

  if (onboardingResult.ok) {
    return res.status(502).json({
      ok: false,
      error: "Profile started, but onboarding message could not be sent yet. Please retry.",
      onboardingVia: onboardingResult.endpoint,
      onboarding: onboardingResult.body,
      welcomeFailure: {
        endpoint: welcomeResult.endpoint,
        status: welcomeResult.status,
        message: welcomeResult.message,
      },
    });
  }

  const primaryFailure = welcomeResult.message || onboardingResult.message || "Signup request failed.";
  return res.status(502).json({
    ok: false,
    error: primaryFailure,
    onboardingFailure: {
      endpoint: onboardingResult.endpoint,
      status: onboardingResult.status,
      message: onboardingResult.message,
    },
    welcomeFailure: {
      endpoint: welcomeResult.endpoint,
      status: welcomeResult.status,
      message: welcomeResult.message,
    },
  });
}
