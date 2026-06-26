(() => {
  "use strict";

  const root = document.getElementById("modal-root");
  if (!root) return;

  function installStyles() {
    if (document.getElementById("paycheck-form-layout-fix-v3-styles")) return;
    const style = document.createElement("style");
    style.id = "paycheck-form-layout-fix-v3-styles";
    style.textContent = `
      /* Keep the payroll setup card on a clean two-column grid. */
      #paycheck-overlay .paycheck-config {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 14px !important;
        padding: 16px !important;
      }
      #paycheck-overlay .paycheck-two {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 12px !important;
        align-items: start !important;
        width: 100% !important;
      }
      #paycheck-overlay .paycheck-two > .paycheck-field {
        min-width: 0 !important;
        width: 100% !important;
      }
      #paycheck-overlay .paycheck-two > .paycheck-field > input,
      #paycheck-overlay .paycheck-two > .paycheck-field > select {
        width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      #paycheck-overlay .paycheck-two > .paycheck-field {
        color: #586b72 !important;
        font-size: .78rem !important;
        line-height: 1.15 !important;
      }
      #paycheck-overlay .paycheck-two > .paycheck-field input {
        margin-top: 1px !important;
      }

      /* Move the optional amount controls below both fields instead of leaving
         them trapped in the right column. */
      #paycheck-overlay .paycheck-amount-helper {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-areas:
          "title actions"
          "copy copy";
        align-items: center;
        column-gap: 12px;
        row-gap: 7px;
        width: 100%;
        min-width: 0;
        padding: 11px 12px;
        border: 1px solid #d6edf1;
        border-radius: 12px;
        background: #f5fcfd;
        box-sizing: border-box;
      }
      #paycheck-overlay .paycheck-amount-helper-title {
        grid-area: title;
        color: #1b6478;
        font-size: .78rem;
        font-weight: 900;
        line-height: 1.2;
      }
      #paycheck-overlay .paycheck-amount-helper .paycheck-quick-add {
        grid-area: actions;
        display: flex !important;
        flex-wrap: nowrap !important;
        justify-content: flex-end;
        gap: 6px !important;
        margin: 0 !important;
      }
      #paycheck-overlay .paycheck-amount-helper .paycheck-quick-add button {
        min-width: 51px;
        min-height: 29px;
        padding: 4px 8px;
        border: 1px solid #a9dfeb;
        border-radius: 999px;
        color: #0c748d;
        background: #fff;
        font-size: .72rem;
        font-weight: 900;
        white-space: nowrap;
      }
      #paycheck-overlay .paycheck-amount-helper .paycheck-floor {
        grid-area: copy;
        display: block !important;
        margin: 0 !important;
        color: #50737d !important;
        font-size: .75rem !important;
        font-weight: 750 !important;
        line-height: 1.35 !important;
      }

      #paycheck-overlay .paycheck-config > .paycheck-empty {
        margin: 0 !important;
      }
      @media (max-width: 390px) {
        #paycheck-overlay .paycheck-config { padding: 13px !important; }
        #paycheck-overlay .paycheck-two { gap: 9px !important; }
        #paycheck-overlay .paycheck-two > .paycheck-field { font-size: .72rem !important; }
        #paycheck-overlay .paycheck-amount-helper {
          grid-template-columns: 1fr;
          grid-template-areas:
            "title"
            "actions"
            "copy";
          gap: 8px;
        }
        #paycheck-overlay .paycheck-amount-helper .paycheck-quick-add { justify-content: flex-start; }
      }
    `;
    document.head.appendChild(style);
  }

  function alignForm() {
    installStyles();
    const form = root.querySelector("#paycheck-form");
    if (!form) return;
    const config = form.querySelector(".paycheck-config");
    const amount = form.elements.paycheckAmount;
    if (!config || !amount) return;

    const field = amount.closest(".paycheck-field");
    if (!field) return;
    const floor = field.querySelector(".paycheck-floor");
    const quick = field.querySelector(".paycheck-quick-add");
    if (!floor && !quick) return;

    let helper = config.querySelector(".paycheck-amount-helper");
    if (!helper) {
      helper = document.createElement("div");
      helper.className = "paycheck-amount-helper";
      helper.innerHTML = '<div class="paycheck-amount-helper-title">Minimum payment reserve</div>';
      const pair = config.querySelector(".paycheck-two");
      if (pair) pair.insertAdjacentElement("afterend", helper);
      else config.appendChild(helper);
    }

    if (quick && !helper.contains(quick)) helper.appendChild(quick);
    if (floor && !helper.contains(floor)) helper.appendChild(floor);
  }

  let frame = 0;
  function queue() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(alignForm);
  }

  new MutationObserver(queue).observe(root, { childList: true, subtree: true });
  document.addEventListener("input", event => { if (event.target.closest?.("#paycheck-form")) queue(); });
  document.addEventListener("change", event => { if (event.target.closest?.("#paycheck-form")) queue(); });
  queue();
})();
