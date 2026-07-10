(() => {
  "use strict";

  const BASE_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/761c066f58989fb45dd749a007ec6db139675cbe/paycheck-form-overlap-fix-v4.js?feature=28";

  function ensureTransactionNavigationStyle() {
    if (document.getElementById("dw-transaction-nav-v28")) return;
    const style = document.createElement("style");
    style.id = "dw-transaction-nav-v28";
    style.textContent = `
      #dw-primary-nav{box-sizing:border-box!important;min-height:74px!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;align-items:center!important;padding:6px 6px calc(10px + env(safe-area-inset-bottom,0px))!important}
      #app-shell{padding-bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}
      #dw-primary-nav>.tab-btn,#dw-primary-nav>.dw-nav-transaction,#dw-primary-nav>.dw-nav-more{box-sizing:border-box!important;width:100%!important;min-width:0!important;min-height:52px!important;margin:0!important;padding:4px 1px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;color:#758288!important;font-size:.72rem!important;font-weight:900!important;line-height:1!important;text-align:center!important}
      #dw-primary-nav .tab-icon{display:grid!important;place-items:center!important;width:30px!important;height:28px!important;margin:0!important;color:#748188!important;font-size:1.4rem!important;font-weight:900!important;line-height:1!important}
      #dw-primary-nav>button>span:last-child{display:block!important;margin:0!important;position:static!important;color:#758288!important;font-size:.72rem!important;font-weight:900!important;line-height:1!important;white-space:nowrap!important}
      #dw-primary-nav .tab-btn.active,#dw-primary-nav .dw-nav-transaction.active{color:#16b9d0!important}
      #dw-primary-nav .tab-btn.active .tab-icon,#dw-primary-nav .tab-btn.active span:last-child,#dw-primary-nav .dw-nav-transaction.active .tab-icon,#dw-primary-nav .dw-nav-transaction.active span:last-child{color:#16b9d0!important}
      #dw-primary-nav .dw-nav-transaction{color:#758288!important}
      #dw-primary-nav .dw-nav-transaction .tab-icon{width:30px!important;height:28px!important;margin:0!important;border-radius:0!important;background:transparent!important;color:#748188!important;font-size:1.4rem!important;font-weight:950!important;box-shadow:none!important}
      #dw-primary-nav .dw-nav-more .tab-icon{width:30px!important;height:28px!important;font-size:1.42rem!important;letter-spacing:.06em!important}
      .dw-trans-page .dw-trans-fab{display:grid!important;place-items:center!important;right:24px!important;bottom:calc(96px + env(safe-area-inset-bottom,0px))!important;z-index:135!important;width:64px!important;height:64px!important;border-radius:50%!important;background:#004b75!important;color:#fff!important;font-size:2.7rem!important;line-height:1!important;box-shadow:0 10px 28px rgba(0,35,62,.26)!important}
      .dw-trans-search{position:relative!important;z-index:2!important;cursor:text!important}
      .dw-trans-search input{pointer-events:auto!important;user-select:text!important;-webkit-user-select:text!important;touch-action:manipulation!important}
      .dw-trans-no-results{display:none;margin:10px 0 26px;padding:26px 18px;border-radius:18px;background:#fff;color:#66777e;text-align:center;font-weight:800;box-shadow:0 8px 22px rgba(15,81,107,.06)}
      .dw-trans-no-results.show{display:block}
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

  function normalizeSearch(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function filterTransactions(input) {
    const page = input.closest(".dw-trans-page");
    if (!page) return;
    const query = normalizeSearch(input.value);
    const rows = [...page.querySelectorAll(".dw-tx-row")];
    let visibleCount = 0;

    rows.forEach(row => {
      const matches = !query || normalizeSearch(row.textContent).includes(query);
      row.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    page.querySelectorAll(".dw-trans-card").forEach(card => {
      const cardRows = [...card.querySelectorAll(".dw-tx-row")];
      if (cardRows.length) card.hidden = !cardRows.some(row => !row.hidden);
    });

    const wrap = page.querySelector(".dw-trans-wrap");
    if (!wrap) return;
    let empty = wrap.querySelector(".dw-trans-no-results");
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "dw-trans-no-results";
      empty.textContent = "No transactions match your search.";
      wrap.appendChild(empty);
    }
    empty.classList.toggle("show", Boolean(query) && visibleCount === 0);
  }

  function prepareTransactionSearch(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    input.disabled = false;
    input.readOnly = false;
    input.removeAttribute("disabled");
    input.removeAttribute("readonly");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("inputmode", "search");
    input.setAttribute("aria-label", "Search transactions");
    return true;
  }

  function enableTransactionSearch() {
    const input = document.querySelector(".dw-trans-page .dw-trans-search input");
    if (!prepareTransactionSearch(input)) return false;
    filterTransactions(input);
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
      enableTransactionSearch();
      showTransactionActiveState();
    });
    setTimeout(() => {
      ensureTransactionsFab();
      enableTransactionSearch();
      showTransactionActiveState();
    }, 120);
  }

  function installTransactionSearchEvents() {
    document.addEventListener("pointerdown", event => {
      const searchBox = event.target.closest(".dw-trans-page .dw-trans-search");
      if (!searchBox) return;
      const input = searchBox.querySelector("input");
      if (!prepareTransactionSearch(input)) return;
      requestAnimationFrame(() => input.focus({ preventScroll: true }));
    }, true);

    document.addEventListener("input", event => {
      const input = event.target.closest(".dw-trans-page .dw-trans-search input");
      if (!input) return;
      filterTransactions(input);
    }, true);

    document.addEventListener("search", event => {
      const input = event.target.closest(".dw-trans-page .dw-trans-search input");
      if (!input) return;
      filterTransactions(input);
    }, true);
  }

  fetch(BASE_HELPER, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Unable to load DebtWizard transaction features.");
      return response.text();
    })
    .then(source => {
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-feature-28.js`);
      ensureTransactionNavigationStyle();
      installTransactionSearchEvents();

      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        const navigationReady = setTransactionListNavigation();
        const searchReady = enableTransactionSearch();
        if ((navigationReady && searchReady) || attempts >= 40) clearInterval(timer);
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
      setTimeout(enableTransactionSearch, 0);
      setTimeout(enableTransactionSearch, 500);
    })
    .catch(error => console.error(error));
})();