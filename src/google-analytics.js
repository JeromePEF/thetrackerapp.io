const GA_SCRIPT_ORIGIN = "https://www.googletagmanager.com/gtag/js";

function getMeasurementId() {
  const raw = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim();
}

export function initGoogleAnalytics() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const measurementId = getMeasurementId();
  if (!measurementId) {
    return false;
  }

  if (document.querySelector(`script[data-ga-loader="${measurementId}"]`)) {
    return true;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    anonymize_ip: true,
    transport_type: "beacon",
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `${GA_SCRIPT_ORIGIN}?id=${encodeURIComponent(measurementId)}`;
  script.dataset.gaLoader = measurementId;
  document.head.appendChild(script);
  return true;
}
