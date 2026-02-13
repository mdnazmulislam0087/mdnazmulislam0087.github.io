import {
  formatDate,
  formatDateTime,
  friendlyError,
  isConfigured,
  markdownToSafeHtml,
  parseTagString,
  readTimeFromMarkdown,
  requireAdminSession,
  requireSupabase,
  setAlert,
  slugify,
  uploadFileToPath,
  uploadImageFile
} from "./supabase-client.js?v=20260213-3";
import { SITE_CONTENT_DEFAULTS } from "./site-content-defaults.js";

const alertEl = document.getElementById("admin-alert");
const userEl = document.getElementById("admin-user");

const postForm = document.getElementById("post-form");
const postsListEl = document.getElementById("posts-list");
const pastPostsListEl = document.getElementById("past-posts-list");
const logoutBtn = document.getElementById("logout-btn");
const newPostBtn = document.getElementById("new-post-btn");
const slugifyBtn = document.getElementById("slugify-btn");
const uploadCoverBtn = document.getElementById("upload-cover-btn");
const uploadInlineBtn = document.getElementById("upload-inline-btn");

const postIdInput = document.getElementById("post-id");
const titleInput = document.getElementById("title");
const slugInput = document.getElementById("slug");
const excerptInput = document.getElementById("excerpt");
const generateExcerptBtn = document.getElementById("generate-excerpt-btn");
const tagsInput = document.getElementById("tags");
const generateTagsBtn = document.getElementById("generate-tags-btn");
const blogScopeInput = document.getElementById("blog-scope");
const coverImageInput = document.getElementById("cover-image");
const inlineImageInput = document.getElementById("inline-image");
const coverUrlInput = document.getElementById("cover-url");
const coverUrlListEl = document.getElementById("cover-url-list");
const postDateInput = document.getElementById("post-date");
const coverPreviewWrap = document.getElementById("cover-preview");
const coverPreviewImage = document.getElementById("cover-preview-image");
const contentInput = document.getElementById("content");
const contentPreviewEl = document.getElementById("content-preview");
const postFormatToolbarEl = document.getElementById("post-format-toolbar");
const postColorInput = document.getElementById("post-color-input");
const publishedInput = document.getElementById("is-published");

const cmsPageFilterEl = document.getElementById("cms-page-filter");
const cmsGroupFilterEl = document.getElementById("cms-group-filter");
const cmsKeySelectEl = document.getElementById("cms-key-select");
const cmsLabelEl = document.getElementById("cms-label");
const cmsMetaEl = document.getElementById("cms-meta");
const cmsValueEl = document.getElementById("cms-value");
const cmsMarkdownToolsEl = document.getElementById("cms-markdown-tools");
const cmsSaveBtn = document.getElementById("cms-save-btn");
const cmsAddFocusBtn = document.getElementById("cms-add-focus-btn");
const cmsDeleteFocusBtn = document.getElementById("cms-delete-focus-btn");
const cmsAddCapabilityBtn = document.getElementById("cms-add-capability-btn");
const cmsDeleteCapabilityBtn = document.getElementById("cms-delete-capability-btn");
const cmsAddResearchPubBtn = document.getElementById("cms-add-research-pub-btn");
const cmsDeleteResearchPubBtn = document.getElementById("cms-delete-research-pub-btn");
const cmsResetBtn = document.getElementById("cms-reset-btn");
const cmsSeedBtn = document.getElementById("cms-seed-btn");
const cmsSearchEl = document.getElementById("cms-search");
const cmsListEl = document.getElementById("cms-list");
const cmsAssetFileInput = document.getElementById("cms-asset-file");
const cmsAssetLabelEl = document.querySelector('label[for="cms-asset-file"]');
const cmsUploadAssetBtn = document.getElementById("cms-upload-asset-btn");
const cmsOpenLinkBtn = document.getElementById("cms-open-link-btn");
const cmsUploadToolsEl = document.getElementById("cms-upload-tools");
const cmsLinkToolsEl = document.getElementById("cms-link-tools");
const cmsImagePreviewWrap = document.getElementById("cms-image-preview");
const cmsImagePreviewImage = document.getElementById("cms-image-preview-image");
const managerTabs = [...document.querySelectorAll("[data-manager-tab]")];
const managerPostsPanel = document.getElementById("manager-posts-panel");
const managerContentPanel = document.getElementById("manager-content-panel");
const managerPastPanel = document.getElementById("manager-past-panel");

let supabase;
let currentUser;
let postCache = [];
let cmsCache = [];
let cmsDbCache = [];
let activeManager = "posts";

const CMS_PAGE_ORDER = ["home", "about", "research", "contact", "blog"];
const FORCED_MARKDOWN_KEYS = new Set([
  "about.about_me.body",
  "about.professional.body",
  "about.education.body",
  "contact.content.body"
]);
const HERO_PHOTO_CMS_KEY = "home.hero.photo_url";
const HERO_CV_CMS_KEY = "home.hero.cv_url";
const LEGACY_CMS_KEYS_TO_REMOVE = [
  "home.signal.1",
  "home.signal.2",
  "home.signal.3"
];
const CMS_HIDDEN_KEYS = new Set([
  "home.hero.contact_label",
  "home.hero.contact_url",
  "about.interests.title",
  "about.focus.title",
  "about.focus.body",
  "about.professional.1",
  "about.professional.2",
  "about.professional.3",
  "about.education.1",
  "about.education.2",
  "about.education.3",
  "contact.channels.title",
  "contact.channels.email.title",
  "contact.channels.email.url",
  "contact.channels.email.text",
  "contact.channels.linkedin.title",
  "contact.channels.linkedin.url",
  "contact.channels.linkedin.text",
  "contact.channels.github.title",
  "contact.channels.github.url",
  "contact.channels.github.text",
  ...LEGACY_CMS_KEYS_TO_REMOVE
]);
const CMS_GROUP_ORDER = [
  "hero",
  "social",
  "snapshot",
  "metrics",
  "focus",
  "research",
  "profile",
  "capabilities",
  "capability",
  "education",
  "interests",
  "topics",
  "channels",
  "blog",
  "search",
  "pub",
  "general"
];
const SCOPE_TAG_PREFIX = "scope:";

function extractScopeFromTags(tags) {
  const list = Array.isArray(tags) ? tags : [];
  const match = list.find((tag) => String(tag || "").toLowerCase().startsWith(SCOPE_TAG_PREFIX));
  if (!match) return "personal";
  const value = String(match).slice(SCOPE_TAG_PREFIX.length).trim().toLowerCase();
  return value === "technical" ? "technical" : "personal";
}

function stripScopeTags(tags) {
  const list = Array.isArray(tags) ? tags : [];
  return list.filter((tag) => !String(tag || "").toLowerCase().startsWith(SCOPE_TAG_PREFIX));
}

function mergeScopeIntoTags(tags, scope) {
  const safeScope = scope === "technical" ? "technical" : "personal";
  const visible = stripScopeTags(tags);
  return [...visible, `${SCOPE_TAG_PREFIX}${safeScope}`];
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentPostFromCache() {
  const id = postIdInput?.value;
  if (!id) return null;
  return postCache.find((post) => post.id === id) || null;
}

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

function currentCmsEntry() {
  const key = String(cmsKeySelectEl?.value || "");
  if (!key) return null;
  return cmsCache.find((entry) => entry.key === key) || null;
}

function updateCoverPreview() {
  const urls = parseCoverUrls(coverUrlInput?.value || "");
  const url = urls[0] || "";
  renderCoverUrlList();

  if (!coverPreviewWrap || !coverPreviewImage) return;

  if (!url) {
    coverPreviewWrap.classList.add("hidden");
    coverPreviewImage.removeAttribute("src");
    renderPostPreview();
    return;
  }

  coverPreviewImage.src = url;
  coverPreviewWrap.classList.remove("hidden");
  renderPostPreview();
}

function setCoverUrls(urls) {
  if (!coverUrlInput) return;
  coverUrlInput.value = urls.join("\n");
  updateCoverPreview();
}

function moveCoverUrl(fromIndex, toIndex) {
  const urls = parseCoverUrls(coverUrlInput?.value || "");
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= urls.length ||
    toIndex >= urls.length ||
    fromIndex === toIndex
  ) {
    return;
  }
  const [moved] = urls.splice(fromIndex, 1);
  urls.splice(toIndex, 0, moved);
  setCoverUrls(urls);
}

