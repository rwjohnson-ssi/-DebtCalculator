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
    const ensureBudgetSettings = state => {
      if (!state.settings || typeof state.settings !== "object") state.settings = {};
      const settings = state.settings;
      if (!settings.incomeSources || typeof settings.incomeSources !== "object") settings.incomeSources = {};
      if (!settings.budgetCategories || typeof settings.budgetCategories !== "object") settings.budgetCategories = {};
      incomeFields.forEach(([key]) => { settings.incomeSources[key] = Math.max(0, budgetNumber(settings.incomeSources[key])); });
      budgetFields.forEach(([key]) => { settings.budgetCategories[key] = Math.max(0, budgetNumber(settings.budgetCategories[key])); });
      return settings;
    };
    const budgetRows = (fields, group, values) => fields.map(([key, label]) => `<label class="budget-input-row"><span>${label}</span><input name="${group}-${key}" type="number" min="0" step="0.01" inputmode="decimal" value="${budgetNumber(values[key]) || ""}" placeholder="0.00"></label>`).join("");
    window.debtWizardBudgetPage = ({ state, money, minimums, num }) => {
      const settings = ensureBudgetSettings(state);
      const incomeTotal = budgetRound(budgetSum(settings.incomeSources));
      const assignedTotal = budgetRound(budgetSum(settings.budgetCategories));
      const debtMinimums = budgetRound(minimums());
      const extra = budgetRound(Math.max(0, num(settings.extra)));
      const remaining = budgetRound(incomeTotal - assignedTotal - debtMinimums - extra);
      const over = remaining < -0.004;
      return `<section class="app-page"><header class="mobile-hero"><div class="hero-inner"><div class="hero-row"><div><h1 class="hero-title">Budget</h1><p class="hero-subtitle">Assign income before it leaves your account.</p></div><button class="icon-btn" data-act="settings" aria-label="Open settings">⚙</button></div></div></header><div class="page-sheet"><div class="page-wrap"><form id="budget-form">
        <section class="section"><h2 class="section-title">Monthly budget</h2><div class="budget-summary-grid"><article class="stat-tile featured"><div class="stat-label">Remaining to assign</div><span class="stat-value">${money.format(remaining)}</span><div class="stat-note">${over ? "Budget is overassigned" : "Available after budget and debt"}</div></article><article class="stat-tile"><div class="stat-label">Monthly income</div><span class="stat-value">${money.format(incomeTotal)}</span><div class="stat-note">Take-home income</div></article><article class="stat-tile"><div class="stat-label">Assigned budget</div><span class="stat-value">${money.format(assignedTotal)}</span><div class="stat-note">Spending categories</div></article><article class="stat-tile"><div class="stat-label">Debt payments</div><span class="stat-value">${money.format(debtMinimums + extra)}</span><div class="stat-note">${money.format(debtMinimums)} minimums + ${money.format(extra)} extra</div></article></div>${over ? `<article class="budget-alert">You are overassigned by <strong>${money.format(Math.abs(remaining))}</strong>. Lower a category, reduce extra debt payoff, or increase income.</article>` : ""}</section>
        <section class="section"><div class="section-head"><h2 class="section-title" style="margin:0">Income</h2><span class="budget-section-total">${money.format(incomeTotal)}</span></div><article class="card flat card-pad budget-card">${budgetRows(incomeFields, "income", settings.incomeSources)}</article></section>
        <section class="section"><div class="section-head"><h2 class="section-title" style="margin:0">Assigned spending</h2><span class="budget-section-total">${money.format(assignedTotal)}</span></div><article class="card flat card-pad budget-card">${budgetRows(budgetFields, "budget", settings.budgetCategories)}</article></section>
        <section class="section"><h2 class="section-title">Debt plan pull-in</h2><article class="card flat card-pad budget-card"><div class="budget-readonly-row"><span>Active debt minimums</span><strong>${money.format(debtMinimums)}</strong></div><div class="budget-readonly-row"><span>Extra debt payoff</span><strong>${money.format(extra)}</strong></div><p class="section-note">Minimums come from active debt accounts. Extra debt payoff is still managed from Strategy.</p></article><div class="sheet-actions"><button class="btn full" type="submit">Save budget</button></div></section>
      </form></div></div></section>`;
    };
    window.debtWizardBudgetSubmit = ({ event, state, save, render, num }) => {
      const form = event.target;
      if (form.id !== "budget-form") return false;
      event.preventDefault();
      const data = new FormData(form);
      const settings = ensureBudgetSettings(state);
      incomeFields.forEach(([key]) => { settings.incomeSources[key] = Math.max(0, num(data.get(`income-${key}`))); });
      budgetFields.forEach(([key]) => { settings.budgetCategories[key] = Math.max(0, num(data.get(`budget-${key}`))); });
      save("Budget saved.");
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
        .budget-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:14px}
        .budget-summary-grid .featured{grid-column:1 / -1}
        .budget-section-total{color:#0f516b;font-size:1.05rem;font-weight:900;white-space:nowrap}
        .budget-card{display:grid;gap:0}
        .budget-input-row,.budget-readonly-row{display:grid;grid-template-columns:minmax(0,1fr) 126px;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}
        .budget-input-row:first-child,.budget-readonly-row:first-child{padding-top:0}
        .budget-input-row:last-child,.budget-readonly-row:last-child{border-bottom:0;padding-bottom:0}
        .budget-input-row span,.budget-readonly-row span{color:#59666b;font-size:1rem;font-weight:750}
        .budget-input-row input{width:100%;min-height:42px;border:1px solid #dce6e8;border-radius:11px;padding:9px 10px;color:#334449;background:#fff;text-align:right;font-size:16px;font-weight:850}
        .budget-input-row input:focus{border-color:#43c5dd;outline:3px solid rgba(74,201,223,.16)}
        .budget-readonly-row strong{color:#39454a;text-align:right;font-size:1.04rem}
        .budget-alert{margin-top:12px;padding:12px 13px;border:1px solid #ffd2cf;border-radius:13px;background:#fff4f2;color:#9d3f37;font-size:.9rem;line-height:1.35}
        @media(max-width:390px){.budget-summary-grid{grid-template-columns:1fr}.budget-input-row,.budget-readonly-row{grid-template-columns:minmax(0,1fr) 112px}.tab-btn{font-size:.58rem}.tab-icon{font-size:1.14rem}}
      `;
      document.head.appendChild(style);
    }

    source = source.replace(
      "const trails = Object.fromEntries(state.debts.map(item => [item.id, [{ date: start, balance: item.balance }]));",
      "const trails = Object.fromEntries(state.debts.map(item => [item.id, [{ date: start, balance: item.balance }]]));"
    );

    // Preserve payroll and budget fields in browser storage along with debt data.
    source = source.replace(
      'settings: { strategy: "snowball", extra: 0, start: nowMonth(), cycleDay: 1, customOrder: [], oneTime: [] },',
      'settings: { strategy: "snowball", extra: 0, start: nowMonth(), cycleDay: 1, fundingFrequency: "monthly", paycheckAmount: 0, nextPayDate: "", semiMonthlyFirstDay: 1, semiMonthlySecondDay: 15, incomeSources: { paycheck: 0, secondPaycheck: 0, sideIncome: 0, otherIncome: 0 }, budgetCategories: { housing: 0, utilities: 0, food: 0, transportation: 0, insurance: 0, subscriptions: 0, savings: 0, giving: 0, personal: 0, other: 0 }, customOrder: [], oneTime: [] },'
    );
    source = source.replace(
      'cycleDay: Math.max(1, Math.min(28, Math.floor(num(settings.cycleDay)) || 1)),\n        customOrder:',
      'cycleDay: Math.max(1, Math.min(28, Math.floor(num(settings.cycleDay)) || 1)),\n        fundingFrequency: ["monthly", "semimonthly", "biweekly"].includes(settings.fundingFrequency) ? settings.fundingFrequency : "monthly",\n        paycheckAmount: Math.max(0, num(settings.paycheckAmount)),\n        nextPayDate: /^\\d{4}-\\d{2}-\\d{2}$/.test(settings.nextPayDate || "") ? settings.nextPayDate : "",\n        semiMonthlyFirstDay: Math.max(1, Math.min(28, Math.floor(num(settings.semiMonthlyFirstDay)) || 1)),\n        semiMonthlySecondDay: Math.max(1, Math.min(28, Math.floor(num(settings.semiMonthlySecondDay)) || 15)),\n        incomeSources: {\n          paycheck: Math.max(0, num(settings.incomeSources?.paycheck ?? settings.monthlyIncome)),\n          secondPaycheck: Math.max(0, num(settings.incomeSources?.secondPaycheck)),\n          sideIncome: Math.max(0, num(settings.incomeSources?.sideIncome)),\n          otherIncome: Math.max(0, num(settings.incomeSources?.otherIncome))\n        },\n        budgetCategories: {\n          housing: Math.max(0, num(settings.budgetCategories?.housing)),\n          utilities: Math.max(0, num(settings.budgetCategories?.utilities)),\n          food: Math.max(0, num(settings.budgetCategories?.food)),\n          transportation: Math.max(0, num(settings.budgetCategories?.transportation)),\n          insurance: Math.max(0, num(settings.budgetCategories?.insurance)),\n          subscriptions: Math.max(0, num(settings.budgetCategories?.subscriptions)),\n          savings: Math.max(0, num(settings.budgetCategories?.savings)),\n          giving: Math.max(0, num(settings.budgetCategories?.giving)),\n          personal: Math.max(0, num(settings.budgetCategories?.personal)),\n          other: Math.max(0, num(settings.budgetCategories?.other))\n        },\n        customOrder:'
    );

    source = source.replace(
      '    ["debts", "Debts", "◔"],\n    ["strategy", "Strategy", "✦"],',
      '    ["debts", "Debts", "◔"],\n    ["budget", "Budget", "$"],\n    ["strategy", "Strategy", "✦"],'
    );
    source = source.replace(
      'if (ui.page === "debts") screen.innerHTML = debtsPage();',
      'if (ui.page === "debts") screen.innerHTML = debtsPage();\n    if (ui.page === "budget") screen.innerHTML = window.debtWizardBudgetPage ? window.debtWizardBudgetPage({ state, money, esc, minimums, num }) : debtsPage();'
    );
    source = source.replace(
      'function submit(event) {\n    const form=event.target;',
      'function submit(event) {\n    const form=event.target;\n    if (window.debtWizardBudgetSubmit && window.debtWizardBudgetSubmit({ event, state, save, render, num })) return;'
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
      'function change(event) { if(event.target.id==="debt-sort"){ui.sort=event.target.value;render();} if(event.target.id==="extra-amount"){refreshExtraSheet(num(event.target.value));} }'
    );

    source = source.replace(
      'function trackPage() {',
      'function trackPage() { if (window.debtWizardTrackPage) return window.debtWizardTrackPage({ state, ui, active, calculatePlan, dueDate, money, esc, dateLabel, keyMonth, parseMonth, mLabel, countdown, target, minimums });'
    );

    source = source.replace(
      'if (act === "nav") {',
      'if (window.debtWizardTrackAction && window.debtWizardTrackAction({ act, id, button, state, ui, render, paymentSheet, extraSheet, closeSheet, calculatePlan, active, dueDate, money, esc, dateLabel, keyMonth, parseMonth, mLabel, minimums, target })) return;\n    if (act === "nav") {'
    );

    new Function(source)();
  } catch (error) {
    console.error(error);
    target.innerHTML = `<section style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:40px 22px;color:#174a61"><h1 style="margin:0 0 8px">DebtWizard needs a refresh</h1><p style="line-height:1.5">The newest version did not finish loading. Refresh this page once and try again.</p></section>`;
  }
})();
