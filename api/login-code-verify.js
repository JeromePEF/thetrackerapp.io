const API_BASE = process.env.API_BASE || "https://api.thetrackerapp.io";
const VERIFY_ENDPOINTS = ["/api/auth/login-code/verify", "/api/auth/code/verify", "/api/login-code/verify"];

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

  const message = body?.error || body?.message || text || `Request failed (${response.status})`;

  return {
    ok: false,
    endpoint,
    status: response.status,
    body,
    message,
  };
}

async function tryEndpoints(payload) {
  let lastFailure = null;

  for (const endpoint of VERIFY_ENDPOINTS) {
    const result = await postToBackend(endpoint, payload);
    if (result.ok) {
      return result;
    }
    lastFailure = result;
  }

  return {
    ok: false,
    endpoint: lastFailure?.endpoint || null,
    status: lastFailure?.status || 502,
    message: lastFailure?.message || "Unable to verify login code.",
    body: lastFailure?.body || null,
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
  const code = String(payload?.code || "").trim();

  if (!payload || typeof payload !== "object") {
    return res.status(400).json({
      ok: false,
      error: "Invalid JSON payload",
    });
  }

  if (!code) {
    return res.status(400).json({
      ok: false,
      error: "Code is required",
    });
  }

  const backendResult = await tryEndpoints(payload);

  if (!backendResult.ok) {
    return res.status(backendResult.status || 502).json({
      ok: false,
      error: backendResult.message,
      via: backendResult.endpoint,
      details: backendResult.body || null,
    });
  }

  return res.status(200).json({
    ok: true,
    proxied: true,
    via: backendResult.endpoint,
    ...(backendResult.body || {}),
  });
}
