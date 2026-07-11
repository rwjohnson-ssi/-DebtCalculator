(() => {
  "use strict";

  if (window.__debtWizardHelperBootstrapV39) return;
  window.__debtWizardHelperBootstrapV39 = true;

  const PAGE_KEY = "debtwizard-active-page";
  const currentScript = document.currentScript;
  const coreUrl = new URL("debtwizard-helper-core-v38.js?cache=45", currentScript?.src || window.location.href).href;

  function moreButtons() {
    return document.querySelectorAll("#dw-primary-nav .dw-nav-more, #tabbar .dw-nav-more");
  }

  function closeMoreMenu() {
    document.querySelector(".dw-more-backdrop")?.remove();
    document.querySelector(".dw-more-menu")?.remove();
    moreButtons().forEach(button => button.setAttribute("aria-expanded", "false"));
  }

  function openMoreMenu() {
    if (document.querySelector(".dw-more-menu")) {
      closeMoreMenu();
      return;
    }

    closeMoreMenu();
    document.body.insertAdjacentHTML("beforeend", `
      <button type="button" class="dw-more-backdrop" data-dw-more-close aria-label="Close more navigation"></button>
      <div class="dw-more-menu" role="menu" aria-label="More navigation">
        <button type="button" role="menuitem" data-dw-more-page="strategy">
          <span class="dw-more-icon" aria-hidden="true">✦</span>
          <span>Payoff Strategy</span>
          <span class="dw-more-arrow" aria-hidden="true">›</span>
        </button>
        <button type="button" role="menuitem" data-dw-more-page="plan">
          <span class="dw-more-icon" aria-hidden="true">▤</span>
          <span>Debt Payoff Plan</span>
          <span class="dw-more-arrow" aria-hidden="true">›</span>
        </button>
        <button type="button" role="menuitem" data-dw-more-page="track">
          <span class="dw-more-icon" aria-hidden="true">✓</span>
          <span>Debt Payment Tracking</span>
          <span class="dw-more-arrow" aria-hidden="true">›</span>
        </button>
      </div>
    `);

    moreButtons().forEach(button => button.setAttribute("aria-expanded", "true"));
    requestAnimationFrame(() => document.querySelector(".dw-more-menu [role=menuitem]")?.focus());
  }

  function saveActivePage(page) {
    if (!page) return;
    try {
      localStorage.setItem(PAGE_KEY, page);
      sessionStorage.setItem(PAGE_KEY, page);
    } catch {}
  }

  document.addEventListener("click", event => {
    const moreButton = event.target.closest("#dw-primary-nav .dw-nav-more, #tabbar .dw-nav-more");
    if (moreButton) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openMoreMenu();
      return;
    }

    if (event.target.closest("[data-dw-more-close]")) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      closeMoreMenu();
      return;
    }

    const pageButton = event.target.closest("[data-dw-more-page]");
    if (!pageButton) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const page = pageButton.dataset.dwMorePage;
    closeMoreMenu();
    saveActivePage(page);
    document.querySelector(`#tabbar .tab-btn[data-page="${page}"]`)?.click();
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.querySelector(".dw-more-menu")) closeMoreMenu();
  });

  const existingCore = document.querySelector('script[data-debtwizard-core-v38]');
  if (!existingCore) {
    const script = document.createElement("script");
    script.src = coreUrl;
    script.async = false;
    script.dataset.debtwizardCoreV38 = "true";
    script.onerror = () => console.error("DebtWizard core helper failed to load.");
    document.head.appendChild(script);
  }
})();
