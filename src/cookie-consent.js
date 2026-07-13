/**
 * Cookie consent — REMOVED 2026-07-11.
 * =====================================
 * Google Analytics was removed site-wide, so there are no non-essential
 * cookies left to gate (what remains: Stripe fraud prevention + Cloudflare
 * WAF, both strictly-necessary and exempt from consent requirements).
 * The banner is gone; this module keeps the old export surface as no-ops
 * so every page entry that imported it keeps building.
 *
 * If analytics ever comes back, restore the gated banner from git history
 * (pre-2026-07-11) rather than loading trackers unconditionally.
 */

export function getConsent() {
  return { version: 0, categories: { essential: true, analytics: false }, acceptedAt: null };
}

export function hasAnalyticsConsent() {
  return false;
}

export function onConsentGiven() {
  /* no-op — nothing to consent to */
}

export function showConsentBanner() {
  /* no-op — banner removed */
}

export function reopenConsent() {
  /* no-op — banner removed */
}
