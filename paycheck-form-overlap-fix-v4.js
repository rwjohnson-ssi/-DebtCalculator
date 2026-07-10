(() => {
  "use strict";

  const LEGACY_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/1d8106c5816f07c04d4568f6da97aee27a10cff4/paycheck-form-overlap-fix-v4.js?helper=16";

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

  function editableValue(value) {
    const amount = currencyValue(value);
    if (!amount) return "";
    return String(Number(amount.toFixed(2)));
  }

  function setRawSplitValue(input) {
    if (!isSplitInput(input)) return;
    const raw = editableValue(input.dataset.rawValue || input.value);
    input.value = raw;
    input.dataset.rawValue = raw;
    requestAnimationFrame(() => {
      try { input.setSelectionRange(raw.length, raw.length); } catch {}
    });
  }

  function formatSplitValue(input) {
    if (!isSplitInput(input)) return;
    const amount = currencyValue(input.value || input.dataset.rawValue);
    input.dataset.rawValue = amount ? amount.toFixed(2) : "";
    input.value = amount ? money(amount) : "";
  }

  function formatAllSplits() {
    document.querySelectorAll(".dw-tx-split-input").forEach(formatSplitValue);
  }

  function installSplitTypingFix() {
    document.addEventListener("focusin", event => {
      const input = event.target;
      if (!isSplitInput(input)) return;
      requestAnimationFrame(() => setRawSplitValue(input));
    });

    document.addEventListener("input", event => {
      const input = event.target;
      if (!isSplitInput(input)) return;
      input.dataset.rawValue = input.value;
    }, true);

    document.addEventListener("focusout", event => {
      const input = event.target;
      if (!isSplitInput(input)) return;
      requestAnimationFrame(() => formatSplitValue(input));
    }, true);

    document.addEventListener("click", event => {
      const action = event.target.closest(".dw-tx-done,[data-dw-selector-done],.dw-tx-budget-row,[data-edp-trans-add]");
      if (!action) return;
      const active = document.activeElement;
      if (isSplitInput(active)) {
        formatSplitValue(active);
        active.blur();
      }
      requestAnimationFrame(formatAllSplits);
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      const input = event.target;
      if (!isSplitInput(input)) return;
      formatSplitValue(input);
      input.blur();
    }, true);
  }

  fetch(LEGACY_HELPER, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Unable to load DebtWizard helper.");
      return response.text();
    })
    .then(source => {
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-v16.js`);
      installSplitTypingFix();
      formatAllSplits();
    })
    .catch(error => {
      console.error(error);
      installSplitTypingFix();
    });
})();