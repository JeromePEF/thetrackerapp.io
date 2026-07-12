#!/usr/bin/env node
// generate-exercise-pages.mjs — programmatic SEO: one page per exercise.
// =============================================================================
// Runs AFTER `vite build` (vite empties dist/). Emits:
//   dist/exercises/<slug>/index.html   one page per catalog exercise
//   dist/exercises/index.html          category-grouped directory
//   dist/sitemap-exercises.xml         sitemap for all of the above
//
// Data source: the backend registry dataset (hardlinked tree sibling), with
// the live API as fallback so CI builds work anywhere.
//
// Each page carries a media slot (data-slot="demo") — when an exercise entry
// gains `media: {image, video, poster}` in exercises.json, the demo renders
// automatically on the next build. No template change needed.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, "..");
const DIST = path.join(SITE_ROOT, "dist");
const BASE_URL = "https://thetrackerapp.io";

const LOCAL_DATA = process.env.EXERCISES_SRC || path.resolve(SITE_ROOT, "..", "data", "exercises", "exercises.json");
const API_URL = "https://api.thetrackerapp.io/api/exercises/registry";

async function loadData() {
    try {
        return JSON.parse(fs.readFileSync(LOCAL_DATA, "utf8"));
    } catch (_) {
        const res = await fetch(API_URL, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`registry fetch failed: ${res.status}`);
        return res.json();
    }
}

// ── command generation (mirrors tools/exercise-nutrition.html) ─────────────
const COMMAND_NAME_MAP = {
    "pushup": "pushups", "pullup": "pullups", "chinup": "chinups", "situp": "situps",
    "bench press": "bench_press", "bicep curl": "bicep_curls",
    "lunge": "lunges", "crunch": "crunches", "burpee": "burpees", "row": "rowing",
};
function slashName(ex) {
    const explicit = COMMAND_NAME_MAP[ex.canonical];
    if (explicit) return String(explicit).trim().replace(/\s+/g, "_");
    const canon = String(ex.canonical || "").trim();
    const cl = canon.toLowerCase();
    const plural = (ex.aliases || []).find(a => {
        const al = String(a).trim().toLowerCase();
        return al === cl + "s" || al === cl + "es";
    });
    return String(plural || canon).replace(/\s+/g, "_");
}
const LOG_FAMILY = { reps: "count", count: "count", sets_reps: "count", sets_reps_weight: "count", duration: "time", distance: "distance", distance_duration: "distance" };
function usesLogForm(ex, logType) {
    if ((ex.category || "") === "strength") return true;
    if (logType === "sets_reps" || logType === "sets_reps_weight") {
        return LOG_FAMILY[ex.defaultLogType || "reps"] !== "count";
    }
    return LOG_FAMILY[logType] !== LOG_FAMILY[ex.defaultLogType || "reps"];
}
function placeholderAlts(ex) {
    return String(ex.placeholder || "").split(/\s+or\s+/).map(s => s.trim()).filter(Boolean);
}
function defaultValueFor(ex, logType) {
    const alts = placeholderAlts(ex);
    if (logType === "reps" || logType === "count") return alts.find(a => /^\d+$/.test(a)) || "20";
    if (logType === "duration") return alts.find(a => /^\d+(\.\d+)?\s*(s|sec|secs|m|min|mins|h|hr|hrs)$/i.test(a)) || "60s";
    if (logType === "sets_reps") return "3x10";
    if (logType === "sets_reps_weight") return "3x10@45";
    return alts[0] || "";
}
function buildCommand(name, useLog, value) {
    if (!name || !value) return "";
    return useLog ? `/log ${name} ${value}` : `/${name} ${value}`;
}
const LOG_TYPE_LABELS = { reps: "Reps", duration: "Duration", distance: "Distance", sets_reps: "Sets × Reps", sets_reps_weight: "Sets × Reps @ Weight", distance_duration: "Distance + Time", count: "Count" };

// ── helpers ─────────────────────────────────────────────────────────────────
const slugify = s => String(s).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-");
const titleCase = s => String(s).replace(/\b\w/g, c => c.toUpperCase());
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const CATEGORY_META = {
    calisthenics: { label: "Calisthenics / Bodyweight", icon: "🏋️" },
    pilates:      { label: "Pilates",                    icon: "💪" },
    yoga:         { label: "Yoga",                       icon: "🧘" },
    cardio:       { label: "Cardio / Endurance",         icon: "🏃" },
    strength:     { label: "Strength / Weighted",        icon: "🏋️‍♂️" },
    flexibility:  { label: "Flexibility / Mobility",     icon: "🤸" },
};

