(() => {
  "use strict";

  const LEGACY_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/1d8106c5816f07c04d4568f6da97aee27a10cff4/paycheck-form-overlap-fix-v4.js?helper=14";

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

  function keyboardIsOpen() {
    if (!window.visualViewport) return false;
    return window.visualViewport.height < window.innerHeight * 0.78;
  }

  function formatAllSplitFields(force = false) {
    if (!force && keyboardIsOpen()) return;
    document.querySelectorAll(".dw-tx-split-input.dw-currency-input").forEach(formatCurrencyField);
  }

  function installUnifiedSplitFormatter() {
    document.addEventListener("focusin", event => {
      const input = event.target;
      if (!isSplitInput(input)) return;
      requestAnimationFrame(() => {
        if (!keyboardIsOpen()) formatCurrencyField(input);
      });
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
      if (isSplitInput(active)) formatCurrencyField(active);
      requestAnimationFrame(() => formatAllSplitFields(true));
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== "Done") return;
      const input = event.target;
      if (!isSplitInput(input)) return;
      formatCurrencyField(input);
      input.blur();
    }, true);

    const viewport = window.visualViewport;
    if (viewport) {
      let previousHeight = viewport.height;
      viewport.addEventListener("resize", () => {
        const currentHeight = viewport.height;
        const keyboardClosed = currentHeight > previousHeight + 80 || !keyboardIsOpen();
        previousHeight = currentHeight;
        if (keyboardClosed) requestAnimationFrame(() => formatAllSplitFields(true));
      });
    }

    window.setInterval(() => {
      if (!keyboardIsOpen()) formatAllSplitFields(true);
    }, 400);
  }

  fetch(LEGACY_HELPER, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Unable to load DebtWizard helper.");
      return response.text();
    })
    .then(source => {
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-v14.js`);
      installUnifiedSplitFormatter();
      formatAllSplitFields(true);
    })
    .catch(error => {
      console.error(error);
      installUnifiedSplitFormatter();
    });
})();