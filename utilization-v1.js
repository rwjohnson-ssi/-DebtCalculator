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
      .utilization-section { overflow:hidden; }
      .utilization-copy { margin:-6px 0 14px; color:#65757c; font-size:.86rem; line-height:1.38; }
      .utilization-card { padding:17px; border:1px solid #d6e6ea; border-radius:18px; background:#fff; box-shadow:0 9px 20px rgba(29,83,98,.06); }
      .utilization-kicker { margin:0 0 2px; color:#407789; font-size:.75rem; font-weight:850; letter-spacing:.1em; text-transform:uppercase; text-align:center; }
      .utilization-gauge-wrap { position:relative; display:grid; place-items:center; min-height:180px; }
      .utilization-gauge { width:min(100%,340px); height:auto; overflow:visible; }
      .utilization-gauge-value { fill:#103f55; font-size:34px; font-weight:900; letter-spacing:-1.5px; }
      .utilization-gauge-subvalue { fill:#294f5f; font-size:14px; font-weight:850; }
      .utilization-gauge-caption { fill:#64757c; font-size:11px; font-weight:750; }
      .utilization-gauge-badge { fill:#fff; stroke:#d7e9ed; stroke-width:1; }
      .utilization-gauge-dot { stroke:#fff; stroke-width:3; }
      .utilization-threshold-key { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; margin:1px 0 13px; }
      .utilization-threshold { min-width:0; padding:8px 6px; border-radius:10px; text-align:center; font-size:.72rem; line-height:1.22; font-weight:800; }
      .utilization-threshold strong { display:block; margin-bottom:2px; font-size:.78rem; }
      .utilization-threshold.good { color:#16683b; background:#e9faef; border:1px solid #b9e9c9; }
      .utilization-threshold.warn { color:#855507; background:#fff7dd; border:1px solid #f5d880; }
      .utilization-threshold.high { color:#a53630; background:#fff0ef; border:1px solid #f2b6b1; }
      .utilization-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:4px; }
      .utilization-stat { min-width:0; padding:11px 8px; border-radius:12px; background:#edf8fa; border:1px solid #dcedf0; text-align:center; }
      .utilization-stat span { display:block; color:#486871; font-size:.72rem; line-height:1.15; font-weight:750; }
      .utilization-stat strong { display:block; margin-top:4px; color:#173f4d; font-size:.95rem; line-height:1.08; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .utilization-status { display:inline-flex; align-items:center; gap:7px; margin-top:14px; padding:7px 10px; border-radius:999px; color:#1b643a; background:#edfbf1; border:1px solid #c6edd2; font-size:.8rem; font-weight:850; }
      .utilization-status-dot { width:8px; height:8px; border-radius:50%; background:#2fa861; }
      .utilization-status.warn { color:#805707; background:#fff8e6; border-color:#f3d98f; }
      .utilization-status.warn .utilization-status-dot { background:#e5a91e; }
      .utilization-status.high { color:#a2322d; background:#fff0ef; border-color:#f2bab5; }
      .utilization-status.high .utilization-status-dot { background:#d9534c; }
      .utilization-detail-layout { display:grid; grid-template-columns:minmax(0,1.18fr) minmax(112px,.82fr); align-items:center; gap:8px; }
      .utilization-detail-layout .utilization-gauge-wrap { min-height:150px; }
      .utilization-detail-layout .utilization-gauge-value { font-size:29px; }
      .utilization-detail-layout .utilization-gauge-subvalue { font-size:11px; }
      .utilization-detail-layout .utilization-gauge-caption { font-size:10px; }
      .utilization-detail-layout .utilization-threshold-key { display:none; }
      .utilization-detail-facts { display:grid; gap:11px; padding:4px 0; }
      .utilization-detail-facts div { display:grid; gap:2px; }
      .utilization-detail-facts span { color:#536e78; font-size:.76rem; font-weight:700; }
      .utilization-detail-facts strong { color:#173f4d; font-size:1rem; font-weight:900; letter-spacing:-.025em; }
      .utilization-empty { padding:15px; border:1px dashed #c8dce1; border-radius:13px; color:#5e7076; font-size:.87rem; line-height:1.42; background:#fcfefe; }
      @media (max-width:390px) {
        .utilization-card { padding:13px; }
        .utilization-threshold { padding:7px 4px; font-size:.67rem; }
        .utilization-detail-layout { grid-template-columns:1fr; }
        .utilization-detail-layout .utilization-gauge-wrap { min-height:142px; }
        .utilization-detail-facts { grid-template-columns:repeat(3,minmax(0,1fr); gap:6px; text-align:center; }
        .utilization-detail-facts strong { font-size:.86rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      }
    `;
    document.head.appendChild(style);
  }

  function getState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return state && typeof state === "object" ? state : null;
    } catch { return null; }
  }

  function revolvingAccounts(state) {
    return (state?.debts || []).filter(debt => String(debt.type || "").toLowerCase() === "credit card" && number(debt.limit) > 0);
  }

  function utilization(balance, limit) {
    if (number(limit) <= 0) return 0;
    return Math.max(0, number(balance) / number(limit) * 100);
  }

  function status(percent) {
    if (percent <= 30) return { label:"Excellent range", className:"" };
    if (percent <= 60) return { label:"Moderate utilization", className:"warn" };
    return { label:"High utilization", className:"high" };
  }

  function gauge(percent, balance, limit, compact = false) {
    const capped = Math.max(0, Math.min(100, percent));
    const color = percent <= 30 ? "#2fa861" : percent <= 60 ? "#e6ad26" : "#d9534c";
    const label = `${Math.round(percent)}%`;
    const sub = `${money.format(balance)} / ${money.format(limit)}`;
    const suffix = compact ? "utilized" : "credit utilized";
    const dotX = 34 + (252 * capped / 100);
    return `<svg class="utilization-gauge" viewBox="0 0 320 166" role="img" aria-label="${label} credit utilization">
      <path d="M 34 135 A 126 126 0 0 1 286 135" fill="none" stroke="#eef2f3" stroke-width="27" stroke-linecap="butt" pathLength="100"/>
      <path d="M 34 135 A 126 126 0 0 1 286 135" fill="none" stroke="#c5efd2" stroke-width="27" stroke-linecap="butt" stroke-dasharray="30 70" pathLength="100"/>
      <path d="M 34 135 A 126 126 0 0 1 286 135" fill="none" stroke="#ffe7a8" stroke-width="27" stroke-linecap="butt" stroke-dasharray="30 70" stroke-dashoffset="-30" pathLength="100"/>
      <path d="M 34 135 A 126 126 0 0 1 286 135" fill="none" stroke="#ffd1cd" stroke-width="27" stroke-linecap="butt" stroke-dasharray="40 60" stroke-dashoffset="-60" pathLength="100"/>
      <path d="M 34 135 A 126 126 0 0 1 286 135" fill="none" stroke="#103f55" stroke-width="8" stroke-linecap="round" stroke-dasharray="${capped} 100" pathLength="100"/>
      <circle class="utilization-gauge-dot" cx="${dotX}" cy="135" r="0" fill="${color}"/>
      <rect class="utilization-gauge-badge" x="99" y="57" width="122" height="79" rx="20"/>
      <text class="utilization-gauge-value" x="160" y="92" text-anchor="middle">${label}</text>
      <text class="utilization-gauge-subvalue" x="160" y="113" text-anchor="middle">${sub}</text>
      <text class="utilization-gauge-caption" x="160" y="128" text-anchor="middle">${suffix}</text>
    </svg>`;
  }

  function thresholdKey() {
    return `<div class="utilization-threshold-key" aria-label="Credit utilization ranges">
      <div class="utilization-threshold good"><strong>0–30%</strong>Excellent</div>
      <div class="utilization-threshold warn"><strong>31–60%</strong>Moderate</div>
      <div class="utilization-threshold high"><strong>61%+</strong>High</div>
    </div>`;
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
        <p class="utilization-kicker">Current revolving balance</p>
        <div class="utilization-gauge-wrap">${gauge(percent, balance, limit)}</div>
        ${thresholdKey()}
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
    return screen.querySelector(".hero-title")?.textContent.trim() === "Debts" && !screen.querySelector(".detail-title");
  }

  function detailProgressPage() {
    return !!screen.querySelector(".detail-title") && screen.querySelector(".hero-tabs button.active")?.textContent.trim() === "Progress";
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
    requestAnimationFrame(() => { pending = false; render(); });
  }

  new MutationObserver(queue).observe(screen, { childList:true, subtree:true });
  queue();
})();
