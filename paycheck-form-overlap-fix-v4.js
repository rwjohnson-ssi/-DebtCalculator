(() => {
  "use strict";

  const PAGE_KEY = "debtwizard-active-page";

  function addStyles() {
    if (document.getElementById("debtwizard-nav-more-styles")) return;
    const style = document.createElement("style");
    style.id = "debtwizard-nav-more-styles";
    style.textContent = `
      @media (max-width: 560px) {
        #paycheck-overlay .paycheck-config {
          display: block !important;
          padding: 16px !important;
        }
        #paycheck-overlay .paycheck-two,
        #paycheck-overlay .paycheck-two > .paycheck-field {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 14px !important;
          width: 100% !important;
          min-width: 0 !important;
        }
        #paycheck-overlay .paycheck-two > .paycheck-field > input,
        #paycheck-overlay .paycheck-two > .paycheck-field > select,
        #paycheck-overlay input[type="date"] {
          display: block !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
      }

      #tabbar {
        display: grid !important;
        grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
        overflow: visible !important;
      }
      #tabbar > .tab-btn[data-page="plan"],
      #tabbar > .tab-btn[data-page="track"],
      #tabbar > [data-edp-trans-nav],
      #tabbar > .dw-nav-plus {
        display: none !important;
      }
      #tabbar > .dw-nav-transaction,
      #tabbar > .dw-nav-more {
        appearance: none;
        border: 0;
        background: transparent;
        color: #8d989e;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        min-width: 0;
        padding: 7px 2px calc(7px + env(safe-area-inset-bottom, 0px));
        font: inherit;
        font-size: .72rem;
        font-weight: 800;
      }
      #tabbar > .dw-nav-transaction .tab-icon,
      #tabbar > .dw-nav-more .tab-icon {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        font-size: 1.55rem;
        line-height: 1;
      }
      #tabbar > .dw-nav-transaction .tab-icon {
        width: 46px;
        height: 46px;
        margin-top: -18px;
        border-radius: 50%;
        background: #004b75;
        color: #fff;
        box-shadow: 0 7px 18px rgba(0, 35, 62, .25);
        font-size: 2rem;
        font-weight: 400;
      }
      #tabbar > .dw-nav-transaction span:last-child {
        color: #007f96;
      }

      .dw-more-backdrop {
        position: fixed;
        inset: 0;
        z-index: 180;
        background: rgba(8, 22, 29, .35);
      }
      .dw-more-menu {
        position: fixed;
        right: 14px;
        bottom: calc(82px + env(safe-area-inset-bottom, 0px));
        z-index: 181;
        width: min(250px, calc(100vw - 28px));
        padding: 10px;
        border-radius: 20px;
        background: #fff;
        box-shadow: 0 18px 50px rgba(0, 35, 62, .25);
      }
      .dw-more-menu button {
        width: 100%;
        min-height: 58px;
        border: 0;
        border-bottom: 1px solid #e7ecee;
        background: transparent;
        display: grid;
        grid-template-columns: 38px 1fr auto;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        color: #24323a;
        text-align: left;
        font: inherit;
        font-weight: 850;
      }
      .dw-more-menu button:last-child { border-bottom: 0; }
      .dw-more-menu .dw-more-icon { color: #0f7893; font-size: 1.35rem; }
      .dw-more-menu .dw-more-arrow { color: #0f7893; font-size: 1.5rem; }
    `;
    document.head.appendChild(style);
  }

  function saveActivePage(page) {
    if (!page) return;
    try {
      localStorage.setItem(PAGE_KEY, page);
      sessionStorage.setItem(PAGE_KEY, page);
    } catch {}
  }

  function applyPaycheckLayout() {
    const form = document.getElementById("modal-root")?.querySelector("#paycheck-form");
    const pair = form?.querySelector(".paycheck-two");
    if (pair) pair.classList.add("paycheck-fields-stacked-mobile");
  }

  function buildNavigation() {
    const bar = document.getElementById("tabbar");
    if (!bar) return false;

    bar.querySelectorAll("[data-edp-trans-nav], .dw-nav-plus").forEach(node => node.remove());

    const budget = bar.querySelector('.tab-btn[data-page="budget"]');
    const strategy = bar.querySelector('.tab-btn[data-page="strategy"]');

    if (!bar.querySelector(".dw-nav-transaction")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dw-nav-transaction";
      button.setAttribute("data-edp-trans-add", "");
      button.setAttribute("aria-label", "Add transaction");
      button.innerHTML = '<span class="tab-icon">+</span><span>Transaction</span>';
      if (strategy) bar.insertBefore(button, strategy);
      else if (budget?.nextSibling) bar.insertBefore(button, budget.nextSibling);
      else bar.appendChild(button);
    }

    if (!bar.querySelector(".dw-nav-more")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dw-nav-more";
      button.setAttribute("aria-label", "More navigation");
      button.innerHTML = '<span class="tab-icon">•••</span><span>More</span>';
      bar.appendChild(button);
    }

    return true;
  }

  function closeMoreMenu() {
    document.querySelector(".dw-more-backdrop")?.remove();
    document.querySelector(".dw-more-menu")?.remove();
  }

  function openMoreMenu() {
    closeMoreMenu();
    document.body.insertAdjacentHTML("beforeend", `
      <div class="dw-more-backdrop" data-dw-more-close></div>
      <div class="dw-more-menu" role="dialog" aria-label="More navigation">
        <button type="button" data-dw-more-page="plan">
          <span class="dw-more-icon">▤</span><span>Debt Payoff Plan</span><span class="dw-more-arrow">›</span>
        </button>
        <button type="button" data-dw-more-page="track">
          <span class="dw-more-icon">✓</span><span>Debt Payment Tracking</span><span class="dw-more-arrow">›</span>
        </button>
      </div>
    `);
  }

  document.addEventListener("click", event => {
    if (event.target.closest(".dw-nav-more")) {
      event.preventDefault();
      openMoreMenu();
      return;
    }

    if (event.target.closest("[data-dw-more-close]")) {
      event.preventDefault();
      closeMoreMenu();
      return;
    }

    const morePage = event.target.closest("[data-dw-more-page]");
    if (morePage) {
      event.preventDefault();
      const page = morePage.dataset.dwMorePage;
      closeMoreMenu();
      const original = document.querySelector(`#tabbar .tab-btn[data-page="${page}"]`);
      if (original) {
        saveActivePage(page);
        original.click();
      }
      return;
    }

    const nav = event.target.closest('[data-act="nav"][data-page], .tab-btn[data-page]');
    if (nav?.dataset?.page) saveActivePage(nav.dataset.page);
  }, true);

  function initialize() {
    addStyles();
    applyPaycheckLayout();
    buildNavigation();
  }

  window.addEventListener("load", () => {
    initialize();
    let attempts = 0;
    const timer = setInterval(() => {
      initialize();
      attempts += 1;
      if (attempts >= 20 || document.querySelector("#tabbar .dw-nav-more")) clearInterval(timer);
    }, 150);
  });

  initialize();
})();