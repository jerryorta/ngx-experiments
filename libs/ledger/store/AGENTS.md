# Ledger Store — Contributor Notes

> **Type standard** (auto-injected on write): `docs/ai-instructions/standards/lib-types/store.md`
> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`

Add only genuine Ledger-specific content below (concrete primitive inventory, domain rules) — never restate the type standard or CONSTRAINTS.

## Ledger specifics

- **Holds**: the global classic `@ngrx/store` slice — `ledgerFeature` (entity adapters over
  accounts / transactions / budgets / categories), derived selectors that delegate their math to
  `@nge/ledger-utils`, the root `LedgerFacade` (`src/lib/ledger.facade.ts`), and
  `provideLedgerStore()`.
- **`LedgerFacade` is the ONLY public consumption surface.** Components inject `LedgerFacade`,
  never `Store` directly — `libs/ledger/ui` has zero `@ngrx/store` imports and must stay that way.
- **`provideLedgerStore()` registers the FEATURE only.** The app must also call root
  `provideStore()` or Angular throws `NG0201`.
- This demo's store is **read-only over mock data** — add/edit flows in the UI are intentional
  no-ops. There is no backend, no Firestore, no websocket sync.
- Test: `npx nx run ledger-store:test` · Lint: `npx nx run ledger-store:lint`
