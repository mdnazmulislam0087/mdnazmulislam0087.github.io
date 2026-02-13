import {
  friendlyError,
  formatDate,
  isConfigured,
  readTimeFromMarkdown,
  requireSupabase
} from "./supabase-client.js";

const latestContainer = document.getElementById("latest-posts");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fallbackCards(message) {
  return `
    <article class="card">
      <h3>Blog feed unavailable</h3>
      <p>${escapeHtml(message)}</p>
      <a class="card-link" href="blog.html">Open blog page</a>
    </article>
  `;
}

function shortenText(value, max = 210) {
  const raw = String(value || "").trim();
  if (!raw) return "No excerpt available yet.";
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1).trimEnd()}...`;
}

function buildSlide(post, index) {
  return `
    <article class="home-blog-slide card" data-slide-index="${index}">
      <div class="home-blog-slide-copy">
        <p class="meta">${escapeHtml(formatDate(post.published_at || post.created_at))} | ${escapeHtml(readTimeFromMarkdown(post.content_md || ""))}</p>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(shortenText(post.excerpt || post.content_md, 180))}</p>
        <a class="card-link" href="post.html?slug=${encodeURIComponent(post.slug)}">Read post</a>
      </div>
    </article>
  `;
}

function initLatestCarousel() {
  const carousel = latestContainer?.querySelector("[data-home-blog-carousel]");
  if (!carousel) return;

  const track = carousel.querySelector(".home-blog-track");
  const slides = [...carousel.querySelectorAll(".home-blog-slide")];
  const dots = [...carousel.querySelectorAll("[data-home-blog-dot]")];
  const prevBtn = carousel.querySelector("[data-home-blog-prev]");
  const nextBtn = carousel.querySelector("[data-home-blog-next]");

  if (!track || slides.length <= 1) return;

  let index = 0;
  let timerId;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const render = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === index);
      dot.setAttribute("aria-selected", String(dotIndex === index));
    });
  };

  const goTo = (nextIndex) => {
    index = (nextIndex + slides.length) % slides.length;
    render();
  };

  const restartAuto = () => {
    if (prefersReducedMotion) return;
    if (timerId) {
      clearInterval(timerId);
    }
    timerId = setInterval(() => {
      goTo(index + 1);
    }, 5200);
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
      const nextIndex = Number(dot.getAttribute("data-home-blog-dot") || 0);
      goTo(nextIndex);
      restartAuto();
    });
  });

  carousel.addEventListener("mouseenter", () => {
    if (timerId) {
      clearInterval(timerId);
    }
  });

  carousel.addEventListener("mouseleave", () => {
    restartAuto();
  });

  render();
  restartAuto();
}

async function loadLatestPosts() {
  if (!latestContainer) return;

  if (!isConfigured) {
    latestContainer.innerHTML = fallbackCards(
      "Connect Supabase in js/config.js to display your dynamic latest posts."
    );
    return;
  }

  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("posts")
      .select("title,slug,excerpt,published_at,created_at,content_md")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    if (!data?.length) {
      latestContainer.innerHTML = fallbackCards(
        "No published posts yet. Publish from your Admin dashboard."
      );
      return;
    }

    const slides = data.map((post, index) => buildSlide(post, index)).join("");
    const dots = data
      .map(
        (_, index) =>
          `<button type="button" data-home-blog-dot="${index}" class="${index === 0 ? "active" : ""}" aria-label="Show post ${index + 1}" aria-selected="${index === 0 ? "true" : "false"}"></button>`
      )
      .join("");

    latestContainer.innerHTML = `
      <div class="home-blog-carousel" data-home-blog-carousel>
        <div class="home-blog-track">${slides}</div>
        <div class="home-blog-controls">
          <button type="button" class="btn btn-ghost btn-sm" data-home-blog-prev aria-label="Previous post">Previous</button>
          <button type="button" class="btn btn-ghost btn-sm" data-home-blog-next aria-label="Next post">Next</button>
        </div>
        <div class="home-blog-dots" role="tablist" aria-label="Latest blog slides">${dots}</div>
      </div>
    `;

    initLatestCarousel();
  } catch (error) {
    latestContainer.innerHTML = fallbackCards(
      friendlyError(error, "Unable to load latest posts.")
    );
  }
}

void loadLatestPosts();


