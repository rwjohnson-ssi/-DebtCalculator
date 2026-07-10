(() => {
  "use strict";

  const BASE_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/761c066f58989fb45dd749a007ec6db139675cbe/paycheck-form-overlap-fix-v4.js?feature=22";

  function setTransactionListNavigation() {
    const button = document.querySelector("#dw-primary-nav .dw-nav-transaction");
    if (!button) return false;

    button.removeAttribute("data-edp-trans-add");
    button.setAttribute("data-edp-trans-nav", "");
    button.setAttribute("aria-label", "Transactions");
    return true;
  }

  fetch(BASE_HELPER, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Unable to load DebtWizard transaction features.");
      return response.text();
    })
    .then(source => {
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-feature-22.js`);

      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (setTransactionListNavigation() || attempts >= 40) clearInterval(timer);
      }, 100);

      setTimeout(setTransactionListNavigation, 0);
      setTimeout(setTransactionListNavigation, 500);
    })
    .catch(error => console.error(error));
})();
