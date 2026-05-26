// Changelog page renderer.
//
// Reads either:
//   1. GET https://api.thetrackerapp.io/changelog  (preferred — backend feed)
//   2. Or falls back to a baked-in FALLBACK_ENTRIES below so the page still
//      tells a story even before the backend endpoint is live.
//
// Backend response shape (see CHANGELOG_BACKEND.txt for the full spec):
//   {
//     "ok": true,
//     "entries": [
//       {
//         "date":  "2026-05-26",
//         "title": "Webhook-driven control flag invalidation",
//         "tags":  ["added","changed"],
//         "html":  "<ul><li>…</li></ul>"   ← rendered as-is (sanitised below)
//         "markdown": "- ...",              ← optional, used when no html
//         "items": [                        ← optional simple bullet list
//           { "text": "Stats tab now refreshes within 30s of a flag flip" }
//         ]
//       }
//     ]
//   }

const API_URL = "https://api.thetrackerapp.io/changelog";

// Curated fallback shipped alongside the page so the changelog is never empty.
// Backend can override entirely once it serves /changelog.
const FALLBACK_ENTRIES = [
  {
    date: "2026-05-26",
    title: "Instant control-flag propagation",
    tags: ["added", "changed"],
    items: [
      "Stats, footer socials, chatbot toggle, dashboard tabs and pricing tiers all refresh within ~30 s of a backend flag flip — no page reload needed.",
      "Vercel middleware now hits the backend directly for maintenance-mode checks, so toggling maintenance off recovers the site within ~2 s instead of waiting for the 5 min CDN cache.",
      "Added a 'Share week' button that exports a 1080×1920 PNG of your week (calories, macros, workouts, cardio, water, streak) with thetrackerapp.io branding for socials.",
      "Workouts table on the snapshot highlights PRs in gold with a 🏆 marker; CSV export marks PR rows with ★ PR for spreadsheet conditional formatting.",
    ],
  },
  {
    date: "2026-05-22",
    title: "AI chatbot widget",
    tags: ["added"],
    items: [
      "Floating bottom-right chat assistant on every page. Ask questions about logging, billing, or anything else.",
      "Type 'agent' or tap 'Talk to a human' to be handed off to a real person — the conversation persists across navigation.",
      "Controlled by the /control panel — flip chatbotEnabled to switch it on or off site-wide.",
    ],
  },
  {
    date: "2026-05-22",
    title: "Stats tab overhaul",
    tags: ["added", "changed"],
    items: [
      "New spotlight strip: today's calorie ring, macros progress, logging streak, week-of-calories bars.",
      "Click any day on the week-bar chart to drill into that day's food entries.",
      "Click 'View entries' on the Weight card to audit every weight row the backend has stored (with source + delete).",
      "Cardio strip surfaces running / walking / treadmill / cycling totals — only renders when you have cardio activity.",
    ],
  },
  {
    date: "2026-05-22",
    title: "Pricing page is now backend-driven",
    tags: ["changed"],
    items: [
      "Cards render dynamically from /control billing.* tiers — no frontend deploy required for a price change.",
      "Yearly cards auto-compute a 'Save N%' badge by comparing to the monthly tier in the same group.",
      "Weekly tier hidden from the public page (still available via text onboarding).",
    ],
  },
  {
    date: "2026-05-20",
    title: "Personal Trainers, Groups, and Run Clubs",
    tags: ["added"],
    items: [
      "Dedicated dashboard tabs for your coach, athletes, workout groups, and run clubs. Each tab can be toggled independently from /control.",
      "Public sign-up form at /personal-trainers#apply for coaches to apply for verification.",
      "Athletes can lock in with their coach's code straight from the dashboard.",
    ],
  },
  {
    date: "2026-05-18",
    title: "Body Measurements rebuild",
    tags: ["added", "changed"],
    items: [
      "Every measurement card now hydrates from /api/chart/data — no more empty cards when /api/body-measures isn't populated.",
      "Each card shows 'last May 19 · 12 entries' plus an editable per-measurement goal.",
      "Toggle imperial / metric units (coming soon).",
    ],
  },
  {
    date: "2026-05-15",
    title: "Leaderboard + public profile pages",
    tags: ["added"],
    items: [
      "New /leaderboard page with category filters (strength / calisthenics / streaks / steps / calories) and range selectors.",
      "Click any username on a leaderboard to land on /u/<username> — a public profile with stats, badges, recent activity.",
    ],
  },
];

const container = document.getElementById("changelogTimeline");

async function loadEntries() {
  try {
    const res = await fetch(API_URL, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.entries) || data.entries.length === 0) {
      throw new Error("no entries");
    }
    return data.entries;
  } catch {
    return FALLBACK_ENTRIES;
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Minimal markdown-to-html for backend-supplied entries (no full parser to
// avoid bundling marked/showdown; supports bullet lists + inline `code` +
// **bold** which is everything the changelog needs).
function mdToHtml(md) {
  if (!md) return "";
  const safe = escapeHtml(md);
  // Bullet lists
  const lines = safe.split(/\r?\n/);
  let html = "";
  let inList = false;
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s+(.*)$/);
    if (m) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inlineMd(m[1])}</li>`;
    } else if (line.trim() === "") {
      if (inList) { html += "</ul>"; inList = false; }
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${inlineMd(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

function inlineMd(s) {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderEntry(entry) {
  const date = new Date(entry.date);
  const dateLabel = Number.isNaN(date.getTime())
    ? entry.date
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const tags = Array.isArray(entry.tags)
    ? entry.tags
        .map((t) => `<span class="changelog-tag ${escapeHtml(String(t).toLowerCase())}">${escapeHtml(t)}</span>`)
        .join("")
    : "";

  let content;
  if (entry.html) {
    // Trust backend HTML but still strip <script> for safety.
    content = String(entry.html).replace(/<script[^>]*>.*?<\/script>/gi, "");
  } else if (entry.markdown) {
    content = mdToHtml(entry.markdown);
  } else if (Array.isArray(entry.items) && entry.items.length) {
    content = `<ul>${entry.items
      .map((i) => `<li>${typeof i === "string" ? escapeHtml(i) : escapeHtml(i.text || "")}</li>`)
      .join("")}</ul>`;
  } else {
    content = "";
  }

  return `
    <article class="changelog-entry">
      <header class="changelog-date">${escapeHtml(dateLabel)}</header>
      <div class="changelog-body">
        <h2>${escapeHtml(entry.title || "Update")}</h2>
        ${tags ? `<div class="changelog-tags">${tags}</div>` : ""}
        <div class="changelog-content">${content}</div>
      </div>
    </article>
  `;
}

async function init() {
  if (!container) return;
  const entries = await loadEntries();
  if (!entries.length) {
    container.innerHTML = `<p class="changelog-error">No changelog entries yet.</p>`;
    return;
  }
  // Sort newest first.
  entries.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  container.innerHTML = entries.map(renderEntry).join("");
}

init();
