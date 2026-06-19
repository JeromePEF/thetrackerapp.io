#!/usr/bin/env node
/**
 * generate-sitemap.mjs
 * --------------------
 * Single source of truth for the public sitemap. Run via:
 *   npm run sitemap:build
 *
 * Why this exists:
 * - Hand-edited sitemaps drift. A page ships, the sitemap forgets it,
 *   the URL never gets indexed. Codifying the route list here means
 *   every new public page is one line away from being crawled.
 * - `lastmod` is derived from the actual file mtime on disk, so an
 *   edit to e.g. pricing.html bumps its lastmod automatically next
 *   build. This is the signal Googlebot uses for recrawl scheduling.
 *
 * Adding a new page:
 *   1. Add an entry to PUBLIC_ROUTES below.
 *   2. Make sure the HTML file exists at the `file` path.
 *   3. Run `npm run sitemap:build`. Commit the regenerated XML.
 *
 * Excluded by design (matches robots.txt):
 *   /dashboard, /logout, /authorize, /status, /affiliate/dashboard,
 *   /affiliate/connect
 */

import { statSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SITE = "https://thetrackerapp.io";

/**
 * Public route registry.
 *
 * priority: 0.0–1.0 hint to crawlers about relative importance within
 * the site. Homepage = 1.0, money pages = 0.8–0.9, legal pages = 0.3.
 *
 * changefreq: hint about how often content actually changes. Be honest
 * — lying ("always" on a static page) is a known soft-spam signal.
 */
const PUBLIC_ROUTES = [
  // Home
  { path: "/",                          file: "index.html",                 priority: "1.0", changefreq: "weekly" },

  // Money pages
  { path: "/pricing",                   file: "pricing.html",               priority: "0.9", changefreq: "weekly" },

  // Content hubs
  { path: "/blog",                      file: "blog.html",                  priority: "0.8", changefreq: "weekly" },
  { path: "/community",                 file: "community.html",             priority: "0.7", changefreq: "weekly" },
  { path: "/faq",                       file: "faq.html",                   priority: "0.6", changefreq: "monthly" },
  { path: "/press",                     file: "press.html",                 priority: "0.5", changefreq: "monthly" },
  { path: "/trust",                     file: "trust.html",                 priority: "0.6", changefreq: "monthly" },

  // Product pages
  { path: "/pebble-app",                file: "pebble-app.html",            priority: "0.7", changefreq: "monthly" },
  { path: "/mac-apps",                  file: "mac-apps.html",              priority: "0.7", changefreq: "monthly" },
  { path: "/products",                  file: "products.html",              priority: "0.6", changefreq: "monthly" },
  { path: "/workout-resources",         file: "workout-resources.html",     priority: "0.7", changefreq: "weekly" },

  // Community / social features
  { path: "/run-clubs",                 file: "run-clubs.html",             priority: "0.6", changefreq: "weekly" },
  { path: "/personal-trainers",         file: "personal-trainers.html",     priority: "0.6", changefreq: "weekly" },
  { path: "/groups",                    file: "groups.html",                priority: "0.6", changefreq: "weekly" },
  { path: "/brackets",                  file: "brackets.html",              priority: "0.6", changefreq: "weekly" },
  { path: "/win",                       file: "win.html",                   priority: "0.6", changefreq: "monthly" },
  { path: "/leaderboard",               file: "leaderboard.html",           priority: "0.7", changefreq: "daily" },

  // Free tools — high-intent SEO surface area
  { path: "/tools/tdee-calculator",     file: "tools/tdee-calculator.html", priority: "0.8", changefreq: "monthly" },
  { path: "/tools/bmi-calculator",      file: "tools/bmi-calculator.html",  priority: "0.8", changefreq: "monthly" },
  { path: "/tools/ai-meal-planner",     file: "tools/ai-meal-planner.html", priority: "0.8", changefreq: "monthly" },
  { path: "/tools/food-diary",          file: "tools/food-diary.html",      priority: "0.8", changefreq: "monthly" },

  // Affiliate signup is public; dashboard/connect are gated and stay out.
  { path: "/affiliate/signup",          file: "affiliate/signup.html",      priority: "0.5", changefreq: "monthly" },

  // Auth entry point — low priority but indexable.
  { path: "/login",                     file: "login.html",                 priority: "0.3", changefreq: "monthly" },

  // Legal
  { path: "/privacy",                   file: "privacy.html",               priority: "0.3", changefreq: "yearly" },
  { path: "/terms",                     file: "terms.html",                 priority: "0.3", changefreq: "yearly" },
];

/**
 * Returns YYYY-MM-DD for a file's last-modified time, or today's date
 * if the file is missing (we warn loudly in that case so the next
 * commit doesn't silently ship a phantom URL).
 */
function lastmodFor(filePath) {
  const abs = resolve(ROOT, filePath);
  if (!existsSync(abs)) {
    console.warn(`[sitemap] MISSING FILE: ${filePath} — falling back to today's date.`);
    return new Date().toISOString().slice(0, 10);
  }
  return statSync(abs).mtime.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Blog post URLs — read from the pre-fetched blog-posts.json (if available).
// Run `npm run blog:fetch` before building to keep the sitemap fresh.
// ---------------------------------------------------------------------------
function loadBlogPostUrls() {
  const blogDataPath = resolve(ROOT, "public", "blog-posts.json");
  if (!existsSync(blogDataPath)) {
    console.warn("[sitemap] No blog-posts.json found — run npm run blog:fetch first.");
    return [];
  }
  try {
    const raw = readFileSync(blogDataPath, "utf8");
    const posts = JSON.parse(raw);
    return posts
      .filter((p) => p.slug && p.publishedAt)
      .map((p) => ({
        path: `/blog/${p.slug}`,
        lastmodDate: p.updatedAt || p.publishedAt,
      }));
  } catch (err) {
    console.warn("[sitemap] Failed to parse blog-posts.json:", err.message);
    return [];
  }
}

const blogPostUrls = loadBlogPostUrls();

const urlEntries = PUBLIC_ROUTES.map((route) => {
  const lastmod = lastmodFor(route.file);
  return [
    "  <url>",
    `    <loc>${SITE}${route.path}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${route.changefreq}</changefreq>`,
    `    <priority>${route.priority}</priority>`,
    "  </url>",
  ].join("\n");
}).join("\n");

// Blog post URL entries
const blogUrlEntries = blogPostUrls.map((p) => {
  const lastmod = p.lastmodDate ? p.lastmodDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return [
    "  <url>",
    `    <loc>${SITE}${p.path}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    "    <changefreq>monthly</changefreq>",
    "    <priority>0.7</priority>",
    "  </url>",
  ].join("\n");
}).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
${blogUrlEntries}
</urlset>
`;

const outPath = resolve(ROOT, "public/sitemap.xml");
writeFileSync(outPath, xml, "utf8");

console.log(`[sitemap] Wrote ${PUBLIC_ROUTES.length + blogPostUrls.length} URLs (${PUBLIC_ROUTES.length} static + ${blogPostUrls.length} blog posts) to ${outPath}`);
