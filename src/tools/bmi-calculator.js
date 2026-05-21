// BMI Calculator JavaScript
import { initFeatureFlags } from "../feature-flags.js";

// DOM Elements
const bmiForm = document.getElementById("bmiForm");
const bmiResults = document.getElementById("bmiResults");

// Calculate BMI
function calculateBMI(weight, height) {
  // BMI = weight(kg) / height(m)^2
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  return bmi;
}

// Get BMI category
function getBMICategory(bmi) {
  if (bmi < 18.5) return { category: "Underweight", color: "#64b5f6" };
  if (bmi < 25) return { category: "Normal", color: "#5be7a9" };
  if (bmi < 30) return { category: "Overweight", color: "#ffb74d" };
  return { category: "Obese", color: "#ef5350" };
}

// Calculate indicator position (0-100%)
function getIndicatorPosition(bmi) {
  // Scale: 15-40 BMI mapped to 0-100%
  const minBMI = 15;
  const maxBMI = 40;
  const position = ((bmi - minBMI) / (maxBMI - minBMI)) * 100;
  return Math.max(0, Math.min(100, position));
}

// Calculate healthy weight range
function getHealthyWeightRange(heightCm, outputUnit) {
  // BMI 18.5 - 24.9
  const heightM = heightCm / 100;
  const minWeightKg = 18.5 * heightM * heightM;
  const maxWeightKg = 24.9 * heightM * heightM;

  if (outputUnit === "lb") {
    return {
      min: Math.round(minWeightKg / 0.453592),
      max: Math.round(maxWeightKg / 0.453592),
      unit: "lb",
    };
  }

  return {
    min: Math.round(minWeightKg),
    max: Math.round(maxWeightKg),
    unit: "kg",
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

  const formData = new FormData(bmiForm);

  const weightRaw = parseFloat(formData.get("weight"));
  const weightUnit = formData.get("weightUnit");
  const heightRaw = parseFloat(formData.get("height"));
  const heightUnit = formData.get("heightUnit");

  // Validate inputs
  if (!weightRaw || !heightRaw) {
    alert("Please enter your weight and height.");
    return;
  }

  // Convert to metric
  const weight = convertToMetric(weightRaw, weightUnit, "weight");
  const height = convertToMetric(heightRaw, heightUnit, "height");

  // Calculate BMI
  const bmi = calculateBMI(weight, height);
  const { category, color } = getBMICategory(bmi);
  const indicatorPosition = getIndicatorPosition(bmi);
  const healthyRange = getHealthyWeightRange(height, weightUnit);

  // Display results
  document.getElementById("bmiValue").textContent = bmi.toFixed(1);
  document.getElementById("bmiCategory").textContent = category;
  document.getElementById("bmiCategory").style.color = color;

  const indicator = document.getElementById("bmiIndicator");
  indicator.style.left = `${indicatorPosition}%`;

  document.getElementById("healthyWeightMin").textContent = healthyRange.min;
  document.getElementById("healthyWeightMax").textContent = healthyRange.max;
  document.getElementById("healthyWeightUnit").textContent = healthyRange.unit;

  bmiResults.hidden = false;
  bmiResults.scrollIntoView({ behavior: "smooth" });

  // Track calculation for analytics
  if (typeof gtag === "function") {
    gtag("event", "bmi_calculated", {
      event_category: "calculator",
      event_label: category,
      value: Math.round(bmi * 10) / 10,
    });
  }
}

// Event listeners
bmiForm?.addEventListener("submit", handleSubmit);

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
