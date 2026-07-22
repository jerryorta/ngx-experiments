# Ledger Design Library — Contributor Notes

> **Type standard** (auto-injected on write): `docs/ai-instructions/standards/lib-types/design-library.md`
> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`

Add only genuine Ledger-specific content below (concrete primitive inventory, domain rules) — never restate the type standard or CONSTRAINTS.

## Ledger specifics

- **Holds** the `ldg-*` presentational primitives that are too domain-shaped for the shared lib:
  `account-card`, `amount-input` (CVA), `budget-card`, `category-chip`, `donut-chart`,
  `empty-state`, `header-bar`, `icon-button`, `page-content`, `theme-switcher`.
- **Reuse before you build.** Shared `dlc-*` primitives (`@nge/ui-design-library`), `@nge/charts`
  and `@nge/calendar` cover most needs — only genuinely Ledger-shaped pieces belong here. A
  component that turns out to be generic gets promoted up to `@nge/ui-design-library`.
- **`ldg-donut-chart` follows the `@nge/charts` layer contract** — a thin wrapper over a
  promotable render fn (`render-ldg-donut-layer.ts`) + layer config + `theme.donut` (`--chart-*`)
  + a `createLdgDonutChartConfig` preset. A self-contained bespoke `<svg>` component is the
  anti-pattern here (see `docs/architecture/charts.md`). Domain-incubated layers render through
  the generic registry via a single cast at the preset — no shared-lib edit needed; promotion is
  a file move plus a `type` registration.
- Every component ships persona-themed stories. Never Angular Material.
- Test: `npx nx run ledger-design-library:test` · Lint: `npx nx run ledger-design-library:lint`
