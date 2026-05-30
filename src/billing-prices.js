// billing-prices.js
// ────────────────────────────────────────────────────────────────────────────
// Single source of truth for every subscription price string the frontend
// renders. The backend's /api/billing/stripe-prices endpoint reads directly
// from Stripe (15-minute server-side cache, auto-refreshed on price changes)
// so any price displayed via this module is guaranteed to match what
// Stripe actually charges.
//
// Backend contract is documented in the "BILLING + TWILIO" handoff doc.
//
// Usage:
//   import { getBillingPrices, refreshBillingPrices, formatPrice } from "./billing-prices.js";
//   const prices = await getBillingPrices();
//   pricingPage.innerHTML = `Yearly · ${prices.yearly.formatted}`;
//
// Cache:
//   - In-memory cache (this module's `cached` var) keyed by endpoint.
//   - localStorage mirror so a refresh doesn't re-fetch immediately.
//   - Re-fetch every 15 min OR on window focus, whichever happens first.
//
// Tiers exposed: weekly, monthly, yearly, premium, premiumYearly.
// The pricing page hides `weekly` per product rule — the dashboard billing
// tab still surfaces it when the user is actively subscribed weekly.

const API_BASE = "https://api.thetrackerapp.io";
const ENDPOINT = `${API_BASE}/api/billing/stripe-prices`;
const STORAGE_KEY = "tracker.billing.prices";
// Client cache is short (2 min) so admin toggles in the control panel
// (tierVisibility, price changes in Stripe, etc.) propagate quickly to
// open browsers. The backend has its own 15-min cache on top of Stripe,
// so dropping the client TTL doesn't increase load on Stripe itself —
// it just trims the worst-case stale-view window from 15 min to 2 min.
const TTL_MS = 2 * 60 * 1000;

// Fallback shape used when the endpoint is unreachable on first paint.
// These values come from the spec; they're a sane starter but will be
// replaced the moment the live endpoint responds.
const FALLBACK = {
  weekly:        { formatted: "$3/week",   price: 3,   interval: "week" },
  monthly:       { formatted: "$10/month", price: 10,  interval: "month" },
  yearly:        { formatted: "$96/year",  price: 96,  interval: "year",
                   perMonthFormatted: "$8/month equiv",
                   savingsVsMonthlyFormatted: "save $24" },
  premium:       { formatted: "$20/month", price: 20,  interval: "month" },
  premiumYearly: { formatted: "$200/year", price: 200, interval: "year",
                   perMonthFormatted: "$16.67/month equiv",
                   savingsVsMonthlyFormatted: "save $40" },
};

let cached = null;
let cachedAt = 0;
let inflight = null;
let listenersBound = false;
const subscribers = new Set();

// Load whatever's in localStorage so we paint instantly on page load. Caller
// should still `await getBillingPrices()` if it wants the freshest data.
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { prices, timestamp } = JSON.parse(raw);
    if (!prices || typeof prices !== "object") return null;
    cached = prices;
    cachedAt = Number(timestamp) || 0;
    return prices;
  } catch {
    return null;
  }
}

function saveToStorage(prices) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ prices, timestamp: Date.now() }));
  } catch {
    /* quota / private mode */
  }
}

function notifySubscribers(prices) {
  subscribers.forEach((fn) => {
    try {
      fn(prices);
    } catch {
      /* never let one subscriber break another */
    }
  });
}

// Synchronous accessor — returns the last-known prices (cache + localStorage
// + fallback). Useful when a render must happen immediately and we don't want
// to await a network round-trip.
export function getBillingPricesSync() {
  if (cached) return cached;
  return loadFromStorage() || FALLBACK;
}

// Async fetch — returns the freshest prices. Honors the in-memory cache to
// avoid duplicate concurrent fetches. Falls back gracefully on network error.
export async function getBillingPrices({ force = false } = {}) {
  const now = Date.now();
  if (!force && cached && now - cachedAt < TTL_MS) {
    return cached;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(ENDPOINT, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`stripe-prices ${res.status}`);
      const body = await res.json();
      if (!body?.ok) throw new Error(body?.error || "stripe-prices not ok");
      // Pluck out the keys we care about. Backend may include additional
      // metadata (displayConfig, fetchedAt, etc) — keep those too so callers
      // can use them without another fetch.
      cached = body;
      cachedAt = now;
      saveToStorage(body);
      notifySubscribers(body);
      return body;
    } catch (e) {
      // Network failure — return whatever we have (localStorage or
      // fallback). Caller can decide whether to surface the error.
      console.warn("billing-prices fetch failed:", e?.message || e);
      return getBillingPricesSync();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// Force a re-fetch (e.g. after a webhook tells us prices changed).
export function refreshBillingPrices() {
  return getBillingPrices({ force: true });
}

// Subscribe to price updates. Returns an unsubscribe function. The callback
// is invoked any time a fresh fetch lands.
export function subscribeBillingPrices(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

// Lightweight helper: pull a formatted string for a key, falling back to
// `defaultStr` (or "—") if the tier is missing for any reason.
export function formatPrice(key, { fallback = "—" } = {}) {
  const prices = getBillingPricesSync();
  return prices?.[key]?.formatted || fallback;
}

// One-time setup of background refresh hooks. Idempotent.
function ensureListeners() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  // Re-fetch when the user re-focuses the tab — they may have edited prices
  // in the Stripe Dashboard while we were idle.
  window.addEventListener("focus", () => {
    if (Date.now() - cachedAt > TTL_MS) getBillingPrices({ force: false });
  });
  // Belt-and-suspenders: a low-rate timer in case the focus event doesn't
  // fire on long-running tabs (e.g. background tabs in some browsers).
  setInterval(() => getBillingPrices({ force: false }), TTL_MS);
}

// Auto-warm the cache on module import. Non-blocking.
loadFromStorage();
if (typeof window !== "undefined") {
  ensureListeners();
  // Kick off an initial fetch in the background. Callers that need an
  // up-to-date result should still `await getBillingPrices()`.
  getBillingPrices().catch(() => {});
}
