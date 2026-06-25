(() => {
  "use strict";

  const root = document.getElementById("modal-root");
  if (!root) return;

  function patchSheets() {
    root.querySelectorAll(".sheet").forEach(sheet => {
      if (sheet.dataset.clickFix === "true") return;
      sheet.dataset.clickFix = "true";

      // The original sheet markup used an inline stopPropagation handler on
      // every click. That prevented delegated button handlers from receiving
      // clicks inside the sheet. Keep backdrop clicks from closing the sheet,
      // but allow buttons and links inside the sheet to bubble normally.
      sheet.onclick = event => {
        if (event.target === sheet) event.stopPropagation();
      };
    });
  }

  new MutationObserver(patchSheets).observe(root, {
    childList: true,
    subtree: true
  });

  patchSheets();
})();
