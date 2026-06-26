(() => {
  "use strict";

  const DEBT_STORE = "debt-calculator-v2";
  const BUDGET_STORE = "debt-calculator-budget-v1";
  const screen = document.getElementById("screen");
  const tabbar = document.getElementById("tabbar");
  const modalRoot = document.getElementById("modal-root");
  if (!screen || !tabbar || !modalRoot) return;

  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const number = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
  const cents = value => Math.round((number(value) + Number.EPSILON) * 100) / 100;
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const today = () => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), date.getDate()); };
  const monthKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const monthLabel = key => new Date(`${key}-01T12:00:00`).toLocaleDateString("en-US", { month:"long", year:"numeric" });
  const shortMonth = key => new Date(`${key}-01T12:00:00`).toLocaleDateString("en-US", { month:"short", year:"numeric" });
  const inputDate = date => dateKey(date);

  let budgetActive = false;
  let selectedMonth = monthKey(today());

  function readDebtState() {
    try {
      const state = JSON.parse(localStorage.getItem(DEBT_STORE));
      return state && typeof state === "object" ? state : { debts: [], payments: [], settings: {} };
    } catch { return { debts: [], payments: [], settings: {} }; }
  }

  function readBudget() {
    try {
      const data = JSON.parse(localStorage.getItem(BUDGET_STORE));
      if (data && typeof data === "object") {
        data.months ||= {};
        return data;
      }
    } catch { /* fall through */ }
    return { months: {} };
  }

  function saveBudget(data) {
    localStorage.setItem(BUDGET_STORE, JSON.stringify(data));
  }

  function deepCopy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nextMonth(key, offset) {
    const [year, month] = key.split("-").map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    return monthKey(date);
  }

  function daysInMonth(key) {
    const [year, month] = key.split("-").map(Number);
    return new Date(year, month, 0).getDate();
  }

  function dateForMonth(key, day) {
    const [year, month] = key.split("-").map(Number);
    return new Date(year, month - 1, Math.min(Math.max(1, Number(day) || 1), daysInMonth(key)));
  }

  function parseIso(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? new Date(`${value}T12:00:00`) : null;
  }

  function defaultGroups() {
    return [
      { id: uid("group"), name: "Giving", categories: [{ id: uid("cat"), name: "Giving", planned: 0 }] },
      { id: uid("group"), name: "Savings", categories: [{ id: uid("cat"), name: "Emergency fund", planned: 0 }, { id: uid("cat"), name: "Sinking funds", planned: 0 }] },
      { id: uid("group"), name: "Housing", categories: [{ id: uid("cat"), name: "Rent / Mortgage", planned: 0 }, { id: uid("cat"), name: "Utilities", planned: 0 }, { id: uid("cat"), name: "Internet / Phone", planned: 0 }] },
      { id: uid("group"), name: "Food", categories: [{ id: uid("cat"), name: "Groceries", planned: 0 }, { id: uid("cat"), name: "Dining out", planned: 0 }] },
      { id: uid("group"), name: "Transportation", categories: [{ id: uid("cat"), name: "Fuel", planned: 0 }, { id: uid("cat"), name: "Maintenance", planned: 0 }] },
      { id: uid("group"), name: "Insurance & Health", categories: [{ id: uid("cat"), name: "Insurance", planned: 0 }, { id: uid("cat"), name: "Medical", planned: 0 }] },
      { id: uid("group"), name: "Lifestyle", categories: [{ id: uid("cat"), name: "Personal", planned: 0 }, { id: uid("cat"), name: "Entertainment", planned: 0 }, { id: uid("cat"), name: "Subscriptions", planned: 0 }] },
      { id: uid("group"), name: "Debt payoff", categories: [{ id: "auto-debt-payments", name: "Debt payments", planned: 0, auto: "debt" }] },
      { id: uid("group"), name: "Other", categories: [{ id: uid("cat"), name: "Miscellaneous", planned: 0 }] }
    ];
  }

  function baseMonth() {
    return { createdAt: new Date().toISOString(), incomes: [], groups: defaultGroups(), transactions: [] };
  }

  function findLatestPrior(data, key) {
    return Object.keys(data.months || {}).filter(item => item < key).sort().at(-1) || "";
  }

  function ensureMonth(key, copyFrom = "") {
    const data = readBudget();
    if (data.months[key]) return data.months[key];
    const sourceKey = copyFrom || findLatestPrior(data, key);
    const source = sourceKey ? data.months[sourceKey] : null;
    const month = source ? {
      createdAt: new Date().toISOString(),
      incomes: deepCopy(source.incomes || []),
      groups: deepCopy(source.groups || defaultGroups()),
      transactions: []
    } : baseMonth();
    data.months[key] = month;
    saveBudget(data);
    return month;
  }

  function removeMonth(key) {
    const data = readBudget();
    delete data.months[key];
    saveBudget(data);
  }

  function activeDebts(debtState) {
    return (debtState.debts || []).filter(debt => number(debt.balance) > .004);
  }

  function debtBudgetAmount(debtState) {
    const minimums = activeDebts(debtState).reduce((sum, debt) => sum + Math.max(0, number(debt.minimum)), 0);
    const extra = Math.max(0, number(debtState.settings?.extra));
    return cents(minimums + extra);
  }

  function completedDebtAmount(debtState, key) {
    return cents((debtState.payments || []).filter(payment => String(payment.date || "").slice(0, 7) === key).reduce((sum, payment) => sum + Math.max(0, number(payment.amount)), 0));
  }

  function sourceDates(source, key, debtState) {
    const dates = [];
    const frequency = source.frequency || "monthly";
    const start = new Date(`${key}-01T12:00:00`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const global = debtState.settings || {};
    const nextDate = source.nextDate || global.nextPayDate || "";

    if (frequency === "biweekly") {
      let date = parseIso(nextDate);
      if (!date) return dates;
      let guard = 0;
      while (date > end && guard < 180) { date = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 14); guard += 1; }
      while (date < start && guard < 360) { date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 14); guard += 1; }
      while (date <= end && guard < 400) {
        if (date >= start) dates.push(new Date(date));
        date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 14);
        guard += 1;
      }
      return dates;
    }
    if (frequency === "semimonthly") {
      const first = Math.max(1, Math.min(28, Math.floor(number(source.firstDay || global.semiMonthlyFirstDay)) || 1));
      const second = Math.max(1, Math.min(28, Math.floor(number(source.secondDay || global.semiMonthlySecondDay)) || 15));
      return [dateForMonth(key, first), dateForMonth(key, second)].sort((a, b) => a - b);
    }
    if (frequency === "once") {
      const date = parseIso(source.date);
      return date && monthKey(date) === key ? [date] : [];
    }
    const day = Math.max(1, Math.min(28, Math.floor(number(source.day)) || 1));
    return [dateForMonth(key, day)];
  }

  function plannedIncome(month, key, debtState) {
    return cents((month.incomes || []).reduce((sum, source) => sum + sourceDates(source, key, debtState).length * Math.max(0, number(source.amount)), 0));
  }

  function incomeActual(month) {
    return cents((month.transactions || []).filter(item => item.type === "income").reduce((sum, item) => sum + Math.max(0, number(item.amount)), 0));
  }

  function categoryPlan(category, debtState) {
    return category.auto === "debt" ? debtBudgetAmount(debtState) : Math.max(0, number(category.planned));
  }

  function categoryActual(category, month, debtState, key) {
    if (category.auto === "debt") return completedDebtAmount(debtState, key);
    return cents((month.transactions || []).filter(item => item.type === "expense" && String(item.categoryId) === String(category.id)).reduce((sum, item) => sum + Math.max(0, number(item.amount)), 0));
  }

  function plannedExpenses(month, debtState) {
    return cents((month.groups || []).reduce((groupTotal, group) => groupTotal + (group.categories || []).reduce((sum, category) => sum + categoryPlan(category, debtState), 0), 0));
  }

  function actualExpenses(month, debtState, key) {
    return cents((month.groups || []).reduce((groupTotal, group) => groupTotal + (group.categories || []).reduce((sum, category) => sum + categoryActual(category, month, debtState, key), 0), 0));
  }

  function sourcePlan(source, key, debtState) {
    return cents(sourceDates(source, key, debtState).length * Math.max(0, number(source.amount)));
  }

  function sourceActual(source, month) {
    return cents((month.transactions || []).filter(item => item.type === "income" && String(item.sourceId) === String(source.id)).reduce((sum, item) => sum + Math.max(0, number(item.amount)), 0));
  }

  function budgetStatus(remaining) {
    if (Math.abs(remaining) < .005) return { label: "Every dollar has a job", tone: "zero", icon: "✓" };
    if (remaining > 0) return { label: `${money.format(remaining)} left to budget`, tone: "positive", icon: "+" };
    return { label: `${money.format(Math.abs(remaining))} over budget`, tone: "negative", icon: "!" };
  }

  function navButton() {
    let button = tabbar.querySelector("[data-budget-nav]");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "tab-btn budget-tab-btn";
      button.dataset.budgetNav = "true";
      button.setAttribute("aria-label", "Budget");
      button.innerHTML = '<span class="tab-icon">▦</span><span>Budget</span>';
      const children = [...tabbar.children];
      tabbar.insertBefore(button, children[2] || null);
    }
    tabbar.classList.add("budget-enabled-tabbar");
    button.classList.toggle("active", budgetActive);
  }

  function setBudgetActive(value) {
    budgetActive = value;
    navButton();
    tabbar.querySelectorAll("[data-page]").forEach(button => button.classList.toggle("active", false));
    if (!value) return;
    tabbar.querySelector("[data-budget-nav]")?.classList.add("active");
  }

  function styles() {
    if (document.getElementById("budget-v1-styles")) return;
    const style = document.createElement("style");
    style.id = "budget-v1-styles";
    style.textContent = `
      .tabbar.budget-enabled-tabbar{grid-template-columns:repeat(6,minmax(0,1fr))!important;padding-left:2px!important;padding-right:2px!important}.tabbar.budget-enabled-tabbar .tab-btn{font-size:.61rem!important;padding-left:0!important;padding-right:0!important}.tabbar.budget-enabled-tabbar .tab-icon{font-size:1.30rem!important}.budget-tab-btn{color:#96a0a4}.budget-tab-btn.active{color:#36bed8}.budget-tab-btn.active .tab-icon{filter:drop-shadow(0 2px 5px rgba(70,197,220,.22))}
      .budget-page{padding-bottom:18px}.budget-hero{position:relative;overflow:hidden;min-height:124px;padding:19px 20px 20px;background:linear-gradient(180deg,#c9edf3 0%,#def7fa 100%)}.budget-hero:after{content:"";position:absolute;width:190px;height:190px;right:-100px;top:-116px;border-radius:50%;background:rgba(255,255,255,.38)}.budget-hero-inner{position:relative;z-index:1;width:min(100%,680px);margin:0 auto}.budget-hero-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.budget-title{margin:0;color:#0b526d;font-size:clamp(2.05rem,9.5vw,2.75rem);line-height:1;letter-spacing:-.06em;font-weight:900}.budget-subtitle{margin:8px 0 0;color:#15556e;font-size:1rem;line-height:1.3}.budget-month-switcher{position:relative;z-index:2;display:grid;grid-template-columns:42px minmax(0,1fr) 42px;align-items:center;gap:7px;width:min(100%,680px);margin:15px auto 0}.budget-month-button{width:40px;height:40px;border:1px solid #cae7ec;border-radius:50%;color:#126a83;background:rgba(255,255,255,.75);font-size:1.55rem;line-height:1}.budget-month-button:active{transform:scale(.96)}.budget-month-current{min-width:0;border:1px solid rgba(62,174,194,.24);border-radius:14px;padding:10px 12px;color:#134f67;background:rgba(255,255,255,.56);font-size:1.05rem;font-weight:900;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.budget-sheet{position:relative;margin-top:-5px;padding:12px 0 0;min-height:440px;border-radius:27px 27px 0 0;background:#fff}.budget-wrap{width:min(100%,680px);margin:0 auto;padding:0 18px}.budget-overview{display:grid;grid-template-columns:1.08fr .92fr;gap:10px;padding:14px 0 19px;border-bottom:10px solid var(--divider)}.budget-overview-primary{padding:15px;border-radius:17px;color:#fff;background:linear-gradient(140deg,#087492,#36c0d7);box-shadow:0 10px 20px rgba(12,154,181,.18)}.budget-overview-label{display:block;color:rgba(255,255,255,.82);font-size:.78rem}.budget-overview-value{display:block;margin:5px 0 2px;color:#fff;font-size:1.72rem;font-weight:900;letter-spacing:-.06em;line-height:1.04}.budget-overview-note{font-size:.74rem;color:rgba(255,255,255,.85)}.budget-overview-side{display:grid;gap:10px}.budget-mini-card{padding:12px 13px;border:1px solid var(--line);border-radius:15px;background:#fff}.budget-mini-card span{display:block;color:#819097;font-size:.73rem}.budget-mini-card strong{display:block;margin-top:4px;color:#39474e;font-size:1.14rem;letter-spacing:-.04em;font-weight:900}.budget-status{display:flex;align-items:center;gap:7px;margin:15px 0 0;padding:11px 12px;border-radius:12px;font-size:.84rem;font-weight:900}.budget-status-icon{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;font-size:.82rem}.budget-status.zero{color:#1b714f;background:#effaf4;border:1px solid #c9e9d6}.budget-status.zero .budget-status-icon{color:#fff;background:#47bd79}.budget-status.positive{color:#146c84;background:#effbfe;border:1px solid #c9edf3}.budget-status.positive .budget-status-icon{color:#fff;background:#42c1d9}.budget-status.negative{color:#a84239;background:#fff3f1;border:1px solid #f3c7c2}.budget-status.negative .budget-status-icon{color:#fff;background:#e2665c}
      .budget-action-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:16px 0;border-bottom:10px solid var(--divider)}.budget-action{min-height:47px;border:1px solid #cdebf0;border-radius:12px;color:#106a83;background:#effbfd;font-size:.76rem;font-weight:900}.budget-action:last-child{color:#795900;border-color:#ffe0a1;background:#fff9e9}.budget-section{padding:20px 0;border-bottom:10px solid var(--divider)}.budget-section:last-child{border-bottom:0}.budget-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px}.budget-section-title{margin:0;color:#0e516a;font-size:1.45rem;letter-spacing:-.045em;line-height:1.05;font-weight:900}.budget-section-copy{margin:4px 0 0;color:#89969b;font-size:.79rem;line-height:1.3}.budget-section-total{padding-top:3px;color:#405158;font-size:.94rem;font-weight:900;white-space:nowrap}.budget-card{overflow:hidden;border:1px solid #e0ebed;border-radius:16px;background:#fff;box-shadow:0 8px 18px rgba(20,77,95,.05)}.budget-line{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:9px;padding:13px 13px;border:0;border-bottom:1px solid #e8eff0;color:#36464c;background:#fff;text-align:left}.budget-line:last-child{border-bottom:0}.budget-line:active{background:#f7fcfd}.budget-line-name{min-width:0;font-size:.94rem;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.budget-line-sub{display:block;margin-top:3px;color:#87959a;font-size:.71rem;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.budget-line-actual{color:#839197;font-size:.75rem;text-align:right}.budget-line-plan{min-width:65px;color:#294d5b;font-size:.92rem;font-weight:900;text-align:right;white-space:nowrap}.budget-line-arrow{color:#90a0a5;font-size:1.16rem;line-height:1}.budget-group{margin:0 0 12px;overflow:hidden;border:1px solid #e0ebed;border-radius:16px;background:#fff;box-shadow:0 8px 18px rgba(20,77,95,.045)}.budget-group:last-child{margin-bottom:0}.budget-group-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 13px 10px;border-bottom:1px solid #e7eff1;background:#fbfefe}.budget-group-name{color:#174f64;font-size:1.03rem;font-weight:900}.budget-group-totals{color:#76868c;font-size:.75rem;font-weight:750;text-align:right}.budget-group-totals strong{display:block;margin-top:2px;color:#39515a;font-size:.88rem;font-weight:900}.budget-group-add{width:100%;border:0;border-top:1px solid #e9eff0;padding:11px 13px;color:#1985a0;background:#fff;font-size:.82rem;font-weight:900;text-align:left}.budget-empty-month{padding:31px 7px 23px;text-align:center}.budget-empty-illustration{display:grid;place-items:center;width:76px;height:76px;margin:0 auto 13px;border-radius:23px;color:#17819b;background:#e9f9fc;font-size:2.1rem}.budget-empty-title{margin:0;color:#174f64;font-size:1.65rem;letter-spacing:-.05em;line-height:1.06;font-weight:900}.budget-empty-copy{max-width:340px;margin:10px auto 18px;color:#78888e;font-size:.92rem;line-height:1.42}.budget-copy-option{margin-top:10px;color:#708087;font-size:.78rem}.budget-transactions{display:grid;gap:0}.budget-transaction{display:grid;grid-template-columns:31px minmax(0,1fr) auto;align-items:center;gap:9px;padding:11px 0;border-bottom:1px solid #e8eff0}.budget-transaction:last-child{border-bottom:0}.budget-transaction-icon{display:grid;place-items:center;width:29px;height:29px;border-radius:9px;color:#16728b;background:#e6f8fb;font-size:.82rem}.budget-transaction-icon.expense{color:#a14b43;background:#fff0ee}.budget-transaction-name{min-width:0;color:#3d4b50;font-size:.86rem;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.budget-transaction-date{display:block;margin-top:2px;color:#8a989d;font-size:.69rem;font-weight:650}.budget-transaction-amount{color:#274d5a;font-size:.88rem;font-weight:900;white-space:nowrap}.budget-transaction-amount.expense{color:#bd5147}
      .budget-overlay{position:fixed;z-index:950;inset:0;display:flex;align-items:flex-end;background:rgba(25,48,57,.50)}.budget-modal{width:min(100%,680px);max-height:91dvh;overflow:auto;padding:20px 25px calc(25px + env(safe-area-inset-bottom,0px));border-radius:28px 28px 0 0;background:#fff;box-shadow:0 -18px 44px rgba(19,51,62,.25);-webkit-overflow-scrolling:touch}.budget-modal-head{display:grid;grid-template-columns:35px minmax(0,1fr) 35px;align-items:center;gap:8px;margin-bottom:16px}.budget-modal-close{width:35px;height:35px;padding:0;border:0;color:#707d82;background:transparent;font-size:2.05rem;line-height:1}.budget-modal-title{margin:0;color:#303e43;font-size:1.25rem;font-weight:900;text-align:center}.budget-modal-copy{margin:0 0 17px;color:#728187;font-size:.87rem;line-height:1.4}.budget-form{display:grid;gap:13px}.budget-field{display:grid;gap:6px;color:#5d6c71;font-size:.82rem;font-weight:900}.budget-field input,.budget-field select,.budget-field textarea{width:100%;min-width:0;min-height:48px;padding:10px 12px;border:1px solid #d7e2e5;border-radius:12px;color:#344449;background:#fff;font-size:16px;font-weight:700;box-sizing:border-box}.budget-field textarea{min-height:66px;resize:vertical}.budget-field input:focus,.budget-field select:focus,.budget-field textarea:focus{border-color:#43c4db;outline:3px solid rgba(66,196,219,.15)}.budget-form-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.budget-form-choice{display:grid;grid-template-columns:1fr 1fr;gap:7px}.budget-form-choice button{min-height:42px;border:1px solid #dbe8ea;border-radius:11px;color:#5a6a70;background:#fff;font-size:.82rem;font-weight:900}.budget-form-choice button.active{color:#106f87;border-color:#4cc7dd;background:#ecfbfd}.budget-modal-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;margin-top:3px}.budget-save{min-height:49px;border:0;border-radius:12px;color:#fff;background:linear-gradient(135deg,#1ab1cb,#4bd0e4);box-shadow:0 8px 18px rgba(34,181,207,.2);font-size:1rem;font-weight:900}.budget-delete{min-height:49px;border:1px solid #f3cbc7;border-radius:12px;color:#b7463d;background:#fff1ef;font-size:.86rem;font-weight:900}.budget-auto-note{padding:12px;border:1px solid #cdebf0;border-radius:12px;color:#52727c;background:#effbfd;font-size:.82rem;line-height:1.38}.budget-chip{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;color:#136f86;background:#eafafd;font-size:.7rem;font-weight:900}.budget-plain-link{border:0;padding:0;color:#14839f;background:transparent;font-size:.82rem;font-weight:900}.budget-budgeted-warning{margin:0;padding:11px 12px;border-radius:12px;color:#9b4239;background:#fff3f1;border:1px solid #f4c6c0;font-size:.82rem;font-weight:800;line-height:1.35}.budget-add-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px}.budget-add-row span{color:#839197;font-size:.76rem;line-height:1.3}.budget-add-row button{border:0;padding:0;color:#1686a1;background:transparent;font-size:.82rem;font-weight:900}
      @media(min-width:560px){.budget-overlay{align-items:center;justify-content:center;padding:20px}.budget-modal{border-radius:24px}}@media(max-width:390px){.tabbar.budget-enabled-tabbar .tab-btn{font-size:.56rem!important}.tabbar.budget-enabled-tabbar .tab-icon{font-size:1.18rem!important}.budget-wrap{padding-left:14px;padding-right:14px}.budget-overview{gap:8px}.budget-overview-primary{padding:13px}.budget-overview-value{font-size:1.5rem}.budget-mini-card{padding:11px}.budget-action{font-size:.69rem}.budget-modal{padding-left:19px;padding-right:19px}.budget-form-two{gap:8px}.budget-line{padding-left:11px;padding-right:11px}.budget-line-plan{min-width:56px;font-size:.84rem}}
    `;
    document.head.appendChild(style);
  }

  function monthExists(key) {
    return !!readBudget().months?.[key];
  }

  function monthView(key) {
    const data = readBudget();
    const month = data.months?.[key];
    const prior = findLatestPrior(data, key);
    if (!month) {
      const isCurrent = key === monthKey(today());
      return `<section class="budget-empty-month"><div class="budget-empty-illustration">▦</div><h2 class="budget-empty-title">${isCurrent ? "Build this month’s budget" : `Create your ${esc(shortMonth(key))} budget`}</h2><p class="budget-empty-copy">${prior ? `Start with a copy of your ${esc(monthLabel(prior))} plan, then adjust it for the new month.` : "Add your income and assign each dollar to a spending, saving or debt-payoff category."}</p><button class="btn full" data-budget-action="create-month" data-month="${key}">${prior ? `Copy ${esc(shortMonth(prior))} budget` : "Create monthly budget"}</button>${prior ? `<button class="budget-plain-link" style="margin-top:14px" data-budget-action="create-month-blank" data-month="${key}">Start ${esc(shortMonth(key))} from a blank template</button>` : ""}</section>`;
    }

    const debtState = readDebtState();
    const incomePlan = plannedIncome(month, key, debtState);
    const incomeSpent = incomeActual(month);
    const expensePlan = plannedExpenses(month, debtState);
    const expenseSpent = actualExpenses(month, debtState, key);
    const remaining = cents(incomePlan - expensePlan);
    const status = budgetStatus(remaining);
    const plannedDebt = debtBudgetAmount(debtState);
    const trackedDebt = completedDebtAmount(debtState, key);
    const incomeRows = (month.incomes || []).length ? month.incomes.map(source => {
      const dates = sourceDates(source, key, debtState);
      const planned = sourcePlan(source, key, debtState);
      const actual = sourceActual(source, month);
      const summary = source.frequency === "biweekly" ? `${dates.length} planned check${dates.length === 1 ? "" : "s"}${dates.length ? ` · ${dates.map(date => date.toLocaleDateString("en-US", { month:"short", day:"numeric" })).join(", ")}` : ""}` : source.frequency === "semimonthly" ? `${dates.length} planned paydays` : source.frequency === "once" ? "One-time income" : "Monthly income";
      return `<button class="budget-line" data-budget-action="edit-income" data-source-id="${esc(source.id)}"><span><span class="budget-line-name">${esc(source.name)}</span><span class="budget-line-sub">${esc(summary)}</span></span><span class="budget-line-actual">Actual ${money.format(actual)}</span><span class="budget-line-plan">${money.format(planned)}</span><span class="budget-line-arrow">›</span></button>`;
    }).join("") : `<div class="budget-add-row"><span>Add your take-home pay, side income or any other income you expect this month.</span><button data-budget-action="add-income">+ Add income</button></div>`;

    const groups = (month.groups || []).map(group => {
      const groupPlan = cents((group.categories || []).reduce((sum, category) => sum + categoryPlan(category, debtState), 0));
      const groupActual = cents((group.categories || []).reduce((sum, category) => sum + categoryActual(category, month, debtState, key), 0));
      const lines = (group.categories || []).map(category => {
        const planned = categoryPlan(category, debtState);
        const actual = categoryActual(category, month, debtState, key);
        const sub = category.auto === "debt" ? `${money.format(activeDebts(debtState).reduce((sum, debt) => sum + Math.max(0, number(debt.minimum)), 0))} minimums${Math.max(0, number(debtState.settings?.extra)) ? ` + ${money.format(Math.max(0, number(debtState.settings?.extra)))} extra payoff` : ""}` : `Spent ${money.format(actual)} of ${money.format(planned)}`;
        return `<button class="budget-line" data-budget-action="edit-category" data-category-id="${esc(category.id)}"><span><span class="budget-line-name">${esc(category.name)} ${category.auto ? '<span class="budget-chip">Synced</span>' : ""}</span><span class="budget-line-sub">${esc(sub)}</span></span><span class="budget-line-actual">${money.format(actual)} spent</span><span class="budget-line-plan">${money.format(planned)}</span><span class="budget-line-arrow">›</span></button>`;
      }).join("");
      return `<section class="budget-group"><div class="budget-group-head"><span class="budget-group-name">${esc(group.name)}</span><span class="budget-group-totals">Planned / spent<strong>${money.format(groupPlan)} / ${money.format(groupActual)}</strong></span></div>${lines}<button class="budget-group-add" data-budget-action="add-category" data-group-id="${esc(group.id)}">+ Add item</button></section>`;
    }).join("");

    const recentTransactions = [...(month.transactions || [])].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 5);
    const transactionRows = recentTransactions.length ? recentTransactions.map(item => {
      const category = findCategory(month, item.categoryId);
      const source = (month.incomes || []).find(income => String(income.id) === String(item.sourceId));
      const name = item.name || (item.type === "income" ? source?.name || "Income" : category?.category?.name || "Expense");
      const type = item.type === "income" ? "income" : "expense";
      return `<div class="budget-transaction"><span class="budget-transaction-icon ${type}">${type === "income" ? "+" : "−"}</span><span class="budget-transaction-name">${esc(name)}<span class="budget-transaction-date">${esc(item.date || "")}${item.note ? ` · ${esc(item.note)}` : ""}</span></span><span class="budget-transaction-amount ${type}">${type === "income" ? "+" : "−"}${money.format(item.amount)}</span></div>`;
    }).join("") : `<div class="budget-add-row"><span>No manual budget transactions recorded for ${esc(shortMonth(key))} yet.</span><button data-budget-action="record-transaction">+ Record</button></div>`;

    return `<section class="budget-overview"><div class="budget-overview-primary"><span class="budget-overview-label">Planned income</span><strong class="budget-overview-value">${money.format(incomePlan)}</strong><span class="budget-overview-note">Actual received ${money.format(incomeSpent)}</span></div><div class="budget-overview-side"><div class="budget-mini-card"><span>Planned outflow</span><strong>${money.format(expensePlan)}</strong></div><div class="budget-mini-card"><span>Actual spending</span><strong>${money.format(expenseSpent)}</strong></div></div></section><div class="budget-status ${status.tone}"><span class="budget-status-icon">${status.icon}</span><span>${status.label}</span></div><section class="budget-action-row"><button class="budget-action" data-budget-action="add-income">+ Income</button><button class="budget-action" data-budget-action="add-category">+ Item</button><button class="budget-action" data-budget-action="record-transaction">Record</button></section><section class="budget-section"><div class="budget-section-head"><div><h2 class="budget-section-title">Income</h2><p class="budget-section-copy">Plan the paychecks and other income you expect this month.</p></div><span class="budget-section-total">${money.format(incomePlan)}</span></div><div class="budget-card">${incomeRows}</div></section><section class="budget-section"><div class="budget-section-head"><div><h2 class="budget-section-title">Monthly plan</h2><p class="budget-section-copy">Debt payments sync from the DebtWizard payoff plan.</p></div><span class="budget-section-total">${money.format(expensePlan)}</span></div>${groups}<div class="budget-add-row"><span>Need a new section for this month?</span><button data-budget-action="add-category">+ Add category</button></div></section><section class="budget-section"><div class="budget-section-head"><div><h2 class="budget-section-title">Recent activity</h2><p class="budget-section-copy">Manual income and expense entries for this monthly budget.</p></div><button class="btn secondary slim" data-budget-action="record-transaction">Record</button></div><div class="budget-card budget-transactions">${transactionRows}</div></section><section class="budget-section"><div class="budget-card card-pad"><p class="eyebrow">Debt plan connection</p><div class="focus-line"><div><div class="focus-name">Debt payments</div><p class="focus-copy">${money.format(plannedDebt)} planned from current payoff settings · ${money.format(trackedDebt)} recorded this month.</p></div><button class="btn secondary slim" data-budget-action="go-debts">View</button></div></div></section>`;
  }

  function renderBudget() {
    styles();
    navButton();
    if (!budgetActive) return;
    const current = selectedMonth;
    screen.innerHTML = `<section class="budget-page"><header class="budget-hero"><div class="budget-hero-inner"><div class="budget-hero-row"><div><h1 class="budget-title">Budget</h1><p class="budget-subtitle">Plan every dollar before the month begins.</p></div><button class="icon-btn" data-budget-action="record-transaction" aria-label="Record budget transaction">＋</button></div><div class="budget-month-switcher"><button class="budget-month-button" data-budget-action="previous-month" aria-label="Previous month">‹</button><div class="budget-month-current">${esc(monthLabel(current))}</div><button class="budget-month-button" data-budget-action="next-month" aria-label="Next month">›</button></div></div></header><div class="budget-sheet"><div class="budget-wrap">${monthView(current)}</div></div></section>`;
    setBudgetActive(true);
  }

  function findCategory(month, id) {
    for (const group of month.groups || []) {
      const category = (group.categories || []).find(item => String(item.id) === String(id));
      if (category) return { group, category };
    }
    return null;
  }

  function closeModal() { modalRoot.innerHTML = ""; }

  function openModal(title, copy, content) {
    modalRoot.innerHTML = `<div class="budget-overlay" id="budget-overlay"><section class="budget-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="budget-modal-head"><button class="budget-modal-close" type="button" data-budget-modal-close aria-label="Close">×</button><h2 class="budget-modal-title">${esc(title)}</h2><span></span></div>${copy ? `<p class="budget-modal-copy">${copy}</p>` : ""}${content}</section></div>`;
  }

  function incomeForm(source = null) {
    const debtState = readDebtState();
    const existing = source || { name:"Paycheck", amount:"", frequency: debtState.settings?.fundingFrequency === "biweekly" ? "biweekly" : "monthly", nextDate: debtState.settings?.nextPayDate || inputDate(today()), day: 1, firstDay: debtState.settings?.semiMonthlyFirstDay || 1, secondDay: debtState.settings?.semiMonthlySecondDay || 15 };
    const isEdit = !!source;
    const scheduleFields = existing.frequency === "biweekly" ? `<label class="budget-field">Next paycheck date<input name="nextDate" type="date" value="${esc(existing.nextDate || inputDate(today()))}" required></label>` : existing.frequency === "semimonthly" ? `<div class="budget-form-two"><label class="budget-field">First payday<select name="firstDay">${Array.from({length:28}, (_, index) => index + 1).map(day => `<option value="${day}" ${day === Number(existing.firstDay) ? "selected" : ""}>${day}</option>`).join("")}</select></label><label class="budget-field">Second payday<select name="secondDay">${Array.from({length:28}, (_, index) => index + 1).map(day => `<option value="${day}" ${day === Number(existing.secondDay) ? "selected" : ""}>${day}</option>`).join("")}</select></label></div>` : existing.frequency === "once" ? `<label class="budget-field">Expected date<input name="date" type="date" value="${esc(existing.date || `${selectedMonth}-01`)}" required></label>` : `<label class="budget-field">Expected day each month<select name="day">${Array.from({length:28}, (_, index) => index + 1).map(day => `<option value="${day}" ${day === Number(existing.day) ? "selected" : ""}>${day}</option>`).join("")}</select></label>`;
    openModal(isEdit ? "Edit income" : "Add income", "Use take-home pay, side income, reimbursements or other income you expect for this month.", `<form class="budget-form" id="budget-income-form"><label class="budget-field">Income name<input name="name" value="${esc(existing.name)}" placeholder="Example: SSI paycheck" required></label><div class="budget-form-two"><label class="budget-field">Amount per payment<input name="amount" type="number" min="0" step=".01" inputmode="decimal" value="${number(existing.amount) || ""}" placeholder="0.00" required></label><label class="budget-field">Schedule<select name="frequency"><option value="monthly" ${existing.frequency === "monthly" ? "selected" : ""}>Monthly</option><option value="biweekly" ${existing.frequency === "biweekly" ? "selected" : ""}>Bi-weekly</option><option value="semimonthly" ${existing.frequency === "semimonthly" ? "selected" : ""}>Twice monthly</option><option value="once" ${existing.frequency === "once" ? "selected" : ""}>One-time</option></select></label></div><div id="budget-income-schedule">${scheduleFields}</div><div class="budget-modal-actions"><button class="budget-save" type="submit">${isEdit ? "Save income" : "Add income"}</button>${isEdit ? '<button class="budget-delete" type="button" data-budget-delete-income>Delete</button>' : ""}</div></form>`);
    const form = modalRoot.querySelector("#budget-income-form");
    const refreshSchedule = () => {
      const frequency = form.elements.frequency.value;
      const values = Object.fromEntries(new FormData(form).entries());
      const temporary = { ...existing, ...values, frequency };
      const field = frequency === "biweekly" ? `<label class="budget-field">Next paycheck date<input name="nextDate" type="date" value="${esc(temporary.nextDate || debtState.settings?.nextPayDate || inputDate(today()))}" required></label>` : frequency === "semimonthly" ? `<div class="budget-form-two"><label class="budget-field">First payday<select name="firstDay">${Array.from({length:28}, (_, index) => index + 1).map(day => `<option value="${day}" ${day === Number(temporary.firstDay || 1) ? "selected" : ""}>${day}</option>`).join("")}</select></label><label class="budget-field">Second payday<select name="secondDay">${Array.from({length:28}, (_, index) => index + 1).map(day => `<option value="${day}" ${day === Number(temporary.secondDay || 15) ? "selected" : ""}>${day}</option>`).join("")}</select></label></div>` : frequency === "once" ? `<label class="budget-field">Expected date<input name="date" type="date" value="${esc(temporary.date || `${selectedMonth}-01`)}" required></label>` : `<label class="budget-field">Expected day each month<select name="day">${Array.from({length:28}, (_, index) => index + 1).map(day => `<option value="${day}" ${day === Number(temporary.day || 1) ? "selected" : ""}>${day}</option>`).join("")}</select></label>`;
      modalRoot.querySelector("#budget-income-schedule").innerHTML = field;
    };
    form.elements.frequency.addEventListener("change", refreshSchedule);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const formData = Object.fromEntries(new FormData(form).entries());
      const data = readBudget();
      const month = data.months[selectedMonth];
      if (!month) return;
      const target = source ? (month.incomes || []).find(item => String(item.id) === String(source.id)) : null;
      const item = target || { id: uid("income") };
      item.name = String(formData.name || "Income").trim();
      item.amount = cents(formData.amount);
      item.frequency = formData.frequency;
      item.nextDate = formData.nextDate || "";
      item.day = Math.max(1, Math.min(28, Math.floor(number(formData.day)) || 1));
      item.firstDay = Math.max(1, Math.min(28, Math.floor(number(formData.firstDay)) || 1));
      item.secondDay = Math.max(1, Math.min(28, Math.floor(number(formData.secondDay)) || 15));
      item.date = formData.date || "";
      if (!target) (month.incomes ||= []).push(item);
      saveBudget(data); closeModal(); renderBudget();
    });
    modalRoot.querySelector("[data-budget-delete-income]")?.addEventListener("click", () => {
      const data = readBudget(); const month = data.months[selectedMonth];
      month.incomes = (month.incomes || []).filter(item => String(item.id) !== String(source.id));
      month.transactions = (month.transactions || []).filter(item => String(item.sourceId) !== String(source.id));
      saveBudget(data); closeModal(); renderBudget();
    });
  }

  function categoryForm(match = null, preselectedGroupId = "") {
    const data = readBudget();
    const month = data.months[selectedMonth];
    if (!month) return;
    const category = match?.category;
    const group = match?.group;
    const isEdit = !!category;
    if (category?.auto) {
      openModal("Debt payment plan", "This line is automatically connected to your DebtWizard minimum payments and extra-payoff strategy.", `<div class="budget-auto-note">Budgeted debt payments are currently ${money.format(debtBudgetAmount(readDebtState()))}. Update the minimum payments on each debt or change your Strategy funding amount to adjust this line.</div><div class="budget-modal-actions" style="grid-template-columns:1fr"><button class="budget-save" type="button" data-budget-action="go-debts">View debts and strategy</button></div>`);
      return;
    }
    const groups = month.groups || [];
    openModal(isEdit ? "Edit budget item" : "Add budget item", "Set the planned amount for this month. Record purchases later to compare actual spending.", `<form class="budget-form" id="budget-category-form"><label class="budget-field">Item name<input name="name" value="${esc(category?.name || "")}" placeholder="Example: Groceries" required></label><label class="budget-field">Budget group<select name="groupId">${groups.map(item => `<option value="${esc(item.id)}" ${(group?.id || preselectedGroupId) === item.id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}<option value="new">+ New group</option></select></label><label class="budget-field" id="budget-new-group-field" style="display:none">New group name<input name="newGroupName" placeholder="Example: Pets"></label><label class="budget-field">Planned amount<input name="planned" type="number" min="0" step=".01" inputmode="decimal" value="${number(category?.planned) || ""}" placeholder="0.00" required></label><div class="budget-modal-actions"><button class="budget-save" type="submit">${isEdit ? "Save item" : "Add item"}</button>${isEdit ? '<button class="budget-delete" type="button" data-budget-delete-category>Delete</button>' : ""}</div></form>`);
    const form = modalRoot.querySelector("#budget-category-form");
    const toggleGroupField = () => modalRoot.querySelector("#budget-new-group-field").style.display = form.elements.groupId.value === "new" ? "grid" : "none";
    form.elements.groupId.addEventListener("change", toggleGroupField); toggleGroupField();
    form.addEventListener("submit", event => {
      event.preventDefault(); const values = Object.fromEntries(new FormData(form).entries()); const data = readBudget(); const month = data.months[selectedMonth];
      let targetGroup = values.groupId === "new" ? null : (month.groups || []).find(item => String(item.id) === String(values.groupId));
      if (!targetGroup) { const groupName = String(values.newGroupName || "Other").trim() || "Other"; targetGroup = { id:uid("group"), name:groupName, categories:[] }; month.groups.push(targetGroup); }
      if (category) {
        const previousGroup = (month.groups || []).find(item => (item.categories || []).some(item => String(item.id) === String(category.id)));
        previousGroup.categories = previousGroup.categories.filter(item => String(item.id) !== String(category.id));
        category.name = String(values.name || "Item").trim(); category.planned = cents(values.planned); targetGroup.categories.push(category);
      } else targetGroup.categories.push({ id:uid("cat"), name:String(values.name || "Item").trim(), planned:cents(values.planned) });
      saveBudget(data); closeModal(); renderBudget();
    });
    modalRoot.querySelector("[data-budget-delete-category]")?.addEventListener("click", () => {
      const data = readBudget(); const month = data.months[selectedMonth]; const owner = (month.groups || []).find(item => (item.categories || []).some(item => String(item.id) === String(category.id)));
      if (owner) owner.categories = owner.categories.filter(item => String(item.id) !== String(category.id));
      month.transactions = (month.transactions || []).filter(item => String(item.categoryId) !== String(category.id));
      saveBudget(data); closeModal(); renderBudget();
    });
  }

  function transactionForm() {
    const data = readBudget(); const month = data.months[selectedMonth]; if (!month) return;
    const categories = (month.groups || []).flatMap(group => (group.categories || []).filter(category => !category.auto).map(category => ({ group, category })));
    const incomes = month.incomes || [];
    const selectedDate = selectedMonth === monthKey(today()) ? inputDate(today()) : `${selectedMonth}-01`;
    openModal("Record transaction", "Add money received or an expense you paid. This updates the actual amount in your monthly budget.", `<form class="budget-form" id="budget-transaction-form"><label class="budget-field">Type<div class="budget-form-choice"><button type="button" class="active" data-budget-type="expense">Expense</button><button type="button" data-budget-type="income">Income</button></div><input type="hidden" name="type" value="expense"></label><label class="budget-field" id="budget-transaction-target">Budget item<select name="categoryId">${categories.map(item => `<option value="${esc(item.category.id)}">${esc(item.group.name)} · ${esc(item.category.name)}</option>`).join("") || '<option value="">Add a budget item first</option>'}</select></label><label class="budget-field">Amount<input name="amount" type="number" min="0" step=".01" inputmode="decimal" placeholder="0.00" required></label><label class="budget-field">Date<input name="date" type="date" value="${selectedDate}" required></label><label class="budget-field">Note <span style="font-weight:650;color:#8c999e">optional</span><input name="note" placeholder="Example: Costco" /></label><div class="budget-modal-actions"><button class="budget-save" type="submit">Save transaction</button></div></form>`);
    const form = modalRoot.querySelector("#budget-transaction-form");
    const renderTarget = () => {
      const type = form.elements.type.value;
      modalRoot.querySelector("#budget-transaction-target").innerHTML = type === "income" ? `<label class="budget-field">Income source<select name="sourceId">${incomes.map(source => `<option value="${esc(source.id)}">${esc(source.name)}</option>`).join("") || '<option value="">Income</option>'}</select></label>` : `<label class="budget-field">Budget item<select name="categoryId">${categories.map(item => `<option value="${esc(item.category.id)}">${esc(item.group.name)} · ${esc(item.category.name)}</option>`).join("") || '<option value="">Add a budget item first</option>'}</select></label>`;
    };
    form.querySelectorAll("[data-budget-type]").forEach(button => button.addEventListener("click", () => { form.elements.type.value = button.dataset.budgetType; form.querySelectorAll("[data-budget-type]").forEach(item => item.classList.toggle("active", item === button)); renderTarget(); }));
    form.addEventListener("submit", event => {
      event.preventDefault(); const values = Object.fromEntries(new FormData(form).entries());
      if (values.type === "expense" && !values.categoryId) { alert("Add a budget item before recording an expense."); return; }
      const data = readBudget(); const month = data.months[selectedMonth];
      month.transactions.push({ id:uid("txn"), type:values.type, categoryId:values.categoryId || "", sourceId:values.sourceId || "", amount:cents(values.amount), date:values.date, note:String(values.note || "").trim(), name:"" });
      saveBudget(data); closeModal(); renderBudget();
    });
  }

  function handleAction(button) {
    const action = button.dataset.budgetAction;
    if (!action) return false;
    if (action === "previous-month") { selectedMonth = nextMonth(selectedMonth, -1); renderBudget(); return true; }
    if (action === "next-month") { selectedMonth = nextMonth(selectedMonth, 1); renderBudget(); return true; }
    if (action === "create-month" || action === "create-month-blank") { ensureMonth(button.dataset.month || selectedMonth, action === "create-month-blank" ? "" : undefined); selectedMonth = button.dataset.month || selectedMonth; renderBudget(); return true; }
    if (action === "add-income") { if (!monthExists(selectedMonth)) ensureMonth(selectedMonth); incomeForm(); return true; }
    if (action === "edit-income") { const month = readBudget().months[selectedMonth]; const source = (month?.incomes || []).find(item => String(item.id) === String(button.dataset.sourceId)); if (source) incomeForm(source); return true; }
    if (action === "add-category") { if (!monthExists(selectedMonth)) ensureMonth(selectedMonth); categoryForm(null, button.dataset.groupId || ""); return true; }
    if (action === "edit-category") { const month = readBudget().months[selectedMonth]; const match = findCategory(month, button.dataset.categoryId); if (match) categoryForm(match); return true; }
    if (action === "record-transaction") { if (!monthExists(selectedMonth)) ensureMonth(selectedMonth); transactionForm(); return true; }
    if (action === "go-debts") { closeModal(); setBudgetActive(false); tabbar.querySelector('[data-page="debts"]')?.click(); return true; }
    return false;
  }

  document.addEventListener("click", event => {
    const budgetNav = event.target.closest("[data-budget-nav]");
    if (budgetNav) {
      event.preventDefault(); event.stopImmediatePropagation(); event.stopPropagation();
      setBudgetActive(true); renderBudget(); return;
    }
    const coreTab = event.target.closest("#tabbar [data-page]");
    if (coreTab && budgetActive) setBudgetActive(false);
    const action = event.target.closest("[data-budget-action]");
    if (action) {
      event.preventDefault(); event.stopImmediatePropagation(); event.stopPropagation();
      handleAction(action);
    }
    if (event.target.id === "budget-overlay" || event.target.closest("[data-budget-modal-close]")) closeModal();
  }, true);

  function init() {
    styles(); navButton();
  }

  let frame = 0;
  new MutationObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      navButton();
      if (budgetActive && !screen.querySelector(".budget-page")) renderBudget();
    });
  }).observe(document.body, { childList:true, subtree:true });
  init();
})();