function renderCoverUrlList() {
  if (!coverUrlListEl) return;
  const urls = parseCoverUrls(coverUrlInput?.value || "");

  if (!urls.length) {
    coverUrlListEl.innerHTML = '<p class="meta">No cover images yet.</p>';
    return;
  }

  coverUrlListEl.innerHTML = urls
    .map((url, index) => {
      const primaryBadge = index === 0 ? '<span class="status-badge status-published">Primary</span>' : "";
      return `
        <div class="cover-url-item" draggable="true" data-cover-index="${index}">
          <img src="${escapeHtml(url)}" alt="Cover ${index + 1}" loading="lazy" />
          <div class="cover-url-body">
            <p class="cover-url-text">${escapeHtml(url)}</p>
            <div class="cover-url-actions">
              ${primaryBadge}
              <button type="button" class="btn btn-ghost btn-sm" data-cover-action="remove" data-cover-index="${index}">Remove</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function resetForm() {
  if (!postForm) return;
  postForm.reset();
  if (postIdInput) postIdInput.value = "";
  publishedInput.checked = false;
  if (blogScopeInput) blogScopeInput.value = "personal";
  updateCoverPreview();
  renderPostPreview();
}

function fillForm(post) {
  if (!post) return;

  postIdInput.value = post.id;
  titleInput.value = post.title || "";
  slugInput.value = post.slug || "";
  excerptInput.value = post.excerpt || "";
  const storedTags = Array.isArray(post.tags) ? post.tags : [];
  tagsInput.value = stripScopeTags(storedTags).join(", ");
  if (blogScopeInput) {
    blogScopeInput.value = extractScopeFromTags(storedTags);
  }
  coverUrlInput.value = String(post.cover_image_url || "");
  postDateInput.value = formatDateInputValue(post.published_at || "");
  contentInput.value = post.content_md || "";
  publishedInput.checked = Boolean(post.is_published);
  updateCoverPreview();
  renderPostPreview();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatDateInputValue(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toPublishIsoFromDate(dateValue) {
  const raw = String(dateValue || "").trim();
  if (!raw) return null;
  return `${raw}T12:00:00.000Z`;
}

function renderPostPreview() {
  if (!contentPreviewEl) return;
  const title = String(titleInput?.value || "").trim() || "Post title preview";
  const excerpt = String(excerptInput?.value || "").trim() || "Short excerpt preview will appear here.";
  const markdown = String(contentInput?.value || "").trim();
  const tags = parseTagString(tagsInput?.value || "");
  const coverUrls = parseCoverUrls(coverUrlInput?.value || "");
  const readTime = readTimeFromMarkdown(markdown);
  const postDate = postDateInput?.value
    ? formatDate(`${postDateInput.value}T12:00:00.000Z`)
    : formatDate(new Date().toISOString());
  const cover = coverUrls[0]
    ? `
      <div class="image-frame" style="margin-bottom: 0.9rem;">
        <img src="${escapeHtml(coverUrls[0])}" alt="${escapeHtml(title)} cover image" />
      </div>
      ${coverUrls.length > 1 ? `<p class="note" style="margin-bottom: 0.75rem;">Slider preview: ${coverUrls.length} images (auto-slide on public page).</p>` : ""}
    `
    : "";
  const contentHtml = markdown
    ? markdownToSafeHtml(markdown)
    : '<p class="meta">Post body preview appears here as you write.</p>';

  contentPreviewEl.innerHTML = `
    <article>
      <header class="post-header">
        <p class="meta">${escapeHtml(postDate)} | ${escapeHtml(readTime)}</p>
        <h1 style="font-size: clamp(1.25rem, 2vw, 1.85rem); margin-bottom: 0.65rem;">${escapeHtml(title)}</h1>
        <p class="lead" style="margin-bottom: 0.65rem;">${escapeHtml(excerpt)}</p>
        <div class="tag-list">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      </header>
      ${cover}
      <section class="post-content">${contentHtml}</section>
    </article>
  `;
}

function replacePostSelection(prefix, suffix = "", placeholder = "") {
  if (!contentInput) return;
  const start = contentInput.selectionStart ?? 0;
  const end = contentInput.selectionEnd ?? 0;
  const value = contentInput.value || "";
  const selected = value.slice(start, end) || placeholder;
  const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
  contentInput.value = next;
  const cursor = start + prefix.length + selected.length + suffix.length;
  contentInput.focus();
  contentInput.selectionStart = contentInput.selectionEnd = cursor;
  renderPostPreview();
}

function prefixPostLine(prefix) {
  if (!contentInput) return;
  const start = contentInput.selectionStart ?? 0;
  const value = contentInput.value || "";
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
  contentInput.value = next;
  const cursor = start + prefix.length;
  contentInput.focus();
  contentInput.selectionStart = contentInput.selectionEnd = cursor;
  renderPostPreview();
}

function applyPostMarkdown(action) {
  switch (action) {
    case "h2":
      prefixPostLine("## ");
      break;
    case "h3":
      prefixPostLine("### ");
      break;
    case "bold":
      replacePostSelection("**", "**", "Bold text");
      break;
    case "italic":
      replacePostSelection("*", "*", "Italic text");
      break;
    case "quote":
      prefixPostLine("> ");
      break;
    case "code":
      replacePostSelection("`", "`", "code");
      break;
    case "codeblock":
      replacePostSelection("\n```text\n", "\n```\n", "your code here");
      break;
    case "bullet":
      prefixPostLine("- ");
      break;
    case "number":
      prefixPostLine("1. ");
      break;
    case "link":
      replacePostSelection("[", "](https://)", "Link text");
      break;
    case "divider":
      replacePostSelection("\n---\n");
      break;
    case "color": {
      const color = String(postColorInput?.value || "#0d3b66");
      replacePostSelection(`<span style="color:${color}">`, "</span>", "Colored text");
      break;
    }
    default:
      break;
  }
}

function stripMarkdownForExcerpt(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function generateShortExcerpt() {
  const content = String(contentInput?.value || "").trim();
  if (!content) {
    setAlert(alertEl, "error", "Write post content first, then generate excerpt.");
    return;
  }

  const firstLines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 7)
    .join(" ");

  const cleaned = stripMarkdownForExcerpt(firstLines);
  if (!cleaned) {
    setAlert(alertEl, "error", "Could not generate excerpt from current content.");
    return;
  }

  const maxLength = 320;
  const excerpt =
    cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trimEnd()}…` : cleaned;

  excerptInput.value = excerpt;
  setAlert(alertEl, "success", "Short excerpt generated from the first 7 lines.");
}

function stripMarkdownForTagSource(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, " $1 ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function generateAutoTags() {
  const title = String(titleInput?.value || "").trim();
  const excerpt = String(excerptInput?.value || "").trim();
  const content = String(contentInput?.value || "").trim();
  const source = `${title}\n${excerpt}\n${stripMarkdownForTagSource(content)}`.trim();

  if (!source) {
    setAlert(alertEl, "error", "Write title/content first, then generate tags.");
    return;
  }

  const stopwords = new Set([
    "the", "and", "for", "with", "that", "this", "from", "into", "about", "your", "you", "are",
    "was", "were", "have", "has", "had", "been", "being", "their", "there", "will", "would", "can",
    "could", "should", "our", "out", "over", "under", "than", "then", "them", "they", "its", "it's",
    "his", "her", "she", "him", "who", "what", "when", "where", "why", "how", "while", "through",
    "using", "used", "use", "also", "such", "more", "most", "very", "much", "many", "some", "any",
    "each", "other", "new", "one", "two", "three", "first", "second", "third", "my", "we", "is", "to",
    "in", "on", "of", "a", "an", "by", "at", "as", "or", "if", "it", "be", "do", "does", "did", "not"
  ]);

  const tokens = source
    .toLowerCase()
    .replace(/[^a-z0-9+\- ]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length >= 3 || token === "ai")
    .filter((token) => !stopwords.has(token));

  if (!tokens.length) {
    setAlert(alertEl, "error", "Could not find enough keywords to generate tags.");
    return;
  }

  const titleTokens = new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9+\- ]+/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token && !stopwords.has(token))
  );

  const scoreMap = new Map();
  for (const token of tokens) {
    const base = scoreMap.get(token) || 0;
    scoreMap.set(token, base + 1 + (titleTokens.has(token) ? 2 : 0));
  }

  const ranked = [...scoreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token)
    .filter((token) => !/^\d+$/.test(token));

  const tags = ranked.slice(0, 8);
  if (!tags.length) {
    setAlert(alertEl, "error", "Could not generate tags from current content.");
    return;
  }

  tagsInput.value = tags.join(", ");
  renderPostPreview();
  setAlert(alertEl, "success", "Tags generated automatically.");
}

