(() => {
  "use strict";

  const root = document.getElementById("modal-root");
  if (!root) return;

  const STORE = "debt-calculator-v2";
  const incomeTypes = [["paycheck", "Paycheck"], ["secondPaycheck", "Second paycheck"], ["sideIncome", "Side income"], ["otherIncome", "Other income"]];
  const incomeLabels = Object.fromEntries(incomeTypes);
  const monthNames = { january:"01", february:"02", march:"03", april:"04", may:"05", june:"06", july:"07", august:"08", september:"09", october:"10", november:"11", december:"12" };
  const number = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
  const uid = () => `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

  function addStyles() {
    if (document.getElementById("paycheck-form-overlap-fix-v4-styles")) return;
    const style = document.createElement("style");
    style.id = "paycheck-form-overlap-fix-v4-styles";
    style.textContent = `
      /* The native iPhone date input has a wide intrinsic minimum. On phone
         widths, stack payroll fields so neither control can overlap. */
      @media (max-width: 560px) {
        #paycheck-overlay .paycheck-config {
          display: block !important;
          padding: 16px !important;
        }
        #paycheck-overlay .paycheck-two {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 14px !important;
          width: 100% !important;
        }
        #paycheck-overlay .paycheck-two > .paycheck-field {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 6px !important;
          min-width: 0 !important;
          width: 100% !important;
        }
        #paycheck-overlay .paycheck-two > .paycheck-field > input,
        #paycheck-overlay .paycheck-two > .paycheck-field > select,
        #paycheck-overlay input[type="date"] {
          display: block !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          min-inline-size: 0 !important;
          box-sizing: border-box !important;
        }
        #paycheck-overlay input[type="date"] {
          -webkit-appearance: none;
          appearance: none;
        }
        #paycheck-overlay .paycheck-amount-helper {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          grid-template-areas:
            "title"
            "actions"
            "copy" !important;
          gap: 8px !important;
          width: 100% !important;
          margin-top: 14px !important;
        }
        #paycheck-overlay .paycheck-amount-helper .paycheck-quick-add {
          justify-content: flex-start !important;
          flex-wrap: wrap !important;
        }
        #paycheck-overlay .paycheck-config > .paycheck-empty {
          display: block !important;
          width: 100% !important;
          margin-top: 14px !important;
          box-sizing: border-box !important;
        }
      }
      .edp-pay-helper {
        margin: -4px 0 8px;
        padding: 12px;
        border: 1px solid #cfe9ee;
        border-radius: 14px;
        background: #f6fdff;
      }
      .edp-pay-helper strong {
        display: block;
        color: #174a61;
        font-size: .92rem;
        font-weight: 900;
      }
      .edp-pay-helper p {
        margin: 4px 0 0;
        color: #697980;
        font-size: .78rem;
        line-height: 1.35;
      }
      .edp-pay-suggestions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-top: 10px;
      }
      .edp-pay-suggest {
        min-height: 39px;
        border: 1px solid #bfe4ec;
        border-radius: 11px;
        background: #fff;
        color: #0079a8;
        font-size: .86rem;
        font-weight: 900;
      }
      .edp-pay-suggest:active { transform: scale(.98); }
    `;
    document.head.appendChild(style);
  }

  function getState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORE));
      return state && typeof state === "object" ? state : {};
    } catch { return {}; }
  }

  function setState(state) {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function currentMonth() {
    const text = document.querySelector(".hero-title")?.textContent?.trim() || "";
    const match = text.match(/^([A-Za-z]+)\s+(20\d{2})$/);
    if (match && monthNames[match[1].toLowerCase()]) return `${match[2]}-${monthNames[match[1].toLowerCase()]}`;
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}`;
  }

  function monthParts(month = currentMonth()) {
    return month.split("-").map(Number);
  }

  function monthLabel(month = currentMonth()) {
    const [year, monthNumber] = monthParts(month);
    return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-US", { month:"long", year:"numeric" });
  }

  function monthRange(month = currentMonth()) {
    const [year, monthNumber] = monthParts(month);
    return { start:new Date(year, monthNumber - 1, 1), end:new Date(year, monthNumber, 0) };
  }

  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  function dueSuffix(day) {
    const value = Math.max(1, Math.min(31, Math.floor(number(day)) || 1));
    const suffix = value % 10 === 1 && value % 100 !== 11 ? "st" : value % 10 === 2 && value % 100 !== 12 ? "nd" : value % 10 === 3 && value % 100 !== 13 ? "rd" : "th";
    return `${value}${suffix}`;
  }

  function fullDueLabel(day) {
    if (!day) return "Select Date";
    const [year, monthNumber] = monthParts();
    return `${new Date(year, monthNumber - 1, Math.max(1, number(day))).toLocaleDateString("en-US", { month:"long" })} ${dueSuffix(day)}`;
  }

  function fullDate(date) {
    return date.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  }

  function cleanIncomeItems(items) {
    return Array.isArray(items) ? items.map(item => ({
      id: String(item.id || uid()),
      name: String(item.name || "").trim(),
      type: incomeLabels[item.type] ? item.type : "otherIncome",
      amount: Math.max(0, number(item.amount)),
      payDay: Math.max(0, Math.min(31, Math.floor(number(item.payDay ?? item.dueDay)))),
      note: String(item.note || "")
    })).filter(item => item.name && item.amount > .004) : [];
  }

  function ensureBudget(state) {
    const settings = state.settings || (state.settings = {});
    settings.monthlyBudgets = settings.monthlyBudgets && typeof settings.monthlyBudgets === "object" ? settings.monthlyBudgets : {};
    const month = currentMonth();
    const budget = settings.monthlyBudgets[month] || (settings.monthlyBudgets[month] = { incomeSources:{}, budgetCategories:{}, bills:[], schedule:{ buffer:0, income:{}, budget:{} } });
    budget.incomeItems = cleanIncomeItems(budget.incomeItems);
    return { settings, budget, month };
  }

  function syncIncomeTotals(state, budget) {
    const settings = state.settings || (state.settings = {});
    const incomeSources = Object.fromEntries(incomeTypes.map(([key]) => [key, 0]));
    budget.incomeItems = cleanIncomeItems(budget.incomeItems);
    budget.incomeItems.forEach(item => { incomeSources[item.type] += item.amount; });
    budget.incomeSources = incomeSources;
    budget.schedule = budget.schedule && typeof budget.schedule === "object" ? budget.schedule : { buffer:0, income:{}, budget:{} };
    budget.schedule.income = Object.fromEntries(incomeTypes.map(([key]) => [key, budget.incomeItems.filter(item => item.type === key && item.payDay > 0).map(item => item.payDay).join(", ")]));
    settings.incomeSources = incomeSources;
    settings.budgetSchedule = budget.schedule;
  }

  function priorPayDates(state, type) {
    const budgets = state?.settings?.monthlyBudgets && typeof state.settings.monthlyBudgets === "object" ? state.settings.monthlyBudgets : {};
    const { start } = monthRange();
    const dates = [];
    Object.entries(budgets).forEach(([month, budget]) => {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "") || !budget) return;
      const [year, monthNumber] = monthParts(month);
      cleanIncomeItems(budget.incomeItems).filter(item => item.payDay > 0 && (!type || item.type === type)).forEach(item => {
        const date = new Date(year, monthNumber - 1, item.payDay);
        if (date < start) dates.push(date);
      });
      Object.entries(budget.schedule?.income || {}).forEach(([incomeType, value]) => {
        if (type && incomeType !== type) return;
        String(value || "").split(/[,\s]+/).forEach(raw => {
          const day = Math.floor(number(raw));
          if (day < 1 || day > 31) return;
          const date = new Date(year, monthNumber - 1, day);
          if (date < start) dates.push(date);
        });
      });
    });
    return [...new Map(dates.map(date => [date.toISOString().slice(0,10), date])).values()].sort((a,b) => a - b);
  }

  function suggestedPayDates(state, type) {
    const { start, end } = monthRange();
    const reference = priorPayDates(state, type).at(-1) || priorPayDates(state, "").at(-1) || null;
    if (!reference) return { reference:null, dates:[] };
    let cursor = new Date(reference);
    while (cursor < start) cursor = addDays(cursor, 14);
    const dates = [];
    while (cursor <= end) {
      dates.push(new Date(cursor));
      cursor = addDays(cursor, 14);
    }
    return { reference, dates };
  }

  function helperHtml(type) {
    const helper = suggestedPayDates(getState(), type);
    if (!helper.reference) return `<article class="edp-pay-helper" data-pay-helper><strong>Bi-weekly pay date helper</strong><p>Save a paycheck date once, then future months can suggest dates based on a 14-day pay schedule.</p></article>`;
    if (!helper.dates.length) return `<article class="edp-pay-helper" data-pay-helper><strong>Bi-weekly pay date helper</strong><p>Based on your last saved paycheck date of ${fullDate(helper.reference)}, no matching pay date falls in ${monthLabel()}.</p></article>`;
    return `<article class="edp-pay-helper" data-pay-helper><strong>Bi-weekly pay date helper</strong><p>Based on your last saved paycheck date of ${fullDate(helper.reference)}, tap a suggested date for ${monthLabel()}.</p><div class="edp-pay-suggestions">${helper.dates.map(date => `<button type="button" class="edp-pay-suggest" data-pay-suggest-day="${date.getDate()}">${fullDate(date)}</button>`).join("")}</div></article>`;
  }

  function patchIncomePopup() {
    const popup = document.querySelector(".edp-popup");
    if (!popup || popup.dataset.payHelperPatched === "true") return;
    const title = popup.querySelector(".edp-title")?.textContent?.toLowerCase() || "";
    if (!title.includes("income")) return;
    popup.dataset.payHelperPatched = "true";

    const typeSelect = popup.querySelector("#edp-type");
    let dateInput = popup.querySelector("#edp-due");
    const amountRow = popup.querySelector("#edp-amount")?.closest(".edp-field");
    if (!dateInput && amountRow) {
      amountRow.insertAdjacentHTML("afterend", `<label class="edp-field edp-due-select"><span>Pay date</span><button type="button" id="edp-due-button">Select Date</button><input id="edp-due" type="hidden" value=""></label>`);
      dateInput = popup.querySelector("#edp-due");
    }
    const dateRow = dateInput?.closest(".edp-field");
    if (dateRow && !popup.querySelector("[data-pay-helper]")) dateRow.insertAdjacentHTML("afterend", helperHtml(typeSelect?.value || "paycheck"));

    typeSelect?.addEventListener("change", () => {
      const helper = popup.querySelector("[data-pay-helper]");
      if (helper) helper.outerHTML = helperHtml(typeSelect.value || "paycheck");
    });

    popup.addEventListener("click", event => {
      const suggestion = event.target.closest("[data-pay-suggest-day]");
      if (!suggestion) return;
      const day = Math.max(1, Math.min(31, Math.floor(number(suggestion.dataset.paySuggestDay))));
      const input = popup.querySelector("#edp-due");
      const button = popup.querySelector("#edp-due-button");
      if (input) input.value = String(day);
      if (button) button.textContent = fullDueLabel(day);
    });

    popup.querySelector("[data-edp-save]")?.addEventListener("click", event => {
      if (!title.includes("income")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const state = getState();
      const { budget } = ensureBudget(state);
      const editingId = document.querySelector('[data-edp-act="edit"][data-kind="income"][aria-current="true"]')?.dataset.id || popup.dataset.editId || "";
      const existingName = popup.querySelector("#edp-name")?.value.trim() || "";
      const amount = Math.max(0, number(popup.querySelector("#edp-amount")?.value));
      if (!existingName || amount <= .004) return;
      const id = editingId || uid();
      const next = {
        id,
        name: existingName,
        type: typeSelect?.value || "paycheck",
        amount,
        payDay: Math.max(0, Math.min(31, Math.floor(number(popup.querySelector("#edp-due")?.value)))),
        note: popup.querySelector("#edp-note")?.value.trim() || ""
      };
      budget.incomeItems = cleanIncomeItems([...(budget.incomeItems || []).filter(item => item.id !== id), next]);
      syncIncomeTotals(state, budget);
      setState(state);
      window.location.reload();
    }, true);
  }

  function apply() {
    addStyles();
    const form = root.querySelector("#paycheck-form");
    const pair = form?.querySelector(".paycheck-two");
    if (pair) pair.classList.add("paycheck-fields-stacked-mobile");
    patchIncomePopup();
  }

  new MutationObserver(apply).observe(root, { childList: true, subtree: true });
  new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  apply();
})();
