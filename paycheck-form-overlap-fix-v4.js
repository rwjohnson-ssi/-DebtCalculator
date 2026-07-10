(() => {
  "use strict";

  const BASE_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/b11f3a7f87a9c5f294b7bf51a0d495ff3c434ab8/paycheck-form-overlap-fix-v4.js?feature=33";

  function ensureMonthSelectorAlignmentStyle() {
    ["dw-month-selector-alignment-v31", "dw-month-selector-alignment-v32", "dw-month-selector-alignment-v33"]
      .forEach(id => document.getElementById(id)?.remove());

    const style = document.createElement("style");
    style.id = "dw-month-selector-alignment-v33";
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
        position:relative!important;
        flex:0 0 42px!important;
        align-self:center!important;
        display:grid!important;
        place-items:center!important;
        width:42px!important;
        min-width:42px!important;
        height:42px!important;
        min-height:42px!important;
        margin:0!important;
        padding:0!important;
        font-size:0!important;
        line-height:0!important;
        transform:none!important;
        -webkit-appearance:none!important;
        appearance:none!important;
      }
      .budget-month-row .budget-month-arrow::before{
        content:""!important;
        position:absolute!important;
        left:50%!important;
        top:50%!important;
        box-sizing:border-box!important;
        width:10px!important;
        height:10px!important;
        border-left:3px solid currentColor!important;
        border-bottom:3px solid currentColor!important;
        transform-origin:center!important;
      }
      .budget-month-row [data-act="budget-month-prev"]::before{
        transform:translate(-38%,-50%) rotate(45deg)!important;
      }
      .budget-month-row [data-act="budget-month-next"]::before{
        transform:translate(-62%,-50%) rotate(225deg)!important;
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
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-feature-33.js`);
      ensureMonthSelectorAlignmentStyle();
    })
    .catch(error => console.error(error));
})();