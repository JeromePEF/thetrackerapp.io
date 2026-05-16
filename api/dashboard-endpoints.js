import { readFileSync } from "node:fs";
import { join } from "node:path";
import { timingSafeEqual } from "node:crypto";

const REALM = "thetrackerapp endpoint map";

function unauthorized(res, message = "Authentication required") {
  res.setHeader("WWW-Authenticate", `Basic realm="${REALM}"`);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.statusCode = 401;
  res.end(message);
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseSpec(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;
  let buffer = [];

  function flushBuffer() {
    if (!current || !buffer.length) return;
    const blocks = [];
    let currentBlock = null;
    for (const line of buffer) {
      if (!line.trim()) {
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        continue;
      }
      if (!currentBlock) currentBlock = { lines: [] };
      currentBlock.lines.push(line);
    }
    if (currentBlock) blocks.push(currentBlock);
    current.blocks = blocks;
    buffer = [];
  }

  for (const rawLine of lines) {
    const header = rawLine.match(/^==\s*(.+?)\s*==\s*(.*)$/);
    if (header) {
      flushBuffer();
      if (current) sections.push(current);
      current = { title: header[1].trim(), note: header[2].trim(), blocks: [] };
      continue;
    }
    if (!current) continue;
    buffer.push(rawLine);
  }
  flushBuffer();
  if (current) sections.push(current);
  return sections;
}

function renderBlock(block) {
  const lines = block.lines.filter((l) => !l.trim().startsWith("#"));
  if (!lines.length) return "";

  const proseLines = [];
  const endpointLines = [];
  const kvLines = [];
  const listLines = [];

  let mode = "prose";
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(GET|POST|PUT|DELETE|PATCH)\s+\//i.test(trimmed)) {
      endpointLines.push(trimmed);
      mode = "endpoint";
      continue;
    }
    if (trimmed.startsWith(":")) {
      kvLines.push(trimmed.replace(/^:\s*/, ""));
      mode = "kv";
      continue;
    }
    if (trimmed.startsWith("-")) {
      listLines.push(trimmed.replace(/^-\s*/, ""));
      mode = "list";
      continue;
    }
    if (mode === "endpoint" && line.startsWith(" ")) {
      endpointLines[endpointLines.length - 1] += `\n${line.trimEnd()}`;
      continue;
    }
    proseLines.push(trimmed);
    mode = "prose";
  }

  const parts = [];
  if (proseLines.length) {
    parts.push(`<p>${escapeHtml(proseLines.join(" "))}</p>`);
  }
  for (const ep of endpointLines) {
    parts.push(`<pre class="endpoint">${escapeHtml(ep)}</pre>`);
  }
  if (kvLines.length) {
    const rows = kvLines
      .map((kv) => {
        const idx = kv.indexOf(":");
        if (idx === -1) return `<tr><td colspan="2">${escapeHtml(kv)}</td></tr>`;
        const k = kv.slice(0, idx).trim();
        const v = kv.slice(idx + 1).trim();
        return `<tr><td class="key">${escapeHtml(k)}</td><td class="val">${escapeHtml(v)}</td></tr>`;
      })
      .join("");
    parts.push(`<table class="kv"><tbody>${rows}</tbody></table>`);
  }
  if (listLines.length) {
    const items = listLines.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    parts.push(`<ul>${items}</ul>`);
  }
  return parts.join("");
}

