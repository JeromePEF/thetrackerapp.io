// Blog Page JavaScript
import { initFeatureFlags } from "./feature-flags.js";

const API_BASE = "https://api.thetrackerapp.io";

// State
let posts = [];
let currentPage = 1;
let totalPages = 1;
let currentTag = "";
let searchQuery = "";

// DOM Elements
const blogPostsList = document.getElementById("blogPostsList");
const blogSearch = document.getElementById("blogSearch");
const blogTagFilter = document.getElementById("blogTagFilter");
const blogPagination = document.getElementById("blogPagination");
const blogPrevPage = document.getElementById("blogPrevPage");
const blogNextPage = document.getElementById("blogNextPage");
const blogPageInfo = document.getElementById("blogPageInfo");
const blogCreateSection = document.getElementById("blogCreateSection");
const blogCreateForm = document.getElementById("blogCreateForm");
const blogCreateStatus = document.getElementById("blogCreateStatus");

// Check if user is admin
async function checkAdmin() {
  const session = localStorage.getItem("tracker.auth.session");
  if (!session) return false;

  try {
    const response = await fetch(`${API_BASE}/api/user/role`, {
      headers: { Authorization: `Bearer ${session}` },
    });
    if (response.ok) {
      const data = await response.json();
      return data.role === "admin";
    }
  } catch (e) {
    // Ignore
  }
  return false;
}

// Fetch blog posts
async function fetchPosts() {
  blogPostsList.innerHTML = '<p class="loading-state">Loading posts...</p>';

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 12,
    });

    if (currentTag) params.set("tag", currentTag);
    if (searchQuery) params.set("search", searchQuery);

    const response = await fetch(`${API_BASE}/api/blog/posts?${params}`);

    if (!response.ok) throw new Error("Failed to fetch posts");

    const data = await response.json();
    posts = data.posts || [];
    totalPages = data.totalPages || 1;

    renderPosts();
    renderPagination();
    updateTagFilter(data.tags || []);
  } catch (error) {
    console.error("Error fetching posts:", error);
    blogPostsList.innerHTML = `
      <p class="loading-state">Unable to load blog posts. Please try again later.</p>
    `;
  }
}

// Render posts grid
function renderPosts() {
  if (!posts.length) {
    blogPostsList.innerHTML = `
      <p class="loading-state">No posts found${searchQuery ? ` for "${searchQuery}"` : ""}.</p>
    `;
    return;
  }

  blogPostsList.innerHTML = posts
    .map(
      (post) => `
    <article class="blog-post-card">
      ${
        post.featuredImage
          ? `
        <div class="blog-post-image">
          <img src="${post.featuredImage}" alt="${post.title}" loading="lazy" />
        </div>
      `
          : ""
      }
      <div class="blog-post-content">
        <div class="blog-post-meta">
          <time datetime="${post.publishedAt}">${formatDate(post.publishedAt)}</time>
          ${post.author ? `<span>by ${post.author}</span>` : ""}
        </div>
        <h3><a href="/blog/${post.slug}">${post.title}</a></h3>
        <p class="blog-post-excerpt">${post.excerpt}</p>
        ${
          post.tags?.length
            ? `
          <div class="blog-post-tags">
            ${post.tags.map((tag) => `<span class="blog-tag">${tag}</span>`).join("")}
          </div>
        `
            : ""
        }
      </div>
    </article>
  `
    )
    .join("");
}

// Render pagination
function renderPagination() {
  if (totalPages <= 1) {
    blogPagination.hidden = true;
    return;
  }

  blogPagination.hidden = false;
  blogPrevPage.disabled = currentPage <= 1;
  blogNextPage.disabled = currentPage >= totalPages;
  blogPageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

// Update tag filter options
function updateTagFilter(tags) {
  const currentValue = blogTagFilter.value;
  blogTagFilter.innerHTML = '<option value="">All Tags</option>';

  tags.forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    if (tag === currentValue) option.selected = true;
    blogTagFilter.appendChild(option);
  });
}

// Format date
function formatDate(dateStr) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

// Create new post
async function createPost(e) {
  e.preventDefault();

  const formData = new FormData(blogCreateForm);
  const session = localStorage.getItem("tracker.auth.session");

  const postData = {
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    tags: formData
      .get("tags")
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    featuredImage: formData.get("featuredImage") || null,
  };

  blogCreateStatus.textContent = "Publishing...";
  blogCreateStatus.className = "form-status";

  try {
    const response = await fetch(`${API_BASE}/api/blog/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session}`,
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create post");
    }

    blogCreateStatus.textContent = "Post published successfully!";
    blogCreateStatus.className = "form-status success";
    blogCreateForm.reset();
    fetchPosts();
  } catch (error) {
    blogCreateStatus.textContent = error.message;
    blogCreateStatus.className = "form-status error";
  }
}

// Event listeners
blogSearch?.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  currentPage = 1;
  fetchPosts();
});

blogTagFilter?.addEventListener("change", (e) => {
  currentTag = e.target.value;
  currentPage = 1;
  fetchPosts();
});

blogPrevPage?.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    fetchPosts();
  }
});

blogNextPage?.addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    fetchPosts();
  }
});

blogCreateForm?.addEventListener("submit", createPost);

// Auto-generate slug from title
document.getElementById("blogTitle")?.addEventListener("input", (e) => {
  const slugInput = document.getElementById("blogSlug");
  if (slugInput && !slugInput.dataset.manual) {
    slugInput.value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
});

document.getElementById("blogSlug")?.addEventListener("input", (e) => {
  e.target.dataset.manual = "true";
});

// Initialize
async function init() {
  await initFeatureFlags();

  // Check auth state
  const isAuthenticated = localStorage.getItem("tracker.authenticated") === "true";
  document.getElementById("loginLink").hidden = isAuthenticated;
  document.getElementById("dashboardLink").hidden = !isAuthenticated;

  // Check if admin
  const isAdmin = await checkAdmin();
  if (isAdmin && blogCreateSection) {
    blogCreateSection.hidden = false;
  }

  // Fetch posts
  fetchPosts();
}

init();
