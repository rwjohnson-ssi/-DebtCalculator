(() => {
  "use strict";

  const root = document.getElementById("modal-root");
  if (!root) return;

  function addStyles() {
    if (document.getElementById("paycheck-form-overlap-fix-v4-styles")) return;
    const style = document.createElement("style");
    style.id = "paycheck-form-overlap-fix-v4-styles";
    style.textContent = `
      /* The native iPhone date input has a wide intrinsic minimum. On phone
         widths, stack payroll fields so neither control can overlap. */
      @media (max-width: 560px) {
        #paycheck-overlay .paycheck-config {
          display: block !important;
          padding: 16px !important;
        }
        #paycheck-overlay .paycheck-two {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 14px !important;
          width: 100% !important;
        }
        #paycheck-overlay .paycheck-two > .paycheck-field {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 6px !important;
          min-width: 0 !important;
          width: 100% !important;
        }
        #paycheck-overlay .paycheck-two > .paycheck-field > input,
        #paycheck-overlay .paycheck-two > .paycheck-field > select,
        #paycheck-overlay input[type="date"] {
          display: block !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          min-inline-size: 0 !important;
          box-sizing: border-box !important;
        }
        #paycheck-overlay input[type="date"] {
          -webkit-appearance: none;
          appearance: none;
        }
        #paycheck-overlay .paycheck-amount-helper {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          grid-template-areas:
            "title"
            "actions"
            "copy" !important;
          gap: 8px !important;
          width: 100% !important;
          margin-top: 14px !important;
        }
        #paycheck-overlay .paycheck-amount-helper .paycheck-quick-add {
          justify-content: flex-start !important;
          flex-wrap: wrap !important;
        }
        #paycheck-overlay .paycheck-config > .paycheck-empty {
          display: block !important;
          width: 100% !important;
          margin-top: 14px !important;
          box-sizing: border-box !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function apply() {
    addStyles();
    const form = root.querySelector("#paycheck-form");
    const pair = form?.querySelector(".paycheck-two");
    if (!pair) return;
    pair.classList.add("paycheck-fields-stacked-mobile");
  }

  new MutationObserver(apply).observe(root, { childList: true, subtree: true });
  apply();
})();
