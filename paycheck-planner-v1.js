(() => {
  "use strict";

  const STORE = "debt-calculator-v2";
  const screen = document.getElementById("screen");
  const modalRoot = document.getElementById("modal-root");
  if (!screen || !modalRoot) return;

  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const number = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
  const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const today = () => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), date.getDate()); };
  const dateLabel = date => date.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", year:"numeric" });
  const monthLabel = date => date.toLocaleDateString("en-US", { month:"long", year:"numeric" });

  function getState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORE));
      return state && typeof state === "object" ? state : null;
    } catch { return null; }
  }

  function setState(state) {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function getSettings(state) {
    const settings = state?.settings || {};
    return {
      frequency: ["monthly", "semimonthly", "biweekly"].includes(settings.fundingFrequency) ? settings.fundingFrequency : "monthly",
      paycheckAmount: Math.max(0, number(settings.paycheckAmount)),
      nextPayDate: /^\d{4}-\d{2}-\d{2}$/.test(settings.nextPayDate || "") ? settings.nextPayDate : "",
      cycleDay: Math.max(1, Math.min(28, Math.floor(number(settings.cycleDay)) || 1)),
      semiMonthlyFirstDay: Math.max(1, Math.min(28, Math.floor(number(settings.semiMonthlyFirstDay)) || 1)),
      semiMonthlySecondDay: Math.max(1, Math.min(28, Math.floor(number(settings.semiMonthlySecondDay)) || 15)),
      extra: Math.max(0, number(settings.extra))
    };
  }

  function minimums(state) {
    return (state?.debts || []).filter(debt => number(debt.balance) > .004).reduce((sum, debt) => sum + Math.max(0, number(debt.minimum)), 0);
  }

  function monthlyAverage(settings, state) {
    const required = minimums(state);
    if (settings.frequency === "biweekly" && settings.paycheckAmount > 0) return settings.paycheckAmount * 26 / 12;
    if (settings.frequency === "semimonthly" && settings.paycheckAmount > 0) return settings.paycheckAmount * 2;
    return required + settings.extra;
  }

  function dateFromIso(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    return new Date(`${value}T12:00:00`);
  }

  function monthDay(year, month, day) {
    const end = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(Math.max(1, day), end));
  }

  function futurePaychecks(settings, count = 10) {
    const start = today();
    const dates = [];

    if (settings.frequency === "biweekly") {
      let next = dateFromIso(settings.nextPayDate);
      if (!next) return dates;
      while (next < start) next = new Date(next.getFullYear(), next.getMonth(), next.getDate() + 14);
      while (dates.length < count) {
        dates.push(new Date(next));
        next = new Date(next.getFullYear(), next.getMonth(), next.getDate() + 14);
      }
      return dates;
    }

    if (settings.frequency === "semimonthly") {
      let cursor = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      while (dates.length < count) {
        const candidates = [
          monthDay(cursor.getFullYear(), cursor.getMonth(), settings.semiMonthlyFirstDay),
          monthDay(cursor.getFullYear(), cursor.getMonth(), settings.semiMonthlySecondDay)
        ].sort((a, b) => a - b);
        candidates.forEach(date => { if (date >= start && dates.length < count && !dates.some(item => +item === +date)) dates.push(date); });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
      return dates.sort((a, b) => a - b);
    }

    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (dates.length < count) {
      const date = monthDay(cursor.getFullYear(), cursor.getMonth(), settings.cycleDay);
      if (date >= start) dates.push(date);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return dates;
  }

  function frequencyLabel(settings) {
    if (settings.frequency === "biweekly") return "Every 2 weeks";
    if (settings.frequency === "semimonthly") return "Twice per month";
    return "Once per month";
  }

  function fundingAmount(settings, state) {
    if (settings.frequency === "monthly") return minimums(state) + settings.extra;
    return settings.paycheckAmount;
  }

  function styles() {
    if (document.getElementById("paycheck-planner-styles")) return;
    const style = document.createElement("style");
    style.id = "paycheck-planner-styles";
    style.textContent = `
      .paycheck-preview { margin-top:14px; padding:14px; border:1px solid #cfe9ee; border-radius:15px; background:#f8fdfe; }
      .paycheck-preview-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
      .paycheck-preview-head strong { color:#174d64; font-size:1rem; }
      .paycheck-preview-edit { border:0; padding:4px 0; color:#148eaa; background:transparent; font-size:.82rem; font-weight:850; }
      .paycheck-preview-row { display:grid; grid-template-columns:28px minmax(0,1fr) auto; gap:8px; align-items:center; padding:9px 0; border-top:1px solid #e0eff2; }
      .paycheck-preview-row:first-of-type { border-top:0; }
      .paycheck-preview-icon { width:25px; height:25px; display:grid; place-items:center; border-radius:8px; color:#197f97; background:#d9f4f8; font-size:.83rem; }
      .paycheck-preview-date { min-width:0; color:#415258; font-size:.84rem; font-weight:800; }
      .paycheck-preview-date small { display:block; margin-top:1px; color:#7b898d; font-size:.72rem; font-weight:650; }
      .paycheck-preview-amount { color:#1c4c5c; font-size:.87rem; font-weight:900; white-space:nowrap; }
      .paycheck-average-note { margin:11px 0 0; color:#687a80; font-size:.76rem; line-height:1.35; }
      .paycheck-frequency-pill { display:inline-flex; align-items:center; gap:6px; padding:4px 8px; border-radius:999px; color:#146a82; background:#e9f9fc; font-size:.71rem; font-weight:850; }
      .paycheck-overlay { position:fixed; z-index:700; inset:0; display:flex; align-items:flex-end; background:rgba(28,48,56,.48); }
      .paycheck-sheet { width:min(100%,680px); max-height:91dvh; overflow:auto; padding:19px 26px calc(24px + env(safe-area-inset-bottom,0px)); border-radius:28px 28px 0 0; background:#fff; box-shadow:0 -16px 40px rgba(22,54,66,.22); -webkit-overflow-scrolling:touch; }
      .paycheck-sheet-head { display:grid; grid-template-columns:34px 1fr 34px; align-items:center; gap:10px; margin-bottom:18px; }
      .paycheck-sheet-head h2 { margin:0; color:#303e44; font-size:1.28rem; font-weight:900; text-align:center; }
      .paycheck-close { width:34px; height:34px; padding:0; border:0; color:#728087; background:transparent; font-size:2rem; line-height:1; }
      .paycheck-sheet-copy { margin:-4px 0 17px; color:#718087; font-size:.87rem; line-height:1.42; }
      .paycheck-form { display:grid; gap:14px; }
      .paycheck-field { display:grid; gap:6px; color:#5f6d72; font-size:.83rem; font-weight:850; }
      .paycheck-field input, .paycheck-field select { min-height:48px; padding:10px 12px; border:1px solid #d5e0e3; border-radius:12px; color:#334449; background:#fff; font-size:16px; font-weight:750; }
      .paycheck-field input:focus, .paycheck-field select:focus { border-color:#43c5dd; outline:3px solid rgba(74,201,223,.16); }
      .paycheck-choices { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; }
      .paycheck-choice { min-width:0; min-height:55px; padding:8px 5px; border:1px solid #dbe6e8; border-radius:12px; color:#526168; background:#fff; font-size:.76rem; font-weight:850; line-height:1.2; }
      .paycheck-choice.active { color:#0d6881; border-color:#51c9df; background:#eafafd; box-shadow:0 4px 10px rgba(70,196,219,.13); }
      .paycheck-config { display:grid; gap:13px; padding:14px; border:1px solid #e0edf0; border-radius:15px; background:#fbfefe; }
      .paycheck-two { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
      .paycheck-summary { padding:13px; border-radius:13px; background:#edf8fa; color:#39565f; font-size:.84rem; line-height:1.4; }
      .paycheck-summary strong { color:#14526a; font-weight:900; }
      .paycheck-preview-list { display:grid; gap:0; margin-top:4px; }
      .paycheck-save { width:100%; min-height:49px; margin-top:3px; border:0; border-radius:13px; color:#fff; background:linear-gradient(135deg,#22b6d1,#56cee2); box-shadow:0 9px 18px rgba(45,185,211,.22); font-size:1rem; font-weight:900; }
      .paycheck-empty { padding:12px; border:1px dashed #c7d9dd; border-radius:11px; color:#728187; font-size:.82rem; line-height:1.4; }
      @media (min-width:560px) { .paycheck-overlay { align-items:center; justify-content:center; padding:20px; } .paycheck-sheet { border-radius:24px; } }
      @media (max-width:390px) { .paycheck-sheet { padding-left:20px; padding-right:20px; } .paycheck-choices { gap:5px; } .paycheck-choice { font-size:.69rem; } .paycheck-two { gap:8px; } }
    `;
    document.head.appendChild(style);
  }

  function schedulePreview(settings, state, limit = 4) {
    const dates = futurePaychecks(settings, limit);
    if (!dates.length) return `<div class="paycheck-empty">Choose your next actual paycheck date to build your future payday schedule.</div>`;
    const amount = fundingAmount(settings, state);
    return `<div class="paycheck-preview-list">${dates.map((date, index) => `<div class="paycheck-preview-row"><span class="paycheck-preview-icon">$</span><span class="paycheck-preview-date">${dateLabel(date)}<small>${index === 0 ? "Next paycheck" : `Paycheck ${index + 1}`}</small></span><span class="paycheck-preview-amount">${money.format(amount)}</span></div>`).join("")}</div>`;
  }

  function strategyEnhance() {
    const state = getState();
    const title = screen.querySelector(".hero-title")?.textContent.trim();
    if (!state || title !== "Strategy") return;

    const settings = getSettings(state);
    const recurring = [...screen.querySelectorAll(".strategy-panel")].find(panel => panel.querySelector(".strategy-title")?.textContent.includes("Recurring funding"));
    if (!recurring || recurring.dataset.paycheckEnhanced === "true") return;
    recurring.dataset.paycheckEnhanced = "true";

    const cycle = recurring.querySelector('[data-act="cycle"]');
    if (cycle) {
      cycle.dataset.paycheckAction = "setup";
      const dates = futurePaychecks(settings, 1);
      const next = dates[0] ? dateLabel(dates[0]) : "Set next paycheck";
      cycle.innerHTML = `<span class="left"><span class="paycheck-frequency-pill">${frequencyLabel(settings)}</span></span><span class="right">${next} <span class="row-chev">›</span></span>`;
    }

    if (settings.frequency !== "monthly") {
      const rows = recurring.querySelectorAll(".funding-rows > .funding-row");
      const required = minimums(state);
      const average = monthlyAverage(settings, state);
      const perCheck = fundingAmount(settings, state);
      if (rows[0]) rows[0].innerHTML = `<span class="left">Required minimums</span><span class="right">${money.format(required)}</span>`;
      if (rows[1]) {
        rows[1].dataset.paycheckAction = "setup";
        rows[1].innerHTML = `<span class="left">Per paycheck</span><span class="right">${money.format(perCheck)} <span class="row-chev">›</span></span>`;
      }
      if (rows[2]) rows[2].innerHTML = `<span class="left">Average monthly funding</span><span class="right">${money.format(average)}</span>`;
      recurring.querySelector(".impact-strip")?.remove();
    }

    const preview = document.createElement("div");
    preview.className = "paycheck-preview";
    preview.innerHTML = `<div class="paycheck-preview-head"><strong>Upcoming paychecks</strong><button type="button" class="paycheck-preview-edit" data-paycheck-action="all">View all</button></div>${schedulePreview(settings, state)}<p class="paycheck-average-note">${settings.frequency === "biweekly" ? `Your payoff projection uses a ${money.format(monthlyAverage(settings, state))} monthly average based on 26 paychecks per year.` : settings.frequency === "semimonthly" ? `Your payoff projection uses ${money.format(monthlyAverage(settings, state))} per month from two funding dates.` : "Set a bi-weekly schedule to plan around your actual paycheck dates."}</p>`;
    recurring.appendChild(preview);
  }

  function homeEnhance() {
    const state = getState();
    const title = screen.querySelector(".hero-title")?.textContent.trim();
    if (!state || title !== "Your plan") return;
    const settings = getSettings(state);
    if (settings.frequency === "monthly") return;
    const cards = screen.querySelectorAll(".stats-grid.one-wide .stat-tile");
    const monthlyCard = [...cards].find(card => card.textContent.includes("Monthly plan"));
    if (monthlyCard) {
      const note = monthlyCard.querySelector(".stat-note");
      if (note) note.textContent = `${frequencyLabel(settings)} · ${money.format(fundingAmount(settings, state))} each`;
    }
  }

  function openScheduleSheet() {
    const state = getState();
    if (!state) return;
    const settings = getSettings(state);
    styles();

    modalRoot.innerHTML = `<div class="paycheck-overlay" id="paycheck-overlay"><section class="paycheck-sheet" role="dialog" aria-modal="true" aria-label="Paycheck funding schedule"><div class="paycheck-sheet-head"><button type="button" class="paycheck-close" data-paycheck-close aria-label="Close">×</button><h2>Paycheck funding</h2><span></span></div><p class="paycheck-sheet-copy">Set your real pay rhythm so the app can show upcoming paydays and calculate an average monthly debt-funding amount.</p><form id="paycheck-form" class="paycheck-form"><label class="paycheck-field">Funding frequency<div class="paycheck-choices"><button type="button" class="paycheck-choice ${settings.frequency === "monthly" ? "active" : ""}" data-pay-frequency="monthly">Monthly</button><button type="button" class="paycheck-choice ${settings.frequency === "semimonthly" ? "active" : ""}" data-pay-frequency="semimonthly">Twice monthly</button><button type="button" class="paycheck-choice ${settings.frequency === "biweekly" ? "active" : ""}" data-pay-frequency="biweekly">Bi-weekly</button></div></label><input type="hidden" name="frequency" value="${settings.frequency}"><div id="paycheck-config"></div><div id="paycheck-summary"></div><button class="paycheck-save" type="submit">Save paycheck schedule</button></form></section></div>`;

    const form = document.getElementById("paycheck-form");
    const config = document.getElementById("paycheck-config");
    const summary = document.getElementById("paycheck-summary");

    const renderFields = () => {
      const frequency = form.elements.frequency.value;
      const current = getSettings(getState());
      if (frequency === "biweekly") {
        config.innerHTML = `<div class="paycheck-config"><div class="paycheck-two"><label class="paycheck-field">Next actual paycheck<input name="nextPayDate" type="date" required value="${escapeHtml(current.nextPayDate)}"></label><label class="paycheck-field">Set aside per paycheck<input name="paycheckAmount" type="number" min="0" step=".01" inputmode="decimal" required value="${current.paycheckAmount || ""}" placeholder="0.00"></label></div><div class="paycheck-empty">Use the next paycheck date from your employer/payroll portal. DebtWizard will repeat it every 14 days.</div></div>`;
      } else if (frequency === "semimonthly") {
        config.innerHTML = `<div class="paycheck-config"><div class="paycheck-two"><label class="paycheck-field">First payday<select name="semiMonthlyFirstDay">${Array.from({length:28}, (_, i) => i + 1).map(day => `<option value="${day}" ${day === current.semiMonthlyFirstDay ? "selected" : ""}>${day}${day===1?"st":day===2?"nd":day===3?"rd":"th"}</option>`).join("")}</select></label><label class="paycheck-field">Second payday<select name="semiMonthlySecondDay">${Array.from({length:28}, (_, i) => i + 1).map(day => `<option value="${day}" ${day === current.semiMonthlySecondDay ? "selected" : ""}>${day}${day===1?"st":day===2?"nd":day===3?"rd":"th"}</option>`).join("")}</select></label></div><label class="paycheck-field">Set aside each payday<input name="paycheckAmount" type="number" min="0" step=".01" inputmode="decimal" required value="${current.paycheckAmount || ""}" placeholder="0.00"></label></div>`;
      } else {
        const monthlyAmount = Math.max(0, minimums(getState()) + current.extra);
        config.innerHTML = `<div class="paycheck-config"><div class="paycheck-two"><label class="paycheck-field">Funding day<select name="cycleDay">${Array.from({length:28}, (_, i) => i + 1).map(day => `<option value="${day}" ${day === current.cycleDay ? "selected" : ""}>${day}${day===1?"st":day===2?"nd":day===3?"rd":"th"}</option>`).join("")}</select></label><label class="paycheck-field">Monthly debt funding<input name="monthlyAmount" type="number" min="0" step=".01" inputmode="decimal" required value="${monthlyAmount || ""}" placeholder="0.00"></label></div></div>`;
      }
      updateSummary();
    };

    const updateSummary = () => {
      const frequency = form.elements.frequency.value;
      const temp = { ...getSettings(getState()), frequency };
      temp.nextPayDate = form.elements.nextPayDate?.value || temp.nextPayDate;
      temp.paycheckAmount = Math.max(0, number(form.elements.paycheckAmount?.value));
      temp.cycleDay = Math.max(1, Math.min(28, Math.floor(number(form.elements.cycleDay?.value)) || temp.cycleDay));
      temp.semiMonthlyFirstDay = Math.max(1, Math.min(28, Math.floor(number(form.elements.semiMonthlyFirstDay?.value)) || temp.semiMonthlyFirstDay));
      temp.semiMonthlySecondDay = Math.max(1, Math.min(28, Math.floor(number(form.elements.semiMonthlySecondDay?.value)) || temp.semiMonthlySecondDay));
      const average = frequency === "monthly" ? Math.max(0, number(form.elements.monthlyAmount?.value)) : monthlyAverage(temp, getState());
      summary.innerHTML = `<div class="paycheck-summary"><strong>Planning average: ${money.format(average)} per month</strong><br>${frequency === "biweekly" ? "Based on 26 paycheck contributions per year." : frequency === "semimonthly" ? "Based on two scheduled contributions each month." : "This is the amount used for your monthly debt plan."}<div style="margin-top:10px">${schedulePreview(temp, getState(), 4)}</div></div>`;
    };

    form.querySelectorAll("[data-pay-frequency]").forEach(button => button.addEventListener("click", () => {
      form.elements.frequency.value = button.dataset.payFrequency;
      form.querySelectorAll("[data-pay-frequency]").forEach(item => item.classList.toggle("active", item === button));
      renderFields();
    }));
    form.addEventListener("input", updateSummary);
    form.addEventListener("change", updateSummary);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const frequency = form.elements.frequency.value;
      const currentState = getState();
      if (!currentState) return;
      const current = getSettings(currentState);
      const settings = currentState.settings || (currentState.settings = {});
      settings.fundingFrequency = frequency;
      settings.cycleDay = Math.max(1, Math.min(28, Math.floor(number(form.elements.cycleDay?.value)) || current.cycleDay));
      settings.semiMonthlyFirstDay = Math.max(1, Math.min(28, Math.floor(number(form.elements.semiMonthlyFirstDay?.value)) || current.semiMonthlyFirstDay));
      settings.semiMonthlySecondDay = Math.max(1, Math.min(28, Math.floor(number(form.elements.semiMonthlySecondDay?.value)) || current.semiMonthlySecondDay));

      if (frequency === "biweekly") {
        const next = form.elements.nextPayDate?.value;
        const amount = Math.max(0, number(form.elements.paycheckAmount?.value));
        if (!next || !amount) { alert("Enter your next actual paycheck date and the amount you set aside from each paycheck."); return; }
        settings.nextPayDate = next;
        settings.paycheckAmount = amount;
      } else if (frequency === "semimonthly") {
        const amount = Math.max(0, number(form.elements.paycheckAmount?.value));
        if (!amount) { alert("Enter the amount you set aside from each payday."); return; }
        settings.paycheckAmount = amount;
        settings.nextPayDate = "";
      } else {
        const amount = Math.max(0, number(form.elements.monthlyAmount?.value));
        const required = minimums(currentState);
        if (!amount) { alert("Enter the amount available for monthly debt funding."); return; }
        settings.paycheckAmount = 0;
        settings.nextPayDate = "";
        settings.extra = Math.max(0, amount - required);
      }
      setState(currentState);
      window.location.reload();
    });

    document.getElementById("paycheck-overlay").addEventListener("click", event => {
      if (event.target.id === "paycheck-overlay" || event.target.closest("[data-paycheck-close]")) modalRoot.innerHTML = "";
    });
    renderFields();
  }

  function openAllPaydays() {
    const state = getState();
    if (!state) return;
    const settings = getSettings(state);
    styles();
    const dates = futurePaychecks(settings, 18);
    modalRoot.innerHTML = `<div class="paycheck-overlay" id="paycheck-overlay"><section class="paycheck-sheet" role="dialog" aria-modal="true" aria-label="Future paychecks"><div class="paycheck-sheet-head"><button type="button" class="paycheck-close" data-paycheck-close aria-label="Close">×</button><h2>Future paychecks</h2><span></span></div><p class="paycheck-sheet-copy">${frequencyLabel(settings)} · ${money.format(fundingAmount(settings, state))} available for debt funding each payday.</p>${dates.length ? `<div class="paycheck-preview">${dates.map((date, index) => `<div class="paycheck-preview-row"><span class="paycheck-preview-icon">$</span><span class="paycheck-preview-date">${dateLabel(date)}<small>${index === 0 ? "Next paycheck" : monthLabel(date)}</small></span><span class="paycheck-preview-amount">${money.format(fundingAmount(settings, state))}</span></div>`).join("")}</div>` : `<div class="paycheck-empty">Set your next actual paycheck date to generate future paydays.</div>`}<button type="button" class="paycheck-save" data-paycheck-action="setup">Edit paycheck schedule</button></section></div>`;
    document.getElementById("paycheck-overlay").addEventListener("click", event => {
      if (event.target.id === "paycheck-overlay" || event.target.closest("[data-paycheck-close]")) modalRoot.innerHTML = "";
    });
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-paycheck-action]");
    const cycle = event.target.closest('[data-act="cycle"]');
    const action = button?.dataset.paycheckAction || (cycle ? "setup" : "");
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (action === "all") openAllPaydays();
    else openScheduleSheet();
  }, true);

  function render() {
    styles();
    strategyEnhance();
    homeEnhance();
  }

  let queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; render(); });
  }
  new MutationObserver(queue).observe(screen, { childList:true, subtree:true });
  queue();
})();
