(() => {
  "use strict";

  const STORAGE_KEY = "debt-calculator-v2";
  const screen = document.getElementById("screen");
  if (!screen) return;

  const cents = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const number = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  function addStyles() {
    if (document.getElementById("debtwizard-amortization-styles")) return;
    const style = document.createElement("style");
    style.id = "debtwizard-amortization-styles";
    style.textContent = `
      .amortization-section { overflow: hidden; }
      .amortization-note { margin: -7px 0 13px; color: #879398; font-size: .8rem; line-height: 1.35; }
      .amortization-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #e5eef0; border-radius: 13px; }
      .amortization-table { width: 100%; min-width: 560px; border-collapse: collapse; font-variant-numeric: tabular-nums; }
      .amortization-table th { padding: 11px 10px; color: #15536b; background: #dff7fb; border-bottom: 1px solid #c9ebf1; font-size: .78rem; font-weight: 850; text-align: right; white-space: nowrap; }
      .amortization-table th:first-child, .amortization-table td:first-child { text-align: left; }
      .amortization-table td { padding: 10px; color: #5c686d; border-bottom: 1px solid #edf0f1; font-size: .8rem; text-align: right; white-space: nowrap; }
      .amortization-table tbody tr:last-child td { border-bottom: 0; }
      .amortization-table tbody tr:first-child td { color: #869196; background: #fbfcfc; }
      .amortization-table .ending-balance { color: #33464d; font-weight: 800; }
    `;
    document.head.appendChild(style);
  }

  function getState() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return data && typeof data === "object" ? data : null;
    } catch {
      return null;
    }
  }

  function parseMonth(value) {
    const safe = /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "") ? value : (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();
    const [year, month] = safe.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function prioritySort(items, settings) {
    const strategy = settings.strategy || "snowball";
    const positions = new Map((settings.customOrder || []).map((id, index) => [String(id), index]));
    return [...items].sort((a, b) => {
      if (strategy === "avalanche") return b.apr - a.apr || a.balance - b.balance || a.name.localeCompare(b.name);
      if (strategy === "custom") return (positions.get(String(a.id)) ?? 9999) - (positions.get(String(b.id)) ?? 9999) || a.balance - b.balance;
      return a.balance - b.balance || b.apr - a.apr || a.name.localeCompare(b.name);
    });
  }

  function buildTrails(state) {
    const settings = state.settings || {};
    const debts = (state.debts || []).filter(debt => number(debt.balance) > 0.004).map(debt => ({
      ...debt,
      balance: cents(number(debt.balance)),
      apr: Math.max(0, number(debt.apr)),
      minimum: Math.max(0, number(debt.minimum))
    }));
    const all = state.debts || [];
    const start = parseMonth(settings.start || settings.planStart);
    const trails = Object.fromEntries(all.map(debt => [String(debt.id), [{ date: start, balance: cents(number(debt.balance)) }]]));
    const monthlyBudget = cents(debts.reduce((sum, debt) => sum + debt.minimum, 0) + Math.max(0, number(settings.extra)));
    const oneTime = Array.isArray(settings.oneTime) ? settings.oneTime : [];

    for (let index = 0; index < 720; index++) {
      const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
      const open = debts.filter(debt => debt.balance > 0.004);
      if (!open.length) break;

      open.forEach(debt => {
        debt.balance = cents(debt.balance + debt.balance * debt.apr / 100 / 12);
      });

      let available = cents(monthlyBudget + oneTime.filter(item => item.month === monthKey(date)).reduce((sum, item) => sum + number(item.amount), 0));
      open.forEach(debt => {
        const payment = Math.min(debt.minimum, debt.balance, available);
        debt.balance = cents(debt.balance - payment);
        available = cents(available - payment);
      });

      while (available > 0.004) {
        const remaining = debts.filter(debt => debt.balance > 0.004);
        if (!remaining.length) break;
        const focus = prioritySort(remaining, settings)[0];
        const payment = Math.min(focus.balance, available);
        focus.balance = cents(focus.balance - payment);
        available = cents(available - payment);
      }

      debts.forEach(debt => {
        if (debt.balance <= 0.004) debt.balance = 0;
        trails[String(debt.id)].push({ date, balance: debt.balance });
      });
    }

    return trails;
  }

  function dueDateForMonth(monthDate, dueDay) {
    const day = Math.max(1, Math.floor(number(dueDay)) || 1);
    const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    return new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.min(day, last));
  }

  function dateLabel(date) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function scheduleRows(debt, trail) {
    const rows = [{ date: null, payment: 0, principal: 0, interest: 0, balance: cents(number(debt.balance)) }];
    if (!trail || trail.length < 2) return rows;

    for (let index = 1; index < trail.length; index++) {
      const opening = cents(trail[index - 1].balance);
      const ending = cents(trail[index].balance);
      const interest = cents(opening * Math.max(0, number(debt.apr)) / 100 / 12);
      const payment = cents(Math.max(0, opening + interest - ending));
      const principal = cents(Math.max(0, payment - interest));
      rows.push({
        date: dueDateForMonth(trail[index].date, debt.dueDay),
        payment,
        principal,
        interest,
        balance: ending
      });
      if (ending <= 0.004) break;
    }
    return rows;
  }

  function renderAmortization(debt, rows) {
    return `<section class="section amortization-section" data-amortization-for="${String(debt.id)}">
      <h2 class="section-title">Amortization</h2>
      <p class="amortization-note">Projected from your current balance, APR, scheduled payments, extra funding, and payoff priority.</p>
      <div class="amortization-scroll">
        <table class="amortization-table">
          <thead><tr><th>Date</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
          <tbody>
            ${rows.map((row, index) => `<tr><td>${index === 0 ? "Starting balance" : dateLabel(row.date)}</td><td>${money.format(row.payment)}</td><td>${money.format(row.principal)}</td><td>${money.format(row.interest)}</td><td class="ending-balance">${money.format(row.balance)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>`;
  }

  function inject() {
    addStyles();
    const chart = screen.querySelector(".balance-chart");
    const title = screen.querySelector(".detail-title");
    if (!chart || !title) return;

    const state = getState();
    if (!state) return;
    const debt = (state.debts || []).find(item => String(item.name || "").trim() === title.textContent.trim());
    if (!debt) return;

    if (screen.querySelector(`[data-amortization-for="${String(debt.id)}"]`)) return;
    screen.querySelectorAll(".amortization-section").forEach(node => node.remove());

    const trails = buildTrails(state);
    const rows = scheduleRows(debt, trails[String(debt.id)]);
    const timelineSection = chart.closest("section");
    if (timelineSection) timelineSection.insertAdjacentHTML("afterend", renderAmortization(debt, rows));
  }

  let pending = false;
  const queue = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      inject();
    });
  };

  new MutationObserver(queue).observe(screen, { childList: true, subtree: true });
  queue();
})();
