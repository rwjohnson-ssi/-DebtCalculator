(() => {
  "use strict";

  const screen = document.getElementById("screen");
  if (!screen) return;

  function addStyles() {
    if (document.getElementById("utilization-reference-v3-styles")) return;
    const style = document.createElement("style");
    style.id = "utilization-reference-v3-styles";
    style.textContent = `
      /* Keep only the reference-style gauge. */
      .utilization-card .utilization-readable-scale,
      .utilization-card .utilization-threshold-key,
      .utilization-card .utilization-reference-placeholder {
        display: none !important;
      }
      .utilization-card .utilization-gauge-wrap {
        min-height: 218px;
        margin: 0;
      }
      .utilization-card .utilization-gauge {
        width: min(100%, 345px);
      }
      .utilization-card .utilization-gauge-value {
        fill: #0f5067;
        font-size: 31px;
        font-weight: 900;
        letter-spacing: -1.2px;
      }
      .utilization-card .utilization-gauge-subvalue {
        fill: #204e60;
        font-size: 13px;
        font-weight: 850;
      }
      .utilization-card .utilization-gauge-caption {
        fill: #6c777b;
        font-size: 11px;
        font-weight: 700;
      }
      .utilization-card .utilization-reference-label {
        fill: #58676d;
        font-size: 10px;
        font-weight: 900;
      }
      .utilization-card .utilization-kicker {
        display: none !important;
      }
      .utilization-card .utilization-status {
        margin-top: 10px;
      }
      @media (max-width: 390px) {
        .utilization-card .utilization-gauge-wrap { min-height: 198px; }
      }
    `;
    document.head.appendChild(style);
  }

  function numberFromText(value) {
    const parsed = Number.parseFloat(String(value || "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getTexts(card) {
    const oldValue = card.querySelector(".utilization-gauge-value")?.textContent || "0%";
    const oldSubvalue = card.querySelector(".utilization-gauge-subvalue")?.textContent || "";
    const oldCaption = card.querySelector(".utilization-gauge-caption")?.textContent || "credit utilized";
    return {
      percent: Math.max(0, Math.min(100, numberFromText(oldValue))),
      valueLabel: oldValue,
      subvalue: oldSubvalue,
      caption: oldCaption
    };
  }

  function referenceGauge({ percent, valueLabel, subvalue, caption }) {
    const progress = Math.max(0, Math.min(100, percent));
    return `<svg class="utilization-gauge" viewBox="0 0 340 194" role="img" aria-label="${valueLabel} credit utilization">
      <path d="M 48 158 A 122 122 0 0 1 292 158" fill="none" stroke="#ededed" stroke-width="34" pathLength="100"/>
      <path d="M 48 158 A 122 122 0 0 1 292 158" fill="none" stroke="#b6b7b8" stroke-width="34" pathLength="100" stroke-dasharray="${progress} 100"/>
      <path d="M 37 158 A 133 133 0 0 1 303 158" fill="none" stroke="#42bd64" stroke-width="4" stroke-linecap="round" pathLength="100" stroke-dasharray="30 70"/>
      <path d="M 37 158 A 133 133 0 0 1 303 158" fill="none" stroke="#f1bc37" stroke-width="4" stroke-linecap="round" pathLength="100" stroke-dasharray="30 70" stroke-dashoffset="-30"/>
      <path d="M 37 158 A 133 133 0 0 1 303 158" fill="none" stroke="#ee6d64" stroke-width="4" stroke-linecap="round" pathLength="100" stroke-dasharray="40 60" stroke-dashoffset="-60"/>
      <text class="utilization-reference-label" x="29" y="165" text-anchor="middle">0%</text>
      <text class="utilization-reference-label" x="87" y="61" text-anchor="middle">30%</text>
      <text class="utilization-reference-label" x="250" y="61" text-anchor="middle">60%</text>
      <text class="utilization-reference-label" x="311" y="165" text-anchor="middle">100%</text>
      <text class="utilization-gauge-value" x="170" y="122" text-anchor="middle">${valueLabel}</text>
      <text class="utilization-gauge-subvalue" x="170" y="143" text-anchor="middle">${subvalue}</text>
      <text class="utilization-gauge-caption" x="170" y="163" text-anchor="middle">${caption}</text>
    </svg>`;
  }

  function removeDuplicateBlocks(card) {
    card.querySelectorAll(".utilization-threshold-key").forEach(node => node.remove());

    // Keep a hidden marker so an older cached design script sees its marker
    // and does not re-insert its separate utilization scale.
    let marker = card.querySelector("[data-readable-utilization-scale]");
    if (marker) {
      marker.className = "utilization-reference-placeholder";
      marker.textContent = "";
      marker.setAttribute("aria-hidden", "true");
    } else {
      marker = document.createElement("span");
      marker.className = "utilization-reference-placeholder";
      marker.setAttribute("data-readable-utilization-scale", "");
      marker.setAttribute("aria-hidden", "true");
      const wrap = card.querySelector(".utilization-gauge-wrap");
      if (wrap) wrap.insertAdjacentElement("afterend", marker);
    }

    card.querySelectorAll(".utilization-readable-scale").forEach(node => {
      if (node !== marker) node.remove();
    });
    card.querySelectorAll(".utilization-kicker").forEach(node => node.remove());
  }

  function enhanceGauge(card) {
    const wrap = card.querySelector(".utilization-gauge-wrap");
    if (!wrap) return;

    if (card.dataset.referenceGauge !== "true") {
      const values = getTexts(card);
      card.dataset.referenceGauge = "true";
      wrap.innerHTML = referenceGauge(values);
    }
    removeDuplicateBlocks(card);
  }

  function render() {
    addStyles();
    screen.querySelectorAll(".utilization-card").forEach(enhanceGauge);
  }

  let queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      render();
    });
  }

  new MutationObserver(queue).observe(screen, { childList: true, subtree: true });
  queue();
})();
