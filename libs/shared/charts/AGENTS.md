# Shared Charts — Contributor Notes

> **Charts guide**: `docs/architecture/charts.md`
> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`

## Shared specifics

- **Holds**: the unified `nge-chart` D3 chart system — one config-driven `<nge-chart>`
  plus pluggable layers (bar / line / bullet / grouped-bar / diverging-bar / scatter),
  presets, generic tooltip, and legend. Architecture, public API, the `--chart-*` token
  contract, and the Jest shims consumers need all live in `docs/architecture/charts.md`
  (that guide is mirrored from gigasoftware — read `giga-`→`nge-` for selectors/aliases).
- **`--chart-*` token bridge (repo-specific — the part that isn't in the shared guide).**
  Charts render off the domain-agnostic `--chart-*` contract (defaults in
  `src/lib/styles/_chart-tokens.scss`); the `@nge/themes` **dlc personas** re-declare those
  tokens per-persona, light + dark. Adding or renaming a token means updating every bridge.
  Live list: `grep -rl -- '--chart-' libs/*/themes/src`. Current bridge:
  - `libs/shared/themes/src/lib/styles/{home,professional,service-provider}/_dlc-*-{light,dark}.scss`
- Never `--mat-sys-*` — nge has no Angular Material; the `--chart-*` defaults ensure charts
  render with no theme applied.
- Test: `npx nx run shared-charts:test` · Lint: `npx nx run shared-charts:lint`
