import {
  friendlyError,
  formatDate,
  isConfigured,
  readTimeFromMarkdown,
  requireSupabase
} from "./supabase-client.js";

const gridEl = document.getElementById("blog-post-grid");
const statusEl = document.getElementById("blog-status");
const emptyEl = document.getElementById("blog-empty");
const searchEl = document.getElementById("blog-search");
const scopeFilterEl = document.getElementById("blog-scope-filter");
const yearFilterEl = document.getElementById("blog-year-filter");
const monthFilterEl = document.getElementById("blog-month-filter");
const clearBtn = document.getElementById("clear-search");

let allPosts = [];
const SCOPE_TAG_PREFIX = "scope:";

function parseCoverUrls(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || "").trim())
          .filter(Boolean);
      }
    } catch {
      // Fallback to delimiter parsing.
    }
  }

  return raw
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function visibleTags(tags) {
  const list = Array.isArray(tags) ? tags : [];
  return list.filter((tag) => !String(tag || "").toLowerCase().startsWith(SCOPE_TAG_PREFIX));
}

function scopeFromTags(tags) {
  const list = Array.isArray(tags) ? tags : [];
  const scopeTag = list.find((tag) => String(tag || "").toLowerCase().startsWith(SCOPE_TAG_PREFIX));
  if (!scopeTag) return "personal";
  const scope = String(scopeTag).slice(SCOPE_TAG_PREFIX.length).trim().toLowerCase();
  return scope === "technical" ? "technical" : "personal";
}

function postDate(post) {
  const raw = post.published_at || post.created_at;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function populateYearFilter() {
  if (!yearFilterEl) return;
  const current = String(yearFilterEl.value || "all");
  const years = [...new Set(allPosts
    .map((post) => postDate(post))
    .filter(Boolean)
    .map((date) => String(date.getFullYear())))]
    .sort((a, b) => Number(b) - Number(a));

  yearFilterEl.innerHTML = `
    <option value="all">Year: All</option>
    ${years.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join("")}
  `;

  if (current !== "all" && years.includes(current)) {
    yearFilterEl.value = current;
  }
}

function postCardTemplate(post) {
  const tags = visibleTags(post.tags);
  const coverUrl = parseCoverUrls(post.cover_image_url)[0] || "";
  const cover = coverUrl
    ? `<div class="blog-card-cover"><img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(post.title)} cover" loading="lazy" /></div>`
    : "";

  const excerpt = escapeHtml(post.excerpt || "No excerpt available yet.");
  const readTime = readTimeFromMarkdown(post.content_md || "");

  return `
    <article class="card">
      ${cover}
      <p class="meta">${escapeHtml(formatDate(post.published_at || post.created_at))} | ${escapeHtml(readTime)}</p>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${excerpt}</p>
      <div class="tag-list">
        ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <a class="card-link" href="post.html?slug=${encodeURIComponent(post.slug)}">Read post</a>
    </article>
  `;
}

function renderPosts(posts) {
  if (!gridEl) return;

  if (!posts.length) {
    gridEl.innerHTML = "";
    if (emptyEl) emptyEl.classList.remove("hidden");
    if (statusEl) statusEl.textContent = "No posts match your search.";
    return;
  }

  if (emptyEl) emptyEl.classList.add("hidden");
  gridEl.innerHTML = posts.map(postCardTemplate).join("");

  if (statusEl) {
    statusEl.textContent = `Showing ${posts.length} published post${posts.length > 1 ? "s" : ""}.`;
  }
}

function applyFilters() {
  const query = String(searchEl?.value || "").trim().toLowerCase();
  const scope = String(scopeFilterEl?.value || "all").toLowerCase();
  const year = String(yearFilterEl?.value || "all");
  const month = String(monthFilterEl?.value || "all");

  const filtered = allPosts.filter((post) => {
    if (scope !== "all" && scopeFromTags(post.tags) !== scope) {
      return false;
    }

    const date = postDate(post);
    if (year !== "all") {
      if (!date || String(date.getFullYear()) !== year) return false;
    }

    if (month !== "all") {
      if (!date || String(date.getMonth() + 1) !== month) return false;
    }

    if (!query) return true;

    const haystack = [
      post.title,
      post.excerpt,
      ...visibleTags(post.tags)
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  renderPosts(filtered);
}

async function loadPosts() {
  if (!isConfigured) {
    if (statusEl) {
      statusEl.textContent =
        "Supabase config is missing. Update js/config.js to load dynamic posts.";
    }

    if (gridEl) {
      gridEl.innerHTML = `
        <article class="card">
          <h3>Configuration required</h3>
          <p>Open <code>js/config.js</code> and set your Supabase URL and anon key.</p>
        </article>
      `;
    }

    return;
  }

  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("posts")
      .select("id,title,slug,excerpt,cover_image_url,tags,published_at,created_at,content_md")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    allPosts = data || [];
    populateYearFilter();

    if (!allPosts.length) {
      if (statusEl) {
        statusEl.textContent = "No published posts yet. Use Admin to publish your first post.";
      }

      if (gridEl) {
        gridEl.innerHTML =
          '<article class="card"><h3>No posts yet</h3><p>Create your first blog post from the Admin dashboard.</p></article>';
      }

      return;
    }

    applyFilters();
  } catch (error) {
    if (statusEl) statusEl.textContent = "Failed to load posts.";

    if (gridEl) {
      gridEl.innerHTML = `
        <article class="card">
          <h3>Failed to load posts</h3>
          <p>${escapeHtml(friendlyError(error, "Unable to read blog posts from Supabase."))}</p>
        </article>
      `;
    }
  }
}

searchEl?.addEventListener("input", applyFilters);
scopeFilterEl?.addEventListener("change", applyFilters);
yearFilterEl?.addEventListener("change", applyFilters);
monthFilterEl?.addEventListener("change", applyFilters);
clearBtn?.addEventListener("click", () => {
  if (!searchEl) return;
  searchEl.value = "";
  if (scopeFilterEl) scopeFilterEl.value = "all";
  if (yearFilterEl) yearFilterEl.value = "all";
  if (monthFilterEl) monthFilterEl.value = "all";
  applyFilters();
  searchEl.focus();
});

void loadPosts();
