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
      'if (ui.page === "debts") screen.innerHTML = debtsPage();',
      'if (ui.page === "debts") screen.innerHTML = debtsPage();\n    if (ui.page === "budget") screen.innerHTML = budgetPage();'
    );
    source = source.replace(
      '["debts", "Debts", "◔"],',
      '["debts", "Debts", "◔"],\n    ["budget", "Budget", "▦"],'
    );
    source = source.replace(
      '    if (act === "nav") {',
      '    if (bAction(act, id, button)) return;\n    if (act === "nav") {'
    );
    source = source.replace(
      '  function submit(event) {',
      '  function submit(event) { if (bSubmit(event)) return;'
    );
    source = source.replace(
      '  function input(event) {',
      '  function input(event) { if (bInput(event)) return;'
    );

    const budgetCode = atob("ICBmdW5jdGlvbiBiTG9hZCgpe3RyeXtyZXR1cm4gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgiZHctYnVkZ2V0IikpfHx7bTp7fX19Y2F0Y2h7cmV0dXJue206e319fX0KICBmdW5jdGlvbiBiU2F2ZShkKXtsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgiZHctYnVkZ2V0IixKU09OLnN0cmluZ2lmeShkKSl9CiAgZnVuY3Rpb24gYklkKCl7cmV0dXJuIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpK0RhdGUubm93KCkudG9TdHJpbmcoMzYpfQogIGZ1bmN0aW9uIGJDYXRzKCl7cmV0dXJuWyJHaXZpbmciLCJFbWVyZ2VuY3kgRnVuZCIsIlJlbnQgLyBNb3J0Z2FnZSIsIlV0aWxpdGllcyIsIkdyb2NlcmllcyIsIkRpbmluZyBPdXQiLCJGdWVsIiwiSW5zdXJhbmNlIiwiUGVyc29uYWwiLCJTdWJzY3JpcHRpb25zIiwiTWlzY2VsbGFuZW91cyJdLm1hcChuPT4oe2lkOmJJZCgpLG4scDowfSkpfQogIGZ1bmN0aW9uIGJNb250aChrKXtsZXQgZD1iTG9hZCgpO2lmKCFkLm1ba10pe2xldCBwPU9iamVjdC5rZXlzKGQubSkuZmlsdGVyKHg9Png8aykuc29ydCgpLmF0KC0xKSxvPXAmJmQubVtwXTtkLm1ba109bz97aTpKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG8uaSkpLGM6SlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvLmMpKSx0OltdfTp7aTpbXSxjOmJDYXRzKCksdDpbXX07YlNhdmUoZCl9cmV0dXJuIGQubVtrXX0KICBmdW5jdGlvbiBiRGVidCgpe3JldHVybiBjZW50cyhhY3RpdmUoKS5yZWR1Y2UoKHMseCk9PnMreC5taW5pbXVtLDApK01hdGgubWF4KDAsbnVtKHN0YXRlLnNldHRpbmdzLmV4dHJhKSkpfQogIGZ1bmN0aW9uIGJDU1MoKXtpZigkKCJiLWNzcyIpKXJldHVybjtsZXQgcz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCJzdHlsZSIpO3MuaWQ9ImItY3NzIjtzLnRleHRDb250ZW50PWAjYXBwLXNoZWxse3BhZGRpbmctYm90dG9tOjkwcHghaW1wb3J0YW50fS50YWJiYXJ7cG9zaXRpb246Zml4ZWQhaW1wb3J0YW50O2luc2V0OmF1dG8gMCAwIWltcG9ydGFudDt6LWluZGV4Ojk5OSFpbXBvcnRhbnQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCg2LDFmcikhaW1wb3J0YW50fS50YWJiYXIgLnRhYi1idG57bWluLXdpZHRoOjAhaW1wb3J0YW50O2ZvbnQtc2l6ZTouNnJlbSFpbXBvcnRhbnQ7cGFkZGluZzozcHggMCFpbXBvcnRhbnR9LmJ1ZGdldC1ib3h7cGFkZGluZzoxNXB4O2JvcmRlci:TRUNCATED