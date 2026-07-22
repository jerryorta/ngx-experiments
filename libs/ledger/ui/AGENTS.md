# Ledger UI — Contributor Notes

> **Type standard** (auto-injected on write): `docs/ai-instructions/standards/lib-types/ui.md`
> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`

Add only genuine Ledger-specific content below (concrete primitive inventory, domain rules) — never restate the type standard or CONSTRAINTS.

## Ledger specifics

- **Holds**: the three smart screens — Overview / Transactions / Budgets. Each is a **thin**
  component plus a **colocated component-scoped `@ngrx/signals` SignalStore** in the same folder
  (`overview.store.ts`, `transactions.store.ts`, `budgets.store.ts`) that owns all local UI state.
- **Facade-only:** these components inject `LedgerFacade`, never `Store`. This lib has zero
  `@ngrx/store` imports — keep it that way.
- Reference idiom for the colocated stores is the **in-repo**
  `libs/shared/calendar/.../nge-calendar-store.ts` (`withState` / `withComputed((store, facade =
  inject(LedgerFacade)) => …)` / `withMethods`), not the Firestore-flavoured examples in the
  mirrored `ngrx-component-state` skill.
- **Jest:** any spec rendering `<nge-chart>` / `<nge-calendar>` needs the guarded `ResizeObserver`
  no-op stub in `test-setup.ts` (jsdom lacks it) plus the d3 `transformIgnorePatterns` in
  `jest.config.cts`.
- **`<nge-chart>` renders into a shadow root** and collapses at `height: 0` — give it an
  explicit-height wrapper, and verify charts visually, never with a light-DOM `querySelector`.
- Test: `npx nx run ledger-ui:test` · Lint: `npx nx run ledger-ui:lint`
