/**
 * Cookie / Tracking Consent Banner
 * ================================
 * GDPR/ePrivacy-compliant consent banner that gates Google Analytics (GA4).
 *
 * Design choices:
 * - "Essential Only" vs "Accept All" — essential is just Stripe fraud
 *   cookies + Cloudflare WAF; analytics is GA4.
 * - Consent stored in localStorage under `tta_cookie_consent` with
 *   ISO timestamp so we have an audit trail.
 * - Once consented, GA4 is initialized via the deferred-init hook.
 * - Footer "Cookie Settings" link re-opens the banner for changes.
 * - No third-party CMP dependency — self-contained.
 */

const CONSENT_KEY = "tta_cookie_consent";
const CONSENT_VERSION = 1;

// Categories we gate
const CATEGORIES = {
  essential: { label: "Essential", required: true, desc: "Session management, fraud prevention, and security. Always enabled." },
  analytics: { label: "Analytics", required: false, desc: "Anonymous usage metrics via Google Analytics to improve the service." },
};

/**
 * Read current consent state from localStorage.
 * Returns null if never consented.
 */
export function getConsent() {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CONSENT_VERSION) return null; // force re-consent on version bump
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persist consent and return the saved record.
 */
function saveConsent(categories) {
  const record = {
    version: CONSENT_VERSION,
    categories,
    acceptedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    // private browsing — degrade gracefully
  }
  return record;
}

/**
 * Has user accepted analytics cookies?
 */
export function hasAnalyticsConsent() {
  const c = getConsent();
  return !!(c?.categories?.analytics);
}

/**
 * Callback invoked AFTER consent is given. Importers can override this
 * to wire up GA4 or other deferred trackers.
 */
let deferredInit = null;
export function onConsentGiven(fn) {
  deferredInit = fn;
}

/**
 * Dispatch custom event so any page module can react.
 */
function dispatchConsentChange(record) {
  if (typeof CustomEvent !== "function") return;
  window.dispatchEvent(new CustomEvent("ttaconsentchange", { detail: record }));
}

/**
 * Build the banner DOM once and cache.
 */
let bannerEl = null;
function buildBanner() {
  if (bannerEl) return bannerEl;

  const wrap = document.createElement("div");
  wrap.id = "cookieConsentBanner";
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-label", "Cookie consent");
  wrap.setAttribute("aria-modal", "false");
  wrap.innerHTML = `
    <div class="ccb-inner">
      <p class="ccb-text">
        This site uses cookies for security and analytics.
        <button type="button" class="ccb-details-toggle" aria-expanded="false">Learn more</button>
      </p>
      <div class="ccb-details" hidden>
        <p><strong>Essential:</strong> ${CATEGORIES.essential.desc}</p>
        <p><strong>Analytics:</strong> ${CATEGORIES.analytics.desc}</p>
        <p>You can change your mind at any time via the "Cookie Settings" link in the footer.</p>
        <p>See our <a href="/privacy#cookies" target="_blank" rel="noopener">Privacy Policy</a> for full details.</p>
      </div>
      <div class="ccb-actions">
        <button type="button" class="ccb-btn ccb-btn-secondary" data-action="essential">Essential Only</button>
        <button type="button" class="ccb-btn ccb-btn-primary" data-action="accept">Accept All</button>
      </div>
    </div>
  `;

  // Toggle details
  const toggle = wrap.querySelector(".ccb-details-toggle");
  const details = wrap.querySelector(".ccb-details");
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    details.hidden = expanded;
  });

  // Action buttons
  wrap.querySelector('[data-action="essential"]').addEventListener("click", () => {
    handleConsent({ essential: true, analytics: false });
  });
  wrap.querySelector('[data-action="accept"]').addEventListener("click", () => {
    handleConsent({ essential: true, analytics: true });
  });

  bannerEl = wrap;
  return wrap;
}

function handleConsent(categories) {
  const record = saveConsent(categories);
  removeBanner();
  dispatchConsentChange(record);
  if (deferredInit) deferredInit(record);
}

function removeBanner() {
  if (bannerEl && bannerEl.parentNode) {
    bannerEl.parentNode.removeChild(bannerEl);
  }
}

/**
 * Show the consent banner if user hasn't consented yet.
 * Insert at the bottom of <body>.
 */
export function showConsentBanner() {
  const existing = getConsent();
  if (existing) {
    // Already consented — fire deferred init immediately
    dispatchConsentChange(existing);
    if (deferredInit) deferredInit(existing);
    return;
  }

  const banner = buildBanner();
  if (banner.parentNode) return; // already shown
  document.body.appendChild(banner);
}

/**
 * Re-open the consent banner to let the user change preferences.
 * Clears old consent first so the banner shows the full UI.
 */
export function reopenConsent() {
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch { /* ignore */ }
  // Remove stale banner if somehow present
  if (bannerEl && bannerEl.parentNode) {
    bannerEl.parentNode.removeChild(bannerEl);
  }
  bannerEl = null;
  showConsentBanner();
}

/* ── Inline styles (self-contained, no external CSS dependency) ── */
const STYLES = `
#cookieConsentBanner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99999;
  background: #111;
  color: #eee;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  border-top: 1px solid #333;
  box-shadow: 0 -2px 16px rgba(0,0,0,.4);
  animation: ccbSlideUp .3s ease-out;
}
@keyframes ccbSlideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.ccb-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 16px 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}
.ccb-text {
  flex: 1 1 300px;
  margin: 0;
  color: #ccc;
}
.ccb-details-toggle {
  background: none;
  border: none;
  color: #818cf8;
  cursor: pointer;
  padding: 0;
  font: inherit;
  text-decoration: underline;
}
.ccb-details {
  flex: 1 1 100%;
  padding: 10px 0 0;
  font-size: 13px;
  color: #999;
  border-top: 1px solid #222;
}
.ccb-details p { margin: 4px 0; }
.ccb-details a { color: #818cf8; }
.ccb-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}
.ccb-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: nowrap;
}
.ccb-btn-secondary {
  background: #222;
  color: #ccc;
  border-color: #444;
}
.ccb-btn-secondary:hover { background: #333; }
.ccb-btn-primary {
  background: #818cf8;
  color: #111;
}
.ccb-btn-primary:hover { background: #a5b4fc; }

/* Footer settings link */
.ccb-settings-link {
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
  background: none;
  border: none;
  font: inherit;
  padding: 0;
}
`;

// Inject styles once
function injectStyles() {
  if (document.getElementById("ccb-styles")) return;
  const style = document.createElement("style");
  style.id = "ccb-styles";
  style.textContent = STYLES;
  document.head.appendChild(style);
}

// Auto-run on import: inject styles, then defer banner until DOM is ready
injectStyles();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => showConsentBanner());
} else {
  showConsentBanner();
}
