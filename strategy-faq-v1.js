(() => {
  "use strict";

  const screen = document.getElementById("screen");
  if (!screen) return;

  const FAQ_BUILD = "5";
  const STORAGE_KEY = "debt-calculator-v2";
  const MODE_KEY = "debtwizard-budget-value-mode";
  const money = new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" });
  const viewModes = new Set(["planned", "spent", "remaining"]);

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

  const number = value => {
    const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const cents = value => Math.round((number(value) + Number.EPSILON) * 100) / 100;

  function installStyles() {
    const styleId = `dw-budget-value-view-v${FAQ_BUILD}`;
    if (document.getElementById(styleId)) return;
    document.querySelectorAll('[id^="dw-budget-value-view-v"]').forEach(node => node.remove());
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .dw-budget-value-toggle{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:12px 0 16px;padding:4px;border-radius:13px;background:#e7f0f2}
      .dw-budget-value-toggle button{min-height:40px;border:0;border-radius:10px;background:transparent;color:#68777d;font:inherit;font-size:.88rem;font-weight:900}
      .dw-budget-value-toggle button.active{background:#fff;color:#087f9a;box-shadow:0 2px 8px rgba(15,81,107,.12)}
      .edp-amount .dw-budget-mode-value{display:block;color:#263137;font-size:1.05rem;font-weight:900}
      .edp-amount.negative .dw-budget-mode-value{color:#b8443d}
    `;
    document.head.appendChild(style);
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

  function budgetSection(title) {
    return [...document.querySelectorAll("#budget-form .section")]
      .find(section => (section.querySelector(".section-title")?.textContent || "").trim().startsWith(title));
  }

  function selectedBudgetMonth() {
    const formMonth = document.getElementById("budget-form")?.dataset.month;
    if (/^\d{4}-\d{2}$/.test(formMonth || "")) return formMonth;
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function readBudgetData() {
    let state = {};
    try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch {}
    const month = selectedBudgetMonth();
    const settings = state.settings && typeof state.settings === "object" ? state.settings : {};
    const budget = settings.monthlyBudgets?.[month] || {};
    const incomeItems = Array.isArray(budget.incomeItems) ? budget.incomeItems : [];
    const expenseItems = Array.isArray(budget.bills) ? budget.bills : [];
    const planned = new Map();
    incomeItems.forEach(item => planned.set(`income:${String(item.id || "")}`, cents(item.amount)));
    expenseItems.forEach(item => planned.set(`expense:${String(item.id || "")}`, cents(item.amount)));

    const actual = new Map();
    const transactions = Array.isArray(budget.transactions) ? budget.transactions : [];
    transactions.filter(transaction => !transaction.deleted && !transaction.deletedAt && !transaction.isDeleted).forEach(transaction => {
      const kind = transaction.type === "income" ? "income" : "expense";
      const allocations = Array.isArray(transaction.allocations) && transaction.allocations.length
        ? transaction.allocations
        : transaction.budgetItemId
          ? [{ budgetItemId:transaction.budgetItemId, amount:transaction.amount }]
          : [];
      allocations.forEach(allocation => {
        const id = String(allocation.budgetItemId || allocation.id || "");
        if (!id) return;
        const key = `${kind}:${id}`;
        actual.set(key, cents((actual.get(key) || 0) + number(allocation.amount)));
      });
    });

    const tracking = settings.budgetTracking?.[month];
    if (tracking && typeof tracking === "object") {
      Object.entries(tracking).forEach(([key, value]) => {
        if (!actual.has(key)) actual.set(key, cents(value));
      });
    }
    return { planned, actual };
  }

  function currentMode() {
    const stored = String(localStorage.getItem(MODE_KEY) || "planned").toLowerCase();
    return viewModes.has(stored) ? stored : "planned";
  }

  function setMode(mode) {
    if (!viewModes.has(mode)) return;
    localStorage.setItem(MODE_KEY, mode);
  }

  function recognizedMode(button) {
    const explicit = String(button?.dataset.dwBudgetMode || "").toLowerCase();
    if (viewModes.has(explicit)) return explicit;
    const text = String(button?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    return viewModes.has(text) ? text : "";
  }

  function ensureBudgetToggle() {
    const form = document.getElementById("budget-form");
    if (!form) return null;
    const recognized = [...form.querySelectorAll("button")].filter(button => recognizedMode(button));
    if (recognized.length >= 3) {
      recognized.forEach(button => { button.dataset.dwBudgetMode = recognizedMode(button); });
      return recognized[0].parentElement;
    }

    const assigned = budgetSection("Assigned categories");
    if (!assigned) return null;
    let toggle = assigned.querySelector(".dw-budget-value-toggle");
    if (!toggle) {
      toggle = document.createElement("div");
      toggle.className = "dw-budget-value-toggle";
      toggle.setAttribute("role", "group");
      toggle.setAttribute("aria-label", "Budget value view");
      toggle.innerHTML = `
        <button type="button" data-dw-budget-mode="planned">Planned</button>
        <button type="button" data-dw-budget-mode="spent">Spent</button>
        <button type="button" data-dw-budget-mode="remaining">Remaining</button>`;
      assigned.querySelector(".section-head")?.insertAdjacentElement("afterend", toggle);
    }
    return toggle;
  }

  function rowValue(row, mode, data) {
    const kind = row.dataset.kind === "income" ? "income" : "expense";
    const id = String(row.dataset.id || "");
    const key = `${kind}:${id}`;
    let planned = data.planned.get(key);
    if (!Number.isFinite(planned)) {
      planned = number(row.dataset.dwBudgetPlanned || row.querySelector(".edp-amount")?.textContent);
    }
    const spent = data.actual.get(key) || 0;
    row.dataset.dwBudgetPlanned = String(cents(planned));
    row.dataset.dwBudgetSpent = String(cents(spent));
    row.dataset.dwBudgetRemaining = String(cents(planned - spent));
    return mode === "spent" ? cents(spent) : mode === "remaining" ? cents(planned - spent) : cents(planned);
  }

  function applyBudgetValues() {
    const form = document.getElementById("budget-form");
    if (!form) return;
    const toggle = ensureBudgetToggle();
    if (!toggle) return;
    const mode = currentMode();
    [...form.querySelectorAll("button")].forEach(button => {
      const buttonMode = recognizedMode(button);
      if (!buttonMode) return;
      const active = buttonMode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    const data = readBudgetData();
    form.querySelectorAll(".edp-item-row[data-id][data-kind]").forEach(row => {
      const value = rowValue(row, mode, data);
      const amount = row.querySelector(".edp-amount");
      if (!amount) return;
      const next = money.format(value);
      let valueNode = amount.querySelector(".dw-budget-mode-value");
      if (!valueNode) {
        valueNode = document.createElement("span");
        valueNode.className = "dw-budget-mode-value";
        amount.prepend(valueNode);
        [...amount.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).forEach(node => node.remove());
      }
      if (valueNode.textContent !== next) valueNode.textContent = next;
      amount.classList.toggle("negative", value < -0.004);
    });

    document.querySelectorAll("#budget-form .edp-card").forEach(card => {
      const rows = [...card.querySelectorAll(".edp-item-row[data-id][data-kind]")];
      if (!rows.length) return;
      const total = rows.reduce((sum, row) => sum + rowValue(row, mode, data), 0);
      const totalNode = card.querySelector(".edp-cat-total");
      if (totalNode && totalNode.textContent !== money.format(total)) totalNode.textContent = money.format(total);
    });

    [["Income", "income"], ["Assigned categories", "expense"]].forEach(([title, kind]) => {
      const section = budgetSection(title);
      if (!section) return;
      const rows = [...section.querySelectorAll(`.edp-item-row[data-kind="${kind}"]`)];
      const total = rows.reduce((sum, row) => sum + rowValue(row, mode, data), 0);
      const totalNode = section.querySelector(".budget-section-total");
      if (totalNode && totalNode.textContent !== money.format(total)) totalNode.textContent = money.format(total);
    });
  }

  let queued = false;
  function queueEnsure() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      ensureFaq();
      applyBudgetValues();
    });
  }

  document.addEventListener("click", event => {
    const modeButton = event.target.closest("button");
    const mode = recognizedMode(modeButton);
    if (mode && document.getElementById("budget-form")?.contains(modeButton)) {
      event.preventDefault();
      event.stopPropagation();
      setMode(mode);
      applyBudgetValues();
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

  new MutationObserver(queueEnsure).observe(document.body, { childList:true, subtree:true });

  installStyles();
  queueEnsure();
})();
