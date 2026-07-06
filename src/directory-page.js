import { initGoogleAnalytics } from "./google-analytics.js";

const API_BASE = "https://api.thetrackerapp.io";

const PAGE_CONFIG = {
  "run-clubs": {
    title: "Run Clubs",
    kicker: "Find run clubs by city, compare momentum, and join a local group.",
    actionLabel: "View Club",
    endpoints: [
      "/api/run-clubs",
      "/api/clubs/run",
      "/api/clubs?type=run",
      "/run-clubs",
    ],
    listKeys: ["runClubs", "clubs", "items", "results", "rows", "data"],
  },
  "personal-trainers": {
    title: "Personal Trainers",
    kicker: "Find trainers by city, specialties, and coaching format.",
    actionLabel: "View Trainer",
    endpoints: [
      "/api/personal-trainers",
      "/api/trainers",
      "/api/coaches",
      "/personal-trainers",
    ],
    listKeys: ["personalTrainers", "trainers", "coaches", "items", "results", "rows", "data"],
  },
};

const STATE_CLASS = {
  normal: "page-state",
  error: "page-state error",
};

const els = {
  pageTitle: document.getElementById("pageTitle"),
  pageKicker: document.getElementById("pageKicker"),
  pageState: document.getElementById("pageState"),
  cityFilter: document.getElementById("cityFilter"),
  cardsGrid: document.getElementById("cardsGrid"),
  resultCount: document.getElementById("resultCount"),
};

const pageType = document.body.dataset.directoryType;
const activePageType = PAGE_CONFIG[pageType] ? pageType : "run-clubs";
const config = PAGE_CONFIG[activePageType];

const runtime = {
  cards: [],
  loadedEndpoint: "",
};

function setState(message, kind = "normal") {
  if (!els.pageState) {
    return;
  }
  els.pageState.className = kind === "error" ? STATE_CLASS.error : STATE_CLASS.normal;
  els.pageState.textContent = message || "";
}

function asString(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  return "";
}

function asNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const cleaned = value.replace(/[^\d.-]/g, "").trim();
  if (!cleaned) {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstFromPaths(source, paths) {
  for (const path of paths) {
    const parts = path.split(".");
    let cursor = source;

    for (const part of parts) {
      if (!cursor || typeof cursor !== "object") {
        cursor = null;
        break;
      }
      cursor = cursor[part];
    }

    if (Array.isArray(cursor) && cursor.length) {
      const normalized = cursor.map(asString).filter(Boolean);
      if (normalized.length) {
        return normalized.join(", ");
      }
    }

    const value = asString(cursor);
    if (value) {
      return value;
    }
  }
  return "";
}

function urlFromItem(source, paths) {
  const raw = firstFromPaths(source, paths);
  if (!raw) {
    return "";
  }

  if (raw.startsWith("/")) {
    return `${API_BASE}${raw}`;
  }

  try {
    return new URL(raw).toString();
  } catch {
    return "";
  }
}

function locationText(source) {
  const city = firstFromPaths(source, ["city", "location.city", "address.city"]);
  const region = firstFromPaths(source, ["state", "region", "location.state", "address.state", "country"]);

  if (city && region) {
    return `${city}, ${region}`;
  }

  return city || region || firstFromPaths(source, ["locationName", "location", "area"]);
}

function pickTags(source) {
  const tags = [];

  const arrayCandidates = [
    source?.tags,
    source?.specialties,
    source?.categories,
    source?.focusAreas,
    source?.disciplines,
  ];

  for (const candidate of arrayCandidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    for (const value of candidate) {
      const clean = asString(value);
      if (clean && !tags.includes(clean)) {
        tags.push(clean);
      }
      if (tags.length >= 5) {
        return tags;
      }
    }
  }

  const textCandidates = [
    firstFromPaths(source, ["specialty", "coachType", "type", "pace", "level"]),
  ].filter(Boolean);

  for (const candidate of textCandidates) {
    if (!tags.includes(candidate)) {
      tags.push(candidate);
    }
  }

  return tags.slice(0, 5);
}

function useMetric() {
  const locale = Intl.NumberFormat().resolvedOptions().locale;
  return locale !== "en-US" && locale !== "en-GB";
}

function buildMetrics(source, type) {
  const runMetricMap = [
    ["members", ["membersCount", "memberCount", "activeMembers", "runners"]],
    ["weekly mi", ["weeklyMiles", "milesThisWeek", "distanceThisWeek"]],
    ["workouts", ["workoutsThisWeek", "weeklyWorkouts", "sessionsThisWeek"]],
    ["rank", ["rank", "leaderboardRank"]],
  ];

  const trainerMetricMap = [
    ["clients", ["clientsCount", "activeClients", "athletes"]],
    ["years", ["yearsExperience", "experienceYears"]],
    ["rating", ["rating", "score"]],
    ["groups", ["groupsCount", "activeGroups"]],
  ];

  const metricMap = type === "run-clubs" ? runMetricMap : trainerMetricMap;
  const metrics = [];

  for (const [label, paths] of metricMap) {
    const value = firstFromPaths(source, paths);
    if (!value) {
      continue;
    }

    const numeric = asNumber(value);
    let rendered;
    let finalLabel = label;

    if (label === "weekly mi") {
      if (useMetric()) {
        rendered = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format((numeric || 0) * 1.60934);
        finalLabel = "weekly km";
      } else {
        rendered = numeric === null ? value : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(numeric);
        finalLabel = "weekly mi";
      }
    } else {
      rendered = numeric === null ? value : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(numeric);
    }

    metrics.push(`${rendered} ${finalLabel}`);
  }

  return metrics.slice(0, 4);
}

function normalizeCard(item, type) {
  const name = firstFromPaths(item, [
    "name",
    "title",
    "clubName",
    "trainerName",
    "displayName",
    "fullName",
  ]) || (type === "run-clubs" ? "Run Club" : "Personal Trainer");

  const location = locationText(item);
  const subtitle = location || firstFromPaths(item, ["headline", "tagline", "specialty", "pace"]);

  const description =
    firstFromPaths(item, ["description", "bio", "about", "summary", "mission"]) ||
    (type === "run-clubs"
      ? "Community run group available in The Tracker App."
      : "Coach profile available in The Tracker App.");

  const url = urlFromItem(item, [
    "url",
    "link",
    "profileUrl",
    "website",
    "websiteUrl",
    "bookingUrl",
    "joinUrl",
  ]);

  const imageUrl = urlFromItem(item, [
    "image",
    "imageUrl",
    "photo",
    "photoUrl",
    "avatar",
    "avatarUrl",
    "logo",
    "logoUrl",
  ]);

  return {
    id: firstFromPaths(item, ["id", "slug", "clubId", "trainerId"]) || name,
    name,
    subtitle,
    city: firstFromPaths(item, ["city", "location.city", "address.city"]),
    location,
    description,
    tags: pickTags(item),
    metrics: buildMetrics(item, type),
    ctaUrl: url,
    imageUrl,
  };
}

function extractItems(payload, listKeys) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  for (const key of listKeys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  const likelyContainers = [payload.data, payload.payload, payload.result, payload.results].filter(Boolean);
  for (const container of likelyContainers) {
    if (Array.isArray(container)) {
      return container;
    }
    if (container && typeof container === "object") {
      for (const value of Object.values(container)) {
        if (Array.isArray(value)) {
          return value;
        }
      }
    }
  }

  const queue = [payload];
  const seen = new Set();

  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object" || seen.has(node)) {
      continue;
    }
    seen.add(node);

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        if (!value.length || typeof value[0] === "object") {
          return value;
        }
      } else if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return [];
}

function endpointCandidates() {
  const params = new URLSearchParams(window.location.search);
  const manual = asString(params.get("endpoint"));

  if (manual) {
    return [manual];
  }

  return config.endpoints;
}

