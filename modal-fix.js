(() => {
  "use strict";

  const root = document.getElementById("modal-root");
  if (!root) return;

  function repairModalBehavior() {
    root.querySelectorAll(".modal-backdrop").forEach(backdrop => {
      if (backdrop.dataset.backdropFix === "true") return;
      backdrop.dataset.backdropFix = "true";

      // Do not let the generic delegated click handler treat every form tap
      // as the backdrop's close action. Only a direct tap on the shaded area
      // outside the sheet should close it.
      backdrop.removeAttribute("data-act");
      backdrop.onclick = event => {
        if (event.target === backdrop) root.innerHTML = "";
      };

      const sheet = backdrop.querySelector(".sheet");
      if (sheet) {
        // Remove the original inline stopPropagation behavior so the X button,
        // settings rows, and other data-act buttons can reach the app handler.
        sheet.onclick = null;
      }
    });
  }

  new MutationObserver(repairModalBehavior).observe(root, {
    childList: true,
    subtree: true
  });

  repairModalBehavior();
})();
