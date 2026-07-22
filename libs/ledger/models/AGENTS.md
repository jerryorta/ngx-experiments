# Ledger Models — Contributor Notes

> **Type standard** (auto-injected on write): `docs/ai-instructions/standards/lib-types/models.md`
> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`

Add only genuine Ledger-specific content below (concrete primitive inventory, domain rules) — never restate the type standard or CONSTRAINTS.

## Ledger specifics

- **Money is ALWAYS integer minor units (cents)** — never a float, never a formatted string.
  `Transaction.amount` is **signed**: negative = outflow/expense, positive = inflow/income.
  `Budget.limit` is a positive integer. Format only at the presentation edge (`@nge/ledger-utils`).
- **Dates are ISO date strings**, not `Date` objects — deliberate, so nothing is timezone-dependent.
- Test: `npx nx run ledger-models:test` · Lint: `npx nx run ledger-models:lint`
