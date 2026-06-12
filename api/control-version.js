// GET /api/control-version
//
// Returns the current "version" of /api/control so the frontend can detect
// when flags have changed without re-downloading the full payload on every
// poll.
//
// Implementation strategy (in order):
//   1. Read `_version` / `updatedAt` field straight off the upstream
//      `/control` response if the backend provides one. This is the source
//      of truth and avoids any cross-instance Vercel memory issues.
//   2. Otherwise, compute a stable content hash of the upstream JSON so any
//      change in any field is detected automatically — no backend change
//      needed, just the existing /control response.
//   3. As a last resort (upstream unavailable), fall back to the in-memory
//      version stamp the webhook receiver bumps.
//
// Cached at the Vercel edge for 3 s so a busy page with many open tabs only
// costs ONE upstream fetch every few seconds, regardless of traffic.

import { createHash } from "node:crypto";
import { getControlVersion } from "./_control-version-store.js";

const UPSTREAM_URL = "https://api.thetrackerapp.io/control";

function hashJson(obj) {
  // Stable hash of an object — JSON.stringify isn't fully deterministic
  // across object key orderings in pathological cases, but real-world
  // backends return keys in a stable order so this works fine.
  const json = JSON.stringify(obj);
  return createHash("sha256").update(json).digest("hex").slice(0, 16);
}

async function fetchUpstreamVersion() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(UPSTREAM_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 TheTrackerApp/ControlVersionProxy",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || typeof data !== "object") throw new Error("non-object");

    // Prefer an explicit version field if the backend exposes one.
    const explicit =
      data._version ?? data.version ?? data.updatedAt ?? data._updatedAt;
    if (explicit) {
      return { version: String(explicit), source: "upstream_field" };
    }

    // Otherwise hash the whole payload so any change to any field bumps
    // the version automatically.
    return { version: hashJson(data), source: "upstream_hash" };
  } catch (err) {
    return { version: null, source: null, error: err?.message || "fetch_failed" };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  // 3 s edge cache + stale-while-revalidate keeps backend traffic minimal
  // while still picking up changes very quickly.
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3, stale-while-revalidate=10",
  );

  const upstream = await fetchUpstreamVersion();
  if (upstream.version) {
    return res.status(200).json({
      ok: true,
      version: upstream.version,
      source: upstream.source,
    });
  }

  // Upstream unreachable — fall back to whatever the webhook receiver last
  // stamped into module memory. Eventually consistent but better than nothing.
  const fallback = await getControlVersion();
  return res.status(200).json({
    ok: true,
    version: fallback.version,
    source: `fallback_${fallback.source}`,
    upstreamError: upstream.error || null,
  });
}
