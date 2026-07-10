(() => {
  "use strict";

  const LEGACY_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/1d8106c5816f07c04d4568f6da97aee27a10cff4/paycheck-form-overlap-fix-v4.js";

  const currencyValue = value => {
    const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };

  const money = value => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(currencyValue(value));

  function formatActiveCurrencyField() {
    const input = document.activeElement;
    if (!(input instanceof HTMLInputElement) || !input.classList.contains("dw-currency-input")) return;

    const value = currencyValue(input.value || input.dataset.rawValue);
    input.dataset.rawValue = value ? value.toFixed(2) : "";
    input.value = value ? money(value) : "";
  }

  function formatAllSplitFields() {
    document.querySelectorAll(".dw-tx-split-input.dw-currency-input").forEach(input => {
      if (input === document.activeElement) return;
      const value = currencyValue(input.value || input.dataset.rawValue);
      input.dataset.rawValue = value ? value.toFixed(2) : "";
      input.value = value ? money(value) : "";
    });
  }

  function installCurrencyFinishFix() {
    document.addEventListener("focusin", event => {
      const next = event.target;
      if (!(next instanceof HTMLInputElement) || !next.classList.contains("dw-currency-input")) {
        formatActiveCurrencyField();
      }
    }, true);

    document.addEventListener("click", event => {
      const done = event.target.closest(".dw-tx-done,[data-dw-selector-done],.dw-tx-budget-row,[data-edp-trans-add]");
      if (!done) return;
      formatActiveCurrencyField();
      requestAnimationFrame(formatAllSplitFields);
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== "Done") return;
      const input = event.target.closest(".dw-currency-input");
      if (!input) return;
      input.blur();
      requestAnimationFrame(formatAllSplitFields);
    }, true);

    document.addEventListener("focusout", event => {
      const input = event.target.closest(".dw-currency-input");
      if (!input) return;
      requestAnimationFrame(formatAllSplitFields);
    }, true);
  }

  fetch(LEGACY_HELPER, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Unable to load DebtWizard helper.");
      return response.text();
    })
    .then(source => {
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-v13.js`);
      installCurrencyFinishFix();
      formatAllSplitFields();
    })
    .catch(error => {
      console.error(error);
      installCurrencyFinishFix();
    });
})();
