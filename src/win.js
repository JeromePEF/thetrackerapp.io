// Win $$$ Page JavaScript
import { initFeatureFlags } from "./feature-flags.js";

const API_BASE = "https://api.thetrackerapp.io";

// DOM Elements
const currentPrizePool = document.getElementById("currentPrizePool");
const activeChallengeSection = document.getElementById("activeChallengeSection");
const activeChallenge = document.getElementById("activeChallenge");
const noActiveChallenge = document.getElementById("noActiveChallenge");
const challengeLeaderboardSection = document.getElementById("challengeLeaderboardSection");
const challengeLeaderboard = document.getElementById("challengeLeaderboard");
const challengeTimer = document.getElementById("challengeTimer");
const pastWinnersList = document.getElementById("pastWinnersList");
const enableNotificationsBtn = document.getElementById("enableNotificationsBtn");

let timerInterval = null;

// Fetch current challenge
async function fetchCurrentChallenge() {
  try {
    const response = await fetch(`${API_BASE}/api/challenges/current`);

    if (!response.ok) {
      if (response.status === 404) {
        showNoChallenge();
        return;
      }
      throw new Error("Failed to fetch");
    }

    const challenge = await response.json();
    renderActiveChallenge(challenge);
  } catch (error) {
    console.error("Error fetching challenge:", error);
    showNoChallenge();
  }
}

// Show no active challenge state
function showNoChallenge() {
  activeChallenge.hidden = true;
  noActiveChallenge.hidden = false;
  challengeLeaderboardSection.hidden = true;
  currentPrizePool.textContent = "0";
}

// Render active challenge
function renderActiveChallenge(challenge) {
  activeChallenge.hidden = false;
  noActiveChallenge.hidden = true;
  challengeLeaderboardSection.hidden = false;

  currentPrizePool.textContent = challenge.prize || "0";

  activeChallenge.innerHTML = `
    <h2 class="challenge-title">${challenge.title}</h2>
    <p class="challenge-description">${challenge.description}</p>
    
    <div class="challenge-requirements">
      ${challenge.requirements
        .map(
          (req) => `
        <div class="challenge-requirement">
          <span class="requirement-value">${req.value}</span>
          <span class="requirement-label">${req.label}</span>
        </div>
      `
        )
        .join("")}
    </div>
    
    <div class="challenge-prize-display">Win $${challenge.prize}</div>
    
    <div class="challenge-cta">
      <button class="btn-primary" onclick="window.location.href='/login?redirect=/win'">
        Join Challenge
      </button>
      <button class="btn-secondary" onclick="shareChallenge()">
        Share
      </button>
    </div>
  `;

  // Start countdown timer
  startTimer(new Date(challenge.endsAt));

  // Fetch leaderboard
  fetchChallengeLeaderboard(challenge.id);
}

// Start countdown timer
function startTimer(endTime) {
  if (timerInterval) clearInterval(timerInterval);

  function updateTimer() {
    const now = new Date();
    const diff = endTime - now;

    if (diff <= 0) {
      challengeTimer.textContent = "ENDED";
      clearInterval(timerInterval);
      fetchCurrentChallenge(); // Refresh to get new challenge
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    challengeTimer.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

// Fetch challenge leaderboard
async function fetchChallengeLeaderboard(challengeId) {
  try {
    const response = await fetch(`${API_BASE}/api/challenges/${challengeId}/leaderboard`);
    if (!response.ok) throw new Error("Failed to fetch");

    const data = await response.json();
    renderLeaderboard(data.entries || []);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    challengeLeaderboard.innerHTML = '<li class="loading-state">Leaderboard loading...</li>';
  }
}

// Render leaderboard
function renderLeaderboard(entries) {
  if (!entries.length) {
    challengeLeaderboard.innerHTML = '<li class="loading-state">No participants yet. Be the first!</li>';
    return;
  }

  challengeLeaderboard.innerHTML = entries
    .map(
      (entry, index) => `
    <li class="leaderboard-entry">
      <span class="leaderboard-rank">${index + 1}</span>
      <span class="leaderboard-user">${entry.username || entry.name}</span>
      <span class="leaderboard-progress">${entry.progress}%</span>
      ${entry.completedAt ? `<span class="leaderboard-time">${formatTime(entry.completedAt)}</span>` : ""}
    </li>
  `
    )
    .join("");
}

// Fetch past winners
async function fetchPastWinners() {
  try {
    const response = await fetch(`${API_BASE}/api/challenges/winners?limit=10`);
    if (!response.ok) throw new Error("Failed to fetch");

    const data = await response.json();
    renderPastWinners(data.winners || []);
  } catch (error) {
    console.error("Error fetching past winners:", error);
    pastWinnersList.innerHTML = '<p class="loading-state">No recent winners yet.</p>';
  }
}

// Render past winners
function renderPastWinners(winners) {
  if (!winners.length) {
    pastWinnersList.innerHTML = '<p class="loading-state">No recent winners yet.</p>';
    return;
  }

  pastWinnersList.innerHTML = winners
    .map(
      (winner) => `
    <article class="past-winner-item">
      <div class="winner-avatar">${getInitials(winner.username || winner.name)}</div>
      <div class="winner-details">
        <h4>${winner.username || winner.name}</h4>
        <p>${winner.challenge} - ${formatDate(winner.date)}</p>
      </div>
      <span class="winner-prize">$${winner.prize}</span>
    </article>
  `
    )
    .join("");
}

// Get initials from name
function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Format date
function formatDate(dateStr) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateStr));
}

// Format time
function formatTime(dateStr) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

// Share challenge
window.shareChallenge = function () {
  const url = window.location.href;
  const text = "Check out this fitness challenge on The Tracker App!";

  if (navigator.share) {
    navigator.share({ title: "Win Cash - The Tracker App", text, url });
  } else {
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  }
};

// Enable notifications
async function enableNotifications() {
  if (!("Notification" in window)) {
    alert("Your browser doesn't support notifications.");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    alert("Notifications enabled! You'll be notified when new challenges go live.");

    // Register for push notifications (would need service worker)
    // This is a simplified version
    localStorage.setItem("tracker.notifications.challenges", "true");
  } else {
    alert("Notifications blocked. Please enable them in your browser settings.");
  }
}

// Event listeners
enableNotificationsBtn?.addEventListener("click", enableNotifications);

// Initialize
async function init() {
  await initFeatureFlags();

  // Check auth state
  const isAuthenticated = localStorage.getItem("tracker.authenticated") === "true";
  document.getElementById("loginLink").hidden = isAuthenticated;
  document.getElementById("dashboardLink").hidden = !isAuthenticated;

  // Fetch data
  fetchCurrentChallenge();
  fetchPastWinners();

  // Poll for updates every 30 seconds
  setInterval(fetchCurrentChallenge, 30000);
}

init();