function renderPostsList() {
  if (!postsListEl) return;

  if (!postCache.length) {
    postsListEl.innerHTML = '<div class="post-row"><p class="meta">No posts yet. Create your first post.</p></div>';
    return;
  }

  postsListEl.innerHTML = postCache
    .map((post) => {
      const statusClass = post.is_published ? "status-published" : "status-draft";
      const statusText = post.is_published ? "Published" : "Draft";
      const dateLabel = formatDateTime(post.updated_at || post.created_at);

      return `
        <div class="post-row" data-id="${escapeHtml(post.id)}">
          <div style="display: flex; justify-content: space-between; gap: 0.7rem; align-items: center;">
            <h3>${escapeHtml(post.title || "Untitled")}</h3>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </div>
          <p class="meta">/${escapeHtml(post.slug || "")}</p>
          <p class="meta">Updated ${escapeHtml(dateLabel)}</p>
          <div class="post-row-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-action="edit" data-id="${escapeHtml(post.id)}">Edit</button>
            <button type="button" class="btn btn-outline btn-sm" data-action="toggle" data-id="${escapeHtml(post.id)}">${post.is_published ? "Unpublish" : "Publish"}</button>
            <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${escapeHtml(post.id)}">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderPastPostsList() {
  if (!pastPostsListEl) return;

  if (!postCache.length) {
    pastPostsListEl.innerHTML =
      '<div class="post-row"><p class="meta">No posts yet. Create your first post.</p></div>';
    return;
  }

  pastPostsListEl.innerHTML = postCache
    .map((post) => {
      const statusClass = post.is_published ? "status-published" : "status-draft";
      const statusText = post.is_published ? "Published" : "Draft";
      const dateLabel = formatDateTime(post.updated_at || post.created_at);
      return `
        <div class="post-row" data-id="${escapeHtml(post.id)}">
          <div style="display: flex; justify-content: space-between; gap: 0.7rem; align-items: center;">
            <h3>${escapeHtml(post.title || "Untitled")}</h3>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </div>
          <p class="meta">/${escapeHtml(post.slug || "")}</p>
          <p class="meta">Updated ${escapeHtml(dateLabel)}</p>
          <div class="post-row-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-action="edit" data-id="${escapeHtml(post.id)}">Edit</button>
            <button type="button" class="btn btn-outline btn-sm" data-action="toggle" data-id="${escapeHtml(post.id)}">${post.is_published ? "Unpublish" : "Publish"}</button>
            <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${escapeHtml(post.id)}">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("id,title,slug,excerpt,content_md,cover_image_url,tags,is_published,published_at,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  postCache = data || [];
  renderPostsList();
  renderPastPostsList();
}

function buildPayload(existingPost) {
  const title = String(titleInput.value || "").trim();
  const slug = String(slugInput.value || "").trim();
  const content = String(contentInput.value || "").trim();

  if (!title) throw new Error("Title is required.");
  if (!slug) throw new Error("Slug is required.");
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Slug must contain only lowercase letters, numbers, and hyphens.");
  }
  if (!content) throw new Error("Content is required.");

  const publishNow = Boolean(publishedInput.checked);
  const selectedPostDateIso = toPublishIsoFromDate(postDateInput?.value);
  const payload = {
    title,
    slug,
    excerpt: String(excerptInput.value || "").trim(),
    content_md: content,
    cover_image_url: parseCoverUrls(coverUrlInput.value || "").join("\n") || null,
    tags: mergeScopeIntoTags(parseTagString(tagsInput.value), String(blogScopeInput?.value || "personal")),
    is_published: publishNow,
    updated_at: new Date().toISOString()
  };

  if (publishNow) {
    payload.published_at = selectedPostDateIso || existingPost?.published_at || new Date().toISOString();
  }

  if (!publishNow) {
    payload.published_at = selectedPostDateIso || existingPost?.published_at || null;
  }

  return payload;
}

async function savePost(event) {
  event.preventDefault();

  try {
    const existingPost = currentPostFromCache();
    const payload = buildPayload(existingPost);
    const postId = String(postIdInput.value || "").trim();

    setAlert(alertEl, "info", "Saving post...");

    if (postId) {
      const { error } = await supabase.from("posts").update(payload).eq("id", postId);
      if (error) throw error;
    } else {
      payload.author_id = currentUser.id;
      const { error } = await supabase.from("posts").insert(payload);
      if (error) throw error;
    }

    await loadPosts();

    if (!postId) {
      resetForm();
    }

    setAlert(alertEl, "success", "Post saved successfully.");
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Failed to save post."));
  }
}

async function handleDelete(postId) {
  const target = postCache.find((post) => post.id === postId);
  if (!target) return;

  const confirmed = window.confirm(`Delete "${target.title}"? This cannot be undone.`);
  if (!confirmed) return;

  try {
    setAlert(alertEl, "info", "Deleting post...");
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) throw error;

    if (postIdInput.value === postId) {
      resetForm();
    }

    await loadPosts();
    setAlert(alertEl, "success", "Post deleted.");
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Failed to delete post."));
  }
}

async function handleToggle(postId) {
  const target = postCache.find((post) => post.id === postId);
  if (!target) return;

  try {
    setAlert(alertEl, "info", target.is_published ? "Unpublishing..." : "Publishing...");

    const publish = !target.is_published;
    const payload = {
      is_published: publish,
      published_at: publish ? target.published_at || new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("posts").update(payload).eq("id", postId);
    if (error) throw error;

    await loadPosts();
    setAlert(alertEl, "success", publish ? "Post published." : "Post moved to draft.");
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Failed to update publish status."));
  }
}

async function uploadCover() {
  const file = coverImageInput?.files?.[0];
  if (!file) {
    setAlert(alertEl, "error", "Choose a cover image first.");
    return;
  }

  try {
    setAlert(alertEl, "info", "Uploading cover image...");
    const publicUrl = await uploadImageFile(file, currentUser.id, "covers");
    const existing = parseCoverUrls(coverUrlInput.value || "");
    if (!existing.includes(publicUrl)) {
      existing.push(publicUrl);
    }
    coverUrlInput.value = existing.join("\n");
    updateCoverPreview();
    setAlert(alertEl, "success", "Cover image uploaded.");
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Cover image upload failed."));
  }
}

async function uploadInline() {
  const file = inlineImageInput?.files?.[0];
  if (!file) {
    setAlert(alertEl, "error", "Choose an inline image first.");
    return;
  }

  try {
    setAlert(alertEl, "info", "Uploading inline image...");
    const publicUrl = await uploadImageFile(file, currentUser.id, "inline");
    const markdown = `\n![Image description](${publicUrl})\n`;

    const start = contentInput.selectionStart || 0;
    const end = contentInput.selectionEnd || 0;
    const value = contentInput.value;

    contentInput.value = `${value.slice(0, start)}${markdown}${value.slice(end)}`;
    contentInput.focus();
    contentInput.selectionStart = contentInput.selectionEnd = start + markdown.length;

    setAlert(alertEl, "success", "Inline image uploaded and markdown inserted.");
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Inline image upload failed."));
  }
}

function pageFromEntry(entry) {
  return String(entry?.page || "home").toLowerCase();
}

function pageSortValue(page) {
  const index = CMS_PAGE_ORDER.indexOf(page);
  return index === -1 ? 999 : index;
}

function pageLabel(page) {
  if (!page) return "Unknown";
  return page[0].toUpperCase() + page.slice(1);
}

function groupFromEntry(entry) {
  const page = pageFromEntry(entry);
  const key = String(entry?.key || "").toLowerCase();
  const parts = key.split(".").filter(Boolean);

  if (parts.length >= 2 && parts[0] === page && parts[1]) {
    return parts[1];
  }

  if (parts.length >= 2 && parts[1]) {
    return parts[1];
  }

  return "general";
}

function groupSortValue(group) {
  const index = CMS_GROUP_ORDER.indexOf(group);
  return index === -1 ? 999 : index;
}

function groupLabel(group) {
  if (!group) return "General";
  return group
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isImageEntry(entry) {
  const key = String(entry?.key || "").toLowerCase();
  const label = String(entry?.label || "").toLowerCase();
  return /(?:photo|image|avatar|picture|cover|thumbnail)/.test(`${key} ${label}`);
}

function isLikelyLinkEntry(entry) {
  const key = String(entry?.key || "").toLowerCase();
  const label = String(entry?.label || "").toLowerCase();
  return /(?:url|link|href|email|linkedin|github|portfolio|site|contact|website)/.test(`${key} ${label}`);
}

function isCvEntry(entry) {
  const key = String(entry?.key || "").toLowerCase();
  return key === HERO_CV_CMS_KEY || key.includes(".cv_") || key.includes("resume");
}

function isFocusEntry(entry) {
  const key = String(entry?.key || "");
  return /^home\.focus\.(\d+)\.(status|title|desc)$/.test(key);
}

function isMarkdownEntry(entry) {
  if (!entry) return false;
  if (FORCED_MARKDOWN_KEYS.has(String(entry.key || ""))) return true;
  return String(entry.kind || "").toLowerCase() === "markdown";
}

function effectiveEntryKind(entry) {
  return isMarkdownEntry(entry) ? "markdown" : (entry?.kind || "text");
}

function isResearchPubEntry(entry) {
  const key = String(entry?.key || "");
  return /^research\.pub\.(\d+)\.(meta|title|url)$/.test(key);
}

function isCapabilityEntry(entry) {
  const key = String(entry?.key || "");
  return /^home\.capability\.(\d+)\.(title|body)$/.test(key);
}

function looksLikeLinkValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (/^(https?:\/\/|mailto:|tel:|\/|\.{1,2}\/|www\.)/i.test(raw)) return true;
  if (!/^[a-z0-9][a-z0-9._/-]*$/i.test(raw)) return false;
  return raw.includes("/") || raw.includes(".");
}

function normalizeLinkValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^www\./i.test(raw)) return `https://${raw}`;
  return raw;
}

