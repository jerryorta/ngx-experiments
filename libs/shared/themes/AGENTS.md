# Shared Themes — Contributor Notes

> **Type standard** (auto-injected on write): `docs/ai-instructions/standards/lib-types/themes.md`
> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`

## Shared specifics

- **Holds** the repo's only persona definitions: **3 personas — `home` / `professional` /
  `service-provider` — × light + dark**, in
  `src/lib/styles/{home,professional,service-provider}/_dlc-<persona>-<mode>.scss`. Entry point is
  `dlc-themes.scss`, which emits them via `dlc-theme-mixin()`.
- **`--dlc-*` is the token contract** every consumer themes against. Domain layers (e.g.
  `--ldg-*` in `@nge/ledger-themes`) alias these; never the reverse.
- **Bridge files** map a bespoke shared lib's own token family onto the active persona:
  `_dlc-calendar-tokens.scss` (`--nge-calendar-*`) and `_dlc-chip-tokens.scss`. The
  **`--chart-*` bridge for `@nge/charts` is declared per persona** inside each
  `_dlc-<persona>-<mode>.scss` — adding or renaming a chart token means touching all six.
  Live list: `grep -rl -- '--chart-' libs/*/themes/src`.
- **Applying a persona themes CDK overlays too** only if the persona class is mirrored onto
  `<body>` — that is what the Storybook `preview.ts` and the Ledger `ThemeStore` both do. A
  persona class set on an inner element will not reach overlay content.
- Never `--mat-sys-*` / `mat-*` — this repo has no Angular Material at all.
- Test: `npx nx run shared-themes:test` · Lint: `npx nx run shared-themes:lint`
