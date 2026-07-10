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
      /* The native iPhone date input has a wide intrinsic minimum. On phone
         widths, stack payroll fields so neither control can overlap. */
      @media (max-width: 560px) {
        #paycheck-overlay .paycheck-config {
          display: block !important;
          padding: 16px !important;
        }
        #paycheck-overlay .paycheck-two {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 14px !important;
          width: 100% !important;
        }
        #paycheck-overlay .paycheck-two > .paycheck-field {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 6px !important;
          min-width: 0 !important;
          width: 100% !important;
        }
        #paycheck-overlay .paycheck-two > .paycheck-field > input,
        #paycheck-overlay .paycheck-two > .paycheck-field > select,
        #paycheck-overlay input[type="date"] {
          display: block !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          min-inline-size: 0 !important;
          box-sizing: border-box !important;
        }
        #paycheck-overlay input[type="date"] {
          -webkit-appearance: none;
          appearance: none;
        }
        #paycheck-overlay .paycheck-amount-helper {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          grid-template-areas:
            "title"
            "actions"
            "copy" !important;
          gap: 8px !important;
          width: 100% !important;
          margin-top: 14px !important;
        }
        #paycheck-overlay .paycheck-amount-helper .paycheck-quick-add {
          justify-content: flex-start !important;
          flex-wrap: wrap !important;
        }
        #paycheck-overlay .paycheck-config > .paycheck-empty {
          display: block !important;
          width: 100% !important;
          margin-top: 14px !important;
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
        grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
        align-items: end !important;
        overflow: visible !important;
      }
      #tabbar > [data-edp-trans-nav] {
        display: none !important;
      }
      #tabbar > .tab-btn,
      #tabbar > .dw-nav-plus {
        min-width: 0 !important;
      }
      #tabbar > .dw-nav-plus {
        position: relative !important;
        left: auto !important;
        top: -18px !important;
        transform: none !important;
        z-index: 90 !important;
        width: 64px !important;
        height: 64px !important;
        min-width: 64px !important;
        margin: 0 auto !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: #004b75 !important;
        color: #fff !important;
        box-shadow: 0 10px 24px rgba(0,35,62,.28) !important;
        display: grid !important;
        place-items: center !important;
        padding: 0 !important;
      }
      #tabbar > .dw-nav-plus span {
        display: block !important;
        font-size: 2.75rem !important;
        line-height: .85 !important;
        font-weight: 400 !important;
      }
      #tabbar > .dw-nav-plus small {
        display: none !important;
      }
      @media (max-width: 560px) {
        #tabbar > .tab-btn {
          min-width: 0 !important;
          padding-left: 1px !important;
          padding-right: 1px !important;
          font-size: .66rem !important;
        }
        #tabbar > .tab-btn .tab-icon {
          font-size: 1.05rem !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function cleanTransactionNav() {
    const bar = document.getElementById("tabbar");
    if (!bar) return;
    bar.querySelectorAll("[data-edp-trans-nav]").forEach(node => node.remove());
    const plus = bar.querySelector(".dw-nav-plus[data-edp-trans-add]");
    if (plus) {
      plus.setAttribute("aria-label", "Add transaction");
      plus.innerHTML = "<span>+</span>";
      const budget = bar.querySelector('.tab-btn[data-page="budget"]');
      if (budget && budget.nextElementSibling !== plus) budget.insertAdjacentElement("afterend", plus);
    }
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
    const tab = document.querySelector('.tab-btn[data-page="budget"], [data-act="nav"][data-page="budget"]');
    if (tab) tab.click();
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
        <p class="budget-view-note">This first step adds the view switcher. Row values and status bars will be wired in the next update.</p>
      `);
    }
    const mode = readBudgetMode();
    form.querySelectorAll("[data-budget-view]").forEach(button => button.classList.toggle("active", button.dataset.budgetView === mode));
  }

  function applyPaycheckLayout() {
    addStyles();
    cleanTransactionNav();
    const form = document.getElementById("modal-root")?.querySelector("#paycheck-form");
    const pair = form?.querySelector(".paycheck-two");
    if (pair) pair.classList.add("paycheck-fields-stacked-mobile");
  }

  document.addEventListener("click", event => {
    const viewButton = event.target.closest("[data-budget-view]");
    if (viewButton) {
      event.preventDefault();
      saveBudgetMode(viewButton.dataset.budgetView);
      applyBudgetViewToggle();
      return;
    }
    const nav = event.target.closest('[data-act="nav"][data-page], .tab-btn[data-page]');
    if (nav?.dataset?.page) saveActivePage(nav.dataset.page);
    else if (isBudgetVisible() || event.target.closest('[data-edp-act], .edp-popup, .edp-backdrop, [data-act="add-budget-bill"], [data-act="save-budget-bill"], [data-act="delete-budget-bill"], [data-act="close-budget-bill"], [data-act="edit-budget-bill"]')) saveActivePage("budget");
  }, true);

  document.addEventListener("submit", event => {
    if (event.target?.id === "budget-form" || isBudgetVisible()) saveActivePage("budget");
  }, true);

  window.addEventListener("load", () => {
    addStyles();
    let tries = 0;
    const timer = setInterval(() => {
      applyPaycheckLayout();
      restoreBudgetPage();
      applyBudgetViewToggle();
      cleanTransactionNav();
      tries += 1;
      if (tries > 24 || (isBudgetVisible() && document.querySelector(".budget-view-toggle"))) clearInterval(timer);
    }, 150);
  });

  addStyles();
  setTimeout(() => {
    applyPaycheckLayout();
    applyBudgetViewToggle();
    cleanTransactionNav();
  }, 0);
  new MutationObserver(cleanTransactionNav).observe(document.documentElement, { childList: true, subtree: true });
})();