function parsePhotoList(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return [];

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch {
      // Fall through to delimiter parsing.
    }
  }

  return raw
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

const imageEl = document.getElementById("hero-home-photo");
const sourceEl = document.getElementById("hero-home-photo-source");
const controlsEl = document.getElementById("hero-home-photo-controls");
const dotsEl = document.getElementById("hero-home-photo-dots");
const prevBtn = document.getElementById("hero-home-photo-prev");
const nextBtn = document.getElementById("hero-home-photo-next");

const AUTOPLAY_MS = 3500;

if (!imageEl || !sourceEl) {
  // Not on this page.
} else {
  const photoWrapEl = imageEl.parentElement;
  const viewportEl = document.createElement("div");
  viewportEl.className = "hero-home-photo-viewport";

  const trackEl = document.createElement("div");
  trackEl.className = "hero-home-photo-track";
  viewportEl.appendChild(trackEl);

  photoWrapEl?.insertBefore(viewportEl, imageEl);
  imageEl.remove();

  let photos = [];
  let currentIndex = 0;
  let autoplayTimer = null;
  let isPaused = false;
  let isTransitioning = false;

  function buildSlides() {
    const isLoop = photos.length > 1;
    const renderList = isLoop
      ? [photos[photos.length - 1], ...photos, photos[0]]
      : [...photos];

    trackEl.innerHTML = renderList
      .map(
        (src, index) =>
          `<div class="hero-home-photo-slide" data-slide-index="${index}">
            <img class="hero-home-photo" src="${src}" alt="Profile photo of Md Nazmul Islam" loading="lazy" />
          </div>`
      )
      .join("");
  }

  function trackPositionFromIndex(index) {
    return photos.length > 1 ? index + 1 : index;
  }

  function applyTransform(position, animate = true) {
    trackEl.style.transition = animate ? "transform 520ms ease" : "none";
    trackEl.style.transform = `translateX(-${position * 100}%)`;
  }

  function renderDots() {
    if (!dotsEl) return;

    if (photos.length <= 1) {
      dotsEl.classList.add("hidden");
      dotsEl.innerHTML = "";
      return;
    }

    dotsEl.classList.remove("hidden");
    dotsEl.innerHTML = photos
      .map(
        (_, index) =>
          `<button type="button" class="hero-home-photo-dot ${index === currentIndex ? "active" : ""}" data-photo-index="${index}" aria-label="Go to photo ${index + 1}"></button>`
      )
      .join("");
  }

  function normalizeAfterEdge(index) {
    if (photos.length <= 1) return index;
    if (index < 0) return photos.length - 1;
    if (index >= photos.length) return 0;
    return index;
  }

  function goTo(index, animate = true) {
    if (!photos.length || isTransitioning) return;

    if (photos.length === 1) {
      currentIndex = 0;
      renderDots();
      return;
    }

    isTransitioning = animate;
    const rawIndex = index;
    const targetPosition = trackPositionFromIndex(rawIndex);
    applyTransform(targetPosition, animate);

    if (!animate) {
      currentIndex = normalizeAfterEdge(rawIndex);
      renderDots();
      return;
    }

    currentIndex = normalizeAfterEdge(rawIndex);
    renderDots();

    window.setTimeout(() => {
      if (rawIndex < 0) {
        applyTransform(trackPositionFromIndex(photos.length - 1), false);
      } else if (rawIndex >= photos.length) {
        applyTransform(trackPositionFromIndex(0), false);
      }
      isTransitioning = false;
    }, 530);
  }

  function restartAutoplay() {
    if (autoplayTimer) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }

    if (photos.length <= 1 || isPaused) return;

    autoplayTimer = window.setInterval(() => {
      goTo(currentIndex + 1, true);
    }, AUTOPLAY_MS);
  }

  function setupSlider() {
    const parsed = parsePhotoList(sourceEl.textContent || sourceEl.innerText);
    photos = [...new Set(parsed.filter(Boolean))];

    if (!photos.length) {
      photos = ["assets/profile-placeholder.svg"];
    }

    currentIndex = 0;
    isTransitioning = false;

    buildSlides();
    applyTransform(trackPositionFromIndex(currentIndex), false);

    controlsEl?.classList.toggle("hidden", photos.length <= 1);
    renderDots();
    restartAutoplay();
  }

  prevBtn?.addEventListener("click", () => {
    goTo(currentIndex - 1, true);
    restartAutoplay();
  });

  nextBtn?.addEventListener("click", () => {
    goTo(currentIndex + 1, true);
    restartAutoplay();
  });

  dotsEl?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-photo-index]");
    if (!button) return;
    const index = Number(button.dataset.photoIndex);
    if (Number.isNaN(index)) return;
    goTo(index, true);
    restartAutoplay();
  });

  photoWrapEl?.addEventListener("mouseenter", () => {
    isPaused = true;
    restartAutoplay();
  });

  photoWrapEl?.addEventListener("mouseleave", () => {
    isPaused = false;
    restartAutoplay();
  });

  const observer = new MutationObserver(() => {
    setupSlider();
  });
  observer.observe(sourceEl, { childList: true, subtree: true, characterData: true });

  setupSlider();
}
