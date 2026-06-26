(() => {
  "use strict";

  document.addEventListener("click", event => {
    const button = event.target.closest('[data-act="paycheck-setup"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    document.querySelector('#tabbar [data-page="strategy"]')?.click();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.querySelector('[data-act="cycle"]')?.click());
    });
  }, true);
})();