function parseCmsImageList(value) {
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
      // Fall back to delimiter parsing.
    }
  }

  return raw
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function updateCmsValuePreview() {
  const entry = currentCmsEntry();
  const value = String(cmsValueEl?.value || "").trim();
  const hasEntry = Boolean(entry);
  const hasValue = Boolean(value);
  const isImage = hasEntry && isImageEntry(entry);
  const isCv = hasEntry && isCvEntry(entry);
  const isFocus = hasEntry && isFocusEntry(entry);
  const isResearchPub = hasEntry && isResearchPubEntry(entry);
  const isCapability = hasEntry && isCapabilityEntry(entry);
  const inHomePage = String(cmsPageFilterEl?.value || "").toLowerCase() === "home";
  const inCapabilitySection = String(cmsGroupFilterEl?.value || "").toLowerCase() === "capability";
  const showCapabilityControls = isCapability && inHomePage && inCapabilitySection;
  const inResearchPage = String(cmsPageFilterEl?.value || "").toLowerCase() === "research";
  const inPubSection = String(cmsGroupFilterEl?.value || "").toLowerCase() === "pub";
  const showResearchPubControls = isResearchPub && inResearchPage && inPubSection;
  const isLinkType = hasEntry && isLikelyLinkEntry(entry);
  const showUploadTools = isImage || isCv;
  const showLinkTools = isLinkType || (isImage && hasValue) || looksLikeLinkValue(value);
  const canOpenLink = showLinkTools && hasValue && looksLikeLinkValue(value);

  if (cmsUploadToolsEl) {
    cmsUploadToolsEl.classList.toggle("hidden", !showUploadTools);
  }

  if (cmsLinkToolsEl) {
    cmsLinkToolsEl.classList.toggle("hidden", !showLinkTools);
  }

  if (cmsUploadAssetBtn) {
    cmsUploadAssetBtn.disabled = !showUploadTools;
    cmsUploadAssetBtn.textContent = isCv ? "Upload CV (Replace Existing)" : "Upload Image for This Block";
  }

  if (cmsAssetLabelEl) {
    cmsAssetLabelEl.textContent = isCv ? "Upload PDF CV (replaces previous file)" : "Upload image and use its URL";
  }

  if (cmsAssetFileInput) {
    cmsAssetFileInput.setAttribute("accept", isCv ? ".pdf,application/pdf" : "image/*");
  }

  if (cmsOpenLinkBtn) {
    cmsOpenLinkBtn.disabled = !canOpenLink;
  }

  if (cmsDeleteFocusBtn) {
    cmsDeleteFocusBtn.classList.toggle("hidden", !isFocus);
    cmsDeleteFocusBtn.disabled = !isFocus;
  }

  if (cmsAddFocusBtn) {
    cmsAddFocusBtn.classList.toggle("hidden", !isFocus);
    cmsAddFocusBtn.disabled = !isFocus;
  }

  if (cmsDeleteResearchPubBtn) {
    cmsDeleteResearchPubBtn.classList.toggle("hidden", !showResearchPubControls);
    cmsDeleteResearchPubBtn.disabled = !showResearchPubControls;
  }

  if (cmsAddResearchPubBtn) {
    cmsAddResearchPubBtn.classList.toggle("hidden", !showResearchPubControls);
    cmsAddResearchPubBtn.disabled = !showResearchPubControls;
  }

  if (cmsDeleteCapabilityBtn) {
    cmsDeleteCapabilityBtn.classList.toggle("hidden", !showCapabilityControls);
    cmsDeleteCapabilityBtn.disabled = !showCapabilityControls;
  }

  if (cmsAddCapabilityBtn) {
    cmsAddCapabilityBtn.classList.toggle("hidden", !showCapabilityControls);
    cmsAddCapabilityBtn.disabled = !showCapabilityControls;
  }

  if (cmsMarkdownToolsEl) {
    cmsMarkdownToolsEl.classList.toggle("hidden", !(hasEntry && isMarkdownEntry(entry)));
  }

  if (!cmsImagePreviewWrap || !cmsImagePreviewImage) return;

  if (!isImage || !hasValue) {
    cmsImagePreviewWrap.classList.add("hidden");
    cmsImagePreviewImage.removeAttribute("src");
    return;
  }

  const previewSource =
    entry?.key === HERO_PHOTO_CMS_KEY ? parseCmsImageList(value)[0] || "" : value;

  if (!previewSource) {
    cmsImagePreviewWrap.classList.add("hidden");
    cmsImagePreviewImage.removeAttribute("src");
    return;
  }

  cmsImagePreviewImage.src = previewSource;
  cmsImagePreviewWrap.classList.remove("hidden");
}

function mergeCmsEntries(defaultEntries, dbEntries) {
  const mergedMap = new Map(
    defaultEntries
      .filter((entry) => !CMS_HIDDEN_KEYS.has(String(entry.key || "")))
      .map((entry) => [
        entry.key,
        {
          key: entry.key,
          page: pageFromEntry(entry),
          label: entry.label,
          kind: entry.kind || "text",
          value: entry.value || "",
          updated_at: null,
          updated_by: null,
          exists_in_db: false
        }
      ])
  );

  dbEntries.forEach((entry) => {
    if (CMS_HIDDEN_KEYS.has(String(entry.key || ""))) {
      return;
    }

    const normalized = {
      key: entry.key,
      page: pageFromEntry(entry),
      label: entry.label || entry.key,
      kind: entry.kind || "text",
      value: entry.value || "",
      updated_at: entry.updated_at || null,
      updated_by: entry.updated_by || null,
      exists_in_db: true
    };

    if (mergedMap.has(entry.key)) {
      const fallback = mergedMap.get(entry.key);
      mergedMap.set(entry.key, {
        ...fallback,
        ...normalized
      });
    } else {
      mergedMap.set(entry.key, normalized);
    }
  });

  return [...mergedMap.values()].sort((a, b) => {
    const pageOrderDelta = pageSortValue(a.page) - pageSortValue(b.page);
    if (pageOrderDelta !== 0) return pageOrderDelta;
    return a.label.localeCompare(b.label);
  });
}

