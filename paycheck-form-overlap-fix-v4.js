(() => {
  "use strict";

  const LEGACY_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/1d8106c5816f07c04d4568f6da97aee27a10cff4/paycheck-form-overlap-fix-v4.js?helper=20";
  const STORE = "debt-calculator-v2";

  const currencyValue = value => {
    const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(currencyValue(value));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));

  function isSplitInput(input) {
    return input instanceof HTMLInputElement && input.classList.contains("dw-tx-split-input");
  }
  function editableValue(value) {
    const amount = currencyValue(value);
    return amount ? String(Number(amount.toFixed(2))) : "";
  }
  function setRawSplitValue(input) {
    if (!isSplitInput(input)) return;
    const raw = editableValue(input.dataset.rawValue || input.value);
    input.value = raw;
    input.dataset.rawValue = raw;
    requestAnimationFrame(() => { try { input.setSelectionRange(raw.length, raw.length); } catch {} });
  }
  function formatSplitValue(input) {
    if (!isSplitInput(input)) return;
    const amount = currencyValue(input.value || input.dataset.rawValue);
    input.dataset.rawValue = amount ? amount.toFixed(2) : "";
    input.value = amount ? money(amount) : "";
  }
  function formatAllSplits() {
    document.querySelectorAll(".dw-tx-split-input").forEach(formatSplitValue);
  }
  function installSplitTypingFix() {
    document.addEventListener("focusin", event => {
      if (isSplitInput(event.target)) requestAnimationFrame(() => setRawSplitValue(event.target));
    });
    document.addEventListener("input", event => {
      if (isSplitInput(event.target)) event.target.dataset.rawValue = event.target.value;
    }, true);
    document.addEventListener("focusout", event => {
      if (isSplitInput(event.target)) requestAnimationFrame(() => formatSplitValue(event.target));
    }, true);
    document.addEventListener("click", event => {
      const action = event.target.closest(".dw-tx-done,[data-dw-selector-done],.dw-tx-budget-row,[data-edp-trans-add]");
      if (!action) return;
      const active = document.activeElement;
      if (isSplitInput(active)) { formatSplitValue(active); active.blur(); }
      requestAnimationFrame(formatAllSplits);
    }, true);
    document.addEventListener("keydown", event => {
      if (event.key === "Enter" && isSplitInput(event.target)) {
        formatSplitValue(event.target);
        event.target.blur();
      }
    }, true);
  }

  function ensurePrimaryNavigationStyle() {
    if (document.getElementById("dw-persistent-nav-style")) return;
    const style = document.createElement("style");
    style.id = "dw-persistent-nav-style";
    style.textContent = `
      #tabbar{display:none!important}
      #dw-primary-nav{position:fixed;left:0;right:0;bottom:0;z-index:120;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:end;overflow:visible;background:#fff;border-top:1px solid #e1e8ea;padding:5px 0 calc(5px + env(safe-area-inset-bottom,0px));box-shadow:0 -4px 18px rgba(15,45,58,.07)}
      #dw-primary-nav .tab-btn,#dw-primary-nav .dw-nav-more,#dw-primary-nav .dw-nav-transaction{appearance:none;border:0;background:transparent;min-width:0;color:#929da2;font:inherit;font-size:.72rem;font-weight:800;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:4px 2px}
      #dw-primary-nav .tab-icon{display:grid;place-items:center;height:27px;font-size:1.35rem;line-height:1}
      #dw-primary-nav .tab-btn.active{color:#20bfd7}
      #dw-primary-nav .dw-nav-transaction .tab-icon{width:58px;height:58px;margin-top:-27px;border-radius:50%;background:#004b75;color:#fff;font-size:2.25rem;font-weight:400;box-shadow:0 8px 20px rgba(0,35,62,.27)}
      #dw-primary-nav .dw-nav-transaction span:last-child{color:#007f96}
      #dw-primary-nav .dw-nav-more .tab-icon{font-size:1.45rem;letter-spacing:.08em}
      #app-shell{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))}
    `;
    document.head.appendChild(style);
  }
  function syncPrimaryNavigation(page) {
    document.getElementById("dw-primary-nav")?.querySelectorAll("[data-dw-page]").forEach(button => button.classList.toggle("active", button.dataset.dwPage === page));
  }
  function installPersistentNavigation() {
    ensurePrimaryNavigationStyle();
    const generatedBar = document.getElementById("tabbar");
    if (!generatedBar) return;
    generatedBar.hidden = true;
    generatedBar.setAttribute("aria-hidden", "true");
    let nav = document.getElementById("dw-primary-nav");
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "dw-primary-nav";
      nav.className = "tabbar";
      nav.setAttribute("aria-label", "Primary navigation");
      nav.innerHTML = `<button type="button" class="tab-btn" data-dw-page="home"><span class="tab-icon">⌂</span><span>Home</span></button><button type="button" class="tab-btn" data-dw-page="debts"><span class="tab-icon">◔</span><span>Debts</span></button><button type="button" class="dw-nav-transaction" data-edp-trans-add aria-label="Add transaction"><span class="tab-icon">+</span><span>Transaction</span></button><button type="button" class="tab-btn" data-dw-page="budget"><span class="tab-icon">$</span><span>Budget</span></button><button type="button" class="dw-nav-more" aria-label="More navigation"><span class="tab-icon">•••</span><span>More</span></button>`;
      document.body.appendChild(nav);
    } else if (nav.parentElement !== document.body) document.body.appendChild(nav);
    syncPrimaryNavigation(generatedBar.querySelector(".tab-btn.active")?.dataset.page || "home");
  }
  function installPrimaryNavigationEvents() {
    document.addEventListener("click", event => {
      const pageButton = event.target.closest("#dw-primary-nav [data-dw-page]");
      if (pageButton) {
        const page = pageButton.dataset.dwPage;
        document.querySelector(`#tabbar .tab-btn[data-page="${page}"]`)?.click();
        syncPrimaryNavigation(page);
        return;
      }
      const nativeButton = event.target.closest('#tabbar .tab-btn[data-page]');
      if (nativeButton) syncPrimaryNavigation(nativeButton.dataset.page);
      if (event.target.closest(".dw-tx-done.dw-save-ready")) {
        requestAnimationFrame(installPersistentNavigation);
        setTimeout(installPersistentNavigation, 120);
      }
    }, true);
  }

  function currentMonth() {
    const title = document.querySelector(".hero-title")?.textContent?.trim() || "";
    const date = new Date(title && !Number.isNaN(Date.parse(`${title} 1`)) ? `${title} 1` : Date.now());
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  function stateData() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
  }
  function itemContext(trigger) {
    const state = stateData();
    const month = currentMonth();
    const settings = state.settings && typeof state.settings === "object" ? state.settings : {};
    const budget = settings.monthlyBudgets?.[month] || {};
    const kind = trigger.dataset.kind === "income" ? "income" : "expense";
    const id = String(trigger.dataset.id || "");
    const source = kind === "income" ? (Array.isArray(budget.incomeItems) ? budget.incomeItems : []) : (Array.isArray(budget.bills) ? budget.bills : []);
    const item = source.find(entry => String(entry.id) === id);
    if (!item) return null;
    const tracking = settings.budgetTracking?.[month] || {};
    const tracked = currencyValue(tracking[`${kind}:${id}`]);
    const planned = currencyValue(item.amount);
    const transactions = (Array.isArray(budget.transactions) ? budget.transactions : []).flatMap(transaction => {
      const allocations = Array.isArray(transaction.allocations) ? transaction.allocations : [];
      const allocation = allocations.find(entry => String(entry.budgetItemId) === id) || (String(transaction.budgetItemId || "") === id ? { amount: transaction.amount } : null);
      return allocation ? [{ ...transaction, appliedAmount: currencyValue(allocation.amount) }] : [];
    }).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    return { state, settings, budget, month, kind, id, item, planned, tracked, remaining: Math.max(0, planned - tracked), transactions };
  }
  function ensureBudgetDetailStyle() {
    if (document.getElementById("dw-budget-detail-style")) return;
    const style = document.createElement("style");
    style.id = "dw-budget-detail-style";
    style.textContent = `
      .dw-budget-detail{position:fixed;inset:0;z-index:260;background:#f4f7f8;overflow-y:auto;padding-bottom:calc(95px + env(safe-area-inset-bottom,0px));-webkit-overflow-scrolling:touch}
      .dw-budget-detail-head{position:relative;padding:calc(20px + env(safe-area-inset-top,0px)) 24px 30px;background:linear-gradient(135deg,#087b96,#27bfd2);color:#fff}
      .dw-budget-detail-back{border:0;background:transparent;color:#fff;font:inherit;font-size:1rem;font-weight:850;padding:4px 0 18px}
      .dw-budget-detail-title{margin:0;font-size:2rem;line-height:1.08;font-weight:950}
      .dw-budget-detail-summary{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:end;margin-top:18px}
      .dw-budget-detail-summary small{display:block;font-size:.82rem;opacity:.9}.dw-budget-detail-summary strong{display:block;font-size:1.45rem;margin-top:4px}
      .dw-budget-planned{width:150px;border:0;border-bottom:2px solid rgba(255,255,255,.7);outline:0;background:transparent;color:#fff;text-align:right;font:inherit;font-size:1.45rem;font-weight:950;padding:4px 0}
      .dw-budget-detail-body{padding:22px}.dw-budget-detail-card{background:#fff;border:1px solid #e0e9ec;border-radius:20px;padding:18px 20px;margin-bottom:18px;box-shadow:0 8px 22px rgba(15,81,107,.06)}
      .dw-budget-detail-card h2{margin:0 0 12px;color:#183f50;font-size:1.14rem}.dw-budget-metrics{display:grid;grid-template-columns:1fr 1fr;gap:12px}.dw-budget-metric{padding:14px;border-radius:14px;background:#f3fafb}.dw-budget-metric span{display:block;color:#75858b;font-size:.78rem;font-weight:800}.dw-budget-metric strong{display:block;margin-top:4px;color:#183f50;font-size:1.25rem}
      .dw-budget-activity{display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 0;border-top:1px solid #e8edef}.dw-budget-activity:first-of-type{border-top:0}.dw-budget-date{width:48px;height:48px;border:2px solid #e5ecef;border-radius:50%;display:grid;place-items:center;text-align:center;color:#53646b;font-size:.72rem;font-weight:900;line-height:1.05}.dw-budget-activity-name{font-weight:850;color:#20282d}.dw-budget-activity-note{margin-top:3px;color:#087b96;font-size:.78rem;font-weight:800}.dw-budget-activity-amount{font-weight:900;color:#20282d;white-space:nowrap}.dw-budget-empty{padding:22px 0;color:#77868c;text-align:center}
    `;
    document.head.appendChild(style);
  }
  function savePlannedAmount(context, input) {
    const amount = currencyValue(input.value);
    context.item.amount = amount;
    if (context.kind === "income") {
      const items = Array.isArray(context.budget.incomeItems) ? context.budget.incomeItems : [];
      context.budget.incomeSources = items.reduce((totals, item) => {
        const key = item.type || "otherIncome";
        totals[key] = currencyValue(totals[key]) + currencyValue(item.amount);
        return totals;
      }, {});
      context.settings.incomeSources = { ...context.budget.incomeSources };
    } else context.settings.budgetBills = context.budget.bills;
    localStorage.setItem(STORE, JSON.stringify(context.state));
    input.value = money(amount);
    const tracked = context.tracked;
    const remaining = Math.max(0, amount - tracked);
    document.querySelector("[data-dw-detail-remaining]")?.replaceChildren(document.createTextNode(money(remaining)));
  }
  function openBudgetDetail(trigger) {
    const context = itemContext(trigger);
    if (!context) return;
    ensureBudgetDetailStyle();
    document.querySelector(".dw-budget-detail")?.remove();
    const activity = context.transactions.length ? context.transactions.map(transaction => {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(transaction.date || "") ? new Date(`${transaction.date}T12:00:00`) : new Date();
      const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).split(" ");
      const name = transaction.merchant || transaction.source || "Transaction";
      return `<div class="dw-budget-activity"><span class="dw-budget-date">${esc(label[0])}<br>${esc(label[1] || "")}</span><span><div class="dw-budget-activity-name">${esc(name)}</div><div class="dw-budget-activity-note">${esc(context.item.name || "Budget item")}</div></span><span class="dw-budget-activity-amount">${context.kind === "income" ? "+" : "-"}${money(transaction.appliedAmount)}</span></div>`;
    }).join("") : '<div class="dw-budget-empty">No transactions have been applied to this item yet.</div>';
    document.body.insertAdjacentHTML("beforeend", `<section class="dw-budget-detail" role="dialog" aria-modal="true" data-dw-budget-detail-root><header class="dw-budget-detail-head"><button type="button" class="dw-budget-detail-back" data-dw-budget-detail-close>‹ Budget</button><h1 class="dw-budget-detail-title">${esc(context.item.name || "Budget item")}</h1><div class="dw-budget-detail-summary"><div><small>${context.kind === "income" ? "Received" : "Spent"}</small><strong>${money(context.tracked)}</strong></div><label><small style="text-align:right">Planned</small><input class="dw-budget-planned" inputmode="decimal" value="${money(context.planned)}" aria-label="Planned amount"></label></div></header><main class="dw-budget-detail-body"><section class="dw-budget-detail-card"><h2>This month</h2><div class="dw-budget-metrics"><div class="dw-budget-metric"><span>${context.kind === "income" ? "Received" : "Spent"}</span><strong>${money(context.tracked)}</strong></div><div class="dw-budget-metric"><span>Remaining</span><strong data-dw-detail-remaining>${money(context.remaining)}</strong></div></div></section><section class="dw-budget-detail-card"><h2>Activity this month</h2>${activity}</section></main></section>`);
    const input = document.querySelector(".dw-budget-planned");
    input?.addEventListener("focus", () => { input.value = editableValue(input.value); input.select(); });
    input?.addEventListener("blur", () => savePlannedAmount(context, input));
    input?.addEventListener("keydown", event => { if (event.key === "Enter") input.blur(); });
  }
  function installBudgetDetailEvents() {
    document.addEventListener("pointerdown", event => {
      const edit = event.target.closest("#budget-form [data-edp-act]");
      if (!edit) return;
      edit.dataset.dwOriginalAct = edit.dataset.edpAct || "edit";
      edit.removeAttribute("data-edp-act");
      edit.setAttribute("data-dw-budget-detail", "");
    }, true);
    document.addEventListener("click", event => {
      const trigger = event.target.closest("[data-dw-budget-detail]");
      if (trigger) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openBudgetDetail(trigger);
        return;
      }
      if (event.target.closest("[data-dw-budget-detail-close]")) {
        event.preventDefault();
        document.querySelector(".dw-budget-detail")?.remove();
      }
    }, true);
  }

  fetch(LEGACY_HELPER, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Unable to load DebtWizard helper.");
      return response.text();
    })
    .then(source => {
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-v20.js`);
      installSplitTypingFix();
      installPrimaryNavigationEvents();
      installBudgetDetailEvents();
      installPersistentNavigation();
      formatAllSplits();
    })
    .catch(error => {
      console.error(error);
      installSplitTypingFix();
      installPrimaryNavigationEvents();
      installBudgetDetailEvents();
      installPersistentNavigation();
    });
})();