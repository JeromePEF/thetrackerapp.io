// Shared "current control version" store used by:
//   - api/control-invalidate.js  (writes when the backend webhook fires)
//   - api/control-version.js     (reads on every frontend poll)
//
// We try, in order:
//   1. Vercel KV         (best — sub-1ms reads, replicated globally)
//   2. Module memory     (eventual consistency — each warm instance keeps
//                        its own copy, learns the new value when its own
//                        invalidate route is hit OR when a fresh module
//                        load happens after a cold start)
//
// On a cold start we initialise the version to the current timestamp, so a
// freshly woken function never reports a version older than itself. This
// avoids the "everything seems stale forever after a deploy" failure mode.

let memVersion = String(Date.now());
let memMeta = { reason: "cold_start", actorId: null, changed: [] };
let memUpdatedAt = Date.now();

let kvClient = null;
let kvProbeAttempted = false;

async function getKv() {
  if (kvProbeAttempted) return kvClient;
  kvProbeAttempted = true;
  // Only try to load Vercel KV when both env vars are present — otherwise the
  // import would throw at runtime on every Vercel deployment that hasn't yet
  // provisioned a KV store. This makes the module work in plain hobby setups.
  const hasKv =
    !!process.env.KV_REST_API_URL &&
    !!process.env.KV_REST_API_TOKEN;
  if (!hasKv) return null;
  try {
    const mod = await import("@vercel/kv");
    kvClient = mod.kv || mod.default || null;
  } catch {
    kvClient = null;
  }
  return kvClient;
}

const KV_KEY_VERSION = "control:version";
const KV_KEY_META = "control:version:meta";

export async function setControlVersion(version, meta = {}) {
  memVersion = String(version);
  memMeta = {
    reason: String(meta.reason || "unspecified"),
    actorId: meta.actorId == null ? null : String(meta.actorId),
    changed: Array.isArray(meta.changed) ? meta.changed.slice(0, 50) : [],
  };
  memUpdatedAt = Date.now();
  try {
    const kv = await getKv();
    if (kv) {
      // 30-day TTL so old entries auto-clean; the value is replaced on each
      // invalidation anyway.
      await kv.set(KV_KEY_VERSION, memVersion, { ex: 60 * 60 * 24 * 30 });
      await kv.set(KV_KEY_META, memMeta, { ex: 60 * 60 * 24 * 30 });
    }
  } catch {
    /* KV write best-effort */
  }
}

export async function getControlVersion() {
  try {
    const kv = await getKv();
    if (kv) {
      const v = await kv.get(KV_KEY_VERSION);
      if (v) {
        const m = (await kv.get(KV_KEY_META)) || memMeta;
        // Keep module memory aligned with KV so subsequent reads on this
        // instance are fast even if KV blips.
        memVersion = String(v);
        memMeta = m;
        memUpdatedAt = Date.now();
        return { version: memVersion, meta: memMeta, source: "kv" };
      }
    }
  } catch {
    /* fall through to memory */
  }
  return { version: memVersion, meta: memMeta, source: "memory", memUpdatedAt };
}
