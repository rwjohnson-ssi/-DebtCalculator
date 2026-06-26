(() => {
  "use strict";

  const STORE = "debt-calculator-v2";
  const number = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
  const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;

  function state() {
    try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; }
  }
  function requiredMinimums(data) {
    return (data?.debts || []).filter(debt => number(debt.balance) > .004).reduce((sum, debt) => sum + Math.max(0, number(debt.minimum)), 0);
  }
  function validDay(value, fallback) { return Math.max(1, Math.min(28, Math.floor(number(value)) || fallback)); }

  // Capture the paycheck form before its original submit handler. This saves a
  // matching monthly-average extra amount so every calculator view, including
  // amortization and transaction details, uses the same funding level.
  document.addEventListener("submit", event => {
    const form = event.target;
    if (form?.id !== "paycheck-form") return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const data = state();
    if (!data) return;
    const settings = data.settings || (data.settings = {});
    const frequency = form.elements.frequency?.value || "monthly";
    const required = requiredMinimums(data);
    settings.fundingFrequency = frequency;
    settings.cycleDay = validDay(form.elements.cycleDay?.value, settings.cycleDay || 1);
    settings.semiMonthlyFirstDay = validDay(form.elements.semiMonthlyFirstDay?.value, settings.semiMonthlyFirstDay || 1);
    settings.semiMonthlySecondDay = validDay(form.elements.semiMonthlySecondDay?.value, settings.semiMonthlySecondDay || 15);

    let average = 0;
    if (frequency === "biweekly") {
      const next = form.elements.nextPayDate?.value;
      const amount = Math.max(0, number(form.elements.paycheckAmount?.value));
      if (!next || !amount) { alert("Enter your next actual paycheck date and the amount you set aside from each paycheck."); return; }
      average = cents(amount * 26 / 12);
      if (average + .004 < required) {
        alert(`At least ${new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(cents(required * 12 / 26))} per bi-weekly paycheck is needed to cover your current monthly minimum payments.`);
        return;
      }
      settings.nextPayDate = next;
      settings.paycheckAmount = cents(amount);
    } else if (frequency === "semimonthly") {
      const amount = Math.max(0, number(form.elements.paycheckAmount?.value));
      if (!amount) { alert("Enter the amount you set aside from each payday."); return; }
      average = cents(amount * 2);
      if (average + .004 < required) {
        alert(`At least ${new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(cents(required / 2))} per payday is needed to cover your current monthly minimum payments.`);
        return;
      }
      settings.nextPayDate = "";
      settings.paycheckAmount = cents(amount);
    } else {
      const amount = Math.max(0, number(form.elements.monthlyAmount?.value));
      if (!amount) { alert("Enter the amount available for monthly debt funding."); return; }
      average = cents(amount);
      settings.nextPayDate = "";
      settings.paycheckAmount = 0;
    }

    settings.extra = cents(Math.max(0, average - required));
    localStorage.setItem(STORE, JSON.stringify(data));
    window.location.reload();
  }, true);

  // Helpful default: when switching to bi-weekly or twice-monthly, prefill the
  // minimum needed per paycheck so the user starts with a workable amount.
  const root = document.getElementById("modal-root");
  if (!root) return;
  const observer = new MutationObserver(() => {
    const form = root.querySelector("#paycheck-form");
    const input = form?.elements.paycheckAmount;
    if (!form || !input || input.value || input.dataset.minimumPrefilled === "true") return;
    const frequency = form.elements.frequency?.value;
    if (frequency !== "biweekly" && frequency !== "semimonthly") return;
    const required = requiredMinimums(state());
    const amount = frequency === "biweekly" ? cents(required * 12 / 26) : cents(required / 2);
    input.value = amount.toFixed(2);
    input.dataset.minimumPrefilled = "true";
    input.dispatchEvent(new Event("input", { bubbles:true }));
  });
  observer.observe(root, { childList:true, subtree:true });
})();
