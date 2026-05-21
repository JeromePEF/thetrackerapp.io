// Press Page JavaScript
import { initFeatureFlags } from "./feature-flags.js";

const API_BASE = "https://api.thetrackerapp.io";

// DOM Elements
const pressInquiryForm = document.getElementById("pressInquiryForm");
const pressFormStatus = document.getElementById("pressFormStatus");
const pressReleasesList = document.getElementById("pressReleasesList");

// Fetch press releases
async function fetchPressReleases() {
  try {
    const response = await fetch(`${API_BASE}/api/press/releases?limit=5`);

    if (!response.ok) throw new Error("Failed to fetch");

    const data = await response.json();
    renderPressReleases(data.releases || []);
  } catch (error) {
    console.error("Error fetching press releases:", error);
    pressReleasesList.innerHTML = '<p class="loading-state">No press releases available.</p>';
  }
}

// Render press releases
function renderPressReleases(releases) {
  if (!releases.length) {
    pressReleasesList.innerHTML = '<p class="loading-state">No press releases available.</p>';
    return;
  }

  pressReleasesList.innerHTML = releases
    .map(
      (release) => `
    <article class="press-release-item">
      <h4><a href="${release.url || "#"}">${release.title}</a></h4>
      <time datetime="${release.date}">${formatDate(release.date)}</time>
    </article>
  `
    )
    .join("");
}

// Format date
function formatDate(dateStr) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

// Submit press inquiry
async function submitInquiry(e) {
  e.preventDefault();

  const formData = new FormData(pressInquiryForm);

  const inquiryData = {
    email: formData.get("email"),
    subject: formData.get("subject"),
    outlet: formData.get("outlet") || null,
    deadline: formData.get("deadline") || null,
    message: formData.get("message"),
  };

  pressFormStatus.textContent = "Sending...";
  pressFormStatus.className = "form-status";

  try {
    const response = await fetch(`${API_BASE}/api/press/inquiry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inquiryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to send inquiry");
    }

    pressFormStatus.textContent = "Your inquiry has been sent. We will respond within 24-48 hours.";
    pressFormStatus.className = "form-status success";
    pressInquiryForm.reset();
  } catch (error) {
    pressFormStatus.textContent = error.message || "Failed to send inquiry. Please email press@thetrackerapp.io directly.";
    pressFormStatus.className = "form-status error";
  }
}

// Event listeners
pressInquiryForm?.addEventListener("submit", submitInquiry);

// Initialize
async function init() {
  await initFeatureFlags();

  // Check auth state
  const isAuthenticated = localStorage.getItem("tracker.authenticated") === "true";
  document.getElementById("loginLink").hidden = isAuthenticated;
  document.getElementById("dashboardLink").hidden = !isAuthenticated;

  // Fetch press releases
  fetchPressReleases();
}

init();
