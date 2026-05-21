// Food Diary Page JavaScript
import { initFeatureFlags } from "../feature-flags.js";

// Initialize
async function init() {
  await initFeatureFlags();

  // Check auth state
  const loginLink = document.getElementById("loginLink");
  const dashboardLink = document.getElementById("dashboardLink");
  const isAuthenticated = localStorage.getItem("tracker.authenticated") === "true";

  if (loginLink) loginLink.hidden = isAuthenticated;
  if (dashboardLink) dashboardLink.hidden = !isAuthenticated;

  // Track page view
  if (typeof gtag === "function") {
    gtag("event", "page_view", {
      page_title: "Food Diary Templates",
      page_location: window.location.href,
    });
  }
}

init();
