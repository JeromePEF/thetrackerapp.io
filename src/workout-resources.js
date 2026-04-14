import { inject } from "@vercel/analytics";
import { initGoogleAnalytics } from "./google-analytics.js";

const SOURCE_DEFS = [
  {
    id: "exrx",
    name: "ExRx Exercise Directory",
    note: "Broad exercise directory organized by body part and movement patterns.",
    home: "https://exrx.net/Lists/Directory",
  },
  {
    id: "jefit",
    name: "JEFIT Exercise Database",
    note: "Large searchable exercise library with categories and variations.",
    home: "https://www.jefit.com/exercises",
  },
  {
    id: "muscle-strength",
    name: "Muscle & Strength Database",
    note: "Strength and bodybuilding exercise options by muscle group.",
    home: "https://www.muscleandstrength.com/exercises",
  },
  {
    id: "musclewiki",
    name: "MuscleWiki",
    note: "Visual muscle-group-based lookup for quick suggestions.",
    home: "https://musclewiki.com/",
  },
];

const MUSCLE_GROUPS = [
  {
    key: "chest",
    label: "Chest",
    moves: ["Flat press", "Incline press", "Dips", "Cable fly", "Push-up variations"],
    links: {
      exrx: "https://exrx.net/Lists/ExList/ChestWt",
      jefit: "https://www.jefit.com/exercises/bodypart.php?id=11",
      "muscle-strength": "https://www.muscleandstrength.com/exercises/chest",
      musclewiki: "https://musclewiki.com/Chest",
    },
  },
  {
    key: "back",
    label: "Back",
    moves: ["Pull-up", "Barbell row", "Lat pulldown", "Chest-supported row", "RDL"],
    links: {
      exrx: "https://exrx.net/Lists/ExList/BackWt",
      jefit: "https://www.jefit.com/exercises/bodypart.php?id=3",
      "muscle-strength": "https://www.muscleandstrength.com/exercises/back",
      musclewiki: "https://musclewiki.com/Back",
    },
  },
  {
    key: "legs",
    label: "Legs",
    moves: ["Back squat", "Split squat", "Leg press", "Hamstring curl", "Calf raise"],
    links: {
      exrx: "https://exrx.net/Lists/ExList/ThighWt",
      jefit: "https://www.jefit.com/exercises/bodypart.php?id=6",
      "muscle-strength": "https://www.muscleandstrength.com/exercises/legs",
      musclewiki: "https://musclewiki.com/Legs",
    },
  },
  {
    key: "shoulders",
    label: "Shoulders",
    moves: ["Overhead press", "Lateral raise", "Rear delt fly", "Arnold press", "Upright row"],
    links: {
      exrx: "https://exrx.net/Lists/ExList/DeltoidWt",
      jefit: "https://www.jefit.com/exercises/bodypart.php?id=2",
      "muscle-strength": "https://www.muscleandstrength.com/exercises/shoulders",
      musclewiki: "https://musclewiki.com/Shoulders",
    },
  },
  {
    key: "arms",
    label: "Arms",
    moves: ["Barbell curl", "Hammer curl", "Skullcrusher", "Cable pushdown", "Close-grip press"],
    links: {
      exrx: "https://exrx.net/Lists/ExList/ArmWt",
      jefit: "https://www.jefit.com/exercises/bodypart.php?id=1",
      "muscle-strength": "https://www.muscleandstrength.com/exercises/arms",
      musclewiki: "https://musclewiki.com/Arms",
    },
  },
  {
    key: "core",
    label: "Core",
    moves: ["Hanging leg raise", "Cable crunch", "Plank variations", "Ab wheel", "Pallof press"],
    links: {
      exrx: "https://exrx.net/Lists/ExList/WaistWt",
      jefit: "https://www.jefit.com/exercises/bodypart.php?id=10",
      "muscle-strength": "https://www.muscleandstrength.com/exercises/abs",
      musclewiki: "https://musclewiki.com/Abs",
    },
  },
  {
    key: "glutes",
    label: "Glutes",
    moves: ["Hip thrust", "Romanian deadlift", "Cable kickback", "Lunge", "Glute bridge"],
    links: {
      exrx: "https://exrx.net/Lists/ExList/HipsWt",
      jefit: "https://www.jefit.com/exercises/bodypart.php?id=14",
      "muscle-strength": "https://www.muscleandstrength.com/exercises/glutes",
      musclewiki: "https://musclewiki.com/Glutes",
    },
  },
  {
    key: "full-body",
    label: "Full Body",
    moves: ["Deadlift", "Push press", "Carry", "Split squat", "Pull-up"],
    links: {
      exrx: "https://exrx.net/Lists/Directory",
      jefit: "https://www.jefit.com/exercises",
      "muscle-strength": "https://www.muscleandstrength.com/exercises",
      musclewiki: "https://musclewiki.com/",
    },
  },
];

const els = {
  chips: document.getElementById("muscleGroupChips"),
  summary: document.getElementById("selectedSummary"),
  sourceCards: document.getElementById("sourceCards"),
  movementCards: document.getElementById("movementCards"),
};

const state = {
  active: MUSCLE_GROUPS[0]?.key || "full-body",
};

function activeGroup() {
  return MUSCLE_GROUPS.find((group) => group.key === state.active) || MUSCLE_GROUPS[0];
}

function renderChips() {
  if (!els.chips) {
    return;
  }

  els.chips.innerHTML = MUSCLE_GROUPS.map((group) => {
    const active = group.key === state.active ? "is-active" : "";
    return `<button type="button" class="muscle-chip ${active}" data-muscle-key="${group.key}">${group.label}</button>`;
  }).join("");
}

function renderSummary(group) {
  if (!els.summary || !group) {
    return;
  }

  els.summary.textContent = `${group.label}: ${group.moves.join(" • ")}`;
}

function renderSourceCards(group) {
  if (!els.sourceCards || !group) {
    return;
  }

  els.sourceCards.innerHTML = SOURCE_DEFS.map((source) => {
    const href = group.links[source.id] || source.home;
    return `<article class="source-card">
      <h3>${source.name}</h3>
      <p>${source.note}</p>
      <a href="${href}" target="_blank" rel="noreferrer">Open ${group.label} in ${source.name}</a>
    </article>`;
  }).join("");
}

function renderMovementCards(group) {
  if (!els.movementCards || !group) {
    return;
  }

  els.movementCards.innerHTML = `<article class="movement-card">
    <h3>${group.label} Training Ideas</h3>
    <p>Use these movement patterns to build sessions, then choose exact exercises from the source links above.</p>
    <div class="movement-tags">${group.moves.map((move) => `<span>${move}</span>`).join("")}</div>
  </article>`;
}

function renderAll() {
  const group = activeGroup();
  renderChips();
  renderSummary(group);
  renderSourceCards(group);
  renderMovementCards(group);
}

function wireEvents() {
  if (!els.chips) {
    return;
  }

  els.chips.addEventListener("click", (event) => {
    const button = event.target.closest(".muscle-chip");
    if (!button) {
      return;
    }

    state.active = button.dataset.muscleKey || state.active;
    renderAll();
  });
}

function init() {
  renderAll();
  wireEvents();
}

init();
inject();
initGoogleAnalytics();
