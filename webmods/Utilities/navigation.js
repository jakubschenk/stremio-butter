// Stremio Kai Navigation Enhancer
// Handles global navigation shortcuts and overrides
// - Logo Click: Go to Board (or Releases if update available)
// - Back Button: Go to Board (from Detail pages)

(function () {
  "use strict";

  if (window.KaiNavigation?.initialized) return;
  window.KaiNavigation = window.KaiNavigation || {};
  window.KaiNavigation.initialized = true;

  const CONFIG = {
    RELEASES_URL: "https://allecsc.github.io/Stremio-Kai/changelog.html",
  };

  const NavigationManager = {
    init() {
      this.enhanceLogo();
      this.enhanceBackButton();
      console.log("[Kai Navigation] Initialized");
    },

    /**
     * Enhances the Stremio logo with click behavior.
     * Uses event delegation to survive DOM re-renders.
     */
    enhanceLogo() {
      document.addEventListener("click", (e) => {
        const logo = e.target.closest(".logo-container-jteMT");
        if (!logo) return;

        e.preventDefault();

        // 1. Check if update is available (flagged by update-notification.js via class)
        // Checks specifically specifically for the pulsing class or a data attribute if we add one later
        const isUpdateAvailable = logo.classList.contains("update-available");

        // 2. Determine if we are on the main page
        const isMainPage =
          window.location.hash === "#/" || window.location.hash === "";

        if (isUpdateAvailable && isMainPage) {
          window.open(CONFIG.RELEASES_URL, "_blank");
        } else {
          window.location.href = "#/";
        }
      });

      // Tooltip handling removed - handled by update-notification.js (title update) and CSS (cursor).
    },

    /**
     * Enhances the back button behavior on detail pages.
     * - Episode chain (ep1→ep2→ep3): skips back to board (#/).
     * - Contextual navigation (Library→detail): goes back normally.
     */
    enhanceBackButton() {
      document.addEventListener(
        "click",
        (e) => {
          const backButton = e.target.closest(".back-button-container-lDB1N");
          if (!backButton) return;

          // Only intercept on detail pages
          if (!window.location.hash.startsWith("#/detail/")) return;

          e.preventDefault();
          e.stopPropagation();

          // Go back naturally, then check where we landed
          history.back();

          window.addEventListener(
            "hashchange",
            () => {
              // If we landed on another detail page (episode chain), skip to board
              if (window.location.hash.startsWith("#/detail/")) {
                window.location.href = "#/";
              }
              // Otherwise (Library, Discover, etc.) — do nothing, we're already there
            },
            { once: true },
          );
        },
        { capture: true },
      );
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      NavigationManager.init(),
    );
  } else {
    NavigationManager.init();
  }
})();
