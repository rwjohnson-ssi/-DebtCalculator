(() => {
  "use strict";

  const STORE = "debt-calculator-v2";
  const MAX_MONTHS = 720;
  const $ = id => document.getElementById(id);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const num = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
  const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const colors = ["#ffcf5d", "#4cc6df", "#8467e8", "#60cd8a", "#ff9f66", "#f085b7", "#82aef5", "#b8cc6a", "#d8a1e8", "#93c7b1"];
  const nav = [
    ["home", "Home", "⌂"],
    ["debts", "Debts", "◔"],
    ["strategy", "Strategy", "✦"],
    ["plan", "Plan", "▤"],
    ["track", "Track", "✓"]
  ];

  const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  function nowMonth() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  function defaultState() {
    return {
      settings: { strategy: "snowball", extra: 0, start: nowMonth(), cycleDay: 1, customOrder: [], oneTime: [] },
      debts: [],
      payments: []
    };
  }
  function normalize(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;
    const settings = raw.settings || {};
    const debts = Array.isArray(raw.debts) ? raw.debts.map((item, index) => {
      const balance = Math.max(0, num(item.balance));
      return {
        id: String(item.id || uid()),
        name: String(item.name || "").trim(),
        type: String(item.type || "Other"),
        balance,
        originalBalance: Math.max(balance, num(item.originalBalance) || balance),
        apr: Math.max(0, Math.min(100, num(item.apr))),
        minimum: Math.max(0, num(item.minimum)),
        dueDay: Math.max(0, Math.min(31, Math.floor(num(item.dueDay)))),
        limit: Math.max(0, num(item.limit ?? item.creditLimit)),
        note: String(item.note || ""),
        createdAt: item.createdAt ?? index
      };
    }).filter(item => item.name) : [];
    const oneTime = Array.isArray(settings.oneTime) ? settings.oneTime.map(item => ({
      id: String(item.id || uid()),
      amount: Math.max(0, num(item.amount)),
      month: /^\d{4}-(0[1-9]|1[0-2])$/.test(item.month || "") ? item.month : base.settings.start,
      note: String(item.note || "")
    })).filter(item => item.amount > 0) : [];
    const payments = Array.isArray(raw.payments) ? raw.payments.map(item => ({
      id: String(item.id || uid()), debtId: String(item.debtId || ""), name: String(item.name || ""),
      amount: Math.max(0, num(item.amount)), date: String(item.date || new Date().toISOString().slice(0, 10)), note: String(item.note || "")
    })).filter(item => item.amount > 0) : [];
    return {
      settings: {
        strategy: ["snowball", "avalanche", "custom"].includes(settings.strategy) ? settings.strategy : "snowball",
        extra: Math.max(0, num(settings.extra)),
        start: /^\d{4}-(0[1-9]|1[0-2])$/.test(settings.start || settings.planStart || "") ? (settings.start || settings.planStart) : base.settings.start,
        cycleDay: Math.max(1, Math.min(28, Math.floor(num(settings.cycleDay)) || 1)),
        customOrder: Array.isArray(settings.customOrder) ? settings.customOrder.map(String) : [],
        oneTime
      }, debts, payments
    };
  }
  function load() { try { return normalize(JSON.parse(localStorage.getItem(STORE))); } catch { return defaultState(); } }

  let state = load();
  let ui = { page: "home", detailId: null, detailTab: "progress", breakdown: "debt", search: "", sort: "added" };

  function save(message) {
    localStorage.setItem(STORE, JSON.stringify(state));
    if (message) toast(message);
  }
  function toast(message) {
    document.querySelector(".toast")?.remove();
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2600);
  }

  function parseMonth(value) {
    const safe = /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "") ? value : nowMonth();
    const [year, month] = safe.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }
  function keyMonth(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
  function mLabel(date) { return date.toLocaleDateString("en-US", { month: "short", year: "numeric" }); }
  function dateLabel(date) { return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  function ordinal(value) {
    const ten = value % 10, hundred = value % 100;
    if (ten === 1 && hundred !== 11) return `${value}st`;
    if (ten === 2 && hundred !== 12) return `${value}nd`;
    if (ten === 3 && hundred !== 13) return `${value}rd`;
    return `${value}th`;
  }
  function countdown(date) {
    if (!date) return "Review plan";
    const days = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
    const years = Math.floor(days / 365);
    const months = Math.floor((days - years * 365) / 30);
    if (years) return `${years} yr ${months} mo`;
    if (months) return `${months} mo`;
    return `${days} days`;
  }
  function active() { return state.debts.filter(item => item.balance > .004); }
  function totalDebt() { return active().reduce((sum, item) => sum + item.balance, 0); }
  function minimums() { return active().reduce((sum, item) => sum + item.minimum, 0); }
  function oneTimeForMonth(month, list = state.settings.oneTime) { return list.filter(item => item.month === month).reduce((sum, item) => sum + item.amount, 0); }
  function prioritySort(items, strategy = state.settings.strategy, order = state.settings.customOrder) {
    const positions = new Map(order.map((id, index) => [id, index]));
    return [...items].sort((a, b) => {
      if (strategy === "avalanche") return b.apr - a.apr || a.balance - b.balance || a.name.localeCompare(b.name);
      if (strategy === "custom") return (positions.get(a.id) ?? 9999) - (positions.get(b.id) ?? 9999) || a.balance - b.balance;
      return a.balance - b.balance || b.apr - a.apr || a.name.localeCompare(b.name);
    });
  }
  function target() { return prioritySort(active())[0] || null; }

  function calculatePlan(options = {}) {
    const strategy = options.strategy ?? state.settings.strategy;
    const extra = Math.max(0, num(options.extra ?? state.settings.extra));
    const customOrder = options.customOrder ?? state.settings.customOrder;
    const oneTime = options.oneTime ?? state.settings.oneTime;
    const start = parseMonth(options.start ?? state.settings.start);
    const working = active().map(item => ({ ...item, balance: cents(item.balance) }));
    const budget = cents(minimums() + extra);
    const trails = Object.fromEntries(state.debts.map(item => [item.id, [{ date: start, balance: item.balance }]));
    const payoffs = {};
    const rows = [];
    let interestTotal = 0;
    let stalled = 0;

    if (!working.length) return { rows, trails, payoffs, budget, totalInterest: 0, failed: false };

    for (let index = 0; index < MAX_MONTHS; index++) {
      const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
      const openItems = working.filter(item => item.balance > .004);
      if (!openItems.length) break;
      const opening = cents(openItems.reduce((sum, item) => sum + item.balance, 0));
      let interest = 0;
      openItems.forEach(item => {
        const add = cents(item.balance * item.apr / 100 / 12);
        item.balance = cents(item.balance + add);
        interest = cents(interest + add);
      });
      let available = cents(budget + oneTimeForMonth(keyMonth(date), oneTime));
      openItems.forEach(item => {
        const payment = Math.min(item.minimum, item.balance, available);
        item.balance = cents(item.balance - payment);
        available = cents(available - payment);
      });
      let focus = "Minimum payments";
      while (available > .004) {
        const remaining = working.filter(item => item.balance > .004);
        if (!remaining.length) break;
        const pick = prioritySort(remaining, strategy, customOrder)[0];
        focus = pick.name;
        const payment = Math.min(pick.balance, available);
        pick.balance = cents(pick.balance - payment);
        available = cents(available - payment);
      }
      working.forEach(item => {
        if (item.balance <= .004) {
          item.balance = 0;
          if (!payoffs[item.id]) payoffs[item.id] = date;
        }
        trails[item.id].push({ date, balance: item.balance });
      });
      const closing = cents(working.reduce((sum, item) => sum + item.balance, 0));
      rows.push({ date, opening, interest, payment: cents(budget + oneTimeForMonth(keyMonth(date), oneTime) - available), closing, focus });
      interestTotal = cents(interestTotal + interest);
      stalled = closing >= opening - .004 ? stalled + 1 : 0;
      if (stalled >= 6 || budget <= .004) return { rows, trails, payoffs, budget, totalInterest: interestTotal, failed: true };
    }
    return { rows, trails, payoffs, budget, totalInterest: interestTotal, failed: working.some(item => item.balance > .004) };
  }

  function dueDate(debt) {
    const now = new Date();
    const day = Math.max(1, debt.dueDay || 1);
    const candidate = new Date(now.getFullYear(), now.getMonth(), Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
    if (candidate >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) return candidate;
    return new Date(now.getFullYear(), now.getMonth() + 1, Math.min(day, new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate()));
  }
  function dueDates(debt, count) {
    const dates = []; let next = dueDate(debt); const day = Math.max(1, debt.dueDay || 1);
    for (let index = 0; index < count; index++) {
      dates.push(new Date(next));
      next = new Date(next.getFullYear(), next.getMonth() + 1, Math.min(day, new Date(next.getFullYear(), next.getMonth() + 2, 0).getDate()));
    }
    return dates;
  }

  function tabbar() {
    $("tabbar").innerHTML = nav.map(([id, label, icon]) => `<button class="tab-btn ${ui.page === id ? "active" : ""}" data-act="nav" data-page="${id}"><span class="tab-icon">${icon}</span><span>${label}</span></button>`).join("");
  }
  function render(scroll = true) {
    const screen = $("screen");
    if (ui.page === "home") screen.innerHTML = homePage();
    if (ui.page === "debts") screen.innerHTML = debtsPage();
    if (ui.page === "strategy") screen.innerHTML = strategyPage();
    if (ui.page === "plan") screen.innerHTML = planPage();
    if (ui.page === "track") screen.innerHTML = trackPage();
    if (ui.page === "detail") screen.innerHTML = detailPage();
    tabbar();
    if (scroll) window.scrollTo({ top: 0, behavior: "instant" });
  }
  function hero(title, subtitle, action = "settings", icon = "⚙", detail = false) {
    return `<header class="mobile-hero ${detail ? "detail-hero" : ""}"><div class="hero-inner"><div class="hero-row"><div><h1 class="hero-title">${title}</h1><p class="hero-subtitle">${subtitle}</p></div><button class="icon-btn" data-act="${action}" aria-label="Open ${action}">${icon}</button></div></div></header>`;
  }
  function shell(content) { return `<div class="page-sheet"><div class="page-wrap">${content}</div></div>`; }
  function empty(title, copy, action = "add-debt", actionText = "Add your first debt") { return `<div class="empty"><span class="empty-icon">✦</span><h3>${title}</h3><p>${copy}</p><button class="btn" data-act="${action}">${actionText}</button></div>`; }

  function homePage() {
    const plan = calculatePlan();
    const last = plan.rows.at(-1);
    const focus = target();
    const next = active().sort((a, b) => dueDate(a) - dueDate(b))[0];
    return `<section class="app-page">${hero("Your plan", "A clear view of your debt-free path.")}${shell(`
      <section class="section">
        ${active().length ? `<div class="stats-grid one-wide"><article class="stat-tile featured"><div class="stat-label">Projected debt-free</div><span class="stat-value">${last && !plan.failed ? mLabel(last.date) : "Review plan"}</span><div class="stat-note">${last && !plan.failed ? `${countdown(last.date)} remaining` : "Increase funding or check payment amounts"}</div></article><div class="stats-grid"><article class="stat-tile"><div class="stat-label">Total debt</div><span class="stat-value">${money.format(totalDebt())}</span><div class="stat-note">${active().length} active</div></article><article class="stat-tile"><div class="stat-label">Monthly plan</div><span class="stat-value">${money.format(plan.budget)}</span><div class="stat-note">${money.format(state.settings.extra)} extra</div></article></div></div><div style="height:13px"></div><article class="focus-card"><p class="eyebrow">Focus this month</p><div class="focus-line"><div style="min-width:0"><div class="focus-name">${esc(focus?.name || "No focus debt")}</div><div class="focus-copy">${focus ? `${state.settings.strategy === "avalanche" ? "Highest APR" : state.settings.strategy === "custom" ? "Custom priority" : "Lowest balance"} · ${money.format(focus.balance)} remaining` : "Add an account to begin."}</div></div>${focus ? `<button class="btn slim" data-act="detail" data-id="${focus.id}">View</button>` : ""}</div></article>` : empty("Build your debt-free path", "Add a debt, then set your funding and payoff priority.")}
      </section>
      <section class="section"><h2 class="section-title">This month</h2><div class="stats-grid"><article class="stat-tile"><div class="stat-label">Minimums due</div><span class="stat-value">${money.format(minimums())}</span><div class="stat-note">${next ? `Next: ${esc(next.name)} on ${dateLabel(dueDate(next))}` : "No payments yet"}</div></article><article class="stat-tile"><div class="stat-label">Estimated interest</div><span class="stat-value">${money.format(plan.rows[0]?.interest || 0)}</span><div class="stat-note">Current balances</div></article></div></section>
      <section class="section"><h2 class="section-title">Quick actions</h2><div class="action-grid"><button class="btn" data-act="add-debt">＋ Add a debt</button><button class="btn secondary" data-act="record-payment" ${active().length ? "" : "disabled"}>Record payment</button><button class="btn secondary" data-act="nav" data-page="strategy">Adjust strategy</button><button class="btn secondary" data-act="nav" data-page="plan">View plan</button></div></section>
    `)}</section>`;
  }

  function breakdown() {
    const map = new Map();
    active().forEach(debt => { const key = ui.breakdown === "category" ? debt.type : debt.name; map.set(key, (map.get(key) || 0) + debt.balance); });
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }
  function gradient(items) {
    const total = items.reduce((sum, item) => sum + item.value, 0); if (!total) return "conic-gradient(#edf1f2 0deg 360deg)";
    let cursor = 0; return `conic-gradient(${items.map((item, index) => { const start = cursor; cursor += item.value / total * 360; return `${colors[index % colors.length]} ${start}deg ${Math.max(start + .8, cursor)}deg`; }).join(",")})`;
  }
  function filteredDebts() {
    let list = [...state.debts]; const query = ui.search.trim().toLowerCase();
    if (query) list = list.filter(item => `${item.name} ${item.type}`.toLowerCase().includes(query));
    if (ui.sort === "balance-asc") list.sort((a, b) => a.balance - b.balance);
    if (ui.sort === "balance-desc") list.sort((a, b) => b.balance - a.balance);
    if (ui.sort === "apr-desc") list.sort((a, b) => b.apr - a.apr);
    if (ui.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (ui.sort === "added") list.sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
    return list;
  }
  function debtCard(debt) {
    const isFocus = target()?.id === debt.id;
    return `<button class="debt-card" data-act="detail" data-id="${debt.id}"><div class="debt-top"><div class="debt-ident"><span class="debt-icon">${debt.type === "Credit Card" ? "▣" : debt.type === "Auto Loan" ? "⌁" : "◈"}</span><span class="debt-name">${esc(debt.name)}</span></div><span class="debt-arrow">›</span></div><div class="debt-values"><div><span class="label">Balance</span><span class="amount">${money.format(debt.balance)}</span></div><div><span class="label">Minimum</span><span class="mini">${money.format(debt.minimum)}</span></div><div><span class="label">APR</span><span class="mini">${debt.apr.toFixed(2)}%</span></div></div>${isFocus ? `<div style="margin:11px 0 0 42px"><span class="badge gold">Current focus</span></div>` : ""}</button>`;
  }
  function debtsPage() {
    const items = breakdown(); const total = items.reduce((sum, item) => sum + item.value, 0); const debts = filteredDebts();
    return `<section class="app-page">${hero("Debts", "Manage every account in one place.", "add-debt", "＋")}${shell(`
      <section class="section"><div class="mode-toggle"><button class="${ui.breakdown === "category" ? "active" : ""}" data-act="breakdown" data-mode="category">By category</button><button class="${ui.breakdown === "debt" ? "active" : ""}" data-act="breakdown" data-mode="debt">By debt</button></div><h2 class="section-title" style="margin-top:18px">${ui.breakdown === "category" ? "Balance by category" : "Balance by debt"}</h2>${items.length ? `<div class="donut-layout"><div class="donut-holder"><div class="donut" style="background:${gradient(items)}"><div class="donut-core"><div><strong>${money.format(total)}</strong><span>${active().length} active debts</span></div></div></div></div><div class="legend">${items.map((item, index) => `<div class="legend-row"><span class="legend-label"><span class="legend-dot" style="background:${colors[index % colors.length]}"></span><span class="legend-name">${esc(item.label)}</span></span><span class="legend-amount">${money.format(item.value)}</span></div>`).join("")}</div></div>` : empty("No debt data", "Add an account to see your balance breakdown.")}</section>
      <section class="section"><div class="section-head"><h2 class="section-title" style="margin:0">Debts (${state.debts.length})</h2><button class="pill-add" data-act="add-debt"><span>＋</span>Add</button></div><div class="search-row"><label class="search-field"><span style="font-size:1.45rem">⌕</span><input id="debt-search" type="search" placeholder="Search" value="${esc(ui.search)}"></label><select id="debt-sort" class="sort-field"><option value="added" ${ui.sort === "added" ? "selected" : ""}>As added</option><option value="balance-asc" ${ui.sort === "balance-asc" ? "selected" : ""}>Low balance</option><option value="balance-desc" ${ui.sort === "balance-desc" ? "selected" : ""}>High balance</option><option value="apr-desc" ${ui.sort === "apr-desc" ? "selected" : ""}>High APR</option><option value="name" ${ui.sort === "name" ? "selected" : ""}>A–Z</option></select></div><div class="debt-list">${debts.length ? debts.map(debtCard).join("") : empty("No matching debts", "Try another search or clear the filter.", "clear-search", "Clear search")}</div></section>
    `)}</section>`;
  }

  function strategyPage() {
    const plan = calculatePlan(); const items = [...state.settings.oneTime].sort((a, b) => a.month.localeCompare(b.month));
    const name = { snowball: "Debt Snowball", avalanche: "Debt Avalanche", custom: "Custom order" }[state.settings.strategy];
    const last = plan.rows.at(-1);
    return `<section class="app-page">${hero("Strategy", "Optimize your payoff plan.")}${shell(`
      <section class="section"><article class="strategy-panel"><div class="strategy-title"><span class="ico">⟳</span>Recurring funding</div><p class="strategy-copy">Amount available for making payments each cycle.</p><p class="form-caption">FREQUENCY</p><button class="funding-row actionable" data-act="cycle"><span class="left">Once per month</span><span class="right">On the ${ordinal(state.settings.cycleDay)} <span class="row-chev">›</span></span></button><p class="form-caption" style="margin-top:21px">AMOUNT</p><div class="funding-rows"><div class="funding-row"><span class="left">Minimum</span><span class="right">${money.format(minimums())}</span></div><button class="funding-row actionable" data-act="extra-sheet"><span class="left">Extra</span><span class="right">${money.format(state.settings.extra)} <span class="row-chev">›</span></span></button><div class="funding-row funding-total"><span class="left">Total</span><span class="right">${money.format(plan.budget)}</span></div></div><button class="impact-strip" data-act="extra-sheet"><span>${last && !plan.failed ? `Debt-free ${mLabel(last.date)}` : "See funding impact"}</span><strong>View comparison ›</strong></button></article></section>
      <section class="section"><article class="strategy-panel"><div class="strategy-title"><span class="ico">▣</span>One-time fundings</div><p class="strategy-copy">Bonus amounts added to your payoff plan on a selected month.</p>${items.length ? `<div class="funding-rows">${items.map(item => `<button class="funding-row actionable" data-act="one-time" data-id="${item.id}"><span class="left">${mLabel(parseMonth(item.month))}${item.note ? ` · ${esc(item.note)}` : ""}</span><span class="right">${money.format(item.amount)} <span class="row-chev">›</span></span></button>`).join("")}</div>` : `<button class="funding-row actionable" data-act="one-time"><span class="left">0 upcoming fundings</span><span class="right"><span class="row-chev">›</span></span></button>`}<div style="margin-top:14px"><button class="btn secondary slim" data-act="one-time">＋ Add one-time funding</button></div></article></section>
      <section class="section"><article class="strategy-panel"><div class="strategy-title"><span class="ico">⚖</span>Extra payment priority</div><p class="strategy-copy">Choose which debts receive extra payments first.</p><button class="funding-row actionable" data-act="priority"><span class="left">${name}</span><span class="right"><span class="row-chev">›</span></span></button></article></section>
    `)}</section>`;
  }

  function planPage() {
    const plan = calculatePlan(); const last = plan.rows.at(-1);
    const payoffList = active().map(debt => ({ debt, date: plan.payoffs[debt.id] })).sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
    const next = payoffList[0]; const payments = cents(plan.rows.reduce((sum, row) => sum + row.payment, 0));
    return `<section class="app-page">${hero("Payoff Plan", "Your step-by-step path to a debt-free future.")}${shell(`
      <section class="section"><h2 class="section-title">Plan summary</h2>${active().length ? `<div class="plan-summary"><article class="plan-summary-card"><div class="summary-icon">🏆</div><div><span class="summary-key">Payoff</span><span class="summary-caption">Next debt</span></div><div class="summary-number">${next?.date ? countdown(next.date) : "—"}</div></article><article class="plan-summary-card gold"><div class="summary-icon">🗓</div><div><span class="summary-key">Interest</span><span class="summary-caption">Estimated total</span></div><div class="summary-number">${money.format(plan.totalInterest)}</div></article><article class="plan-summary-card blue"><div class="summary-icon">💧</div><div><span class="summary-key">Payments</span><span class="summary-caption">Planned total</span></div><div class="summary-number">${money.format(payments)}</div></article></div>` : empty("Your payoff plan starts here", "Add debts and a monthly funding amount to build your schedule.")}</section>
      <section class="section"><div class="section-head"><h2 class="section-title" style="margin:0">Step-by-step payoff plan</h2><button class="pill-add" data-act="schedule">Tables</button></div>${payoffList.map((entry, index) => `<button class="payoff-step" data-act="detail" data-id="${entry.debt.id}"><div class="step-top"><div class="step-mark">STEP ${index + 1}<small>${payoffList.length - index} to go</small></div><div class="step-date">${entry.date ? `Completes on <strong>${dateLabel(entry.date)}</strong><br><span class="text-muted">${countdown(entry.date)}</span>` : `<strong>Review plan</strong>`}</div></div><div class="step-bottom"><span><strong>${esc(entry.debt.name)} payoff</strong> ${target()?.id === entry.debt.id ? '<span class="badge">Current focus</span>' : '<span class="badge gold">Minimum</span>'}</span><span class="row-chev">›</span></div></button>`).join("")}${plan.failed && active().length ? `<article class="card flat card-pad" style="border-color:#ffd4cf;background:#fff7f5"><strong style="color:#ae453a">This plan needs more monthly funding.</strong><p class="section-note">Increase the extra amount or confirm your required minimum payments.</p><button class="btn slim" data-act="extra-sheet">Update extra payment</button></article>` : ""}</section>
    `)}</section>`;
  }

  function trackPage() {
    const scheduled = active().map(debt => ({ debt, date: dueDate(debt) })).sort((a, b) => a.date - b.date);
    const history = [...state.payments].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return `<section class="app-page">${hero("Track", "Stay ahead of upcoming payments.", "record-payment", "＋")}${shell(`
      <section class="section"><div class="section-head"><h2 class="section-title" style="margin:0">Upcoming payments</h2><button class="btn secondary slim" data-act="record-payment">Record</button></div>${scheduled.length ? `<article class="card flat tracker-card">${scheduled.slice(0, 12).map(item => `<button class="transaction-row" data-act="detail" data-id="${item.debt.id}"><span class="trans-icon">▣</span><span style="min-width:0"><span class="trans-name">${esc(item.debt.name)}</span><span class="trans-sub">${dateLabel(item.date)} · Minimum</span></span><span class="trans-amount">${money.format(item.debt.minimum)}</span></button>`).join("")}</article>` : empty("No upcoming payments", "Add debts to build a payment calendar.")}</section>
      <section class="section"><h2 class="section-title">Recent activity</h2><article class="card flat tracker-card">${history.length ? history.slice(0, 24).map(item => `<div class="transaction-row"><span class="trans-icon">✓</span><span style="min-width:0"><span class="trans-name">${esc(item.name || "Payment")}</span><span class="trans-sub">${formatDate(item.date)}${item.note ? ` · ${esc(item.note)}` : ""}</span></span><span class="trans-amount">${money.format(item.amount)}</span></div>`).join("") : `<div class="empty"><span class="empty-icon">◌</span><h3>No payments recorded</h3><p>Use Record when you make a payment.</p></div>`}</article></section>
    `)}</section>`;
  }

  function detailPage() {
    const debt = state.debts.find(item => item.id === ui.detailId);
    if (!debt) { ui.page = "debts"; return debtsPage(); }
    const plan = calculatePlan(); const payoff = plan.payoffs[debt.id]; const trail = plan.trails[debt.id] || []; const paid = Math.max(0, debt.originalBalance - debt.balance); const pct = debt.originalBalance ? Math.min(100, paid / debt.originalBalance * 100) : 0;
    let content = "";
    if (ui.detailTab === "progress") content = detailProgress(debt, payoff, trail, paid, pct);
    if (ui.detailTab === "transactions") content = detailTransactions(debt);
    if (ui.detailTab === "details") content = detailDetails(debt);
    return `<section class="app-page"><header class="mobile-hero detail-hero"><button class="back-btn" data-act="back-debts">‹</button><div class="hero-inner"><div class="detail-title">${esc(debt.name)}</div><div class="hero-tabs"><button class="${ui.detailTab === "progress" ? "active" : ""}" data-act="detail-tab" data-tab="progress">Progress</button><button class="${ui.detailTab === "transactions" ? "active" : ""}" data-act="detail-tab" data-tab="transactions">Transactions</button><button class="${ui.detailTab === "details" ? "active" : ""}" data-act="detail-tab" data-tab="details">Details</button></div></div></header><div class="page-sheet"><div class="page-wrap detail-inner">${content}</div></div></section>`;
  }
  function detailProgress(debt, payoff, trail, paid, pct) {
    return `<section class="section"><div class="detail-date"><div class="label">▦ DEBT PAYOFF DATE</div><div class="value">${payoff ? dateLabel(payoff) : "Review plan"}</div><div class="note">${payoff ? `in ${countdown(payoff)}` : "Increase funding to estimate payoff"}</div></div></section><section class="section"><h2 class="section-title">Payoff progress</h2><div class="progress-grid"><div class="progress-ring" style="background:conic-gradient(#f7c449 ${pct * 3.6}deg,#ffeed0 0deg)"><div class="progress-ring-content"><strong>${pct.toFixed(1)}%</strong><span>paid</span></div></div><div class="progress-facts"><div><div class="progress-label">Principal paid</div><div class="progress-green">${money.format(paid)}</div></div><div><div class="progress-label">Balance</div><div class="progress-red">${money.format(debt.balance)}</div></div></div></div></section><section class="section"><h2 class="section-title">Payoff timeline</h2><p class="chart-kicker">Ending balance</p>${lineChart(trail, debt.originalBalance || debt.balance)}</section><section class="section"><div class="action-grid"><button class="btn" data-act="record-payment" data-id="${debt.id}">Record payment</button><button class="btn secondary" data-act="edit-debt" data-id="${debt.id}">Edit debt</button></div></section>`;
  }
  function detailTransactions(debt) {
    const dates = dueDates(debt, 8); const history = state.payments.filter(item => item.debtId === debt.id || item.name === debt.name).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return `<section class="section"><div class="section-head"><h2 class="section-title" style="margin:0">Upcoming</h2><button class="btn secondary slim" data-act="record-payment" data-id="${debt.id}">Record</button></div><article class="card flat tracker-card">${dates.map(date => `<div class="transaction-row"><span class="trans-icon">▣</span><span><span class="trans-name">${dateLabel(date)}</span><span class="trans-sub">Minimum payment</span></span><span class="trans-amount">${money.format(debt.minimum)}</span></div>`).join("")}</article></section><section class="section"><h2 class="section-title">Past payments</h2><article class="card flat tracker-card">${history.length ? history.map(item => `<div class="transaction-row"><span class="trans-icon">✓</span><span><span class="trans-name">${formatDate(item.date)}</span><span class="trans-sub">${esc(item.note || "Payment recorded")}</span></span><span class="trans-amount">${money.format(item.amount)}</span></div>`).join("") : `<div class="empty"><span class="empty-icon">◌</span><h3>No payments recorded</h3><p>Payments you record will appear here.</p></div>`}</article></section>`;
  }
  function detailDetails(debt) {
    return `<section class="section"><div class="details-list"><div class="detail-row"><span class="label">Category</span><span class="value">${esc(debt.type)}</span></div><div class="detail-row"><span class="label">Nickname</span><span class="value">${esc(debt.name)}</span></div><div class="detail-row"><span class="label">Custom note</span><span class="value">${esc(debt.note || "No note")}</span></div></div></section><section class="section"><h2 class="section-title">Terms</h2><div class="details-list"><div class="detail-row"><span class="label">Current balance</span><span class="value">${money.format(debt.balance)}</span></div><div class="detail-row"><span class="label">Annual Percentage Rate</span><span class="value">${debt.apr.toFixed(2)}%</span></div><div class="detail-row"><span class="label">Credit limit</span><span class="value">${debt.limit ? money.format(debt.limit) : "Not set"}</span></div></div></section><section class="section"><h2 class="section-title">Payment details</h2><div class="details-list"><div class="detail-row"><span class="label">Minimum payment</span><span class="value">${money.format(debt.minimum)}</span></div><div class="detail-row"><span class="label">Frequency</span><span class="value">Once per month</span></div><div class="detail-row"><span class="label">Day of the month</span><span class="value">${debt.dueDay || "Not set"}</span></div><div class="detail-row"><span class="label">Next payment due</span><span class="value">${dateLabel(dueDate(debt))}</span></div></div></section><section class="section"><div class="action-grid"><button class="btn" data-act="edit-debt" data-id="${debt.id}">Edit details</button><button class="btn danger" data-act="delete-debt" data-id="${debt.id}">Delete debt</button></div></section>`;
  }

  function lineChart(series, maxValue) {
    const data = reduceSeries(series, 30); const width = 340, height = 188, left = 46, right = 10, top = 11, bottom = 31, cw = width - left - right, ch = height - top - bottom; const max = Math.max(1, maxValue, ...data.map(item => item.balance));
    const points = data.map((item, index) => ({ x: left + (data.length <= 1 ? 0 : index / (data.length - 1) * cw), y: top + (1 - item.balance / max) * ch, item }));
    const path = points.map((p, index) => `${index ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" "); const area = `${path} L ${(points.at(-1)?.x || left).toFixed(1)} ${height - bottom} L ${(points[0]?.x || left).toFixed(1)} ${height - bottom} Z`;
    const labels = [points[0], points[Math.floor((points.length - 1) / 2)], points.at(-1)].filter(Boolean);
    return `<svg class="balance-chart" viewBox="0 0 ${width} ${height}" aria-label="Projected balance chart"><defs><linearGradient id="linefill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffd470" stop-opacity=".58"/><stop offset="1" stop-color="#fff8e9" stop-opacity=".08"/></linearGradient></defs><line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}" stroke="#2861d5" stroke-width="1.15"/><line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" stroke="#aab3b5" stroke-width="1"/>${[0,.25,.5,.75,1].map(r => { const y = top + r * ch, value = max * (1-r); return `<g><line x1="${left-4}" x2="${left}" y1="${y}" y2="${y}" stroke="#95a0a4"/><text x="${left-7}" y="${y+3.5}" text-anchor="end" font-size="8.4" fill="#6c787d">${money.format(value)}</text></g>`; }).join("")}<path d="${area}" fill="url(#linefill)"/><path d="${path}" fill="none" stroke="#efb31b" stroke-width="2.3"/>${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="2.55" fill="#fff" stroke="#efb31b" stroke-width="1.25"/>`).join("")}${labels.map(p => `<text x="${p.x}" y="${height-8}" text-anchor="middle" font-size="8.2" fill="#657177">${mLabel(p.item.date)}</text>`).join("")}</svg>`;
  }
  function reduceSeries(series, max) { if (series.length <= max) return series; const step = Math.ceil(series.length / max); return series.filter((_, index) => index % step === 0 || index === series.length - 1); }
  function formatDate(value) { const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(`${value}T12:00:00`) : new Date(value); return Number.isNaN(date) ? String(value) : dateLabel(date); }

  function sheet(content, className = "") { $("modal-root").innerHTML = `<div class="modal-backdrop" data-act="close-sheet"><div class="sheet ${className}" onclick="event.stopPropagation()">${content}</div></div>`; }
  function closeSheet() { $("modal-root").innerHTML = ""; }
  function sheetHead(title) { return `<div class="sheet-head"><h2>${title}</h2><button class="sheet-close" data-act="close-sheet">×</button></div>`; }

  function debtSheet(id = "") {
    const debt = state.debts.find(item => item.id === id); const d = debt || { name: "", type: "Credit Card", balance: "", apr: "", minimum: "", dueDay: "", limit: "", note: "" };
    sheet(`${sheetHead(debt ? "Edit debt" : "Add a debt")}<form id="debt-form" data-id="${debt?.id || ""}"><div class="form-grid"><label class="field">Lender / account name<input name="name" maxlength="80" required value="${esc(d.name)}" placeholder="Example: Bank of America"></label><label class="field">Category<select name="type">${["Credit Card","Auto Loan","Personal Loan","Student Loan","Medical","Mortgage","Other"].map(type => `<option ${d.type === type ? "selected" : ""}>${type}</option>`).join("")}</select></label><div class="form-grid two"><label class="field">Current balance<input name="balance" type="number" min="0" step=".01" inputmode="decimal" required value="${d.balance}" placeholder="0.00"></label><label class="field">APR (%)<input name="apr" type="number" min="0" max="100" step=".01" inputmode="decimal" required value="${d.apr}" placeholder="0.00"></label></div><div class="form-grid two"><label class="field">Minimum payment<input name="minimum" type="number" min="0" step=".01" inputmode="decimal" required value="${d.minimum}" placeholder="0.00"></label><label class="field">Due day<input name="dueDay" type="number" min="1" max="31" inputmode="numeric" value="${d.dueDay || ""}" placeholder="1–31"></label></div><label class="field">Credit limit <span style="font-weight:500;color:#9aa5a9">optional</span><input name="limit" type="number" min="0" step=".01" inputmode="decimal" value="${d.limit || ""}" placeholder="0.00"></label><label class="field">Custom note <span style="font-weight:500;color:#9aa5a9">optional</span><textarea name="note" placeholder="Add a reminder">${esc(d.note)}</textarea></label></div><div class="sheet-actions">${debt ? `<button type="button" class="btn danger" data-act="delete-debt" data-id="${debt.id}">Delete</button>` : ""}<button class="btn" type="submit">${debt ? "Save changes" : "Add debt"}</button></div></form>`);
  }
  function paymentSheet(id = "") {
    const selected = state.debts.find(item => item.id === id) || target() || active()[0]; if (!selected) return toast("Add a debt before recording a payment.");
    sheet(`${sheetHead("Record payment")}<form id="payment-form"><div class="form-grid"><label class="field">Debt<select name="debtId">${active().map(item => `<option value="${item.id}" ${item.id === selected.id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label><div class="form-grid two"><label class="field">Payment amount<input name="amount" type="number" min=".01" step=".01" inputmode="decimal" required value="${selected.minimum ? selected.minimum.toFixed(2) : ""}"></label><label class="field">Payment date<input name="date" type="date" required value="${new Date().toISOString().slice(0,10)}"></label></div><label class="field">Note <span style="font-weight:500;color:#9aa5a9">optional</span><input name="note" maxlength="100" placeholder="Example: July minimum payment"></label></div><div class="sheet-actions"><button class="btn" type="submit">Save payment</button></div></form>`);
  }
  function cycleSheet() { sheet(`${sheetHead("Monthly funding schedule")}<form id="cycle-form"><label class="field">Day of month you fund payments<select name="cycleDay">${Array.from({length:28}, (_, i) => i+1).map(day => `<option value="${day}" ${day === state.settings.cycleDay ? "selected" : ""}>${ordinal(day)} of each month</option>`).join("")}</select></label><div class="sheet-actions"><button class="btn" type="submit">Save schedule</button></div></form>`); }
  function oneTimeSheet(id = "") { const item = state.settings.oneTime.find(entry => entry.id === id); const d = item || { amount: "", month: state.settings.start, note: "" }; sheet(`${sheetHead(item ? "Edit one-time funding" : "Add one-time funding")}<form id="one-time-form" data-id="${item?.id || ""}"><div class="form-grid"><div class="form-grid two"><label class="field">Amount<input name="amount" type="number" min=".01" step=".01" inputmode="decimal" required value="${d.amount}" placeholder="0.00"></label><label class="field">Month<input name="month" type="month" required value="${d.month}"></label></div><label class="field">Note <span style="font-weight:500;color:#9aa5a9">optional</span><input name="note" maxlength="100" value="${esc(d.note)}" placeholder="Example: tax refund"></label></div><div class="sheet-actions">${item ? `<button type="button" class="btn danger" data-act="delete-one-time" data-id="${item.id}">Delete</button>` : ""}<button class="btn" type="submit">Save funding</button></div></form>`); }

  function impactData(extra) {
    const baseline = calculatePlan({ extra: 0 }); const preview = calculatePlan({ extra }); const baseLast = baseline.rows.at(-1); const currentLast = preview.rows.at(-1); const accelerated = Math.max(0, baseline.rows.length - preview.rows.length); const saved = Math.max(0, baseline.totalInterest - preview.totalInterest);
    return { baseline, preview, baseLast, currentLast, accelerated, saved };
  }
  function extraSheet(value = state.settings.extra) {
    const extra = Math.max(0, num(value)); const info = impactData(extra); const max = Math.max(100, Math.ceil(Math.max(extra, state.settings.extra, minimums() * 2, totalDebt() / 12) / 25) * 25);
    sheet(`${sheetHead("Recurring funding for extra payments")}<div id="extra-sheet-content" data-max="${max}">${extraSheetContent(extra, info, max)}</div>`);
  }
  function extraSheetContent(extra, info, max) {
    const future = info.currentLast && !info.preview.failed ? mLabel(info.currentLast.date) : "Review plan";
    return `<div class="scenario-grid"><div class="scenario-stat"><div class="label">Debt-free date</div><div class="value">${future}</div><div class="small">${info.currentLast && !info.preview.failed ? countdown(info.currentLast.date) : "Increase funding"}</div></div><div class="scenario-stat"><div class="label">Payoff accelerated</div><div class="value dark">${info.accelerated ? `${info.accelerated} mo` : "—"}</div><div class="small">Compared with minimums only</div></div><div class="scenario-stat"><div class="label">Interest saved</div><div class="value dark">${money.format(info.saved)}</div><div class="small">Estimated savings</div></div><div class="scenario-stat"><div class="label">Monthly extra</div><div class="value">${money.format(extra)}</div><div class="small">Applied to your priority debt</div></div></div><div class="scenario-chart-wrap"><p class="scenario-chart-title">Total balance</p>${scenarioChart(info.baseline, info.preview)}<div class="scenario-legend"><span><i class="legend-line gray"></i>Minimum payments</span><span><i class="legend-line"></i>With extra funding</span></div></div><div class="slider-row"><input id="extra-slider" class="range" type="range" min="0" max="${max}" step="25" value="${Math.min(max, extra)}"><div class="range-labels"><span>$0</span><span>${money.format(max)} / month</span></div></div><div class="extra-input-row"><label for="extra-amount">Extra monthly payment</label><input id="extra-amount" class="extra-input" type="number" inputmode="decimal" min="0" step="1" value="${extra}"></div><div class="sheet-actions"><button class="btn full" data-act="save-extra">Save extra payment</button></div>`;
  }
  function scenarioChart(baseline, preview) {
    const start = parseMonth(state.settings.start); const base = [{ date: start, balance: totalDebt() }, ...baseline.rows.map(row => ({ date: row.date, balance: row.closing }))]; const current = [{ date: start, balance: totalDebt() }, ...preview.rows.map(row => ({ date: row.date, balance: row.closing }))]; const width=340,height=180,left=42,right=8,top=10,bottom=29,cw=width-left-right,ch=height-top-bottom; const max=Math.max(1,totalDebt(),...base.map(p=>p.balance),...current.map(p=>p.balance)); const len=Math.max(base.length,current.length); const coords=series=>reduceSeries(series,40).map(item=>({x:left+(Math.max(0,(item.date-start)/(1000*60*60*24*30))/Math.max(1,len-1))*cw,y:top+(1-item.balance/max)*ch,item})); const a=coords(base),b=coords(current); const path=points=>points.map((p,i)=>`${i?"L":"M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" "); const area=points=>`${path(points)} L ${(points.at(-1)?.x||left).toFixed(1)} ${height-bottom} L ${(points[0]?.x||left).toFixed(1)} ${height-bottom} Z`; const labels=[b[0],b[Math.floor((b.length-1)/2)],b.at(-1)].filter(Boolean); return `<svg class="scenario-chart" viewBox="0 0 ${width} ${height}" aria-label="Minimum payment and extra payment balance comparison"><defs><linearGradient id="scenarioFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#7ad8e9" stop-opacity=".5"/><stop offset="1" stop-color="#dffbff" stop-opacity=".1"/></linearGradient></defs><line x1="${left}" x2="${left}" y1="${top}" y2="${height-bottom}" stroke="#96a2a6"/><line x1="${left}" x2="${width-right}" y1="${height-bottom}" y2="${height-bottom}" stroke="#aab2b5"/>${[0,.5,1].map(r=>{const y=top+r*ch;return `<text x="${left-6}" y="${y+3}" text-anchor="end" font-size="8" fill="#6e7a7f">${money.format(max*(1-r))}</text>`}).join("")}<path d="${area(a)}" fill="#d7d8d9" opacity=".6"/><path d="${path(a)}" fill="none" stroke="#bfc1c3" stroke-width="2"/><path d="${area(b)}" fill="url(#scenarioFill)"/><path d="${path(b)}" fill="none" stroke="#4bc9e0" stroke-width="2.5"/>${labels.map(p=>`<text x="${p.x}" y="${height-8}" text-anchor="middle" font-size="8" fill="#6d797e">${mLabel(p.item.date)}</text>`).join("")}</svg>`;
  }
  function refreshExtraSheet(value) { const root = $("extra-sheet-content"); if (!root) return; const max = Math.max(num(root.dataset.max), Math.ceil(Math.max(value, minimums()*2, totalDebt()/12) / 25) * 25); root.dataset.max = max; root.innerHTML = extraSheetContent(Math.max(0,num(value)), impactData(Math.max(0,num(value))), max); }

  function prioritySheet() {
    const current = state.settings.strategy;
    sheet(`${sheetHead("Select an extra-payment priority")}<div class="choice-list"><button class="choice ${current === "avalanche" ? "selected" : ""}" data-act="strategy" data-strategy="avalanche"><span class="choice-icon">▦</span><span><strong>Debt Avalanche</strong><small>Prioritize the highest interest rate first.</small></span><span class="choice-status">${current === "avalanche" ? "Selected" : "Select"}</span></button><button class="choice ${current === "snowball" ? "selected" : ""}" data-act="strategy" data-strategy="snowball"><span class="choice-icon">◎</span><span><strong>Debt Snowball</strong><small>Prioritize the lowest balance first.</small></span><span class="choice-status">${current === "snowball" ? "Selected" : "Select"}</span></button><button class="choice ${current === "custom" ? "selected" : ""}" data-act="custom-priority"><span class="choice-icon">☷</span><span><strong>Custom order</strong><small>Set the payoff sequence yourself.</small></span><span class="choice-status">${current === "custom" ? "Selected" : "Select"}</span></button></div>`);
  }
  function customPrioritySheet() {
    const order = prioritySort(active(), "custom", state.settings.customOrder);
    sheet(`${sheetHead("Custom payoff order")}<p class="section-note" style="margin-top:-8px">Use arrows to move debts higher or lower in the extra-payment sequence.</p><div class="choice-list">${order.map((item,index)=>`<div class="choice"><span class="choice-icon" style="font-size:1rem">${index+1}</span><span><strong>${esc(item.name)}</strong><small>${money.format(item.balance)} · ${item.apr.toFixed(2)}% APR</small></span><span style="display:flex;gap:4px"><button class="btn secondary slim" data-act="order-up" data-id="${item.id}" ${index===0?"disabled":""}>↑</button><button class="btn secondary slim" data-act="order-down" data-id="${item.id}" ${index===order.length-1?"disabled":""}>↓</button></span></div>`).join("")}</div><div class="sheet-actions"><button class="btn" data-act="use-custom">Use custom order</button></div>`);
  }
  function settingsSheet() { sheet(`${sheetHead("App settings")}<div class="funding-rows"><button class="funding-row actionable" data-act="export"><span class="left">Export backup</span><span class="right">JSON file <span class="row-chev">›</span></span></button><button class="funding-row actionable" data-act="import"><span class="left">Import backup</span><span class="right"><span class="row-chev">›</span></span></button><button class="funding-row actionable" data-act="sample"><span class="left">Load sample data</span><span class="right"><span class="row-chev">›</span></span></button><button class="funding-row actionable" data-act="clear"><span class="left" style="color:#bd4337">Delete all local data</span><span class="right"><span class="row-chev">›</span></span></button></div><p class="section-note">DebtWizard stores your information in this browser. Export a backup after meaningful updates.</p>`); }
  function scheduleSheet() { const plan = calculatePlan(); sheet(`${sheetHead("Monthly payoff table")}<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:.82rem"><thead><tr style="text-align:left;color:#718187;border-bottom:1px solid #e7ecee"><th style="padding:8px 4px">Month</th><th style="padding:8px 4px;text-align:right">Interest</th><th style="padding:8px 4px;text-align:right">Payment</th><th style="padding:8px 4px;text-align:right">Balance</th></tr></thead><tbody>${plan.rows.slice(0,60).map(row=>`<tr style="border-bottom:1px solid #f0f2f3"><td style="padding:9px 4px">${mLabel(row.date)}</td><td style="padding:9px 4px;text-align:right">${money.format(row.interest)}</td><td style="padding:9px 4px;text-align:right">${money.format(row.payment)}</td><td style="padding:9px 4px;text-align:right">${money.format(row.closing)}</td></tr>`).join("")||`<tr><td colspan="4" style="padding:15px">Add debts to create a schedule.</td></tr>`}</tbody></table></div>`); }

  function exportBackup() { const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString(), app: "DebtWizard" }, null, 2)], { type:"application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `debtwizard-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href); closeSheet(); toast("Backup downloaded."); }
  function loadSample() { if (state.debts.length && !confirm("Replace your current browser data with fictional sample debts? Export a backup first if you want to keep your data.")) return; state = normalize({ settings:{strategy:"snowball",extra:150,start:nowMonth(),cycleDay:1}, debts:[{id:uid(),name:"Store Card",type:"Credit Card",balance:850,originalBalance:850,apr:29.99,minimum:45,dueDay:12,limit:1200,note:""},{id:uid(),name:"Everyday Card",type:"Credit Card",balance:3200,originalBalance:3200,apr:21.99,minimum:105,dueDay:24,limit:4500,note:""},{id:uid(),name:"Auto Loan",type:"Auto Loan",balance:9600,originalBalance:9600,apr:6.25,minimum:295,dueDay:5,limit:0,note:""}], payments:[] }); save("Sample debts loaded."); closeSheet(); ui.page="home"; render(); }
  function deleteDebt(id) { const debt=state.debts.find(item=>item.id===id); if(!debt||!confirm(`Delete ${debt.name}? This removes the account from this browser.`)) return; state.debts=state.debts.filter(item=>item.id!==id); state.settings.customOrder=state.settings.customOrder.filter(item=>item!==id); save("Debt deleted."); closeSheet(); ui.page="debts"; ui.detailId=null; render(); }

  function click(event) {
    const button = event.target.closest("[data-act]"); if (!button) return; const act = button.dataset.act, id = button.dataset.id;
    if (act === "nav") { ui.page=button.dataset.page; ui.detailId=null; closeSheet(); render(); }
    if (act === "add-debt") debtSheet();
    if (act === "edit-debt") debtSheet(id);
    if (act === "detail" && id) { ui.page="detail"; ui.detailId=id; ui.detailTab="progress"; closeSheet(); render(); }
    if (act === "back-debts") { ui.page="debts"; ui.detailId=null; render(); }
    if (act === "detail-tab") { ui.detailTab=button.dataset.tab; render(); }
    if (act === "breakdown") { ui.breakdown=button.dataset.mode; render(); }
    if (act === "clear-search") { ui.search=""; render(); }
    if (act === "record-payment") paymentSheet(id);
    if (act === "cycle") cycleSheet();
    if (act === "extra-sheet") extraSheet();
    if (act === "save-extra") { const value=num($("extra-amount")?.value); state.settings.extra=Math.max(0,value); save("Extra payment updated."); closeSheet(); render(); }
    if (act === "one-time") oneTimeSheet(id);
    if (act === "delete-one-time") { state.settings.oneTime=state.settings.oneTime.filter(item=>item.id!==id); save("One-time funding deleted."); closeSheet(); render(); }
    if (act === "priority") prioritySheet();
    if (act === "strategy") { state.settings.strategy=button.dataset.strategy; save(`${button.dataset.strategy === "avalanche" ? "Debt Avalanche" : "Debt Snowball"} selected.`); closeSheet(); render(); }
    if (act === "custom-priority") customPrioritySheet();
    if (act === "order-up" || act === "order-down") { const order=prioritySort(active(),"custom",state.settings.customOrder); const index=order.findIndex(item=>item.id===id); const to=index+(act==="order-up"?-1:1); if(index>=0&&to>=0&&to<order.length){[order[index],order[to]]=[order[to],order[index]]; state.settings.customOrder=order.map(item=>item.id); customPrioritySheet();} }
    if (act === "use-custom") { state.settings.strategy="custom"; save("Custom payoff order selected."); closeSheet(); render(); }
    if (act === "settings") settingsSheet();
    if (act === "schedule") scheduleSheet();
    if (act === "close-sheet") closeSheet();
    if (act === "export") exportBackup();
    if (act === "import") $("backup-input").click();
    if (act === "sample") loadSample();
    if (act === "clear") { if(confirm("Delete all debts, payment history, and settings saved in this browser? This cannot be undone without a backup.")){state=defaultState();save("All local data deleted.");closeSheet();ui.page="home";render();} }
    if (act === "delete-debt") deleteDebt(id);
  }

  function submit(event) {
    const form=event.target;
    if(form.id==="debt-form") { event.preventDefault(); const data=new FormData(form); const id=form.dataset.id||uid(); const old=state.debts.find(item=>item.id===id); const balance=Math.max(0,num(data.get("balance"))); const debt={id,name:String(data.get("name")||"").trim(),type:String(data.get("type")||"Other"),balance,originalBalance:Math.max(balance,old?.originalBalance||balance),apr:Math.max(0,Math.min(100,num(data.get("apr")))),minimum:Math.max(0,num(data.get("minimum"))),dueDay:Math.max(0,Math.min(31,Math.floor(num(data.get("dueDay"))))),limit:Math.max(0,num(data.get("limit"))),note:String(data.get("note")||"").trim(),createdAt:old?.createdAt??Date.now()}; if(!debt.name)return; if(old)state.debts=state.debts.map(item=>item.id===id?debt:item); else state.debts.push(debt); save(old?"Debt updated.":"Debt added.");closeSheet();render(); }
    if(form.id==="payment-form") { event.preventDefault(); const data=new FormData(form); const debt=state.debts.find(item=>item.id===data.get("debtId")); if(!debt)return; const amount=Math.max(0,num(data.get("amount"))); if(!amount)return toast("Enter a payment amount greater than zero."); const applied=Math.min(amount,debt.balance); debt.balance=cents(Math.max(0,debt.balance-applied)); state.payments.unshift({id:uid(),debtId:debt.id,name:debt.name,amount:cents(applied),date:String(data.get("date")||new Date().toISOString().slice(0,10)),note:String(data.get("note")||"").trim()});save("Payment recorded.");closeSheet();render(); }
    if(form.id==="cycle-form") { event.preventDefault(); state.settings.cycleDay=Math.max(1,Math.min(28,Math.floor(num(new FormData(form).get("cycleDay")))||1));save("Funding schedule updated.");closeSheet();render(); }
    if(form.id==="one-time-form") { event.preventDefault(); const data=new FormData(form); const item={id:form.dataset.id||uid(),amount:Math.max(0,num(data.get("amount"))),month:String(data.get("month")||state.settings.start),note:String(data.get("note")||"").trim()};if(!item.amount)return toast("Enter a funding amount.");const index=state.settings.oneTime.findIndex(entry=>entry.id===item.id);if(index>=0)state.settings.oneTime[index]=item;else state.settings.oneTime.push(item);save("One-time funding saved.");closeSheet();render(); }
  }
  function input(event) {
    if(event.target.id==="debt-search") { ui.search=event.target.value; const pos=event.target.selectionStart; render(false); const field=$("debt-search"); if(field){field.focus();field.setSelectionRange(pos,pos);} }
    if(event.target.id==="extra-slider") { refreshExtraSheet(num(event.target.value)); }
    if(event.target.id==="extra-amount") { refreshExtraSheet(num(event.target.value)); }
  }
  function change(event) { if(event.target.id==="debt-sort"){ui.sort=event.target.value;render();} }

  $("screen").addEventListener("click",click); $("tabbar").addEventListener("click",click); $("modal-root").addEventListener("click",click); document.addEventListener("submit",submit); document.addEventListener("input",input); document.addEventListener("change",change);
  $("backup-input").addEventListener("change", event => { const file=event.target.files?.[0]; if(!file)return; const reader=new FileReader();reader.onload=()=>{try{const incoming=normalize(JSON.parse(reader.result));if(confirm(`Replace this browser's data with ${incoming.debts.length} debt account(s) from the backup?`)){state=incoming;save("Backup imported.");closeSheet();ui.page="home";render();}}catch{toast("That file is not a valid DebtWizard backup.");}event.target.value="";};reader.readAsText(file); });
  render();
})();
