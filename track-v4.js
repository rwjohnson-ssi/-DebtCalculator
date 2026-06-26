(() => {
  "use strict";

  const atMidnight = () => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), date.getDate()); };
  const key = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const monthKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const monthHeading = date => date.toLocaleDateString("en-US", { month:"long", year:"numeric" });
  const shortMonth = date => date.toLocaleDateString("en-US", { month:"short", year:"numeric" });
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const number = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;

  function monthDate(year, month, day) {
    return new Date(year, month, Math.min(Math.max(1, day), daysInMonth(year, month)));
  }

  function isoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    return new Date(`${value}T12:00:00`);
  }

  function payrollSettings(settings = {}) {
    return {
      frequency: ["monthly", "semimonthly", "biweekly"].includes(settings.fundingFrequency) ? settings.fundingFrequency : "monthly",
      paycheckAmount: Math.max(0, number(settings.paycheckAmount)),
      nextPayDate: /^\d{4}-\d{2}-\d{2}$/.test(settings.nextPayDate || "") ? settings.nextPayDate : "",
      cycleDay: Math.max(1, Math.min(28, Math.floor(number(settings.cycleDay)) || 1)),
      firstDay: Math.max(1, Math.min(28, Math.floor(number(settings.semiMonthlyFirstDay)) || 1)),
      secondDay: Math.max(1, Math.min(28, Math.floor(number(settings.semiMonthlySecondDay)) || 15))
    };
  }

  function fundingEvents(ctx, months) {
    const settings = payrollSettings(ctx.state.settings || {});
    const today = atMidnight();
    const end = new Date(today.getFullYear(), today.getMonth() + months + 1, 0);
    const events = [];
    const plan = ctx.calculatePlan();

    if (settings.frequency === "biweekly" && settings.nextPayDate && settings.paycheckAmount > 0) {
      let date = isoDate(settings.nextPayDate);
      while (date < today) date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 14);
      while (date <= end) {
        events.push({ type:"funding", date:new Date(date), amount:settings.paycheckAmount, label:"Paycheck funding", tag:"Paycheck" });
        date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 14);
      }
      return events;
    }

    if (settings.frequency === "semimonthly" && settings.paycheckAmount > 0) {
      let cursor = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      while (cursor <= end) {
        [settings.firstDay, settings.secondDay].sort((a,b) => a-b).forEach(day => {
          const date = monthDate(cursor.getFullYear(), cursor.getMonth(), day);
          if (date >= today && date <= end && !events.some(event => +event.date === +date)) {
            events.push({ type:"funding", date, amount:settings.paycheckAmount, label:"Paycheck funding", tag:"Paycheck" });
          }
        });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
      return events.sort((a,b) => a.date - b.date);
    }

    let cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    while (cursor <= end) {
      const date = monthDate(cursor.getFullYear(), cursor.getMonth(), settings.cycleDay);
      if (date >= today && date <= end) events.push({ type:"funding", date, amount:plan.budget, label:"Recurring funding", tag:"Fund" });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return events;
  }

  function ensureTrackingState(ui) {
    if (!ui.trackTab) ui.trackTab = "upcoming";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ui.trackMonth || "")) ui.trackMonth = monthKey(atMidnight());
    if (!ui.trackSelectedDate) ui.trackSelectedDate = key(atMidnight());
  }

  function scheduledEvents(ctx, months = 7) {
    const today = atMidnight();
    const events = fundingEvents(ctx, months);
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    ctx.active().forEach(debt => {
      const day = Math.max(1, number(debt.dueDay) || 1);
      for (let offset = 0; offset < months; offset++) {
        const point = new Date(start.getFullYear(), start.getMonth() + offset, 1);
        const date = monthDate(point.getFullYear(), point.getMonth(), day);
        if (date >= today) events.push({ type:"minimum", date, amount:debt.minimum, label:debt.name, debtId:debt.id, tag:"Minimum" });
      }
    });
    return events.sort((a,b) => a.date - b.date || a.type.localeCompare(b.type) || a.label.localeCompare(b.label));
  }

  function groupEvents(events) {
    const groups = new Map();
    events.forEach(event => { const group = monthKey(event.date); if (!groups.has(group)) groups.set(group, []); groups.get(group).push(event); });
    return [...groups.entries()];
  }

  function eventRow(ctx, event) {
    const isFunding = event.type === "funding";
    const action = isFunding ? "paycheck-setup" : "detail";
    const id = isFunding ? "" : ` data-id="${event.debtId}"`;
    const icon = isFunding ? "$" : "▣";
    return `<button class="track-row ${isFunding ? "paycheck-track-row" : ""}" data-act="${action}"${id}>
      <span class="track-icon">${icon}</span>
      <span class="track-main"><span class="track-name"><span>${ctx.esc(event.label)}</span><span class="track-tag ${isFunding ? "fund" : ""}">${event.tag}</span></span><span class="track-date">${ctx.dateLabel(event.date)}</span></span>
      <span class="track-amount">${ctx.money.format(event.amount)}</span><span class="track-chevron">›</span>
    </button>`;
  }

  function upcomingView(ctx) {
    const groups = groupEvents(scheduledEvents(ctx));
    if (!groups.length) return `<div class="empty"><span class="empty-icon">✓</span><h3>No upcoming payments</h3><p>Add debts and a paycheck schedule to build your calendar.</p></div>`;
    const thisMonth = monthKey(atMidnight());
    return groups.map(([groupKey, events]) => {
      const date = new Date(`${groupKey}-01T12:00:00`);
      const title = groupKey === thisMonth ? `${monthHeading(date)} remaining` : monthHeading(date);
      return `<section class="track-group"><h2 class="track-group-title">${title}</h2><div class="track-list">${events.map(event => eventRow(ctx,event)).join("")}</div></section>`;
    }).join("");
  }

  function completeView(ctx) {
    const payments = [...ctx.state.payments].sort((a,b) => String(b.date).localeCompare(String(a.date)));
    if (!payments.length) return `<div class="empty"><span class="empty-icon">◌</span><h3>No completed payments</h3><p>Use Record payment when you make a payment and it will appear here.</p></div>`;
    const grouped = new Map();
    payments.forEach(payment => {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(payment.date)) ? new Date(`${payment.date}T12:00:00`) : new Date(payment.date);
      const group = monthKey(date); if (!grouped.has(group)) grouped.set(group, []); grouped.get(group).push({ payment, date });
    });
    return [...grouped.entries()].map(([group, items]) => `<section class="track-group"><h2 class="track-group-title">${monthHeading(new Date(`${group}-01T12:00:00`))}</h2><div class="track-list">${items.map(({payment,date}) => `<div class="track-row"><span class="track-icon">✓</span><span class="track-main"><span class="track-name"><span>${ctx.esc(payment.name || "Payment")}</span><span class="track-tag fund">Complete</span></span><span class="track-date">${ctx.dateLabel(date)}${payment.note ? ` · ${ctx.esc(payment.note)}` : ""}</span></span><span class="track-amount">${ctx.money.format(payment.amount)}</span><span class="track-chevron"></span></div>`).join("")}</div></section>`).join("");
  }

  function calendarView(ctx) {
    ensureTrackingState(ctx.ui);
    const month = ctx.parseMonth(ctx.ui.trackMonth);
    const events = scheduledEvents(ctx, 12);
    const activeEvents = events.filter(event => monthKey(event.date) === ctx.ui.trackMonth);
    const eventDays = new Set(activeEvents.map(event => key(event.date)));
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const count = daysInMonth(month.getFullYear(), month.getMonth());
    const todayKey = key(atMidnight());
    const selected = ctx.ui.trackSelectedDate;
    const blanks = Array.from({length:firstDay}, () => '<span class="calendar-blank"></span>').join("");
    const days = Array.from({length:count}, (_,index) => { const date = new Date(month.getFullYear(),month.getMonth(),index+1); const dateKey = key(date); return `<button class="calendar-day ${dateKey === selected ? "selected" : ""} ${dateKey === todayKey ? "today" : ""}" data-act="calendar-day" data-date="${dateKey}">${index+1}${eventDays.has(dateKey)?'<span class="calendar-dot"></span>':""}</button>`; }).join("");
    const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(selected) ? new Date(`${selected}T12:00:00`) : null;
    const dayEvents = selectedDate ? activeEvents.filter(event => key(event.date) === key(selectedDate)) : activeEvents;
    const belowTitle = selectedDate && monthKey(selectedDate) === ctx.ui.trackMonth ? ctx.dateLabel(selectedDate) : monthHeading(month);
    return `<div class="calendar-controls"><div class="calendar-month-label">${shortMonth(month)}</div><button class="calendar-arrow" data-act="calendar-prev">‹</button><button class="calendar-arrow" data-act="calendar-next">›</button></div><div class="calendar-weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div class="calendar-grid">${blanks}${days}</div><div class="calendar-events"><h2 class="track-group-title">${belowTitle}</h2><div class="track-list">${dayEvents.length ? dayEvents.map(event => eventRow(ctx,event)).join("") : `<div class="empty" style="padding:19px 8px"><span class="empty-icon" style="font-size:2rem">◌</span><h3 style="font-size:1rem">No scheduled items</h3><p>Choose a date with a dot to see payments or paydays.</p></div>`}</div></div>`;
  }

  window.debtWizardTrackPage = ctx => {
    ensureTrackingState(ctx.ui);
    const tab = ctx.ui.trackTab;
    const body = tab === "complete" ? completeView(ctx) : tab === "calendar" ? calendarView(ctx) : upcomingView(ctx);
    return `<section class="app-page"><header class="mobile-hero"><div class="hero-inner"><div class="hero-row"><div><h1 class="hero-title">Tracking</h1><p class="hero-subtitle">Track paydays and debt payments.</p></div><button class="icon-btn" data-act="record-payment" aria-label="Record payment">＋</button></div></div></header><div class="page-sheet"><div class="page-wrap"><div class="track-tabs"><button class="${tab === "upcoming" ? "active" : ""}" data-act="track-tab" data-track-tab="upcoming">Upcoming</button><button class="${tab === "complete" ? "active" : ""}" data-act="track-tab" data-track-tab="complete">Complete</button><button class="${tab === "calendar" ? "active" : ""}" data-act="track-tab" data-track-tab="calendar">Calendar</button></div><div class="track-toolbar"><h2 class="section-title">${tab === "upcoming" ? "Upcoming" : tab === "complete" ? "Completed" : "Calendar"}</h2>${tab !== "complete" ? '<button class="btn secondary slim" data-act="record-payment">Record</button>' : ""}</div>${body}</div></div></section>`;
  };

  window.debtWizardTrackAction = ctx => {
    if (ctx.act === "track-tab") { ctx.ui.trackTab = ctx.button.dataset.trackTab || "upcoming"; ctx.render(false); return true; }
    if (ctx.act === "calendar-prev" || ctx.act === "calendar-next") { ensureTrackingState(ctx.ui); const date = ctx.parseMonth(ctx.ui.trackMonth); date.setMonth(date.getMonth() + (ctx.act === "calendar-prev" ? -1 : 1)); ctx.ui.trackMonth = monthKey(date); ctx.ui.trackSelectedDate = key(new Date(date.getFullYear(),date.getMonth(),1)); ctx.render(false); return true; }
    if (ctx.act === "calendar-day") { ctx.ui.trackSelectedDate = ctx.button.dataset.date; ctx.render(false); return true; }
    return false;
  };
})();
