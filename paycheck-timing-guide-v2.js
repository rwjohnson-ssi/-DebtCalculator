(() => {
  "use strict";

  const STORE = "debt-calculator-v2";
  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return;

  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const number = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
  const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const today = () => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), date.getDate()); };
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const labelDate = date => date.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  const fullDate = date => date.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", year:"numeric" });

  function getState() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE));
      return data && typeof data === "object" ? data : null;
    } catch { return null; }
  }

  function activeDebts(data) {
    return (data?.debts || []).filter(debt => number(debt.balance) > .004 && number(debt.minimum) > 0);
  }

  function monthlyMinimum(data) {
    return cents(activeDebts(data).reduce((sum, debt) => sum + Math.max(0, number(debt.minimum)), 0));
  }

  function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
  function monthDay(year, month, day) { return new Date(year, month, Math.min(Math.max(1, day), daysInMonth(year, month))); }
  function parseInputDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? new Date(`${value}T12:00:00`) : null; }

  function settingsFromForm(form, data) {
    const stored = data?.settings || {};
    const frequency = form.elements.frequency?.value || stored.fundingFrequency || "monthly";
    const amount = frequency === "monthly"
      ? Math.max(0, number(form.elements.monthlyAmount?.value))
      : Math.max(0, number(form.elements.paycheckAmount?.value));
    return {
      frequency,
      amount,
      nextPayDate: form.elements.nextPayDate?.value || stored.nextPayDate || "",
      cycleDay: Math.max(1, Math.min(28, Math.floor(number(form.elements.cycleDay?.value)) || number(stored.cycleDay) || 1)),
      firstDay: Math.max(1, Math.min(28, Math.floor(number(form.elements.semiMonthlyFirstDay?.value)) || number(stored.semiMonthlyFirstDay) || 1)),
      secondDay: Math.max(1, Math.min(28, Math.floor(number(form.elements.semiMonthlySecondDay?.value)) || number(stored.semiMonthlySecondDay) || 15))
    };
  }

  function actualNextBiweekly(value) {
    const start = today();
    let date = parseInputDate(value);
    if (!date) return null;
    let guard = 0;
    while (date < start && guard < 100) { date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 14); guard += 1; }
    return date;
  }

  function paydays(settings, count = 30) {
    const start = today();
    const list = [];
    if (settings.frequency === "biweekly") {
      let date = actualNextBiweekly(settings.nextPayDate);
      if (!date) return list;
      while (list.length < count) { list.push(new Date(date)); date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 14); }
      return list;
    }
    if (settings.frequency === "semimonthly") {
      let cursor = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      while (list.length < count) {
        [settings.firstDay, settings.secondDay].sort((a, b) => a - b).forEach(day => {
          const date = monthDay(cursor.getFullYear(), cursor.getMonth(), day);
          if (date >= start && list.length < count && !list.some(item => +item === +date)) list.push(date);
        });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
      return list.sort((a, b) => a - b);
    }
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (list.length < count) {
      const date = monthDay(cursor.getFullYear(), cursor.getMonth(), settings.cycleDay);
      if (date >= start) list.push(date);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return list;
  }

  function dueEvents(data, from, through) {
    const events = [];
    const debts = activeDebts(data);
    let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const lastMonth = new Date(through.getFullYear(), through.getMonth(), 1);
    while (cursor <= lastMonth) {
      debts.forEach(debt => {
        const dueDay = Math.max(1, Math.floor(number(debt.dueDay)) || 1);
        const date = monthDay(cursor.getFullYear(), cursor.getMonth(), dueDay);
        if (date >= from && date <= through) {
          events.push({ date, debt, amount: cents(Math.max(0, number(debt.minimum))) });
        }
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return events.sort((a, b) => a.date - b.date || a.debt.name.localeCompare(b.debt.name));
  }

  function sum(events) { return cents(events.reduce((total, event) => total + event.amount, 0)); }
  function before(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1); }

  function contributionProfile(settings, data) {
    const monthly = monthlyMinimum(data);
    const paymentsPerYear = settings.frequency === "biweekly" ? 26 : settings.frequency === "semimonthly" ? 24 : 12;
    const baseline = cents(monthly * 12 / paymentsPerYear);
    const annualContribution = cents(settings.amount * paymentsPerYear);
    const annualMinimums = cents(monthly * 12);
    const difference = cents(annualContribution - annualMinimums);
    return { monthly, paymentsPerYear, baseline, annualContribution, annualMinimums, difference };
  }

  function timingBuffer(settings, data, dates) {
    if (dates.length < 2) return { buffer: 0, beforeFirst: [], firstWindow: [], allEvents: [] };
    const start = today();
    const last = before(dates.at(-1));
    const dues = dueEvents(data, start, last);
    const beforeFirst = dues.filter(item => item.date < dates[0]);
    const firstWindow = dues.filter(item => item.date >= dates[0] && item.date < dates[1]);
    const events = [];
    dates.forEach(date => events.push({ date, type:"pay", amount:settings.amount }));
    dues.forEach(item => events.push({ date:item.date, type:"due", amount:item.amount }));
    events.sort((a,b) => a.date - b.date || (a.type === "pay" ? -1 : 1));
    let balance = 0;
    let lowest = 0;
    events.forEach(event => {
      balance = cents(balance + (event.type === "pay" ? event.amount : -event.amount));
      lowest = Math.min(lowest, balance);
    });
    return { buffer:cents(Math.max(0, -lowest)), beforeFirst, firstWindow, allEvents:dues };
  }

  function debtNames(events, max = 3) {
    if (!events.length) return "No minimum payments due";
    const visible = events.slice(0, max).map(item => `${item.debt.name} ${money.format(item.amount)}`);
    return `${visible.join(" · ")}${events.length > max ? ` +${events.length - max} more` : ""}`;
  }

  function installStyles() {
    if (document.getElementById("paycheck-timing-guide-styles")) return;
    const style = document.createElement("style");
    style.id = "paycheck-timing-guide-styles";
    style.textContent = `
      #paycheck-overlay .paycheck-sheet { overflow-x:hidden; }
      #paycheck-overlay .paycheck-config, #paycheck-overlay .paycheck-two, #paycheck-overlay .paycheck-field { min-width:0; }
      #paycheck-overlay .paycheck-two { grid-template-columns:minmax(0,1fr) minmax(0,1fr); align-items:start; }
      #paycheck-overlay .paycheck-two > .paycheck-field { min-width:0; }
      #paycheck-overlay .paycheck-field input, #paycheck-overlay .paycheck-field select { width:100%; min-width:0; max-width:100%; box-sizing:border-box; }
      .paycheck-floor { display:block; margin-top:6px; color:#4b7a87; font-size:.74rem; font-weight:800; line-height:1.3; }
      .paycheck-quick-add { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
      .paycheck-quick-add button { min-height:29px; padding:4px 8px; border:1px solid #bde6ed; border-radius:999px; color:#11738c; background:#f1fcfe; font-size:.72rem; font-weight:900; }
      .minimum-guide { margin-top:2px; overflow:hidden; border:1px solid #cce7ed; border-radius:16px; background:#f8fdfe; }
      .minimum-guide-head { padding:14px 14px 10px; background:#e9f8fb; }
      .minimum-guide-title { color:#13546b; font-size:1rem; font-weight:950; }.minimum-guide-copy { margin:3px 0 0; color:#698087; font-size:.76rem; line-height:1.35; }
      .minimum-guide-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; padding:10px 12px; }
      .minimum-guide-tile { min-width:0; padding:10px; border:1px solid #deedf0; border-radius:11px; background:#fff; }.minimum-guide-tile strong { display:block; margin-top:4px; color:#164d61; font-size:1rem; font-weight:950; letter-spacing:-.02em; }.minimum-guide-tile small { display:block; color:#718188; font-size:.7rem; font-weight:800; line-height:1.25; }.minimum-guide-tile.emphasis { border-color:#9fdde8; background:#f0fbfd; }.minimum-guide-tile .guide-sub { display:block; margin-top:3px; color:#688188; font-size:.67rem; font-weight:700; line-height:1.25; }
      .minimum-guide-status { margin:0 12px 12px; padding:10px 11px; border-radius:10px; font-size:.78rem; font-weight:800; line-height:1.38; }.minimum-guide-status.good { color:#23714e; background:#eefaf3; border:1px solid #c8ecd8; }.minimum-guide-status.short { color:#a14138; background:#fff3f1; border:1px solid #f4c8c2; }
      .payday-timing { margin:0 12px 12px; padding:11px; border-radius:12px; background:#fff; border:1px solid #e1edef; }.payday-timing-title { margin-bottom:7px; color:#1e5669; font-size:.83rem; font-weight:950; }.payday-timing-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:9px; padding:8px 0; border-top:1px solid #ecf1f2; }.payday-timing-row:first-of-type { border-top:0; }.payday-timing-row span { color:#677980; font-size:.73rem; line-height:1.3; }.payday-timing-row small { display:block; margin-top:2px; color:#8a989d; font-size:.67rem; }.payday-timing-row strong { align-self:center; color:#184d60; font-size:.84rem; font-weight:950; white-space:nowrap; }
      .buffer-note { margin:0 12px 12px; padding:10px 11px; border-radius:10px; color:#586e76; background:#f5fafb; font-size:.74rem; line-height:1.36; }.buffer-note strong { color:#1c5569; }
      @media(max-width:390px){.minimum-guide-grid{gap:6px;padding:9px}.minimum-guide-tile{padding:9px}.minimum-guide-tile strong{font-size:.91rem}.payday-timing{margin-left:9px;margin-right:9px}.minimum-guide-status,.buffer-note{margin-left:9px;margin-right:9px}}
    `;
    document.head.appendChild(style);
  }

  function normalizeNextPayday(form) {
    if (form.elements.frequency?.value !== "biweekly") return;
    const field = form.elements.nextPayDate;
    if (!field?.value || field.dataset.normalizedPayday === "true") return;
    const corrected = actualNextBiweekly(field.value);
    if (corrected && dateKey(corrected) !== field.value) field.value = dateKey(corrected);
    field.dataset.normalizedPayday = "true";
  }

  function addQuickButtons(form, settings, profile) {
    const input = settings.frequency === "monthly" ? form.elements.monthlyAmount : form.elements.paycheckAmount;
    if (!input) return;
    const field = input.closest("label");
    if (!field) return;
    const existing = field.querySelector(".paycheck-floor");
    const floorText = settings.frequency === "monthly"
      ? `Minimum floor: ${money.format(profile.monthly)} each month to cover listed debt minimums.`
      : `Minimum floor: ${money.format(profile.baseline)} per ${settings.frequency === "biweekly" ? "bi-weekly paycheck" : "payday"} to cover listed debt minimums.`;
    if (existing) existing.textContent = floorText;
    else input.insertAdjacentHTML("afterend", `<small class="paycheck-floor">${floorText}</small>`);
    if (!field.querySelector(".paycheck-quick-add")) {
      input.insertAdjacentHTML("afterend", `<div class="paycheck-quick-add" aria-label="Increase set-aside amount"><button type="button" data-paycheck-add="25">+$25</button><button type="button" data-paycheck-add="50">+$50</button><button type="button" data-paycheck-add="100">+$100</button></div>`);
    }
  }

  function guideMarkup(settings, data) {
    const profile = contributionProfile(settings, data);
    const dates = paydays(settings, 30);
    if (!dates.length) {
      return `<div class="minimum-guide"><div class="minimum-guide-head"><div class="minimum-guide-title">Minimum-payment guide</div><p class="minimum-guide-copy">Enter your next paycheck date to match debt due dates with your pay schedule.</p></div><div class="minimum-guide-grid"><div class="minimum-guide-tile"><small>Listed minimums</small><strong>${money.format(profile.monthly)}</strong><span class="guide-sub">required each month</span></div><div class="minimum-guide-tile emphasis"><small>Required set-aside</small><strong>${money.format(profile.baseline)}</strong><span class="guide-sub">per ${settings.frequency === "biweekly" ? "bi-weekly check" : "payday"}</span></div></div></div>`;
    }
    const timing = timingBuffer(settings, data, dates);
    const firstDate = dates[0];
    const secondDate = dates[1] || new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate() + 14);
    const selected = settings.amount;
    const perTitle = settings.frequency === "biweekly" ? "Required each bi-weekly check" : settings.frequency === "semimonthly" ? "Required each payday" : "Required monthly";
    const selectedTitle = settings.frequency === "biweekly" ? "You set aside each check" : settings.frequency === "semimonthly" ? "You set aside each payday" : "You set aside monthly";
    const delta = cents(selected - profile.baseline);
    const beforeFirstTotal = sum(timing.beforeFirst);
    const firstWindowTotal = sum(timing.firstWindow);
    const hasShortfall = profile.difference < -.004;
    const status = hasShortfall
      ? `<div class="minimum-guide-status short">Your chosen amount is ${money.format(Math.abs(profile.difference))} short per year for listed minimums. Increase the set-aside by at least ${money.format(profile.baseline - selected)} each funding date.</div>`
      : `<div class="minimum-guide-status good">${selected > profile.baseline + .004 ? `${money.format(delta)} above the minimum per funding date · ${money.format(profile.difference)} available above listed yearly minimums.` : "This amount covers the listed minimum payments across the year."}</div>`;
    return `<div class="minimum-guide"><div class="minimum-guide-head"><div class="minimum-guide-title">Minimum-payment guide</div><p class="minimum-guide-copy">Uses your active debt minimums and each account's due date, not only a monthly total.</p></div><div class="minimum-guide-grid"><div class="minimum-guide-tile"><small>Listed minimums</small><strong>${money.format(profile.monthly)}</strong><span class="guide-sub">required every month</span></div><div class="minimum-guide-tile emphasis"><small>${perTitle}</small><strong>${money.format(profile.baseline)}</strong><span class="guide-sub">${profile.paymentsPerYear} funding dates per year</span></div><div class="minimum-guide-tile"><small>${selectedTitle}</small><strong>${selected ? money.format(selected) : "$0.00"}</strong><span class="guide-sub">${delta >= 0 ? `${money.format(delta)} above minimum` : `${money.format(Math.abs(delta))} below minimum`}</span></div><div class="minimum-guide-tile"><small>Due before next paycheck</small><strong>${money.format(beforeFirstTotal)}</strong><span class="guide-sub">${timing.beforeFirst.length ? `before ${labelDate(firstDate)}` : "none scheduled"}</span></div></div>${status}<div class="payday-timing"><div class="payday-timing-title">Payday timing check</div><div class="payday-timing-row"><span>Before your next paycheck<small>${debtNames(timing.beforeFirst)}</small></span><strong>${money.format(beforeFirstTotal)}</strong></div><div class="payday-timing-row"><span>${labelDate(firstDate)} to ${labelDate(before(secondDate))}<small>${debtNames(timing.firstWindow)}</small></span><strong>${money.format(firstWindowTotal)}</strong></div></div>${hasShortfall ? `<div class="buffer-note"><strong>Why this matters:</strong> The selected amount needs to cover your annual minimum total before extra debt payoff can be planned.</div>` : `<div class="buffer-note"><strong>Suggested starting debt-payment reserve: ${money.format(timing.buffer)}.</strong> This is the one-time cushion that keeps due dates covered when bills fall before a paycheck. It is separate from the amount you set aside from each new paycheck.</div>`}</div>`;
  }

  function renderGuide(form) {
    const data = getState();
    if (!data || !form.isConnected) return;
    normalizeNextPayday(form);
    const settings = settingsFromForm(form, data);
    const profile = contributionProfile(settings, data);
    addQuickButtons(form, settings, profile);
    const summary = form.querySelector("#paycheck-summary");
    if (!summary) return;
    const signature = JSON.stringify({
      f:settings.frequency, a:settings.amount, d:settings.nextPayDate, c:settings.cycleDay,
      one:settings.firstDay, two:settings.secondDay, debts:(data.debts || []).map(debt => [debt.id, debt.balance, debt.minimum, debt.dueDay])
    });
    if (summary.dataset.timingGuideSignature === signature) return;
    summary.dataset.timingGuideSignature = signature;
    summary.innerHTML = guideMarkup(settings, data);
  }

  let frame = 0;
  function scheduleRender() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const form = modalRoot.querySelector("#paycheck-form");
      if (form) renderGuide(form);
    });
  }

  document.addEventListener("click", event => {
    const add = event.target.closest("[data-paycheck-add]");
    if (add) {
      const form = add.closest("form");
      const data = getState();
      const settings = form && data ? settingsFromForm(form, data) : null;
      const input = settings?.frequency === "monthly" ? form.elements.monthlyAmount : form?.elements.paycheckAmount;
      if (input) {
        input.value = cents(number(input.value) + number(add.dataset.paycheckAdd)).toFixed(2);
        input.dispatchEvent(new Event("input", { bubbles:true }));
      }
      return;
    }
    if (event.target.closest("[data-pay-frequency]")) scheduleRender();
  }, false);

  document.addEventListener("input", event => { if (event.target.closest?.("#paycheck-form")) scheduleRender(); }, false);
  document.addEventListener("change", event => { if (event.target.closest?.("#paycheck-form")) scheduleRender(); }, false);
  new MutationObserver(scheduleRender).observe(modalRoot, { childList:true, subtree:true });
  installStyles();
})();
