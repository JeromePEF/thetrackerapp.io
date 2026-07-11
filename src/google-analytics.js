import { hasAnalyticsConsent, onConsentGiven } from "./cookie-consent.js";

const GA_SCRIPT_ORIGIN = "https://www.googletagmanager.com/gtag/js";

function getMeasurementId() {
  const raw = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim();
}

let gaInitialised = false;

function bootGA() {
  if (gaInitialised) return true;
  const measurementId = getMeasurementId();
  if (!measurementId) return false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    // Default to denied until consent is confirmed
    analytics_storage: "denied",
    ad_storage: "denied",
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `${GA_SCRIPT_ORIGIN}?id=${encodeURIComponent(measurementId)}`;
  script.dataset.gaLoader = measurementId;
  document.head.appendChild(script);
  gaInitialised = true;
  return true;
}

/**
 * Initialise Google Analytics. Respects cookie consent:
 * - If consent already given (analytics = true) → load immediately.
 * - If no consent yet → defer until the user consents.
 * - If consent denied → never load.
 */
export function initGoogleAnalytics() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const measurementId = getMeasurementId();
  if (!measurementId) return false;

  // Already booted
  if (gaInitialised) return true;

  // Check current consent
  if (hasAnalyticsConsent()) {
    return bootGA();
  }

  // Defer — wait for consent event
  onConsentGiven((record) => {
    if (record?.categories?.analytics) {
      bootGA();
      // Update consent mode to granted
      if (window.gtag) {
        window.gtag("consent", "update", {
          analytics_storage: "granted",
          ad_storage: "denied",
        });
      }
    }
  });

  // Return false — not loaded yet, but listener is in place
  return false;
}
