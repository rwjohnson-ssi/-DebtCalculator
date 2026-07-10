(() => {
  "use strict";

  const LEGACY_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/1d8106c5816f07c04d4568f6da97aee27a10cff4/paycheck-form-overlap-fix-v4.js?helper=15";

  const currencyValue = value => {
    const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };

  const money = value => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(currencyValue(value));

  function isSplitInput(input) {
    return input instanceof HTMLInputElement && input.classList.contains("dw-tx-split-input");
  }

  function formatCurrencyField(input) {
    if (!(input instanceof HTMLInputElement) || !input.classList.contains("dw-currency-input")) return;
    const value = currencyValue(input.value || input.dataset.rawValue);
    input.dataset.rawValue = value ? value.toFixed(2) : "";
    input.value = value ? money(value) : "";
  }

  function formatAllSplitFields({ includeActive = false } = {}) {
    const active = document.activeElement;
    document.querySelectorAll(".dw-tx-split-input.dw-currency-input").forEach(input => {
      if (!includeActive && input === active) return;
      formatCurrencyField(input);
    });
  }

  function installSplitTypingFix() {
    document.addEventListener("focusin", event => {
      const input = event.target;
      if (!isSplitInput(input)) return;
      const value = currencyValue(input.dataset.rawValue || input.value);
      input.value = value ? value.toFixed(2) : "";
      requestAnimationFrame(() => input.select());
    }, true);

    document.addEventListener("input", event => {
      const input = event.target;
      if (!isSplitInput(input)) return;
      const value = currencyValue(input.value);
      input.dataset.rawValue = value ? value.toFixed(2) : "";
    }, true);

    document.addEventListener("focusout", event => {
      const input = event.target;
      if (!isSplitInput(input)) return;
      requestAnimationFrame(() => formatCurrencyField(input));
    }, true);

    document.addEventListener("click", event => {
      const action = event.target.closest(".dw-tx-done,[data-dw-selector-done],.dw-tx-budget-row,[data-edp-trans-add]");
      if (!action) return;
      const active = document.activeElement;
      if (isSplitInput(active)) {
        formatCurrencyField(active);
        active.blur();
      }
      requestAnimationFrame(() => formatAllSplitFields({ includeActive: true }));
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      const input = event.target;
      if (!isSplitInput(input)) return;
      formatCurrencyField(input);
      input.blur();
    }, true);
  }

  fetch(LEGACY_HELPER, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Unable to load DebtWizard helper.");
      return response.text();
    })
    .then(source => {
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-v15.js`);
      installSplitTypingFix();
      formatAllSplitFields();
    })
    .catch(error => {
      console.error(error);
      installSplitTypingFix();
    });
})();