const SHARED_CSS = `
:root{--bg:#08111d;--panel:rgba(12,24,40,.92);--line:rgba(151,176,211,.22);--ink:#edf5ff;--muted:#8f9db2;--accent:#3fe0c5}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Space Grotesk',sans-serif;color:var(--ink);background:radial-gradient(circle at top left,rgba(63,224,197,.14),transparent 28%),radial-gradient(circle at top right,rgba(246,82,82,.10),transparent 24%),var(--bg);min-height:100dvh;line-height:1.55}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.shell{max-width:860px;margin:0 auto;padding:1rem 1.2rem 3rem}
.nav{display:flex;justify-content:space-between;align-items:center;padding:.9rem 0;border-bottom:1px solid var(--line);margin-bottom:1.4rem}
.brand{font-family:Orbitron,sans-serif;font-weight:700;font-size:15px;color:var(--ink)}
.crumbs{font-size:.74rem;color:var(--muted);margin-bottom:1rem}.crumbs a{color:var(--muted)}
h1{font-family:Orbitron,sans-serif;font-size:clamp(1.5rem,4.5vw,2.3rem);letter-spacing:.01em;margin-bottom:.35rem}
.cat-badge{display:inline-block;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);border:1px solid rgba(63,224,197,.35);border-radius:999px;padding:.25rem .8rem;margin-bottom:1rem}
.aka{color:var(--muted);font-size:.86rem;margin-bottom:1.4rem}
h2{font-family:Orbitron,sans-serif;font-size:1rem;letter-spacing:.05em;margin:1.8rem 0 .7rem;color:var(--accent)}
.cmd-card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:1rem 1.1rem;margin-bottom:.7rem}
.cmd-type{font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:.45rem}
.cmd-row{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.3rem}
code.cmd{font-family:'SF Mono',Menlo,Consolas,monospace;font-size:.95rem;color:var(--accent);background:rgba(0,0,0,.35);border-radius:8px;padding:.45rem .8rem}
.copy{font-family:Orbitron,sans-serif;font-size:.66rem;font-weight:700;letter-spacing:.06em;background:var(--accent);color:#08111d;border:none;border-radius:6px;padding:.4rem .8rem;cursor:pointer}
.copy:hover{opacity:.85}
.equiv{font-size:.74rem;color:var(--muted)}.equiv code{color:var(--accent);font-size:.74rem}
.demo-media{border:1px dashed var(--line);border-radius:12px;padding:1.1rem;color:var(--muted);font-size:.82rem;text-align:center}
.demo-media img,.demo-media video{max-width:100%;border-radius:10px}
.related{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.5rem}
.related a{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:.6rem .8rem;font-size:.84rem;color:var(--ink)}
.related a:hover{border-color:var(--accent);text-decoration:none}
.cta{margin-top:2.2rem;background:var(--panel);border:1px solid rgba(63,224,197,.3);border-radius:14px;padding:1.2rem;text-align:center}
.cta a{font-family:Orbitron,sans-serif;font-weight:700}
footer{margin-top:2.5rem;padding-top:1rem;border-top:1px solid var(--line);font-size:.74rem;color:var(--muted);display:flex;gap:1rem;flex-wrap:wrap}
.dir-cat{margin-bottom:2rem}
.dir-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:.45rem}
.search{width:100%;padding:.65rem .9rem;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:10px;color:var(--ink);font:inherit;margin-bottom:1.4rem}
.search:focus{border-color:var(--accent);outline:none}
`;

const HEAD_COMMON = `
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<link rel="icon" href="/favicon.ico"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
`;

const COPY_SCRIPT = `<script>document.addEventListener('click',function(e){var b=e.target.closest('.copy');if(!b)return;var c=b.dataset.cmd;if(!c)return;(navigator.clipboard&&navigator.clipboard.writeText)?navigator.clipboard.writeText(c):0;b.textContent='COPIED ✓';setTimeout(function(){b.textContent='COPY'},1400)});</script>`;

function nameForms(name) {
    if (!name.includes("_")) return [];
    return [name.replace(/_/g, "-"), name.replace(/_/g, " ")];
}

function commandBlocks(ex) {
    const types = ex.suggestedLogTypes && ex.suggestedLogTypes.length ? ex.suggestedLogTypes : [ex.defaultLogType || "reps"];
    const name = slashName(ex);
    return types.map(lt => {
        const useLog = usesLogForm(ex, lt);
        const v = defaultValueFor(ex, lt);
        const primary = buildCommand(name, useLog, v);
        if (!primary) return "";
        const equivalents = [];
        for (const alt of nameForms(name)) equivalents.push(buildCommand(alt, useLog, v));
        if (!useLog && (lt === "sets_reps" || lt === "sets_reps_weight")) equivalents.push(buildCommand(name, true, v));
        const equivHtml = equivalents.length
            ? `<div class="equiv">also valid: ${equivalents.map(c => `<code>${esc(c)}</code>`).join(" · ")}</div>` : "";
        return `<div class="cmd-card"><div class="cmd-type">${esc(LOG_TYPE_LABELS[lt] || lt)}</div>
<div class="cmd-row"><code class="cmd">${esc(primary)}</code><button class="copy" data-cmd="${esc(primary)}">COPY</button></div>${equivHtml}</div>`;
    }).join("\n");
}

