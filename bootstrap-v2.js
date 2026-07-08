(async () => {
  const target = document.getElementById("screen");
  try {
    const response = await fetch("app-v2.js", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load application code.");
    let source = await response.text();

    const incomeFields = [
      ["paycheck", "Paycheck"],
      ["secondPaycheck", "Second paycheck"],
      ["sideIncome", "Side income"],
      ["otherIncome", "Other income"]
    ];
    const budgetFields = [
      ["housing", "Housing"],
      ["utilities", "Utilities"],
      ["food", "Food"],
      ["transportation", "Transportation"],
      ["insurance", "Insurance"],
      ["subscriptions", "Subscriptions"],
      ["savings", "Savings"],
      ["giving", "Giving"],
      ["personal", "Personal"],
      ["other", "Other"]
    ];
    const budgetNumber = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
    const budgetRound = value => Math.round((value + Number.EPSILON) * 100) / 100;
    const budgetSum = value => Object.values(value || {}).reduce((sum, item) => sum + Math.max(0, budgetNumber(item)), 0);
    const validBudgetMonth = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
    const currentBudgetMonth = () => {
      const date = new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    };
    const budgetMonthDate = value => {
      const safe = validBudgetMonth(value) ? value : currentBudgetMonth();
      return new Date(`${safe}-01T12:00:00`);
    };
    const budgetMonthKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const addBudgetMonths = (value, offset) => {
      const date = budgetMonthDate(value);
      date.setMonth(date.getMonth() + offset);
      return budgetMonthKey(date);
    };
    const budgetMonthLabel = value => budgetMonthDate(value).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const shortBudgetMonth = value => budgetMonthDate(value).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const budgetYear = value => String(budgetMonthDate(value).getFullYear());
    const cleanBudgetValues = (fields, values = {}) => Object.fromEntries(fields.map(([key]) => [key, Math.max(0, budgetNumber(values?.[key]))]));
    const blankBudgetValues = fields => Object.fromEntries(fields.map(([key]) => [key, 0]));
    const cloneBudget = budget => ({
      incomeSources: cleanBudgetValues(incomeFields, budget?.incomeSources || blankBudgetValues(incomeFields)),
      budgetCategories: cleanBudgetValues(budgetFields, budget?.budgetCategories || blankBudgetValues(budgetFields)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const syncFlatBudgetFields = (settings, budget) => {
      settings.incomeSources = cleanBudgetValues(incomeFields, budget?.incomeSources);
      settings.budgetCategories = cleanBudgetValues(budgetFields, budget?.budgetCategories);
    };
    const ensureBudgetSettings = state => {
      if (!state.settings || typeof state.settings !== "object") state.settings = {};
      const settings = state.settings;
      const flatIncome = cleanBudgetValues(incomeFields, settings.incomeSources || { paycheck: settings.monthlyIncome });
      const flatCategories = cleanBudgetValues(budgetFields, settings.budgetCategories);
      const existing = settings.monthlyBudgets && typeof settings.monthlyBudgets === "object" ? settings.monthlyBudgets : {};
      settings.monthlyBudgets = {};
      Object.entries(existing).forEach(([month, budget]) => {
        if (!validBudgetMonth(month) || !budget || typeof budget !== "object") return;
        settings.monthlyBudgets[month] = {
          incomeSources: cleanBudgetValues(incomeFields, budget.incomeSources),
          budgetCategories: cleanBudgetValues(budgetFields, budget.budgetCategories),
          createdAt: String(budget.createdAt || ""),
          updatedAt: String(budget.updatedAt || "")
        };
      });
      settings.incomeSources = flatIncome;
      settings.budgetCategories = flatCategories;
      if (!Object.keys(settings.monthlyBudgets).length && budgetSum(flatIncome) + budgetSum(flatCategories) > 0) {
        const month = currentBudgetMonth();
        settings.monthlyBudgets[month] = { incomeSources: { ...flatIncome }, budgetCategories: { ...flatCategories }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      }
      return settings;
    };
    const budgetKeys = settings => Object.keys(settings.monthlyBudgets || {}).filter(validBudgetMonth).sort();
    const sourceBudgetMonth = (settings, targetMonth) => {
      const keys = budgetKeys(settings).filter(month => month !== targetMonth);
      return keys.filter(month => month < targetMonth).at(-1) || keys.at(-1) || "";
    };
    const createMonthlyBudget = (settings, targetMonth) => {
      if (settings.monthlyBudgets[targetMonth]) return { budget: settings.monthlyBudgets[targetMonth], copiedFrom: "" };
      const copiedFrom = sourceBudgetMonth(settings, targetMonth);
      const budget = cloneBudget(copiedFrom ? settings.monthlyBudgets[copiedFrom] : null);
      settings.monthlyBudgets[targetMonth] = budget;
      syncFlatBudgetFields(settings, budget);
      return { budget, copiedFrom };
    };
    const selectedBudgetMonth = ui => {
      if (!validBudgetMonth(ui.budgetMonth)) ui.budgetMonth = currentBudgetMonth();
      return ui.budgetMonth;
    };
    const budgetRows = (fields, group, values) => fields.map(([key, label]) => `<label class="budget-input-row"><span>${label}</span><input name="${group}-${key}" type="number" min="0" step="0.01" inputmode="decimal" value="${budgetNumber(values[key]) || ""}" placeholder="0.00"></label>`).join("");
    const budgetMonthBar = (settings, month) => {
      const months = [-2, -1, 0, 1, 2].map(offset => addBudgetMonths(month, offset));
      const today = currentBudgetMonth();
      return `<section class="budget-month-tools"><div class="budget-month-row"><button class="budget-month-arrow" data-act="budget-month-prev" aria-label="Previous month">‹</button><label class="budget-month-picker"><span>Budget month</span><input id="budget-month-picker" type="month" value="${month}"></label><button class="budget-month-arrow" data-act="budget-month-next" aria-label="Next month">›</button></div><div class="budget-month-strip">${months.map(item => `<button class="budget-month-chip ${item === month ? "active" : ""} ${settings.monthlyBudgets[item] ? "has-budget" : "empty-budget"}" data-act="budget-month" data-month="${item}"><strong>${shortBudgetMonth(item)}</strong><span>${budgetYear(item)}</span>${item === today ? `<small>Today</small>` : ""}</button>`).join("")}</div></section>`;
    };
    const createBudgetPage = (settings, month) => {
      const sourceMonth = sourceBudgetMonth(settings, month);
      const helper = sourceMonth ? `We'll copy ${budgetMonthLabel(sourceMonth)}'s budget to get you started.` : "Start from a blank budget and assign your income for the month.";
      return `<section class="app-page"><header class="mobile-hero budget-hero"><div class="hero-inner"><div class="hero-row"><div><h1 class="hero-title">${budgetMonthLabel(month)}</h1><p class="hero-subtitle">Create a monthly budget before assigning dollars.</p></div><button class="icon-btn" data-act="settings" aria-label="Open settings">⚙</button></div></div></header><div class="page-sheet"><div class="page-wrap">${budgetMonthBar(settings, month)}<section class="section"><article class="budget-create-card"><div class="budget-create-icon">▣</div><h2>Let's create your ${budgetMonthDate(month).toLocaleDateString("en-US", { month: "long" })} budget.</h2><p>${helper}</p><button class="btn full" data-act="create-budget-month">Create ${budgetMonthDate(month).toLocaleDateString("en-US", { month: "long" })} Budget</button></article></section></div></div></section>`;
    };

    window.debtWizardBudgetPage = ({ state, ui, money, minimums, num }) => {
      const settings = ensureBudgetSettings(state);
      const month = selectedBudgetMonth(ui);
      const monthBudget = settings.monthlyBudgets[month];
      if (!monthBudget) return createBudgetPage(settings, month);
      const incomeTotal = budgetRound(budgetSum(monthBudget.incomeSources));
      const assignedTotal = budgetRound(budgetSum(monthBudget.budgetCategories));
      const debtMinimums = budgetRound(minimums());
      const extra = budgetRound(Math.max(0, num(settings.extra)));
      const remaining = budgetRound(incomeTotal - assignedTotal - debtMinimums - extra);
      const over = remaining < -0.004;
      return `<section class="app-page"><header class="mobile-hero budget-hero"><div class="hero-inner"><div class="hero-row"><div><h1 class="hero-title">${budgetMonthLabel(month)}</h1><p class="hero-subtitle">Assign income before it leaves your account.</p></div><button class="icon-btn" data-act="settings" aria-label="Open settings">⚙</button></div></div></header><div class="page-sheet"><div class="page-wrap">${budgetMonthBar(settings, month)}<form id="budget-form" data-month="${month}">
        <section class="section"><h2 class="section-title">Monthly budget</h2><div class="budget-summary-grid"><article class="stat-tile featured"><div class="stat-label">Remaining to assign</div><span class="stat-value">${money.format(remaining)}</span><div class="stat-note">${over ? "Budget is overassigned" : "Available after budget and debt"}</div></article><article class="stat-tile"><div class="stat-label">Monthly income</div><span class="stat-value">${money.format(incomeTotal)}</span><div class="stat-note">Take-home income</div></article><article class="stat-tile"><div class="stat-label">Assigned budget</div><span class="stat-value">${money.format(assignedTotal)}</span><div class="stat-note">Spending categories</div></article><article class="stat-tile"><div class="stat-label">Debt payments</div><span class="stat-value">${money.format(debtMinimums + extra)}</span><div class="stat-note">${money.format(debtMinimums)} minimums + ${money.format(extra)} extra</div></article></div>${over ? `<article class="budget-alert">You are overassigned by <strong>${money.format(Math.abs(remaining))}</strong>. Lower a category, reduce extra debt payoff, or increase income.</article>` : ""}</section>
        <section class="section"><div class="section-head"><h2 class="section-title" style="margin:0">Income</h2><span class="budget-section-total">${money.format(incomeTotal)}</span></div><article class="card flat card-pad budget-card">${budgetRows(incomeFields, "income", monthBudget.incomeSources)}</article></section>
        <section class="section"><div class="section-head"><h2 class="section-title" style="margin:0">Assigned spending</h2><span class="budget-section-total">${money.format(assignedTotal)}</span></div><article class="card flat card-pad budget-card">${budgetRows(budgetFields, "budget", monthBudget.budgetCategories)}</article></section>
        <section class="section"><h2 class="section-title">Debt plan pull-in</h2><article class="card flat card-pad budget-card"><div class="budget-readonly-row"><span>Active debt minimums</span><strong>${money.format(debtMinimums)}</strong></div><div class="budget-readonly-row"><span>Extra debt payoff</span><strong>${money.format(extra)}</strong></div><p class="section-note">Minimums come from active debt accounts. Extra debt payoff is still managed from Strategy.</p></article><div class="sheet-actions"><button class="btn full" type="submit">Save ${budgetMonthDate(month).toLocaleDateString("en-US", { month: "long" })} budget</button></div></section>
      </form></div></div></section>`;
    };
    window.debtWizardBudgetSubmit = ({ event, state, ui, save, render, num }) => {
      const form = event.target;
      if (form.id !== "budget-form") return false;
      event.preventDefault();
      const data = new FormData(form);
      const settings = ensureBudgetSettings(state);
      const month = validBudgetMonth(form.dataset.month) ? form.dataset.month : selectedBudgetMonth(ui);
      const monthBudget = settings.monthlyBudgets[month] || createMonthlyBudget(settings, month).budget;
      incomeFields.forEach(([key]) => { monthBudget.incomeSources[key] = Math.max(0, num(data.get(`income-${key}`))); });
      budgetFields.forEach(([key]) => { monthBudget.budgetCategories[key] = Math.max(0, num(data.get(`budget-${key}`))); });
      monthBudget.updatedAt = new Date().toISOString();
      syncFlatBudgetFields(settings, monthBudget);
      save(`${budgetMonthLabel(month)} budget saved.`);
      render(false);
      return true;
    };
    window.debtWizardBudgetAction = ({ act, button, state, ui, save, render }) => {
      if (!act.startsWith("budget-month") && act !== "create-budget-month") return false;
      const settings = ensureBudgetSettings(state);
      const month = selectedBudgetMonth(ui);
      if (act === "budget-month") ui.budgetMonth = validBudgetMonth(button.dataset.month) ? button.dataset.month : month;
      if (act === "budget-month-prev") ui.budgetMonth = addBudgetMonths(month, -1);
      if (act === "budget-month-next") ui.budgetMonth = addBudgetMonths(month, 1);
      if (act === "create-budget-month") {
        const result = createMonthlyBudget(settings, month);
        const copied = result.copiedFrom ? ` from ${budgetMonthLabel(result.copiedFrom)}` : "";
        save(`${budgetMonthLabel(month)} budget created${copied}.`);
      }
      render(false);
      return true;
    };

    if (!document.getElementById("budget-page-styles")) {
      const style = document.createElement("style");
      style.id = "budget-page-styles";
      style.textContent = `
        .tabbar{grid-template-columns:repeat(6,1fr)}
        .tab-btn{font-size:.64rem}
        .tab-icon{font-size:1.28rem}
        .budget-hero{min-height:157px}
        .budget-month-tools{padding:14px 0 9px;border-bottom:10px solid var(--divider)}
        .budget-month-row{display:grid;grid-template-columns:42px minmax(0,1fr) 42px;gap:9px;align-items:center;margin-bottom:12px}
        .budget-month-arrow{height:42px;border:1px solid #d7e7ea;border-radius:13px;background:#fff;color:#0f7893;font-size:1.7rem;line-height:1}
        .budget-month-picker{display:grid;gap:4px;color:#6d7b80;font-size:.72rem;font-weight:850;text-transform:uppercase;letter-spacing:.08em}
        .budget-month-picker input{width:100%;min-height:42px;border:1px solid #d7e7ea;border-radius:13px;padding:8px 11px;color:#153f51;background:#fff;font-size:1rem;font-weight:900;text-transform:none;letter-spacing:0}
        .budget-month-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
        .budget-month-chip{min-width:0;min-height:65px;border:2px dashed #1782aa;border-radius:10px;background:#fff;color:#13759b;padding:7px 3px;line-height:1.08;font-weight:850;text-align:center}
        .budget-month-chip.has-budget{border-style:solid}
        .budget-month-chip.active{border-color:#0d7fb3;background:#0d7fb3;color:#fff;box-shadow:0 6px 14px rgba(13,127,179,.18)}
        .budget-month-chip strong{display:block;font-size:.78rem;letter-spacing:.03em}.budget-month-chip span{display:block;margin-top:3px;font-size:.76rem}.budget-month-chip small{display:block;margin-top:5px;font-size:.62rem;color:inherit;opacity:.9}
        .budget-create-card{min-height:430px;display:grid;align-content:center;gap:14px;text-align:center;padding:32px 4px}.budget-create-icon{width:104px;height:104px;margin:0 auto 10px;display:grid;place-items:center;border-radius:28px;background:#ebfafc;color:#1185a2;font-size:3.8rem}.budget-create-card h2{margin:0;color:#263137;font-size:2.05rem;line-height:1.08;letter-spacing:-.055em}.budget-create-card p{margin:0 auto 10px;max-width:380px;color:#4f5a60;font-size:1.05rem;line-height:1.38}
        .budget-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:14px}
        .budget-summary-grid .featured{grid-column:1 / -1}
        .budget-section-total{color:#0f516b;font-size:1.05rem;font-weight:900;white-space:nowrap}
        .budget-card{display:grid;gap:0}
        .budget-input-row,.budget-readonly-row{display:grid;grid-template-columns:minmax(0,1fr) 126px;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}
        .budget-input-row:first-child,.budget-readonly-row:first-child{padding-top:0}
        .budget-input-row:last-child,.budget-readonly-row:last-child{border-bottom:0;padding-bottom:0}
        .budget-input-row span,.budget-readonly-row span{color:#59666b;font-size:1rem;font-weight:750}
        .budget-input-row input{width:100%;min-height:42px;border:1px solid #dce6e8;border-radius:11px;padding:9px 10px;color:#334449;background:#fff;text-align:right;font-size:16px;font-weight:850}
        .budget-input-row input:focus,.budget-month-picker input:focus{border-color:#43c5dd;outline:3px solid rgba(74,201,223,.16)}
        .budget-readonly-row strong{color:#39454a;text-align:right;font-size:1.04rem}
        .budget-alert{margin-top:12px;padding:12px 13px;border:1px solid #ffd2cf;border-radius:13px;background:#fff4f2;color:#9d3f37;font-size:.9rem;line-height:1.35}
        @media(max-width:390px){.budget-summary-grid{grid-template-columns:1fr}.budget-input-row,.budget-readonly-row{grid-template-columns:minmax(0,1fr) 112px}.tab-btn{font-size:.58rem}.tab-icon{font-size:1.14rem}.budget-month-strip{gap:5px}.budget-month-chip{min-height:58px}.budget-create-card h2{font-size:1.78rem}}
      `;
      document.head.appendChild(style);
    }

    source = source.replace(
      "const trails = Object.fromEntries(state.debts.map(item => [item.id, [{ date: start, balance: item.balance }]));",
      "const trails = Object.fromEntries(state.debts.map(item => [item.id, [{ date: start, balance: item.balance }]]));"
    );

    // Preserve payroll and monthly budget fields in browser storage along with debt data.
    source = source.replace(
      'settings: { strategy: "snowball", extra: 0, start: nowMonth(), cycleDay: 1, customOrder: [], oneTime: [] },',
      'settings: { strategy: "snowball", extra: 0, start: nowMonth(), cycleDay: 1, fundingFrequency: "monthly", paycheckAmount: 0, nextPayDate: "", semiMonthlyFirstDay: 1, semiMonthlySecondDay: 15, incomeSources: { paycheck: 0, secondPaycheck: 0, sideIncome: 0, otherIncome: 0 }, budgetCategories: { housing: 0, utilities: 0, food: 0, transportation: 0, insurance: 0, subscriptions: 0, savings: 0, giving: 0, personal: 0, other: 0 }, monthlyBudgets: {}, customOrder: [], oneTime: [] },'
    );
    source = source.replace(
      'cycleDay: Math.max(1, Math.min(28, Math.floor(num(settings.cycleDay)) || 1)),\n        customOrder:',
      'cycleDay: Math.max(1, Math.min(28, Math.floor(num(settings.cycleDay)) || 1)),\n        fundingFrequency: ["monthly", "semimonthly", "biweekly"].includes(settings.fundingFrequency) ? settings.fundingFrequency : "monthly",\n        paycheckAmount: Math.max(0, num(settings.paycheckAmount)),\n        nextPayDate: /^\\d{4}-\\d{2}-\\d{2}$/.test(settings.nextPayDate || "") ? settings.nextPayDate : "",\n        semiMonthlyFirstDay: Math.max(1, Math.min(28, Math.floor(num(settings.semiMonthlyFirstDay)) || 1)),\n        semiMonthlySecondDay: Math.max(1, Math.min(28, Math.floor(num(settings.semiMonthlySecondDay)) || 15)),\n        incomeSources: {\n          paycheck: Math.max(0, num(settings.incomeSources?.paycheck ?? settings.monthlyIncome)),\n          secondPaycheck: Math.max(0, num(settings.incomeSources?.secondPaycheck)),\n          sideIncome: Math.max(0, num(settings.incomeSources?.sideIncome)),\n          otherIncome: Math.max(0, num(settings.incomeSources?.otherIncome))\n        },\n        budgetCategories: {\n          housing: Math.max(0, num(settings.budgetCategories?.housing)),\n          utilities: Math.max(0, num(settings.budgetCategories?.utilities)),\n          food: Math.max(0, num(settings.budgetCategories?.food)),\n          transportation: Math.max(0, num(settings.budgetCategories?.transportation)),\n          insurance: Math.max(0, num(settings.budgetCategories?.insurance)),\n          subscriptions: Math.max(0, num(settings.budgetCategories?.subscriptions)),\n          savings: Math.max(0, num(settings.budgetCategories?.savings)),\n          giving: Math.max(0, num(settings.budgetCategories?.giving)),\n          personal: Math.max(0, num(settings.budgetCategories?.personal)),\n          other: Math.max(0, num(settings.budgetCategories?.other))\n        },\n        monthlyBudgets: settings.monthlyBudgets && typeof settings.monthlyBudgets === "object" ? Object.fromEntries(Object.entries(settings.monthlyBudgets).filter(([month]) => /^\\d{4}-(0[1-9]|1[0-2])$/.test(month)).map(([month, budget]) => [month, { incomeSources: { paycheck: Math.max(0, num(budget?.incomeSources?.paycheck)), secondPaycheck: Math.max(0, num(budget?.incomeSources?.secondPaycheck)), sideIncome: Math.max(0, num(budget?.incomeSources?.sideIncome)), otherIncome: Math.max(0, num(budget?.incomeSources?.otherIncome)) }, budgetCategories: { housing: Math.max(0, num(budget?.budgetCategories?.housing)), utilities: Math.max(0, num(budget?.budgetCategories?.utilities)), food: Math.max(0, num(budget?.budgetCategories?.food)), transportation: Math.max(0, num(budget?.budgetCategories?.transportation)), insurance: Math.max(0, num(budget?.budgetCategories?.insurance)), subscriptions: Math.max(0, num(budget?.budgetCategories?.subscriptions)), savings: Math.max(0, num(budget?.budgetCategories?.savings)), giving: Math.max(0, num(budget?.budgetCategories?.giving)), personal: Math.max(0, num(budget?.budgetCategories?.personal)), other: Math.max(0, num(budget?.budgetCategories?.other)) }, createdAt: String(budget?.createdAt || ""), updatedAt: String(budget?.updatedAt || "") }])) : {},\n        customOrder:'
    );

    source = source.replace(
      '    ["debts", "Debts", "◔"],\n    ["strategy", "Strategy", "✦"],',
      '    ["debts", "Debts", "◔"],\n    ["budget", "Budget", "$"],\n    ["strategy", "Strategy", "✦"],'
    );
    source = source.replace(
      'if (ui.page === "debts") screen.innerHTML = debtsPage();',
      'if (ui.page === "debts") screen.innerHTML = debtsPage();\n    if (ui.page === "budget") screen.innerHTML = window.debtWizardBudgetPage ? window.debtWizardBudgetPage({ state, ui, money, esc, minimums, num }) : debtsPage();'
    );
    source = source.replace(
      'function submit(event) {\n    const form=event.target;',
      'function submit(event) {\n    const form=event.target;\n    if (window.debtWizardBudgetSubmit && window.debtWizardBudgetSubmit({ event, state, ui, save, render, num })) return;'
    );

    // For bi-weekly/twice-monthly funding, payoff projections use the true
    // annual contribution averaged across 12 months. Track still shows the
    // actual paycheck dates separately.
    source = source.replace(
      'const budget = cents(minimums() + extra);',
      'const payrollFrequency = state.settings.fundingFrequency;\n    const payrollAmount = Math.max(0, num(state.settings.paycheckAmount));\n    const payrollAverage = payrollFrequency === "biweekly" && payrollAmount > 0 ? payrollAmount * 26 / 12 : payrollFrequency === "semimonthly" && payrollAmount > 0 ? payrollAmount * 2 : 0;\n    const budget = cents(payrollAverage || minimums() + extra);'
    );

    source = source.replace(
      'if(event.target.id==="extra-amount") { refreshExtraSheet(num(event.target.value)); }',
      ''
    );
    source = source.replace(
      'function change(event) { if(event.target.id==="debt-sort"){ui.sort=event.target.value;render();} }',
      'function change(event) { if(event.target.id==="debt-sort"){ui.sort=event.target.value;render();} if(event.target.id==="extra-amount"){refreshExtraSheet(num(event.target.value));} if(event.target.id==="budget-month-picker"){ui.budgetMonth=/^\\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)?event.target.value:ui.budgetMonth;render(false);} }'
    );

    source = source.replace(
      'function trackPage() {',
      'function trackPage() { if (window.debtWizardTrackPage) return window.debtWizardTrackPage({ state, ui, active, calculatePlan, dueDate, money, esc, dateLabel, keyMonth, parseMonth, mLabel, countdown, target, minimums });'
    );

    source = source.replace(
      'if (act === "nav") {',
      'if (window.debtWizardBudgetAction && window.debtWizardBudgetAction({ act, id, button, state, ui, save, render, num })) return;\n    if (window.debtWizardTrackAction && window.debtWizardTrackAction({ act, id, button, state, ui, render, paymentSheet, extraSheet, closeSheet, calculatePlan, active, dueDate, money, esc, dateLabel, keyMonth, parseMonth, mLabel, minimums, target })) return;\n    if (act === "nav") {'
    );

    new Function(source)();
  } catch (error) {
    console.error(error);
    target.innerHTML = `<section style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:40px 22px;color:#174a61"><h1 style="margin:0 0 8px">DebtWizard needs a refresh</h1><p style="line-height:1.5">The newest version did not finish loading. Refresh this page once and try again.</p></section>`;
  }
})();
