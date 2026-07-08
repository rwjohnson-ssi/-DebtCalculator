(() => {
  "use strict";

  const root = document.getElementById("modal-root");
  if (!root) return;

  const STORE = "debt-calculator-v2";
  const incomeTypes = [["paycheck", "Paycheck"], ["secondPaycheck", "Second paycheck"], ["sideIncome", "Side income"], ["otherIncome", "Other income"]];
  const incomeLabels = Object.fromEntries(incomeTypes);
  const monthNames = { january:"01", february:"02", march:"03", april:"04", may:"05", june:"06", july:"07", august:"08", september:"09", october:"10", november:"11", december:"12" };
  const number = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
  const uid = () => `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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
    `;
    document.head.appendChild(style);
  }

  function thisMonth() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function selectedMonth() {
    const text = document.querySelector(".hero-title")?.textContent?.trim() || "";
    const match = text.match(/^([A-Za-z]+)\s+(20\d{2})$/);
    return match && monthNames[match[1].toLowerCase()] ? `${match[2]}-${monthNames[match[1].toLowerCase()]}` : thisMonth();
  }

  function monthParts() {
    return selectedMonth().split("-").map(Number);
  }

  function monthLabel() {
    const [year, month] = monthParts();
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month:"long", year:"numeric" });
  }

  function dueSuffix(day) {
    const value = Math.max(1, Math.min(31, Math.floor(number(day)) || 1));
    const suffix = value % 10 === 1 && value % 100 !== 11 ? "st" : value % 10 === 2 && value % 100 !== 12 ? "nd" : value % 10 === 3 && value % 100 !== 13 ? "rd" : "th";
    return `${value}${suffix}`;
  }

  function fullDateLabel(day) {
    if (!day) return "Select Date";
    const [year, month] = monthParts();
    return `${new Date(year, month - 1, Math.max(1, number(day))).toLocaleDateString("en-US", { month:"long" })} ${dueSuffix(day)}`;
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
    state.settings = state.settings && typeof state.settings === "object" ? state.settings : {};
    state.settings.monthlyBudgets = state.settings.monthlyBudgets && typeof state.settings.monthlyBudgets === "object" ? state.settings.monthlyBudgets : {};
    const month = selectedMonth();
    const budget = state.settings.monthlyBudgets[month] || (state.settings.monthlyBudgets[month] = { incomeSources:{}, budgetCategories:{}, bills:[], schedule:{ buffer:0, income:{}, budget:{} } });
    budget.incomeSources = budget.incomeSources && typeof budget.incomeSources === "object" ? budget.incomeSources : {};
    const fallback = incomeTypes.map(([key, label]) => ({ id: uid(), name: label, type: key, amount: Math.max(0, number(budget.incomeSources[key])), payDay: 0, note: "" }));
    budget.incomeItems = cleanIncomeItems(Array.isArray(budget.incomeItems) ? budget.incomeItems : fallback);
    return { state, budget };
  }

  function syncIncomeTotals(state, budget) {
    budget.incomeItems = cleanIncomeItems(budget.incomeItems);
    const incomeSources = Object.fromEntries(incomeTypes.map(([key]) => [key, 0]));
    budget.incomeItems.forEach(item => { incomeSources[item.type] += item.amount; });
    budget.incomeSources = incomeSources;
    state.settings.incomeSources = incomeSources;
  }

  function openPayDatePicker(currentDay, onSave) {
    let selectedDay = Math.max(0, Math.min(31, Math.floor(number(currentDay))));
    let expanded = false;
    let repeat = true;
    let remind = false;
    const sheet = document.createElement("section");
    sheet.className = "edp-date-popup";
    const [year, month] = monthParts();
    const maxDay = new Date(year, month, 0).getDate();
    const renderDays = () => {
      const first = new Date(year, month - 1, 1).getDay();
      const cells = [];
      for (let i = 0; i < first; i++) cells.push('<span class="edp-day blank"></span>');
      for (let day = 1; day <= maxDay; day++) cells.push(`<button type="button" class="edp-day ${day === selectedDay ? "selected" : ""}" data-day="${day}">${day}</button>`);
      return cells.join("");
    };
    const paint = () => {
      sheet.innerHTML = `<div class="edp-date-top">Pay Date<button type="button" class="edp-date-close" aria-label="Close pay date">×</button></div><article class="edp-date-card"><button type="button" class="edp-date-row ${expanded ? "open" : ""}" data-date-toggle><span>Date</span><span class="edp-date-value">${selectedDay ? dueSuffix(selectedDay) : "Select Date"} ${expanded ? "⌃" : "⌄"}</span></button>${expanded ? `<div class="edp-calendar"><h3 class="edp-cal-title">${monthLabel()}</h3><div class="edp-week"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="edp-days">${renderDays()}</div></div>` : ""}<div class="edp-switch-row"><strong>Repeat Monthly</strong><button type="button" class="edp-switch ${repeat ? "on" : ""}" data-repeat aria-label="Repeat monthly"></button></div><div class="edp-switch-row"><span><strong>Remind Me</strong><small>We'll notify you three days before it's due.</small></span><button type="button" class="edp-switch ${remind ? "on" : ""}" data-remind aria-label="Remind me"></button></div></article><button type="button" class="edp-date-save" ${selectedDay ? "" : "disabled"}>Save</button>`;
    };
    sheet.addEventListener("click", event => {
      if (event.target.closest(".edp-date-close")) return sheet.remove();
      if (event.target.closest("[data-date-toggle]")) { expanded = !expanded; paint(); return; }
      if (event.target.closest("[data-repeat]")) { repeat = !repeat; paint(); return; }
      if (event.target.closest("[data-remind]")) { remind = !remind; paint(); return; }
      const dayButton = event.target.closest("[data-day]");
      if (dayButton) { selectedDay = Math.max(1, Math.min(maxDay, Math.floor(number(dayButton.dataset.day)))); paint(); return; }
      if (event.target.closest(".edp-date-save") && selectedDay) { onSave(selectedDay); sheet.remove(); }
    });
    paint();
    document.body.appendChild(sheet);
  }

  function patchIncomeRows() {
    const { budget } = ensureBudget(getState());
    const incomeById = new Map(budget.incomeItems.map(item => [item.id, item]));
    document.querySelectorAll('.edp-item-row[data-kind="income"]').forEach(row => {
      const item = incomeById.get(row.dataset.id);
      const small = row.querySelector("small");
      if (!item || !small) return;
      small.textContent = `${incomeLabels[item.type] || "Income"}${item.payDay ? ` · Pay ${fullDateLabel(item.payDay)}` : ""}${item.note ? ` · ${item.note}` : ""}`;
    });
  }

  function patchIncomePopup() {
    const popup = document.querySelector(".edp-popup");
    if (!popup || popup.dataset.payDatePatched === "true") return;
    const title = popup.querySelector(".edp-title")?.textContent?.trim().toLowerCase() || "";
    if (!title.includes("income")) return;
    popup.dataset.payDatePatched = "true";

    const editingId = window.__debtWizardIncomeEditId || "";
    const { budget } = ensureBudget(getState());
    const item = budget.incomeItems.find(entry => entry.id === editingId) || {};
    const amountField = popup.querySelector("#edp-amount")?.closest(".edp-field");
    if (amountField && !popup.querySelector("#edp-pay-day")) {
      amountField.insertAdjacentHTML("afterend", `<label class="edp-field edp-due-select"><span>Pay date</span><button type="button" id="edp-pay-day-button">${item.payDay ? fullDateLabel(item.payDay) : "Select Date"}</button><input id="edp-pay-day" type="hidden" value="${number(item.payDay) || ""}"></label>`);
    }

    popup.querySelector("#edp-pay-day-button")?.addEventListener("click", () => {
      const input = popup.querySelector("#edp-pay-day");
      openPayDatePicker(input?.value, day => {
        input.value = day;
        popup.querySelector("#edp-pay-day-button").textContent = fullDateLabel(day);
      });
    });

    popup.querySelector("[data-edp-save]")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const name = popup.querySelector("#edp-name")?.value.trim() || "";
      const amount = Math.max(0, number(popup.querySelector("#edp-amount")?.value));
      if (!name || amount <= .004) return;

      const stateData = ensureBudget(getState());
      const id = editingId || uid();
      const next = {
        id,
        name,
        amount,
        type: popup.querySelector("#edp-type")?.value || "paycheck",
        payDay: Math.max(0, Math.min(31, Math.floor(number(popup.querySelector("#edp-pay-day")?.value)))),
        note: popup.querySelector("#edp-note")?.value.trim() || ""
      };
      stateData.budget.incomeItems = cleanIncomeItems([...(stateData.budget.incomeItems || []).filter(entry => entry.id !== id), next]);
      syncIncomeTotals(stateData.state, stateData.budget);
      setState(stateData.state);
      window.location.reload();
    }, true);
  }

  document.addEventListener("click", event => {
    const trigger = event.target.closest('[data-edp-act][data-kind="income"]');
    if (trigger) window.__debtWizardIncomeEditId = trigger.dataset.id || "";
  }, true);

  function apply() {
    addStyles();
    const form = root.querySelector("#paycheck-form");
    const pair = form?.querySelector(".paycheck-two");
    if (pair) pair.classList.add("paycheck-fields-stacked-mobile");
    patchIncomeRows();
    patchIncomePopup();
  }

  new MutationObserver(apply).observe(root, { childList: true, subtree: true });
  new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  apply();
})();
