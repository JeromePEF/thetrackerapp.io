const API_BASE = process.env.API_BASE || "https://api.thetrackerapp.io";
const BLOG_URL = "https://thetrackerapp.io/blog";
const REQUEST_TIMEOUT_MS = 8000;
const CACHE_MAX_AGE = 600; // 10 minutes

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAllPosts() {
  const allPosts = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await fetchText(`${API_BASE}/api/blog/posts?page=${page}&limit=50`);
    const posts = data.posts || [];
    totalPages = data.totalPages || 1;
    allPosts.push(...posts);
    if (!posts.length) break;
    page++;
  }

  return allPosts;
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

function pickDescription(post) {
  return post.excerpt || post.description || post.summary || post.subtitle || "";
}

function pickImage(post) {
  return post.featuredImage || post.image || post.ogImage || "";
}

export default async function handler(req, res) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).send("Method Not Allowed");
  }

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE * 2}`);

  try {
    const posts = await fetchAllPosts();

    const items = posts
      .filter((p) => p.slug && p.title)
      .map((post) => {
        const link = `${BLOG_URL}/${encodeURIComponent(post.slug)}`;
        const pubDate = toRfc822(post.publishedAt) || toRfc822(post.updatedAt) || "";
        const description = escapeXml(pickDescription(post));
        const image = pickImage(post);
        const imageTag = image
          ? `<enclosure url="${escapeXml(image)}" type="image/jpeg" />`
          : "";

        return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${description}</description>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}${imageTag ? `\n      ${imageTag}` : ""}
    </item>`;
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
</rss>`;

    return res.status(200).send(rss);
  } catch (err) {
    console.warn("blog-rss: failed to generate feed:", err.message);
    return res.status(502).send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>TheTrackerApp Blog</title>
    <link>${BLOG_URL}</link>
    <description>Temporarily unavailable. Please check back soon.</description>
  </channel>
</rss>`);
  }
}
