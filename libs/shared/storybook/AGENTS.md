# Shared Storybook — Contributor Notes

> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`
> **Storybook conventions**: `docs/reference/storybook.md`

**Bespoke shared library** — outside the auto-injected lib-type standard system; these notes are
the guidance. This lib has no gigasoftware counterpart to mirror (there it lives inside the themes
lib as `@gigasoftware/themes/storybook`), so it is maintained here directly.

## Shared specifics

- **Holds** `NgeStorybookReviewContainerComponent` (`lib/storybook-review/`) — the standard wrapper
  every story renders inside — plus the theme-config models and the `theme-configs.ts` registry
  that drives the Storybook toolbar's 🎨 persona switcher.
- **`theme-configs.ts` is scoped to the `cg`/dlc persona group only.** Stories declare
  `themeGroup: 'cg'`. When mirroring a story from gigasoftware, drop any MW/COG/GY theme group —
  those personas do not exist here.
- Consumed as **`@nge/storybook`**. When porting a gigasoftware lib, rewrite
  `@gigasoftware/themes/storybook` → `@nge/storybook` (NOT `@nge/themes/storybook`).
- The Storybook host app is `apps/storybook-app` (port **4400**); it declares explicit
  `@storybook/angular:start-storybook` / `build-storybook` executor targets in its `project.json` —
  the inferred `@nx/storybook/plugin` CLI path is unsupported for Angular in Storybook 10.
- Test: `npx nx run shared-storybook:test` · Lint: `npx nx run shared-storybook:lint`
