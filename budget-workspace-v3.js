(() => {
  "use strict";

  const STORE = "debtwizard-budget-v3";
  const DEBT_STORE = "debt-calculator-v2";
  const screen = document.getElementById("screen");
  const tabbar = document.getElementById("tabbar");
  const modalRoot = document.getElementById("modal-root");
  if (!screen || !tabbar || !modalRoot) return;

  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const number = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
  const cents = value => Math.round((number(value) + Number.EPSILON) * 100) / 100;
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
  const createId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const monthKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const currentMonth = () => monthKey(new Date());
  const monthName = key => new Date(`${key}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const shortMonth = key => new Date(`${key}-01T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  let budgetOpen = false;
  let selectedMonth = currentMonth();

  function getDebtData() {
    try {
      return JSON.parse(localStorage.getItem(DEBT_STORE)) || { debts: [], payments: [], settings: {} };
    } catch {
      return { debts: [], payments: [], settings: {} };
    }
  }

  function getBudgetData() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE));
      return data && typeof data === "object" ? data : { months: {} };
    } catch {
      return { months: {} };
    }
  }

  function saveBudgetData(data) {
    localStorage.setItem(STORE, JSON.stringify(data));
  }

  function shiftMonth(key, amount) {
    const [year, month] = key.split("-").map(Number);
    return monthKey(new Date(year, month - 1 + amount, 1));
  }

  function defaultGroups() {
    return [
      { id: createId("group"), name: "Giving", items: [{ id: createId("item"), name: "Giving", planned: 0 }] },
      { id: createId("group"), name: "Savings", items: [{ id: createId("item"), name: "Emergency fund", planned: 0 }] },
      { id: createId("group"), name: "Housing", items: [{ id: createId("item"), name: "Rent / Mortgage", planned: 0 }, { id: createId("item"), name: "Utilities", planned: 0 }] },
      { id: createId("group"), name: "Food", items: [{ id: createId("item"), name: "Groceries", planned: 0 }, { id: createId("item"), name: "Dining out", planned: 0 }] },
      { id: createId("group"), name: "Transportation", items: [{ id: createId("item"), name: "Fuel", planned: 0 }, { id: createId("item"), name: "Maintenance", planned: 0 }] },
      { id: createId("group"), name: "Insurance & Health", items: [{ id: createId("item"), name: "Insurance", planned: 0 }, { id: createId("item"), name: "Medical", planned: 0 }] },
      { id: createId("group"), name: "Lifestyle", items: [{ id: createId("item"), name: "Personal", planned: 0 }, { id: createId("item"), name: "Subscriptions", planned: 0 }] },
      { id: createId("group"), name: "Debt payoff", items: [{ id: "budget-auto-debt", name: "Debt payments", planned: 0, automatic: true }] },
      { id: createId("group"), name: "Other", items: [{ id: createId("item"), name: "Miscellaneous", planned: 0 }] }
    ];
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function priorMonth(data, key) {
    return Object.keys(data.months || {}).filter(item => item < key).sort().at(-1) || "";
  }

  function createMonth(key, copyPrior) {
    const data = getBudgetData();
    if (data.months[key]) return data.months[key];
    const previousKey = copyPrior ? priorMonth(data, key) : "";
    const previous = previousKey ? data.months[previousKey] : null;
    data.months[key] = previous
      ? { incomes: clone(previous.incomes || []), groups: clone(previous.groups || defaultGroups()), transactions: [] }
      : { incomes: [], groups: defaultGroups(), transactions: [] };
    saveBudgetData(data);
    return data.months[key];
  }

  function activeDebts(data) {
    return (data.debts || []).filter(debt => number(debt.balance) > 0.004);
  }

  function debtPaymentPlan(data) {
    return cents(activeDebts(data).reduce((sum, debt) => sum + Math.max(0, number(debt.minimum)), 0) + Math.max(0, number(data.settings?.extra)));
  }

  function debtPaymentActual(data, key) {
    return cents((data.payments || [])
      .filter(payment => String(payment.date || "").slice(0, 7) === key)
      .reduce((sum, payment) => sum + Math.max(0, number(payment.amount)), 0));
  }

  function incomePlanned(month) {
    return cents((month.incomes || []).reduce((sum, item) => sum + Math.max(0, number(item.amount)), 0));
  }

  function incomeActual(month) {
    return cents((month.transactions || [])
      .filter(item => item.type === "income")
      .reduce((sum, item) => sum + Math.max(0, number(item.amount)), 0));
  }

  function itemPlanned(item, debts) {
    return item.automatic ? debtPaymentPlan(debts) : Math.max(0, number(item.planned));
  }

  function itemActual(item, month, debts, key) {
    if (item.automatic) return debtPaymentActual(debts, key);
    return cents((month.transactions || [])
      .filter(transaction => transaction.type === "expense" && String(transaction.itemId) === String(item.id))
      .reduce((sum, transaction) => sum + Math.max(0, number(transaction.amount)), 0));
  }

  function plannedOutflow(month, debts) {
    return cents((month.groups || []).reduce((sum, group) => sum + (group.items || [])
      .reduce((groupSum, item) => groupSum + itemPlanned(item, debts), 0), 0));
  }

  function actualOutflow(month, debts, key) {
    return cents((month.groups || []).reduce((sum, group) => sum + (group.items || [])
      .reduce((groupSum, item) => groupSum + itemActual(item, month, debts, key), 0), 0));
  }

  function findItem(month, itemId) {
    for (const group of month.groups || []) {
      const item = (group.items || []).find(entry => String(entry.id) === String(itemId));
      if (item) return { group, item };
    }
    return null;
  }

  function installStyles() {
    if (document.getElementById("budget-workspace-v3-styles")) return;
    const style = document.createElement("style");
    style.id = "budget-workspace-v3-styles";
    style.textContent = `
      html, body { min-height: 100%; overflow-x: hidden; }
      #app-shell { min-height: 100dvh !important; padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px)) !important; }
      #screen { min-height: 100dvh !important; }
      .tabbar { position: fixed !important; left: 0 !important; right: 0 !important; bottom: 0 !important; top: auto !important; z-index: 999 !important; height: 78px !important; padding: 7px 2px calc(7px + env(safe-area-inset-bottom, 0px)) !important; transform: none !important; }
      .tabbar.budget-v3-tabs { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
      .tabbar.budget-v3-tabs .tab-btn { min-width: 0 !important; padding: 3px 0 !important; font-size: .59rem !important; }
      .tabbar.budget-v3-tabs .tab-icon { font-size: 1.25rem !important; }
      .budget-v3-nav { color: #96a0a4; }
      .budget-v3-nav.active { color: #36bed8; }
      .budget-page { padding-bottom: 18px; }
      .budget-hero { position: relative; overflow: hidden; min-height: 126px; padding: 19px 18px 20px; background: linear-gradient(180deg, #c9edf3 0%, #e3f9fb 100%); }
      .budget-hero:after { content: ""; position: absolute; width: 190px; height: 190px; right: -100px; top: -115px; border-radius: 50%; background: rgba(255,255,255,.38); }
      .budget-inner { position: relative; z-index: 1; width: min(100%, 680px); margin: 0 auto; }
      .budget-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
      .budget-title { margin: 0; color: #0a526d; font-size: clamp(2rem, 9vw, 2.7rem); letter-spacing: -.06em; line-height: 1; font-weight: 900; }
      .budget-subtitle { margin: 8px 0 0; color: #15556e; font-size: .98rem; line-height: 1.3; }
      .budget-month-nav { display: grid; grid-template-columns: 40px minmax(0,1fr) 40px; gap: 8px; align-items: center; margin-top: 14px; }
      .budget-month-nav button { width: 40px; height: 40px; border: 1px solid #c9e7ed; border-radius: 50%; color: #177087; background: rgba(255,255,255,.72); font-size: 1.6rem; line-height: 1; }
      .budget-month-current { min-width: 0; padding: 10px; border: 1px solid rgba(49,174,195,.25); border-radius: 13px; color: #165269; background: rgba(255,255,255,.58); font-size: 1rem; font-weight: 900; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .budget-sheet { position: relative; margin-top: -5px; min-height: 500px; padding: 14px 0 0; border-radius: 27px 27px 0 0; background: #fff; }
      .budget-wrap { width: min(100%, 680px); margin: 0 auto; padding: 0 17px; }
      .budget-summary { display: grid; grid-template-columns: 1.08fr .92fr; gap: 9px; padding-bottom: 14px; }
      .budget-summary-primary { padding: 14px; border-radius: 16px; color: #fff; background: linear-gradient(140deg, #087492, #35bdd5); box-shadow: 0 9px 19px rgba(12,153,181,.18); }
      .budget-summary-primary span { display: block; color: rgba(255,255,255,.86); font-size: .75rem; }
      .budget-summary-primary strong { display: block; margin: 5px 0 2px; color: #fff; font-size: 1.62rem; line-height: 1.05; letter-spacing: -.06em; }
      .budget-summary-primary small { color: rgba(255,255,255,.86); font-size: .7rem; }
      .budget-summary-side { display: grid; gap: 8px; }
      .budget-summary-mini { padding: 10px 11px; border: 1px solid #e1ebed; border-radius: 14px; background: #fff; }
      .budget-summary-mini span { display: block; color: #829197; font-size: .7rem; }
      .budget-summary-mini strong { display: block; margin-top: 3px; color: #3b4b51; font-size: 1.02rem; letter-spacing: -.04em; }
      .budget-status { display: flex; align-items: center; gap: 7px; margin-bottom: 15px; padding: 11px 12px; border-radius: 12px; font-size: .83rem; font-weight: 900; }
      .budget-status.ok { color: #1a734f; border: 1px solid #c9ead6; background: #effaf4; }
      .budget-status.left { color: #146c84; border: 1px solid #caedf3; background: #effbfe; }
      .budget-status.over { color: #a34239; border: 1px solid #f1c5c0; background: #fff3f1; }
      .budget-status-icon { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; color: #fff; background: currentColor; font-size: .74rem; }
      .budget-actions { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; padding: 14px 0; border-top: 9px solid #eef0f1; border-bottom: 9px solid #eef0f1; }
      .budget-actions button { min-height: 46px; border: 1px solid #ccecf2; border-radius: 12px; color: #116d86; background: #effbfd; font-size: .74rem; font-weight: 900; }
      .budget-section { padding: 19px 0; border-bottom: 9px solid #eef0f1; }
      .budget-section:last-child { border-bottom: 0; }
      .budget-section-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 11px; }
      .budget-section-title { margin: 0; color: #0d516a; font-size: 1.42rem; letter-spacing: -.045em; line-height: 1.05; font-weight: 900; }
      .budget-section-copy { margin: 4px 0 0; color: #89979c; font-size: .76rem; line-height: 1.35; }
      .budget-total { padding-top: 2px; color: #405158; font-size: .91rem; font-weight: 900; white-space: nowrap; }
      .budget-card, .budget-group { overflow: hidden; border: 1px solid #e0ebed; border-radius: 16px; background: #fff; box-shadow: 0 7px 17px rgba(20,77,95,.05); }
      .budget-group { margin-bottom: 11px; }
      .budget-line { width: 100%; display: grid; grid-template-columns: minmax(0,1fr) auto auto; align-items: center; gap: 8px; padding: 12px; border: 0; border-bottom: 1px solid #e8eff0; color: #36464c; background: #fff; text-align: left; }
      .budget-line:last-child { border-bottom: 0; }
      .budget-line:active { background: #f7fcfd; }
      .budget-line-name { display: block; min-width: 0; color: #3d4b50; font-size: .92rem; font-weight: 850; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .budget-line-sub { display: block; margin-top: 3px; color: #89979b; font-size: .69rem; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .budget-line-actual { color: #849297; font-size: .71rem; text-align: right; }
      .budget-line-plan { min-width: 61px; color: #294d5b; font-size: .88rem; font-weight: 900; text-align: right; white-space: nowrap; }
      .budget-arrow { color: #90a0a5; font-size: 1.16rem; line-height: 1; }
      .budget-group-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px; border-bottom: 1px solid #e7eff1; background: #fbfefe; }
      .budget-group-name { color: #175066; font-size: 1rem; font-weight: 900; }
      .budget-group-total { color: #77878c; font-size: .72rem; text-align: right; }
      .budget-group-total strong { display: block; margin-top: 2px; color: #39515a; font-size: .84rem; }
      .budget-add-item { width: 100%; border: 0; border-top: 1px solid #e9eff0; padding: 11px 12px; color: #18829d; background: #fff; font-size: .79rem; font-weight: 900; text-align: left; }
      .budget-chip { display: inline-flex; padding: 3px 6px; border-radius: 7px; color: #126f87; background: #e9fafd; font-size: .64rem; font-weight: 900; }
      .budget-empty { padding: 29px 5px 22px; text-align: center; }
      .budget-empty-icon { display: grid; place-items: center; width: 74px; height: 74px; margin: 0 auto 13px; border-radius: 22px; color: #17819b; background: #e9f9fc; font-size: 2rem; }
      .budget-empty h2 { margin: 0; color: #174f64; font-size: 1.6rem; letter-spacing: -.05em; line-height: 1.08; }
      .budget-empty p { max-width: 340px; margin: 10px auto 17px; color: #78888e; font-size: .9rem; line-height: 1.42; }
      .budget-main-button { width: 100%; min-height: 49px; border: 0; border-radius: 12px; color: #fff; background: linear-gradient(135deg, #18b0cb, #4cd0e4); box-shadow: 0 8px 18px rgba(34,181,207,.2); font-size: 1rem; font-weight: 900; }
      .budget-link { margin-top: 13px; border: 0; color: #17849f; background: transparent; font-size: .8rem; font-weight: 900; }
      .budget-overlay { position: fixed; z-index: 1200; inset: 0; display: flex; align-items: flex-end; background: rgba(25,48,57,.5); }
      .budget-modal { width: min(100%, 680px); max-height: 91dvh; overflow: auto; padding: 20px 24px calc(24px + env(safe-area-inset-bottom,0px)); border-radius: 28px 28px 0 0; background: #fff; box-shadow: 0 -18px 44px rgba(19,51,62,.25); -webkit-overflow-scrolling: touch; }
      .budget-modal-head { display: grid; grid-template-columns: 35px minmax(0,1fr) 35px; align-items: center; gap: 8px; margin-bottom: 16px; }
      .budget-close { width: 35px; height: 35px; border: 0; padding: 0; color: #728087; background: transparent; font-size: 2rem; line-height: 1; }
      .budget-modal-title { margin: 0; color: #303e44; font-size: 1.24rem; text-align: center; font-weight: 900; }
      .budget-modal-copy { margin: 0 0 16px; color: #728187; font-size: .86rem; line-height: 1.4; }
      .budget-form { display: grid; gap: 13px; }
      .budget-field { display: grid; gap: 6px; color: #5f6d72; font-size: .81rem; font-weight: 900; }
      .budget-field input, .budget-field select { width: 100%; min-height: 48px; padding: 10px 12px; border: 1px solid #d7e2e5; border-radius: 12px; color: #334449; background: #fff; font-size: 16px; font-weight: 700; box-sizing: border-box; }
      .budget-two { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
      .budget-modal-actions { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 9px; margin-top: 2px; }
      .budget-save { min-height: 49px; border: 0; border-radius: 12px; color: #fff; background: linear-gradient(135deg, #1ab1cb, #4bd0e4); font-size: 1rem; font-weight: 900; }
      .budget-delete { min-height: 49px; padding: 0 12px; border: 1px solid #f3cbc7; border-radius: 12px; color: #b7463d; background: #fff1ef; font-size: .83rem; font-weight: 900; }
      .budget-auto-note { padding: 12px; border: 1px solid #cdebf0; border-radius: 12px; color: #52727c; background: #effbfd; font-size: .82rem; line-height: 1.4; }
      @media (max-width:390px) { .budget-wrap { padding-left: 13px; padding-right: 13px; } .budget-actions button { font-size: .68rem; } .budget-two { gap: 8px; } .budget-modal { padding-left: 19px; padding-right: 19px; } .budget-line-plan { min-width: 55px; font-size: .82rem; } }
      @media (min-width:560px) { .budget-overlay { align-items: center; justify-content: center; padding: 20px; } .budget-modal { border-radius: 24px; } }
    `;
    document.head.appendChild(style);
  }

  function ensureNavigation() {
    installStyles();
    tabbar.classList.add("budget-v3-tabs");
    let button = tabbar.querySelector("[data-budget-v3-nav]");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "tab-btn budget-v3-nav";
      button.dataset.budgetV3Nav = "true";
      button.setAttribute("aria-label", "Budget");
      button.innerHTML = '<span class="tab-icon">▦</span><span>Budget</span>';
      const strategy = [...tabbar.children].find(child => child.dataset?.page === "strategy");
      tabbar.insertBefore(button, strategy || null);
    }
    button.classList.toggle("active", budgetOpen);
  }

  function openModal(title, copy, formHtml) {
    modalRoot.innerHTML = `<div class="budget-overlay" id="budget-overlay"><section class="budget-modal" role="dialog" aria-modal="true"><div class="budget-modal-head"><button class="budget-close" type="button" data-budget-close>×</button><h2 class="budget-modal-title">${escapeHtml(title)}</h2><span></span></div>${copy ? `<p class="budget-modal-copy">${copy}</p>` : ""}${formHtml}</section></div>`;
  }

  function closeModal() {
    modalRoot.innerHTML = "";
  }

  function renderBudget() {
    if (!budgetOpen) return;
    ensureNavigation();
    const data = getBudgetData();
    const month = data.months[selectedMonth];
    const debts = getDebtData();
    const header = `<section class="budget-page"><header class="budget-hero"><div class="budget-inner"><div class="budget-top"><div><h1 class="budget-title">Budget</h1><p class="budget-subtitle">Plan every dollar before the month begins.</p></div><button class="icon-btn" data-budget-action="add-income" aria-label="Add income">＋</button></div><div class="budget-month-nav"><button data-budget-action="previous" aria-label="Previous month">‹</button><div class="budget-month-current">${escapeHtml(monthName(selectedMonth))}</div><button data-budget-action="next" aria-label="Next month">›</button></div></div></header><div class="budget-sheet"><div class="budget-wrap">`;

    if (!month) {
      const prior = priorMonth(data, selectedMonth);
      const actionText = prior ? `Copy ${shortMonth(prior)} budget` : "Create monthly budget";
      screen.innerHTML = `${header}<div class="budget-empty"><div class="budget-empty-icon">▦</div><h2>${prior ? `Create ${escapeHtml(shortMonth(selectedMonth))} budget` : "Build your monthly budget"}</h2><p>${prior ? `Start with a copy of ${escapeHtml(monthName(prior))}, then adjust your income and planned amounts for this month.` : "Add your income, assign it to categories, and give every dollar a job."}</p><button class="budget-main-button" data-budget-action="create">${escapeHtml(actionText)}</button>${prior ? '<button class="budget-link" data-budget-action="create-blank">Start with a blank template</button>' : ""}</div></div></div></section>`;
      return;
    }

    const plannedIncome = incomePlanned(month);
    const receivedIncome = incomeActual(month);
    const plannedExpenses = plannedOutflow(month, debts);
    const spentExpenses = actualOutflow(month, debts, selectedMonth);
    const remaining = cents(plannedIncome - plannedExpenses);
    const status = Math.abs(remaining) < .005
      ? { className: "ok", icon: "✓", text: "Every dollar has a job" }
      : remaining > 0
        ? { className: "left", icon: "+", text: `${money.format(remaining)} left to budget` }
        : { className: "over", icon: "!", text: `${money.format(Math.abs(remaining))} over budget` };

    const incomeRows = (month.incomes || []).length
      ? month.incomes.map(income => `<button class="budget-line" data-budget-action="edit-income" data-id="${escapeHtml(income.id)}"><span><span class="budget-line-name">${escapeHtml(income.name)}</span><span class="budget-line-sub">Expected this month</span></span><span class="budget-line-actual">Received ${money.format(0)}</span><span class="budget-line-plan">${money.format(income.amount)}</span><span class="budget-arrow">›</span></button>`).join("")
      : '<div style="padding:15px"><button class="budget-link" style="margin:0" data-budget-action="add-income">+ Add income</button></div>';

    const groupHtml = (month.groups || []).map(group => {
      const groupPlanned = cents((group.items || []).reduce((sum, item) => sum + itemPlanned(item, debts), 0));
      const groupActual = cents((group.items || []).reduce((sum, item) => sum + itemActual(item, month, debts, selectedMonth), 0));
      const rows = (group.items || []).map(item => {
        const planned = itemPlanned(item, debts);
        const actual = itemActual(item, month, debts, selectedMonth);
        const sub = item.automatic
          ? `Synced from your debt minimums + strategy extra payment`
          : `Spent ${money.format(actual)} of ${money.format(planned)}`;
        return `<button class="budget-line" data-budget-action="edit-item" data-id="${escapeHtml(item.id)}"><span><span class="budget-line-name">${escapeHtml(item.name)}${item.automatic ? ' <span class="budget-chip">Synced</span>' : ""}</span><span class="budget-line-sub">${escapeHtml(sub)}</span></span><span class="budget-line-actual">${money.format(actual)} spent</span><span class="budget-line-plan">${money.format(planned)}</span><span class="budget-arrow">›</span></button>`;
      }).join("");
      return `<section class="budget-group"><div class="budget-group-head"><span class="budget-group-name">${escapeHtml(group.name)}</span><span class="budget-group-total">Planned / spent<strong>${money.format(groupPlanned)} / ${money.format(groupActual)}</strong></span></div>${rows}<button class="budget-add-item" data-budget-action="add-item" data-group-id="${escapeHtml(group.id)}">+ Add item</button></section>`;
    }).join("");

    screen.innerHTML = `${header}<section class="budget-summary"><div class="budget-summary-primary"><span>Planned income</span><strong>${money.format(plannedIncome)}</strong><small>Actual received ${money.format(receivedIncome)}</small></div><div class="budget-summary-side"><div class="budget-summary-mini"><span>Planned outflow</span><strong>${money.format(plannedExpenses)}</strong></div><div class="budget-summary-mini"><span>Actual spending</span><strong>${money.format(spentExpenses)}</strong></div></div></section><div class="budget-status ${status.className}"><span class="budget-status-icon">${status.icon}</span><span>${escapeHtml(status.text)}</span></div><section class="budget-actions"><button data-budget-action="add-income">+ Income</button><button data-budget-action="add-item">+ Item</button><button data-budget-action="record">Record</button></section><section class="budget-section"><div class="budget-section-head"><div><h2 class="budget-section-title">Income</h2><p class="budget-section-copy">Plan take-home pay and any other income for ${escapeHtml(shortMonth(selectedMonth))}.</p></div><span class="budget-total">${money.format(plannedIncome)}</span></div><div class="budget-card">${incomeRows}</div></section><section class="budget-section"><div class="budget-section-head"><div><h2 class="budget-section-title">Monthly plan</h2><p class="budget-section-copy">The Debt payments line automatically connects to DebtWizard.</p></div><span class="budget-total">${money.format(plannedExpenses)}</span></div>${groupHtml}</section><section class="budget-section"><div class="budget-card" style="padding:14px"><div class="budget-auto-note"><strong>Debt plan connection:</strong> ${money.format(debtPaymentPlan(debts))} is currently reserved for debt payments from your active minimums and Strategy extra-payment amount.</div></div></section></div></div></section>`;
  }

  function incomeModal(existing) {
    const item = existing || { name: "Paycheck", amount: "" };
    openModal(existing ? "Edit income" : "Add income", "Use actual take-home pay, side income or other money you expect this month.", `<form class="budget-form" id="budget-income-form"><label class="budget-field">Income source<input name="name" value="${escapeHtml(item.name)}" placeholder="Example: SSI paycheck" required></label><label class="budget-field">Amount expected this month<input name="amount" type="number" min="0" step=".01" inputmode="decimal" value="${number(item.amount) || ""}" placeholder="0.00" required></label><div class="budget-modal-actions"><button class="budget-save" type="submit">${existing ? "Save income" : "Add income"}</button>${existing ? '<button class="budget-delete" type="button" data-budget-delete-income>Delete</button>' : ""}</div></form>`);
    const form = modalRoot.querySelector("#budget-income-form");
    form.addEventListener("submit", event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const data = getBudgetData();
      const month = data.months[selectedMonth];
      const target = existing ? month.incomes.find(entry => String(entry.id) === String(existing.id)) : null;
      const income = target || { id: createId("income") };
      income.name = String(values.name || "Income").trim();
      income.amount = cents(values.amount);
      if (!target) month.incomes.push(income);
      saveBudgetData(data);
      closeModal();
      renderBudget();
    });
    modalRoot.querySelector("[data-budget-delete-income]")?.addEventListener("click", () => {
      const data = getBudgetData();
      const month = data.months[selectedMonth];
      month.incomes = month.incomes.filter(entry => String(entry.id) !== String(existing.id));
      saveBudgetData(data);
      closeModal();
      renderBudget();
    });
  }

  function itemModal(match, preselectedGroupId) {
    const data = getBudgetData();
    const month = data.months[selectedMonth];
    const existing = match?.item;
    const group = match?.group;
    if (existing?.automatic) {
      openModal("Debt payment plan", "This line is calculated automatically from your debts and payoff strategy.", `<div class="budget-auto-note">Planned debt payments: <strong>${money.format(debtPaymentPlan(getDebtData()))}</strong>. Update a debt minimum or the extra amount in Strategy to change it.</div><div class="budget-modal-actions" style="grid-template-columns:1fr"><button type="button" class="budget-save" data-budget-go-debts>View debt plan</button></div>`);
      return;
    }
    const groups = month.groups || [];
    const options = groups.map(entry => `<option value="${escapeHtml(entry.id)}" ${(group?.id || preselectedGroupId) === entry.id ? "selected" : ""}>${escapeHtml(entry.name)}</option>`).join("");
    openModal(existing ? "Edit budget item" : "Add budget item", "Set the amount you plan to spend or save in this category during the month.", `<form class="budget-form" id="budget-item-form"><label class="budget-field">Item name<input name="name" value="${escapeHtml(existing?.name || "")}" placeholder="Example: Groceries" required></label><label class="budget-field">Budget group<select name="groupId">${options}</select></label><label class="budget-field">Planned amount<input name="planned" type="number" min="0" step=".01" inputmode="decimal" value="${number(existing?.planned) || ""}" placeholder="0.00" required></label><div class="budget-modal-actions"><button class="budget-save" type="submit">${existing ? "Save item" : "Add item"}</button>${existing ? '<button class="budget-delete" type="button" data-budget-delete-item>Delete</button>' : ""}</div></form>`);
    const form = modalRoot.querySelector("#budget-item-form");
    form.addEventListener("submit", event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const data = getBudgetData();
      const month = data.months[selectedMonth];
      const destination = month.groups.find(entry => String(entry.id) === String(values.groupId));
      if (!destination) return;
      if (existing) {
        const owner = month.groups.find(entry => entry.items.some(entryItem => String(entryItem.id) === String(existing.id)));
        if (owner) owner.items = owner.items.filter(entryItem => String(entryItem.id) !== String(existing.id));
        existing.name = String(values.name || "Item").trim();
        existing.planned = cents(values.planned);
        destination.items.push(existing);
      } else {
        destination.items.push({ id: createId("item"), name: String(values.name || "Item").trim(), planned: cents(values.planned) });
      }
      saveBudgetData(data);
      closeModal();
      renderBudget();
    });
    modalRoot.querySelector("[data-budget-delete-item]")?.addEventListener("click", () => {
      const data = getBudgetData();
      const month = data.months[selectedMonth];
      const owner = month.groups.find(entry => entry.items.some(entryItem => String(entryItem.id) === String(existing.id)));
      if (owner) owner.items = owner.items.filter(entryItem => String(entryItem.id) !== String(existing.id));
      saveBudgetData(data);
      closeModal();
      renderBudget();
    });
  }

  function recordModal() {
    const data = getBudgetData();
    const month = data.months[selectedMonth];
    const options = (month.groups || []).flatMap(group => (group.items || [])
      .filter(item => !item.automatic)
      .map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(group.name)} · ${escapeHtml(item.name)}</option>`)).join("");
    openModal("Record expense", "Record what you actually spent. It will update the actual amount on the matching budget item.", `<form class="budget-form" id="budget-record-form"><label class="budget-field">Budget item<select name="itemId">${options || '<option value="">Add a budget item first</option>'}</select></label><div class="budget-two"><label class="budget-field">Amount<input name="amount" type="number" min="0" step=".01" inputmode="decimal" placeholder="0.00" required></label><label class="budget-field">Date<input name="date" type="date" value="${selectedMonth === currentMonth() ? new Date().toISOString().slice(0, 10) : `${selectedMonth}-01`}" required></label></div><label class="budget-field">Note <span style="color:#89979c;font-weight:650">optional</span><input name="note" placeholder="Example: Grocery store"></label><div class="budget-modal-actions" style="grid-template-columns:1fr"><button class="budget-save" type="submit">Save expense</button></div></form>`);
    const form = modalRoot.querySelector("#budget-record-form");
    form.addEventListener("submit", event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      if (!values.itemId) { alert("Add a budget item first."); return; }
      const data = getBudgetData();
      const month = data.months[selectedMonth];
      month.transactions.push({ id: createId("transaction"), type: "expense", itemId: values.itemId, amount: cents(values.amount), date: values.date, note: String(values.note || "").trim() });
      saveBudgetData(data);
      closeModal();
      renderBudget();
    });
  }

  function activateBudget() {
    budgetOpen = true;
    ensureNavigation();
    renderBudget();
  }

  function deactivateBudget() {
    budgetOpen = false;
    ensureNavigation();
  }

  document.addEventListener("click", event => {
    const budgetNav = event.target.closest("[data-budget-v3-nav]");
    if (budgetNav) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      activateBudget();
      return;
    }

    const coreNav = event.target.closest("#tabbar [data-page]");
    if (coreNav && budgetOpen) deactivateBudget();

    const action = event.target.closest("[data-budget-action]");
    if (action) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      const command = action.dataset.budgetAction;
      if (command === "previous") { selectedMonth = shiftMonth(selectedMonth, -1); renderBudget(); return; }
      if (command === "next") { selectedMonth = shiftMonth(selectedMonth, 1); renderBudget(); return; }
      if (command === "create") { createMonth(selectedMonth, true); renderBudget(); return; }
      if (command === "create-blank") { createMonth(selectedMonth, false); renderBudget(); return; }
      if (command === "add-income") { if (!getBudgetData().months[selectedMonth]) createMonth(selectedMonth, false); incomeModal(null); return; }
      if (command === "edit-income") {
        const month = getBudgetData().months[selectedMonth];
        const income = (month?.incomes || []).find(entry => String(entry.id) === String(action.dataset.id));
        if (income) incomeModal(income);
        return;
      }
      if (command === "add-item") { if (!getBudgetData().months[selectedMonth]) createMonth(selectedMonth, false); itemModal(null, action.dataset.groupId || ""); return; }
      if (command === "edit-item") {
        const month = getBudgetData().months[selectedMonth];
        const match = findItem(month, action.dataset.id);
        if (match) itemModal(match, "");
        return;
      }
      if (command === "record") { if (!getBudgetData().months[selectedMonth]) createMonth(selectedMonth, false); recordModal(); return; }
    }

    if (event.target.id === "budget-overlay" || event.target.closest("[data-budget-close]")) closeModal();
    if (event.target.closest("[data-budget-go-debts]")) {
      closeModal();
      deactivateBudget();
      tabbar.querySelector('[data-page="debts"]')?.click();
    }
  }, true);

  const observer = new MutationObserver(() => {
    ensureNavigation();
    if (budgetOpen && !screen.querySelector(".budget-page")) renderBudget();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  installStyles();
  ensureNavigation();
})();
