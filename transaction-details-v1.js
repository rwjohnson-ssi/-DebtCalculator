(() => {
  "use strict";

  const STORAGE_KEY = "debt-calculator-v2";
  const screen = document.getElementById("screen");
  if (!screen) return;

  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const value = input => Number.isFinite(Number.parseFloat(input)) ? Number.parseFloat(input) : 0;
  const cents = input => Math.round((value(input) + Number.EPSILON) * 100) / 100;
  const esc = input => String(input ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

  function injectStyles() {
    if (document.getElementById("debtwizard-transaction-detail-styles")) return;
    const style = document.createElement("style");
    style.id = "debtwizard-transaction-detail-styles";
    style.textContent = `
      .transaction-detail-overlay { position:fixed; z-index:500; inset:0; display:flex; align-items:flex-end; background:rgba(27,48,56,.48); }
      .transaction-detail-sheet { width:min(100%,680px); max-height:91vh; overflow:auto; padding:21px 26px calc(27px + env(safe-area-inset-bottom,0px)); border-radius:28px 28px 0 0; background:#fff; box-shadow:0 -18px 46px rgba(23,51,61,.2); }
      .transaction-detail-head { display:grid; grid-template-columns:34px 1fr 34px; gap:10px; align-items:center; margin-bottom:24px; }
      .transaction-detail-close { width:34px; height:34px; padding:0; border:0; background:transparent; color:#6d797d; font-size:2.05rem; line-height:1; }
      .transaction-detail-name { display:flex; align-items:center; justify-content:center; gap:10px; min-width:0; color:#354247; font-size:1.25rem; font-weight:850; text-align:center; }
      .transaction-detail-name span:last-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .transaction-debt-icon { width:33px; height:29px; display:grid; place-items:center; flex:0 0 auto; border-radius:7px; background:#ffc547; color:#fff; font-size:1rem; }
      .transaction-detail-summary { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }
      .transaction-summary-label { display:block; color:#778388; font-size:.86rem; }
      .transaction-summary-value { display:block; margin-top:5px; color:#38454a; font-size:1.48rem; line-height:1.05; font-weight:850; letter-spacing:-.045em; }
      .transaction-summary-date { display:block; margin-top:5px; color:#4d575b; font-size:1.2rem; font-weight:750; }
      .transaction-breakdown { padding:17px 24px; border-radius:15px; background:#f0f1f1; }
      .transaction-breakdown-row { display:flex; justify-content:space-between; gap:14px; padding:7px 0; color:#59646a; font-size:1rem; }
      .transaction-breakdown-row strong { color:#4a555a; font-weight:800; white-space:nowrap; }
      .transaction-breakdown-row.total { margin-top:8px; padding-top:15px; border-top:1px solid #dfe2e3; color:#435056; font-size:1.05rem; }
      .transaction-breakdown-row.total strong { color:#344247; font-size:1.1rem; }
      .transaction-note { display:flex; gap:10px; margin:22px 0 0; color:#747e82; font-size:.85rem; line-height:1.4; }
      .transaction-tracker-link { margin:20px 0 0; border:0; padding:0; background:transparent; color:#758086; font-size:.9rem; line-height:1.45; text-align:left; }
      .transaction-tracker-link strong { color:#168aa6; font-weight:850; }
      .detail-transactions-clickable .transaction-row { cursor:pointer; }
      .detail-transactions-clickable .transaction-row:active { background:#f8fcfd; }
      @media (min-width:560px) { .transaction-detail-overlay { align-items:center; justify-content:center; padding:20px; } .transaction-detail-sheet { border-radius:25px; } }
      @media (max-width:390px) { .transaction-detail-sheet { padding-left:20px; padding-right:20px; } .transaction-detail-summary { gap:12px; } .transaction-summary-value { font-size:1.32rem; } .transaction-summary-date { font-size:1.08rem; } .transaction-breakdown { padding:14px 17px; } }
    `;
    document.head.appendChild(style);
  }

  function getState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return state && typeof state === "object" ? state : null;
    } catch { return null; }
  }

  function parseMonth(input) {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(input || "")) {
      const [year, month] = input.split("-").map(Number);
      return new Date(year, month - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function dueDate(month, day) {
    const selected = Math.max(1, Math.floor(value(day)) || 1);
    const finalDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return new Date(month.getFullYear(), month.getMonth(), Math.min(selected, finalDay));
  }

  function sortPriority(items, settings) {
    const positions = new Map((settings.customOrder || []).map((id, index) => [String(id), index]));
    const strategy = settings.strategy || "snowball";
    return [...items].sort((a, b) => {
      if (strategy === "avalanche") return b.apr - a.apr || a.balance - b.balance || a.name.localeCompare(b.name);
      if (strategy === "custom") return (positions.get(String(a.id)) ?? 9999) - (positions.get(String(b.id)) ?? 9999) || a.balance - b.balance;
      return a.balance - b.balance || b.apr - a.apr || a.name.localeCompare(b.name);
    });
  }

  function projectedTransactions(state) {
    const settings = state.settings || {};
    const originalDebts = Array.isArray(state.debts) ? state.debts : [];
    const debts = originalDebts
      .filter(debt => value(debt.balance) > .004)
      .map(debt => ({ ...debt, balance:cents(debt.balance), apr:Math.max(0,value(debt.apr)), minimum:Math.max(0,value(debt.minimum)) }));
    const result = Object.fromEntries(originalDebts.map(debt => [String(debt.id), []]));
    const start = parseMonth(settings.start || settings.planStart);
    const monthlyBudget = cents(debts.reduce((sum, debt) => sum + debt.minimum, 0) + Math.max(0,value(settings.extra)));
    const oneTime = Array.isArray(settings.oneTime) ? settings.oneTime : [];

    for (let index = 0; index < 720; index++) {
      const month = new Date(start.getFullYear(), start.getMonth() + index, 1);
      const open = debts.filter(debt => debt.balance > .004);
      if (!open.length) break;
      const details = new Map();

      open.forEach(debt => {
        const opening = cents(debt.balance);
        const interest = cents(opening * debt.apr / 100 / 12);
        debt.balance = cents(opening + interest);
        details.set(String(debt.id), { opening, interest, minimum:0, extra:0 });
      });

      let available = cents(monthlyBudget + oneTime.filter(item => item.month === monthKey(month)).reduce((sum, item) => sum + value(item.amount), 0));
      open.forEach(debt => {
        const payment = Math.min(debt.minimum, debt.balance, available);
        debt.balance = cents(debt.balance - payment);
        available = cents(available - payment);
        details.get(String(debt.id)).minimum = cents(payment);
      });

      while (available > .004) {
        const remaining = debts.filter(debt => debt.balance > .004);
        if (!remaining.length) break;
        const focus = sortPriority(remaining, settings)[0];
        const payment = Math.min(focus.balance, available);
        focus.balance = cents(focus.balance - payment);
        available = cents(available - payment);
        details.get(String(focus.id)).extra = cents(details.get(String(focus.id)).extra + payment);
      }

      open.forEach(debt => {
        if (debt.balance <= .004) debt.balance = 0;
        const item = details.get(String(debt.id));
        const payment = cents(item.minimum + item.extra);
        result[String(debt.id)].push({
          date: dueDate(month, debt.dueDay),
          previousBalance: item.opening,
          interest: item.interest,
          payment,
          principal: cents(Math.max(0, payment - item.interest)),
          newBalance: cents(debt.balance),
          extra: item.extra
        });
      });
    }

    return result;
  }

  function formatDate(date) {
    return date.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  }

  function dueCountdown(date) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.max(0, Math.ceil((date - start) / 86400000));
    const months = Math.floor(days / 30);
    const remainder = days - months * 30;
    if (!months) return `${days} day${days === 1 ? "" : "s"}`;
    return `${months} month${months === 1 ? "" : "s"}${remainder ? ` ${remainder} day${remainder === 1 ? "" : "s"}` : ""}`;
  }

  function openDetails(debt, transaction, isRecorded = false, note = "") {
    injectStyles();
    document.getElementById("transaction-detail-overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "transaction-detail-overlay";
    overlay.className = "transaction-detail-overlay";
    const heading = isRecorded ? "Recorded payment" : "Planned payment";
    const dueText = isRecorded ? "Payment date" : `Due Date (${dueCountdown(transaction.date)})`;
    const paymentLabel = isRecorded ? "Recorded payment" : "Payment";
    overlay.innerHTML = `
      <section class="transaction-detail-sheet" role="dialog" aria-modal="true" aria-label="Transaction details">
        <div class="transaction-detail-head">
          <button class="transaction-detail-close" type="button" data-transaction-close aria-label="Close">×</button>
          <div class="transaction-detail-name"><span class="transaction-debt-icon">▣</span><span>${esc(debt.name)}</span></div>
          <span></span>
        </div>
        <div class="transaction-detail-summary">
          <div><span class="transaction-summary-label">${heading}</span><span class="transaction-summary-value">${money.format(transaction.payment)}</span></div>
          <div><span class="transaction-summary-label">${dueText}</span><span class="transaction-summary-date">${formatDate(transaction.date)}</span></div>
        </div>
        <div class="transaction-breakdown">
          <div class="transaction-breakdown-row"><span>Previous balance</span><strong>${money.format(transaction.previousBalance)}</strong></div>
          <div class="transaction-breakdown-row"><span>Interest accrued</span><strong>${money.format(transaction.interest)}</strong></div>
          <div class="transaction-breakdown-row"><span>New expenses</span><strong>${money.format(0)}</strong></div>
          <div class="transaction-breakdown-row"><span>${paymentLabel}${transaction.extra > .004 ? " (includes extra)" : ""}</span><strong>(${money.format(transaction.payment)})</strong></div>
          <div class="transaction-breakdown-row total"><span>New balance</span><strong>${money.format(transaction.newBalance)}</strong></div>
        </div>
        ${note ? `<p class="transaction-note"><span>◌</span><span>${esc(note)}</span></p>` : ""}
        <p class="transaction-note"><span>⚠</span><span>Estimates only. Always review and make payments according to your creditor's requirements.</span></p>
        <button class="transaction-tracker-link" type="button" data-open-tracker>You can record transactions using the <strong>Payment Tracker</strong></button>
      </section>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", event => {
      if (event.target === overlay || event.target.closest("[data-transaction-close]")) overlay.remove();
      if (event.target.closest("[data-open-tracker]")) {
        overlay.remove();
        document.querySelector('#tabbar [data-page="track"]')?.click();
      }
    });
  }

  function readDateFromRow(row) {
    const text = row.textContent.replace(/\s+/g, " ").trim();
    const match = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}/i);
    if (!match) return null;
    const parsed = new Date(`${match[0]} 12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function currentDetailDebt(state) {
    const name = screen.querySelector(".detail-title")?.textContent.trim();
    return (state.debts || []).find(debt => String(debt.name || "").trim() === name);
  }

  function isDebtTransactionsScreen() {
    const activeTab = screen.querySelector(".hero-tabs button.active")?.textContent.trim();
    return !!screen.querySelector(".detail-title") && activeTab === "Transactions";
  }

  screen.addEventListener("click", event => {
    if (!isDebtTransactionsScreen()) return;
    const row = event.target.closest(".transaction-row");
    if (!row || !screen.contains(row)) return;
    const transactionDate = readDateFromRow(row);
    if (!transactionDate) return;

    const state = getState();
    const debt = state && currentDetailDebt(state);
    if (!debt) return;

    const scheduled = projectedTransactions(state)[String(debt.id)] || [];
    const projected = scheduled.find(item => dateKey(item.date) === dateKey(transactionDate));
    if (projected) {
      openDetails(debt, projected);
      return;
    }

    const recorded = (state.payments || []).find(item => {
      const paidDate = /^\d{4}-\d{2}-\d{2}$/.test(String(item.date)) ? new Date(`${item.date}T12:00:00`) : new Date(item.date);
      return (String(item.debtId) === String(debt.id) || item.name === debt.name) && dateKey(paidDate) === dateKey(transactionDate);
    });
    if (recorded) {
      const balance = cents(value(debt.balance));
      openDetails(debt, {
        date: transactionDate,
        previousBalance: balance + cents(recorded.amount),
        interest: 0,
        payment: cents(recorded.amount),
        principal: cents(recorded.amount),
        newBalance: balance,
        extra: 0
      }, true, recorded.note || "Payment recorded in DebtWizard.");
    }
  }, true);

  new MutationObserver(() => {
    if (!isDebtTransactionsScreen()) return;
    screen.classList.add("detail-transactions-clickable");
  }).observe(screen, { childList:true, subtree:true });
})();
