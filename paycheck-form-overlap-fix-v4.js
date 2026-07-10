(() => {
  "use strict";

  const PAGE_KEY = "debtwizard-active-page";
  const BUDGET_MODE_KEY = "debtwizard-budget-mode";
  const BUDGET_MODES = ["planned", "spent", "remaining"];

  function addStyles() {
    if (document.getElementById("debtwizard-ui-fixes-v7")) return;
    document.getElementById("debtwizard-ui-fixes-v6")?.remove();
    const style = document.createElement("style");
    style.id = "debtwizard-ui-fixes-v7";
    style.textContent = `
      @media (max-width: 560px) {
        #paycheck-overlay .paycheck-config { display:block!important; padding:16px!important; }
        #paycheck-overlay .paycheck-two,
        #paycheck-overlay .paycheck-two > .paycheck-field {
          display:grid!important; grid-template-columns:minmax(0,1fr)!important;
          gap:14px!important; width:100%!important; min-width:0!important;
        }
        #paycheck-overlay .paycheck-two input,
        #paycheck-overlay .paycheck-two select,
        #paycheck-overlay input[type="date"] {
          width:100%!important; min-width:0!important; max-width:100%!important;
          box-sizing:border-box!important;
        }
      }

      .budget-view-toggle {
        display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px;
        margin:0 0 14px; padding:4px; border:1px solid #cfe9ee;
        border-radius:15px; background:#eaf9fc;
      }
      .budget-view-toggle button {
        min-height:40px; border:0; border-radius:12px; background:transparent;
        color:#0f7893; font-size:.94rem; font-weight:900;
      }
      .budget-view-toggle button.active {
        background:#20bfd7; color:#fff; box-shadow:0 6px 14px rgba(32,191,215,.22);
      }
      .budget-view-note {
        margin:-5px 0 14px; color:#65747a; font-size:.82rem;
        line-height:1.35; text-align:center; font-weight:750;
      }

      #tabbar { display:grid!important; grid-template-columns:repeat(5,minmax(0,1fr))!important; overflow:visible!important; }
      #tabbar > .tab-btn[data-page="strategy"],
      #tabbar > .tab-btn[data-page="plan"],
      #tabbar > .tab-btn[data-page="track"],
      #tabbar > [data-edp-trans-nav],
      #tabbar > .dw-nav-plus { display:none!important; }

      #tabbar > .dw-nav-transaction {
        appearance:none; border:0; background:transparent; color:#8d989e;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        gap:3px; min-width:0; padding:7px 2px calc(7px + env(safe-area-inset-bottom,0px));
        font:inherit; font-size:.72rem; font-weight:800;
      }
      #tabbar > .dw-nav-transaction .tab-icon {
        display:grid; place-items:center; width:54px; height:54px; margin-top:-22px;
        border-radius:50%; background:#004b75; color:#fff;
        box-shadow:0 7px 18px rgba(0,35,62,.25); font-size:2.2rem;
        line-height:1; font-weight:400;
      }
      #tabbar > .dw-nav-transaction span:last-child { color:#007f96; }

      /* Match More exactly to the native Home and Debts tab geometry. */
      #tabbar > .dw-nav-more {
        appearance:none; border:0; background:transparent; color:#96a0a4;
        display:grid!important; grid-template-rows:26px 16px!important;
        justify-items:center!important; align-items:center!important;
        gap:0!important; min-width:0; padding:3px 0!important;
        font:inherit; font-size:.71rem!important; line-height:1!important;
        font-weight:750!important;
      }
      #tabbar > .dw-nav-more .tab-icon {
        display:block!important; width:auto!important; height:auto!important;
        margin:0!important; font-size:1.43rem!important; line-height:1!important;
      }
      #tabbar > .dw-nav-more span:last-child {
        display:block; margin:0; line-height:1!important;
      }

      .dw-more-backdrop { position:fixed; inset:0; z-index:180; background:rgba(8,22,29,.35); }
      .dw-more-menu {
        position:fixed; right:14px; bottom:calc(82px + env(safe-area-inset-bottom,0px));
        z-index:181; width:min(260px,calc(100vw - 28px)); padding:10px;
        border-radius:20px; background:#fff; box-shadow:0 18px 50px rgba(0,35,62,.25);
      }
      .dw-more-menu button {
        width:100%; min-height:58px; border:0; border-bottom:1px solid #e7ecee;
        background:transparent; display:grid; grid-template-columns:38px 1fr auto;
        align-items:center; gap:10px; padding:8px 12px; color:#24323a;
        text-align:left; font:inherit; font-weight:850;
      }
      .dw-more-menu button:last-child { border-bottom:0; }
      .dw-more-icon,.dw-more-arrow { color:#0f7893; }
      .dw-more-arrow { font-size:1.5rem; }

      .dw-tx-root {
        position:fixed!important; inset:0!important; width:100%!important; height:100dvh!important;
        overflow:hidden!important; background:#eefbfe!important;
      }
      .dw-tx-backdrop { background:rgba(0,55,76,.34)!important; }
      .dw-tx-sheet {
        position:absolute!important; inset:0!important; width:100%!important; height:100dvh!important;
        max-height:none!important; overflow-y:auto!important; overscroll-behavior:contain!important;
        border-radius:0!important;
        background:linear-gradient(180deg,#dff8fc 0,#f7fcfd 230px,#f7fcfd 100%)!important;
        box-shadow:none!important; padding-bottom:env(safe-area-inset-bottom,0px)!important;
        -webkit-overflow-scrolling:touch!important;
      }
      .dw-tx-sheet-head {
        position:sticky!important; top:0!important; z-index:3!important;
        border-radius:0!important; padding:calc(14px + env(safe-area-inset-top,0px)) 24px 22px!important;
        background:linear-gradient(135deg,#087b96,#27bfd2)!important;
        color:#fff!important; box-shadow:0 8px 22px rgba(8,123,150,.18)!important;
      }
      .dw-tx-grabber { display:none!important; }
      .dw-tx-head-row strong { font-size:1.22rem!important; font-weight:950!important; }
      .dw-tx-link { color:#fff!important; font-weight:850!important; }
      .dw-tx-done { opacity:.72!important; }
      .dw-tx-toggle {
        margin-top:18px!important; padding:4px!important; gap:4px!important;
        background:rgba(255,255,255,.22)!important; border:1px solid rgba(255,255,255,.32)!important;
        border-radius:15px!important;
      }
      .dw-tx-toggle button {
        min-height:44px!important; border-radius:11px!important; color:#fff!important;
        font-weight:900!important;
      }
      .dw-tx-toggle button.active {
        background:#fff!important; color:#087b96!important;
        box-shadow:0 5px 14px rgba(0,55,76,.18)!important;
      }
      .dw-tx-body { padding:24px 22px 120px!important; }
      .dw-tx-panel,.dw-tx-budget-row,.dw-tx-note {
        border:1px solid #dbe8ec!important; border-radius:20px!important;
        background:#fff!important; box-shadow:0 8px 22px rgba(15,81,107,.07)!important;
      }
      .dw-tx-panel { padding:0 22px!important; margin-bottom:18px!important; }
      .dw-tx-field { min-height:68px!important; border-bottom:1px solid #e5edef!important; }
      .dw-tx-field span,.dw-tx-account strong { color:#183f50!important; font-weight:850!important; }
      .dw-tx-field input { color:#087b96!important; font-weight:800!important; }
      .dw-tx-account small { color:#66777e!important; }
      .dw-tx-budget-row {
        margin-bottom:18px!important; padding:20px 22px!important; color:#183f50!important;
        font-weight:850!important;
      }
      .dw-tx-budget-row em { color:#087b96!important; }
      .dw-tx-note {
        box-sizing:border-box!important; min-height:104px!important; padding:20px 22px!important;
        color:#183f50!important;
      }
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
    try { return sessionStorage.getItem(PAGE_KEY) || localStorage.getItem(PAGE_KEY) || ""; }
    catch { return ""; }
  }

  function readBudgetMode() {
    try {
      const value = localStorage.getItem(BUDGET_MODE_KEY) || "planned";
      return BUDGET_MODES.includes(value) ? value : "planned";
    } catch { return "planned"; }
  }

  function applyBudgetViewToggle() {
    const form = document.getElementById("budget-form");
    if (!form) return;
    if (!form.querySelector(".budget-view-toggle")) {
      form.insertAdjacentHTML("afterbegin", '<div class="budget-view-toggle" role="tablist" aria-label="Budget view"><button type="button" data-budget-view="planned">Planned</button><button type="button" data-budget-view="spent">Spent</button><button type="button" data-budget-view="remaining">Remaining</button></div><p class="budget-view-note"></p>');
    }
    const active = readBudgetMode();
    form.querySelectorAll("[data-budget-view]").forEach(button => button.classList.toggle("active", button.dataset.budgetView === active));
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

    const budget = bar.querySelector('.tab-btn[data-page="budget"]');
    if (budget) bar.insertBefore(transaction, budget);

    let more = bar.querySelector(".dw-nav-more");
    if (!more) {
      more = document.createElement("button");
      more.type = "button";
      more.className = "dw-nav-more";
      more.setAttribute("aria-label", "More navigation");
      more.innerHTML = '<span class="tab-icon">•••</span><span>More</span>';
    }
    bar.appendChild(more);
    return true;
  }

  function closeMoreMenu() {
    document.querySelector(".dw-more-backdrop")?.remove();
    document.querySelector(".dw-more-menu")?.remove();
  }

  function openMoreMenu() {
    closeMoreMenu();
    document.body.insertAdjacentHTML("beforeend", '<div class="dw-more-backdrop" data-dw-more-close></div><div class="dw-more-menu" role="dialog" aria-label="More navigation"><button type="button" data-dw-more-page="strategy"><span class="dw-more-icon">✦</span><span>Payoff Strategy</span><span class="dw-more-arrow">›</span></button><button type="button" data-dw-more-page="plan"><span class="dw-more-icon">▤</span><span>Debt Payoff Plan</span><span class="dw-more-arrow">›</span></button><button type="button" data-dw-more-page="track"><span class="dw-more-icon">✓</span><span>Debt Payment Tracking</span><span class="dw-more-arrow">›</span></button></div>');
  }

  document.addEventListener("click", event => {
    const view = event.target.closest("[data-budget-view]");
    if (view) {
      event.preventDefault();
      try { localStorage.setItem(BUDGET_MODE_KEY, BUDGET_MODES.includes(view.dataset.budgetView) ? view.dataset.budgetView : "planned"); } catch {}
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
      saveActivePage(page);
      document.querySelector(`#tabbar .tab-btn[data-page="${page}"]`)?.click();
      return;
    }
    const nav = event.target.closest('[data-act="nav"][data-page],.tab-btn[data-page]');
    if (nav?.dataset?.page) saveActivePage(nav.dataset.page);
  }, true);

  function resetTransactionSheetScroll() {
    requestAnimationFrame(() => {
      const sheet = document.querySelector(".dw-tx-sheet");
      if (sheet) sheet.scrollTop = 0;
      window.scrollTo(0, 0);
    });
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-edp-trans-add]")) {
      setTimeout(resetTransactionSheetScroll, 0);
      setTimeout(resetTransactionSheetScroll, 80);
    }
  }, true);

  function initialize() {
    addStyles();
    applyPaycheckLayout();
    applyBudgetViewToggle();
    buildNavigation();
    if (document.querySelector(".dw-tx-root")) resetTransactionSheetScroll();
  }

  window.addEventListener("load", () => {
    initialize();
    if (readActivePage() === "budget") document.querySelector('.tab-btn[data-page="budget"]')?.click();
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