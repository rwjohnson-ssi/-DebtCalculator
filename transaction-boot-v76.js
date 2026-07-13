(() => {
  "use strict";
  const T = window.DWTx76;
  if (!T?.host) return;
  T.install = doc => {
    const win = doc.defaultView;
    if (!doc.body || win.__transactionEntryV76) return;
    win.__transactionEntryV76 = true;
    T.injectStyles(doc);
    doc.addEventListener("click", event => {
      const navButton = T.transactionButton(event.target);
      if (navButton) { event.preventDefault(); event.stopImmediatePropagation(); T.renderTransactions(doc, navButton); return; }
      const edit = event.target.closest?.("[data-txe-edit]");
      if (edit) { event.preventDefault(); event.stopImmediatePropagation(); T.openStoredEntry(doc, T.findTransactionButton(doc), edit.dataset.txeMonth, edit.dataset.txeEdit); return; }
      if (event.target.closest?.("[data-txe-deleted]")) { event.preventDefault(); T.renderDeleted(doc, T.findTransactionButton(doc)); return; }
      if (event.target.closest?.("[data-txe-deleted-back]")) { event.preventDefault(); T.renderTransactions(doc, T.findTransactionButton(doc)); return; }
      const restore = event.target.closest?.("[data-txe-restore]");
      if (restore) { event.preventDefault(); T.restoreEntry(doc, restore.dataset.txeMonth, restore.dataset.txeRestore, T.findTransactionButton(doc)); return; }
      if (event.target.closest?.("[data-txe-add]")) { event.preventDefault(); T.openEntry(doc, T.findTransactionButton(doc)); }
    }, true);
    [100, 400, 900].forEach(delay => win.setTimeout(() => {
      let activePage = "";
      try { activePage = win.sessionStorage.getItem(T.PAGE_KEY) || win.localStorage.getItem(T.PAGE_KEY) || ""; } catch {}
      if (activePage !== "transactions" || doc.querySelector(".txe-page,.txe-deleted-page")) return;
      const button = T.findTransactionButton(doc);
      if (button) T.renderTransactions(doc, button);
    }, delay));
  };
  const boot = () => { try { T.install(T.host.contentDocument); } catch (error) { console.error("Transaction entry could not be installed.", error); } };
  T.host.addEventListener("load", boot);
  if (T.host.contentDocument?.readyState === "complete") boot();
})();