function applyCmsFilters(includeSearch = true) {
  const pageFilter = String(cmsPageFilterEl?.value || "home").toLowerCase();
  const groupFilter = String(cmsGroupFilterEl?.value || "all").toLowerCase();
  const query = String(cmsSearchEl?.value || "").trim().toLowerCase();
  const includeAllPages = !pageFilter || pageFilter === "all" || pageFilter === "all-pages";
  const includeAllGroups = !groupFilter || groupFilter === "all";

  return cmsCache.filter((entry) => {
    if (!includeAllPages && entry.page !== pageFilter) return false;
    if (!includeAllGroups && groupFromEntry(entry) !== groupFilter) return false;

    if (!includeSearch || !query) return true;

    const haystack = `${entry.key} ${entry.label} ${entry.value}`.toLowerCase();
    return haystack.includes(query);
  });
}

function renderCmsList() {
  if (!cmsListEl) return;

  const filtered = applyCmsFilters(true);
  const query = String(cmsSearchEl?.value || "").trim();
  if (!filtered.length) {
    cmsListEl.innerHTML = `<div class="post-row"><p class="meta">${query ? "No content blocks match your search for this page/section." : "No content blocks found for this page/section."}</p></div>`;
    return;
  }

  cmsListEl.innerHTML = filtered
    .map((entry) => {
      const preview = entry.value.length > 120 ? `${entry.value.slice(0, 120)}...` : entry.value;
      const section = groupLabel(groupFromEntry(entry));
      return `
        <div class="post-row">
          <p class="meta">${escapeHtml(pageLabel(entry.page))} | ${escapeHtml(section)} | ${entry.exists_in_db ? "Saved" : "Default"}</p>
          <h3>${escapeHtml(entry.label)}</h3>
          <p class="note">${escapeHtml(entry.key)}</p>
          <p class="meta">${escapeHtml(preview || "(empty)")}</p>
          <div class="post-row-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-cms-open="${escapeHtml(entry.key)}">Edit</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function updateCmsFilterOptions() {
  if (!cmsPageFilterEl) return;

  const pagesFromContent = [...new Set(cmsCache.map((entry) => pageFromEntry(entry)))];
  const orderedPages = [
    ...CMS_PAGE_ORDER.filter((page) => pagesFromContent.includes(page)),
    ...pagesFromContent.filter((page) => !CMS_PAGE_ORDER.includes(page)).sort()
  ];
  const current = String(cmsPageFilterEl.value || orderedPages[0] || "home");

  cmsPageFilterEl.innerHTML = orderedPages
    .map((page) => `<option value="${escapeHtml(page)}">${escapeHtml(pageLabel(page))}</option>`)
    .join("");

  cmsPageFilterEl.value = orderedPages.includes(current) ? current : orderedPages[0] || "home";
}

function updateCmsGroupOptions(preferredGroup = "") {
  if (!cmsGroupFilterEl) return;

  const pageFilter = String(cmsPageFilterEl?.value || "home").toLowerCase();
  const includeAllPages = !pageFilter || pageFilter === "all" || pageFilter === "all-pages";

  const groups = [...new Set(
    cmsCache
      .filter((entry) => includeAllPages || entry.page === pageFilter)
      .map((entry) => groupFromEntry(entry))
      .filter(Boolean)
  )].sort((a, b) => {
    const orderDelta = groupSortValue(a) - groupSortValue(b);
    if (orderDelta !== 0) return orderDelta;
    return a.localeCompare(b);
  });

  const current = String(preferredGroup || cmsGroupFilterEl.value || "all").toLowerCase();
  cmsGroupFilterEl.innerHTML = [
    '<option value="all">All sections</option>',
    ...groups.map(
      (group) => `<option value="${escapeHtml(group)}">${escapeHtml(groupLabel(group))}</option>`
    )
  ].join("");

  cmsGroupFilterEl.value = groups.includes(current) ? current : "all";
}

function updateCmsSelectOptions(preferredKey = "") {
  if (!cmsKeySelectEl) return;

  const filtered = applyCmsFilters(false);
  if (!filtered.length) {
    cmsKeySelectEl.innerHTML = '<option value="">No content blocks available</option>';
    return;
  }

  const firstKey = filtered[0]?.key || "";
  const selected = preferredKey || cmsKeySelectEl.value || firstKey;

  cmsKeySelectEl.innerHTML = filtered
    .map(
      (entry) =>
        `<option value="${escapeHtml(entry.key)}">${escapeHtml(entry.label)}</option>`
    )
    .join("");

  if (filtered.some((entry) => entry.key === selected)) {
    cmsKeySelectEl.value = selected;
  }
}

function fillCmsEditor(key = "") {
  const targetKey = key || String(cmsKeySelectEl?.value || "");
  const entry = cmsCache.find((item) => item.key === targetKey);

  if (!entry) {
    if (cmsLabelEl) cmsLabelEl.textContent = "Content Value";
    if (cmsMetaEl) cmsMetaEl.textContent = "No content block selected.";
    if (cmsValueEl) cmsValueEl.value = "";
    updateCmsValuePreview();
    return;
  }

  if (cmsKeySelectEl) cmsKeySelectEl.value = entry.key;

  if (cmsLabelEl) {
    cmsLabelEl.textContent = `${entry.label} (${entry.key})`;
  }

  if (cmsMetaEl) {
    const baseMeta = `Page: ${pageLabel(entry.page)} | Section: ${groupLabel(groupFromEntry(entry))} | Type: ${effectiveEntryKind(entry)} | Source: ${entry.exists_in_db ? "database" : "default template"} | Updated: ${formatDateTime(entry.updated_at) || "n/a"}`;
    const sliderHint =
      entry.key === HERO_PHOTO_CMS_KEY
        ? " | Slider format: one image URL per line. Upload Image appends to the list."
        : entry.key === HERO_CV_CMS_KEY
          ? " | CV upload replaces the previous file automatically."
        : "";
    cmsMetaEl.textContent = `${baseMeta}${sliderHint}`;
  }

  if (cmsValueEl) {
    cmsValueEl.value = entry.value || "";
  }

  updateCmsValuePreview();
}

function openCmsEntry(key) {
  const entry = cmsCache.find((item) => item.key === key);
  if (!entry) return;

  if (cmsPageFilterEl) {
    cmsPageFilterEl.value = entry.page;
  }

  updateCmsGroupOptions(groupFromEntry(entry));
  updateCmsSelectOptions(entry.key);
  renderCmsList();
  fillCmsEditor(entry.key);
}

function primeCmsContentWithDefaults() {
  cmsCache = mergeCmsEntries(SITE_CONTENT_DEFAULTS, []);
  updateCmsFilterOptions();
  updateCmsGroupOptions();
  updateCmsSelectOptions();
  renderCmsList();
  fillCmsEditor();
}

async function loadCmsContent() {
  let loadError = null;

  try {
    const { data, error } = await supabase
      .from("site_content")
      .select("key,page,label,kind,value,updated_at,updated_by")
      .order("page", { ascending: true })
      .order("key", { ascending: true });

    if (error) throw error;

    cmsDbCache = data || [];
  } catch (error) {
    loadError = error;
    cmsDbCache = [];
  }

  cmsCache = mergeCmsEntries(SITE_CONTENT_DEFAULTS, cmsDbCache);
  updateCmsFilterOptions();
  updateCmsGroupOptions();
  updateCmsSelectOptions();
  renderCmsList();
  fillCmsEditor();

  if (loadError) {
    setAlert(
      alertEl,
      "error",
      `${friendlyError(loadError, "Failed to load page content blocks from database.")} Showing default editable blocks. Run db/site_content_migration.sql in Supabase SQL Editor if needed.`
    );
    return false;
  }

  if (!cmsDbCache.length) {
    setAlert(
      alertEl,
      "info",
      "Showing built-in content blocks. Edit and save to create database rows for your page content."
    );
  }

  return true;
}

async function seedCmsDefaults() {
  try {
    setAlert(alertEl, "info", "Initializing default page content...");

    const payload = SITE_CONTENT_DEFAULTS.map((entry) => ({
      ...entry,
      updated_by: currentUser.id
    }));

    const { error } = await supabase
      .from("site_content")
      .upsert(payload, { onConflict: "key", ignoreDuplicates: true });

    if (error) throw error;

    await loadCmsContent();
    setAlert(alertEl, "success", "Default page content initialized.");
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Failed to initialize default content."));
  }
}

async function ensureCmsDefaultsInDatabase() {
  try {
    let beforeCount = null;
    let afterCount = null;

    const { count: beforeCountValue } = await supabase
      .from("site_content")
      .select("key", { count: "exact", head: true });

    if (typeof beforeCountValue === "number") {
      beforeCount = beforeCountValue;
    }

    const payload = SITE_CONTENT_DEFAULTS.map((entry) => ({
      ...entry,
      updated_by: currentUser.id
    }));

    const { error: seedError } = await supabase
      .from("site_content")
      .upsert(payload, { onConflict: "key", ignoreDuplicates: true });

    if (seedError) throw seedError;

    const { count: afterCountValue } = await supabase
      .from("site_content")
      .select("key", { count: "exact", head: true });

    if (typeof afterCountValue === "number") {
      afterCount = afterCountValue;
    }

    if (beforeCount === null || afterCount === null) {
      return false;
    }

    return afterCount > beforeCount;
  } catch (error) {
    setAlert(
      alertEl,
      "error",
      `${friendlyError(error, "Could not auto-initialize page content.")} You can still edit defaults locally and save once table access is fixed.`
    );
    return false;
  }
}

async function purgeLegacyCmsKeys() {
  if (!LEGACY_CMS_KEYS_TO_REMOVE.length) return;

  try {
    const { error } = await supabase
      .from("site_content")
      .delete()
      .in("key", LEGACY_CMS_KEYS_TO_REMOVE);

    if (error) throw error;
  } catch (error) {
    console.warn("Legacy CMS key cleanup skipped:", friendlyError(error, "unknown error"));
  }
}

async function saveCmsContent() {
  const entry = currentCmsEntry();
  if (!entry) {
    setAlert(alertEl, "error", "Choose a content block first.");
    return;
  }

  const nextValue = String(cmsValueEl?.value || "");

  try {
    setAlert(alertEl, "info", `Saving ${entry.label}...`);

    const { error } = await supabase
      .from("site_content")
      .upsert({
        key: entry.key,
        page: entry.page,
        label: entry.label,
        kind: effectiveEntryKind(entry),
        value: nextValue,
        updated_by: currentUser.id,
        updated_at: new Date().toISOString()
      }, { onConflict: "key", ignoreDuplicates: false });

    if (error) throw error;

    await loadCmsContent();
    fillCmsEditor(entry.key);
    setAlert(alertEl, "success", "Page content updated successfully.");
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Failed to save page content."));
  }
}

async function addFocusCard() {
  try {
    const focusPattern = /^home\.focus\.(\d+)\.(status|title|desc)$/;
    const indexes = cmsCache
      .map((entry) => {
        const match = String(entry?.key || "").match(focusPattern);
        return match ? Number(match[1]) : null;
      })
      .filter((value) => Number.isInteger(value));

    const nextIndex = (indexes.length ? Math.max(...indexes) : 0) + 1;
    const now = new Date().toISOString();
    const payload = [
      {
        key: `home.focus.${nextIndex}.status`,
        page: "home",
        label: `Focus ${nextIndex} Status`,
        kind: "text",
        value: "Active Program",
        updated_by: currentUser.id,
        updated_at: now
      },
      {
        key: `home.focus.${nextIndex}.title`,
        page: "home",
        label: `Focus ${nextIndex} Title`,
        kind: "text",
        value: `New Focus Title ${nextIndex}`,
        updated_by: currentUser.id,
        updated_at: now
      },
      {
        key: `home.focus.${nextIndex}.desc`,
        page: "home",
        label: `Focus ${nextIndex} Description`,
        kind: "text",
        value: "Add a short description for this focus area.",
        updated_by: currentUser.id,
        updated_at: now
      }
    ];

    setAlert(alertEl, "info", `Adding Focus ${nextIndex}...`);
    const { error } = await supabase
      .from("site_content")
      .upsert(payload, { onConflict: "key", ignoreDuplicates: false });

    if (error) throw error;

    await loadCmsContent();
    if (cmsPageFilterEl) cmsPageFilterEl.value = "home";
    updateCmsGroupOptions("focus");
    updateCmsSelectOptions(`home.focus.${nextIndex}.title`);
    renderCmsList();
    fillCmsEditor(`home.focus.${nextIndex}.title`);
    setAlert(alertEl, "success", `Focus ${nextIndex} added. Update title and description, then save.`);
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Could not add a new focus card."));
  }
}

function selectedFocusIndex() {
  const key = String(cmsKeySelectEl?.value || "");
  const match = key.match(/^home\.focus\.(\d+)\.(status|title|desc)$/);
  if (!match) return null;
  return Number(match[1]);
}

function selectedResearchPubIndex() {
  const key = String(cmsKeySelectEl?.value || "");
  const match = key.match(/^research\.pub\.(\d+)\.(meta|title|url)$/);
  if (!match) return null;
  return Number(match[1]);
}

function selectedCapabilityIndex() {
  const key = String(cmsKeySelectEl?.value || "");
  const match = key.match(/^home\.capability\.(\d+)\.(title|body)$/);
  if (!match) return null;
  return Number(match[1]);
}

async function deleteFocusCard() {
  try {
    const index = selectedFocusIndex();
    if (!Number.isInteger(index)) {
      setAlert(alertEl, "error", "Select a focus block (home.focus.N.title/desc/status) first.");
      return;
    }

    const confirmed = window.confirm(`Delete Focus ${index}? This removes status, title, and description.`);
    if (!confirmed) return;

    const keys = [
      `home.focus.${index}.status`,
      `home.focus.${index}.title`,
      `home.focus.${index}.desc`
    ];

    setAlert(alertEl, "info", `Deleting Focus ${index}...`);
    const { error } = await supabase
      .from("site_content")
      .delete()
      .in("key", keys);

    if (error) throw error;

    await loadCmsContent();
    if (cmsPageFilterEl) cmsPageFilterEl.value = "home";
    updateCmsGroupOptions("focus");
    updateCmsSelectOptions();
    renderCmsList();
    fillCmsEditor();
    setAlert(alertEl, "success", `Focus ${index} deleted.`);
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Could not delete focus card."));
  }
}

async function addResearchPublication() {
  try {
    const pubPattern = /^research\.pub\.(\d+)\.(meta|title|url)$/;
    const indexes = cmsCache
      .map((entry) => {
        const match = String(entry?.key || "").match(pubPattern);
        return match ? Number(match[1]) : null;
      })
      .filter((value) => Number.isInteger(value));

    const nextIndex = (indexes.length ? Math.max(...indexes) : 0) + 1;
    const now = new Date().toISOString();
    const payload = [
      {
        key: `research.pub.${nextIndex}.meta`,
        page: "research",
        label: `Publication ${nextIndex} Meta`,
        kind: "text",
        value: "2026 | Conference",
        updated_by: currentUser.id,
        updated_at: now
      },
      {
        key: `research.pub.${nextIndex}.title`,
        page: "research",
        label: `Publication ${nextIndex} Title`,
        kind: "text",
        value: `New Publication ${nextIndex} Title`,
        updated_by: currentUser.id,
        updated_at: now
      },
      {
        key: `research.pub.${nextIndex}.url`,
        page: "research",
        label: `Publication ${nextIndex} URL`,
        kind: "text",
        value: "https://doi.org/",
        updated_by: currentUser.id,
        updated_at: now
      }
    ];

    setAlert(alertEl, "info", `Adding Publication ${nextIndex}...`);
    const { error } = await supabase
      .from("site_content")
      .upsert(payload, { onConflict: "key", ignoreDuplicates: false });

    if (error) throw error;

    await loadCmsContent();
    if (cmsPageFilterEl) cmsPageFilterEl.value = "research";
    updateCmsGroupOptions("pub");
    updateCmsSelectOptions(`research.pub.${nextIndex}.title`);
    renderCmsList();
    fillCmsEditor(`research.pub.${nextIndex}.title`);
    setAlert(alertEl, "success", `Publication ${nextIndex} added. Update meta/title and save.`);
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Could not add research publication."));
  }
}

async function deleteResearchPublication() {
  try {
    const index = selectedResearchPubIndex();
    if (!Number.isInteger(index)) {
      setAlert(alertEl, "error", "Select a research publication block (research.pub.N.meta/title/url) first.");
      return;
    }

    const confirmed = window.confirm(`Delete Publication ${index}? This removes meta and title.`);
    if (!confirmed) return;

    const keys = [
      `research.pub.${index}.meta`,
      `research.pub.${index}.title`,
      `research.pub.${index}.url`
    ];

    setAlert(alertEl, "info", `Deleting Publication ${index}...`);
    const { error } = await supabase
      .from("site_content")
      .delete()
      .in("key", keys);

    if (error) throw error;

    await loadCmsContent();
    if (cmsPageFilterEl) cmsPageFilterEl.value = "research";
    updateCmsGroupOptions("pub");
    updateCmsSelectOptions();
    renderCmsList();
    fillCmsEditor();
    setAlert(alertEl, "success", `Publication ${index} deleted.`);
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Could not delete research publication."));
  }
}

async function addCapability() {
  try {
    const pattern = /^home\.capability\.(\d+)\.(title|body)$/;
    const indexes = cmsCache
      .map((entry) => {
        const match = String(entry?.key || "").match(pattern);
        return match ? Number(match[1]) : null;
      })
      .filter((value) => Number.isInteger(value));

    const nextIndex = (indexes.length ? Math.max(...indexes) : 0) + 1;
    const now = new Date().toISOString();
    const payload = [
      {
        key: `home.capability.${nextIndex}.title`,
        page: "home",
        label: `Capability ${nextIndex} Title`,
        kind: "text",
        value: `Capability ${nextIndex} Title`,
        updated_by: currentUser.id,
        updated_at: now
      },
      {
        key: `home.capability.${nextIndex}.body`,
        page: "home",
        label: `Capability ${nextIndex} Body`,
        kind: "text",
        value: "Describe this capability in one concise sentence.",
        updated_by: currentUser.id,
        updated_at: now
      }
    ];

    setAlert(alertEl, "info", `Adding Capability ${nextIndex}...`);
    const { error } = await supabase
      .from("site_content")
      .upsert(payload, { onConflict: "key", ignoreDuplicates: false });

    if (error) throw error;

    await loadCmsContent();
    if (cmsPageFilterEl) cmsPageFilterEl.value = "home";
    updateCmsGroupOptions("capability");
    updateCmsSelectOptions(`home.capability.${nextIndex}.title`);
    renderCmsList();
    fillCmsEditor(`home.capability.${nextIndex}.title`);
    setAlert(alertEl, "success", `Capability ${nextIndex} added.`);
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Could not add capability."));
  }
}

async function deleteCapability() {
  try {
    const index = selectedCapabilityIndex();
    if (!Number.isInteger(index)) {
      setAlert(alertEl, "error", "Select a capability block (home.capability.N.title/body) first.");
      return;
    }

    const confirmed = window.confirm(`Delete Capability ${index}? This removes title and description.`);
    if (!confirmed) return;

    const keys = [
      `home.capability.${index}.title`,
      `home.capability.${index}.body`
    ];

    setAlert(alertEl, "info", `Deleting Capability ${index}...`);
    const { error } = await supabase
      .from("site_content")
      .delete()
      .in("key", keys);

    if (error) throw error;

    await loadCmsContent();
    if (cmsPageFilterEl) cmsPageFilterEl.value = "home";
    updateCmsGroupOptions("capability");
    updateCmsSelectOptions();
    renderCmsList();
    fillCmsEditor();
    setAlert(alertEl, "success", `Capability ${index} deleted.`);
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Could not delete capability."));
  }
}

async function uploadCmsAssetForCurrentBlock() {
  const entry = currentCmsEntry();
  if (!entry) {
    setAlert(alertEl, "error", "Choose a content block before uploading an image.");
    return;
  }

  const file = cmsAssetFileInput?.files?.[0];
  if (!file) {
    setAlert(alertEl, "error", "Choose an image file first.");
    return;
  }

  try {
    const isCv = entry.key === HERO_CV_CMS_KEY;
    setAlert(alertEl, "info", isCv ? "Uploading CV..." : "Uploading content image...");
    let publicUrl = "";

    if (isCv) {
      const fileName = String(file.name || "").toLowerCase();
      const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
      if (!isPdf) {
        throw new Error("Please upload a PDF file for CV.");
      }

      publicUrl = await uploadFileToPath(
        file,
        `documents/${currentUser.id}/hero-cv.pdf`,
        { upsert: true, contentType: "application/pdf" }
      );
    } else {
      publicUrl = await uploadImageFile(file, currentUser.id, "site-content");
    }

    if (cmsValueEl) {
      if (entry.key === HERO_PHOTO_CMS_KEY) {
        const existing = parseCmsImageList(cmsValueEl.value);
        if (!existing.includes(publicUrl)) {
          existing.push(publicUrl);
        }
        cmsValueEl.value = existing.join("\n");
      } else {
        cmsValueEl.value = publicUrl;
      }
    }

    updateCmsValuePreview();
    await saveCmsContent();
    if (cmsAssetFileInput) {
      cmsAssetFileInput.value = "";
    }
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Image upload failed."));
  }
}

function openCurrentCmsValueAsLink() {
  const value = normalizeLinkValue(cmsValueEl?.value || "");
  if (!looksLikeLinkValue(value)) {
    setAlert(alertEl, "error", "Current value does not look like a valid URL.");
    return;
  }

  window.open(value, "_blank", "noopener,noreferrer");
}

function replaceSelection(prefix, suffix = "", placeholder = "") {
  if (!cmsValueEl) return;
  const start = cmsValueEl.selectionStart ?? 0;
  const end = cmsValueEl.selectionEnd ?? 0;
  const value = cmsValueEl.value || "";
  const selected = value.slice(start, end) || placeholder;
  const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
  cmsValueEl.value = next;
  const cursor = start + prefix.length + selected.length + suffix.length;
  cmsValueEl.focus();
  cmsValueEl.selectionStart = cmsValueEl.selectionEnd = cursor;
  updateCmsValuePreview();
}

function prefixCurrentLine(prefix) {
  if (!cmsValueEl) return;
  const start = cmsValueEl.selectionStart ?? 0;
  const value = cmsValueEl.value || "";
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
  cmsValueEl.value = next;
  const cursor = start + prefix.length;
  cmsValueEl.focus();
  cmsValueEl.selectionStart = cmsValueEl.selectionEnd = cursor;
  updateCmsValuePreview();
}

function applyMarkdownAction(action) {
  switch (action) {
    case "heading":
      prefixCurrentLine("## ");
      break;
    case "bold":
      replaceSelection("**", "**", "Bold text");
      break;
    case "italic":
      replaceSelection("*", "*", "Italic text");
      break;
    case "bullet":
      prefixCurrentLine("- ");
      break;
    case "number":
      prefixCurrentLine("1. ");
      break;
    case "link":
      replaceSelection("[", "](https://)", "Link text");
      break;
    case "quote":
      prefixCurrentLine("> ");
      break;
    case "divider":
      replaceSelection("\n---\n");
      break;
    default:
      break;
  }
}

function setManagerView(manager) {
  const next = manager === "content" || manager === "past" ? manager : "posts";
  activeManager = next;

  const showPosts = next === "posts";
  const showContent = next === "content";
  const showPast = next === "past";
  managerPostsPanel?.classList.toggle("hidden", !showPosts);
  managerContentPanel?.classList.toggle("hidden", !showContent);
  managerPastPanel?.classList.toggle("hidden", !showPast);

  managerTabs.forEach((tab) => {
    const isActive = tab.dataset.managerTab === next;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  const nextHash = `#${next}`;
  if (window.location.hash !== nextHash) {
    history.replaceState(null, "", nextHash);
  }
}

function bindManagerTabs() {
  if (!managerTabs.length) return;

  managerTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.managerTab || "posts";
      setManagerView(target);
    });
  });

  const initialFromHash = window.location.hash.replace("#", "").toLowerCase();
  setManagerView(
    initialFromHash === "content" || initialFromHash === "past" ? initialFromHash : "posts"
  );
}

