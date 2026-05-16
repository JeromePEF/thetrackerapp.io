const API_BASE = process.env.API_BASE || "https://api.thetrackerapp.io";
const REQUEST_TIMEOUT_MS = 15000;
const ALLOWED_PREFIXES = [
  "/api/portal",
  "/api/account/portal",
  "/api/user/portal",
  "/api/user/profile",
  "/api/account/profile",
  "/api/account/update-profile",
  "/api/account/email/verify",
  "/api/account/verify-email",
  "/api/user/email/verify",
  "/api/account/sheet",
  "/api/sheet",
  "/api/body-measures",
  "/api/stats/range",
  "/api/dashboard/stats/range",
  "/api/leaderboard/rank",
  "/api/stats/rank",
  "/api/milestones",
  "/api/account/milestones",
  "/api/integrations",
  "/api/account/integrations",
  "/api/integrations/connect",
  "/api/account/goals",
  "/api/stripe/checkout-session",
  "/api/stripe/checkout-complete",
  "/api/stripe/checkout",
  "/api/billing/checkout-session",
  "/api/billing/cancel",
  "/api/billing/resume",
  "/api/stripe/subscription/cancel",
  "/api/stripe/subscription/resume",
  "/api/stripe/cancel",
  "/api/ai/chat",
  "/api/ai/fitness",
  "/api/gemini/fitness",
  "/api/affiliate/status",
  "/api/affiliate/connect",
  "/api/affiliate/history",
  "/api/affiliate/signup",
  "/api/affiliate/agreement",
];

function headerValue(value) {
  if (Array.isArray(value)) {
    return String(value[0] || "").trim();
  }
  return String(value || "").trim();
}

function parseRequestBody(req) {
  if (req.body === undefined || req.body === null || req.body === "") {
    return null;
  }

  if (typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return req.body;
    }
  }

  return null;
}

function parseTarget(rawTarget) {
  const target = headerValue(rawTarget);
  if (!target) {
    return null;
  }

  try {
    const apiOrigin = new URL(API_BASE).origin;
    const url = new URL(target, API_BASE);
    if (url.origin !== apiOrigin) {
      return null;
    }

    const allowed = ALLOWED_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
    if (!allowed) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function errorMessageFromText(status, text) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return `Request failed (${status})`;
  }

  if (/cloudflare tunnel error|error code:\s*1033/i.test(normalized)) {
    return "Backend service is temporarily unreachable (Cloudflare Tunnel 1033).";
  }

  const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(normalized);
  if (titleMatch?.[1]) {
    return titleMatch[1].trim();
  }

  return normalized.slice(0, 280);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (!["GET", "POST"].includes(req.method || "")) {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  const targetUrl = parseTarget(req.query?.target);
  if (!targetUrl) {
    return res.status(400).json({
      ok: false,
      error: "Invalid or disallowed proxy target",
    });
  }

  const headers = {
    Accept: "application/json",
  };
  const authorization = headerValue(req.headers.authorization);
  if (authorization) {
    headers.Authorization = authorization;
  }

  const body = parseRequestBody(req);
  if (req.method === "POST") {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body: req.method === "POST" ? JSON.stringify(body || {}) : undefined,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await response.json().catch(() => null);
      return res.status(response.status).json(json ?? {
        ok: response.ok,
      });
    }

    const text = await response.text().catch(() => "");
    if (response.ok) {
      return res.status(response.status).json({
        ok: true,
        text,
      });
    }

    return res.status(response.status).json({
      ok: false,
      error: errorMessageFromText(response.status, text),
    });
  } catch (error) {
    const message = error?.name === "AbortError" ? "Proxy request timed out." : "Proxy request failed.";
    return res.status(502).json({
      ok: false,
      error: message,
    });
  } finally {
    clearTimeout(timer);
  }
}
