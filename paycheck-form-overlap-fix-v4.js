(() => {
  "use strict";

  const PAGE_KEY = "debtwizard-active-page";
  const BUDGET_MODE_KEY = "debtwizard-budget-mode";
  const BUDGET_MODES = ["planned", "spent", "remaining"];

  function addStyles() {
    if (document.getElementById("paycheck-form-overlap-fix-v4-styles")) return;
    const style = document.createElement("style");
    style.id = "paycheck-form-overlap-fix-v4-styles";
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

      .budget-view-toggle {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 4px;
        margin: 0 0 14px;
        padding: 4px;
        border: 1px solid #cfe9ee;
        border-radius: 15px;
        background: #eaf9fc;
      }
      .budget-view-toggle button {
        min-height: 40px;
        border: 0;
        border-radius: 12px;
        background: transparent;
        color: #0f7893;
        font-size: .94rem;
        font-weight: 900;
      }
      .budget-view-toggle button.active {
        background: #20bfd7;
        color: #fff;
        box-shadow: 0 6px 14px rgba(32,191,215,.22);
      }
      .budget-view-note {
        margin: -5px 0 14px;
        color: #65747a;
        font-size: .82rem;
        line-height: 1.35;
        text-align: center;
        font-weight: 750;
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
        font-size: .69rem;
        font-weight: 800;
      }
      #tabbar > .dw-nav-transaction .tab-icon,
      #tabbar > .dw-nav-more .tab-icon {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        font-size: 1.35rem;
        line-height: 1;
      }
      #tabbar > .dw-nav-transaction .tab-icon {
        width: 48px;
        height: 48px;
        margin-top: -18px;
        border-radius: 50%;
        background: #004b75;
        color: #fff;
        box-shadow: 0 7px 18px rgba(0,35,62,.25);
        font-size: 2rem;
        font-weight: 400;
      }
      #tabbar > .dw-nav-transaction span:last-child { color: #007f96; }

      .dw-more-backdrop {
        position: fixed;
        inset: 0;
        z-index: 180;
        background: rgba(8,22,29,.35);
      }
      .dw-more-menu {
        position: fixed;
        right: 14px;
        bottom: calc(82px + env(safe-area-inset-bottom,0px));
        z-index: 181;
        width: min(260px, calc(100vw - 28px));
        padding: 10px;
        border-radius: 20px;
        background: #fff;
        box-shadow: 0 18px 50px rgba(0,35,62,.25);
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
      .dw-more-icon, .dw-more-arrow { color: #0f7893; }
      .dw-more-arrow { font-size: 1.5rem; }
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

  function readActivePage() {
    try {
      return sessionStorage.getItem(PAGE_KEY) || localStorage.getItem(PAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function readBudgetMode() {
    try {
      const mode = localStorage.getItem(BUDGET_MODE_KEY) || "planned";
      return BUDGET_MODES.includes(mode) ? mode : "planned";
    } catch {
      return "planned";
    }
  }

  function saveBudgetMode(mode) {
    try {
      localStorage.setItem(BUDGET_MODE_KEY, BUDGET_MODES.includes(mode) ? mode : "planned");
    } catch {}
  }

  function isBudgetVisible() {
    return Boolean(document.getElementById("budget-form") || document.querySelector('.tab-btn.active[data-page="budget"]'));
  }

  function restoreBudgetPage() {
    if (readActivePage() !== "budget" || isBudgetVisible()) return;
    document.querySelector('.tab-btn[data-page="budget"], [data-act="nav"][data-page="budget"]')?.click();
  }

  function applyBudgetViewToggle() {
    const form = document.getElementById("budget-form");
    if (!form) return;
    if (!form.querySelector(".budget-view-toggle")) {
      form.insertAdjacentHTML("afterbegin", `
        <div class="budget-view-toggle" role="tablist" aria-label="Budget view">
          <button type="button" data-budget-view="planned">Planned</button>
          <button type="button" data-budget-view="spent">Spent</button>
          <button type="button" data-budget-view="remaining">Remaining</button>
        </div>
        <p class="budget-view-note"></p>
      `);
    }
    const mode = readBudgetMode();
    form.querySelectorAll("[data-budget-view]").forEach(button => button.classList.toggle("active", button.dataset.budgetView === mode));
  }

  function applyPaycheckLayout() {
    const pair = document.getElementById("modal-root")?.querySelector("#paycheck-form .paycheck-two");
    if (pair) pair.classList.add("paycheck-fields-stacked-mobile");
  }

  function buildNavigation() {
    const bar = document.getElementById("tabbar");
    if (!bar) return false;

    bar.querySelectorAll("[data-edp-trans-nav]").forEach(node => node.remove());

    let transaction = bar.querySelector(".dw-nav-transaction");
    if (!transaction) {
      transaction = document.createElement("button");
      transaction.type = "button";
      transaction.className = "dw-nav-transaction";
      transaction.setAttribute("data-edp-trans-add", "");
      transaction.setAttribute("aria-label", "Add transaction");
      transaction.innerHTML = '<span class="tab-icon">+</span><span>Transaction</span>';
    }

    const strategy = bar.querySelector('.tab-btn[data-page="strategy"]');
    if (strategy && transaction.nextElementSibling !== strategy) bar.insertBefore(transaction, strategy);

    if (!bar.querySelector(".dw-nav-more")) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "dw-nav-more";
      more.setAttribute("aria-label", "More navigation");
      more.innerHTML = '<span class="tab-icon">•••</span><span>More</span>';
      bar.appendChild(more);
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
    const viewButton = event.target.closest("[data-budget-view]");
    if (viewButton) {
      event.preventDefault();
      saveBudgetMode(viewButton.dataset.budgetView);
      applyBudgetViewToggle();
      return;
    }

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
    else if (isBudgetVisible() || event.target.closest('[data-edp-act], .edp-popup, .edp-backdrop')) saveActivePage("budget");
  }, true);

  document.addEventListener("submit", event => {
    if (event.target?.id === "budget-form" || isBudgetVisible()) saveActivePage("budget");
  }, true);

  function initialize() {
    addStyles();
    applyPaycheckLayout();
    applyBudgetViewToggle();
    buildNavigation();
  }

  window.addEventListener("load", () => {
    initialize();
    restoreBudgetPage();
    let attempts = 0;
    const timer = setInterval(() => {
      initialize();
      attempts += 1;
      if (attempts >= 24 || document.querySelector("#tabbar .dw-nav-more")) clearInterval(timer);
    }, 150);
  });

  initialize();
  setTimeout(initialize, 0);
})();