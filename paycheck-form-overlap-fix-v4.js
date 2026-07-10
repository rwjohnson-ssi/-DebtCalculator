(() => {
  "use strict";

  const BASE_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/761c066f58989fb45dd749a007ec6db139675cbe/paycheck-form-overlap-fix-v4.js?feature=29";
  const STORE = "debt-calculator-v2";

  function ensureTransactionNavigationStyle() {
    if (document.getElementById("dw-transaction-nav-v29")) return;
    const style = document.createElement("style");
    style.id = "dw-transaction-nav-v29";
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
      .dw-deleted-row{cursor:pointer}
      .dw-deleted-count{color:#68777d;font-size:.82rem;font-weight:800;margin-left:6px}
      .dw-deleted-page{position:fixed;inset:0;z-index:360;background:#f4f6f7;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:calc(36px + env(safe-area-inset-bottom,0px))}
      .dw-deleted-head{position:sticky;top:0;z-index:2;display:grid;grid-template-columns:72px 1fr 72px;align-items:center;padding:calc(18px + env(safe-area-inset-top,0px)) 20px 18px;background:#35c461;color:#fff;box-shadow:0 8px 22px rgba(19,115,55,.18)}
      .dw-deleted-back{border:0;background:transparent;color:#fff;font:inherit;font-size:1rem;font-weight:850;text-align:left;padding:8px 0}
      .dw-deleted-title{text-align:center;font-size:1.18rem;font-weight:950}
      .dw-deleted-body{padding:24px 22px}
      .dw-deleted-card{background:#fff;border-radius:20px;padding:8px 18px;box-shadow:0 10px 28px rgba(22,43,52,.07)}
      .dw-deleted-item{display:grid;grid-template-columns:54px minmax(0,1fr) auto;align-items:center;gap:14px;padding:16px 0;border-bottom:1px solid #e8edef}
      .dw-deleted-item:last-child{border-bottom:0}
      .dw-deleted-date{width:50px;height:50px;border:2px solid #e3eaed;border-radius:50%;display:grid;place-items:center;text-align:center;color:#53646b;font-size:.72rem;font-weight:900;line-height:1.05}
      .dw-deleted-name{color:#20272d;font-size:1.03rem;font-weight:850}
      .dw-deleted-meta{margin-top:4px;color:#087b96;font-size:.8rem;font-weight:800}
      .dw-deleted-amount{color:#20272d;font-weight:900;white-space:nowrap}
      .dw-deleted-empty{background:#fff;border-radius:20px;padding:42px 22px;color:#718087;text-align:center;font-weight:800;box-shadow:0 10px 28px rgba(22,43,52,.07)}
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
    updateDeletedCount();
    return true;
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
    catch { return {}; }
  }

  function saveState(state) {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function currencyValue(value) {
    const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  function money(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(currencyValue(value));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  }

  function allocationsFor(transaction) {
    if (Array.isArray(transaction?.allocations) && transaction.allocations.length) return transaction.allocations;
    if (transaction?.budgetItemId) return [{ budgetItemId: transaction.budgetItemId, budgetItemName: transaction.budgetItemName, amount: transaction.amount }];
    return [];
  }

  function deletedTransactions(state = loadState()) {
    const monthly = state.settings?.monthlyBudgets || {};
    return Object.entries(monthly).flatMap(([month, budget]) =>
      (Array.isArray(budget?.deletedTransactions) ? budget.deletedTransactions : []).map(transaction => ({ month, transaction }))
    ).sort((a, b) => String(b.transaction.deletedAt || b.transaction.date || "").localeCompare(String(a.transaction.deletedAt || a.transaction.date || "")));
  }

  function updateDeletedCount() {
    const row = document.querySelector(".dw-trans-page .dw-deleted-row");
    if (!row) return;
    const count = deletedTransactions().length;
    const label = row.children[1];
    if (!label) return;
    label.innerHTML = `Deleted${count ? `<span class="dw-deleted-count">${count}</span>` : ""}`;
  }

  function softDeleteCurrentTransaction() {
    const root = document.querySelector(".dw-edit-tx[data-dw-edit-transaction-root]");
    const id = root?.dataset.dwEditTransactionRoot;
    if (!id) return false;
    const state = loadState();
    const monthly = state.settings?.monthlyBudgets || {};
    let deleted = false;

    Object.entries(monthly).some(([month, budget]) => {
      const transactions = Array.isArray(budget?.transactions) ? budget.transactions : [];
      const index = transactions.findIndex(item => String(item.id) === String(id));
      if (index < 0) return false;
      const transaction = transactions[index];
      budget.deletedTransactions = Array.isArray(budget.deletedTransactions) ? budget.deletedTransactions : [];
      budget.deletedTransactions.unshift({ ...transaction, deletedAt: new Date().toISOString() });
      budget.transactions = transactions.filter((_, itemIndex) => itemIndex !== index);

      state.settings ||= {};
      state.settings.budgetTracking ||= {};
      const tracking = state.settings.budgetTracking[month] ||= {};
      allocationsFor(transaction).forEach(allocation => {
        const key = `${transaction.type === "income" ? "income" : "expense"}:${allocation.budgetItemId}`;
        tracking[key] = Math.max(0, currencyValue(tracking[key]) - currencyValue(allocation.amount));
      });
      deleted = true;
      return true;
    });

    if (!deleted) return false;
    saveState(state);
    root.remove();
    document.querySelector(".dw-budget-detail")?.remove();
    document.querySelector("#dw-primary-nav [data-edp-trans-nav]")?.click();
    setTimeout(() => { scheduleTransactionsPageSetup(); updateDeletedCount(); }, 120);
    return true;
  }

  function openDeletedTransactions() {
    ensureTransactionNavigationStyle();
    document.querySelector(".dw-deleted-page")?.remove();
    const rows = deletedTransactions();
    const content = rows.length ? `<section class="dw-deleted-card">${rows.map(({ month, transaction }) => {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(transaction.date || "") ? new Date(`${transaction.date}T12:00:00`) : new Date(transaction.deletedAt || Date.now());
      const monthPart = date.toLocaleDateString("en-US", { month: "short" });
      const dayPart = date.toLocaleDateString("en-US", { day: "numeric" });
      const name = transaction.merchant || transaction.source || "Transaction";
      const categories = allocationsFor(transaction).map(item => item.budgetItemName).filter(Boolean).join(", ") || transaction.budgetItemName || transaction.category || "Unassigned";
      return `<article class="dw-deleted-item"><span class="dw-deleted-date">${esc(monthPart)}<br>${esc(dayPart)}</span><span><div class="dw-deleted-name">${esc(name)}</div><div class="dw-deleted-meta">${esc(categories)} · ${esc(month)}</div></span><span class="dw-deleted-amount">${transaction.type === "income" ? "+" : "-"}${money(transaction.amount)}</span></article>`;
    }).join("")}</section>` : '<div class="dw-deleted-empty">No deleted transactions yet.</div>';
    document.body.insertAdjacentHTML("beforeend", `<section class="dw-deleted-page" role="dialog" aria-modal="true" aria-label="Deleted transactions"><header class="dw-deleted-head"><button type="button" class="dw-deleted-back" data-dw-deleted-close>‹ Back</button><div class="dw-deleted-title">Deleted</div><span></span></header><main class="dw-deleted-body">${content}</main></section>`);
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
      updateDeletedCount();
    });
    setTimeout(() => {
      ensureTransactionsFab();
      enableTransactionSearch();
      showTransactionActiveState();
      updateDeletedCount();
    }, 120);
  }

  function installTransactionSearchEvents() {
    document.addEventListener("pointerdown", event => {
      const deleteButton = event.target.closest("[data-dw-delete-transaction]");
      if (deleteButton) {
        deleteButton.removeAttribute("data-dw-delete-transaction");
        deleteButton.setAttribute("data-dw-soft-delete-transaction", "");
      }
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
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-feature-29.js`);
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
        if (event.target.closest("[data-dw-soft-delete-transaction]")) {
          event.preventDefault();
          event.stopPropagation();
          if (window.confirm("Delete this transaction?")) softDeleteCurrentTransaction();
          return;
        }
        if (event.target.closest(".dw-trans-page .dw-deleted-row")) {
          event.preventDefault();
          openDeletedTransactions();
          return;
        }
        if (event.target.closest("[data-dw-deleted-close]")) {
          event.preventDefault();
          document.querySelector(".dw-deleted-page")?.remove();
          return;
        }
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
      setTimeout(updateDeletedCount, 500);
    })
    .catch(error => console.error(error));
})();