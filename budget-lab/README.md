# DebtWizard Budget Lab

This is an isolated, EveryDollar-style monthly zero-based budget workspace.

## What it does

- Supports individual monthly budgets with prior-month copying.
- Provides **Planned**, **Spent**, and **Remaining** views.
- Lets you add income, budget categories, category groups, and an optional extra debt payoff amount.
- Pulls active debt minimum payments from the current DebtWizard browser data so they appear as a read-only budget section.
- Calculates `Income - Planned Expenses - Debt Payments = Left to Budget`.

## Data boundaries

The live debt application remains untouched.

- Read only: `debt-calculator-v2` — active debts and required monthly minimums.
- Written only: `debtwizard-budget-lab-v1` — Budget Lab months, income, categories, planned amounts, spent amounts, and optional extra debt payoff.

Budget Lab never writes to debt balances, APRs, minimums, due dates, payoff strategy, payment records, or live application navigation.

## Before merging into main

Test the following on iPhone Safari:

1. Add income.
2. Add a category and a new category group.
3. Switch Planned / Spent / Remaining.
4. Enter spent amounts and verify planned values stay unchanged.
5. Enter an extra debt payoff amount.
6. Copy the prior month and confirm spent amounts reset to zero.
7. Open the existing DebtWizard app and confirm debt entry, Strategy, Plan, and Track work exactly as before.

Only after those tests pass should `budget-lab/index.html` be merged into `main` and linked from the main app.