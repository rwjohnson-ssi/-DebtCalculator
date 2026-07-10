(() => {
  "use strict";

  const LEGACY_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/1d8106c5816f07c04d4568f6da97aee27a10cff4/paycheck-form-overlap-fix-v4.js?helper=21";
  const STORE = "debt-calculator-v2";

  const currencyValue = value => {
    const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(currencyValue(value));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  const clone = value => JSON.parse(JSON.stringify(value));

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
  function saveState(state) {
    localStorage.setItem(STORE, JSON.stringify(state));
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
      .dw-budget-activity{width:100%;border:0;background:transparent;display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 0;border-top:1px solid #e8edef;text-align:left;font:inherit}.dw-budget-activity:first-of-type{border-top:0}.dw-budget-activity:active{background:#f7fbfc}.dw-budget-date{width:48px;height:48px;border:2px solid #e5ecef;border-radius:50%;display:grid;place-items:center;text-align:center;color:#53646b;font-size:.72rem;font-weight:900;line-height:1.05}.dw-budget-activity-name{font-weight:850;color:#20282d}.dw-budget-activity-note{margin-top:3px;color:#087b96;font-size:.78rem;font-weight:800}.dw-budget-activity-amount{font-weight:900;color:#20282d;white-space:nowrap}.dw-budget-empty{padding:22px 0;color:#77868c;text-align:center}
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
    saveState(context.state);
    input.value = money(amount);
    document.querySelector("[data-dw-detail-remaining]")?.replaceChildren(document.createTextNode(money(Math.max(0, amount - context.tracked))));
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
      return `<button type="button" class="dw-budget-activity" data-dw-edit-transaction="${esc(transaction.id)}"><span class="dw-budget-date">${esc(label[0])}<br>${esc(label[1] || "")}</span><span><div class="dw-budget-activity-name">${esc(name)}</div><div class="dw-budget-activity-note">${esc(context.item.name || "Budget item")}</div></span><span class="dw-budget-activity-amount">${context.kind === "income" ? "+" : "-"}${money(transaction.appliedAmount)}</span></button>`;
    }).join("") : '<div class="dw-budget-empty">No transactions have been applied to this item yet.</div>';
    document.body.insertAdjacentHTML("beforeend", `<section class="dw-budget-detail" role="dialog" aria-modal="true" data-dw-budget-detail-root><header class="dw-budget-detail-head"><button type="button" class="dw-budget-detail-back" data-dw-budget-detail-close>‹ Budget</button><h1 class="dw-budget-detail-title">${esc(context.item.name || "Budget item")}</h1><div class="dw-budget-detail-summary"><div><small>${context.kind === "income" ? "Received" : "Spent"}</small><strong>${money(context.tracked)}</strong></div><label><small style="text-align:right">Planned</small><input class="dw-budget-planned" inputmode="decimal" value="${money(context.planned)}" aria-label="Planned amount"></label></div></header><main class="dw-budget-detail-body"><section class="dw-budget-detail-card"><h2>This month</h2><div class="dw-budget-metrics"><div class="dw-budget-metric"><span>${context.kind === "income" ? "Received" : "Spent"}</span><strong>${money(context.tracked)}</strong></div><div class="dw-budget-metric"><span>Remaining</span><strong data-dw-detail-remaining>${money(context.remaining)}</strong></div></div></section><section class="dw-budget-detail-card"><h2>Activity this month</h2>${activity}</section></main></section>`);
    const input = document.querySelector(".dw-budget-planned");
    input?.addEventListener("focus", () => { input.value = editableValue(input.value); input.select(); });
    input?.addEventListener("blur", () => savePlannedAmount(context, input));
    input?.addEventListener("keydown", event => { if (event.key === "Enter") input.blur(); });
  }

  function allTransactions() {
    const state = stateData();
    const monthly = state.settings?.monthlyBudgets || {};
    const rows = [];
    Object.entries(monthly).forEach(([month, budget]) => {
      (Array.isArray(budget?.transactions) ? budget.transactions : []).forEach(transaction => rows.push({ month, transaction, budget, state }));
    });
    return rows;
  }
  function transactionContext(id) {
    return allTransactions().find(entry => String(entry.transaction.id) === String(id)) || null;
  }
  function transactionAllocations(transaction) {
    if (Array.isArray(transaction.allocations) && transaction.allocations.length) {
      return transaction.allocations.map(item => ({
        budgetItemId: String(item.budgetItemId || ""),
        budgetItemName: String(item.budgetItemName || "Budget item"),
        amount: currencyValue(item.amount)
      }));
    }
    if (transaction.budgetItemId) {
      return [{ budgetItemId: String(transaction.budgetItemId), budgetItemName: String(transaction.budgetItemName || "Budget item"), amount: currencyValue(transaction.amount) }];
    }
    return [];
  }
  function updateTracking(state, month, type, allocations, direction) {
    state.settings ||= {};
    state.settings.budgetTracking ||= {};
    const tracking = state.settings.budgetTracking[month] ||= {};
    allocations.forEach(item => {
      const key = `${type === "income" ? "income" : "expense"}:${item.budgetItemId}`;
      tracking[key] = Math.max(0, currencyValue(tracking[key]) + direction * currencyValue(item.amount));
    });
  }
  function ensureTransactionEditStyle() {
    if (document.getElementById("dw-transaction-edit-style")) return;
    const style = document.createElement("style");
    style.id = "dw-transaction-edit-style";
    style.textContent = `
      .dw-edit-tx{position:fixed;inset:0;z-index:320;background:#f4f7f8;overflow-y:auto;-webkit-overflow-scrolling:touch}
      .dw-edit-tx-head{position:sticky;top:0;z-index:2;padding:calc(14px + env(safe-area-inset-top,0px)) 24px 20px;background:linear-gradient(135deg,#087b96,#27bfd2);color:#fff;box-shadow:0 8px 22px rgba(8,123,150,.18)}
      .dw-edit-tx-top{display:grid;grid-template-columns:80px 1fr 80px;align-items:center}.dw-edit-tx-top strong{text-align:center;font-size:1.15rem}.dw-edit-tx-link{border:0;background:transparent;color:#fff;font:inherit;font-weight:850}.dw-edit-tx-link:last-child{text-align:right}
      .dw-edit-tx-body{padding:22px 22px calc(120px + env(safe-area-inset-bottom,0px))}.dw-edit-tx-card{background:#fff;border:1px solid #e0e9ec;border-radius:20px;padding:0 20px;margin-bottom:18px;box-shadow:0 8px 22px rgba(15,81,107,.06)}
      .dw-edit-tx-field{display:grid;grid-template-columns:1fr 1.2fr;gap:14px;align-items:center;min-height:68px;border-bottom:1px solid #e8edef}.dw-edit-tx-field:last-child{border-bottom:0}.dw-edit-tx-field span{font-weight:800;color:#24343b}.dw-edit-tx-field input,.dw-edit-tx-field textarea{width:100%;box-sizing:border-box;border:0;outline:0;background:transparent;color:#087b96;text-align:right;font:inherit;font-size:1rem}.dw-edit-tx-field textarea{text-align:left;resize:none;padding:16px 0}
      .dw-edit-allocation{display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:12px;align-items:center;min-height:66px;border-bottom:1px solid #e8edef}.dw-edit-allocation:last-child{border-bottom:0}.dw-edit-allocation strong{color:#24343b}.dw-edit-allocation input{width:100%;box-sizing:border-box;border:0;border-radius:10px;outline:0;background:#f3fafb;color:#087b96;text-align:right;font:inherit;font-weight:850;padding:12px}
      .dw-edit-split-status{text-align:center;color:#53646b;font-weight:850;margin:-4px 0 18px}.dw-edit-split-status.over{color:#b8443d}.dw-edit-delete{width:100%;border:1px solid #f1c8c5;border-radius:16px;background:#fff1f0;color:#c33d35;font:inherit;font-weight:900;padding:17px}.dw-edit-delete:active{background:#ffe8e6}
      .dw-trans-page .dw-tx-row{cursor:pointer}.dw-trans-page .dw-tx-row:active{background:#f7fbfc}
    `;
    document.head.appendChild(style);
  }
  function sortedMonthTransactions() {
    const month = currentMonth();
    const state = stateData();
    const budget = state.settings?.monthlyBudgets?.[month] || {};
    return [...(Array.isArray(budget.transactions) ? budget.transactions : [])].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }
  function openTransactionEditor(id) {
    const context = transactionContext(id);
    if (!context) return;
    ensureTransactionEditStyle();
    document.querySelector(".dw-edit-tx")?.remove();
    const transaction = clone(context.transaction);
    const allocations = transactionAllocations(transaction);
    const type = transaction.type === "income" ? "income" : "expense";
    const party = type === "income" ? (transaction.source || "") : (transaction.merchant || "");
    const allocationRows = allocations.length ? allocations.map(item => `<div class="dw-edit-allocation" data-dw-edit-allocation="${esc(item.budgetItemId)}"><strong>${esc(item.budgetItemName)}</strong><input type="text" inputmode="decimal" value="${money(item.amount)}" data-dw-edit-allocation-value aria-label="Amount for ${esc(item.budgetItemName)}"></div>`).join("") : '<div class="dw-budget-empty">No budget item is assigned.</div>';
    document.body.insertAdjacentHTML("beforeend", `<section class="dw-edit-tx" role="dialog" aria-modal="true" data-dw-edit-transaction-root="${esc(id)}"><header class="dw-edit-tx-head"><div class="dw-edit-tx-top"><button type="button" class="dw-edit-tx-link" data-dw-edit-cancel>Cancel</button><strong>Edit Transaction</strong><button type="button" class="dw-edit-tx-link" data-dw-edit-save>Done</button></div></header><main class="dw-edit-tx-body"><section class="dw-edit-tx-card"><label class="dw-edit-tx-field"><span>Date</span><input type="date" data-dw-edit-date value="${esc(transaction.date || "")}"></label><label class="dw-edit-tx-field"><span>Amount</span><input type="text" inputmode="decimal" data-dw-edit-amount value="${money(transaction.amount)}"></label><label class="dw-edit-tx-field"><span>${type === "income" ? "Source" : "Merchant"}</span><input type="text" data-dw-edit-party value="${esc(party)}"></label></section><section class="dw-edit-tx-card">${allocationRows}</section><div class="dw-edit-split-status" data-dw-edit-status></div><section class="dw-edit-tx-card"><label class="dw-edit-tx-field"><span>Note</span><textarea rows="3" data-dw-edit-note>${esc(transaction.note || "")}</textarea></label></section><button type="button" class="dw-edit-delete" data-dw-delete-transaction>Delete Transaction</button></main></section>`);
    refreshEditStatus();
  }
  function editRoot() {
    return document.querySelector(".dw-edit-tx");
  }
  function rawInput(input) {
    if (!input) return 0;
    return currencyValue(input.value);
  }
  function editAllocations() {
    return [...document.querySelectorAll("[data-dw-edit-allocation]")].map(row => ({
      budgetItemId: row.dataset.dwEditAllocation,
      budgetItemName: row.querySelector("strong")?.textContent || "Budget item",
      amount: rawInput(row.querySelector("[data-dw-edit-allocation-value]"))
    }));
  }
  function refreshEditStatus() {
    const root = editRoot();
    if (!root) return;
    const total = rawInput(root.querySelector("[data-dw-edit-amount]"));
    const allocated = editAllocations().reduce((sum, item) => sum + item.amount, 0);
    const left = total - allocated;
    const status = root.querySelector("[data-dw-edit-status]");
    if (!status) return;
    status.classList.toggle("over", left < -0.004);
    status.textContent = left < -0.004 ? `${money(Math.abs(left))} Over Assigned` : `${money(left)} Left to Split`;
  }
  function formatEditorCurrency(input) {
    if (input) input.value = money(rawInput(input));
  }
  function saveEditedTransaction() {
    const root = editRoot();
    if (!root) return;
    const id = root.dataset.dwEditTransactionRoot;
    const context = transactionContext(id);
    if (!context) return;
    const oldTransaction = context.transaction;
    const oldAllocations = transactionAllocations(oldTransaction);
    const allocations = editAllocations();
    const amount = rawInput(root.querySelector("[data-dw-edit-amount]"));
    const allocated = allocations.reduce((sum, item) => sum + item.amount, 0);
    if (amount <= 0.004 || Math.abs(amount - allocated) > 0.004) return;
    updateTracking(context.state, context.month, oldTransaction.type, oldAllocations, -1);
    const date = root.querySelector("[data-dw-edit-date]")?.value || oldTransaction.date;
    const party = root.querySelector("[data-dw-edit-party]")?.value.trim() || (oldTransaction.type === "income" ? "Income" : "Expense");
    oldTransaction.date = date;
    oldTransaction.amount = amount;
    oldTransaction.allocations = allocations;
    oldTransaction.budgetItemId = allocations.length === 1 ? allocations[0].budgetItemId : "";
    oldTransaction.budgetItemName = allocations.length === 1 ? allocations[0].budgetItemName : allocations.map(item => item.budgetItemName).join(", ");
    oldTransaction.note = root.querySelector("[data-dw-edit-note]")?.value.trim() || "";
    if (oldTransaction.type === "income") oldTransaction.source = party;
    else oldTransaction.merchant = party;
    updateTracking(context.state, context.month, oldTransaction.type, allocations, 1);
    saveState(context.state);
    root.remove();
    document.querySelector(".dw-budget-detail")?.remove();
    document.querySelector('#tabbar .tab-btn[data-page="budget"]')?.click();
  }
  function deleteEditedTransaction() {
    const root = editRoot();
    if (!root) return;
    const context = transactionContext(root.dataset.dwEditTransactionRoot);
    if (!context) return;
    updateTracking(context.state, context.month, context.transaction.type, transactionAllocations(context.transaction), -1);
    context.budget.transactions = (Array.isArray(context.budget.transactions) ? context.budget.transactions : []).filter(item => String(item.id) !== String(context.transaction.id));
    saveState(context.state);
    root.remove();
    document.querySelector(".dw-budget-detail")?.remove();
    document.querySelector('#tabbar .tab-btn[data-page="budget"]')?.click();
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
        return;
      }
      const activity = event.target.closest("[data-dw-edit-transaction]");
      if (activity) {
        event.preventDefault();
        openTransactionEditor(activity.dataset.dwEditTransaction);
        return;
      }
      const listRow = event.target.closest(".dw-trans-page .dw-tx-row");
      if (listRow) {
        event.preventDefault();
        const rows = [...document.querySelectorAll(".dw-trans-page .dw-tx-row")];
        const transaction = sortedMonthTransactions()[rows.indexOf(listRow)];
        if (transaction?.id) openTransactionEditor(transaction.id);
        return;
      }
      if (event.target.closest("[data-dw-edit-cancel]")) {
        event.preventDefault();
        editRoot()?.remove();
        return;
      }
      if (event.target.closest("[data-dw-edit-save]")) {
        event.preventDefault();
        saveEditedTransaction();
        return;
      }
      if (event.target.closest("[data-dw-delete-transaction]")) {
        event.preventDefault();
        if (window.confirm("Delete this transaction?")) deleteEditedTransaction();
      }
    }, true);
    document.addEventListener("focusin", event => {
      const input = event.target.closest("[data-dw-edit-amount],[data-dw-edit-allocation-value]");
      if (!input) return;
      input.value = editableValue(input.value);
      input.select();
    }, true);
    document.addEventListener("focusout", event => {
      const input = event.target.closest("[data-dw-edit-amount],[data-dw-edit-allocation-value]");
      if (!input) return;
      formatEditorCurrency(input);
      refreshEditStatus();
    }, true);
    document.addEventListener("input", event => {
      if (event.target.closest("[data-dw-edit-amount],[data-dw-edit-allocation-value]")) refreshEditStatus();
    }, true);
  }

  fetch(LEGACY_HELPER, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Unable to load DebtWizard helper.");
      return response.text();
    })
    .then(source => {
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-v21.js`);
      installSplitTypingFix();
      installPrimaryNavigationEvents();
      installBudgetDetailEvents();
      installPersistentNavigation();
      ensureTransactionEditStyle();
      formatAllSplits();
    })
    .catch(error => {
      console.error(error);
      installSplitTypingFix();
      installPrimaryNavigationEvents();
      installBudgetDetailEvents();
      installPersistentNavigation();
      ensureTransactionEditStyle();
    });
})();