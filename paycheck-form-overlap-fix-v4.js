(() => {
  "use strict";

  const LEGACY_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/1d8106c5816f07c04d4568f6da97aee27a10cff4/paycheck-form-overlap-fix-v4.js?helper=17";

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

  function ensureFiveButtonNavigation() {
    const bar = document.getElementById("tabbar");
    if (!bar) return;

    const home = bar.querySelector('.tab-btn[data-page="home"]');
    const debts = bar.querySelector('.tab-btn[data-page="debts"]');
    const budget = bar.querySelector('.tab-btn[data-page="budget"]');
    if (!home || !debts || !budget) return;

    bar.querySelectorAll("[data-edp-trans-nav],.dw-nav-plus").forEach(node => node.remove());

    let transaction = bar.querySelector(".dw-nav-transaction");
    if (!transaction) {
      transaction = document.createElement("button");
      transaction.type = "button";
      transaction.className = "dw-nav-transaction";
      transaction.setAttribute("data-edp-trans-add", "");
      transaction.setAttribute("aria-label", "Add transaction");
      transaction.innerHTML = '<span class="tab-icon">+</span><span>Transaction</span>';
    }

    let more = bar.querySelector(".dw-nav-more");
    if (!more) {
      more = document.createElement("button");
      more.type = "button";
      more.className = "dw-nav-more";
      more.setAttribute("aria-label", "More navigation");
      more.innerHTML = '<span class="tab-icon">•••</span><span>More</span>';
    }

    const transactionCorrect = transaction.parentElement === bar && transaction.nextElementSibling === budget;
    const moreCorrect = more.parentElement === bar && more === bar.lastElementChild;
    if (transactionCorrect && moreCorrect) return;

    bar.insertBefore(transaction, budget);
    bar.appendChild(more);
  }

  function installNavigationWatch() {
    let scheduled = false;
    const repair = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        ensureFiveButtonNavigation();
      });
    };

    repair();
    new MutationObserver(mutations => {
      const needsCheck = mutations.some(mutation =>
        mutation.target?.id === "tabbar" ||
        mutation.target?.closest?.("#tabbar") ||
        [...mutation.addedNodes, ...mutation.removedNodes].some(node =>
          node instanceof Element && (node.id === "tabbar" || node.querySelector?.("#tabbar"))
        )
      );
      if (needsCheck) repair();
    }).observe(document.body, { childList: true, subtree: true });
  }

  fetch(LEGACY_HELPER, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Unable to load DebtWizard helper.");
      return response.text();
    })
    .then(source => {
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-v17.js`);
      installSplitTypingFix();
      installNavigationWatch();
      formatAllSplits();
    })
    .catch(error => {
      console.error(error);
      installSplitTypingFix();
      installNavigationWatch();
    });
})();