async function logout() {
  try {
    await supabase.auth.signOut();
  } finally {
    window.location.href = "admin-login.html";
  }
}

postsListEl?.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-action][data-id]");
  if (!target) return;

  const action = target.dataset.action;
  const postId = target.dataset.id;

  if (!postId) return;

  if (action === "edit") {
    const post = postCache.find((item) => item.id === postId);
    if (!post) return;
    fillForm(post);
    setAlert(alertEl, "info", `Editing "${post.title}".`);
    return;
  }

  if (action === "delete") {
    void handleDelete(postId);
    return;
  }

  if (action === "toggle") {
    void handleToggle(postId);
  }
});

pastPostsListEl?.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-action][data-id]");
  if (!target) return;

  const action = target.dataset.action;
  const postId = target.dataset.id;
  if (!postId) return;

  const post = postCache.find((item) => item.id === postId);
  if (!post) return;

  if (action === "edit") {
    fillForm(post);
    setManagerView("posts");
    setAlert(alertEl, "info", `Editing "${post.title}".`);
    return;
  }

  if (action === "delete") {
    void handleDelete(postId);
    return;
  }

  if (action === "toggle") {
    void handleToggle(postId);
  }

});

cmsListEl?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-cms-open]");
  if (!button) return;

  const key = button.dataset.cmsOpen;
  if (!key) return;

  openCmsEntry(key);
});