function renderPage(sections) {
  const tocHtml = sections
    .map((section) => `<a href="#${slugify(section.title)}">${escapeHtml(section.title)}</a>`)
    .join("");

  const sectionsHtml = sections
    .map((section) => {
      const blocks = section.blocks.map(renderBlock).filter(Boolean).join("");
      const note = section.note ? `<p>${escapeHtml(section.note)}</p>` : "";
      return `<section id="${slugify(section.title)}" class="card"><h2>${escapeHtml(section.title)}</h2><div class="body">${note}${blocks}</div></section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Dashboard Endpoint Map | The Tracker App</title>
<meta name="robots" content="noindex" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
<style>
:root { --line:#e5e7eb; --ink:#111; --ink-soft:#4b5563; --bg:#fafafa; --card:#fff; }
*{box-sizing:border-box}
body{margin:0;font-family:"Space Grotesk",system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.5;padding:1.5rem}
.shell{max-width:1080px;margin:0 auto}
header.page-head{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1rem}
h1{margin:0 0 .3rem;font-size:clamp(1.4rem,2.5vw,2rem)}
.lead{color:var(--ink-soft);font-size:.95rem;margin:0}
.source-link{font-size:.82rem;color:var(--ink-soft)}
.source-link code{background:#f3f4f6;padding:.12rem .4rem;border-radius:6px;font-family:"Space Grotesk",monospace;font-weight:600;color:var(--ink)}
.toc{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:.7rem 1rem;margin:0 0 1.5rem;display:flex;flex-wrap:wrap;gap:.4rem}
.toc a{font-size:.82rem;font-weight:600;text-decoration:none;color:var(--ink);background:#f3f4f6;padding:.32rem .65rem;border-radius:999px}
.toc a:hover{background:#e5e7eb}
section.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:1.1rem 1.2rem;margin:0 0 1rem}
section.card h2{margin:0 0 .5rem;font-size:1.1rem;letter-spacing:.02em}
section.card .body{font-size:.9rem;color:var(--ink-soft)}
section.card .body p{margin:0 0 .5rem}
pre.endpoint{background:#0f172a;color:#e2e8f0;padding:.55rem .7rem;border-radius:8px;font-family:"Space Grotesk",monospace;font-size:.82rem;margin:.4rem 0;white-space:pre-wrap;overflow-wrap:anywhere}
ul{margin:.2rem 0 .6rem;padding-left:1rem}
li{margin:.1rem 0}
table.kv{width:100%;border-collapse:collapse;margin:.3rem 0}
table.kv td{padding:.18rem .5rem;border-bottom:1px dashed #f1f3f5;font-size:.83rem;vertical-align:top}
table.kv td.key{color:var(--ink);font-weight:600;white-space:nowrap;width:38%}
table.kv td.val{color:var(--ink-soft);font-family:"Space Grotesk",monospace}
@media (prefers-color-scheme:dark){
  :root{--line:#27272a;--ink:#f4f4f5;--ink-soft:#a1a1aa;--bg:#0a0a0a;--card:#18181b}
  .toc a{background:#27272a;color:var(--ink)}
  .toc a:hover{background:#3f3f46}
  table.kv td{border-bottom-color:#27272a}
  pre.endpoint{background:#0a0a0a;border:1px solid #27272a}
  .source-link code{background:#27272a;color:var(--ink)}
}
</style>
</head>
<body>
<div class="shell">
<header class="page-head">
  <div>
    <h1>Dashboard Endpoint Map</h1>
    <p class="lead">Which backend endpoints each dashboard tab calls, what they expect back, and what's still missing.</p>
  </div>
  <p class="source-link">Source: <code>dashboard-endpoints.txt</code> (edit and redeploy to update)</p>
</header>
<nav class="toc" aria-label="Sections">${tocHtml}</nav>
<main>${sectionsHtml}</main>
</div>
</body>
</html>`;
}

export default function handler(req, res) {
  const PW = process.env.PW;
  if (!PW) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("PW env var is not set on this deployment.");
    return;
  }

  const auth = String(req.headers.authorization || "");
  let provided = "";
  if (auth.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
      const idx = decoded.indexOf(":");
      provided = idx === -1 ? decoded : decoded.slice(idx + 1);
    } catch {
      provided = "";
    }
  }

  if (!constantTimeEqual(provided, PW)) {
    unauthorized(res);
    return;
  }

  let txt = "";
  try {
    txt = readFileSync(join(process.cwd(), "dashboard-endpoints.txt"), "utf8");
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(`Could not load source file: ${error?.message || error}`);
    return;
  }

  const sections = parseSpec(txt);
  if (!sections.length) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Source file parsed to zero sections.");
    return;
  }

  const html = renderPage(sections);
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "private, max-age=0, no-store");
  res.end(html);
}
