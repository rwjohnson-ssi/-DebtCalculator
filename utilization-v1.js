(() => {
  "use strict";

  const STORAGE_KEY = "debt-calculator-v2";
  const screen = document.getElementById("screen");
  if (!screen) return;

  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const number = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));

  function injectStyles() {
    if (document.getElementById("debtwizard-utilization-styles")) return;
    const style = document.createElement("style");
    style.id = "debtwizard-utilization-styles";
    style.textContent = `
      .utilization-section { overflow: hidden; }
      .utilization-copy { margin:-6px 0 14px; color:#89959a; font-size:.84rem; line-height:1.34; }
      .utilization-card { padding:16px; border:1px solid #dfecef; border-radius:17px; background:#fff; box-shadow:0 8px 18px rgba(29,83,98,.05); }
      .utilization-gauge-wrap { position:relative; display:grid; place-items:center; min-height:186px; }
      .utilization-gauge { width:min(100%,340px); height:auto; overflow:visible; }
      .utilization-gauge-value { fill:#124e66; font-size:29px; font-weight:850; letter-spacing:-1.1px; }
      .utilization-gauge-subvalue { fill:#3b5864; font-size:13px; font-weight:750; }
      .utilization-gauge-caption { fill:#7f8b90; font-size:11px; font-weight:650; }
      .utilization-tick { fill:#89969a; font-size:10px; font-weight:750; }
      .utilization-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:3px; }
      .utilization-stat { min-width:0; padding:10px 8px; border-radius:11px; background:#f5fafb; text-align:center; }
      .utilization-stat span { display:block; color:#869499; font-size:.71rem; line-height:1.15; }
      .utilization-stat strong { display:block; margin-top:4px; color:#385159; font-size:.92rem; line-height:1.08; font-weight:850; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .utilization-status { display:inline-flex; align-items:center; gap:6px; margin-top:13px; color:#607278; font-size:.8rem; font-weight:750; }
      .utilization-status-dot { width:8px; height:8px; border-radius:50%; background:#51bf72; }
      .utilization-status.warn .utilization-status-dot { background:#f2b93d; }
      .utilization-status.high .utilization-status-dot { background:#e7645f; }
      .utilization-detail-layout { display:grid; grid-template-columns:minmax(0,1.18fr) minmax(112px,.82fr); align-items:center; gap:8px; }
      .utilization-detail-layout .utilization-gauge-wrap { min-height:156px; }
      .utilization-detail-layout .utilization-gauge-value { font-size:26px; }
      .utilization-detail-layout .utilization-gauge-subvalue { font-size:11px; }
      .utilization-detail-layout .utilization-gauge-caption { font-size:10px; }
      .utilization-detail-facts { display:grid; gap:11px; padding:4px 0; }
      .utilization-detail-facts div { display:grid; gap:2px; }
      .utilization-detail-facts span { color:#7c898e; font-size:.76rem; }
      .utilization-detail-facts strong { color:#3b484e; font-size:1rem; font-weight:850; letter-spacing:-.025em; }
      .utilization-empty { padding:15px; border:1px dashed #d7e2e5; border-radius:13px; color:#7c898d; font-size:.86rem; line-height:1.4; background:#fcfefe; }
      @media (max-width:390px) {
        .utilization-card { padding:12px; }
        .utilization-detail-layout { grid-template-columns:1fr; }
        .utilization-detail-layout .utilization-gauge-wrap { min-height:148px; }
        .utilization-detail-facts { grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; text-align:center; }
        .utilization-detail-facts strong { font-size:.86rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      }
    `;
    document.head.appendChild(style);
  }

  function getState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return state && typeof state === "object" ? state : null;
    } catch {
      return null;
    }
  }

  function revolvingAccounts(state) {
    return (state?.debts || []).filter(debt => {
      const type = String(debt.type || "").toLowerCase();
      return type === "credit card" && number(debt.limit) > 0;
    });
  }

  function utilization(balance, limit) {
    if (number(limit) <= 0) return 0;
    return Math.max(0, number(balance) / number(limit) * 100);
  }

  function status(percent) {
    if (percent <= 30) return { label: "Excellent range", className: "" };
    if (percent <= 60) return { label: "Moderate utilization", className: "warn" };
    return { label: "High utilization", className: "high" };
  }

  function gauge(percent, balance, limit, compact = false) {
    const capped = Math.max(0, Math.min(100, percent));
    const color = percent <= 30 ? "#52bf70" : percent <= 60 ? "#f4bd40" : "#ea685f";
    const label = `${Math.round(percent)}%`;
    const sub = `${money.format(balance)} / ${money.format(limit)}`;
    const suffix = compact ? "utilized" : "credit utilized";
    return `<svg class="utilization-gauge" viewBox="0 0 320 176" role="img" aria-label="${label} credit utilization">
      <path d="M 34 143 A 126 126 0 0 1 286 143" fill="none" stroke="#edf0f0" stroke-width="25" stroke-linecap="butt" pathLength="100"/>
      <path d="M 34 143 A 126 126 0 0 1 286 143" fill="none" stroke="#56be6e" stroke-width="5" stroke-linecap="round" stroke-dasharray="30 70" pathLength="100"/>
      <path d="M 34 143 A 126 126 0 0 1 286 143" fill="none" stroke="#f3c24a" stroke-width="5" stroke-linecap="round" stroke-dasharray="30 70" stroke-dashoffset="-30" pathLength="100"/>
      <path d="M 34 143 A 126 126 0 0 1 286 143" fill="none" stroke="#ee7168" stroke-width="5" stroke-linecap="round" stroke-dasharray="40 60" stroke-dashoffset="-60" pathLength="100"/>
      <path d="M 34 143 A 126 126 0 0 1 286 143" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="butt" stroke-dasharray="${capped} 100" pathLength="100"/>
      <text class="utilization-tick" x="22" y="151">0%</text>
      <text class="utilization-tick" x="87" y="43">30%</text>
      <text class="utilization-tick" x="214" y="43">60%</text>
      <text class="utilization-tick" x="286" y="151">100%</text>
      <text class="utilization-gauge-value" x="160" y="103" text-anchor="middle">${label}</text>
      <text class="utilization-gauge-subvalue" x="160" y="124" text-anchor="middle">${sub}</text>
      <text class="utilization-gauge-caption" x="160" y="144" text-anchor="middle">${suffix}</text>
    </svg>`;
  }

  function globalSection(accounts) {
    const balance = accounts.reduce((sum, debt) => sum + number(debt.balance), 0);
    const limit = accounts.reduce((sum, debt) => sum + number(debt.limit), 0);
    const percent = utilization(balance, limit);
    const available = Math.max(0, limit - balance);
    const meterStatus = status(percent);

    return `<section class="section utilization-section" data-utilization-global>
      <h2 class="section-title">Overall credit utilization</h2>
      <p class="utilization-copy">This includes Credit Card debts with a credit limit entered.</p>
      <article class="utilization-card">
        <div class="utilization-gauge-wrap">${gauge(percent, balance, limit)}</div>
        <div class="utilization-stats">
          <div class="utilization-stat"><span>Credit used</span><strong>${money.format(balance)}</strong></div>
          <div class="utilization-stat"><span>Total limits</span><strong>${money.format(limit)}</strong></div>
          <div class="utilization-stat"><span>Available</span><strong>${money.format(available)}</strong></div>
        </div>
        <div class="utilization-status ${meterStatus.className}"><span class="utilization-status-dot"></span>${meterStatus.label} · ${accounts.length} account${accounts.length === 1 ? "" : "s"} included</div>
      </article>
    </section>`;
  }

  function detailSection(debt) {
    const balance = number(debt.balance);
    const limit = number(debt.limit);
    const percent = utilization(balance, limit);
    const available = Math.max(0, limit - balance);
    const meterStatus = status(percent);

    return `<section class="section utilization-section" data-utilization-detail="${escapeHtml(debt.id)}">
      <h2 class="section-title">Credit utilization</h2>
      <p class="utilization-copy">Current balance compared with this card’s available credit limit.</p>
      <article class="utilization-card">
        <div class="utilization-detail-layout">
          <div class="utilization-gauge-wrap">${gauge(percent, balance, limit, true)}</div>
          <div class="utilization-detail-facts">
            <div><span>Balance</span><strong>${money.format(balance)}</strong></div>
            <div><span>Credit limit</span><strong>${money.format(limit)}</strong></div>
            <div><span>Available credit</span><strong>${money.format(available)}</strong></div>
          </div>
        </div>
        <div class="utilization-status ${meterStatus.className}"><span class="utilization-status-dot"></span>${meterStatus.label}</div>
      </article>
    </section>`;
  }

  function debtsPage() {
    const title = screen.querySelector(".hero-title")?.textContent.trim();
    return title === "Debts" && !screen.querySelector(".detail-title");
  }

  function detailProgressPage() {
    const detail = screen.querySelector(".detail-title");
    const activeTab = screen.querySelector(".hero-tabs button.active")?.textContent.trim();
    return !!detail && activeTab === "Progress";
  }

  function insertGlobal(state) {
    if (!debtsPage() || screen.querySelector("[data-utilization-global]")) return;
    const accounts = revolvingAccounts(state);
    const anchor = screen.querySelector(".donut-layout")?.closest("section.section");
    if (!anchor) return;

    if (!accounts.length) {
      anchor.insertAdjacentHTML("afterend", `<section class="section utilization-section" data-utilization-global><h2 class="section-title">Overall credit utilization</h2><div class="utilization-empty">Add a credit limit to any Credit Card debt to see your overall credit utilization.</div></section>`);
      return;
    }
    anchor.insertAdjacentHTML("afterend", globalSection(accounts));
  }

  function insertDetail(state) {
    if (!detailProgressPage()) return;
    const name = screen.querySelector(".detail-title")?.textContent.trim();
    const debt = (state.debts || []).find(item => String(item.name || "").trim() === name);
    if (!debt || String(debt.type || "").toLowerCase() !== "credit card" || number(debt.limit) <= 0) return;
    if (screen.querySelector(`[data-utilization-detail="${String(debt.id)}"]`)) return;

    const anchor = screen.querySelector(".progress-grid")?.closest("section.section");
    if (anchor) anchor.insertAdjacentHTML("afterend", detailSection(debt));
  }

  function render() {
    injectStyles();
    const state = getState();
    if (!state) return;
    insertGlobal(state);
    insertDetail(state);
  }

  let pending = false;
  function queue() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      render();
    });
  }

  new MutationObserver(queue).observe(screen, { childList: true, subtree: true });
  queue();
})();
