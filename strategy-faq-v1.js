(() => {
  "use strict";

  const screen = document.getElementById("screen");
  if (!screen) return;

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
  });

  new MutationObserver(queueEnsure).observe(screen, { childList: true, subtree: true });
  queueEnsure();
})();
