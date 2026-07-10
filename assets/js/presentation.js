// Dynamically load MathJax for beautiful LaTeX formula rendering
if (!window.MathJax) {
  window.MathJax = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']]
    }
  };
  const mjScript = document.createElement("script");
  mjScript.id = "MathJax-script";
  mjScript.async = true;
  mjScript.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
  document.head.appendChild(mjScript);
}

document.addEventListener("DOMContentLoaded", () => {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const progressBar = document.querySelector(".hud-progress-bar");
  const slideNumText = document.querySelector(".hud-slide-number span");
  const prevBtn = document.getElementById("prev-slide");
  const nextBtn = document.getElementById("next-slide");
  const simBtn = document.getElementById("launch-sim-btn");
  const overlay = document.getElementById("sim-overlay");
  const closeOverlayBtn = document.getElementById("close-overlay");

  let currentSlideIndex = 0;

  if (slides.length === 0) return;

  // Initialize Slides
  function initSlides() {
    // Check url hash for slide number
    const hash = window.location.hash;
    if (hash && hash.startsWith("#slide-")) {
      const slideNum = parseInt(hash.replace("#slide-", ""), 10);
      if (!isNaN(slideNum) && slideNum >= 1 && slideNum <= slides.length) {
        currentSlideIndex = slideNum - 1;
      }
    }

    updateSlidesState();
  }

  function updateSlidesState(direction = "next") {
    slides.forEach((slide, idx) => {
      slide.classList.remove("active", "prev");
      if (idx === currentSlideIndex) {
        slide.classList.add("active");
      } else if (idx < currentSlideIndex) {
        slide.classList.add("prev");
      }
    });

    // Update Progress Bar
    const percent = (currentSlideIndex / (slides.length - 1)) * 100;
    if (progressBar) progressBar.style.width = `${percent}%`;

    // Update Slide Number Indicator
    if (slideNumText) slideNumText.textContent = `${currentSlideIndex + 1} / ${slides.length}`;

    // Manage HUD Buttons
    if (prevBtn) prevBtn.disabled = currentSlideIndex === 0;
    if (nextBtn) nextBtn.disabled = currentSlideIndex === slides.length - 1;

    // Update Hash (without triggering hashchange listener)
    history.replaceState(null, null, `#slide-${currentSlideIndex + 1}`);

    // Manage focus for accessibility
    const activeSlide = slides[currentSlideIndex];
    if (activeSlide) {
      activeSlide.setAttribute("tabindex", "-1");
      activeSlide.focus();
    }
  }

  // Handle Navigation
  function navigate(direction) {
    if (direction === "next") {
      // Check if current slide has unrevealed elements
      const activeSlide = slides[currentSlideIndex];
      const unrevealedItems = Array.from(activeSlide.querySelectorAll(".reveal-item:not(.revealed)"));
      
      if (unrevealedItems.length > 0) {
        // Reveal the next item
        unrevealedItems[0].classList.add("revealed");
        return;
      }

      if (currentSlideIndex < slides.length - 1) {
        currentSlideIndex++;
        executeWithTransition(() => updateSlidesState("next"));
      }
    } else if (direction === "prev") {
      // Check if we can un-reveal items on current slide first
      const activeSlide = slides[currentSlideIndex];
      const revealedItems = Array.from(activeSlide.querySelectorAll(".reveal-item.revealed"));

      if (revealedItems.length > 0) {
        // Hide the last revealed item
        revealedItems[revealedItems.length - 1].classList.remove("revealed");
        return;
      }

      if (currentSlideIndex > 0) {
        currentSlideIndex--;
        executeWithTransition(() => updateSlidesState("prev"));
      }
    }
  }

  // Wrapper for View Transition API
  function executeWithTransition(updateFn) {
    if (document.startViewTransition) {
      document.startViewTransition(updateFn);
    } else {
      updateFn();
    }
  }

  // Keyboard Event Handlers
  document.addEventListener("keydown", (e) => {
    // Disable navigation keys if inputs are focused or simulator is open
    if (document.activeElement.tagName === "INPUT" || 
        document.activeElement.tagName === "TEXTAREA" || 
        (overlay && overlay.classList.contains("open"))) {
      if (e.key === "Escape" && overlay && overlay.classList.contains("open")) {
        closeSimulator();
      }
      return;
    }

    switch (e.key) {
      case "ArrowRight":
      case " ":
      case "Enter":
        e.preventDefault();
        navigate("next");
        break;
      case "ArrowLeft":
      case "Backspace":
        e.preventDefault();
        navigate("prev");
        break;
      case "Escape":
        // ESC returns to index dashboard
        window.location.href = "index.html";
        break;
      case "f":
      case "F":
        toggleFullScreen();
        break;
    }
  });

  // Tap/Click on slide to proceed (excluding interactive elements)
  document.addEventListener("click", (e) => {
    // Don't navigate if clicked on button, link, control HUD, or simulator overlay
    if (e.target.closest("button") || 
        e.target.closest("a") || 
        e.target.closest(".hud-controls") || 
        e.target.closest(".interactive-overlay") ||
        e.target.closest(".home-btn") ||
        e.target.closest("input") ||
        e.target.closest("select")) {
      return;
    }
    navigate("next");
  });

  // Touch Swiping Controls for Mobile/Tablets
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, false);

  document.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
  }, false);

  function handleSwipe(startX, startY, endX, endY) {
    const diffX = endX - startX;
    const diffY = endY - startY;

    // Detect horizontal swipes
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        navigate("prev");
      } else {
        navigate("next");
      }
    }
  }

  // Fullscreen support
  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  // Simulator Toggle Handlers
  function openSimulator() {
    if (overlay) {
      overlay.classList.add("open");
      const heading = overlay.querySelector(".overlay-title h3");
      if (heading) heading.focus();
      
      // Notify parent document/chapter simulator logic
      const event = new CustomEvent("simulator-opened");
      document.dispatchEvent(event);
    }
  }

  function closeSimulator() {
    if (overlay) {
      overlay.classList.remove("open");
      const activeSlide = slides[currentSlideIndex];
      if (activeSlide) activeSlide.focus();
      
      // Notify parent document/chapter simulator logic
      const event = new CustomEvent("simulator-closed");
      document.dispatchEvent(event);
    }
  }

  if (simBtn) simBtn.addEventListener("click", openSimulator);
  if (closeOverlayBtn) closeOverlayBtn.addEventListener("click", closeSimulator);
  
  // Custom button trigger inside slides to launch simulator
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-launch-simulator");
    if (btn) {
      openSimulator();
    }
  });

  // HUD Navigation Buttons
  if (prevBtn) prevBtn.addEventListener("click", () => navigate("prev"));
  if (nextBtn) nextBtn.addEventListener("click", () => navigate("next"));

  // Init
  initSlides();
});
