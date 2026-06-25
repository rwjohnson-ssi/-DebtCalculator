(async () => {
  const target = document.getElementById("screen");
  try {
    const response = await fetch("app-v2.js", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load application code.");
    let source = await response.text();

    source = source.replace(
      "const trails = Object.fromEntries(state.debts.map(item => [item.id, [{ date: start, balance: item.balance }]));",
      "const trails = Object.fromEntries(state.debts.map(item => [item.id, [{ date: start, balance: item.balance }]]));"
    );

    source = source.replace(
      "if(event.target.id===\"extra-amount\") { refreshExtraSheet(num(event.target.value)); }",
      ""
    );
    source = source.replace(
      "function change(event) { if(event.target.id===\"debt-sort\"){ui.sort=event.target.value;render();} }",
      "function change(event) { if(event.target.id===\"debt-sort\"){ui.sort=event.target.value;render();} if(event.target.id===\"extra-amount\"){refreshExtraSheet(num(event.target.value));} }"
    );

    new Function(source)();
  } catch (error) {
    console.error(error);
    target.innerHTML = `<section style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:40px 22px;color:#174a61"><h1 style="margin:0 0 8px">DebtWizard needs a refresh</h1><p style="line-height:1.5">The newest version did not finish loading. Refresh this page once and try again.</p></section>`;
  }
})();
