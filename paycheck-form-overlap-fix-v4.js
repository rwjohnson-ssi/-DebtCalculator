(() => {
  "use strict";

  const PAGE_KEY = "debtwizard-active-page";

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
    `;
    document.head.appendChild(style);
  }

  function safeSet(page) {
    try {
      localStorage.setItem(PAGE_KEY, page);
      sessionStorage.setItem(PAGE_KEY, page);
    } catch {}
  }

  function safeGet() {
    try {
      return sessionStorage.getItem(PAGE_KEY) || localStorage.getItem(PAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function onBudget() {
    return Boolean(
      document.getElementById("budget-form") ||
      document.querySelector('.tab-btn.active[data-page="budget"], [data-act="nav"].active[data-page="budget"]')
    );
  }

  function budgetRelated(target) {
    return Boolean(target?.closest?.([
      ".edp-popup",
      ".edp-backdrop",
      ".budget-edit-popup",
      ".budget-edit-backdrop",
      "[data-edp-act]",
      "[data-edp-save]",
      "[data-edp-delete]",
      "[data-edp-close]",
      '[data-act="add-budget-bill"]',
      '[data-act="save-budget-bill"]',
      '[data-act="delete-budget-bill"]',
      '[data-act="close-budget-bill"]',
      '[data-act="edit-budget-bill"]'
    ].join(",")));
  }

  function restoreBudget() {
    if (safeGet() !== "budget" || onBudget()) return;
    const tab = document.querySelector('.tab-btn[data-page="budget"], [data-act="nav"][data-page="budget"]');
    if (tab) tab.click();
  }

  function watchActivePage() {
    document.addEventListener("click", event => {
      const nav = event.target.closest('[data-act="nav"][data-page], .tab-btn[data-page]');
      if (nav?.dataset?.page) safeSet(nav.dataset.page);
      else if (onBudget() || budgetRelated(event.target)) safeSet("budget");
    }, true);

    document.addEventListener("submit", event => {
      if (event.target?.id === "budget-form" || onBudget()) safeSet("budget");
    }, true);

    window.addEventListener("beforeunload", () => {
      if (onBudget() || document.querySelector(".edp-popup,.budget-edit-popup")) safeSet("budget");
    });

    window.addEventListener("load", () => {
      let tries = 0;
      const timer = setInterval(() => {
        restoreBudget();
        if (++tries > 60 || onBudget()) clearInterval(timer);
      }, 125);
    });

    if (document.body) new MutationObserver(restoreBudget).observe(document.body, { childList: true, subtree: true });
  }

  function apply() {
    addStyles();
    const root = document.getElementById("modal-root");
    const form = root?.querySelector("#paycheck-form");
    const pair = form?.querySelector(".paycheck-two");
    if (pair) pair.classList.add("paycheck-fields-stacked-mobile");
    restoreBudget();
  }

  watchActivePage();
  if (document.body) new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  apply();
})();
