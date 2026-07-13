(() => {
  "use strict";
  const T = window.DWTx76;
  T.saveEntry = (doc, root, entry, activeButton) => {
    if (!T.entryReady(entry)) return;
    const win = doc.defaultView, state = T.ensureState(T.readState(win)), targetMonth = entry.date.slice(0, 7), targetBudget = T.budgetFor(state, targetMonth, true), payload = T.payload(entry);
    if (entry.id && T.validMonth(entry.originalMonth)) {
      const originalBudget = T.budgetFor(state, entry.originalMonth, false);
      if (originalBudget) { originalBudget.transactions = originalBudget.transactions.filter(item => String(item.id) !== String(entry.id)); originalBudget.updatedAt = new Date().toISOString(); }
    }
    const existingIndex = targetBudget.transactions.findIndex(item => String(item.id) === String(payload.id));
    if (existingIndex >= 0) targetBudget.transactions[existingIndex] = payload; else targetBudget.transactions.push(payload);
    targetBudget.updatedAt = new Date().toISOString();
    T.rebuildTracking(state, entry.originalMonth);
    if (targetMonth !== entry.originalMonth) T.rebuildTracking(state, targetMonth);
    state.ui.budgetMonth = targetMonth;
    T.writeState(win, state);
    root.remove();
    T.renderTransactions(doc, activeButton, targetMonth);
  };
  T.deleteEntry = (doc, root, entry, activeButton) => {
    if (!entry.id || !T.validMonth(entry.originalMonth)) return;
    const win = doc.defaultView, state = T.ensureState(T.readState(win)), budget = T.budgetFor(state, entry.originalMonth, false);
    if (!budget) return;
    const index = budget.transactions.findIndex(item => String(item.id) === String(entry.id));
    if (index < 0) return;
    const [transaction] = budget.transactions.splice(index, 1);
    budget.deletedTransactions.unshift({ ...transaction, deletedAt:new Date().toISOString() });
    budget.updatedAt = new Date().toISOString();
    T.rebuildTracking(state, entry.originalMonth);
    T.writeState(win, state);
    root.remove();
    T.renderTransactions(doc, activeButton, entry.originalMonth);
  };
  T.restoreEntry = (doc, month, id, activeButton) => {
    if (!T.validMonth(month) || !id) return;
    const win = doc.defaultView, state = T.ensureState(T.readState(win)), budget = T.budgetFor(state, month, false);
    if (!budget) return;
    const index = budget.deletedTransactions.findIndex(item => String(item.id) === String(id));
    let transaction = null;
    if (index >= 0) [transaction] = budget.deletedTransactions.splice(index, 1);
    else transaction = budget.transactions.find(item => String(item.id) === String(id) && T.isDeleted(item)) || null;
    if (!transaction) return;
    delete transaction.deletedAt; delete transaction.deleted; delete transaction.isDeleted;
    if (!budget.transactions.some(item => String(item.id) === String(transaction.id))) budget.transactions.push(transaction);
    budget.updatedAt = new Date().toISOString();
    T.rebuildTracking(state, month);
    T.writeState(win, state);
    T.renderDeleted(doc, activeButton);
  };
  T.openEntry = (doc, activeButton, existing = null, originalMonth = "") => {
    T.injectStyles(doc);
    doc.querySelector(".txe-root")?.remove();
    const items = existing ? T.transactionItems(existing) : [];
    const entry = {
      id:existing?.id ? String(existing.id) : "", originalMonth:T.validMonth(originalMonth) ? originalMonth : "", createdAt:existing?.createdAt || "",
      type:existing?.type === "income" ? "income" : "expense", date:/^\d{4}-\d{2}-\d{2}$/.test(String(existing?.date || "")) ? existing.date : T.todayKey(), amount:T.cents(existing?.amount),
      party:existing?.type === "income" ? String(existing?.source || "") : String(existing?.merchant || ""), checkNumber:String(existing?.checkNumber || ""), note:String(existing?.note || ""), items, autoSplit:items.length <= 1
    };
    const isEdit = Boolean(entry.id), root = doc.createElement("section");
    root.className = "txe-root";
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", `${isEdit ? "Edit" : "Add"} Transaction`);
    root.innerHTML = `<header class="txe-head"><div class="txe-head-row"><button type="button" class="txe-link" data-txe-cancel>Cancel</button><strong>${isEdit ? "Edit" : "Add"} Transaction</strong><button type="button" class="txe-link" data-txe-save disabled>Done</button></div><div class="txe-toggle"><button type="button" class="${entry.type === "expense" ? "active" : ""}" data-txe-type="expense">− Expense</button><button type="button" class="${entry.type === "income" ? "active" : ""}" data-txe-type="income">+ Income</button></div></header><main class="txe-body"><section class="txe-panel"><label class="txe-field"><span>Date</span><input data-txe-date type="date" value="${T.esc(entry.date)}"></label><label class="txe-field"><span>Amount</span><input data-txe-amount type="number" min="0" step="0.01" inputmode="decimal" value="${entry.amount > .004 ? entry.amount.toFixed(2) : ""}" placeholder="0.00"></label><label class="txe-field"><span data-txe-party-label>${entry.type === "income" ? "Source" : "Merchant"}</span><input data-txe-party type="text" maxlength="80" value="${T.esc(entry.party)}" placeholder="Name"></label><div class="txe-account"><strong>Account</strong><small>No bank connection required. Transactions are entered manually and stored locally in this browser.</small></div></section><button type="button" class="txe-budget-button"><span>Budget Item(s)</span><span>Select ›</span></button><section class="txe-panel"><label class="txe-field"><span>Check #</span><input data-txe-check type="text" inputmode="numeric" value="${T.esc(entry.checkNumber)}" placeholder="0000"></label></section><textarea class="txe-note" data-txe-note placeholder="Add a Note">${T.esc(entry.note)}</textarea>${isEdit ? '<button type="button" class="txe-delete" data-txe-delete>Delete Transaction</button>' : ""}</main>`;
    root.addEventListener("input", event => {
      if (event.target.matches("[data-txe-date]")) {
        const nextDate = event.target.value;
        if (/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) { const changedMonth = nextDate.slice(0, 7) !== entry.date.slice(0, 7); entry.date = nextDate; if (changedMonth) { entry.items = []; entry.autoSplit = true; T.renderAllocations(root, entry); } }
      } else if (event.target.matches("[data-txe-amount]")) {
        entry.amount = T.cents(event.target.value);
        if (entry.items.length === 1) entry.items[0].amount = T.entryTotal(entry);
        else if (entry.items.length > 1 && entry.autoSplit) { const amounts = T.evenSplit(T.entryTotal(entry), entry.items.length); entry.items.forEach((item, index) => { item.amount = amounts[index]; }); }
        T.renderAllocations(root, entry);
      } else if (event.target.matches("[data-txe-party]")) entry.party = event.target.value.trim();
      else if (event.target.matches("[data-txe-check]")) entry.checkNumber = event.target.value.trim();
      else if (event.target.matches("[data-txe-note]")) entry.note = event.target.value;
      else if (event.target.closest(".txe-allocation")) { const row = event.target.closest("[data-txe-item]"); entry.items = entry.items.map(item => item.id === row?.dataset.txeItem ? { ...item, amount:T.cents(event.target.value) } : item); entry.autoSplit = false; T.updateEntryState(root, entry); }
    });
    root.addEventListener("click", event => {
      if (event.target.closest("[data-txe-cancel]")) { root.remove(); return; }
      const typeButton = event.target.closest("[data-txe-type]");
      if (typeButton) {
        const nextType = typeButton.dataset.txeType === "income" ? "income" : "expense";
        if (entry.type !== nextType) { entry.type = nextType; entry.items = []; entry.autoSplit = true; root.querySelectorAll("[data-txe-type]").forEach(button => button.classList.toggle("active", button === typeButton)); root.querySelector("[data-txe-party-label]").textContent = nextType === "income" ? "Source" : "Merchant"; T.renderAllocations(root, entry); }
        return;
      }
      if (event.target.closest(".txe-budget-button")) { T.openSelector(doc, root, entry); return; }
      const remove = event.target.closest("[data-txe-remove]");
      if (remove) { entry.items = entry.items.filter(item => item.id !== remove.dataset.txeRemove); if (entry.items.length === 1) entry.items[0].amount = T.entryTotal(entry); entry.autoSplit = true; T.renderAllocations(root, entry); return; }
      if (event.target.closest("[data-txe-save]") && T.entryReady(entry)) { T.saveEntry(doc, root, entry, activeButton); return; }
      if (event.target.closest("[data-txe-delete]") && doc.defaultView.confirm("Delete this transaction?")) T.deleteEntry(doc, root, entry, activeButton);
    });
    doc.body.appendChild(root);
    T.renderAllocations(root, entry);
  };
  T.openStoredEntry = (doc, activeButton, month, id) => {
    if (!T.validMonth(month) || !id) return;
    const state = T.ensureState(T.readState(doc.defaultView)), transaction = T.budgetFor(state, month, false)?.transactions.find(item => String(item.id) === String(id));
    if (transaction) T.openEntry(doc, activeButton, transaction, month);
  };
})();
