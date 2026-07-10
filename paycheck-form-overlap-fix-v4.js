(() => {
  "use strict";

  const BASE_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/761c066f58989fb45dd749a007ec6db139675cbe/paycheck-form-overlap-fix-v4.js?feature=23";

  function ensureTransactionNavigationStyle() {
    if (document.getElementById("dw-transaction-nav-v23")) return;
    const style = document.createElement("style");
    style.id = "dw-transaction-nav-v23";
    style.textContent = `
      #dw-primary-nav .dw-nav-transaction{padding:4px 2px!important;gap:3px!important;color:#929da2!important}
      #dw-primary-nav .dw-nav-transaction .tab-icon{width:38px!important;height:38px!important;margin-top:0!important;border-radius:50%!important;background:#004b75!important;color:#fff!important;font-size:1.28rem!important;font-weight:900!important;box-shadow:none!important}
      #dw-primary-nav .dw-nav-transaction span:last-child{color:#929da2!important}
      #dw-primary-nav .dw-nav-transaction.active span:last-child{color:#007f96!important}
      .dw-trans-page .dw-trans-fab{display:grid!important;place-items:center!important;right:24px!important;bottom:calc(92px + env(safe-area-inset-bottom,0px))!important;z-index:135!important;width:70px!important;height:70px!important;border-radius:50%!important;background:#004b75!important;color:#fff!important;font-size:3rem!important;line-height:1!important;box-shadow:0 10px 28px rgba(0,35,62,.26)!important}
    `;
    document.head.appendChild(style);
  }

  function setTransactionListNavigation() {
    const button = document.querySelector("#dw-primary-nav .dw-nav-transaction");
    if (!button) return false;
    button.removeAttribute("data-edp-trans-add");
    button.setAttribute("data-edp-trans-nav", "");
    button.setAttribute("aria-label", "Transactions");
    button.innerHTML = '<span class="tab-icon" aria-hidden="true">$</span><span>Transactions</span>';
    return true;
  }

  function ensureTransactionsFab() {
    const page = document.querySelector(".dw-trans-page");
    if (!page) return false;
    let button = page.querySelector(".dw-trans-fab");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "dw-trans-fab";
      button.setAttribute("data-edp-trans-add", "");
      button.setAttribute("aria-label", "Add transaction");
      button.textContent = "+";
      page.appendChild(button);
    }
    return true;
  }

  function showTransactionActiveState() {
    const nav = document.getElementById("dw-primary-nav");
    if (!nav) return;
    nav.querySelectorAll(".tab-btn.active").forEach(button => button.classList.remove("active"));
    nav.querySelector(".dw-nav-transaction")?.classList.add("active");
  }

  function scheduleTransactionsPageSetup() {
    requestAnimationFrame(() => {
      ensureTransactionsFab();
      showTransactionActiveState();
    });
    setTimeout(() => {
      ensureTransactionsFab();
      showTransactionActiveState();
    }, 120);
  }

  fetch(BASE_HELPER, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Unable to load DebtWizard transaction features.");
      return response.text();
    })
    .then(source => {
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-feature-23.js`);
      ensureTransactionNavigationStyle();

      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (setTransactionListNavigation() || attempts >= 40) clearInterval(timer);
      }, 100);

      document.addEventListener("click", event => {
        if (event.target.closest("#dw-primary-nav [data-edp-trans-nav]")) {
          scheduleTransactionsPageSetup();
          return;
        }
        if (event.target.closest("#dw-primary-nav [data-dw-page],#dw-primary-nav .dw-nav-more")) {
          document.querySelector("#dw-primary-nav .dw-nav-transaction")?.classList.remove("active");
        }
      }, true);

      setTimeout(setTransactionListNavigation, 0);
      setTimeout(setTransactionListNavigation, 500);
      setTimeout(ensureTransactionsFab, 0);
    })
    .catch(error => console.error(error));
})();