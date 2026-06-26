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
      .due-day-picker { grid-column: 1 / -1; margin-top: 2px; padding: 14px 0 2px; border-top: 1px solid #e7ecee; }
      .due-day-picker-title { display:flex; align-items:baseline; justify-content:space-between; gap:10px; color:#5e6b70; font-size:.86rem; font-weight:850; }
      .due-day-picker-title span:last-child { color:#8e999d; font-size:.75rem; font-weight:650; }
      .due-day-picker-status { min-height:20px; margin:5px 0 10px; color:#1786a4; font-size:.84rem; font-weight:800; }
      .due-day-picker-status.empty { color:#929da1; font-weight:650; }
      .due-day-grid { display:grid; grid-template-columns:repeat(8,minmax(0,1fr)); gap:8px; }
      .due-day-button { min-width:0; height:38px; padding:0; border:1px solid #edf0f1; border-radius:50%; color:#3f4c51; background:#f5f6f6; font-size:.91rem !important; font-weight:800; box-shadow:none; }
      .due-day-button.last-day { grid-column:span 2; border-radius:999px; color:#40525a; }
      .due-day-button.selected { color:#fff; border-color:#37bdd7; background:linear-gradient(135deg,#24b6d1,#57cfe1); box-shadow:0 5px 11px rgba(44,184,210,.24); }
      .due-day-button:active { transform:scale(.96); }
      @media (max-width: 390px) { .due-day-grid { grid-template-columns:repeat(7,minmax(0,1fr)); gap:7px; } .due-day-button { height:36px; font-size:.85rem !important; } }
    `;
    document.head.appendChild(style);
  }

  function enhanceDebtForm(sheet) {
    const form = sheet.querySelector("#debt-form");
    if (!form || form.dataset.dueDayEnhanced === "true") return;

    const input = form.querySelector('input[name="dueDay"]');
    const oldField = input?.closest("label.field");
    const twoColumnRow = oldField?.parentElement;
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
