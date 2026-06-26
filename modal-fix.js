(() => {
  "use strict";

  const root = document.getElementById("modal-root");
  if (!root) return;

  function injectMobileFormStyles() {
    if (document.getElementById("debtwizard-mobile-form-fix")) return;
    const style = document.createElement("style");
    style.id = "debtwizard-mobile-form-fix";
    style.textContent = `
      @media (max-width: 767px) {
        .sheet input, .sheet select, .sheet textarea, .sheet button { font-size: 16px !important; }
        .sheet .field input, .sheet .field select, .sheet .field textarea { min-height: 48px; line-height: 1.25; }
        .sheet .field textarea { min-height: 88px; }
      }
      .due-day-picker { grid-column: 1 / -1; margin-top: 2px; padding: 16px 0 4px; border-top: 1px solid #e1eaec; }
      .due-day-picker-title { display:flex; align-items:baseline; justify-content:space-between; gap:10px; color:#455a61; font-size:.86rem; font-weight:850; }
      .due-day-picker-title span:last-child { color:#819096; font-size:.75rem; font-weight:700; }
      .due-day-picker-status { min-height:22px; margin:7px 0 11px; color:#08758e; font-size:.84rem; font-weight:850; text-align:center; }
      .due-day-picker-status.empty { color:#879398; font-weight:650; }
      .due-day-grid { display:grid; grid-template-columns:repeat(8,minmax(0,1fr)); gap:8px; }
      .due-day-button { min-width:0; height:40px; padding:0; border:1px solid #e5ebed; border-radius:50%; color:#39474d; background:#f5f7f7; font-size:.91rem !important; font-weight:850; box-shadow:none; }
      .due-day-button.last-day { grid-column:span 2; border-radius:999px; color:#40525a; }
      /* High contrast so the selected payment date is obvious at a glance. */
      .modal-backdrop.debt-entry-modal .due-day-button.selected,
      .due-day-picker .due-day-button.selected {
        color:#ffffff !important;
        border:3px solid #034d63 !important;
        background:linear-gradient(135deg,#007b99 0%,#1dc1dc 100%) !important;
        font-weight:950 !important;
        box-shadow:0 0 0 3px #d9f7fb, 0 7px 14px rgba(0,118,148,.34) !important;
        transform:scale(1.08);
      }
      .due-day-button.selected.last-day { padding:0 13px; }
      .due-day-button:focus-visible { outline:3px solid #ffc846; outline-offset:2px; }
      .due-day-button:active { transform:scale(.95); }
      .due-day-button.selected:active { transform:scale(1.02); }
      @media (max-width: 390px) {
        .due-day-grid { grid-template-columns:repeat(7,minmax(0,1fr)); gap:7px; }
        .due-day-button { height:38px; font-size:.85rem !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceDebtForm(sheet) {
    const form = sheet.querySelector("#debt-form");
    if (!form || form.dataset.dueDayEnhanced === "true") return;

    const input = form.querySelector('input[name="dueDay"]');
    const oldField = input?.closest("label.field");
    const twoColumnRow = oldField?.parentElement;
    const limitInput = form.querySelector('input[name="limit"]');
    const limitField = limitInput?.closest("label.field");
    if (!input || !oldField || !twoColumnRow) return;

    form.dataset.dueDayEnhanced = "true";
    input.type = "hidden";
    input.autocomplete = "off";

    const current = String(input.value || "");
    const picker = document.createElement("section");
    picker.className = "due-day-picker";
    picker.innerHTML = `
      <div class="due-day-picker-title"><span>Payment due day</span><span>Choose one day each month</span></div>
      <div class="due-day-picker-status"></div>
      <div class="due-day-grid" role="group" aria-label="Payment due day">
        ${Array.from({ length: 30 }, (_, index) => `<button type="button" class="due-day-button" data-due-value="${index + 1}">${index + 1}</button>`).join("")}
        <button type="button" class="due-day-button last-day" data-due-value="31">Last</button>
      </div>
    `;

    picker.appendChild(input);
    oldField.remove();

    /* Keep the primary terms together: Minimum Payment on the left, Credit Limit on the right. */
    if (limitField) twoColumnRow.appendChild(limitField);
    twoColumnRow.insertAdjacentElement("afterend", picker);

    const status = picker.querySelector(".due-day-picker-status");
    const updatePicker = () => {
      const value = String(input.value || "");
      picker.querySelectorAll("[data-due-value]").forEach(button => {
        button.classList.toggle("selected", button.dataset.dueValue === value);
      });
      if (!value) {
        status.textContent = "Select the date your payment is normally due.";
        status.classList.add("empty");
      } else if (value === "31") {
        status.textContent = "Selected: last day of each month";
        status.classList.remove("empty");
      } else {
        status.textContent = `Selected: day ${value} of each month`;
        status.classList.remove("empty");
      }
    };

    picker.addEventListener("click", event => {
      const button = event.target.closest("[data-due-value]");
      if (!button) return;
      event.preventDefault();
      input.value = button.dataset.dueValue;
      updatePicker();
    });

    form.addEventListener("submit", event => {
      if (input.value) return;
      event.preventDefault();
      event.stopPropagation();
      status.textContent = "Please select a payment due day before saving.";
      status.classList.add("empty");
      picker.scrollIntoView({ behavior: "smooth", block: "center" });
    }, true);

    input.value = current;
    updatePicker();
  }

  function repairModalBehavior() {
    injectMobileFormStyles();
    root.querySelectorAll(".modal-backdrop").forEach(backdrop => {
      if (backdrop.dataset.backdropFix !== "true") {
        backdrop.dataset.backdropFix = "true";
        backdrop.removeAttribute("data-act");
        backdrop.onclick = event => {
          if (event.target === backdrop) root.innerHTML = "";
        };
      }

      const sheet = backdrop.querySelector(".sheet");
      if (sheet) {
        sheet.onclick = null;
        enhanceDebtForm(sheet);
      }
    });
  }

  new MutationObserver(repairModalBehavior).observe(root, { childList: true, subtree: true });
  repairModalBehavior();
})();
