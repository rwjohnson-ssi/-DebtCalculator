(() => {
  "use strict";

  const BASE_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/b11f3a7f87a9c5f294b7bf51a0d495ff3c434ab8/paycheck-form-overlap-fix-v4.js?feature=30";

  function ensureMonthSelectorAlignmentStyle() {
    document.getElementById("dw-month-selector-alignment-v30")?.remove();
    const style = document.createElement("style");
    style.id = "dw-month-selector-alignment-v30";
    style.textContent = `
      .budget-month-row{
        align-items:center!important;
      }
      .budget-month-row .budget-month-arrow{
        align-self:center!important;
        justify-self:center!important;
        margin-top:calc(.72rem + 4px)!important;
        transform:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  fetch(BASE_HELPER, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Unable to load DebtWizard features.");
      return response.text();
    })
    .then(source => {
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-feature-30.js`);
      ensureMonthSelectorAlignmentStyle();
    })
    .catch(error => console.error(error));
})();
