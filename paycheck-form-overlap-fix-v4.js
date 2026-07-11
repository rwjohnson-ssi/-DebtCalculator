(() => {
  "use strict";

  if (window.__debtWizardHelperBootstrapV42) return;
  window.__debtWizardHelperBootstrapV42 = true;

  const PAGE_KEY = "debtwizard-active-page";
  const currentScript = document.currentScript;
  const coreUrl = new URL("debtwizard-helper-core-v38.js?cache=48", currentScript?.src || window.location.href).href;
  let lastPointerActivation = 0;

  function ensureMonthSelectorStyle() {
    document.getElementById("dw-month-selector-layout-v42")?.remove();
    const style = document.createElement("style");
    style.id = "dw-month-selector-layout-v42";
    style.textContent = `
      html body .budget-month-tools .budget-month-row{
        box-sizing:border-box!important;
        display:grid!important;
        grid-template-columns:52px minmax(0,1fr) 52px!important;
        grid-template-rows:auto 52px!important;
        column-gap:14px!important;
        row-gap:8px!important;
        align-items:center!important;
        width:100%!important;
        margin:0 0 12px!important;
      }
      html body .budget-month-tools .budget-month-row>.budget-month-picker{
        display:contents!important;
      }
      html body .budget-month-tools .budget-month-row>.budget-month-picker>span{
        box-sizing:border-box!important;
        display:block!important;
        position:static!important;
        grid-column:2!important;
        grid-row:1!important;
        justify-self:stretch!important;
        width:100%!important;
        margin:0!important;
        padding:0!important;
        color:#6d7b80!important;
        font-size:.72rem!important;
        font-weight:850!important;
        line-height:1!important;
        letter-spacing:.08em!important;
        text-align:center!important;
        text-transform:uppercase!important;
        white-space:nowrap!important;
      }
      html body .budget-month-tools .budget-month-row>.budget-month-picker>input{
        box-sizing:border-box!important;
        display:block!important;
        position:relative!important;
        grid-column:2!important;
        grid-row:2!important;
        align-self:center!important;
        justify-self:stretch!important;
        width:100%!important;
        min-width:0!important;
        max-width:100%!important;
        min-inline-size:0!important;
        height:52px!important;
        min-height:52px!important;
        max-height:52px!important;
        margin:0!important;
        padding:0 14px!important;
        overflow:hidden!important;
        border:1px solid #d7e7ea!important;
        border-radius:13px!important;
        background:#fff!important;
        color:#153f51!important;
        font-family:inherit!important;
        font-size:1rem!important;
        font-weight:900!important;
        line-height:52px!important;
        letter-spacing:0!important;
        text-align:center!important;
        text-transform:none!important;
        transform:none!important;
        -webkit-appearance:none!important;
        appearance:none!important;
      }
      html body .budget-month-tools .budget-month-row>.budget-month-picker>input::-webkit-date-and-time-value{
        min-height:52px!important;
        margin:0!important;
        padding:0!important;
        line-height:52px!important;
        text-align:center!important;
      }
      html body .budget-month-tools .budget-month-row>.budget-month-picker>input::-webkit-datetime-edit{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        min-height:52px!important;
        padding:0!important;
      }
      html body .budget-month-tools .budget-month-row>.budget-month-picker>input::-webkit-calendar-picker-indicator{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        margin:0!important;
        padding:0!important;
        opacity:0!important;
        cursor:pointer!important;
      }
      html body .budget-month-tools .budget-month-row>.budget-month-arrow{
        box-sizing:border-box!important;
        position:relative!important;
        grid-row:2!important;
        align-self:center!important;
        justify-self:stretch!important;
        display:grid!important;
        place-items:center!important;
        width:52px!important;
        min-width:52px!important;
        max-width:52px!important;
        height:52px!important;
        min-height:52px!important;
        max-height:52px!important;
        margin:0!important;
        padding:0!important;
        border:1px solid #d7e7ea!important;
        border-radius:13px!important;
        background:#fff!important;
        color:#0f7893!important;
        font-size:0!important;
        line-height:0!important;
        transform:none!important;
        -webkit-appearance:none!important;
        appearance:none!important;
      }
      html body .budget-month-tools .budget-month-row>[data-act="budget-month-prev"]{
        grid-column:1!important;
      }
      html body .budget-month-tools .budget-month-row>[data-act="budget-month-next"]{
        grid-column:3!important;
      }
      html body .budget-month-tools .budget-month-row>.budget-month-arrow::before{
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
      html body .budget-month-tools .budget-month-row>[data-act="budget-month-prev"]::before{
        transform:translate(-38%,-50%) rotate(45deg)!important;
      }
      html body .budget-month-tools .budget-month-row>[data-act="budget-month-next"]::before{
        transform:translate(-62%,-50%) rotate(225deg)!important;
      }
    `;
    document.head.appendChild(style);
  }

  function navMoreButton(target) {
    if (!(target instanceof Element)) return null;
    const button = target.closest("button,[role='button']");
    if (!button || !button.closest("#dw-primary-nav,#tabbar")) return null;

    const label = (button.getAttribute("aria-label") || "").trim().toLowerCase();
    const text = (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    return button.matches(".dw-nav-more") || label === "more navigation" || text === "more" || text.endsWith(" more")
      ? button
      : null;
  }

  function moreButtons() {
    return [...document.querySelectorAll("#dw-primary-nav button,#tabbar button")].filter(button => navMoreButton(button));
  }

  function ensureMoreMenuStyle() {
    if (document.getElementById("dw-more-controller-style-v40")) return;
    const style = document.createElement("style");
    style.id = "dw-more-controller-style-v40";
    style.textContent = `
      .dw-more-backdrop{position:fixed!important;inset:0!important;z-index:998!important;border:0!important;background:rgba(8,22,29,.35)!important;padding:0!important;margin:0!important}
      .dw-more-menu{position:fixed!important;right:14px!important;bottom:calc(84px + env(safe-area-inset-bottom,0px))!important;z-index:999!important;width:min(280px,calc(100vw - 28px))!important;padding:10px!important;border:1px solid #dce8eb!important;border-radius:20px!important;background:#fff!important;box-shadow:0 18px 50px rgba(0,35,62,.28)!important}
      .dw-more-menu button{box-sizing:border-box!important;width:100%!important;min-height:58px!important;border:0!important;border-bottom:1px solid #e7ecee!important;background:#fff!important;display:grid!important;grid-template-columns:38px minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;padding:8px 12px!important;color:#24323a!important;text-align:left!important;font:inherit!important;font-weight:850!important}
      .dw-more-menu button:last-child{border-bottom:0!important}
      .dw-more-icon,.dw-more-arrow{color:#0f7893!important}
      .dw-more-arrow{font-size:1.5rem!important}
    `;
    document.head.appendChild(style);
  }

  function closeMoreMenu() {
    document.querySelector(".dw-more-backdrop")?.remove();
    document.querySelector(".dw-more-menu")?.remove();
    moreButtons().forEach(button => button.setAttribute("aria-expanded", "false"));
  }

  function openMoreMenu() {
    ensureMoreMenuStyle();
    closeMoreMenu();
    document.body.insertAdjacentHTML("beforeend", `
      <button type="button" class="dw-more-backdrop" data-dw-more-close aria-label="Close more navigation"></button>
      <div class="dw-more-menu" role="menu" aria-label="More navigation">
        <button type="button" role="menuitem" data-dw-more-page="strategy">
          <span class="dw-more-icon" aria-hidden="true">✦</span>
          <span>Payoff Strategy</span>
          <span class="dw-more-arrow" aria-hidden="true">›</span>
        </button>
        <button type="button" role="menuitem" data-dw-more-page="plan">
          <span class="dw-more-icon" aria-hidden="true">▤</span>
          <span>Debt Payoff Plan</span>
          <span class="dw-more-arrow" aria-hidden="true">›</span>
        </button>
        <button type="button" role="menuitem" data-dw-more-page="track">
          <span class="dw-more-icon" aria-hidden="true">✓</span>
          <span>Debt Payment Tracking</span>
          <span class="dw-more-arrow" aria-hidden="true">›</span>
        </button>
      </div>
    `);
    moreButtons().forEach(button => button.setAttribute("aria-expanded", "true"));
  }

  function saveActivePage(page) {
    if (!page) return;
    try {
      localStorage.setItem(PAGE_KEY, page);
      sessionStorage.setItem(PAGE_KEY, page);
    } catch {}
  }

  function activateMore(event) {
    const button = navMoreButton(event.target);
    if (!button) return false;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openMoreMenu();
    return true;
  }

  window.addEventListener("pointerup", event => {
    if (!activateMore(event)) return;
    lastPointerActivation = Date.now();
  }, true);

  window.addEventListener("click", event => {
    const moreButton = navMoreButton(event.target);
    if (moreButton) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (Date.now() - lastPointerActivation > 600) openMoreMenu();
      return;
    }

    if (event.target instanceof Element && event.target.closest("[data-dw-more-close]")) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      closeMoreMenu();
      return;
    }

    if (!(event.target instanceof Element)) return;
    const pageButton = event.target.closest("[data-dw-more-page]");
    if (!pageButton) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const page = pageButton.dataset.dwMorePage;
    closeMoreMenu();
    saveActivePage(page);
    const nativePageButton = document.querySelector(`#tabbar .tab-btn[data-page="${page}"]`);
    if (nativePageButton) nativePageButton.click();
  }, true);

  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.querySelector(".dw-more-menu")) closeMoreMenu();
  });

  ensureMonthSelectorStyle();

  const existingCore = document.querySelector("script[data-debtwizard-core-v38]");
  if (!existingCore) {
    const script = document.createElement("script");
    script.src = coreUrl;
    script.async = false;
    script.dataset.debtwizardCoreV38 = "true";
    script.onerror = () => console.error("DebtWizard core helper failed to load.");
    document.head.appendChild(script);
  }
})();