function endpointToUrl(endpoint) {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  return `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

async function fetchDirectory() {
  const endpoints = endpointCandidates();
  const errors = [];

  for (const endpoint of endpoints) {
    const url = endpointToUrl(endpoint);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        errors.push(`${url} (${response.status})`);
        continue;
      }

      const items = extractItems(payload, config.listKeys);
      if (!items.length && payload && typeof payload === "object") {
        const singletonName = firstFromPaths(payload, ["name", "title", "clubName", "trainerName", "fullName"]);
        if (singletonName) {
          runtime.loadedEndpoint = url;
          return [payload];
        }
      }

      runtime.loadedEndpoint = url;
      return items;
    } catch (error) {
      errors.push(`${url} (${error.message})`);
    }
  }

  throw new Error(`No usable endpoint response. Tried: ${errors.join(" | ")}`);
}

function cardAvatar(card) {
  const avatar = document.createElement("div");
  avatar.className = "card-avatar";

  if (card.imageUrl) {
    const img = document.createElement("img");
    img.src = card.imageUrl;
    img.alt = `${card.name} image`;
    img.loading = "lazy";
    img.decoding = "async";
    avatar.append(img);
  } else {
    avatar.textContent = (card.name || "?").charAt(0).toUpperCase();
  }

  return avatar;
}

function createCard(card) {
  const article = document.createElement("article");
  article.className = "directory-card";

  const head = document.createElement("header");
  head.className = "card-head";
  head.append(cardAvatar(card));

  const headText = document.createElement("div");
  const title = document.createElement("h2");
  title.className = "card-title";
  title.textContent = card.name;
  headText.append(title);

  if (card.subtitle) {
    const subtitle = document.createElement("p");
    subtitle.className = "card-subtitle";
    subtitle.textContent = card.subtitle;
    headText.append(subtitle);
  }

  head.append(headText);
  article.append(head);

  const description = document.createElement("p");
  description.className = "card-description";
  description.textContent = card.description;
  article.append(description);

  if (card.tags.length) {
    const chips = document.createElement("div");
    chips.className = "chips";

    for (const tag of card.tags) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = tag;
      chips.append(chip);
    }

    article.append(chips);
  }

  if (card.metrics.length) {
    const metrics = document.createElement("div");
    metrics.className = "metrics";

    for (const metric of card.metrics) {
      const badge = document.createElement("span");
      badge.className = "metric";
      badge.textContent = metric;
      metrics.append(badge);
    }

    article.append(metrics);
  }

  if (card.ctaUrl) {
    const footer = document.createElement("div");
    footer.className = "card-footer";

    const link = document.createElement("a");
    link.className = "card-link";
    link.href = card.ctaUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = config.actionLabel;

    footer.append(link);
    article.append(footer);
  }

  return article;
}

function render(cards) {
  if (!els.cardsGrid) {
    return;
  }

  els.cardsGrid.innerHTML = "";

  if (!cards.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = `No ${activePageType === "run-clubs" ? "run clubs" : "personal trainers"} found in the API payload.`;
    els.cardsGrid.append(empty);
  } else {
    const frag = document.createDocumentFragment();
    cards.forEach((card) => frag.append(createCard(card)));
    els.cardsGrid.append(frag);
  }

  if (els.resultCount) {
    const suffix = cards.length === 1 ? "result" : "results";
    const source = runtime.loadedEndpoint ? ` from ${runtime.loadedEndpoint}` : "";
    els.resultCount.textContent = `${cards.length} ${suffix}${source}`;
  }
}

function filterAndRender() {
  const query = asString(els.cityFilter?.value).toLowerCase();

  if (!query) {
    render(runtime.cards);
    return;
  }

  const filtered = runtime.cards.filter((card) => {
    const haystack = `${card.city} ${card.location} ${card.subtitle}`.toLowerCase();
    return haystack.includes(query);
  });

  render(filtered);
}

function configurePageText() {
  if (els.pageTitle) {
    els.pageTitle.textContent = config.title;
  }

  if (els.pageKicker) {
    els.pageKicker.textContent = config.kicker;
  }
}

async function init() {
  configurePageText();
  setState("Loading cards from API...");

  if (els.cityFilter) {
    els.cityFilter.addEventListener("input", filterAndRender);
  }

  try {
    const rawItems = await fetchDirectory();
    const normalized = rawItems
      .filter((item) => item && typeof item === "object")
      .map((item) => normalizeCard(item, activePageType));

    runtime.cards = normalized;
    render(runtime.cards);
    setState("", "normal");
  } catch (error) {
    runtime.cards = [];
    render([]);
    setState(error.message, "error");
  }
}

initGoogleAnalytics();
init();
