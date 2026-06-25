(() => {
  "use strict";

  const STORAGE_KEY = "debt-calculator-v2";
  const MAX_MONTHS = 720;
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const number = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const $ = id => document.getElementById(id);

  const palette = ["#ffcf5b","#42c5df","#8164e9","#63cf8c","#ffa158","#ee7bb2","#7da7f7","#b6c86a","#f58e5c","#8dc6b0","#d8a3ee"];
  const navItems = [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "debts", label: "Debts", icon: "◔" },
    { id: "strategy", label: "Strategy", icon: "✦" },
    { id: "plan", label: "Plan", icon: "▤" },
    { id: "track", label: "Track", icon: "✓" }
  ];

  let appState = loadState();
  let currentPage = "home";
  let detailId = null;
  let detailTab = "progress";
  let debtBreakdownMode = "debt";
  let debtSearch = "";
  let debtSort = "added";

  function defaultState() {
    const now = new Date();
    return {
      settings: {
        strategy: "snowball",
        extra: 0,
        start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        cycleDay: 1,
        customOrder: [],
        oneTime: []
      },
      debts: [],
      payments: []
    };
  }

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[char]));
  }

  function currentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  function parseMonth(key) {
    const safe = /^\d{4}-(0[1-9]|1[0-2])$/.test(key || "") ? key : currentMonthKey();
    const [year, month] = safe.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function monthLabel(date) {
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  function fullDateLabel(date) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function humanCountdown(date) {
    if (!date) return "Add debts to begin";
    const now = new Date();
    const ms = Math.max(0, date.getTime() - now.getTime());
    const days = Math.ceil(ms / 86400000);
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const rest = Math.max(0, days - years * 365 - months * 30);
    const items = [];
    if (years) items.push(`${years} yr`);
    if (months || years) items.push(`${months} mo`);
    if (!years && !months) items.push(`${rest} days`);
    return items.slice(0, 2).join(" ") || "this month";
  }

  function loadState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch {
      return defaultState();
    }
  }

  function normalizeState(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;
    const rawSettings = raw.settings || {};
    const debts = Array.isArray(raw.debts) ? raw.debts.map((debt, index) => {
      const balance = Math.max(0, number(debt.balance));
      return {
        id: String(debt.id || uid()),
        name: String(debt.name || "").trim(),
        type: String(debt.type || "Other"),
        balance,
        apr: Math.max(0, Math.min(100, number(debt.apr))),
        minimum: Math.max(0, number(debt.minimum)),
        dueDay: Math.max(0, Math.min(31, Math.floor(number(debt.dueDay)))),
        limit: Math.max(0, number(debt.limit ?? debt.creditLimit)),
        note: String(debt.note || ""),
        originalBalance: Math.max(balance, number(debt.originalBalance) || balance),
        createdAt: debt.createdAt || index
      };
    }).filter(debt => debt.name) : [];

    const oneTime = Array.isArray(rawSettings.oneTime) ? rawSettings.oneTime.map(item => ({
      id: String(item.id || uid()),
      amount: Math.max(0, number(item.amount)),
      month: /^\d{4}-(0[1-9]|1[0-2])$/.test(item.month || "") ? item.month : base.settings.start,
      note: String(item.note || "")
    })).filter(item => item.amount > 0) : [];

    const payments = Array.isArray(raw.payments) ? raw.payments.map(item => ({
      id: String(item.id || uid()),
      debtId: String(item.debtId || ""),
      name: String(item.name || ""),
      amount: Math.max(0, number(item.amount)),
      date: item.date || new Date().toISOString().slice(0, 10),
      note: String(item.note || "")
    })).filter(item => item.amount > 0) : [];

    return {
      settings: {
        strategy: ["snowball", "avalanche", "custom"].includes(rawSettings.strategy) ? rawSettings.strategy : "snowball",
        extra: Math.max(0, number(rawSettings.extra)),
        start: /^\d{4}-(0[1-9]|1[0-2])$/.test(rawSettings.start || rawSettings.planStart || "") ? (rawSettings.start || rawSettings.planStart) : base.settings.start,
        cycleDay: Math.max(1, Math.min(28, Math.floor(number(rawSettings.cycleDay)) || 1)),
        customOrder: Array.isArray(rawSettings.customOrder) ? rawSettings.customOrder.map(String) : [],
        oneTime
      },
      debts,
      payments
    };
  }

  function saveState(message = "Saved locally") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    showToast(message);
  }

  function showToast(message) {
    const old = document.querySelector(".toast");
    if (old) old.remove();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  }

  function activeDebts() {
    return appState.debts.filter(debt => debt.balance > 0.004);
  }

  function totalDebt() {
    return activeDebts().reduce((sum, debt) => sum + debt.balance, 0);
  }

  function minimumTotal() {
    return activeDebts().reduce((sum, debt) => sum + debt.minimum, 0);
  }

  function oneTimeForMonth(key) {
    return appState.settings.oneTime
      .filter(item => item.month === key)
      .reduce((sum, item) => sum + item.amount, 0);
  }

  function sortTargetList(debts) {
    const strategy = appState.settings.strategy;
    if (strategy === "avalanche") {
      return [...debts].sort((a, b) => b.apr - a.apr || a.balance - b.balance || a.name.localeCompare(b.name));
    }
    if (strategy === "custom") {
      const positions = new Map(appState.settings.customOrder.map((id, index) => [id, index]));
      return [...debts].sort((a, b) => (positions.get(a.id) ?? 9999) - (positions.get(b.id) ?? 9999) || a.balance - b.balance);
    }
    return [...debts].sort((a, b) => a.balance - b.balance || b.apr - a.apr || a.name.localeCompare(b.name));
  }

  function currentTarget() {
    const debts = activeDebts();
    return debts.length ? sortTargetList(debts)[0] : null;
  }

  function calculatePlan() {
    const originDebts = activeDebts();
    const working = originDebts.map(debt => ({ ...debt, balance: round(debt.balance) }));
    const fixedBudget = round(minimumTotal() + appState.settings.extra);
    const startingDate = parseMonth(appState.settings.start);
    const payoffs = {};
    const trails = Object.fromEntries(appState.debts.map(debt => [debt.id, [{ date: startingDate, balance: debt.balance }]]));
    const rows = [];
    let totalInterest = 0;
    let noProgress = 0;

    if (!working.length) return { rows, payoffs, trails, totalInterest, budget: fixedBudget, failed: false };

    for (let i = 0; i < MAX_MONTHS; i++) {
      const date = new Date(startingDate.getFullYear(), startingDate.getMonth() + i, 1);
      const active = working.filter(debt => debt.balance > 0.004);
      if (!active.length) break;

      const opening = round(active.reduce((sum, debt) => sum + debt.balance, 0));
      let interest = 0;
      active.forEach(debt => {
        const accrual = round(debt.balance * (debt.apr / 100) / 12);
        debt.balance = round(debt.balance + accrual);
        interest = round(interest + accrual);
      });

      let available = round(fixedBudget + oneTimeForMonth(monthKey(date)));
      active.forEach(debt => {
        const payment = Math.min(debt.minimum, debt.balance, available);
        debt.balance = round(debt.balance - payment);
        available = round(available - payment);
      });

      let targetName = "Minimum payments";
      while (available > 0.004) {
        const remaining = working.filter(debt => debt.balance > 0.004);
        if (!remaining.length) break;
        const target = sortTargetList(remaining)[0];
        targetName = target.name;
        const payment = Math.min(target.balance, available);
        target.balance = round(target.balance - payment);
        available = round(available - payment);
      }

      working.forEach(debt => {
        if (debt.balance <= 0.004) {
          debt.balance = 0;
          if (!payoffs[debt.id]) payoffs[debt.id] = date;
        }
        trails[debt.id].push({ date, balance: debt.balance });
      });

      const closing = round(working.reduce((sum, debt) => sum + debt.balance, 0));
      rows.push({
        date,
        opening,
        interest,
        payment: round(fixedBudget + oneTimeForMonth(monthKey(date)) - available),
        closing,
        target: targetName
      });
      totalInterest = round(totalInterest + interest);
      noProgress = closing >= opening - 0.004 ? noProgress + 1 : 0;

      if (noProgress >= 6 || fixedBudget <= 0.004) {
        return { rows, payoffs, trails, totalInterest, budget: fixedBudget, failed: true };
      }
    }

    const remainingDebt = working.some(debt => debt.balance > 0.004);
    return { rows, payoffs, trails, totalInterest, budget: fixedBudget, failed: remainingDebt };
  }

  function nextDueDate(debt) {
    const today = new Date();
    const dueDay = Math.max(1, debt.dueDay || 1);
    const candidate = new Date(today.getFullYear(), today.getMonth(), Math.min(dueDay, daysInMonth(today.getFullYear(), today.getMonth())));
    if (candidate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      return new Date(today.getFullYear(), today.getMonth() + 1, Math.min(dueDay, daysInMonth(today.getFullYear(), today.getMonth() + 1)));
    }
    return candidate;
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function getBreakdown() {
    const debts = activeDebts();
    const map = new Map();
    debts.forEach(debt => {
      const key = debtBreakdownMode === "category" ? debt.type : debt.name;
      map.set(key, (map.get(key) || 0) + debt.balance);
    });
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }

  function conicGradient(items) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (!total) return "conic-gradient(#edf1f2 0deg 360deg)";
    let current = 0;
    return `conic-gradient(${items.map((item, index) => {
      const start = current;
      current += (item.value / total) * 360;
      return `${palette[index % palette.length]} ${start}deg ${Math.max(start + .6, current)}deg`;
    }).join(",")})`;
  }

  function renderTabbar() {
    $("tabbar").innerHTML = navItems.map(item => `
      <button class="nav-button ${currentPage === item.id ? "active" : ""}" data-action="nav" data-page="${item.id}">
        <span class="nav-icon" aria-hidden="true">${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `).join("");
  }

  function render(keepScroll = false) {
    let content = "";
    if (currentPage === "home") content = renderHome();
    if (currentPage === "debts") content = renderDebts();
    if (currentPage === "strategy") content = renderStrategy();
    if (currentPage === "plan") content = renderPlan();
    if (currentPage === "track") content = renderTrack();
    if (currentPage === "detail") content = renderDetail();

    $("screen").innerHTML = content;
    renderTabbar();
    if (!keepScroll) window.scrollTo(0, 0);
  }

  function renderHome() {
    const plan = calculatePlan();
    const target = currentTarget();
    const lastRow = plan.rows.at(-1);
    const debtFree = !plan.failed && lastRow ? lastRow.date : null;
    const nextDue = activeDebts().sort((a, b) => nextDueDate(a) - nextDueDate(b))[0];

    return `
      <section class="page">
        <header class="hero">
          <div class="hero-content">
            <div class="hero-row">
              <div>
                <p class="eyebrow">DebtWizard</p>
                <h1>Your money plan</h1>
                <p class="subtitle">A clear view of your debt-free path.</p>
              </div>
              <button class="icon-circle" data-action="settings" aria-label="Open settings">⚙</button>
            </div>
          </div>
        </header>
        <div class="rounded-sheet">
          <div class="container">
            <section class="section">
              ${activeDebts().length ? `
              <div class="summary-grid">
                <article class="hero-stat">
                  <p class="eyebrow">Projected debt-free</p>
                  <div class="big">${debtFree ? monthLabel(debtFree) : "Review plan"}</div>
                  <div class="small">${debtFree ? humanCountdown(debtFree) + " remaining" : "Increase funding or review payment amounts"}</div>
                </article>
                <div class="metric-row">
                  <article class="metric-card">
                    <div class="metric-label">Total debt</div>
                    <div class="metric-value">${money.format(totalDebt())}</div>
                    <div class="metric-note">${activeDebts().length} active accounts</div>
                  </article>
                  <article class="metric-card">
                    <div class="metric-label">Plan payment</div>
                    <div class="metric-value">${money.format(plan.budget)}</div>
                    <div class="metric-note">${money.format(appState.settings.extra)} extra monthly</div>
                  </article>
                </div>
              </div>
              <div style="height:14px"></div>
              <article class="card soft card-pad">
                <p class="eyebrow">Focus this month</p>
                <div class="hero-row" style="align-items:center;margin-top:4px">
                  <div>
                    <div style="font-size:1.28rem;font-weight:850;color:#284b5b">${escapeHtml(target?.name || "No target selected")}</div>
                    <div class="muted" style="margin-top:2px">${target ? `${appState.settings.strategy === "avalanche" ? "Highest APR" : appState.settings.strategy === "custom" ? "Custom priority" : "Lowest balance"} • ${money.format(target.balance)} remaining` : "Add your first account to begin."}</div>
                  </div>
                  <button class="button small" data-action="open-detail" data-id="${target?.id || ""}" ${target ? "" : "disabled"}>View</button>
                </div>
              </article>
              ` : renderEmptyHome()}
            </section>

            <section class="section">
              <h2 class="section-title">This month</h2>
              <div class="metric-row">
                <article class="metric-card">
                  <div class="metric-label">Minimums due</div>
                  <div class="metric-value">${money.format(minimumTotal())}</div>
                  <div class="metric-note">${nextDue ? `Next: ${escapeHtml(nextDue.name)} on ${fullDateLabel(nextDueDate(nextDue))}` : "No upcoming payments"}</div>
                </article>
                <article class="metric-card">
                  <div class="metric-label">Estimated interest</div>
                  <div class="metric-value">${money.format(plan.rows[0]?.interest || 0)}</div>
                  <div class="metric-note">Based on current balances</div>
                </article>
              </div>
            </section>

            <section class="section">
              <h2 class="section-title">Quick actions</h2>
              <div class="action-row">
                <button class="button" data-action="add-debt">＋ Add a debt</button>
                <button class="button secondary" data-action="record-payment" ${activeDebts().length ? "" : "disabled"}>Record payment</button>
                <button class="button secondary" data-action="nav" data-page="strategy">Adjust strategy</button>
              </div>
            </section>
          </div>
        </div>
      </section>
    `;
  }

  function renderEmptyHome() {
    return `
      <article class="empty-state">
        <span class="empty-icon">✦</span>
        <h3>Build your debt-free path</h3>
        <p>Start by adding a debt, then set your monthly funding and payoff priority.</p>
        <button class="button" data-action="add-debt">Add your first debt</button>
      </article>
    `;
  }

  function renderDebts() {
    const breakdown = getBreakdown();
    const total = breakdown.reduce((sum, item) => sum + item.value, 0);
    const debts = getFilteredDebts();
    const cardContent = debts.length ? debts.map(renderDebtCard).join("") : `
      <div class="empty-state">
        <span class="empty-icon">⌕</span>
        <h3>No debts match that search</h3>
        <p>Try a different name, category, or clear the search.</p>
      </div>
    `;

    return `
      <section class="page">
        <header class="hero">
          <div class="hero-content">
            <div class="hero-row">
              <div>
                <h1>Debts</h1>
                <p class="subtitle">Manage every account in one place.</p>
              </div>
              <button class="icon-circle" data-action="add-debt" aria-label="Add a debt">＋</button>
            </div>
            <div class="segmented" style="margin-top:20px;max-width:650px">
              <button class="${debtBreakdownMode === "category" ? "active" : ""}" data-action="breakdown" data-mode="category">By category</button>
              <button class="${debtBreakdownMode === "debt" ? "active" : ""}" data-action="breakdown" data-mode="debt">By debt</button>
            </div>
          </div>
        </header>

        <div class="rounded-sheet">
          <div class="container">
            <section class="section">
              <h2 class="section-title">${debtBreakdownMode === "category" ? "Balance by category" : "Balance by debt"}</h2>
              ${breakdown.length ? `
                <div class="chart-wrap">
                  <div class="donut-area">
                    <div class="donut" style="background:${conicGradient(breakdown)}">
                      <div class="donut-center"><div><strong>${money.format(total)}</strong><span>${activeDebts().length} active debts</span></div></div>
                    </div>
                  </div>
                  <div class="legend">
                    ${breakdown.map((item, index) => `
                      <div class="legend-item">
                        <div class="legend-label"><span class="legend-dot" style="background:${palette[index % palette.length]}"></span><span>${escapeHtml(item.label)}</span></div>
                        <span class="legend-value">${money.format(item.value)}</span>
                      </div>
                    `).join("")}
                  </div>
                </div>
                <div class="dot-pager"><span class="${debtBreakdownMode === "category" ? "active" : ""}"></span><span class="${debtBreakdownMode === "debt" ? "active" : ""}"></span></div>
              ` : renderEmptyHome()}
            </section>

            <section class="section">
              <div class="hero-row" style="align-items:center">
                <h2 class="section-title" style="margin:0">Debts (${appState.debts.length})</h2>
                <button class="add-pill" data-action="add-debt"><span>＋</span> Add</button>
              </div>
              <div class="debt-toolbar" style="margin-top:18px">
                <label class="search-box" aria-label="Search debts">
                  <span style="font-size:1.55rem">⌕</span>
                  <input id="debt-search" type="search" value="${escapeHtml(debtSearch)}" placeholder="Search">
                </label>
                <select id="debt-sort" class="sort-select" aria-label="Sort debts">
                  <option value="added" ${debtSort === "added" ? "selected" : ""}>As added</option>
                  <option value="balance-asc" ${debtSort === "balance-asc" ? "selected" : ""}>Lowest balance</option>
                  <option value="balance-desc" ${debtSort === "balance-desc" ? "selected" : ""}>Highest balance</option>
                  <option value="apr-desc" ${debtSort === "apr-desc" ? "selected" : ""}>Highest APR</option>
                  <option value="name" ${debtSort === "name" ? "selected" : ""}>A–Z</option>
                </select>
              </div>
              <div class="debt-list">${cardContent}</div>
            </section>
          </div>
        </div>
      </section>
    `;
  }

  function getFilteredDebts() {
    let list = [...appState.debts];
    const query = debtSearch.trim().toLowerCase();
    if (query) list = list.filter(debt => `${debt.name} ${debt.type}`.toLowerCase().includes(query));
    if (debtSort === "balance-asc") list.sort((a, b) => a.balance - b.balance);
    if (debtSort === "balance-desc") list.sort((a, b) => b.balance - a.balance);
    if (debtSort === "apr-desc") list.sort((a, b) => b.apr - a.apr);
    if (debtSort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (debtSort === "added") list.sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
    return list;
  }

  function renderDebtCard(debt) {
    const target = currentTarget()?.id === debt.id;
    return `
      <button class="debt-card" data-action="open-detail" data-id="${debt.id}">
        <div class="debt-card-head">
          <div class="debt-ident">
            <span class="debt-icon">${debt.type === "Credit Card" ? "▣" : debt.type === "Auto Loan" ? "⌁" : debt.type === "Student Loan" ? "⌂" : "◈"}</span>
            <div class="debt-name">${escapeHtml(debt.name)}</div>
          </div>
          <span class="edit-glyph">⌕</span>
        </div>
        <div class="debt-card-values">
          <div><span class="label">Balance</span><span class="balance">${money.format(debt.balance)}</span></div>
          <div><span class="label">Minimum</span><span class="small-value">${money.format(debt.minimum)}</span></div>
          <div><span class="label">APR</span><span class="small-value">${debt.apr.toFixed(2)}%</span></div>
        </div>
        ${target ? `<div style="margin:12px 0 0 45px"><span class="tag gold">Current focus</span></div>` : ""}
      </button>
    `;
  }

  function renderStrategy() {
    const plan = calculatePlan();
    const oneTime = [...appState.settings.oneTime].sort((a, b) => a.month.localeCompare(b.month));
    const strategyTitle = {
      snowball: "Debt Snowball",
      avalanche: "Debt Avalanche",
      custom: "Custom order"
    }[appState.settings.strategy];

    return `
      <section class="page">
        <header class="hero">
          <div class="hero-content">
            <div class="hero-row">
              <div>
                <h1>Strategy</h1>
                <p class="subtitle">Optimize your payoff plan.</p>
              </div>
              <button class="icon-circle" data-action="settings" aria-label="Open settings">⚙</button>
            </div>
          </div>
        </header>

        <div class="rounded-sheet">
          <div class="container">
            <section class="section">
              <article class="funding-card">
                <div class="funding-title"><span class="mini-icon">⟳</span> Recurring funding</div>
                <p class="funding-desc">Amount available for making payments each cycle.</p>
                <div class="field-list">
                  <button class="field-line" data-action="edit-cycle"><span class="label">Frequency</span><span class="value">Once per month on the ${ordinal(appState.settings.cycleDay)} <span class="chev">›</span></span></button>
                  <div class="field-line"><span class="label">Minimum</span><span class="value">${money.format(minimumTotal())}</span></div>
                  <button class="field-line" data-action="edit-extra"><span class="label">Extra</span><span class="value">${money.format(appState.settings.extra)} <span class="chev">›</span></span></button>
                  <div class="field-line"><span class="label">Total</span><span class="value">${money.format(plan.budget)}</span></div>
                </div>
              </article>
            </section>

            <section class="section">
              <article class="funding-card">
                <div class="funding-title"><span class="mini-icon">▣</span> One-time fundings</div>
                <p class="funding-desc">Bonus amounts added to the payoff plan on a selected month.</p>
                ${oneTime.length ? `
                  <div class="field-list">
                    ${oneTime.map(item => `
                      <button class="field-line" data-action="edit-one-time" data-id="${item.id}">
                        <span class="label">${monthLabel(parseMonth(item.month))}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</span>
                        <span class="value">${money.format(item.amount)} <span class="chev">›</span></span>
                      </button>
                    `).join("")}
                  </div>
                ` : `<button class="field-line" data-action="add-one-time"><span class="label">No bonus payments planned</span><span class="value"><span class="chev">›</span></span></button>`}
                <div style="margin-top:14px"><button class="button secondary small" data-action="add-one-time">＋ Add one-time funding</button></div>
              </article>
            </section>

            <section class="section">
              <article class="funding-card">
                <div class="funding-title"><span class="mini-icon">⚖</span> Extra payment priority</div>
                <p class="funding-desc">Choose which debt receives your extra money first.</p>
                <button class="field-line" data-action="priority">
                  <span class="label">Current priority</span>
                  <span class="value">${strategyTitle} <span class="chev">›</span></span>
                </button>
              </article>
            </section>
          </div>
        </div>
      </section>
    `;
  }

  function renderPlan() {
    const plan = calculatePlan();
    const last = plan.rows.at(-1);
    const payoffEntries = activeDebts().map(debt => ({
      debt,
      date: plan.payoffs[debt.id] || null
    })).sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date - b.date;
    });
    const next = payoffEntries[0];
    const totalPayments = round((plan.rows.reduce((sum, row) => sum + row.payment, 0)));
    const firstInterest = plan.rows[0]?.interest || 0;

    return `
      <section class="page">
        <header class="hero">
          <div class="hero-content">
            <div class="hero-row">
              <div>
                <h1>Payoff Plan</h1>
                <p class="subtitle">Your step-by-step path to a debt-free future.</p>
              </div>
              <button class="icon-circle" data-action="settings" aria-label="Open settings">⚙</button>
            </div>
          </div>
        </header>

        <div class="rounded-sheet">
          <div class="container">
            <section class="section">
              <h2 class="section-title">Plan summary</h2>
              ${activeDebts().length ? `
                <div class="plan-summary">
                  <article class="summary-banner">
                    <div class="big-icon">🏆</div>
                    <div><strong>Payoff</strong><span>Next debt</span></div>
                    <div class="right-stat"><span>${next?.date ? humanCountdown(next.date) : "Review"}</span><div class="stat">${last && !plan.failed ? humanCountdown(last.date) : "—"}</div></div>
                  </article>
                  <article class="summary-banner gold">
                    <div class="big-icon">🗓</div>
                    <div><strong>Interest</strong><span>Next 30 days</span></div>
                    <div class="right-stat"><span>${money.format(firstInterest)}</span><div class="stat">${money.format(plan.totalInterest)}</div></div>
                  </article>
                  <article class="summary-banner blue">
                    <div class="big-icon">💧</div>
                    <div><strong>Payments</strong><span>Next 30 days</span></div>
                    <div class="right-stat"><span>${money.format(plan.rows[0]?.payment || 0)}</span><div class="stat">${money.format(totalPayments)}</div></div>
                  </article>
                </div>
              ` : renderEmptyHome()}
            </section>

            <section class="section">
              <div class="hero-row" style="align-items:center">
                <h2 class="section-title" style="margin:0">Step-by-step payoff plan</h2>
                <button class="add-pill" data-action="show-schedule">Tables</button>
              </div>
              <div style="height:16px"></div>
              ${payoffEntries.length ? payoffEntries.map((entry, index) => renderPlanStep(entry, index, payoffEntries.length, plan)).join("") : ""}
              ${plan.failed && activeDebts().length ? `
                <article class="card soft card-pad" style="border-color:#ffd8cf;background:#fff7f5">
                  <strong style="color:#ae453a">This plan needs more funding.</strong>
                  <p class="muted" style="margin:7px 0 12px">Your current monthly plan is not reducing all balances to zero. Check the minimum payments or increase the extra amount.</p>
                  <button class="button small" data-action="edit-extra">Update extra payment</button>
                </article>
              ` : ""}
            </section>
          </div>
        </div>
      </section>
    `;
  }

  function renderPlanStep(entry, index, count, plan) {
    const { debt, date } = entry;
    const target = currentTarget()?.id === debt.id;
    return `
      <article class="plan-step" data-action="open-detail" data-id="${debt.id}" role="button" tabindex="0">
        <div class="step-top">
          <div class="step-badge">STEP ${index + 1}<span>${count - index} to go</span></div>
          <div class="step-complete">${date ? `Completes on <strong>${fullDateLabel(date)}</strong><br><span class="muted">${humanCountdown(date)}</span>` : `<strong>Review payment plan</strong>`}</div>
        </div>
        <div class="step-detail">
          <div><strong>${escapeHtml(debt.name)} payoff</strong> ${target ? '<span class="tag">Current focus</span>' : '<span class="tag gold">Minimum</span>'}</div>
          <span class="chev">›</span>
        </div>
      </article>
    `;
  }

  function renderTrack() {
    const due = activeDebts().map(debt => ({ debt, date: nextDueDate(debt) })).sort((a, b) => a.date - b.date);
    const past = [...appState.payments].sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return `
      <section class="page">
        <header class="hero">
          <div class="hero-content">
            <div class="hero-row">
              <div>
                <h1>Track</h1>
                <p class="subtitle">Stay on top of upcoming payments and progress.</p>
              </div>
              <button class="icon-circle" data-action="record-payment" aria-label="Record a payment">＋</button>
            </div>
          </div>
        </header>

        <div class="rounded-sheet">
          <div class="container">
            <section class="section">
              <div class="hero-row" style="align-items:center">
                <h2 class="section-title" style="margin:0">Upcoming payments</h2>
                <button class="button secondary small" data-action="record-payment">Record</button>
              </div>
              <div style="height:8px"></div>
              ${due.length ? `
                <div class="card soft card-pad">
                  ${due.slice(0, 10).map(item => `
                    <button class="transaction-row" data-action="open-detail" data-id="${item.debt.id}" style="width:100%;border-left:0;border-right:0;border-top:0;background:transparent;text-align:left">
                      <span class="trans-icon">▣</span>
                      <span class="trans-main"><strong>${escapeHtml(item.debt.name)}</strong><small>${fullDateLabel(item.date)} · Minimum</small></span>
                      <span class="trans-amt">${money.format(item.debt.minimum)}</span>
                    </button>
                  `).join("")}
                </div>
              ` : `<div class="empty-state"><span class="empty-icon">✓</span><h3>No upcoming payments</h3><p>Add debts to create your payment calendar.</p></div>`}
            </section>

            <section class="section">
              <h2 class="section-title">Recent activity</h2>
              <div class="card soft card-pad">
                ${past.length ? past.slice(0, 20).map(item => `
                  <div class="transaction-row">
                    <span class="trans-icon">✓</span>
                    <span class="trans-main"><strong>${escapeHtml(item.name || "Payment")}</strong><small>${formatStoredDate(item.date)}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</small></span>
                    <span class="trans-amt">${money.format(item.amount)}</span>
                  </div>
                `).join("") : `<div class="empty-state"><span class="empty-icon">◌</span><h3>No payments recorded yet</h3><p>Use the Record button whenever you make a payment.</p></div>`}
              </div>
            </section>
          </div>
        </div>
      </section>
    `;
  }

  function renderDetail() {
    const debt = appState.debts.find(item => item.id === detailId);
    if (!debt) {
      currentPage = "debts";
      return renderDebts();
    }

    const plan = calculatePlan();
    const payoff = plan.payoffs[debt.id];
    const trail = plan.trails[debt.id] || [];
    const paid = Math.max(0, debt.originalBalance - debt.balance);
    const percentage = debt.originalBalance ? Math.min(100, Math.max(0, paid / debt.originalBalance * 100)) : 0;

    return `
      <section class="page">
        <header class="hero detail-hero">
          <button class="back-button" data-action="back-debts" aria-label="Back to debts">‹</button>
          <div class="hero-content">
            <div class="detail-heading">${escapeHtml(debt.name)}</div>
            <div class="segmented detail-tabbar">
              <button class="${detailTab === "progress" ? "active" : ""}" data-action="detail-tab" data-tab="progress">Progress</button>
              <button class="${detailTab === "transactions" ? "active" : ""}" data-action="detail-tab" data-tab="transactions">Transactions</button>
              <button class="${detailTab === "details" ? "active" : ""}" data-action="detail-tab" data-tab="details">Details</button>
            </div>
          </div>
        </header>

        <div class="rounded-sheet">
          <div class="detail-shell">
            ${detailTab === "progress" ? renderDetailProgress(debt, payoff, trail, paid, percentage) : ""}
            ${detailTab === "transactions" ? renderDetailTransactions(debt) : ""}
            ${detailTab === "details" ? renderDetailDetails(debt) : ""}
          </div>
        </div>
      </section>
    `;
  }

  function renderDetailProgress(debt, payoff, trail, paid, percentage) {
    const line = buildLineChart(trail, debt.originalBalance || debt.balance);
    return `
      <section class="section">
        <div class="date-block">
          <div class="date-label">▦ DEBT PAYOFF DATE</div>
          <div class="date-value">${payoff ? fullDateLabel(payoff) : "Review plan"}</div>
          <div class="date-note">${payoff ? `in ${humanCountdown(payoff)}` : "Add funding to create a payoff estimate"}</div>
        </div>
      </section>
      <section class="section">
        <h2 class="section-title">Payoff progress</h2>
        <div class="payoff-progress">
          <div class="progress-ring" style="background:conic-gradient(#f7c449 ${percentage * 3.6}deg,#ffefd1 0deg)">
            <div><strong>${percentage.toFixed(1)}%</strong><span>paid</span></div>
          </div>
          <div class="progress-stat">
            <div><div class="kind">Principal paid</div><div class="green-text">${money.format(paid)}</div></div>
            <div><div class="kind">Balance</div><div class="red-text">${money.format(debt.balance)}</div></div>
          </div>
        </div>
      </section>
      <section class="section">
        <h2 class="section-title">Payoff timeline</h2>
        <div class="chart-card">
          <p class="chart-title">Ending balance</p>
          ${line}
        </div>
      </section>
      <section class="section">
        <div class="action-row">
          <button class="button" data-action="record-payment" data-id="${debt.id}">Record payment</button>
          <button class="button secondary" data-action="edit-debt" data-id="${debt.id}">Edit debt</button>
        </div>
      </section>
    `;
  }

  function renderDetailTransactions(debt) {
    const dueDates = upcomingDatesForDebt(debt, 12);
    const payments = appState.payments.filter(item => item.debtId === debt.id || item.name === debt.name).sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return `
      <section class="section">
        <div class="hero-row" style="align-items:center">
          <h2 class="section-title" style="margin:0">Upcoming</h2>
          <button class="button secondary small" data-action="record-payment" data-id="${debt.id}">Record</button>
        </div>
        <div class="transaction-group-title">${monthLabel(dueDates[0])}</div>
        <div class="card soft card-pad">
          ${dueDates.map(date => `
            <div class="transaction-row">
              <span class="trans-icon">▣</span>
              <span class="trans-main"><strong>${fullDateLabel(date)}</strong><small>Minimum payment</small></span>
              <span class="trans-amt">${money.format(debt.minimum)}</span>
            </div>
          `).join("")}
        </div>
      </section>
      <section class="section">
        <h2 class="section-title">Past payments</h2>
        <div class="card soft card-pad">
          ${payments.length ? payments.map(item => `
            <div class="transaction-row">
              <span class="trans-icon">✓</span>
              <span class="trans-main"><strong>${formatStoredDate(item.date)}</strong><small>${escapeHtml(item.note || "Payment recorded")}</small></span>
              <span class="trans-amt">${money.format(item.amount)}</span>
            </div>
          `).join("") : `<div class="empty-state"><span class="empty-icon">◌</span><h3>No payments recorded</h3><p>Payments you record will appear here.</p></div>`}
        </div>
      </section>
    `;
  }

  function renderDetailDetails(debt) {
    return `
      <section class="section">
        <div class="details-list">
          <div class="detail-row"><span class="label">Category</span><span class="value">${escapeHtml(debt.type)}</span></div>
          <div class="detail-row"><span class="label">Nickname</span><span class="value">${escapeHtml(debt.name)}</span></div>
          <div class="detail-row"><span class="label">Custom note</span><span class="value">${escapeHtml(debt.note || "No note")}</span></div>
        </div>
      </section>
      <section class="section">
        <h2 class="section-title">Terms</h2>
        <div class="details-list">
          <div class="detail-row"><span class="label">Current balance</span><span class="value">${money.format(debt.balance)}</span></div>
          <div class="detail-row"><span class="label">Annual Percentage Rate</span><span class="value">${debt.apr.toFixed(2)}%</span></div>
          <div class="detail-row"><span class="label">Credit limit</span><span class="value">${debt.limit ? money.format(debt.limit) : "Not set"}</span></div>
        </div>
      </section>
      <section class="section">
        <h2 class="section-title">Payment details</h2>
        <div class="details-list">
          <div class="detail-row"><span class="label">Minimum payment</span><span class="value">${money.format(debt.minimum)}</span></div>
          <div class="detail-row"><span class="label">Payment frequency</span><span class="value">Once per month</span></div>
          <div class="detail-row"><span class="label">Day of month</span><span class="value">${debt.dueDay || "Not set"}</span></div>
          <div class="detail-row"><span class="label">Next payment due</span><span class="value">${fullDateLabel(nextDueDate(debt))}</span></div>
        </div>
      </section>
      <section class="section">
        <div class="action-row">
          <button class="button" data-action="edit-debt" data-id="${debt.id}">Edit details</button>
          <button class="button danger" data-action="delete-debt" data-id="${debt.id}">Delete debt</button>
        </div>
      </section>
    `;
  }

  function buildLineChart(trail, maxBalance) {
    const samples = trail.length > 25 ? trail.filter((_, index) => index % Math.ceil(trail.length / 25) === 0 || index === trail.length - 1) : trail;
    const width = 340;
    const height = 190;
    const pad = { left: 48, right: 12, top: 12, bottom: 33 };
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;
    const max = Math.max(1, maxBalance, ...samples.map(item => item.balance));
    const pts = samples.map((item, index) => {
      const x = pad.left + (samples.length <= 1 ? 0 : index / (samples.length - 1) * chartWidth);
      const y = pad.top + (1 - item.balance / max) * chartHeight;
      return { x, y, item };
    });
    const path = pts.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
    const area = `${path} L ${pts.at(-1)?.x.toFixed(1) || pad.left} ${(height - pad.bottom).toFixed(1)} L ${pts[0]?.x.toFixed(1) || pad.left} ${(height - pad.bottom).toFixed(1)} Z`;
    const tickDates = [pts[0], pts[Math.floor((pts.length - 1) / 2)], pts.at(-1)].filter(Boolean);
    return `
      <svg class="timeline-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Projected ending balance timeline">
        <defs>
          <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#fbd675" stop-opacity=".62"/><stop offset="100%" stop-color="#fff4db" stop-opacity=".08"/></linearGradient>
        </defs>
        <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="#2a5dd6" stroke-width="1.2"/>
        <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="#9aa4a8" stroke-width="1"/>
        ${[0, .25, .5, .75, 1].map(ratio => {
          const y = pad.top + ratio * chartHeight;
          const value = max * (1 - ratio);
          return `<g><line x1="${pad.left - 5}" y1="${y}" x2="${pad.left}" y2="${y}" stroke="#8e999e"/><text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" font-size="8.4" fill="#6f7b80">${money.format(value)}</text></g>`;
        }).join("")}
        <path d="${area}" fill="url(#areaGradient)"/>
        <path d="${path}" fill="none" stroke="#f3b61d" stroke-width="2.3"/>
        ${pts.map(point => `<circle cx="${point.x}" cy="${point.y}" r="2.6" fill="#fff" stroke="#f3b61d" stroke-width="1.3"/>`).join("")}
        ${tickDates.map(point => `<text x="${point.x}" y="${height - 9}" text-anchor="middle" font-size="8.5" fill="#657177">${monthLabel(point.item.date)}</text>`).join("")}
      </svg>
    `;
  }

  function upcomingDatesForDebt(debt, count) {
    const result = [];
    let date = nextDueDate(debt);
    for (let index = 0; index < count; index++) {
      result.push(new Date(date));
      date = new Date(date.getFullYear(), date.getMonth() + 1, Math.min(Math.max(1, debt.dueDay || 1), daysInMonth(date.getFullYear(), date.getMonth() + 1)));
    }
    return result;
  }

  function formatStoredDate(value) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(`${value}T12:00:00`) : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : fullDateLabel(date);
  }

  function ordinal(value) {
    const mod10 = value % 10, mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return `${value}st`;
    if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
    if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
    return `${value}th`;
  }

  function openModal(content) {
    $("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">${content}</div></div>`;
  }

  function closeModal() {
    $("modal-root").innerHTML = "";
  }

  function openDebtModal(debtId = null) {
    const debt = appState.debts.find(item => item.id === debtId);
    const isEdit = !!debt;
    const values = debt || { type: "Credit Card", name: "", balance: "", apr: "", minimum: "", dueDay: "", limit: "", note: "" };

    openModal(`
      <div class="modal-top"><h2>${isEdit ? "Edit debt" : "Add a debt"}</h2><button class="close-modal" data-action="close-modal" aria-label="Close">×</button></div>
      <form id="debt-form" data-id="${debt?.id || ""}">
        <div class="form-grid">
          <label class="form-field">Lender / account name<input name="name" required maxlength="80" value="${escapeHtml(values.name)}" placeholder="Example: Bank of America"></label>
          <label class="form-field">Category<select name="type">${["Credit Card","Auto Loan","Personal Loan","Student Loan","Medical","Mortgage","Other"].map(type => `<option ${values.type === type ? "selected" : ""}>${type}</option>`).join("")}</select></label>
          <div class="form-grid two">
            <label class="form-field">Current balance<input name="balance" type="number" inputmode="decimal" required min="0" step="0.01" value="${values.balance}" placeholder="0.00"></label>
            <label class="form-field">APR (%)<input name="apr" type="number" inputmode="decimal" required min="0" max="100" step="0.01" value="${values.apr}" placeholder="0.00"></label>
          </div>
          <div class="form-grid two">
            <label class="form-field">Minimum monthly payment<input name="minimum" type="number" inputmode="decimal" required min="0" step="0.01" value="${values.minimum}" placeholder="0.00"></label>
            <label class="form-field">Due day of month<input name="dueDay" type="number" inputmode="numeric" min="1" max="31" value="${values.dueDay || ""}" placeholder="1–31"></label>
          </div>
          <label class="form-field">Credit limit <span style="font-weight:500;color:#9aa4a8">optional</span><input name="limit" type="number" inputmode="decimal" min="0" step="0.01" value="${values.limit || ""}" placeholder="0.00"></label>
          <label class="form-field">Personal note <span style="font-weight:500;color:#9aa4a8">optional</span><textarea name="note" placeholder="Add a reminder or account note">${escapeHtml(values.note)}</textarea></label>
        </div>
        <div class="modal-actions">
          ${isEdit ? `<button type="button" class="button danger" data-action="delete-debt" data-id="${debt.id}">Delete</button>` : ""}
          <button type="submit" class="button">${isEdit ? "Save changes" : "Add debt"}</button>
        </div>
      </form>
    `);
  }

  function openPaymentModal(debtId = null) {
    const debt = appState.debts.find(item => item.id === debtId) || currentTarget() || activeDebts()[0];
    if (!debt) {
      showToast("Add a debt before recording a payment.");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    openModal(`
      <div class="modal-top"><h2>Record payment</h2><button class="close-modal" data-action="close-modal" aria-label="Close">×</button></div>
      <form id="payment-form">
        <div class="form-grid">
          <label class="form-field">Debt<select name="debtId">${appState.debts.filter(item => item.balance > 0).map(item => `<option value="${item.id}" ${item.id === debt.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
          <div class="form-grid two">
            <label class="form-field">Payment amount<input name="amount" type="number" required min=".01" step=".01" inputmode="decimal" value="${debt.minimum ? debt.minimum.toFixed(2) : ""}"></label>
            <label class="form-field">Payment date<input name="date" type="date" value="${today}" required></label>
          </div>
          <label class="form-field">Note <span style="font-weight:500;color:#9aa4a8">optional</span><input name="note" maxlength="100" placeholder="Example: July minimum payment"></label>
        </div>
        <div class="modal-actions"><button type="submit" class="button">Save payment</button></div>
      </form>
    `);
  }

  function openExtraModal() {
    openModal(`
      <div class="modal-top"><h2>Recurring extra payment</h2><button class="close-modal" data-action="close-modal" aria-label="Close">×</button></div>
      <form id="extra-form">
        <p class="muted" style="margin-top:-6px">This amount is added to your total minimum payments every month and rolls into the next target debt as balances are paid off.</p>
        <label class="form-field">Extra amount each month<input name="extra" type="number" inputmode="decimal" min="0" step=".01" value="${appState.settings.extra || ""}" placeholder="0.00"></label>
        <div class="modal-actions"><button type="submit" class="button">Save extra amount</button></div>
      </form>
    `);
  }

  function openCycleModal() {
    openModal(`
      <div class="modal-top"><h2>Monthly funding schedule</h2><button class="close-modal" data-action="close-modal" aria-label="Close">×</button></div>
      <form id="cycle-form">
        <label class="form-field">Day of month you fund / plan payments<select name="cycleDay">${Array.from({length:28}, (_, index) => index + 1).map(day => `<option value="${day}" ${day === appState.settings.cycleDay ? "selected" : ""}>${ordinal(day)} of each month</option>`).join("")}</select></label>
        <div class="modal-actions"><button type="submit" class="button">Save schedule</button></div>
      </form>
    `);
  }

  function openOneTimeModal(itemId = null) {
    const item = appState.settings.oneTime.find(entry => entry.id === itemId);
    const values = item || { amount: "", month: appState.settings.start || currentMonthKey(), note: "" };
    openModal(`
      <div class="modal-top"><h2>${item ? "Edit one-time funding" : "Add one-time funding"}</h2><button class="close-modal" data-action="close-modal" aria-label="Close">×</button></div>
      <form id="one-time-form" data-id="${item?.id || ""}">
        <div class="form-grid">
          <div class="form-grid two">
            <label class="form-field">Amount<input name="amount" type="number" inputmode="decimal" required min=".01" step=".01" value="${values.amount}" placeholder="0.00"></label>
            <label class="form-field">Month<input name="month" type="month" required value="${values.month}"></label>
          </div>
          <label class="form-field">Note <span style="font-weight:500;color:#9aa4a8">optional</span><input name="note" maxlength="100" value="${escapeHtml(values.note)}" placeholder="Example: tax refund"></label>
        </div>
        <div class="modal-actions">
          ${item ? `<button class="button danger" type="button" data-action="delete-one-time" data-id="${item.id}">Delete</button>` : ""}
          <button class="button" type="submit">Save funding</button>
        </div>
      </form>
    `);
  }

  function openPriorityModal() {
    const current = appState.settings.strategy;
    openModal(`
      <div class="modal-top"><h2>Select an extra-payment priority</h2><button class="close-modal" data-action="close-modal" aria-label="Close">×</button></div>
      <div class="choice-list">
        <button class="choice-card ${current === "avalanche" ? "selected" : ""}" data-action="set-priority" data-strategy="avalanche">
          <span class="choice-icon">▦</span><span><strong>Debt Avalanche</strong><span>Prioritize the highest interest rate first.</span></span><span class="choice-chip">${current === "avalanche" ? "Selected" : "Select"}</span>
        </button>
        <button class="choice-card ${current === "snowball" ? "selected" : ""}" data-action="set-priority" data-strategy="snowball">
          <span class="choice-icon">◎</span><span><strong>Debt Snowball</strong><span>Prioritize the lowest balance first.</span></span><span class="choice-chip">${current === "snowball" ? "Selected" : "Select"}</span>
        </button>
        <button class="choice-card ${current === "custom" ? "selected" : ""}" data-action="open-custom-priority">
          <span class="choice-icon">☷</span><span><strong>Custom order</strong><span>Arrange the debts in your preferred payoff order.</span></span><span class="choice-chip">${current === "custom" ? "Selected" : "Select"}</span>
        </button>
      </div>
      ${activeDebts().length ? "" : `<p class="muted" style="margin:16px 0 0">Add debts before setting a priority.</p>`}
    `);
  }

  function openCustomPriorityModal() {
    const positions = new Map(appState.settings.customOrder.map((id, index) => [id, index]));
    const debts = [...activeDebts()].sort((a, b) => (positions.get(a.id) ?? 9999) - (positions.get(b.id) ?? 9999) || a.balance - b.balance);
    openModal(`
      <div class="modal-top"><h2>Custom payoff order</h2><button class="close-modal" data-action="close-modal" aria-label="Close">×</button></div>
      <p class="muted" style="margin-top:-7px">Use the arrows to move a debt earlier or later in the extra-payment order.</p>
      <div id="custom-order-list" class="choice-list">
        ${debts.map((debt, index) => `
          <div class="choice-card" style="grid-template-columns:35px 1fr auto">
            <span class="choice-icon" style="font-size:1.2rem">${index + 1}</span>
            <span><strong>${escapeHtml(debt.name)}</strong><span>${money.format(debt.balance)} · ${debt.apr.toFixed(2)}% APR</span></span>
            <span style="display:flex;gap:5px">
              <button class="button small secondary" data-action="custom-up" data-id="${debt.id}" ${index === 0 ? "disabled" : ""}>↑</button>
              <button class="button small secondary" data-action="custom-down" data-id="${debt.id}" ${index === debts.length - 1 ? "disabled" : ""}>↓</button>
            </span>
          </div>
        `).join("")}
      </div>
      <div class="modal-actions"><button class="button" data-action="save-custom-priority">Use custom order</button></div>
    `);
  }

  function openSettingsModal() {
    openModal(`
      <div class="modal-top"><h2>App settings</h2><button class="close-modal" data-action="close-modal" aria-label="Close">×</button></div>
      <div class="field-list">
        <button class="field-line" data-action="export-backup"><span class="label">Export backup</span><span class="value">JSON file <span class="chev">›</span></span></button>
        <button class="field-line" data-action="import-backup"><span class="label">Import backup</span><span class="value"><span class="chev">›</span></span></button>
        <button class="field-line" data-action="load-sample"><span class="label">Load sample data</span><span class="value"><span class="chev">›</span></span></button>
        <button class="field-line" data-action="clear-data"><span class="label" style="color:#bd4137">Delete all local data</span><span class="value"><span class="chev">›</span></span></button>
      </div>
      <p class="muted" style="font-size:.83rem;margin:18px 0 0">DebtWizard stores your data in this browser only. Back up your information after meaningful changes.</p>
    `);
  }

  function openScheduleModal() {
    const plan = calculatePlan();
    openModal(`
      <div class="modal-top"><h2>Monthly payoff table</h2><button class="close-modal" data-action="close-modal" aria-label="Close">×</button></div>
      <div style="overflow:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <thead><tr style="text-align:left;color:#718188;border-bottom:1px solid #e7ecee"><th style="padding:8px 5px">Month</th><th style="padding:8px 5px;text-align:right">Interest</th><th style="padding:8px 5px;text-align:right">Payment</th><th style="padding:8px 5px;text-align:right">Balance</th></tr></thead>
          <tbody>${plan.rows.slice(0, 60).map(row => `<tr style="border-bottom:1px solid #f0f2f3"><td style="padding:9px 5px">${monthLabel(row.date)}</td><td style="padding:9px 5px;text-align:right">${money.format(row.interest)}</td><td style="padding:9px 5px;text-align:right">${money.format(row.payment)}</td><td style="padding:9px 5px;text-align:right">${money.format(row.closing)}</td></tr>`).join("") || `<tr><td colspan="4" style="padding:16px">Add debts to create a schedule.</td></tr>`}</tbody>
        </table>
      </div>
    `);
  }

  function updateCustomOrderMove(id, direction) {
    const active = sortTargetList(activeDebts());
    const index = active.findIndex(item => item.id === id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= active.length) return;
    [active[index], active[swapIndex]] = [active[swapIndex], active[index]];
    appState.settings.customOrder = active.map(item => item.id);
    openCustomPriorityModal();
  }

  function exportBackup() {
    const payload = { ...appState, exportedAt: new Date().toISOString(), app: "DebtWizard" };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `debtwizard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    closeModal();
    showToast("Backup downloaded.");
  }

  function loadSampleData() {
    if (appState.debts.length && !confirm("Replace your current browser data with fictional sample accounts? Export a backup first if you want to preserve it.")) return;
    appState = normalizeState({
      settings: { strategy: "snowball", extra: 150, start: currentMonthKey(), cycleDay: 1 },
      debts: [
        { id: uid(), name: "Store Card", type: "Credit Card", balance: 850, originalBalance: 850, apr: 29.99, minimum: 45, dueDay: 12, limit: 1200, note: "" },
        { id: uid(), name: "Everyday Card", type: "Credit Card", balance: 3200, originalBalance: 3200, apr: 21.99, minimum: 105, dueDay: 24, limit: 4500, note: "" },
        { id: uid(), name: "Auto Loan", type: "Auto Loan", balance: 9600, originalBalance: 9600, apr: 6.25, minimum: 295, dueDay: 5, limit: 0, note: "" }
      ],
      payments: []
    });
    saveState("Sample debts loaded.");
    closeModal();
    currentPage = "home";
    render();
  }

  function deleteDebt(id) {
    const debt = appState.debts.find(item => item.id === id);
    if (!debt) return;
    if (!confirm(`Delete ${debt.name}? This removes the account and its planned payoff information from this browser.`)) return;
    appState.debts = appState.debts.filter(item => item.id !== id);
    appState.settings.customOrder = appState.settings.customOrder.filter(item => item !== id);
    saveState("Debt deleted.");
    closeModal();
    currentPage = "debts";
    detailId = null;
    render();
  }

  function handleClick(event) {
    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;
    const action = trigger.dataset.action;
    const id = trigger.dataset.id;

    if (action === "nav") {
      currentPage = trigger.dataset.page;
      detailId = null;
      closeModal();
      render();
    }
    if (action === "breakdown") {
      debtBreakdownMode = trigger.dataset.mode;
      render();
    }
    if (action === "add-debt") openDebtModal();
    if (action === "edit-debt") openDebtModal(id);
    if (action === "open-detail" && id) {
      currentPage = "detail";
      detailId = id;
      detailTab = "progress";
      render();
    }
    if (action === "back-debts") {
      currentPage = "debts";
      detailId = null;
      render();
    }
    if (action === "detail-tab") {
      detailTab = trigger.dataset.tab;
      render();
    }
    if (action === "record-payment") openPaymentModal(id);
    if (action === "priority") openPriorityModal();
    if (action === "set-priority") {
      appState.settings.strategy = trigger.dataset.strategy;
      saveState(`${trigger.dataset.strategy === "avalanche" ? "Debt Avalanche" : "Debt Snowball"} selected.`);
      closeModal();
      render();
    }
    if (action === "open-custom-priority") openCustomPriorityModal();
    if (action === "custom-up") updateCustomOrderMove(id, -1);
    if (action === "custom-down") updateCustomOrderMove(id, 1);
    if (action === "save-custom-priority") {
      appState.settings.strategy = "custom";
      saveState("Custom payoff order selected.");
      closeModal();
      render();
    }
    if (action === "edit-extra") openExtraModal();
    if (action === "edit-cycle") openCycleModal();
    if (action === "add-one-time") openOneTimeModal();
    if (action === "edit-one-time") openOneTimeModal(id);
    if (action === "delete-one-time") {
      appState.settings.oneTime = appState.settings.oneTime.filter(item => item.id !== id);
      saveState("One-time funding deleted.");
      closeModal();
      render();
    }
    if (action === "settings") openSettingsModal();
    if (action === "close-modal") closeModal();
    if (action === "export-backup") exportBackup();
    if (action === "import-backup") $("backup-input").click();
    if (action === "load-sample") loadSampleData();
    if (action === "clear-data") {
      if (confirm("Delete all debts, payment history, strategies, and local settings from this browser? This cannot be undone without a backup.")) {
        appState = defaultState();
        saveState("All local data deleted.");
        closeModal();
        currentPage = "home";
        render();
      }
    }
    if (action === "delete-debt") deleteDebt(id);
    if (action === "show-schedule") openScheduleModal();
  }

  function handleSubmit(event) {
    const form = event.target;
    if (form.id === "debt-form") {
      event.preventDefault();
      const data = new FormData(form);
      const id = form.dataset.id || uid();
      const existing = appState.debts.find(item => item.id === id);
      const balance = Math.max(0, number(data.get("balance")));
      const debt = {
        id,
        name: String(data.get("name") || "").trim(),
        type: String(data.get("type") || "Other"),
        balance,
        apr: Math.max(0, Math.min(100, number(data.get("apr")))),
        minimum: Math.max(0, number(data.get("minimum"))),
        dueDay: Math.max(0, Math.min(31, Math.floor(number(data.get("dueDay"))))),
        limit: Math.max(0, number(data.get("limit"))),
        note: String(data.get("note") || "").trim(),
        originalBalance: Math.max(balance, existing?.originalBalance || balance),
        createdAt: existing?.createdAt ?? Date.now()
      };
      if (!debt.name) return;
      if (existing) appState.debts = appState.debts.map(item => item.id === id ? debt : item);
      else appState.debts.push(debt);
      saveState(existing ? "Debt updated." : "Debt added.");
      closeModal();
      render();
    }

    if (form.id === "payment-form") {
      event.preventDefault();
      const data = new FormData(form);
      const debt = appState.debts.find(item => item.id === data.get("debtId"));
      if (!debt) return;
      const amount = Math.max(0, number(data.get("amount")));
      if (!amount) return showToast("Enter a payment amount greater than zero.");
      const applied = Math.min(amount, debt.balance);
      debt.balance = round(Math.max(0, debt.balance - applied));
      appState.payments.unshift({
        id: uid(),
        debtId: debt.id,
        name: debt.name,
        amount: round(applied),
        date: String(data.get("date") || new Date().toISOString().slice(0, 10)),
        note: String(data.get("note") || "").trim()
      });
      saveState("Payment recorded.");
      closeModal();
      render();
    }

    if (form.id === "extra-form") {
      event.preventDefault();
      appState.settings.extra = Math.max(0, number(new FormData(form).get("extra")));
      saveState("Extra payment updated.");
      closeModal();
      render();
    }

    if (form.id === "cycle-form") {
      event.preventDefault();
      appState.settings.cycleDay = Math.max(1, Math.min(28, Math.floor(number(new FormData(form).get("cycleDay"))) || 1));
      saveState("Funding schedule updated.");
      closeModal();
      render();
    }

    if (form.id === "one-time-form") {
      event.preventDefault();
      const data = new FormData(form);
      const item = {
        id: form.dataset.id || uid(),
        amount: Math.max(0, number(data.get("amount"))),
        month: String(data.get("month") || appState.settings.start),
        note: String(data.get("note") || "").trim()
      };
      if (!item.amount) return showToast("Enter a one-time funding amount.");
      const existingIndex = appState.settings.oneTime.findIndex(entry => entry.id === item.id);
      if (existingIndex >= 0) appState.settings.oneTime[existingIndex] = item;
      else appState.settings.oneTime.push(item);
      saveState("One-time funding saved.");
      closeModal();
      render();
    }
  }

  function handleInput(event) {
    if (event.target.id === "debt-search") {
      debtSearch = event.target.value;
      const cursor = event.target.selectionStart;
      render(true);
      const newInput = $("debt-search");
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(cursor, cursor);
      }
    }
  }

  function handleChange(event) {
    if (event.target.id === "debt-sort") {
      debtSort = event.target.value;
      render();
    }
  }

  $("screen").addEventListener("click", handleClick);
  $("tabbar").addEventListener("click", handleClick);
  $("modal-root").addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);

  $("backup-input").addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = normalizeState(JSON.parse(reader.result));
        if (confirm(`Replace this browser's data with ${incoming.debts.length} debt account(s) from the backup?`)) {
          appState = incoming;
          saveState("Backup imported.");
          closeModal();
          currentPage = "home";
          render();
        }
      } catch {
        showToast("That file is not a valid DebtWizard backup.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  });

  render();
})();
