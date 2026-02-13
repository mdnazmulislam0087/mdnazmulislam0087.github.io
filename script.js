(() => {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".menu");
  const navLinks = [...document.querySelectorAll(".menu a")];

  if (toggle && menu) {
    const closeMenu = () => {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      menu.classList.toggle("open");
    });

    document.addEventListener("click", (event) => {
      if (!menu.classList.contains("open")) return;
      if (menu.contains(event.target) || toggle.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }

  const path = window.location.pathname.split("/").pop() || "index.html";
  const pageOverride = document.body?.dataset?.page;
  const currentPage = pageOverride || path;

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    const matches =
      href === currentPage ||
      (currentPage === "post.html" && href === "blog.html") ||
      (currentPage.startsWith("admin-") && href === "admin-login.html");

    link.classList.toggle("active", matches);
  });

  const revealItems = document.querySelectorAll(".reveal");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealItems.forEach((item) => item.classList.add("visible"));
  } else if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("visible"));
  }

  const yearEl = document.querySelector("#current-year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();