# Ledger Mocks — Contributor Notes

> **Type standard** (auto-injected on write): `docs/ai-instructions/standards/lib-types/mocks.md`
> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`

Add only genuine Ledger-specific content below (concrete primitive inventory, domain rules) — never restate the type standard or CONSTRAINTS.

## Ledger specifics

- **Holds** the deterministic seed data backing the whole demo (~148 transactions spanning
  Feb–Jul 2026, plus accounts / budgets / categories).
- **Deterministic by construction — no `Math.random()`, no `new Date()` in the fixtures.** Every
  amount and date is a literal, so snapshots, chart output and specs are reproducible. Only specs
  may construct `Date` (for range assertions).
- Amounts follow the models contract: signed integer cents, ISO date strings.
- Test: `npx nx run ledger-mocks:test` · Lint: `npx nx run ledger-mocks:lint`
