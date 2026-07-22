# Ledger Utils — Contributor Notes

> **Type standard** (auto-injected on write): `docs/ai-instructions/standards/lib-types/utils.md`
> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`

Add only genuine Ledger-specific content below (concrete primitive inventory, domain rules) — never restate the type standard or CONSTRAINTS.

## Ledger specifics

- **Holds**: signed-cents money math (`money.ts`) plus the four chart aggregations the store's
  selectors delegate to — `cashflow`, `spending-by-category`, `budget-vs-actual`,
  `net-worth-series` — and `date-range.model.ts`.
- **Pure functions only**, over integer minor units. Never format currency in a selector; never
  do money math in a component.
- **Dates are ISO strings, deliberately not `date-fns`/`Date`** — keeps every aggregation
  timezone-proof.
- Test: `npx nx run ledger-utils:test` · Lint: `npx nx run ledger-utils:lint`
