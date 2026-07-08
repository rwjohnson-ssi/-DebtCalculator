(() => {
  "use strict";

  const PAGE_KEY = "debtwizard-active-page";
  const BUDGET_MODE_KEY = "debtwizard-budget-mode";
  const MODES = ["planned", "spent", "remaining"];

  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number.isFinite(value) ? value : 0);
  const number = value => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : 0;
  const parseMoney = value => number(String(value || "").replace(/[^0-9.-]/g, ""));

  function addStyles() {
    if (document.getElementById("paycheck-form-overlap-fix-v4-styles")) return;
    const style = document.createElement("style");
    style.id = "paycheck-form-overlap-fix-v4-styles";
    style.textContent = `
      /* The native iPhone date input has a wide intrinsic minimum. On phone
         widths, stack payroll fields so neither control can overlap. */
      @media (max-width: 560px) {
        #paycheck-overlay .paycheck-config {
          display: block !important;
          padding: 16px !important;
        }
        #paycheck-overlay .paycheck-two {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 14px !important;
          width: 100% !important;
        }
        #paycheck-overlay .paycheck-two > .paycheck-field {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 6px !important;
          min-width: 0 !important;
          width: 100% !important;
        }
        #paycheck-overlay .paycheck-two > .paycheck-field > input,
        #paycheck-overlay .paycheck-two > .paycheck-field > select,
        #paycheck-overlay input[type="date"] {
          display: block !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          min-inline-size: 0 !important;
          box-sizing: border-box !important;
        }
        #paycheck-overlay input[type="date"] {
          -webkit-appearance: none;
          appearance: none;
        }
        #paycheck-overlay .paycheck-amount-helper {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          grid-template-areas:
            "title"
            "actions"
            "copy" !important;
          gap: 8px !important;
          width: 100% !important;
          margin-top: 14px !important;
        }
        #paycheck-overlay .paycheck-amount-helper .paycheck-quick-add {
          justify-content: flex-start !important;
          flex-wrap: wrap !important;
        }
        #paycheck-overlay .paycheck-config > .paycheck-empty {
          display: block !important;
          width: 100% !important;
          margin-top: 14px !important;
          box-sizing: border-box !important;
        }
      }
      .budget-mode-toggle {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 4px;
        margin: 12px 0 14px;
        padding: 4px;
        border-radius: 14px;
        background: #e7f8fc;
        border: 1px solid #cfe9ee;
      }
      .budget-mode-toggle button {
        min-height: 40px;
        border: 0;
        border-radius: 11px;
        background: transparent;
        color: #0f7893;
        font-size: .94rem;
        font-weight: 900;
      }
      .budget-mode-toggle button.active {
        background: #20bfd7;
        color: #fff;
        box-shadow: 0 6px 14px rgba(32, 191, 215, .22);
      }
      .budget-mode-note {
        margin: 0 0 13px;
        text-align: center;
        color: #4c5b62;
        font-size: .92rem;
        font-weight: 800;
      }
      .budget-mode-note strong { color: #0c8aa8; }
      .edp-item-row,
      .budget-bill-row { grid-template-rows: auto auto !important; }
      .budget-status-bar {
        grid-column: 1 / -1;
        width: 100%;
        height: 6px;
        border-radius: 999px;
        background: #edf1f2;
        overflow: hidden;
        margin-top: 2px;
      }
      .budget-status-fill {
        display: block;
        height: 100%;
        width: 0%;
        border-radius: inherit;
        background: #0f516b;
        transition: width .18s ease;
      }
      .budget-status-fill.spent { background: #20bfd7; }
      .budget-status-fill.planned { background: #c9d3d7; }
      .budget-status-fill.remaining { background: #0f516b; }
      .budget-section-mode-label {
        color: #5f6f76;
        font-weight: 850;
      }
    `;
    document.head.appendChild(style);
  }

  function safeSet(page) {
    try {
      localStorage.setItem(PAGE_KEY, page);
      sessionStorage.setItem(PAGE_KEY, page);
    } catch {}
  }

  function safeGet() {
    try {
      return sessionStorage.getItem(PAGE_KEY) || localStorage.getItem(PAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function getBudgetMode() {
    try {
      const value = localStorage.getItem(BUDGET_MODE_KEY) || "planned";
      return MODES.includes(value) ? value : "planned";
    } catch {
      return "planned";
    }
  }

  function setBudgetMode(mode) {
    try { localStorage.setItem(BUDGET_MODE_KEY, MODES.includes(mode) ? mode : "planned"); } catch {}
  }

  function onBudget() {
    return Boolean(
      document.getElementById("budget-form") ||
      document.querySelector('.tab-btn.active[data-page="budget"], [data-act="nav"].active[data-page="budget"]')
    );
  }

  function budgetRelated(target) {
    return Boolean(target?.closest?.([
      ".edp-popup",
      ".edp-backdrop",
      ".budget-edit-popup",
      ".budget-edit-backdrop",
      "[data-edp-act]",
      "[data-edp-save]",
      "[data-edp-delete]",
      "[data-edp-close]",
      '[data-act="add-budget-bill"]',
      '[data-act="save-budget-bill"]',
      '[data-act="delete-budget-bill"]',
      '[data-act="close-budget-bill"]',
      '[data-act="edit-budget-bill"]'
    ].join(",")));
  }

  function restoreBudget() {
    if (safeGet() !== "budget" || onBudget()) return;
    const tab = document.querySelector('.tab-btn[data-page="budget"], [data-act="nav"][data-page="budget"]');
    if (tab) tab.click();
  }

  function rowValue(row) {
    if (!row.dataset.budgetPlanned) {
      const amountNode = row.querySelector(".edp-amount,.budget-bill-amount");
      row.dataset.budgetPlanned = String(parseMoney(amountNode?.childNodes?.[0]?.textContent || amountNode?.textContent || "0"));
      row.dataset.budgetSpent = String(parseMoney(row.dataset.spent || "0"));
    }
    const planned = Math.max(0, number(row.dataset.budgetPlanned));
    const spent = Math.max(0, number(row.dataset.budgetSpent));
    const remaining = Math.max(0, planned - spent);
    return { planned, spent, remaining };
  }

  function labelForMode(mode, sectionTitle = "") {
    if (/income/i.test(sectionTitle)) return mode === "spent" ? "Received" : mode === "remaining" ? "Remaining" : "Planned";
    return mode === "spent" ? "Spent" : mode === "remaining" ? "Remaining" : "Planned";
  }

  function ensureModeToggle(form) {
    if (document.querySelector(".budget-mode-toggle")) return;
    const host = form || document.getElementById("budget-form");
    if (!host) return;
    host.insertAdjacentHTML("afterbegin", `
      <div class="budget-mode-toggle" role="tablist" aria-label="Budget value view">
        <button type="button" data-budget-mode="planned">Planned</button>
        <button type="button" data-budget-mode="spent">Spent</button>
        <button type="button" data-budget-mode="remaining">Remaining</button>
      </div>
      <p class="budget-mode-note" data-budget-mode-note></p>
    `);
  }

  function ensureStatusBar(row) {
    if (row.querySelector(".budget-status-bar")) return;
    row.insertAdjacentHTML("beforeend", `<span class="budget-status-bar" aria-hidden="true"><span class="budget-status-fill"></span></span>`);
  }

  function updateRow(row, mode) {
    ensureStatusBar(row);
    const values = rowValue(row);
    const amountNode = row.querySelector(".edp-amount,.budget-bill-amount");
    const value = values[mode];
    const percent = values.planned > 0 ? Math.max(0, Math.min(100, value / values.planned * 100)) : 0;
    const fill = row.querySelector(".budget-status-fill");
    if (fill) {
      fill.className = `budget-status-fill ${mode}`;
      fill.style.width = `${mode === "planned" && values.planned > 0 ? 100 : percent}%`;
    }
    if (amountNode) amountNode.innerHTML = `${money(value)}<small>Edit ›</small>`;
  }

  function updateSectionHeaders(mode) {
    document.querySelectorAll(".section").forEach(section => {
      const title = section.querySelector(".section-title")?.textContent?.trim() || "";
      const total = section.querySelector(".budget-section-total");
      if (!total || (!/^Income/.test(title) && !/^Assigned categories/.test(title) && !/^Bills/.test(title))) return;
      total.textContent = labelForMode(mode, title);
      total.classList.add("budget-section-mode-label");
    });
  }

  function plannedTotal(rows) {
    return rows.reduce((sum, row) => sum + rowValue(row).planned, 0);
  }

  function spentTotal(rows) {
    return rows.reduce((sum, row) => sum + rowValue(row).spent, 0);
  }

  function enhanceBudgetMode() {
    const form = document.getElementById("budget-form");
    if (!form) return;
    ensureModeToggle(form);
    const mode = getBudgetMode();
    document.querySelectorAll("[data-budget-mode]").forEach(button => button.classList.toggle("active", button.dataset.budgetMode === mode));

    const rows = [...document.querySelectorAll(".edp-item-row,.budget-bill-row")];
    rows.forEach(row => updateRow(row, mode));
    updateSectionHeaders(mode);

    const planned = plannedTotal(rows);
    const spent = spentTotal(rows);
    const remaining = Math.max(0, planned - spent);
    const note = document.querySelector("[data-budget-mode-note]");
    if (note) {
      note.innerHTML = mode === "spent"
        ? `<strong>${money(spent)}</strong> tracked as spent so far`
        : mode === "remaining"
          ? `<strong>${money(remaining)}</strong> remaining from planned items`
          : `<strong>${money(planned)}</strong> planned across visible items`;
    }
  }

  function watchActivePage() {
    document.addEventListener("click", event => {
      const modeButton = event.target.closest("[data-budget-mode]");
      if (modeButton) {
        event.preventDefault();
        setBudgetMode(modeButton.dataset.budgetMode);
        enhanceBudgetMode();
        return;
      }
      const nav = event.target.closest('[data-act="nav"][data-page], .tab-btn[data-page]');
      if (nav?.dataset?.page) safeSet(nav.dataset.page);
      else if (onBudget() || budgetRelated(event.target)) safeSet("budget");
    }, true);

    document.addEventListener("submit", event => {
      if (event.target?.id === "budget-form" || onBudget()) safeSet("budget");
    }, true);

    window.addEventListener("beforeunload", () => {
      if (onBudget() || document.querySelector(".edp-popup,.budget-edit-popup")) safeSet("budget");
    });

    window.addEventListener("load", () => {
      let tries = 0;
      const timer = setInterval(() => {
        restoreBudget();
        enhanceBudgetMode();
        if (++tries > 60 || onBudget()) clearInterval(timer);
      }, 125);
    });

    if (document.body) new MutationObserver(() => { restoreBudget(); enhanceBudgetMode(); }).observe(document.body, { childList: true, subtree: true });
  }

  function apply() {
    addStyles();
    const root = document.getElementById("modal-root");
    const form = root?.querySelector("#paycheck-form");
    const pair = form?.querySelector(".paycheck-two");
    if (pair) pair.classList.add("paycheck-fields-stacked-mobile");
    restoreBudget();
    enhanceBudgetMode();
  }

  watchActivePage();
  if (document.body) new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  apply();
})();
