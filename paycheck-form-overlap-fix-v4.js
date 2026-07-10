(() => {
  "use strict";

  const BASE_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/b11f3a7f87a9c5f294b7bf51a0d495ff3c434ab8/paycheck-form-overlap-fix-v4.js?feature=32";

  function ensureMonthSelectorAlignmentStyle() {
    document.getElementById("dw-month-selector-alignment-v31")?.remove();
    document.getElementById("dw-month-selector-alignment-v32")?.remove();

    const style = document.createElement("style");
    style.id = "dw-month-selector-alignment-v32";
    style.textContent = `
      .budget-month-row{
        display:flex!important;
        align-items:center!important;
        gap:9px!important;
        padding-top:24px!important;
        margin-bottom:12px!important;
      }
      .budget-month-row .budget-month-picker{
        position:relative!important;
        flex:1 1 auto!important;
        min-width:0!important;
        width:auto!important;
        height:42px!important;
        min-height:42px!important;
        display:flex!important;
        align-items:center!important;
        gap:0!important;
        margin:0!important;
        padding:0!important;
      }
      .budget-month-row .budget-month-picker>span{
        position:absolute!important;
        left:0!important;
        bottom:calc(100% + 6px)!important;
        margin:0!important;
        line-height:1!important;
      }
      .budget-month-row .budget-month-picker input{
        box-sizing:border-box!important;
        display:block!important;
        width:100%!important;
        height:42px!important;
        min-height:42px!important;
        margin:0!important;
        padding:0 11px!important;
        line-height:40px!important;
      }
      .budget-month-row .budget-month-arrow{
        box-sizing:border-box!important;
        flex:0 0 42px!important;
        align-self:center!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        width:42px!important;
        min-width:42px!important;
        height:42px!important;
        min-height:42px!important;
        margin:0!important;
        padding:0!important;
        line-height:1!important;
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
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-feature-32.js`);
      ensureMonthSelectorAlignmentStyle();
    })
    .catch(error => console.error(error));
})();