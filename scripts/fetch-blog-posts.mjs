#!/usr/bin/env node
/**
 * fetch-blog-posts.mjs
 * -------------------
 * Pre-build script that fetches blog posts from the backend API and stores
 * them for SEO optimization. Run via:
 *   npm run blog:fetch
 *
 * What it does:
 * 1. Fetches all published blog posts from https://api.thetrackerapp.io/api/blog/posts
 * 2. Writes the post data to public/blog-posts.json (for client-side preloading)
 * 3. Writes individual post data to public/blog-posts/{slug}.json (for detail pages)
 * 4. Updates the sitemap with blog post URLs (if --sitemap flag is passed)
 *
 * Why this exists:
 * - Client-side JS rendering is invisible to most search engines
 * - Pre-fetching and storing post data allows us to:
 *   a. Inject posts into the HTML for instant rendering
 *   b. Serve pre-rendered structured data for SEO
 *   c. Generate individual blog post pages at build time
 *   d. Keep the sitemap fresh with actual blog post URLs
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const API_BASE = process.env.API_BASE || "https://api.thetrackerapp.io";
const PUBLIC_DIR = resolve(ROOT, "public");
const BLOG_POSTS_DIR = resolve(PUBLIC_DIR, "blog-posts");

async function fetchAllBlogPosts() {
  const allPosts = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    try {
      const url = `${API_BASE}/api/blog/posts?page=${page}&limit=50`;
      console.log(`[blog:fetch] Fetching ${url}...`);

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(`[blog:fetch] HTTP ${response.status} on page ${page}`);
        break;
      }

      const data = await response.json();
      const posts = data.posts || [];
      totalPages = data.totalPages || 1;

      allPosts.push(...posts);
      console.log(`[blog:fetch] Page ${page}/${totalPages}: got ${posts.length} posts`);

      page++;
    } catch (err) {
      console.error(`[blog:fetch] Error fetching page ${page}:`, err.message);
      break;
    }
  }

  return allPosts;
}

function writePostsIndex(posts) {
  // If API returned 0 posts, keep the existing seed data (don't overwrite)
  if (!posts.length) {
    const filePath = resolve(PUBLIC_DIR, "blog-posts.json");
    if (existsSync(filePath)) {
      const existing = readFileSync(filePath, "utf8");
      const parsed = JSON.parse(existing);
      console.log(`[blog:fetch] API returned 0 posts — keeping existing ${parsed.length} seed posts.`);
      return;
    }
  }

  const filePath = resolve(PUBLIC_DIR, "blog-posts.json");
  writeFileSync(filePath, JSON.stringify(posts, null, 2), "utf8");
  console.log(`[blog:fetch] Wrote ${posts.length} posts to ${filePath}`);
}

function writeIndividualPosts(posts) {
  if (!posts.length) {
    console.log("[blog:fetch] No posts to write individually — skipping.");
    return;
  }

  if (!existsSync(BLOG_POSTS_DIR)) {
    mkdirSync(BLOG_POSTS_DIR, { recursive: true });
  }

  let count = 0;
  for (const post of posts) {
    if (!post.slug) continue;
    const filePath = resolve(BLOG_POSTS_DIR, `${post.slug}.json`);
    writeFileSync(filePath, JSON.stringify(post, null, 2), "utf8");
    count++;
  }
  console.log(`[blog:fetch] Wrote ${count} individual post files to ${BLOG_POSTS_DIR}/`);
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(dateStr) {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.toUTCString();
  } catch {
    return null;
  }
}

function writeRssFeed(posts) {
  const BLOG_URL = "https://thetrackerapp.io/blog";
  const items = posts
    .filter((p) => p.slug && p.title)
    .map((post) => {
      const link = `${BLOG_URL}/${encodeURIComponent(post.slug)}`;
      const pubDate = toRfc822(post.publishedAt) || toRfc822(post.updatedAt) || "";
      const description = escapeXml(post.excerpt || post.description || post.summary || post.subtitle || "");
      const image = post.featuredImage || post.image || post.ogImage || "";

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${description}</description>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>\n` : ""}${image ? `      <enclosure url="${escapeXml(image)}" type="image/jpeg" />\n` : ""}    </item>`;
    })
    .join("\n");

  const now = new Date().toUTCString();
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TheTrackerApp Blog</title>
    <link>${BLOG_URL}</link>
    <description>Fitness tips, workout guides, nutrition advice, and app updates from TheTrackerApp team.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${BLOG_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  if (!existsSync(resolve(PUBLIC_DIR, "blog"))) {
    mkdirSync(resolve(PUBLIC_DIR, "blog"), { recursive: true });
  }
  const filePath = resolve(PUBLIC_DIR, "blog", "rss.xml");
  writeFileSync(filePath, rss, "utf8");
  console.log(`[blog:fetch] Wrote RSS feed (${items.split("<item>").length - 1} items) to ${filePath}`);
}

async function main() {
  console.log("[blog:fetch] Starting blog post fetch...");

  const posts = await fetchAllBlogPosts();
  console.log(`[blog:fetch] Total posts fetched: ${posts.length}`);

  writePostsIndex(posts);
  writeIndividualPosts(posts);
  writeRssFeed(posts);

  console.log("[blog:fetch] Done.");
}

main().catch((err) => {
  console.error("[blog:fetch] Fatal error:", err);
  process.exit(1);
});