function mediaBlock(ex) {
    const m = ex.media || {};
    if (m.video) {
        return `<section class="demo-media" data-slot="demo"><video controls preload="none" ${m.poster ? `poster="${esc(m.poster)}"` : ""}><source src="${esc(m.video)}"></video></section>`;
    }
    if (m.image) {
        return `<section class="demo-media" data-slot="demo"><img src="${esc(m.image)}" alt="${esc(titleCase(ex.canonical))} demonstration" loading="lazy"></section>`;
    }
    return `<section class="demo-media" data-slot="demo">📹 Image &amp; video demonstration coming soon</section>`;
}

function jsonLd(ex, slug, catMeta) {
    const name = titleCase(ex.canonical);
    const cmd = buildCommand(slashName(ex), usesLogForm(ex, ex.defaultLogType || "reps"), defaultValueFor(ex, ex.defaultLogType || "reps"));
    return JSON.stringify([
        {
            "@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
                { "@type": "ListItem", "position": 2, "name": "Exercises", "item": `${BASE_URL}/exercises/` },
                { "@type": "ListItem", "position": 3, "name": name, "item": `${BASE_URL}/exercises/${slug}/` }
            ]
        },
        {
            "@context": "https://schema.org", "@type": "HowTo",
            "name": `How to log ${name} by text`,
            "description": `Track ${name} (${catMeta.label}) by sending a text message — works over iMessage, Telegram, or Signal.`,
            "step": [
                { "@type": "HowToStep", "name": "Send the command", "text": `Text "${cmd}" to TheTrackerApp bot.` },
                { "@type": "HowToStep", "name": "Get your totals", "text": "The bot replies instantly with today's totals for this exercise." }
            ]
        }
    ]);
}

function exercisePage(ex, slug, related) {
    const name = titleCase(ex.canonical);
    const catMeta = CATEGORY_META[ex.category] || { label: ex.category, icon: "🏋️" };
    const aliases = (ex.aliases || []).filter(a => a.toLowerCase() !== ex.canonical.toLowerCase());
    const desc = `How to log ${name} by text: copy-paste commands, sets/reps/weight formats, and every valid spelling. ${catMeta.label} · TheTrackerApp works over iMessage, Telegram & Signal.`;
    const relatedHtml = related.map(r => `<a href="/exercises/${r.slug}/">${esc(titleCase(r.canonical))}</a>`).join("");
    return `<!doctype html>
<html lang="en">
<head>
<title>${esc(name)}: How to Log It by Text | TheTrackerApp</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${BASE_URL}/exercises/${slug}/">
<meta property="og:title" content="${esc(name)} — Text-Based Workout Logging">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${BASE_URL}/exercises/${slug}/">
<meta property="og:type" content="article">
<meta property="og:image" content="${BASE_URL}/OGImage.png">
${HEAD_COMMON}
<style>${SHARED_CSS}</style>
<script type="application/ld+json">${jsonLd(ex, slug, catMeta)}</script>
</head>
<body>
<div class="shell">
  <nav class="nav"><a class="brand" href="/">thetrackerapp.io</a><span><a href="/exercises/">All exercises</a></span></nav>
  <div class="crumbs"><a href="/">Home</a> › <a href="/exercises/">Exercises</a> › <a href="/exercises/#${esc(ex.category)}">${esc(catMeta.label)}</a> › ${esc(name)}</div>
  <h1>${esc(name)}</h1>
  <div class="cat-badge">${catMeta.icon} ${esc(catMeta.label)}${ex.subcategory ? " · " + esc(titleCase(String(ex.subcategory).replace(/_/g, " "))) : ""}</div>
  ${aliases.length ? `<p class="aka">Also known as: ${aliases.map(a => esc(a)).join(", ")}</p>` : ""}

  <h2>Log it by text</h2>
  ${commandBlocks(ex)}
  <p class="equiv" style="margin-top:.6rem">Underscores, dashes, and spaces are interchangeable — every spelling above logs the same exercise.</p>

  <h2>Demonstration</h2>
  ${mediaBlock(ex)}

  ${related.length ? `<h2>Related ${esc(catMeta.label)} exercises</h2><div class="related">${relatedHtml}</div>` : ""}

  <div class="cta">Track ${esc(name)} — and everything else — by texting a bot.<br><a href="/">Start your free trial →</a> · <a href="/tools/exercise-nutrition">Try the command builder</a></div>
  <footer><a href="/exercises/">Exercise directory</a><a href="/tools/exercise-nutrition">Command builder</a><a href="/pricing">Pricing</a><a href="/about">About</a></footer>
</div>
${COPY_SCRIPT}
</body>
</html>`;
}

