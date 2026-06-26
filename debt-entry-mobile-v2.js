(() => {
  "use strict";

  const root = document.getElementById("modal-root");
  if (!root) return;

  function addStyles() {
    if (document.getElementById("debt-entry-mobile-v2-styles")) return;
    const style = document.createElement("style");
    style.id = "debt-entry-mobile-v2-styles";
    style.textContent = `
      /* Compact, scrollable debt-entry sheet. Leave the app visible above it. */
      .modal-backdrop.debt-entry-modal {
        align-items: flex-end;
        padding-top: 82px;
      }
      .modal-backdrop.debt-entry-modal .sheet {
        width: 100%;
        max-height: calc(100dvh - 82px);
        min-height: 0;
        overflow-x: hidden;
        overflow-y: auto;
        border-radius: 28px 28px 0 0;
        padding: 16px 26px calc(18px + env(safe-area-inset-bottom, 0px));
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }
      .modal-backdrop.debt-entry-modal .sheet-head {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        min-height: 44px;
        margin: 0 0 17px;
        padding: 0 0 13px;
        border-bottom: 5px solid #62d3e5;
      }
      .modal-backdrop.debt-entry-modal .sheet-head h2 {
        position: absolute;
        left: 50%;
        max-width: calc(100% - 96px);
        margin: 0;
        transform: translateX(-50%);
        color: #303e44;
        font-size: 1.22rem;
        font-weight: 850;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .modal-backdrop.debt-entry-modal .sheet-close {
        position: relative;
        z-index: 1;
        width: 31px;
        height: 31px;
        padding: 0;
        color: #747f83;
        font-size: 2rem !important;
      }
      .modal-backdrop.debt-entry-modal #debt-form {
        display: grid;
        gap: 0;
      }
      .modal-backdrop.debt-entry-modal #debt-form > .form-grid {
        gap: 14px;
      }
      .modal-backdrop.debt-entry-modal #debt-form .form-grid.two {
        gap: 20px;
      }
      .modal-backdrop.debt-entry-modal #debt-form .field {
        gap: 4px;
        color: #727c80;
        font-size: .82rem;
        font-weight: 750;
      }
      .modal-backdrop.debt-entry-modal #debt-form .field input,
      .modal-backdrop.debt-entry-modal #debt-form .field select,
      .modal-backdrop.debt-entry-modal #debt-form .field textarea {
        min-height: 42px;
        padding: 7px 0 8px;
        border: 0;
        border-bottom: 1.5px solid #adb9bd;
        border-radius: 0;
        background: transparent;
        color: #3a4549;
        box-shadow: none;
        font-size: 16px !important;
        font-weight: 500;
      }
      .modal-backdrop.debt-entry-modal #debt-form .field select {
        padding-right: 26px;
      }
      .modal-backdrop.debt-entry-modal #debt-form .field input::placeholder,
      .modal-backdrop.debt-entry-modal #debt-form .field textarea::placeholder {
        color: #a3acaf;
        font-weight: 500;
      }
      .modal-backdrop.debt-entry-modal #debt-form .field input:focus,
      .modal-backdrop.debt-entry-modal #debt-form .field select:focus,
      .modal-backdrop.debt-entry-modal #debt-form .field textarea:focus {
        border-bottom: 3px solid #4abfd8;
        outline: 0;
      }
      .modal-backdrop.debt-entry-modal #debt-form .field textarea {
        min-height: 64px;
        padding-top: 8px;
        resize: vertical;
      }
      .modal-backdrop.debt-entry-modal .due-day-picker {
        margin-top: 2px;
        padding: 15px 0 2px;
      }
      .modal-backdrop.debt-entry-modal .due-day-picker-title {
        color: #5f6c71;
        font-size: .84rem;
      }
      .modal-backdrop.debt-entry-modal .due-day-picker-status {
        min-height: 18px;
        margin: 4px 0 9px;
        color: #788589;
        font-size: .78rem;
        font-weight: 650;
        text-align: center;
      }
      .modal-backdrop.debt-entry-modal .due-day-grid {
        gap: 7px;
      }
      .modal-backdrop.debt-entry-modal .due-day-button {
        height: 36px;
        color: #3d484d;
        background: #f5f6f6;
        border-color: #edf0f1;
        font-size: .86rem !important;
      }
      .modal-backdrop.debt-entry-modal .due-day-button.last-day {
        min-width: 72px;
      }
      .modal-backdrop.debt-entry-modal .sheet-actions {
        position: sticky;
        bottom: calc(-18px - env(safe-area-inset-bottom, 0px));
        z-index: 3;
        justify-content: stretch;
        margin: 15px -1px 0;
        padding: 13px 0 calc(2px + env(safe-area-inset-bottom, 0px));
        background: linear-gradient(to bottom, rgba(255,255,255,0), #fff 22%, #fff 100%);
      }
      .modal-backdrop.debt-entry-modal .sheet-actions .btn {
        flex: 1;
        min-height: 47px;
        border-radius: 12px;
        font-size: 1rem !important;
      }
      @media (max-width: 390px) {
        .modal-backdrop.debt-entry-modal { padding-top: 66px; }
        .modal-backdrop.debt-entry-modal .sheet { max-height: calc(100dvh - 66px); padding-left: 22px; padding-right: 22px; }
        .modal-backdrop.debt-entry-modal #debt-form .form-grid.two { gap: 15px; }
        .modal-backdrop.debt-entry-modal .due-day-grid { gap: 6px; }
        .modal-backdrop.debt-entry-modal .due-day-button { height: 34px; font-size: .81rem !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function tagDebtEntrySheets() {
    addStyles();
    root.querySelectorAll(".modal-backdrop").forEach(backdrop => {
      const form = backdrop.querySelector("#debt-form");
      if (!form) return;
      backdrop.classList.add("debt-entry-modal");
      const heading = backdrop.querySelector(".sheet-head h2");
      if (heading && !heading.dataset.compactTitle) {
        heading.dataset.compactTitle = "true";
        heading.textContent = form.dataset.id ? "Debt Details" : "Add a debt";
      }
    });
  }

  new MutationObserver(tagDebtEntrySheets).observe(root, { childList: true, subtree: true });
  tagDebtEntrySheets();
})();