postForm?.addEventListener("submit", savePost);
newPostBtn?.addEventListener("click", () => {
  resetForm();
  setAlert(alertEl, "info", "Ready for a new post.");
});

slugifyBtn?.addEventListener("click", () => {
  slugInput.value = slugify(titleInput.value);
});

titleInput?.addEventListener("blur", () => {
  if (!slugInput.value.trim()) {
    slugInput.value = slugify(titleInput.value);
  }
});
titleInput?.addEventListener("input", renderPostPreview);
excerptInput?.addEventListener("input", renderPostPreview);
tagsInput?.addEventListener("input", renderPostPreview);
postDateInput?.addEventListener("change", renderPostPreview);

coverUrlInput?.addEventListener("input", updateCoverPreview);
coverUrlListEl?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-cover-action][data-cover-index]");
  if (!button) return;

  const action = String(button.dataset.coverAction || "");
  const index = Number(button.dataset.coverIndex || -1);
  if (action !== "remove" || index < 0) return;

  const urls = parseCoverUrls(coverUrlInput?.value || "");
  if (index >= urls.length) return;
  urls.splice(index, 1);
  setCoverUrls(urls);
});

coverUrlListEl?.addEventListener("dragstart", (event) => {
  const item = event.target.closest(".cover-url-item[data-cover-index]");
  if (!item) return;
  const index = String(item.dataset.coverIndex || "");
  event.dataTransfer?.setData("text/plain", index);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
  item.classList.add("dragging");
});

