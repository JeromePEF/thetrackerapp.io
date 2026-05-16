import { inject } from "@vercel/analytics";
import { initGoogleAnalytics } from "./google-analytics.js";

const SOURCE_DEFS = [
  {
    id: "exrx",
    name: "ExRx Exercise Directory",
    actionLabel: "ExRx",
    note: "Broad exercise directory organized by body part and movement patterns.",
    home: "https://exrx.net/Lists/Directory",
  },
  {
    id: "jefit",
    name: "JEFIT Exercise Database",
    actionLabel: "JEFIT",
    note: "Large searchable exercise library with categories and variations.",
    home: "https://www.jefit.com/exercises",
  },
  {
    id: "muscle-strength",
    name: "Muscle & Strength Database",
    actionLabel: "Muscle & Strength",
    note: "Strength and bodybuilding exercise options by muscle group.",
    home: "https://www.muscleandstrength.com/exercises",
  },
  {
    id: "musclewiki",
    name: "MuscleWiki",
    actionLabel: "MuscleWiki",
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

const MOVEMENT_PHOTOS = {
  chest: [
    {
      src: "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Athlete training chest with a dumbbell press.",
    },
    {
      src: "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Push-up training for chest and triceps.",
    },
  ],
  back: [
    {
      src: "https://images.pexels.com/photos/2261485/pexels-photo-2261485.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Back workout with rowing movement.",
    },
    {
      src: "https://images.pexels.com/photos/949129/pexels-photo-949129.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Cable back training with controlled pull.",
    },
  ],
  legs: [
    {
      src: "https://images.pexels.com/photos/841131/pexels-photo-841131.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Leg training with weighted lunges.",
    },
    {
      src: "https://images.pexels.com/photos/28080/pexels-photo-28080.jpg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Athlete performing a squat movement.",
    },
  ],
  shoulders: [
    {
      src: "https://images.pexels.com/photos/2261477/pexels-photo-2261477.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Shoulder pressing movement in the gym.",
    },
    {
      src: "https://images.pexels.com/photos/3838389/pexels-photo-3838389.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Dumbbell shoulder workout.",
    },
  ],
  arms: [
    {
      src: "https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Biceps curl training with dumbbells.",
    },
    {
      src: "https://images.pexels.com/photos/8805079/pexels-photo-8805079.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Arm accessory training using cables.",
    },
  ],
  core: [
    {
      src: "https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Core training using a plank variation.",
    },
    {
      src: "https://images.pexels.com/photos/5030770/pexels-photo-5030770.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Ab-focused floor training session.",
    },
  ],
  glutes: [
    {
      src: "https://images.pexels.com/photos/414029/pexels-photo-414029.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Glute-focused lunge workout.",
    },
    {
      src: "https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Hip-dominant training movement.",
    },
  ],
  "full-body": [
    {
      src: "https://images.pexels.com/photos/803301/pexels-photo-803301.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Full-body functional training with weights.",
    },
    {
      src: "https://images.pexels.com/photos/3757957/pexels-photo-3757957.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Conditioning-based full-body workout.",
    },
  ],
};

const els = {
  chips: document.getElementById("muscleGroupChips"),
  bodyMapFigure: document.getElementById("bodyMapFigure"),
  bodyMapHotspots: document.getElementById("bodyMapHotspots"),
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

  els.summary.textContent = `Selected muscle group: ${group.label}`;
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
      <a href="${href}" target="_blank" rel="noreferrer">Open in ${source.actionLabel}</a>
    </article>`;
  }).join("");
}

function renderMovementCards(group) {
  if (!els.movementCards || !group) {
    return;
  }

  const photos = MOVEMENT_PHOTOS[group.key] || [];
  const photoMarkup = photos.length
    ? `<div class="movement-photo-grid">${photos
        .map(
          (photo) => `<figure class="movement-photo">
      <img src="${photo.src}" alt="${photo.alt}" loading="lazy" decoding="async" />
    </figure>`,
        )
        .join("")}</div>`
    : "";

  els.movementCards.innerHTML = `<article class="movement-card">
    <h3>${group.label} Training Ideas</h3>
    <p>Use these movement patterns to build sessions, then choose exact exercises from the source links above.</p>
    ${photoMarkup}
    <div class="movement-tags">${group.moves.map((move) => `<span>${move}</span>`).join("")}</div>
  </article>`;
}

function renderAll() {
  const group = activeGroup();
  renderChips();
  syncSelectionHighlights();
  renderSummary(group);
  renderSourceCards(group);
  renderMovementCards(group);
}

function syncSelectionHighlights() {
  const active = state.active;

  document.querySelectorAll(".bodymap-chip").forEach((node) => {
    node.classList.toggle("is-active", node.dataset.muscleKey === active);
  });

  document.querySelectorAll(".muscle-spot").forEach((node) => {
    node.classList.toggle("is-active", node.dataset.muscleKey === active);
  });
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

  if (els.bodyMapHotspots) {
    els.bodyMapHotspots.addEventListener("click", (event) => {
      const button = event.target.closest("[data-muscle-key]");
      if (!button) {
        return;
      }

      state.active = button.dataset.muscleKey || state.active;
      renderAll();
    });
  }

  if (els.bodyMapFigure) {
    els.bodyMapFigure.addEventListener("click", (event) => {
      const target = event.target.closest("[data-muscle-key]");
      if (!target) {
        return;
      }

      state.active = target.dataset.muscleKey || state.active;
      renderAll();
    });
  }
}

function init() {
  renderAll();
  wireEvents();
}

inject();
initGoogleAnalytics();
init();
