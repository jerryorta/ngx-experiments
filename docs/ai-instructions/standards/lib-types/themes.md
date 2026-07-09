---
applyTo: 'libs/*/themes/**'
title: Themes library standard (--<prefix>-* token system)
---

A `*-themes` library is the custom `--<prefix>-*` CSS-variable token system (no Angular Material). **Style-only**: no TypeScript export, no `src/index.ts`, no path alias; consumed by the app + Storybook via `stylePreprocessorOptions.includePaths`.

Structure:

```
src/lib/styles/
  <prefix>-themes.scss        # entry — @use all partials, exposes <prefix>-theme-mixin()
  _<prefix>-tokens.scss       # documents every --<prefix>-* name (the contract; no values)
  _<prefix>-base.scss         # reset, body, global layout / scrollbar
  <prefix>/
    _<prefix>-dark.scss       # token VALUES under html.<prefix>-dark
    _<prefix>-light.scss      # token VALUES under html.<prefix>-light
```

- Every partial wraps its rules in a mixin — nothing emits CSS at `@use` time, only when `<prefix>-theme-mixin()` is invoked from the entry point.
- A theme class (`<prefix>-dark`) must be on `<html>` to activate; `_<prefix>-base.scss` styles `body` via `var(--<prefix>-*)`, so applying the class to a nested element won't affect globals.
- Add a new theme as `<prefix>/_<prefix>-<mode>.scss` and register it; update `_<prefix>-tokens.scss` when introducing tokens. No hardcoded hex — all colors via `--<prefix>-*`.
