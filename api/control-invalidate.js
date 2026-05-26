// POST /api/control-invalidate
//
// Webhook endpoint the backend calls whenever `/control` would return new JSON.
// See CONTROL_WEBHOOK_BACKEND.txt for the wire contract.
//
// What this endpoint does on each successful POST:
//   1. Verifies the Bearer secret (env: CONTROL_WEBHOOK_SECRET).
//   2. Bumps a monotonic `version` stamp so frontends can detect the change
//      via /api/control-version.
//   3. Pre-warms Vercel's CDN cache by issuing a fresh, cache-busted GET to
//      /api/control so the first user request after the change lands on a
//      warm function instance.
//
// Notes about consistency:
//   - The version stamp lives in module memory plus optional Vercel KV.
//   - Without KV the stamp is eventually consistent across regions: each
//     instance learns the new version on the first warm request after the
//     webhook fired. In practice this means most users see the new flags
//     within seconds, all users see them within the existing 5-min CDN TTL.
//   - This file never throws back to the backend — it always responds with
//     a JSON body, even on auth failures, so the webhook can be fire-and-forget.

import { setControlVersion } from "./_control-version-store.js";

const SECRET = process.env.CONTROL_WEBHOOK_SECRET || "";

// We trigger a fresh fetch through our own /api/control proxy so the Vercel
// edge cache gets repopulated immediately. The URL is environment-aware:
// in production it's https://thetrackerapp.io; in preview it's the deployment
// URL injected by Vercel.
const SELF_BASE =
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://thetrackerapp.io";

function bearerFrom(req) {
  const raw = String(req.headers.authorization || "");
  if (!raw.toLowerCase().startsWith("bearer ")) return "";
  return raw.slice(7).trim();
}

function constantTimeEq(a, b) {
  // Length difference is leaked, but the secret length is public information.
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function preWarm(version) {
  // Fire-and-forget warm-up. We don't await network failures because the
  // webhook caller doesn't care. We DO await the request so Vercel doesn't
  // kill our function before the upstream call lands.
  try {
    const url = `${SELF_BASE}/api/control?v=${encodeURIComponent(version)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
  } catch {
    /* warm-up best-effort; the next user request will refetch anyway */
  }
}

export default async function handler(req, res) {
  // CORS — even though this is a backend-to-backend call, allow the OPTIONS
  // preflight in case someone wires it from a browser later.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (!SECRET) {
    // Misconfiguration — better to fail loud than silently accept anything.
    return res
      .status(500)
      .json({ ok: false, error: "server_misconfigured: CONTROL_WEBHOOK_SECRET unset" });
  }

  const provided = bearerFrom(req);
  if (!constantTimeEq(provided, SECRET)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  // Read the (optional) payload for logging. Keep it tiny.
  let body = null;
  try {
    body = typeof req.body === "object" && req.body ? req.body : null;
    if (!body && typeof req.body === "string" && req.body.length) {
      body = JSON.parse(req.body);
    }
  } catch {
    body = null;
  }

  const version = String(Date.now());
  await setControlVersion(version, {
    reason: body?.reason || "unspecified",
    actorId: body?.actorId || null,
    changed: Array.isArray(body?.changed) ? body.changed.slice(0, 50) : [],
  });

  // Kick off the pre-warm. Awaited so it actually fires before the function
  // terminates, but bounded to 5s by the AbortController inside preWarm().
  await preWarm(version);

  return res.status(200).json({
    ok: true,
    version,
    receivedAt: new Date().toISOString(),
    changedCount: Array.isArray(body?.changed) ? body.changed.length : 0,
  });
}
