# Debt Calculator

A private, browser-based debt payoff calculator for personal use. It is a static website with no account system, bank connection, server, or database.

## Features

- Add, edit, delete, and update personal debt accounts
- Track balance, APR, required minimum payment, due day, and optional credit limit
- Compare **Debt Snowball** (lowest balance first) and **Debt Avalanche** (highest APR first)
- Add a monthly extra payment and see a projected debt-free month
- View estimated future interest and a 24-month payoff schedule
- Record payments to update a balance and maintain a local payment history
- Print or save a PDF report
- Export and import JSON backups
- Responsive layout for mobile use

## Privacy

Debt data is stored only in the browser's local storage on the device you use. It is not stored in this GitHub repository, uploaded to GitHub, or sent to another service.

Export a JSON backup after meaningful changes. Keep those backup files private and never commit them to this repository. The included `.gitignore` excludes common backup file names.

## Publish with GitHub Pages

1. Open the repository **Settings**.
2. Select **Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose the `main` branch and the `/ (root)` folder, then save.
5. GitHub will display the site URL after it deploys.

Because this repository is private, availability of GitHub Pages depends on the plan and organization settings for the account.

## Calculation assumptions

- Interest is estimated monthly as `balance × APR ÷ 12`.
- The minimum payment field should be the full required minimum shown on the lender statement. Do not add estimated interest again.
- The monthly budget equals the total required minimum payments plus the extra payment entered in the app.
- When a debt is paid off, its freed required payment rolls into the next target within the projected plan.
- The calculator assumes no new charges, fees, APR changes, or payment timing differences.
- Results are planning estimates, not lender payoff quotes.
