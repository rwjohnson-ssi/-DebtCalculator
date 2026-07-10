(() => {
  "use strict";

  const LEGACY_HELPER = "https://raw.githubusercontent.com/rwjohnson-ssi/-DebtCalculator/1d8106c5816f07c04d4568f6da97aee27a10cff4/paycheck-form-overlap-fix-v4.js?helper=19";

  const currencyValue = value => {
    const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };

  const money = value => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(currencyValue(value));

  function isSplitInput(input) {
    return input instanceof HTMLInputElement && input.classList.contains("dw-tx-split-input");
  }

  function editableValue(value) {
    const amount = currencyValue(value);
    if (!amount) return "";
    return String(Number(amount.toFixed(2)));
  }

  function setRawSplitValue(input) {
    if (!isSplitInput(input)) return;
    const raw = editableValue(input.dataset.rawValue || input.value);
    input.value = raw;
    input.dataset.rawValue = raw;
    requestAnimationFrame(() => {
      try { input.setSelectionRange(raw.length, raw.length); } catch {}
    });
  }

  function formatSplitValue(input) {
    if (!isSplitInput(input)) return;
    const amount = currencyValue(input.value || input.dataset.rawValue);
    input.dataset.rawValue = amount ? amount.toFixed(2) : "";
    input.value = amount ? money(amount) : "";
  }

  function formatAllSplits() {
    document.querySelectorAll(".dw-tx-split-input").forEach(formatSplitValue);
  }

  function installSplitTypingFix() {
    document.addEventListener("focusin", event => {
      const input = event.target;
      if (!isSplitInput(input)) return;
      requestAnimationFrame(() => setRawSplitValue(input));
    });

    document.addEventListener("input", event => {
      const input = event.target;
      if (!isSplitInput(input)) return;
      input.dataset.rawValue = input.value;
    }, true);

    document.addEventListener("focusout", event => {
      const input = event.target;
      if (!isSplitInput(input)) return;
      requestAnimationFrame(() => formatSplitValue(input));
    }, true);

    document.addEventListener("click", event => {
      const action = event.target.closest(".dw-tx-done,[data-dw-selector-done],.dw-tx-budget-row,[data-edp-trans-add]");
      if (!action) return;
      const active = document.activeElement;
      if (isSplitInput(active)) {
        formatSplitValue(active);
        active.blur();
      }
      requestAnimationFrame(formatAllSplits);
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      const input = event.target;
      if (!isSplitInput(input)) return;
      formatSplitValue(input);
      input.blur();
    }, true);
  }

  function ensurePrimaryNavigationStyle() {
    if (document.getElementById("dw-persistent-nav-style")) return;
    const style = document.createElement("style");
    style.id = "dw-persistent-nav-style";
    style.textContent = `
      #tabbar{display:none!important}
      #dw-primary-nav{position:fixed;left:0;right:0;bottom:0;z-index:120;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:end;overflow:visible;background:#fff;border-top:1px solid #e1e8ea;padding:5px 0 calc(5px + env(safe-area-inset-bottom,0px));box-shadow:0 -4px 18px rgba(15,45,58,.07)}
      #dw-primary-nav .tab-btn,#dw-primary-nav .dw-nav-more,#dw-primary-nav .dw-nav-transaction{appearance:none;border:0;background:transparent;min-width:0;color:#929da2;font:inherit;font-size:.72rem;font-weight:800;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:4px 2px}
      #dw-primary-nav .tab-icon{display:grid;place-items:center;height:27px;font-size:1.35rem;line-height:1}
      #dw-primary-nav .tab-btn.active{color:#20bfd7}
      #dw-primary-nav .dw-nav-transaction .tab-icon{width:58px;height:58px;margin-top:-27px;border-radius:50%;background:#004b75;color:#fff;font-size:2.25rem;font-weight:400;box-shadow:0 8px 20px rgba(0,35,62,.27)}
      #dw-primary-nav .dw-nav-transaction span:last-child{color:#007f96}
      #dw-primary-nav .dw-nav-more .tab-icon{font-size:1.45rem;letter-spacing:.08em}
      #app-shell{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))}
    `;
    document.head.appendChild(style);
  }

  function syncPrimaryNavigation(page) {
    const nav = document.getElementById("dw-primary-nav");
    if (!nav) return;
    nav.querySelectorAll("[data-dw-page]").forEach(button => {
      button.classList.toggle("active", button.dataset.dwPage === page);
    });
  }

  function installPersistentNavigation() {
    ensurePrimaryNavigationStyle();

    const generatedBar = document.getElementById("tabbar");
    if (!generatedBar) return;
    generatedBar.hidden = true;
    generatedBar.setAttribute("aria-hidden", "true");

    let nav = document.getElementById("dw-primary-nav");
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "dw-primary-nav";
      nav.className = "tabbar";
      nav.setAttribute("aria-label", "Primary navigation");
      nav.innerHTML = `
        <button type="button" class="tab-btn" data-dw-page="home"><span class="tab-icon">⌂</span><span>Home</span></button>
        <button type="button" class="tab-btn" data-dw-page="debts"><span class="tab-icon">◔</span><span>Debts</span></button>
        <button type="button" class="dw-nav-transaction" data-edp-trans-add aria-label="Add transaction"><span class="tab-icon">+</span><span>Transaction</span></button>
        <button type="button" class="tab-btn" data-dw-page="budget"><span class="tab-icon">$</span><span>Budget</span></button>
        <button type="button" class="dw-nav-more" aria-label="More navigation"><span class="tab-icon">•••</span><span>More</span></button>
      `;
      document.body.appendChild(nav);
    } else if (nav.parentElement !== document.body) {
      document.body.appendChild(nav);
    }

    const activePage = generatedBar.querySelector(".tab-btn.active")?.dataset.page || "home";
    syncPrimaryNavigation(activePage);
  }

  function installPrimaryNavigationEvents() {
    document.addEventListener("click", event => {
      const pageButton = event.target.closest("#dw-primary-nav [data-dw-page]");
      if (pageButton) {
        const page = pageButton.dataset.dwPage;
        document.querySelector(`#tabbar .tab-btn[data-page="${page}"]`)?.click();
        syncPrimaryNavigation(page);
        return;
      }

      const nativeButton = event.target.closest('#tabbar .tab-btn[data-page]');
      if (nativeButton) syncPrimaryNavigation(nativeButton.dataset.page);

      if (event.target.closest(".dw-tx-done.dw-save-ready")) {
        requestAnimationFrame(installPersistentNavigation);
        setTimeout(installPersistentNavigation, 120);
      }
    }, true);
  }

  fetch(LEGACY_HELPER, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Unable to load DebtWizard helper.");
      return response.text();
    })
    .then(source => {
      (0, eval)(`${source}\n//# sourceURL=debtwizard-helper-v19.js`);
      installSplitTypingFix();
      installPrimaryNavigationEvents();
      installPersistentNavigation();
      formatAllSplits();
    })
    .catch(error => {
      console.error(error);
      installSplitTypingFix();
      installPrimaryNavigationEvents();
      installPersistentNavigation();
    });
})();