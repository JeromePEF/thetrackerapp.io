// Workout Groups Page
import { fetchFeatureFlags } from "./feature-flags.js";

const API_BASE = "https://api.thetrackerapp.io";

// Sample groups data (replace with API)
const SAMPLE_GROUPS = {
  telegram: [
    {
      id: "tg_1",
      name: "Morning Lifters",
      emoji: "🏋️",
      members: 156,
      description: "Early birds who lift before work. 5-7 AM crew.",
      workoutsThisWeek: 342,
      totalVolume: "1.2M lb",
      topStreak: 45,
      joinUrl: "https://t.me/morninglifters",
    },
    {
      id: "tg_2",
      name: "Run Club NYC",
      emoji: "🏃",
      members: 89,
      description: "Central Park runners. All paces welcome!",
      workoutsThisWeek: 178,
      totalVolume: "890 mi",
      topStreak: 32,
      joinUrl: "https://t.me/runclubnyc",
    },
    {
      id: "tg_3",
      name: "Home Workout Heroes",
      emoji: "💪",
      members: 234,
      description: "No gym? No problem. Bodyweight and minimal equipment.",
      workoutsThisWeek: 567,
      totalVolume: "45K reps",
      topStreak: 67,
      joinUrl: "https://t.me/homeworkoutheroes",
    },
    {
      id: "tg_4",
      name: "Powerlifting Squad",
      emoji: "🦍",
      members: 67,
      description: "Serious lifters. SBD focused. Competition prep.",
      workoutsThisWeek: 134,
      totalVolume: "2.8M lb",
      topStreak: 28,
      joinUrl: "https://t.me/powerliftingsquad",
    },
    {
      id: "tg_5",
      name: "Yoga & Mobility",
      emoji: "🧘",
      members: 112,
      description: "Daily stretching, yoga flows, and recovery.",
      workoutsThisWeek: 298,
      totalVolume: "1.5K hrs",
      topStreak: 90,
      joinUrl: "https://t.me/yogamobility",
    },
    {
      id: "tg_6",
      name: "CrossFit Crew",
      emoji: "🔥",
      members: 78,
      description: "WODs, AMRAPs, and functional fitness.",
      workoutsThisWeek: 245,
      totalVolume: "890K lb",
      topStreak: 52,
      joinUrl: "https://t.me/crossfitcrew",
    },
  ],
  imessage: [
    {
      id: "im_1",
      name: "Austin Gym Bros",
      emoji: "🤝",
      members: 24,
      description: "Local Austin lifters. Gym meetups and accountability.",
      workoutsThisWeek: 87,
      totalVolume: "456K lb",
      topStreak: 38,
      joinUrl: "sms:+15551234567&body=Join%20Austin%20Gym%20Bros",
    },
    {
      id: "im_2",
      name: "Office Fitness Club",
      emoji: "👔",
      members: 18,
      description: "Coworkers keeping each other accountable.",
      workoutsThisWeek: 45,
      totalVolume: "123K lb",
      topStreak: 21,
      joinUrl: "sms:+15559876543&body=Join%20Office%20Fitness",
    },
    {
      id: "im_3",
      name: "Weekend Warriors",
      emoji: "⚔️",
      members: 32,
      description: "Saturday and Sunday workout crew.",
      workoutsThisWeek: 64,
      totalVolume: "234K lb",
      topStreak: 15,
      joinUrl: "sms:+15555555555&body=Join%20Weekend%20Warriors",
    },
  ],
};

let currentPlatform = "telegram";

function init() {
  // Platform toggle
  document.querySelectorAll(".platform-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".platform-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentPlatform = btn.dataset.platform;
      showPlatformSection();
    });
  });

  // Create group button
  document.getElementById("createGroupBtn")?.addEventListener("click", () => {
    // Could open a modal or redirect
    window.location.href = "/login?action=createGroup";
  });

  loadGroups();
}

function showPlatformSection() {
  const telegramSection = document.getElementById("telegramSection");
  const imessageSection = document.getElementById("imessageSection");

  if (currentPlatform === "telegram") {
    telegramSection.hidden = false;
    imessageSection.hidden = true;
  } else {
    telegramSection.hidden = true;
    imessageSection.hidden = false;
  }
}

async function loadGroups() {
  // Try to fetch from API
  try {
    const res = await fetch(`${API_BASE}/api/groups`);
    if (res.ok) {
      const data = await res.json();
      renderGroups("telegram", data.telegram || SAMPLE_GROUPS.telegram);
      renderGroups("imessage", data.imessage || SAMPLE_GROUPS.imessage);
      return;
    }
  } catch (e) {
    console.warn("Could not fetch groups from API:", e);
  }

  // Use sample data
  renderGroups("telegram", SAMPLE_GROUPS.telegram);
  renderGroups("imessage", SAMPLE_GROUPS.imessage);
}

function renderGroups(platform, groups) {
  const container = document.getElementById(`${platform}Groups`);
  if (!container) return;

  if (!groups.length) {
    container.innerHTML = '<p class="loading-state">No groups available yet.</p>';
    return;
  }

  container.innerHTML = groups.map(group => `
    <article class="group-card">
      <div class="group-card-header">
        <div class="group-avatar">${group.emoji || "💪"}</div>
        <div class="group-info">
          <h3>${escapeHtml(group.name)}</h3>
          <span class="group-members">${group.members} members</span>
        </div>
      </div>
      <p class="group-description">${escapeHtml(group.description)}</p>
      <div class="group-stats">
        <div class="group-stat">
          <span class="group-stat-value">${group.workoutsThisWeek}</span>
          <span class="group-stat-label">Workouts/wk</span>
        </div>
        <div class="group-stat">
          <span class="group-stat-value">${group.totalVolume}</span>
          <span class="group-stat-label">Volume</span>
        </div>
        <div class="group-stat">
          <span class="group-stat-value">${group.topStreak}</span>
          <span class="group-stat-label">Top Streak</span>
        </div>
      </div>
      <a href="${escapeHtml(group.joinUrl)}" target="_blank" rel="noreferrer" class="join-group-btn ${platform}">
        Join on ${platform === "telegram" ? "Telegram" : "iMessage"}
      </a>
    </article>
  `).join("");
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

init();
