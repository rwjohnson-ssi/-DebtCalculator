(async () => {
  const target = document.getElementById("screen");
  try {
    const response = await fetch("app-v2.js", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load application code.");
    const source = await response.text();
    new Function(source)();
  } catch (error) {
    console.error(error);
    target.innerHTML = '<section style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:40px 22px;color:#174a61"><h1 style="margin:0 0 8px">DebtWizard needs a refresh</h1><p style="line-height:1.5">The app did not finish loading. Refresh this page once and try again.</p></section>';
  }
})();
