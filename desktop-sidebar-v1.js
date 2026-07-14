(() => {
  "use strict";

  if (window.__debtWizardDesktopSidebarV1) return;
  window.__debtWizardDesktopSidebarV1 = true;

  const COLLAPSED_KEY = "debtwizard-desktop-sidebar-collapsed";
  const items = [
    ["home", "Home", "⌂"],
    ["debts", "Debts", "◔"],
    ["transactions", "Transactions", "$"],
    ["budget", "Budget", "$"],
    ["strategy", "Payoff Strategy", "✦"],
    ["plan", "Debt Payoff Plan", "▤"],
    ["track", "Debt Payment Tracking", "✓"]
  ];

  function isCollapsed() {
    try { return localStorage.getItem(COLLAPSED_KEY) === "true"; } catch { return false; }
  }

  function saveCollapsed(value) {
    try { localStorage.setItem(COLLAPSED_KEY, value ? "true" : "false"); } catch {}
  }

  function routeTo(doc, page, button) {
    if (page === "transactions") {
      const T = window.DWTx76;
      const transactionControl = T?.findTransactionButton?.(doc)
        || [...doc.querySelectorAll("#dw-primary-nav button,#tabbar button")].find(control => /transactions?/i.test(`${control.getAttribute("aria-label") || ""} ${control.textContent || ""}`));
      if (T?.renderTransactions) {
        T.renderTransactions(doc, transactionControl || button);
        setActive(doc, "transactions");
        return;
      }
      transactionControl?.click();
      return;
    }

    const native = doc.querySelector(`#tabbar [data-page="${page}"]`);
    if (native) {
      native.click();
      setTimeout(() => setActive(doc, page), 0);
    }
  }

  function currentPage(doc) {
    if (doc.querySelector(".txe-page,.txe-deleted-page")) return "transactions";
    const active = doc.querySelector("#tabbar .active[data-page],#tabbar [aria-current='page'][data-page]");
    return active?.dataset.page || "home";
  }

  function setActive(doc, page = currentPage(doc)) {
    doc.querySelectorAll("#dw-desktop-sidebar [data-dw-desktop-page]").forEach(button => {
      const active = button.dataset.dwDesktopPage === page;
      button.classList.toggle("active", active);
      button.toggleAttribute("aria-current", active);
      if (active) button.setAttribute("aria-current", "page");
    });
  }

  function installStyles(doc) {
    if (doc.getElementById("dw-desktop-sidebar-style-v1")) return;
    const style = doc.createElement("style");
    style.id = "dw-desktop-sidebar-style-v1";
    style.textContent = `
      #dw-desktop-sidebar{display:none}
      @media(min-width:900px){
        html,body{min-width:0!important;background:#f7fafb!important}
        body{--dw-sidebar-width:286px;transition:padding-left .24s ease!important;padding-left:var(--dw-sidebar-width)!important}
        body.dw-sidebar-collapsed{--dw-sidebar-width:104px}
        #dw-desktop-sidebar{box-sizing:border-box;position:fixed;z-index:1200;inset:0 auto 0 0;display:flex;flex-direction:column;width:var(--dw-sidebar-width);padding:28px 20px 24px;background:linear-gradient(180deg,#073f5b 0%,#075b78 100%);color:#fff;box-shadow:8px 0 30px rgba(1,39,57,.12);transition:width .24s ease,padding .24s ease}
        #dw-desktop-sidebar .dw-sidebar-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:52px;margin-bottom:28px;padding:0 2px}
        #dw-desktop-sidebar .dw-sidebar-brand{overflow:hidden;white-space:nowrap;font-size:1.55rem;font-weight:950;letter-spacing:-.04em}
        #dw-desktop-sidebar .dw-sidebar-toggle{flex:0 0 44px;width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:12px;background:rgba(255,255,255,.09);color:#fff;font:inherit;font-size:1.45rem;font-weight:900;cursor:pointer}
        #dw-desktop-sidebar .dw-sidebar-toggle:hover{background:rgba(255,255,255,.16)}
        #dw-desktop-sidebar .dw-sidebar-nav{display:grid;gap:10px}
        #dw-desktop-sidebar .dw-sidebar-item{box-sizing:border-box;width:100%;min-height:62px;display:grid;grid-template-columns:42px minmax(0,1fr);align-items:center;gap:12px;border:0;border-radius:14px;background:transparent;color:#fff;padding:9px 14px;text-align:left;font:inherit;font-size:1rem;font-weight:850;cursor:pointer;transition:background .18s ease,transform .18s ease}
        #dw-desktop-sidebar .dw-sidebar-item:hover{background:rgba(255,255,255,.09)}
        #dw-desktop-sidebar .dw-sidebar-item:active{transform:scale(.985)}
        #dw-desktop-sidebar .dw-sidebar-item.active{background:linear-gradient(135deg,#0987b1,#08799f);box-shadow:0 8px 20px rgba(0,28,43,.2)}
        #dw-desktop-sidebar .dw-sidebar-icon{display:grid;place-items:center;width:34px;height:34px;color:#fff;font-size:1.55rem;line-height:1}
        #dw-desktop-sidebar .dw-sidebar-label{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
        body.dw-sidebar-collapsed #dw-desktop-sidebar{padding-left:14px;padding-right:14px}
        body.dw-sidebar-collapsed #dw-desktop-sidebar .dw-sidebar-head{justify-content:center}
        body.dw-sidebar-collapsed #dw-desktop-sidebar .dw-sidebar-brand{display:none}
        body.dw-sidebar-collapsed #dw-desktop-sidebar .dw-sidebar-toggle{transform:rotate(180deg)}
        body.dw-sidebar-collapsed #dw-desktop-sidebar .dw-sidebar-item{grid-template-columns:1fr;justify-items:center;padding:9px}
        body.dw-sidebar-collapsed #dw-desktop-sidebar .dw-sidebar-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
        body.dw-sidebar-collapsed #dw-desktop-sidebar .dw-sidebar-icon{width:42px;height:42px}
        #tabbar{display:none!important}
        #screen{padding-bottom:32px!important}
        #app-shell{min-height:100vh!important}
      }
      @media(max-width:899px){body{padding-left:0!important}.dw-sidebar-collapsed{padding-left:0!important}}
    `;
    doc.head.appendChild(style);
  }

  function buildSidebar(doc) {
    installStyles(doc);
    let sidebar = doc.getElementById("dw-desktop-sidebar");
    if (!sidebar) {
      sidebar = doc.createElement("aside");
      sidebar.id = "dw-desktop-sidebar";
      sidebar.setAttribute("aria-label", "Desktop navigation");
      sidebar.innerHTML = `
        <div class="dw-sidebar-head">
          <span class="dw-sidebar-brand">DebtWizard</span>
          <button type="button" class="dw-sidebar-toggle" aria-label="Collapse navigation" aria-expanded="true">‹</button>
        </div>
        <nav class="dw-sidebar-nav">
          ${items.map(([page,label,icon]) => `<button type="button" class="dw-sidebar-item" data-dw-desktop-page="${page}" aria-label="${label}"><span class="dw-sidebar-icon" aria-hidden="true">${icon}</span><span class="dw-sidebar-label">${label}</span></button>`).join("")}
        </nav>`;
      doc.body.prepend(sidebar);

      sidebar.addEventListener("click", event => {
        const toggle = event.target.closest(".dw-sidebar-toggle");
        if (toggle) {
          const collapsed = !doc.body.classList.contains("dw-sidebar-collapsed");
          doc.body.classList.toggle("dw-sidebar-collapsed", collapsed);
          toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
          toggle.setAttribute("aria-label", collapsed ? "Expand navigation" : "Collapse navigation");
          saveCollapsed(collapsed);
          return;
        }
        const button = event.target.closest("[data-dw-desktop-page]");
        if (!button) return;
        routeTo(doc, button.dataset.dwDesktopPage, button);
      });
    }

    const collapsed = isCollapsed();
    doc.body.classList.toggle("dw-sidebar-collapsed", collapsed);
    const toggle = sidebar.querySelector(".dw-sidebar-toggle");
    toggle?.setAttribute("aria-expanded", collapsed ? "false" : "true");
    toggle?.setAttribute("aria-label", collapsed ? "Expand navigation" : "Collapse navigation");
    setActive(doc);
  }

  function attach() {
    const frame = document.getElementById("app-host");
    const doc = frame?.contentDocument;
    if (!doc?.body) return;
    buildSidebar(doc);
    if (!doc.__dwDesktopSidebarObserver) {
      const observer = new MutationObserver(() => {
        buildSidebar(doc);
        setActive(doc);
      });
      observer.observe(doc.body, { childList:true, subtree:true, attributes:true, attributeFilter:["class","aria-current"] });
      doc.__dwDesktopSidebarObserver = observer;
    }
  }

  const frame = document.getElementById("app-host");
  frame?.addEventListener("load", () => {
    attach();
    [100,350,800,1400].forEach(delay => setTimeout(attach, delay));
  });
  if (frame?.contentDocument?.readyState === "complete") attach();
})();