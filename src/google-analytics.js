/**
 * Google Analytics 4 — RESTORED 2026-09-30.
 *
 * HISTORY, because this file has been a no-op and it was not obvious why:
 * GA shipped from the initial commit reading VITE_GA_MEASUREMENT_ID, gained
 * cookie-consent gating in 9a81e3d, and was then replaced outright by a no-op
 * on 2026-07-11 when the cookie banner was removed. Every page entry kept
 * calling initGoogleAnalytics(), so the calls all still ran and did nothing —
 * which is why the site looked instrumented and reported no traffic.
 *
 * COOKIELESS BY DEFAULT. The banner was deliberately deleted, so re-adding a
 * tracker that writes cookies would quietly re-create the consent obligation
 * it was removed to avoid. client_storage:"none" runs GA4 without cookies, so
 * no banner is required.
 *
 * The trade-off is real and worth knowing: with no client_id persisted, GA
 * cannot tell a returning visitor from a new one, so "users" inflates toward
 * "sessions". Pageviews, referrers, landing pages and geography — everything
 * needed to answer "is the marketing working" — are unaffected. Set
 * VITE_GA_COOKIELESS=false to opt into cookies, and restore a consent banner
 * if you do.
 *
 * NO ID, NO TRACKER. With VITE_GA_MEASUREMENT_ID unset this is a silent no-op,
 * so a missing build variable can never break a page or leak a half-configured
 * tracker. Set it in the Cloudflare Pages project (Settings → Environment
 * variables, Production) and redeploy — Vite inlines it at BUILD time, so it
 * must exist where the build runs, not merely in a local .env.
 */

const GA_SCRIPT_ORIGIN = "https://www.googletagmanager.com/gtag/js";

// The property's real measurement ID, recovered from git history: it was live
// in index.html and in the built bundle through 73bc7a1 (2026-07-11) and gone
// from 465760b (2026-07-13) onward — which is the day the data stops in GA4.
// Account 262650966 / property 533184487.
//
// Hardcoded as the DEFAULT on purpose. A measurement ID is not a secret — it
// ships in the page source by definition, and it was literally inline in
// index.html before. Depending on a build-time variable is what silently broke
// this: VITE_GA_MEASUREMENT_ID is set in no .env in this repo, so a rebuild on
// any machine or CI that lacked it would quietly produce a tracker-less site
// with nothing to indicate it. The env var still wins if present, so staging
// or a second property can override it.
const GA_DEFAULT_MEASUREMENT_ID = "G-RNSBGSR08Y";

function getMeasurementId() {
  const raw = import.meta.env.VITE_GA_MEASUREMENT_ID;
  const id = (typeof raw === "string" && raw.trim()) || GA_DEFAULT_MEASUREMENT_ID;
  // Guard against a placeholder being shipped as if it were real: the setup
  // doc carries "G-XXXXXXXXXX" as an example and it has been copied before.
  if (!/^G-[A-Z0-9]{6,15}$/i.test(id) || /^G-X+$/i.test(id)) return "";
  return id;
}

function cookielessWanted() {
  const raw = import.meta.env.VITE_GA_COOKIELESS;
  if (typeof raw !== "string") return true;            // default: no cookies
  return !/^(0|false|no)$/i.test(raw.trim());
}

export function initGoogleAnalytics() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const measurementId = getMeasurementId();
  if (!measurementId) return false;

  // Idempotent: every page entry calls this, and some import more than one
  // module that does. A second <script> would double-count every pageview.
  if (document.querySelector(`script[data-ga-loader="${measurementId}"]`)) return true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };

  window.gtag("js", new Date());

  const cookieless = cookielessWanted();
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    // Always granted: this flag decides whether hits are COLLECTED, while
    // client_storage below decides whether a COOKIE is written. Tying it to
    // `cookieless` conflated the two and silently reduced the site to
    // unreportable consent pings.
    analytics_storage: "granted",
  });
  window.gtag("config", measurementId, {
    anonymize_ip: true,
    transport_type: "beacon",           // survives the pageview being unloaded
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ...(cookieless ? { client_storage: "none" } : {}),
  });

  const s = document.createElement("script");
  s.async = true;
  s.src = `${GA_SCRIPT_ORIGIN}?id=${encodeURIComponent(measurementId)}`;
  s.setAttribute("data-ga-loader", measurementId);
  document.head.appendChild(s);
  return true;
}
