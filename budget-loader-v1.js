(function () {
  "use strict";

  function loadBudgetWorkspace() {
    if (document.querySelector('script[data-budget-workspace="true"]')) return;
    var script = document.createElement("script");
    script.src = "budget-v1.js?v=24";
    script.setAttribute("data-budget-workspace", "true");
    document.body.appendChild(script);
  }

  if (document.readyState === "complete") {
    window.setTimeout(loadBudgetWorkspace, 0);
  } else {
    window.addEventListener("load", function () {
      window.setTimeout(loadBudgetWorkspace, 0);
    }, { once: true });
  }
}());
