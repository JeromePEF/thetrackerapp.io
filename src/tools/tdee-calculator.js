// TDEE Calculator JavaScript
import { initFeatureFlags } from "../feature-flags.js";

// DOM Elements
const tdeeForm = document.getElementById("tdeeForm");
const tdeeResults = document.getElementById("tdeeResults");

// Calculate TDEE using Mifflin-St Jeor equation
function calculateTDEE(age, sex, weight, height, activityLevel) {
  // Convert to metric if needed
  const weightKg = weight;
  const heightCm = height;

  // Calculate BMR using Mifflin-St Jeor
  let bmr;
  if (sex === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  // Calculate TDEE
  const tdee = bmr * activityLevel;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    aggressiveLoss: Math.round(tdee - 500),
    moderateLoss: Math.round(tdee - 250),
    maintain: Math.round(tdee),
    leanBulk: Math.round(tdee + 250),
    aggressiveBulk: Math.round(tdee + 500),
  };
}

// Convert units to metric
function convertToMetric(value, unit, type) {
  if (type === "weight") {
    return unit === "lb" ? value * 0.453592 : value;
  }
  if (type === "height") {
    return unit === "in" ? value * 2.54 : value;
  }
  return value;
}

// Handle form submission
function handleSubmit(e) {
  e.preventDefault();

  const formData = new FormData(tdeeForm);

  const age = parseInt(formData.get("age"));
  const sex = formData.get("sex");
  const weightRaw = parseFloat(formData.get("weight"));
  const weightUnit = formData.get("weightUnit");
  const heightRaw = parseFloat(formData.get("height"));
  const heightUnit = formData.get("heightUnit");
  const activityLevel = parseFloat(formData.get("activity"));

  // Validate inputs
  if (!age || !sex || !weightRaw || !heightRaw || !activityLevel) {
    alert("Please fill in all required fields.");
    return;
  }

  // Convert to metric
  const weight = convertToMetric(weightRaw, weightUnit, "weight");
  const height = convertToMetric(heightRaw, heightUnit, "height");

  // Calculate results
  const results = calculateTDEE(age, sex, weight, height, activityLevel);

  // Display results
  document.getElementById("tdeeMaintenance").textContent = results.tdee.toLocaleString();
  document.getElementById("tdeeBmr").textContent = results.bmr.toLocaleString();
  document.getElementById("tdeeAggressiveLoss").textContent = results.aggressiveLoss.toLocaleString();
  document.getElementById("tdeeModrateLoss").textContent = results.moderateLoss.toLocaleString();
  document.getElementById("tdeeMaintain").textContent = results.maintain.toLocaleString();
  document.getElementById("tdeeLeanBulk").textContent = results.leanBulk.toLocaleString();
  document.getElementById("tdeeAggressiveBulk").textContent = results.aggressiveBulk.toLocaleString();

  tdeeResults.hidden = false;
  tdeeResults.scrollIntoView({ behavior: "smooth" });

  // Track calculation for analytics
  if (typeof gtag === "function") {
    gtag("event", "tdee_calculated", {
      event_category: "calculator",
      event_label: `TDEE: ${results.tdee}`,
    });
  }
}

// Event listeners
tdeeForm?.addEventListener("submit", handleSubmit);

// Initialize
async function init() {
  await initFeatureFlags();

  // Check auth state
  const loginLink = document.getElementById("loginLink");
  const dashboardLink = document.getElementById("dashboardLink");
  const isAuthenticated = localStorage.getItem("tracker.authenticated") === "true";

  if (loginLink) loginLink.hidden = isAuthenticated;
  if (dashboardLink) dashboardLink.hidden = !isAuthenticated;
}

init();
