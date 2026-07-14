(() => {
  "use strict";
  const T = window.DWTx76 = {};
  T.host = document.getElementById("app-host");
  T.STORAGE_KEY = "debt-calculator-v2";
  T.PAGE_KEY = "debtwizard-active-page";
  T.money = new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" });
  T.validMonth = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ""));
  T.number = value => { const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? parsed : 0; };
  T.cents = value => Math.max(0, Math.round((T.number(value) + Number.EPSILON) * 100) / 100);
  T.esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  T.todayKey = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
  T.currentMonth = () => T.todayKey().slice(0, 7);
  T.monthLabel = value => { const [year, month] = String(value).split("-").map(Number); return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month:"long", year:"numeric" }); };
  T.dayParts = value => { const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? new Date(`${value}T12:00:00`) : new Date(); return { month:date.toLocaleDateString("en-US", { month:"short" }), day:date.toLocaleDateString("en-US", { day:"numeric" }) }; };
  T.uid = () => `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  T.readState = win => { try { const parsed = JSON.parse(win.localStorage.getItem(T.STORAGE_KEY)); return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; } };
  T.writeState = (win, state) => win.localStorage.setItem(T.STORAGE_KEY, JSON.stringify(state));
  T.ensureState = state => {
    state.settings = state.settings && typeof state.settings === "object" ? state.settings : {};
    state.settings.monthlyBudgets = state.settings.monthlyBudgets && typeof state.settings.monthlyBudgets === "object" ? state.settings.monthlyBudgets : {};
    state.settings.budgetTracking = state.settings.budgetTracking && typeof state.settings.budgetTracking === "object" ? state.settings.budgetTracking : {};
    state.ui = state.ui && typeof state.ui === "object" ? state.ui : {};
    return state;
  };
  T.budgetFor = (state, month, create = false) => {
    const settings = T.ensureState(state).settings;
    let budget = settings.monthlyBudgets[month];
    if ((!budget || typeof budget !== "object") && create) {
      budget = { incomeSources:{}, budgetCategories:{}, incomeItems:[], bills:[], transactions:[], deletedTransactions:[], schedule:{ buffer:0, income:{}, budget:{} }, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
      settings.monthlyBudgets[month] = budget;
    }
    if (!budget || typeof budget !== "object") return null;
    budget.incomeItems = Array.isArray(budget.incomeItems) ? budget.incomeItems : [];
    budget.bills = Array.isArray(budget.bills) ? budget.bills : [];
    budget.transactions = Array.isArray(budget.transactions) ? budget.transactions : [];
    budget.deletedTransactions = Array.isArray(budget.deletedTransactions) ? budget.deletedTransactions : [];
    return budget;
  };
  T.selectedMonth = state => T.validMonth(state.ui?.budgetMonth) ? state.ui.budgetMonth : T.currentMonth();
  T.transactionButton = target => {
    const button = target?.closest?.("#dw-primary-nav button,#tabbar button,#dw-primary-nav [role='button'],#tabbar [role='button'],#dw-primary-nav a,#tabbar a");
    if (!button) return null;
    const page = String(button.dataset.page || button.dataset.dwPage || "").trim().toLowerCase();
    const text = `${button.getAttribute("aria-label") || ""} ${button.textContent || ""}`.replace(/\s+/g, " ").trim().toLowerCase();
    return button.matches(".dw-nav-transaction,[data-edp-trans-nav],[data-edp-trans-add],[data-dw-transaction-route]")
      || page === "transaction"
      || page === "transactions"
      || /^(add\s+)?transactions?$/.test(text)
      || text.endsWith(" transaction")
      || text.endsWith(" transactions")
      ? button
      : null;
  };
  T.findTransactionButton = doc => [...doc.querySelectorAll("#dw-primary-nav button,#tabbar button,#dw-primary-nav [role='button'],#tabbar [role='button'],#dw-primary-nav a,#tabbar a")].find(button => T.transactionButton(button)) || null;
  T.markActive = (doc, button) => { const nav = button?.closest("#dw-primary-nav,#tabbar"); nav?.querySelectorAll(".active").forEach(item => item.classList.remove("active")); button?.classList.add("active"); };
  T.injectStyles = doc => {
    if (doc.getElementById("transaction-entry-v76")) return;
    doc.querySelectorAll('[id^="transaction-entry-v"]').forEach(node => node.remove());
    const link = doc.createElement("link");
    link.id = "transaction-entry-v76";
    link.rel = "stylesheet";
    link.href = "transaction-v76.css?v=1";
    doc.head.appendChild(link);
  };
  T.uniqueItems = items => {
    const unique = new Map();
    (Array.isArray(items) ? items : []).forEach(item => { const id = String(item?.id || ""); if (!id || unique.has(id)) return; unique.set(id, { id, name:String(item.name || "Budget item"), amount:T.cents(item.amount), planned:T.cents(item.planned) }); });
    return [...unique.values()];
  };
  T.transactionItems = transaction => {
    const allocations = Array.isArray(transaction?.allocations) ? transaction.allocations : [];
    if (allocations.length) return T.uniqueItems(allocations.map(item => ({ id:item.budgetItemId || item.id, name:item.budgetItemName || item.name, amount:item.amount })));
    if (transaction?.budgetItemId) return [{ id:String(transaction.budgetItemId), name:String(transaction.budgetItemName || "Budget item"), amount:T.cents(transaction.amount) }];
    return [];
  };
  T.allocationCategory = transaction => T.transactionItems(transaction).map(item => item.name).filter(Boolean).join(", ") || transaction?.budgetItemName || transaction?.category || "Unassigned";
  T.isDeleted = transaction => Boolean(transaction?.deleted || transaction?.isDeleted || transaction?.deletedAt);
  T.deletedTransactions = state => {
    const rows = [], seen = new Set();
    Object.entries(T.ensureState(state).settings.monthlyBudgets).forEach(([month, budget]) => {
      const archived = Array.isArray(budget?.deletedTransactions) ? budget.deletedTransactions : [];
      const flagged = Array.isArray(budget?.transactions) ? budget.transactions.filter(T.isDeleted) : [];
      [...archived, ...flagged].forEach((transaction, index) => { const key = `${month}:${transaction?.id || transaction?.deletedAt || transaction?.createdAt || index}`; if (seen.has(key)) return; seen.add(key); rows.push({ month, transaction }); });
    });
    return rows.sort((a, b) => String(b.transaction.deletedAt || b.transaction.date || b.transaction.createdAt || "").localeCompare(String(a.transaction.deletedAt || a.transaction.date || a.transaction.createdAt || "")));
  };
  T.evenSplit = (total, count) => {
    if (!count) return [];
    const totalCents = Math.round(T.cents(total) * 100), base = Math.floor(totalCents / count);
    let remainder = totalCents - base * count;
    return Array.from({ length:count }, () => { const part = base + (remainder > 0 ? 1 : 0); remainder = Math.max(0, remainder - 1); return part / 100; });
  };
  T.choicesFor = (doc, entry) => {
    const state = T.ensureState(T.readState(doc.defaultView));
    const month = /^\d{4}-\d{2}-\d{2}$/.test(entry.date) ? entry.date.slice(0, 7) : T.currentMonth();
    const budget = T.budgetFor(state, month, false);
    const source = entry.type === "income" ? budget?.incomeItems : budget?.bills;
    return T.uniqueItems((Array.isArray(source) ? source : []).map(item => ({ id:item.id, name:item.name || (entry.type === "income" ? "Income" : "Budget item"), planned:item.amount })));
  };
  T.entryTotal = entry => T.cents(entry.amount);
  T.assignedTotal = entry => T.cents(entry.items.reduce((sum, item) => sum + T.cents(item.amount), 0));
  T.entryReady = entry => T.entryTotal(entry) > .004 && entry.items.length > 0 && Math.abs(T.entryTotal(entry) - T.assignedTotal(entry)) <= .004;
  T.rebuildTracking = (state, month) => {
    if (!T.validMonth(month)) return;
    const tracking = {}, budget = T.budgetFor(state, month, false);
    (budget?.transactions || []).filter(transaction => !T.isDeleted(transaction)).forEach(transaction => T.transactionItems(transaction).forEach(item => { const key = `${transaction.type === "income" ? "income" : "expense"}:${item.id}`; tracking[key] = T.cents(T.number(tracking[key]) + item.amount); }));
    T.ensureState(state).settings.budgetTracking[month] = tracking;
  };
  T.payload = entry => {
    const items = T.uniqueItems(entry.items);
    return { id:entry.id || T.uid(), type:entry.type, date:entry.date, amount:T.entryTotal(entry), merchant:entry.type === "expense" ? (entry.party || "Expense") : "", source:entry.type === "income" ? (entry.party || "Income") : "", budgetItemId:items.length === 1 ? items[0].id : "", budgetItemName:items.length === 1 ? items[0].name : items.map(item => item.name).join(", "), allocations:items.map(item => ({ budgetItemId:item.id, budgetItemName:item.name, amount:T.cents(item.amount) })), checkNumber:entry.checkNumber, note:entry.note, createdAt:entry.createdAt || new Date().toISOString(), updatedAt:new Date().toISOString() };
  };
})();
