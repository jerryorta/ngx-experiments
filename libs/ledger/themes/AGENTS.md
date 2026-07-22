# Ledger Themes — Contributor Notes

> **Type standard** (auto-injected on write): `docs/ai-instructions/standards/lib-types/themes.md`
> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`

Add only genuine Ledger-specific content below (concrete primitive inventory, domain rules) — never restate the type standard or CONSTRAINTS.

## Ledger specifics

- **Ledger defines NO personas of its own.** `--ldg-*` is a thin **alias layer over the shared
  `--dlc-*` personas** from `@nge/themes` — e.g. `--ldg-accent: var(--dlc-primary, #0f2b3c)`.
  Every alias carries a literal fallback so the layer still renders with no persona class applied.
  Changing a persona in `@nge/themes` therefore re-themes Ledger for free; never hard-code a hex
  here that should have followed the active persona.
- Domain-owned token families: money semantics (positive / negative amounts) and
  `--ldg-category-1..8` for the categorical series used by the donut / spending charts.
- Never `--mat-sys-*` — this repo has no Angular Material.
- Test: `npx nx run ledger-themes:test` · Lint: `npx nx run ledger-themes:lint`
