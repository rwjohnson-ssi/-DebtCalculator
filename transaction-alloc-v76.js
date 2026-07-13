(() => {
  "use strict";
  const T = window.DWTx76;
  T.updateEntryState = (root, entry) => {
    const difference = Math.round((T.entryTotal(entry) - T.assignedTotal(entry)) * 100) / 100, summary = root.querySelector(".txe-summary");
    if (summary) {
      summary.classList.toggle("over", difference < -.004);
      summary.textContent = difference < -.004 ? `${T.money.format(Math.abs(difference))} Over Assigned` : `${T.money.format(Math.max(0, difference))} Left to Split`;
    }
    const save = root.querySelector("[data-txe-save]");
    if (save) save.disabled = !T.entryReady(entry);
  };
  T.renderAllocations = (root, entry) => {
    const body = root.querySelector(".txe-body"), budgetButton = root.querySelector(".txe-budget-button");
    body.querySelector(".txe-allocations")?.remove();
    budgetButton.querySelector("span:last-child").textContent = entry.items.length ? "Add another ›" : "Select ›";
    if (entry.items.length) {
      const panel = root.ownerDocument.createElement("section");
      panel.className = "txe-allocations";
      panel.innerHTML = `${entry.items.map(item => `<label class="txe-allocation" data-txe-item="${T.esc(item.id)}"><button type="button" class="txe-remove" data-txe-remove="${T.esc(item.id)}" aria-label="Remove ${T.esc(item.name)}">−</button><strong>${T.esc(item.name)}</strong><input type="number" min="0" step="0.01" inputmode="decimal" value="${item.amount > .004 ? item.amount.toFixed(2) : ""}" placeholder="0.00" aria-label="${T.esc(item.name)} split amount"></label>`).join("")}<div class="txe-summary"></div>`;
      budgetButton.insertAdjacentElement("beforebegin", panel);
    }
    T.updateEntryState(root, entry);
  };
  T.openSelector = (doc, root, entry) => {
    root.querySelector(".txe-selector")?.remove();
    const choices = T.choicesFor(doc, entry), selected = new Set(entry.items.map(item => item.id)), original = [...selected].sort().join("|");
    const selector = doc.createElement("section");
    selector.className = "txe-selector";
    selector.setAttribute("role", "dialog");
    selector.setAttribute("aria-modal", "true");
    selector.setAttribute("aria-label", "Select budget items");
    const paint = () => {
      selector.innerHTML = `<header class="txe-selector-head"><div class="txe-selector-top"><button type="button" data-txe-selector-cancel>Cancel</button><strong>Select Budget Items</strong><button type="button" data-txe-selector-done>Done</button></div><label class="txe-selector-search"><span>⌕</span><input type="search" placeholder="Search budget items" aria-label="Search budget items"></label></header><main class="txe-selector-body"><p class="txe-selector-note">Choose one item to apply the full amount, or choose multiple items to split the transaction.</p><div class="txe-selector-list">${choices.length ? choices.map(item => `<button type="button" class="txe-choice${selected.has(item.id) ? " selected" : ""}" data-txe-choice="${T.esc(item.id)}"><span class="txe-check">✓</span><strong>${T.esc(item.name)}</strong><small>${T.money.format(item.planned)}</small></button>`).join("") : '<div class="txe-selector-empty">No budget items are available for this month.</div>'}</div></main>`;
      selector.querySelector("input[type=search]")?.addEventListener("input", event => { const query = event.target.value.trim().toLowerCase(); selector.querySelectorAll("[data-txe-choice]").forEach(row => { row.hidden = Boolean(query) && !row.textContent.toLowerCase().includes(query); }); });
    };
    selector.addEventListener("click", event => {
      const choice = event.target.closest("[data-txe-choice]");
      if (choice) { const id = choice.dataset.txeChoice; selected.has(id) ? selected.delete(id) : selected.add(id); paint(); return; }
      if (event.target.closest("[data-txe-selector-cancel]")) { selector.remove(); return; }
      if (event.target.closest("[data-txe-selector-done]")) {
        const existing = new Map(entry.items.map(item => [item.id, item]));
        const next = choices.filter(item => selected.has(item.id)).map(item => ({ id:item.id, name:item.name, amount:existing.get(item.id)?.amount || 0 }));
        const changed = [...selected].sort().join("|") !== original;
        if (next.length === 1) { next[0].amount = T.entryTotal(entry); entry.autoSplit = true; }
        else if (next.length > 1 && changed) { const amounts = T.evenSplit(T.entryTotal(entry), next.length); next.forEach((item, index) => { item.amount = amounts[index]; }); entry.autoSplit = true; }
        entry.items = T.uniqueItems(next);
        selector.remove();
        T.renderAllocations(root, entry);
      }
    });
    paint();
    root.appendChild(selector);
  };
})();
