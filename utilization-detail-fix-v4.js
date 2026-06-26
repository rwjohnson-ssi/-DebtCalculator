(() => {
  "use strict";

  const screen = document.getElementById("screen");
  if (!screen) return;

  function addStyles() {
    if (document.getElementById("utilization-detail-fix-v4-styles")) return;
    const style = document.createElement("style");
    style.id = "utilization-detail-fix-v4-styles";
    style.textContent = `
      /* Individual credit-card page: one clean, stacked utilization card. */
      [data-utilization-detail] .utilization-detail-layout {
        display: block !important;
      }
      [data-utilization-detail] .utilization-gauge-wrap {
        display: grid !important;
        place-items: center !important;
        min-height: 205px !important;
        width: 100% !important;
        margin: 0 !important;
      }
      [data-utilization-detail] .utilization-gauge {
        width: min(100%, 335px) !important;
        margin: 0 auto !important;
      }
      [data-utilization-detail] .utilization-detail-facts {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 8px !important;
        margin: 8px 0 0 !important;
        padding: 0 !important;
      }
      [data-utilization-detail] .utilization-detail-facts div {
        min-width: 0;
        padding: 10px 7px !important;
        border: 1px solid #dcedf0;
        border-radius: 12px;
        background: #edf8fa;
        text-align: center;
      }
      [data-utilization-detail] .utilization-detail-facts span {
        color: #486871 !important;
        font-size: .70rem !important;
        line-height: 1.15;
        font-weight: 750 !important;
      }
      [data-utilization-detail] .utilization-detail-facts strong {
        display: block;
        margin-top: 4px;
        overflow: hidden;
        color: #173f4d !important;
        font-size: .90rem !important;
        font-weight: 900 !important;
        line-height: 1.1;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      [data-utilization-detail] .utilization-status {
        margin-top: 13px !important;
      }
      [data-utilization-detail] .utilization-readable-scale,
      [data-utilization-detail] .utilization-threshold-key,
      [data-utilization-detail] .utilization-reference-placeholder {
        display: none !important;
      }
      @media (max-width: 390px) {
        [data-utilization-detail] .utilization-gauge-wrap {
          min-height: 184px !important;
        }
        [data-utilization-detail] .utilization-detail-facts {
          gap: 6px !important;
        }
        [data-utilization-detail] .utilization-detail-facts div {
          padding: 9px 4px !important;
        }
        [data-utilization-detail] .utilization-detail-facts strong {
          font-size: .80rem !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function removeLegacyDetailBlocks(card) {
    const wrap = card.querySelector(".utilization-gauge-wrap");
    if (!wrap) return;

    // Older cached scripts recognize this marker and will not create their
    // separate range panel. Convert the old panel into a hidden marker.
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
      wrap.insertAdjacentElement("afterend", marker);
    }

    card.querySelectorAll(".utilization-readable-scale, .utilization-threshold-key").forEach(node => {
      if (node !== marker) node.remove();
    });
  }

  function repair() {
    addStyles();
    screen.querySelectorAll("[data-utilization-detail]").forEach(removeLegacyDetailBlocks);
  }

  let queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      repair();
    });
  }

  new MutationObserver(queue).observe(screen, { childList: true, subtree: true });
  queue();
})();
