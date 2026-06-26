(() => {
  "use strict";

  const screen = document.getElementById("screen");
  if (!screen) return;

  function addStyles() {
    if (document.getElementById("utilization-design-v2-styles")) return;
    const style = document.createElement("style");
    style.id = "utilization-design-v2-styles";
    style.textContent = `
      /* Remove tiny percentage labels that overlap the colored arc. */
      .utilization-gauge .utilization-tick,
      .utilization-gauge text.utilization-tick {
        display: none !important;
      }

      .utilization-readable-scale {
        margin: 0 0 14px;
        padding: 12px;
        border: 1px solid #dce8eb;
        border-radius: 13px;
        background: #f8fbfc;
      }
      .utilization-readable-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin: 0 0 10px;
        color: #193f4e;
        font-size: .85rem;
        font-weight: 900;
      }
      .utilization-readable-current {
        padding: 4px 8px;
        border-radius: 999px;
        color: #8d2924;
        background: #fff0ef;
        border: 1px solid #efbbb7;
        font-size: .75rem;
        font-weight: 900;
        white-space: nowrap;
      }
      .utilization-readable-meter {
        display: grid;
        grid-template-columns: 30fr 30fr 40fr;
        height: 12px;
        overflow: hidden;
        border-radius: 999px;
        border: 1px solid #d4e1e4;
        background: #fff;
      }
      .utilization-readable-meter span:nth-child(1) { background: #47b96c; }
      .utilization-readable-meter span:nth-child(2) { background: #f0ba37; }
      .utilization-readable-meter span:nth-child(3) { background: #e5615a; }
      .utilization-readable-labels {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        margin-top: 7px;
        color: #344d57;
        font-size: .76rem;
        font-weight: 850;
      }
      .utilization-readable-labels span:nth-child(2),
      .utilization-readable-labels span:nth-child(3) { text-align: center; }
      .utilization-readable-labels span:last-child { text-align: right; }
      .utilization-readable-explainer {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 7px;
        margin-top: 11px;
      }
      .utilization-readable-explainer div {
        min-width: 0;
        padding: 8px 6px;
        border-radius: 9px;
        color: #233f49;
        font-size: .7rem;
        line-height: 1.22;
        font-weight: 800;
        text-align: center;
      }
      .utilization-readable-explainer strong { display: block; font-size: .78rem; }
      .utilization-readable-explainer .good { background: #e9f9ee; border: 1px solid #c2e8cc; }
      .utilization-readable-explainer .moderate { background: #fff7df; border: 1px solid #f4d98d; }
      .utilization-readable-explainer .high { background: #fff0ef; border: 1px solid #efbdb9; }
      @media (max-width:390px) {
        .utilization-readable-scale { padding: 10px; }
        .utilization-readable-explainer { gap: 5px; }
        .utilization-readable-explainer div { padding: 7px 3px; font-size: .64rem; }
        .utilization-readable-explainer strong { font-size: .71rem; }
      }
    `;
    document.head.appendChild(style);
  }

  function currentPercent(card) {
    const text = card.querySelector(".utilization-gauge-value")?.textContent || "";
    const value = Number.parseFloat(text.replace(/[^0-9.]/g, ""));
    return Number.isFinite(value) ? value : 0;
  }

  function severity(percent) {
    if (percent <= 30) return { label: "Excellent", className: "good" };
    if (percent <= 60) return { label: "Moderate", className: "moderate" };
    return { label: "High", className: "high" };
  }

  function readableScale(percent) {
    const level = severity(percent);
    return `<div class="utilization-readable-scale" data-readable-utilization-scale>
      <div class="utilization-readable-title">
        <span>Utilization range</span>
        <span class="utilization-readable-current">${Math.round(percent)}% · ${level.label}</span>
      </div>
      <div class="utilization-readable-meter" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="utilization-readable-labels"><span>0%</span><span>30%</span><span>60%</span><span>100%</span></div>
      <div class="utilization-readable-explainer">
        <div class="good"><strong>0–30%</strong>Excellent</div>
        <div class="moderate"><strong>31–60%</strong>Moderate</div>
        <div class="high"><strong>61%+</strong>High</div>
      </div>
    </div>`;
  }

  function enhance() {
    addStyles();
    screen.querySelectorAll(".utilization-card").forEach(card => {
      if (card.querySelector("[data-readable-utilization-scale]")) return;
      const gauge = card.querySelector(".utilization-gauge-wrap");
      if (!gauge) return;
      const percent = currentPercent(card);
      gauge.insertAdjacentHTML("afterend", readableScale(percent));
    });
  }

  let queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      enhance();
    });
  }

  new MutationObserver(queue).observe(screen, { childList: true, subtree: true });
  queue();
})();
