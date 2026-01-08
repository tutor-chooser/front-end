document.addEventListener("DOMContentLoaded", function () {
  const API_URL = "https://tc-staging-vector-search.tutorchooser.workers.dev/pro?limit=30";

  // DOM
  const marqueeContainer = document.querySelector(".marquee-container");
  const content          = document.querySelector(".marquee-content");
  const template         = document.querySelector(".pro-carousel-template");
  const scrollLeftBtn    = document.getElementById("scroll-left-btn");
  const scrollRightBtn   = document.getElementById("scroll-right-btn");

  if (!content || !template || !marqueeContainer || !scrollLeftBtn || !scrollRightBtn) {
    console.error("Carousel elements not found!");
    return;
  }

  // State
  let autoScrollInterval;
  let isAutoScrolling   = true;
  let totalContentWidth = 0;            // width of the ORIGINAL set only
  const CARD_W          = 320;          // card width
  const CARD_GAP        = 32;           // 2rem horizontal margin total (1rem each side)
  const cardScrollWidth = CARD_W + CARD_GAP;

  // ---------- Auto-scroll ----------
  function startAutoScroll() {
    // show arrows but they’re managed by JS
    scrollLeftBtn.style.display  = "flex";
    scrollRightBtn.style.display = "flex";

    autoScrollInterval = setInterval(() => {
      marqueeContainer.scrollLeft += 1;
      // Snap back when we’ve scrolled past the original content width
      if (marqueeContainer.scrollLeft >= totalContentWidth) {
        marqueeContainer.scrollLeft = 0;
      }
    }, 30); // speed
  }

  function stopAutoScroll() {
    if (!isAutoScrolling) return;
    clearInterval(autoScrollInterval);
    isAutoScrolling = false;
    marqueeContainer.style.scrollBehavior = "smooth"; // smooth only for manual
    checkArrowVisibility();
  }

  // ---------- Manual arrows ----------
  function checkArrowVisibility() {
    const atStart = marqueeContainer.scrollLeft < 5;
    const atEnd   = marqueeContainer.scrollLeft + marqueeContainer.clientWidth > marqueeContainer.scrollWidth - 5;

    scrollLeftBtn.style.display  = atStart ? "none" : "flex";
    scrollRightBtn.style.display = atEnd   ? "none" : "flex";
  }

scrollLeftBtn.addEventListener("click", () => {
  stopAutoScroll();
  requestAnimationFrame(() => {
    marqueeContainer.scrollLeft -= cardScrollWidth;
  });
});

scrollRightBtn.addEventListener("click", () => {
  stopAutoScroll();
  requestAnimationFrame(() => {
    marqueeContainer.scrollLeft += cardScrollWidth;
  });
});


  // Pause/resume on hover while auto-scrolling
  marqueeContainer.addEventListener("mouseenter", () => {
    if (isAutoScrolling) clearInterval(autoScrollInterval);
  });
  marqueeContainer.addEventListener("mouseleave", () => {
    if (isAutoScrolling) startAutoScroll();
  });

  // When manual, keep arrows accurate
  marqueeContainer.addEventListener("scroll", () => {
    if (!isAutoScrolling) checkArrowVisibility();
  });

  // ---------- Card builder ----------
  function buildCard(tutor, template) {
    const card = template.cloneNode(true);
    card.style.display = "flex";
    card.classList.remove("pro-carousel-template");

    // Name
    card.querySelector(".tutor-name").textContent = tutor.firstName || "Unknown";

    // Location
    const locEl = card.querySelector(".location-value");
    if (locEl) locEl.textContent = tutor.location || "N/A";

    // Curriculum (array or string)
    const curriculumVal = Array.isArray(tutor.curriculum)
      ? tutor.curriculum.filter(Boolean).join(", ")
      : (tutor.curriculum || "N/A");
    const curEl = card.querySelector(".curriculum-value");
    if (curEl) curEl.textContent = curriculumVal;

    // Experience
    const expEl = card.querySelector(".experience-value");
    if (expEl) expEl.textContent = tutor.yearsOfTeachingExperience || "N/A";

    // Image
    const img = card.querySelector(".tutor-photo");
    if (img) {
      img.src = tutor.photoUrl;
      img.alt = `${tutor.firstName || "Tutor"}'s Photo`;

      if (img.complete && img.naturalWidth > 0) {
        img.classList.add("loaded");
      } else {
        img.addEventListener("load",  () => img.classList.add("loaded"), { once: true });
        img.addEventListener("error", () => img.classList.add("loaded"), { once: true });
      }
    }

    // Links
    const profileLink = `/view-teacher?id=${tutor.id}`;
    const photoA = card.querySelector(".tutor-photo-link");
    const btnA   = card.querySelector(".view-profile-btn");
    if (photoA) photoA.href = profileLink;
    if (btnA)   btnA.href   = profileLink;

    return card;
  }

  // ---------- Fetch & render ----------
  async function fetchAndDisplayTutors() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (!Array.isArray(data.results) || data.results.length === 0) {
        document.getElementById("pro-tutor-carousel").style.display = "none";
        return;
      }

      // width of original content (used for snap-back)
      totalContentWidth = data.results.length * cardScrollWidth;

      const frag = document.createDocumentFragment();

      // Original set
      data.results.forEach(tutor => frag.appendChild(buildCard(tutor, template)));
      // Second set for seamless loop (build again so images fire load)
      data.results.forEach(tutor => frag.appendChild(buildCard(tutor, template)));

      content.appendChild(frag);

      // Kick off auto-scroll
      startAutoScroll();
    } catch (err) {
      console.error("Failed to fetch tutors for carousel:", err);
      const el = document.getElementById("pro-tutor-carousel");
      if (el) el.style.display = "none";
    }
  }

  fetchAndDisplayTutors();
});