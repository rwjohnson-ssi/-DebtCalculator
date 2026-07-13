(() => {
  "use strict";
  const T = window.DWTx76;
  T.transactionRows = (transactions, month) => transactions.map(transaction => {
    const date = T.dayParts(transaction.date), amount = T.cents(transaction.amount), search = `${transaction.merchant || transaction.source || ""} ${T.allocationCategory(transaction)}`.toLowerCase();
    return `<button type="button" class="txe-row" data-txe-edit="${T.esc(transaction.id)}" data-txe-month="${T.esc(month)}" data-search="${T.esc(search)}"><span class="txe-date">${T.esc(date.month)}<br>${T.esc(date.day)}</span><span><span class="txe-name">${T.esc(transaction.merchant || transaction.source || "Transaction")}</span><span class="txe-category">${T.esc(T.allocationCategory(transaction))}</span></span><span class="txe-amount">${transaction.type === "income" ? "+" : "-"}${T.money.format(amount)}</span></button>`;
  }).join("");
  T.deletedRows = rows => rows.map(({ month, transaction }) => {
    const date = T.dayParts(transaction.date || transaction.deletedAt);
    return `<article class="txe-deleted-item"><span class="txe-date">${T.esc(date.month)}<br>${T.esc(date.day)}</span><span><span class="txe-name">${T.esc(transaction.merchant || transaction.source || "Transaction")}</span><span class="txe-deleted-meta">${T.esc(T.allocationCategory(transaction))} · ${T.esc(T.monthLabel(month))}</span></span><button type="button" class="txe-restore" data-txe-restore="${T.esc(transaction.id)}" data-txe-month="${T.esc(month)}">Restore</button></article>`;
  }).join("");
  T.renderTransactions = (doc, activeButton, monthOverride = "") => {
    T.injectStyles(doc);
    const win = doc.defaultView, state = T.ensureState(T.readState(win)), month = T.validMonth(monthOverride) ? monthOverride : T.selectedMonth(state), budget = T.budgetFor(state, month, false);
    const transactions = [...(budget?.transactions || [])].filter(transaction => !T.isDeleted(transaction)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    const screen = doc.getElementById("screen");
    if (!screen) return;
    try { win.localStorage.setItem(T.PAGE_KEY, "transactions"); win.sessionStorage.setItem(T.PAGE_KEY, "transactions"); } catch {}
    screen.dataset.transactionsShell = "current";
    const deletedCount = T.deletedTransactions(state).length;
    screen.innerHTML = `<section class="txe-page"><header class="txe-hero"><h1 class="txe-title">Transactions</h1><label class="txe-search"><span>⌕</span><input type="search" placeholder="Search transactions" aria-label="Search transactions"></label></header><main class="txe-wrap"><button type="button" class="txe-deleted-link" data-txe-deleted><span>♲</span><span>Deleted Transactions</span><span class="txe-deleted-count">${deletedCount ? `${deletedCount} ›` : "›"}</span></button>${transactions.length ? `<article class="txe-card"><div class="txe-month">${T.esc(T.monthLabel(month))}</div>${T.transactionRows(transactions, month)}<div class="txe-no-results">No transactions match your search.</div></article>` : `<section class="txe-empty"><h2>Track your first transaction</h2><p>Enter an expense or income transaction and assign it to the correct budget item.</p><button type="button" class="txe-primary" data-txe-add>Track My First Transaction</button></section>`}</main><button type="button" class="txe-fab" data-txe-add aria-label="Add transaction">+</button></section>`;
    T.markActive(doc, activeButton || T.findTransactionButton(doc));
    const search = screen.querySelector(".txe-search input");
    search?.addEventListener("input", () => { const query = search.value.trim().toLowerCase(); let visible = 0; screen.querySelectorAll(".txe-row").forEach(row => { const match = !query || row.dataset.search.includes(query); row.hidden = !match; if (match) visible += 1; }); screen.querySelector(".txe-no-results")?.classList.toggle("show", Boolean(query) && visible === 0); });
  };
  T.renderDeleted = (doc, activeButton) => {
    T.injectStyles(doc);
    const rows = T.deletedTransactions(T.ensureState(T.readState(doc.defaultView))), screen = doc.getElementById("screen");
    if (!screen) return;
    screen.dataset.transactionsShell = "deleted";
    screen.innerHTML = `<section class="txe-deleted-page"><header class="txe-deleted-head"><button type="button" class="txe-deleted-back" data-txe-deleted-back>‹ Back</button><div class="txe-deleted-title">Deleted Transactions</div><span></span></header><main class="txe-deleted-body">${rows.length ? `<section class="txe-deleted-card">${T.deletedRows(rows)}</section>` : '<div class="txe-deleted-empty">No deleted transactions yet.</div>'}</main></section>`;
    T.markActive(doc, activeButton || T.findTransactionButton(doc));
  };
})();
