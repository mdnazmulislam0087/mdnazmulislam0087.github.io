import {
  formatDate,
  friendlyError,
  isConfigured,
  markdownToSafeHtml,
  readTimeFromMarkdown,
  requireSupabase
} from "./supabase-client.js";

const container = document.getElementById("post-container");
const DEFAULT_OG_IMAGE = "https://mdnazmulislam0087.github.io/assets/og-cover.svg";
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

function getCleanDescription(post) {
  const excerpt = String(post.excerpt || "").trim();
  if (excerpt) return excerpt;

  const plain = String(post.content_md || "")
    .replace(/[\[\]#*_>`~()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return plain.slice(0, 165);
}

function setMetaById(id, value) {
  if (!value) return;
  const el = document.getElementById(id);
  if (el) {
    el.setAttribute("content", value);
  }
}

function applyPostSeo(post) {
  const title = `${post.title} | Nazmul Blog`;
  const description = getCleanDescription(post);
  const canonicalUrl = window.location.href;
  const coverUrls = parseCoverUrls(post.cover_image_url);
  const imageUrl = coverUrls[0] || DEFAULT_OG_IMAGE;

  document.title = title;

  const canonicalEl = document.getElementById("canonical-link");
  if (canonicalEl) {
    canonicalEl.setAttribute("href", canonicalUrl);
  }

  setMetaById("meta-description", description);
  setMetaById("meta-og-title", title);
  setMetaById("meta-og-description", description);
  setMetaById("meta-og-url", canonicalUrl);
  setMetaById("meta-og-image", imageUrl);
  setMetaById("meta-og-image-alt", `${post.title} cover image`);
  setMetaById("meta-twitter-title", title);
  setMetaById("meta-twitter-description", description);
  setMetaById("meta-twitter-image", imageUrl);

  const postSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    image: coverUrls.length ? coverUrls : [imageUrl],
    datePublished: post.published_at || post.created_at,
    dateModified: post.published_at || post.created_at,
    author: {
      "@type": "Person",
      name: "Md Nazmul Islam"
    },
    publisher: {
      "@type": "Person",
      name: "Md Nazmul Islam"
    },
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
    keywords: visibleTags(post.tags).join(",")
  };

  let scriptEl = document.getElementById("post-schema-json");
  if (!scriptEl) {
    scriptEl = document.createElement("script");
    scriptEl.type = "application/ld+json";
    scriptEl.id = "post-schema-json";
    document.head.appendChild(scriptEl);
  }

  scriptEl.textContent = JSON.stringify(postSchema);
}

function buildCoverHtml(post) {
  const coverUrls = parseCoverUrls(post.cover_image_url);
  if (!coverUrls.length) return "";

  if (coverUrls.length === 1) {
    return `<div class="image-frame" style="margin-bottom: 1rem;"><img src="${escapeHtml(coverUrls[0])}" alt="${escapeHtml(post.title)} cover image" /></div>`;
  }

  const slides = coverUrls
    .map(
      (url, index) =>
        `<div class="post-cover-slide"><img src="${escapeHtml(url)}" alt="${escapeHtml(post.title)} cover image ${index + 1}" loading="${index === 0 ? "eager" : "lazy"}" /></div>`
    )
    .join("");

  const dots = coverUrls
    .map(
      (_, index) =>
        `<button type="button" class="${index === 0 ? "active" : ""}" data-cover-dot="${index}" aria-label="Go to cover ${index + 1}"></button>`
    )
    .join("");

  return `
    <div class="post-cover-slider" data-post-cover-slider>
      <div class="post-cover-track">${slides}</div>
      <div class="post-cover-nav">
        <button type="button" data-cover-prev aria-label="Previous cover">‹</button>
        <button type="button" data-cover-next aria-label="Next cover">›</button>
      </div>
      <div class="post-cover-dots">${dots}</div>
    </div>
  `;
}

function initCoverSlider() {
  const slider = container?.querySelector("[data-post-cover-slider]");
  if (!slider) return;

  const track = slider.querySelector(".post-cover-track");
  const slides = [...slider.querySelectorAll(".post-cover-slide")];
  const dots = [...slider.querySelectorAll("[data-cover-dot]")];
  const prevBtn = slider.querySelector("[data-cover-prev]");
  const nextBtn = slider.querySelector("[data-cover-next]");
  if (!track || slides.length <= 1) return;

  let index = 0;
  let intervalId;

  const render = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === index);
    });
  };

  const goTo = (nextIndex) => {
    index = (nextIndex + slides.length) % slides.length;
    render();
  };

  const restartAuto = () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => goTo(index + 1), 4500);
  };

  prevBtn?.addEventListener("click", () => {
    goTo(index - 1);
    restartAuto();
  });

  nextBtn?.addEventListener("click", () => {
    goTo(index + 1);
    restartAuto();
  });

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      goTo(Number(dot.getAttribute("data-cover-dot") || 0));
      restartAuto();
    });
  });

  render();
  restartAuto();
}

function renderMessage(title, text) {
  if (!container) return;
  container.innerHTML = `
    <div class="post-empty">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(text)}</p>
      <a class="btn btn-ghost" href="blog.html">Back to blog</a>
    </div>
  `;
}

async function loadPost() {
  const slug = new URLSearchParams(window.location.search).get("slug");

  if (!slug) {
    renderMessage("Missing post", "No post slug was provided in the URL.");
    return;
  }

  if (!isConfigured) {
    renderMessage(
      "Configuration required",
      "Supabase config is missing. Update js/config.js first."
    );
    return;
  }

  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("posts")
      .select("title,slug,excerpt,content_md,cover_image_url,tags,published_at,created_at")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      renderMessage("Post not found", "This post does not exist or is not published.");
      return;
    }

    const postDate = formatDate(data.published_at || data.created_at);
    const readTime = readTimeFromMarkdown(data.content_md || "");
    const tags = visibleTags(data.tags);
    const cover = buildCoverHtml(data);

    const contentHtml = markdownToSafeHtml(data.content_md || "");

    if (container) {
      container.innerHTML = `
        <header class="post-header">
          <p class="meta">${escapeHtml(postDate)} | ${escapeHtml(readTime)}</p>
          <h1>${escapeHtml(data.title)}</h1>
          <p class="lead">${escapeHtml(data.excerpt || "")}</p>
          <div class="tag-list">${tags
            .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
            .join("")}</div>
        </header>
        ${cover}
        <section class="post-content">${contentHtml}</section>
        <div style="margin-top: 1rem;">
          <a class="btn btn-ghost" href="blog.html">Back to Blog</a>
        </div>
      `;
    }

    applyPostSeo(data);
    initCoverSlider();
  } catch (error) {
    renderMessage("Could not load post", friendlyError(error, "Please try again later."));
  }
}

void loadPost();
