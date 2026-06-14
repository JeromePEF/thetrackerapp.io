// Blog Post Detail Page JavaScript
import { initFeatureFlags } from "./feature-flags.js";

const API_BASE = "https://api.thetrackerapp.io";

function getSlugFromPath() {
  const path = window.location.pathname;
  const match = path.match(/^\/blog\/(.+)/);
  return match ? match[1] : null;
}

// Update JSON-LD structured data for SEO
function updateArticleStructuredData(post) {
  const scriptEl = document.querySelector('script[type="application/ld+json"]');
  if (!scriptEl) return;

  try {
    const data = JSON.parse(scriptEl.textContent);
    data["@id"] = `https://thetrackerapp.io/blog/${post.slug}#Article`;
    data.url = `https://thetrackerapp.io/blog/${post.slug}`;
    data.headline = post.title;
    data.description = post.excerpt;
    data.datePublished = post.publishedAt;
    data.dateModified = post.updatedAt || post.publishedAt;
    if (post.author) {
      data.author = {
        "@type": "Person",
        "name": post.author,
      };
    }
    if (post.featuredImage) {
      data.image = post.featuredImage;
    }
    scriptEl.textContent = JSON.stringify(data, null, 6);
  } catch (e) {
    // Ignore
  }
}

// Update meta tags for SEO
function updateMetaTags(post) {
  document.title = `${post.title} | TheTrackerApp`;

  const setMeta = (name, content, isProperty) => {
    if (isProperty) {
      let el = document.querySelector(`meta[property="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    } else {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }
  };

  setMeta("description", post.excerpt);
  setMeta("og:title", `${post.title} | TheTrackerApp`, true);
  setMeta("og:description", post.excerpt, true);
  setMeta("og:url", `https://thetrackerapp.io/blog/${post.slug}`, true);
  if (post.featuredImage) {
    setMeta("og:image", post.featuredImage, true);
  }

  let canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute("href", `https://thetrackerapp.io/blog/${post.slug}`);
}

// Simple Markdown to HTML converter
function markdownToHtml(md) {
  if (!md) return "";

  let html = md
    // Escape HTML entities
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h2>$1</h2>")
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`(.+?)`/g, "<code>$1</code>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    // Unordered lists
    .replace(/^[\*\-] (.+)$/gm, "<li>$1</li>")
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Horizontal rules
    .replace(/^---$/gm, "<hr />");

  // Wrap consecutive list items
  html = html
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => {
      if (match.includes("<li>")) {
        if (match.match(/^\d+\./m)) {
          return `<ol>\n${match}</ol>\n`;
        }
        return `<ul>\n${match}</ul>\n`;
      }
      return match;
    });

  // Paragraphs: wrap remaining non-tagged lines
  html = html
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("</ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("</ol") ||
        trimmed.startsWith("<li") ||
        trimmed.startsWith("</li") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("<img")
      ) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .join("\n");

  return html;
}

// Fetch a single blog post — API first, then pre-built JSON fallback
async function fetchPost(slug) {
  if (!slug) {
    document.getElementById("blogPostContent").innerHTML =
      '<p class="loading-state">Post not found.</p>';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/blog/posts/${slug}`);

    if (!response.ok) {
      throw new Error("Post not found in API");
    }

    const post = await response.json();
    if (!post || post.error) throw new Error("Post not found");
    renderPost(post);
  } catch (apiError) {
    console.warn("API post fetch failed, trying pre-built fallback:", apiError.message);
    // Fall back to pre-built JSON stored by npm run blog:fetch
    try {
      const fallbackRes = await fetch(`/blog-posts/${slug}.json`);
      if (!fallbackRes.ok) throw new Error("Post not found");
      const post = await fallbackRes.json();
      if (!post) throw new Error("Empty post data");
      renderPost(post);
    } catch (fallbackError) {
      console.error("Error fetching post:", fallbackError.message);
      document.getElementById("blogPostContent").innerHTML =
        '<p class="loading-state">Post not found or unavailable. <a href="/blog">Browse all posts</a>.</p>';
    }
  }
}

// Render a single blog post
function renderPost(post) {
  document.getElementById("blogPostTitle").textContent = post.title;
  document.getElementById("blogPostKicker").textContent =
    post.tags?.length ? post.tags[0] : "Blog Post";

  if (post.featuredImage) {
    const imageSection = document.getElementById("blogPostFeaturedImage");
    const img = document.getElementById("blogPostFeaturedImg");
    img.src = post.featuredImage;
    img.alt = post.title;
    imageSection.hidden = false;
  }

  document.getElementById("blogPostContent").innerHTML = markdownToHtml(post.content);

  // Sidebar metadata
  if (post.publishedAt) {
    document.getElementById("blogPostDate").textContent = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(post.publishedAt));
    document.getElementById("blogPostSidebarMeta").hidden = false;
  }

  if (post.author) {
    document.getElementById("blogPostAuthor").textContent = post.author;
    document.getElementById("blogPostSidebarAuthor").hidden = false;
  }

  if (post.tags?.length) {
    document.getElementById("blogPostTags").innerHTML = post.tags
      .map((tag) => `<span class="blog-tag">${tag}</span>`)
      .join("");
    document.getElementById("blogPostSidebarTags").hidden = false;
  }

  // SEO updates
  updateMetaTags(post);
  updateArticleStructuredData(post);
}

// Initialize
async function init() {
  await initFeatureFlags();

  // Check auth state
  const isAuthenticated = localStorage.getItem("tracker.authenticated") === "true";
  const loginLink = document.getElementById("loginLink");
  const dashboardLink = document.getElementById("dashboardLink");
  if (loginLink) loginLink.hidden = isAuthenticated;
  if (dashboardLink) dashboardLink.hidden = !isAuthenticated;

  const slug = getSlugFromPath();
  fetchPost(slug);
}

init();
