(() => {
  "use strict";

  const BASE_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/b11f3a7f87a9c5f294b7bf51a0d495ff3c434ab8/paycheck-form-overlap-fix-v4.js?feature=34";

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

  function ensureTransactionPaletteStyle() {
    document.getElementById("dw-transaction-palette-v34")?.remove();

    const style = document.createElement("style");
    style.id = "dw-transaction-palette-v34";
    style.textContent = `
      .dw-trans-page{
        background:#f7fbfc!important;
      }
      .dw-trans-hero{
        background:linear-gradient(135deg,#cdeff4 0%,#eafcfe 100%)!important;
        color:#0f516b!important;
        border-bottom:1px solid #b9e3ea!important;
      }
      .dw-trans-title,
      .dw-trans-select{
        color:#0f516b!important;
      }
      .dw-trans-search{
        color:#7c8d93!important;
        border:1px solid #d6e7ea!important;
        box-shadow:0 8px 20px rgba(15,81,107,.08)!important;
      }
      .dw-trans-wrap{
        background:#f7fbfc!important;
      }
      .dw-trans-card{
        border:1px solid #dce8eb!important;
        box-shadow:0 10px 26px rgba(15,81,107,.07)!important;
      }
      .dw-trash,
      .dw-chev,
      .dw-tx-cat,
      .dw-tx-budget-row em{
        color:#0f7893!important;
      }
      .dw-trans-fab,
      .dw-first-btn{
        background:linear-gradient(135deg,#0f7893 0%,#27c7d8 100%)!important;
        color:#fff!important;
      }
      .dw-tx-sheet{
        background:#f7fbfc!important;
      }
      .dw-tx-sheet-head{
        background:linear-gradient(135deg,#0f7893 0%,#27c7d8 100%)!important;
        color:#fff!important;
      }
      .dw-tx-toggle{
        background:#0d7088!important;
      }
      .dw-tx-toggle button{
        color:#fff!important;
      }
      .dw-tx-toggle button.active{
        background:#fff!important;
        color:#0f7893!important;
        box-shadow:none!important;
      }
      .dw-tx-link{
        color:#fff!important;
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
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-feature-34.js`);
      ensureMonthSelectorAlignmentStyle();
      ensureTransactionPaletteStyle();
    })
    .catch(error => console.error(error));
})();