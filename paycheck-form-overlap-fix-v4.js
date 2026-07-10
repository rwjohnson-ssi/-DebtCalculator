(() => {
  "use strict";

  const BASE_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/b11f3a7f87a9c5f294b7bf51a0d495ff3c434ab8/paycheck-form-overlap-fix-v4.js?feature=31";

  function ensureMonthSelectorAlignmentStyle() {
    document.getElementById("dw-month-selector-alignment-v31")?.remove();
    const style = document.createElement("style");
    style.id = "dw-month-selector-alignment-v31";
    style.textContent = `
      .budget-month-row{
        grid-template-rows:auto 42px!important;
        align-items:stretch!important;
        row-gap:4px!important;
      }
      .budget-month-row .budget-month-picker{
        grid-column:2!important;
        grid-row:1 / span 2!important;
        grid-template-rows:auto 42px!important;
        gap:4px!important;
      }
      .budget-month-row .budget-month-picker input{
        height:42px!important;
        min-height:42px!important;
      }
      .budget-month-row .budget-month-arrow{
        grid-row:2!important;
        align-self:stretch!important;
        justify-self:stretch!important;
        width:42px!important;
        height:42px!important;
        margin:0!important;
        transform:none!important;
      }
      .budget-month-row [data-act="budget-month-prev"]{
        grid-column:1!important;
      }
      .budget-month-row [data-act="budget-month-next"]{
        grid-column:3!important;
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
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-feature-31.js`);
      ensureMonthSelectorAlignmentStyle();
    })
    .catch(error => console.error(error));
})();