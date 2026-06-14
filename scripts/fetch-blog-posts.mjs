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

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
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
  const filePath = resolve(PUBLIC_DIR, "blog-posts.json");
  writeFileSync(filePath, JSON.stringify(posts, null, 2), "utf8");
  console.log(`[blog:fetch] Wrote ${posts.length} posts to ${filePath}`);
}

function writeIndividualPosts(posts) {
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

async function main() {
  console.log("[blog:fetch] Starting blog post fetch...");

  const posts = await fetchAllBlogPosts();
  console.log(`[blog:fetch] Total posts fetched: ${posts.length}`);

  writePostsIndex(posts);
  writeIndividualPosts(posts);

  console.log("[blog:fetch] Done.");
}

main().catch((err) => {
  console.error("[blog:fetch] Fatal error:", err);
  process.exit(1);
});