function indexPage(byCategory) {
    let sections = "";
    let total = 0;
    for (const [cat, list] of Object.entries(byCategory)) {
        const meta = CATEGORY_META[cat] || { label: cat, icon: "🏋️" };
        total += list.length;
        sections += `<section class="dir-cat" id="${esc(cat)}"><h2>${meta.icon} ${esc(meta.label)} (${list.length})</h2><div class="dir-grid">` +
            list.map(e => `<a href="/exercises/${e.slug}/" data-n="${esc(e.canonical.toLowerCase())} ${esc((e.aliases || []).join(" ").toLowerCase())}">${esc(titleCase(e.canonical))}</a>`).join("") +
            `</div></section>`;
    }
    const desc = `Directory of ${total} exercises you can log by text message — calisthenics, pilates, yoga, cardio, strength, and flexibility. Copy-paste commands for every workout.`;
    return `<!doctype html>
<html lang="en">
<head>
<title>Exercise Directory — ${total} Workouts You Can Log by Text | TheTrackerApp</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${BASE_URL}/exercises/">
<meta property="og:title" content="Exercise Directory — Log Any Workout by Text">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${BASE_URL}/exercises/">
<meta property="og:type" content="website">
<meta property="og:image" content="${BASE_URL}/OGImage.png">
${HEAD_COMMON}
<style>${SHARED_CSS}</style>
</head>
<body>
<div class="shell">
  <nav class="nav"><a class="brand" href="/">thetrackerapp.io</a><span><a href="/tools/exercise-nutrition">Command builder</a></span></nav>
  <h1>Exercise Directory</h1>
  <p class="aka">${total} exercises across 6 categories — every one loggable with a single text.</p>
  <input class="search" id="q" type="text" placeholder="Search ${total} exercises…" autocomplete="off">
  ${sections}
  <footer><a href="/">Home</a><a href="/tools/exercise-nutrition">Command builder</a><a href="/pricing">Pricing</a></footer>
</div>
<script>
var q=document.getElementById('q');q.addEventListener('input',function(){var t=q.value.trim().toLowerCase();document.querySelectorAll('.dir-grid a').forEach(function(a){a.style.display=!t||a.dataset.n.indexOf(t)>=0?'':'none'});document.querySelectorAll('.dir-cat').forEach(function(s){s.style.display=Array.prototype.some.call(s.querySelectorAll('.dir-grid a'),function(a){return a.style.display!=='none'})?'':'none'})});
</script>
</body>
</html>`;
}

// ── main ────────────────────────────────────────────────────────────────────
const data = await loadData();
const exercises = (data.exercises || []).filter(e => typeof e === "object" && e.canonical);
if (!exercises.length) throw new Error("no exercises loaded");
if (!fs.existsSync(DIST)) throw new Error("dist/ missing — run vite build first");

const seen = new Set();
const catalog = [];
for (const ex of exercises) {
    const slug = slugify(ex.canonical);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    catalog.push({ ...ex, slug });
}

const byCategory = {};
for (const cat of Object.keys(CATEGORY_META)) byCategory[cat] = [];
for (const ex of catalog) (byCategory[ex.category] = byCategory[ex.category] || []).push(ex);
for (const list of Object.values(byCategory)) list.sort((a, b) => a.canonical.localeCompare(b.canonical));

let pages = 0;
for (const ex of catalog) {
    const siblings = (byCategory[ex.category] || []).filter(r => r.slug !== ex.slug);
    const sameSub = siblings.filter(r => r.subcategory === ex.subcategory);
    const related = [...sameSub, ...siblings.filter(r => r.subcategory !== ex.subcategory)].slice(0, 12);
    const dir = path.join(DIST, "exercises", ex.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), exercisePage(ex, ex.slug, related));
    pages++;
}

fs.writeFileSync(path.join(DIST, "exercises", "index.html"), indexPage(byCategory));

const today = new Date().toISOString().slice(0, 10);
const urls = [`${BASE_URL}/exercises/`, ...catalog.map(e => `${BASE_URL}/exercises/${e.slug}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq></url>`).join("\n") +
    `\n</urlset>\n`;
fs.writeFileSync(path.join(DIST, "sitemap-exercises.xml"), sitemap);

console.log(`[exercise-pages] ${pages} exercise pages + directory + sitemap (${urls.length} URLs)`);