coverUrlListEl?.addEventListener("dragend", (event) => {
  const item = event.target.closest(".cover-url-item");
  item?.classList.remove("dragging");
});

coverUrlListEl?.addEventListener("dragover", (event) => {
  const item = event.target.closest(".cover-url-item[data-cover-index]");
  if (!item) return;
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
});

coverUrlListEl?.addEventListener("drop", (event) => {
  const targetItem = event.target.closest(".cover-url-item[data-cover-index]");
  if (!targetItem) return;
  event.preventDefault();
  const fromIndex = Number(event.dataTransfer?.getData("text/plain") || -1);
  const toIndex = Number(targetItem.dataset.coverIndex || -1);
  if (fromIndex < 0 || toIndex < 0) return;
  moveCoverUrl(fromIndex, toIndex);
});
uploadCoverBtn?.addEventListener("click", () => {
  void uploadCover();
});
uploadInlineBtn?.addEventListener("click", () => {
  void uploadInline();
});
logoutBtn?.addEventListener("click", () => {
  void logout();
});

cmsPageFilterEl?.addEventListener("change", () => {
  updateCmsGroupOptions();
  updateCmsSelectOptions();
  renderCmsList();
  fillCmsEditor();
});

cmsGroupFilterEl?.addEventListener("change", () => {
  updateCmsSelectOptions();
  renderCmsList();
  fillCmsEditor();
});

cmsSearchEl?.addEventListener("input", () => {
  renderCmsList();
});

cmsKeySelectEl?.addEventListener("change", () => {
  fillCmsEditor();
});

cmsValueEl?.addEventListener("input", () => {
  updateCmsValuePreview();
});

postFormatToolbarEl?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-post-md]");
  if (!button) return;
  const action = String(button.dataset.postMd || "");
  if (!action) return;
  applyPostMarkdown(action);
});

contentInput?.addEventListener("input", () => {
  renderPostPreview();
});

generateExcerptBtn?.addEventListener("click", () => {
  generateShortExcerpt();
});
generateTagsBtn?.addEventListener("click", () => {
  generateAutoTags();
});

cmsResetBtn?.addEventListener("click", () => {
  fillCmsEditor();
});

cmsSaveBtn?.addEventListener("click", () => {
  void saveCmsContent();
});

cmsAddFocusBtn?.addEventListener("click", () => {
  void addFocusCard();
});

cmsDeleteFocusBtn?.addEventListener("click", () => {
  void deleteFocusCard();
});

cmsAddCapabilityBtn?.addEventListener("click", () => {
  void addCapability();
});

cmsDeleteCapabilityBtn?.addEventListener("click", () => {
  void deleteCapability();
});

cmsAddResearchPubBtn?.addEventListener("click", () => {
  void addResearchPublication();
});

cmsDeleteResearchPubBtn?.addEventListener("click", () => {
  void deleteResearchPublication();
});

cmsSeedBtn?.addEventListener("click", () => {
  void seedCmsDefaults();
});

cmsUploadAssetBtn?.addEventListener("click", () => {
  void uploadCmsAssetForCurrentBlock();
});

cmsOpenLinkBtn?.addEventListener("click", () => {
  openCurrentCmsValueAsLink();
});

cmsMarkdownToolsEl?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-md-action]");
  if (!button) return;
  const action = String(button.dataset.mdAction || "");
  if (!action) return;
  applyMarkdownAction(action);
});

async function init() {
  if (!isConfigured) {
    setAlert(alertEl, "error", "Supabase config missing. Edit js/config.js to continue.");
    const controls = document.querySelectorAll("input, textarea, button, select");
    controls.forEach((el) => {
      el.disabled = true;
    });
    return;
  }

  try {
    supabase = requireSupabase();
    const { session, isAdmin } = await requireAdminSession(true);

    if (!session?.user || !isAdmin) {
      return;
    }

    currentUser = session.user;
    if (userEl) {
      userEl.textContent = `Signed in as ${session.user.email}`;
    }

    await purgeLegacyCmsKeys();

    setAlert(alertEl, "info", "Loading posts and page content...");
    primeCmsContentWithDefaults();
    const autoSeeded = await ensureCmsDefaultsInDatabase();

    const [postsResult, cmsResult] = await Promise.allSettled([
      loadPosts(),
      loadCmsContent()
    ]);

    updateCoverPreview();
    renderPostPreview();

    const postsLoaded = postsResult.status === "fulfilled";
    const cmsLoaded = cmsResult.status === "fulfilled" && cmsResult.value === true;

    if (cmsLoaded && postsLoaded) {
      setAlert(
        alertEl,
        "success",
        `Dashboard ready. ${postCache.length} post${postCache.length === 1 ? "" : "s"} and ${cmsCache.length} content block${cmsCache.length === 1 ? "" : "s"} loaded.${autoSeeded ? " Defaults were auto-initialized in database." : ""}`
      );
    } else if (cmsLoaded && !postsLoaded) {
      setAlert(
        alertEl,
        "error",
        `Page content manager loaded, but posts failed to load. ${friendlyError(postsResult.reason, "Check post permissions and schema.")}`
      );
    } else {
      setAlert(
        alertEl,
        "error",
        "Posts loaded, but page content manager is unavailable. Run db/site_content_migration.sql in Supabase SQL Editor and hard-refresh this page."
      );
    }
  } catch (error) {
    setAlert(alertEl, "error", friendlyError(error, "Could not initialize dashboard."));
  }
}

bindManagerTabs();
void init();
