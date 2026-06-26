(async () => {
  const target = document.getElementById("screen");
  try {
    const response = await fetch("app-v2.js", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load application code.");
    let source = await response.text();

    source = source.replace(
      "const trails = Object.fromEntries(state.debts.map(item => [item.id, [{ date: start, balance: item.balance }]));",
      "const trails = Object.fromEntries(state.debts.map(item => [item.id, [{ date: start, balance: item.balance }]]));"
    );

    // Preserve payroll schedule fields in browser storage along with debt data.
    source = source.replace(
      'settings: { strategy: "snowball", extra: 0, start: nowMonth(), cycleDay: 1, customOrder: [], oneTime: [] },',
      'settings: { strategy: "snowball", extra: 0, start: nowMonth(), cycleDay: 1, fundingFrequency: "monthly", paycheckAmount: 0, nextPayDate: "", semiMonthlyFirstDay: 1, semiMonthlySecondDay: 15, customOrder: [], oneTime: [] },'
    );
    source = source.replace(
      'cycleDay: Math.max(1, Math.min(28, Math.floor(num(settings.cycleDay)) || 1)),\n        customOrder:',
      'cycleDay: Math.max(1, Math.min(28, Math.floor(num(settings.cycleDay)) || 1)),\n        fundingFrequency: ["monthly", "semimonthly", "biweekly"].includes(settings.fundingFrequency) ? settings.fundingFrequency : "monthly",\n        paycheckAmount: Math.max(0, num(settings.paycheckAmount)),\n        nextPayDate: /^\\d{4}-\\d{2}-\\d{2}$/.test(settings.nextPayDate || "") ? settings.nextPayDate : "",\n        semiMonthlyFirstDay: Math.max(1, Math.min(28, Math.floor(num(settings.semiMonthlyFirstDay)) || 1)),\n        semiMonthlySecondDay: Math.max(1, Math.min(28, Math.floor(num(settings.semiMonthlySecondDay)) || 15)),\n        customOrder:'
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

    // Load Budget only after the original application has fully created its
    // screen and bottom navigation. This prevents the original render cycle
    // from replacing the added Budget tab.
    if (!document.querySelector('script[data-budget-safe-runtime="true"]')) {
      const budgetScript = document.createElement("script");
      budgetScript.src = "budget-safe-v2.js?v=26";
      budgetScript.dataset.budgetSafeRuntime = "true";
      document.body.appendChild(budgetScript);
    }
  } catch (error) {
    console.error(error);
    target.innerHTML = `<section style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:40px 22px;color:#174a61"><h1 style="margin:0 0 8px">DebtWizard needs a refresh</h1><p style="line-height:1.5">The newest version did not finish loading. Refresh this page once and try again.</p></section>`;
  }
})();
