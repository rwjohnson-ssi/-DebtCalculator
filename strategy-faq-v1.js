(() => {
  "use strict";

  const screen = document.getElementById("screen");
  if (!screen) return;

  const SELECTOR_FIX_BUILD = "3";
  const STORAGE_KEY = "debt-calculator-v2";
  const txMoney = new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" });

  const faqItems = [
    {
      question: "What is the debt snowball?",
      answer: `
        <p>The <strong>debt snowball</strong> keeps every account current by paying its required minimum, then sends every available extra dollar to the debt with the <strong>smallest balance</strong>. After that debt is paid off, its old minimum payment is added to the next-smallest debt.</p>
        <div class="strategy-faq-example">
          <div class="strategy-faq-example-title"><span>↗</span>Simple example</div>
          <ul>
            <li><span>Store Card — $500 balance · $35 minimum</span><b>Target first</b></li>
            <li><span>Credit Card — $1,500 balance · $60 minimum</span><b>Minimum only</b></li>
            <li><span>Auto Loan — $6,000 balance · $220 minimum</span><b>Minimum only</b></li>
          </ul>
        </div>
        <p>With <strong>$100 extra</strong> available each month, the Store Card receives <strong>$135</strong> ($35 minimum + $100 extra). The other accounts receive their normal minimums. Once the Store Card is paid off, its $35 minimum and the $100 extra roll into the Credit Card—so that card receives <strong>$195 per month</strong> before its balance is cleared.</p>
        <div class="strategy-faq-callout">The “snowball” grows because each finished payment becomes part of the next target payment.</div>
      `
    },
    {
      question: "What is the debt avalanche?",
      answer: `
        <p>The <strong>debt avalanche</strong> also keeps every account current with its minimum payment, but it sends extra money to the debt with the <strong>highest APR</strong> first. After that debt is paid off, the payment rolls into the account with the next-highest APR.</p>
        <div class="strategy-faq-example">
          <div class="strategy-faq-example-title"><span>%</span>Quick example</div>
          <ul>
            <li><span>Store Card — 31.99% APR</span><b>Target first</b></li>
            <li><span>Credit Card — 24.99% APR</span><b>Next target</b></li>
            <li><span>Auto Loan — 7.50% APR</span><b>Minimum only</b></li>
          </ul>
        </div>
        <p>Because it attacks the costliest interest rate first, the avalanche method will often reduce total interest compared with snowball when the payment amount and account details are otherwise the same.</p>
      `
    },
    {
      question: "Should I use snowball or avalanche?",
      answer: `
        <p>Choose the approach you are most likely to follow consistently. <strong>Snowball</strong> is helpful when quick account payoffs will keep you motivated. <strong>Avalanche</strong> is helpful when your priority is generally minimizing interest cost.</p>
        <p>You can compare both methods in DebtWizard by switching the Extra payment priority setting. Your plan is an estimate, so review your actual statements, promotional rates, and creditor requirements before making payments.</p>
      `
    },
    {
      question: "What happens when a debt is paid off?",
      answer: `
        <p>DebtWizard keeps the overall monthly funding amount in the plan. When one account reaches a zero balance, the amount that had been going to that account is automatically available for the next priority debt in the following payoff step.</p>
        <p>For example, if a paid-off card had a $35 minimum and you were adding $100 extra, the next target can receive that combined $135 in addition to its own required minimum.</p>
      `
    },
    {
      question: "What counts as an extra payment?",
      answer: `
        <p>An <strong>extra payment</strong> is any amount above the total minimum payments for the month. It can be a fixed monthly amount, overtime, a bonus, tax refund, side-income, or money you saved by reducing another expense.</p>
        <p>Use <strong>Recurring funding</strong> for the amount you plan to set aside every cycle. Use <strong>One-time fundings</strong> for a lump sum that should be applied in a specific month.</p>
      `
    },
    {
      question: "Why is the payoff date only an estimate?",
      answer: `
        <p>The projected date is calculated from the balances, APRs, minimum payments, extra funding, and one-time amounts you enter. Actual results can change because interest accrues by the creditor’s rules, statement dates differ, balances can change, and payments may post on different days.</p>
        <p class="strategy-faq-disclaimer">DebtWizard is a planning tool—not a lender statement or financial advice. Always make at least the required payment shown by your creditor by its actual due date.</p>
      `
    }
  ];

  const txValue = input => Number.isFinite(Number.parseFloat(String(input ?? "").replace(/[^0-9.-]/g, "")))
    ? Number.parseFloat(String(input ?? "").replace(/[^0-9.-]/g, ""))
    : 0;
  const txCents = input => Math.max(0, Math.round((txValue(input) + Number.EPSILON) * 100) / 100);
  const txEsc = input => String(input ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

  function ensureTransactionSelectorStyles() {
    if (document.getElementById(`dw-transaction-selector-fix-v${SELECTOR_FIX_BUILD}`)) return;
    document.querySelectorAll('[id^="dw-transaction-selector-fix-v"]').forEach(node => node.remove());
    const style = document.createElement("style");
    style.id = `dw-transaction-selector-fix-v${SELECTOR_FIX_BUILD}`;
    style.textContent = `
      .dw-selector-fallback{position:fixed;z-index:1800;inset:0;background:#f4f6f7;display:flex;flex-direction:column;color:#173f50}
      .dw-selector-fallback-head{display:grid;grid-template-columns:78px 1fr 78px;align-items:center;padding:calc(14px + env(safe-area-inset-top,0px)) 18px 14px;background:linear-gradient(135deg,#0791aa,#31c5d9);color:#fff}
      .dw-selector-fallback-head strong{text-align:center;font-size:1.08rem;font-weight:900}
      .dw-selector-fallback-head button{border:0;background:transparent;color:#fff;font:inherit;font-weight:850;padding:10px 0}
      .dw-selector-fallback-head button:last-child{text-align:right}
      .dw-selector-fallback-body{flex:1;overflow:auto;padding:20px 18px calc(28px + env(safe-area-inset-bottom,0px))}
      .dw-selector-fallback-note{margin:0 0 14px;color:#66777e;line-height:1.35}
      .dw-selector-fallback-list{overflow:hidden;border:1px solid #dce8eb;border-radius:20px;background:#fff;box-shadow:0 10px 28px rgba(22,43,52,.06)}
      .dw-selector-fallback-item{width:100%;min-height:64px;display:grid;grid-template-columns:34px minmax(0,1fr);gap:12px;align-items:center;border:0;border-bottom:1px solid #e7edef;background:#fff;padding:12px 16px;color:#26363d;text-align:left;font:inherit;font-weight:850}
      .dw-selector-fallback-item:last-child{border-bottom:0}
      .dw-selector-fallback-check{width:25px;height:25px;display:grid;place-items:center;border:2px solid #9fb2b9;border-radius:8px;color:transparent;font-size:.92rem}
      .dw-selector-fallback-item.selected{background:#eefafd}
      .dw-selector-fallback-item.selected .dw-selector-fallback-check{border-color:#0c91ad;background:#0c91ad;color:#fff}
      .dw-selector-fallback-empty{padding:22px;color:#6f7d82;text-align:center}
      .dw-tx-selected-fallback{overflow:hidden;padding:0!important;margin-bottom:0!important;border-radius:20px 20px 0 0!important}
      .dw-tx-selected-fallback-row{display:grid;grid-template-columns:38px minmax(0,1fr) 128px;gap:12px;align-items:center;min-height:64px;padding:8px 16px;border-bottom:1px solid #e6ebee;background:#fff}
      .dw-tx-selected-fallback-row strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#24414d}
      .dw-tx-selected-fallback-remove{width:29px;height:29px;display:grid;place-items:center;border:0;border-radius:50%;background:#e94949;color:#fff;font-size:1.25rem;line-height:1}
      .dw-tx-selected-fallback-row input{box-sizing:border-box;width:100%;min-width:0;min-height:44px;border:0;border-radius:10px;background:#f7fbfc;padding:8px 10px;color:#087f9a;font-size:1rem;font-weight:850;text-align:right;outline:0}
      .dw-tx-selected-fallback-footer{padding:14px 18px;background:#075f87;color:#fff;text-align:center;font-weight:900;font-size:1rem}
      .dw-tx-selected-fallback + .dw-tx-budget-row{border-radius:0 0 20px 20px!important}
    `;
    document.head.appendChild(style);
  }

  function transactionSheetItems(sheet) {
    try {
      const parsed = JSON.parse(sheet?.dataset.budgetItems || "[]");
      return Array.isArray(parsed)
        ? parsed.map(item => ({ id:String(item.id || ""), name:String(item.name || "Budget item"), amount:txCents(item.amount) })).filter(item => item.id)
        : [];
    } catch { return []; }
  }

  function transactionAmount(sheet) {
    const amountField = [...(sheet?.querySelectorAll(".dw-tx-field") || [])]
      .find(field => field.querySelector("span")?.textContent?.trim() === "Amount");
    const input = amountField?.querySelector("input");
    return txCents(input?.dataset.rawValue || input?.value);
  }

  function updateFallbackRemaining(sheet) {
    const footer = sheet?.querySelector(".dw-tx-selected-fallback-footer");
    if (!footer) return;
    const items = transactionSheetItems(sheet);
    const remaining = Math.max(0, txCents(transactionAmount(sheet) - items.reduce((sum, item) => sum + txCents(item.amount), 0)));
    footer.textContent = `${txMoney.format(remaining)} Left to Split`;
  }

  function renderFallbackAllocations(sheet) {
    if (!sheet) return;
    const budgetRow = sheet.querySelector(".dw-tx-budget-row");
    if (!budgetRow) return;
    sheet.querySelector(".dw-tx-selected-fallback")?.remove();
    const items = transactionSheetItems(sheet);
    const action = budgetRow.querySelector("em");
    if (action) action.textContent = items.length ? "Add another ›" : "Select ›";
    if (!items.length) return;

    const panel = document.createElement("section");
    panel.className = "dw-tx-panel dw-tx-selected-fallback";
    panel.innerHTML = `${items.map(item => `
      <label class="dw-tx-selected-fallback-row" data-dw-selected-item="${txEsc(item.id)}">
        <button type="button" class="dw-tx-selected-fallback-remove" data-dw-remove-selected-fallback="${txEsc(item.id)}" aria-label="Remove ${txEsc(item.name)}">−</button>
        <strong>${txEsc(item.name)}</strong>
        <input type="number" min="0" step="0.01" inputmode="decimal" value="${item.amount > .004 ? item.amount.toFixed(2) : ""}" placeholder="0.00" aria-label="${txEsc(item.name)} split amount">
      </label>`).join("")}
      <div class="dw-tx-selected-fallback-footer"></div>`;
    budgetRow.insertAdjacentElement("beforebegin", panel);
    updateFallbackRemaining(sheet);
  }

  function currentBudgetChoices(sheet) {
    const state = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
      catch { return {}; }
    })();
    const dateInput = [...(sheet.querySelectorAll(".dw-tx-field") || [])]
      .find(field => field.querySelector("span")?.textContent?.trim() === "Date")?.querySelector("input");
    const month = /^\d{4}-\d{2}-\d{2}$/.test(dateInput?.value || "")
      ? dateInput.value.slice(0,7)
      : new Date().toISOString().slice(0,7);
    const budget = state.settings?.monthlyBudgets?.[month] || {};
    const income = !!sheet.querySelector('.dw-tx-toggle [data-edp-trans-type="income"].active');
    const source = income ? budget.incomeItems : budget.bills;
    return (Array.isArray(source) ? source : [])
      .map(item => ({ id:String(item.id || ""), name:String(item.name || (income ? "Income" : "Budget item")) }))
      .filter(item => item.id && item.name);
  }

  function openFallbackSelector(sheet) {
    ensureTransactionSelectorStyles();
    document.querySelector(".dw-selector-fallback")?.remove();
    const choices = currentBudgetChoices(sheet);
    const existing = new Map(transactionSheetItems(sheet).map(item => [item.id, item]));
    const selected = new Set(existing.keys());
    const overlay = document.createElement("section");
    overlay.className = "dw-selector-fallback";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Select budget items");

    const paint = () => {
      overlay.innerHTML = `
        <header class="dw-selector-fallback-head">
          <button type="button" data-dw-selector-fallback-cancel>Cancel</button>
          <strong>Select Budget Items</strong>
          <button type="button" data-dw-selector-fallback-done>Done</button>
        </header>
        <main class="dw-selector-fallback-body">
          <p class="dw-selector-fallback-note">Choose one item to apply the full transaction automatically, or choose multiple items to split the amount.</p>
          <div class="dw-selector-fallback-list">
            ${choices.length ? choices.map(item => `
              <button type="button" class="dw-selector-fallback-item ${selected.has(item.id) ? "selected" : ""}" data-dw-selector-fallback-item="${txEsc(item.id)}">
                <span class="dw-selector-fallback-check">✓</span><span>${txEsc(item.name)}</span>
              </button>`).join("") : '<div class="dw-selector-fallback-empty">No budget items are available for this month.</div>'}
          </div>
        </main>`;
    };

    overlay.addEventListener("click", event => {
      const itemButton = event.target.closest("[data-dw-selector-fallback-item]");
      if (itemButton) {
        const id = itemButton.dataset.dwSelectorFallbackItem;
        selected.has(id) ? selected.delete(id) : selected.add(id);
        paint();
        return;
      }
      if (event.target.closest("[data-dw-selector-fallback-cancel]")) {
        overlay.remove();
        return;
      }
      if (event.target.closest("[data-dw-selector-fallback-done]")) {
        const next = choices.filter(item => selected.has(item.id)).map(item => ({
          id:item.id,
          name:item.name,
          amount:existing.get(item.id)?.amount || 0
        }));
        sheet.dataset.budgetItems = JSON.stringify(next);
        sheet.dataset.dwAllocationCount = String(next.length);
        overlay.remove();
        renderFallbackAllocations(sheet);
        sheet.dispatchEvent(new Event("change", { bubbles:true }));
      }
    });

    paint();
    document.body.appendChild(overlay);
  }

  function isStrategyScreen() {
    const page = screen.querySelector(".app-page");
    const title = page?.querySelector(".hero-title")?.textContent?.trim();
    return title === "Strategy" ? page : null;
  }

  function itemMarkup(item, index) {
    const open = index === 0;
    return `<article class="strategy-faq-item ${open ? "open" : ""}">
      <button class="strategy-faq-question" type="button" data-faq-toggle="${index}" aria-expanded="${open}" aria-controls="strategy-faq-answer-${index}">
        <span>${item.question}</span><span class="strategy-faq-plus" aria-hidden="true">+</span>
      </button>
      <div class="strategy-faq-answer" id="strategy-faq-answer-${index}" ${open ? "" : "hidden"}>${item.answer}</div>
    </article>`;
  }

  function ensureFaq() {
    const page = isStrategyScreen();
    if (!page || page.querySelector("#strategy-faq")) return;
    const wrap = page.querySelector(".page-wrap");
    if (!wrap) return;

    const section = document.createElement("section");
    section.className = "section strategy-faq-section";
    section.id = "strategy-faq";
    section.innerHTML = `<div class="strategy-faq-card">
      <div class="strategy-faq-intro">
        <span class="strategy-faq-eyebrow">DEBTWIZARD GUIDE</span>
        <h2>Frequently asked questions</h2>
        <p>Quick, plain-English explanations of the payoff methods and funding choices in this app.</p>
      </div>
      <div class="strategy-faq-list">${faqItems.map(itemMarkup).join("")}</div>
    </div>`;
    wrap.appendChild(section);
  }

  let queued = false;
  function queueEnsure() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      ensureFaq();
    });
  }

  document.addEventListener("click", event => {
    const budgetButton = event.target.closest(".dw-tx-budget-row");
    if (budgetButton) {
      const sheet = budgetButton.closest(".dw-tx-sheet");
      if (!sheet) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openFallbackSelector(sheet);
      return;
    }

    const removeButton = event.target.closest("[data-dw-remove-selected-fallback]");
    if (removeButton) {
      const sheet = removeButton.closest(".dw-tx-sheet");
      if (!sheet) return;
      event.preventDefault();
      const id = removeButton.dataset.dwRemoveSelectedFallback;
      sheet.dataset.budgetItems = JSON.stringify(transactionSheetItems(sheet).filter(item => item.id !== id));
      sheet.dataset.dwAllocationCount = String(transactionSheetItems(sheet).length);
      renderFallbackAllocations(sheet);
      sheet.dispatchEvent(new Event("change", { bubbles:true }));
      return;
    }

    const button = event.target.closest("[data-faq-toggle]");
    if (!button) return;
    event.preventDefault();
    const item = button.closest(".strategy-faq-item");
    const answer = item?.querySelector(".strategy-faq-answer");
    if (!item || !answer) return;
    const opening = !item.classList.contains("open");
    item.classList.toggle("open", opening);
    button.setAttribute("aria-expanded", String(opening));
    answer.hidden = !opening;
  }, true);

  document.addEventListener("input", event => {
    const input = event.target.closest(".dw-tx-selected-fallback-row input");
    if (!input) return;
    const sheet = input.closest(".dw-tx-sheet");
    const row = input.closest("[data-dw-selected-item]");
    if (!sheet || !row) return;
    const items = transactionSheetItems(sheet).map(item => item.id === row.dataset.dwSelectedItem
      ? { ...item, amount:txCents(input.dataset.rawValue || input.value) }
      : item);
    sheet.dataset.budgetItems = JSON.stringify(items);
    updateFallbackRemaining(sheet);
  }, true);

  new MutationObserver(() => {
    queueEnsure();
    const sheet = document.querySelector(".dw-tx-sheet");
    if (sheet && transactionSheetItems(sheet).length && !sheet.querySelector(".dw-tx-selected-fallback")) renderFallbackAllocations(sheet);
  }).observe(document.body, { childList:true, subtree:true });

  ensureTransactionSelectorStyles();
  queueEnsure();
})();
