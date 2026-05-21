// Brackets Page JavaScript
import { initFeatureFlags } from "./feature-flags.js";

const API_BASE = "https://api.thetrackerapp.io";

// DOM Elements
const activeBracketsList = document.getElementById("activeBracketsList");
const upcomingBracketsList = document.getElementById("upcomingBracketsList");
const bracketVisualization = document.getElementById("bracketVisualization");
const bracketTree = document.getElementById("bracketTree");
const bracketTitle = document.getElementById("bracketTitle");
const bracketParticipants = document.getElementById("bracketParticipants");
const bracketRoundsLeft = document.getElementById("bracketRoundsLeft");
const bracketPrizePool = document.getElementById("bracketPrizePool");
const pastWinnersList = document.getElementById("pastWinnersList");
const joinOpenBracketBtn = document.getElementById("joinOpenBracketBtn");
const createCorporateBracketBtn = document.getElementById("createCorporateBracketBtn");

// Fetch active brackets
async function fetchActiveBrackets() {
  try {
    const response = await fetch(`${API_BASE}/api/brackets/active`);
    if (!response.ok) throw new Error("Failed to fetch");

    const data = await response.json();
    renderBrackets(activeBracketsList, data.brackets || [], "live");
  } catch (error) {
    console.error("Error fetching active brackets:", error);
    activeBracketsList.innerHTML = '<p class="loading-state">No active competitions at the moment.</p>';
  }
}

// Fetch upcoming brackets
async function fetchUpcomingBrackets() {
  try {
    const response = await fetch(`${API_BASE}/api/brackets/upcoming`);
    if (!response.ok) throw new Error("Failed to fetch");

    const data = await response.json();
    renderBrackets(upcomingBracketsList, data.brackets || [], "upcoming");
  } catch (error) {
    console.error("Error fetching upcoming brackets:", error);
    upcomingBracketsList.innerHTML = '<p class="loading-state">No upcoming competitions scheduled.</p>';
  }
}

// Fetch past winners
async function fetchPastWinners() {
  try {
    const response = await fetch(`${API_BASE}/api/brackets/winners?limit=6`);
    if (!response.ok) throw new Error("Failed to fetch");

    const data = await response.json();
    renderPastWinners(data.winners || []);
  } catch (error) {
    console.error("Error fetching past winners:", error);
    pastWinnersList.innerHTML = '<p class="loading-state">No past champions yet.</p>';
  }
}

// Render brackets grid
function renderBrackets(container, brackets, status) {
  if (!brackets.length) {
    container.innerHTML = `<p class="loading-state">No ${status === "live" ? "active" : "upcoming"} competitions.</p>`;
    return;
  }

  container.innerHTML = brackets
    .map(
      (bracket) => `
    <article class="bracket-card ${status === "live" ? "active" : ""}" data-bracket-id="${bracket.id}">
      <div class="bracket-card-header">
        <h3>${bracket.name}</h3>
        <span class="bracket-status ${status}">${status === "live" ? "Live" : "Upcoming"}</span>
      </div>
      <div class="bracket-card-meta">
        <span>${bracket.participants || 0} participants</span>
        <span>${bracket.type || "Open"}</span>
        ${bracket.startDate ? `<span>Starts ${formatDate(bracket.startDate)}</span>` : ""}
      </div>
      ${
        status === "live" && bracket.progress !== undefined
          ? `
        <div class="bracket-card-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${bracket.progress}%"></div>
          </div>
        </div>
      `
          : ""
      }
      <div class="bracket-card-footer">
        <span class="bracket-prize">${bracket.prize ? `$${bracket.prize}` : "No Prize"}</span>
        <button class="btn-secondary view-bracket-btn" data-bracket-id="${bracket.id}">
          ${status === "live" ? "View Bracket" : "Learn More"}
        </button>
      </div>
    </article>
  `
    )
    .join("");
}

// Render past winners
function renderPastWinners(winners) {
  if (!winners.length) {
    pastWinnersList.innerHTML = '<p class="loading-state">No past champions yet.</p>';
    return;
  }

  pastWinnersList.innerHTML = winners
    .map(
      (winner, index) => `
    <article class="past-winner-card">
      <span class="winner-place">#${index + 1}</span>
      <div class="winner-info">
        <h4>${winner.name || winner.username}</h4>
        <p>${winner.competition} - ${formatDate(winner.date)}</p>
      </div>
    </article>
  `
    )
    .join("");
}

// Show bracket visualization
async function showBracket(bracketId) {
  try {
    const response = await fetch(`${API_BASE}/api/brackets/${bracketId}`);
    if (!response.ok) throw new Error("Failed to fetch bracket");

    const bracket = await response.json();
    renderBracketTree(bracket);
    bracketVisualization.hidden = false;
    bracketVisualization.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Error fetching bracket:", error);
    alert("Unable to load bracket details. Please try again.");
  }
}

// Render bracket tree visualization
function renderBracketTree(bracket) {
  bracketTitle.textContent = bracket.name;
  bracketParticipants.textContent = bracket.participants || 0;
  bracketRoundsLeft.textContent = bracket.roundsRemaining || 0;
  bracketPrizePool.textContent = bracket.prize ? `$${bracket.prize}` : "$0";

  if (!bracket.rounds?.length) {
    bracketTree.innerHTML = '<p class="loading-state">Bracket not yet started.</p>';
    return;
  }

  bracketTree.innerHTML = bracket.rounds
    .map(
      (round, roundIndex) => `
    <div class="bracket-round" data-round="${roundIndex}">
      <h4 class="round-title">${round.name || `Round ${roundIndex + 1}`}</h4>
      ${round.matches
        .map(
          (match) => `
        <div class="bracket-match ${match.winner ? "winner" : ""}">
          <div class="bracket-participant ${match.winner === match.participant1?.id ? "winner" : match.winner ? "loser" : ""}">
            <span>${match.participant1?.name || "TBD"}</span>
            <span class="bracket-score">${match.score1 ?? "-"}</span>
          </div>
          <div class="bracket-participant ${match.winner === match.participant2?.id ? "winner" : match.winner ? "loser" : ""}">
            <span>${match.participant2?.name || "TBD"}</span>
            <span class="bracket-score">${match.score2 ?? "-"}</span>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
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

// Event listeners
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("view-bracket-btn")) {
    const bracketId = e.target.dataset.bracketId;
    showBracket(bracketId);
  }
});

joinOpenBracketBtn?.addEventListener("click", () => {
  const isAuthenticated = localStorage.getItem("tracker.authenticated") === "true";
  if (!isAuthenticated) {
    window.location.href = "/login?redirect=/brackets";
    return;
  }
  // Open join modal or redirect
  alert("Open bracket registration coming soon!");
});

createCorporateBracketBtn?.addEventListener("click", () => {
  const isAuthenticated = localStorage.getItem("tracker.authenticated") === "true";
  if (!isAuthenticated) {
    window.location.href = "/login?redirect=/brackets";
    return;
  }
  // Open creation flow
  alert("Corporate team creation coming soon!");
});

// Initialize
async function init() {
  await initFeatureFlags();

  // Check auth state
  const isAuthenticated = localStorage.getItem("tracker.authenticated") === "true";
  document.getElementById("loginLink").hidden = isAuthenticated;
  document.getElementById("dashboardLink").hidden = !isAuthenticated;

  // Fetch data
  fetchActiveBrackets();
  fetchUpcomingBrackets();
  fetchPastWinners();
}

init();
