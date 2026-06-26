(() => {
  "use strict";

  const STORE = "debt-calculator-v2";
  const screen = document.getElementById("screen");
  if (!screen) return;

  const money = new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" });
  const value = input => Number.isFinite(Number.parseFloat(input)) ? Number.parseFloat(input) : 0;
  const cents = input => Math.round((value(input) + Number.EPSILON) * 100) / 100;
  const esc = input => String(input ?? "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[character]));
  const dayStart = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const monthKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  function getState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORE));
      return state && typeof state === "object" ? state : null;
    } catch { return null; }
  }

  function saveState(state) {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function parseMonth(input) {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(input || "")) {
      const [year, month] = input.split("-").map(Number);
      return new Date(year, month - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  function dueDate(month, day) {
    const requested = Math.max(1, Math.floor(value(day)) || 1);
    const finalDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return new Date(month.getFullYear(), month.getMonth(), Math.min(requested, finalDay));
  }

  function priority(items, settings) {
    const custom = new Map((settings.customOrder || []).map((id, index) => [String(id), index]));
    const strategy = settings.strategy || "snowball";
    return [...items].sort((a, b) => {
      if (strategy === "avalanche") return b.apr - a.apr || a.balance - b.balance || a.name.localeCompare(b.name);
      if (strategy === "custom") return (custom.get(String(a.id)) ?? 9999) - (custom.get(String(b.id)) ?? 9999) || a.balance - b.balance;
      return a.balance - b.balance || b.apr - a.apr || a.name.localeCompare(b.name);
    });
  }

  function projectedTransactions(state) {
    const settings = state.settings || {};
    const originals = Array.isArray(state.debts) ? state.debts : [];
    const debts = originals
      .filter(debt => value(debt.balance) > .004)
      .map(debt => ({ ...debt, balance:cents(debt.balance), apr:Math.max(0,value(debt.apr)), minimum:Math.max(0,value(debt.minimum)) }));
    const result = Object.fromEntries(originals.map(debt => [String(debt.id), []]));
    const start = parseMonth(settings.start || settings.planStart);
    const monthlyBudget = cents(debts.reduce((sum, debt) => sum + debt.minimum, 0) + Math.max(0,value(settings.extra)));
    const oneTime = Array.isArray(settings.oneTime) ? settings.oneTime : [];

    for (let index = 0; index < 720; index += 1) {
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
        const focus = priority(remaining, settings)[0];
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
          previousBalance:item.opening,
          interest:item.interest,
          payment,
          principal:cents(Math.max(0,payment - item.interest)),
          newBalance:cents(debt.balance),
          extra:item.extra
        });
      });
    }
    return result;
  }

  function readDate(row) {
    const declared = row.dataset.transactionDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(declared || "")) return new Date(`${declared}T12:00:00`);
    const text = row.querySelector(".track-date")?.textContent || row.textContent || "";
    const match = text.replace(/\s+/g, " ").match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}/i);
    if (!match) return null;
    const parsed = new Date(`${match[0]} 12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatDate(date) {
    return date.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  }

  function countdown(date) {
    const current = dayStart(new Date());
    const days = Math.max(0, Math.ceil((dayStart(date) - current) / 86400000));
    if (days < 31) return `${days} day${days === 1 ? "" : "s"}`;
    const months = Math.floor(days / 30);
    const remainder = days - months * 30;
    return `${months} mo${remainder ? ` ${remainder} days` : ""}`;
  }

  function styles() {
    if (document.getElementById("track-payment-details-v2-styles")) return;
    const style = document.createElement("style");
    style.id = "track-payment-details-v2-styles";
    style.textContent = `
      .track-payment-overlay { position:fixed; z-index:900; inset:0; display:flex; align-items:flex-end; background:rgba(24,48,57,.50); }
      .track-payment-sheet { width:min(100%,680px); max-height:91dvh; overflow:auto; padding:22px 26px calc(25px + env(safe-area-inset-bottom,0px)); border-radius:28px 28px 0 0; background:#fff; box-shadow:0 -18px 44px rgba(19,51,62,.25); -webkit-overflow-scrolling:touch; }
      .track-payment-header { display:grid; grid-template-columns:35px minmax(0,1fr) 35px; align-items:center; gap:8px; margin-bottom:26px; }
      .track-payment-close { width:35px; height:35px; padding:0; border:0; color:#737f83; background:transparent; font-size:2.05rem; line-height:1; }
      .track-payment-title { display:flex; align-items:center; justify-content:center; gap:10px; min-width:0; color:#303e43; font-size:1.28rem; font-weight:900; text-align:center; }
      .track-payment-title span:last-child { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .track-payment-card-icon { width:34px; height:29px; display:grid; place-items:center; flex:0 0 auto; border-radius:7px; color:#fff; background:#ffc547; font-size:.98rem; }
      .track-payment-summary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; margin-bottom:23px; }
      .track-payment-summary-label { display:block; color:#778288; font-size:.84rem; }.track-payment-summary-value { display:block; margin-top:5px; color:#3b474c; font-size:1.48rem; line-height:1.05; font-weight:900; letter-spacing:-.04em; }.track-payment-summary-date { display:block; margin-top:6px; color:#4a565a; font-size:1.18rem; line-height:1.14; font-weight:750; }
      .track-payment-breakdown { padding:17px 24px; border-radius:15px; background:#f0f1f1; }.track-payment-breakdown-row { display:flex; justify-content:space-between; gap:12px; padding:7px 0; color:#59646a; font-size:1rem; }.track-payment-breakdown-row strong { color:#4a555a; font-weight:800; white-space:nowrap; }.track-payment-breakdown-row.total { margin-top:8px; padding-top:15px; border-top:1px solid #dfe2e3; color:#435056; font-size:1.05rem; }.track-payment-breakdown-row.total strong { color:#344247; font-size:1.1rem; }
      .track-payment-note { display:grid; gap:7px; margin:15px 0; padding:13px 15px; border-radius:13px; background:#f3f4f4; color:#677176; font-size:.84rem; font-weight:750; }.track-payment-note textarea { min-height:46px; padding:2px 0; border:0; border-bottom:1px solid #c6ced1; resize:vertical; color:#3e4b50; background:transparent; font:inherit; }.track-payment-note textarea:focus { border-bottom:2px solid #3dc2dd; outline:0; }
      .track-payment-multi { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:13px 0 16px; color:#39464a; font-size:1rem; font-weight:750; }.track-payment-switch { appearance:none; width:46px; height:27px; margin:0; border-radius:20px; background:#b2b8ba; position:relative; transition:.18s ease; }.track-payment-switch::after { content:""; position:absolute; top:3px; left:3px; width:21px; height:21px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.16); transition:.18s ease; }.track-payment-switch:checked { background:#48c3dc; }.track-payment-switch:checked::after { left:22px; }
      .track-payment-complete { width:100%; min-height:52px; border:0; border-radius:12px; color:#fff; background:linear-gradient(135deg,#25b7d1,#54cde1); box-shadow:0 9px 18px rgba(44,186,211,.22); font-size:1.05rem; font-weight:900; }.track-payment-complete:disabled { opacity:.6; }
      .track-payment-disclaimer { display:flex; gap:9px; margin:20px 0 0; color:#747e82; font-size:.84rem; line-height:1.4; }.track-payment-confirm { margin:10px 0 0; padding:10px 12px; border-radius:10px; color:#226b48; background:#eefaf3; border:1px solid #c6ecd5; font-size:.82rem; font-weight:800; }
      @media(min-width:560px){.track-payment-overlay{align-items:center;justify-content:center;padding:20px}.track-payment-sheet{border-radius:24px}}@media(max-width:390px){.track-payment-sheet{padding-left:20px;padding-right:20px}.track-payment-summary{gap:12px}.track-payment-summary-value{font-size:1.32rem}.track-payment-summary-date{font-size:1.08rem}.track-payment-breakdown{padding:14px 17px}}
    `;
    document.head.appendChild(style);
  }

  function openSheet(debt, transaction, sourceRow) {
    styles();
    document.getElementById("track-payment-overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "track-payment-overlay";
    overlay.className = "track-payment-overlay";
    overlay.innerHTML = `<section class="track-payment-sheet" role="dialog" aria-modal="true" aria-label="Planned payment details">
      <div class="track-payment-header"><button type="button" class="track-payment-close" data-track-payment-close aria-label="Close">×</button><div class="track-payment-title"><span class="track-payment-card-icon">▣</span><span>${esc(debt.name)}</span></div><span></span></div>
      <div class="track-payment-summary"><div><span class="track-payment-summary-label">Planned Payment</span><span class="track-payment-summary-value">${money.format(transaction.payment)}</span></div><div><span class="track-payment-summary-label">Due Date (${countdown(transaction.date)})</span><span class="track-payment-summary-date">${formatDate(transaction.date)}</span></div></div>
      <div class="track-payment-breakdown"><div class="track-payment-breakdown-row"><span>Previous balance</span><strong>${money.format(transaction.previousBalance)}</strong></div><div class="track-payment-breakdown-row"><span>Interest accrued</span><strong>${money.format(transaction.interest)}</strong></div><div class="track-payment-breakdown-row"><span>New expenses</span><strong>${money.format(0)}</strong></div><div class="track-payment-breakdown-row"><span>Payment${transaction.extra > .004 ? " (includes extra)" : ""}</span><strong>(${money.format(transaction.payment)})</strong></div><div class="track-payment-breakdown-row total"><span>New balance</span><strong>${money.format(transaction.newBalance)}</strong></div></div>
      <label class="track-payment-note">Custom note<textarea data-track-note placeholder="Add a custom note"></textarea></label>
      <label class="track-payment-multi"><span>Multiple transactions</span><input class="track-payment-switch" type="checkbox" data-track-multiple aria-label="Multiple transactions"></label>
      <button type="button" class="track-payment-complete" data-track-payment-complete>Mark complete</button>
      <p class="track-payment-disclaimer"><span>⚠</span><span>Estimates only. Always review and make payments according to your creditor's requirements.</span></p>
    </section>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", event => {
      if (event.target === overlay || event.target.closest("[data-track-payment-close]")) { overlay.remove(); return; }
      const complete = event.target.closest("[data-track-payment-complete]");
      if (!complete) return;
      const state = getState();
      if (!state) return;
      state.payments = Array.isArray(state.payments) ? state.payments : [];
      const existing = state.payments.some(payment => String(payment.debtId) === String(debt.id) && String(payment.date) === dateKey(transaction.date));
      const note = overlay.querySelector("[data-track-note]")?.value.trim() || "";
      if (!existing) {
        state.payments.push({ id:`payment-${Date.now()}`, debtId:debt.id, name:debt.name, date:dateKey(transaction.date), amount:transaction.payment, note });
        saveState(state);
      }
      complete.disabled = true;
      complete.textContent = existing ? "Already marked complete" : "Marked complete";
      if (!overlay.querySelector(".track-payment-confirm")) complete.insertAdjacentHTML("afterend", `<p class="track-payment-confirm">Saved in the Complete tab. Your current balance remains an estimate until you update it from your lender statement.</p>`);
      sourceRow?.classList.add("track-row-complete");
    });
  }

  function isTrackPage() {
    return screen.querySelector(".hero-title")?.textContent.trim() === "Tracking";
  }

  document.addEventListener("click", event => {
    if (!isTrackPage()) return;
    const row = event.target.closest('.track-row[data-act="detail"][data-id]');
    if (!row || !screen.contains(row)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    const state = getState();
    const debt = state?.debts?.find(item => String(item.id) === String(row.dataset.id));
    const date = readDate(row);
    if (!state || !debt || !date) return;
    const transactions = projectedTransactions(state)[String(debt.id)] || [];
    const transaction = transactions.find(item => dateKey(item.date) === dateKey(date));
    if (!transaction) return;
    openSheet(debt, transaction, row);
  }, true);
})();
