# Demo Themes — Contributor Notes

## Overview

- **Purpose**: Custom CSS-variable token system for the Demo application — no Angular Material
- **Consumed by**: The Demo app (and Storybook) via `stylePreprocessorOptions.includePaths`. This library is **style-only**: it has no TypeScript export, no `src/index.ts`, and no `@nge/demo-themes` path alias in `tsconfig.base.json`.

## Commands

- Lint: `npx nx run demo-themes:lint`

## Architecture

```
src/lib/styles/
  dm-themes.scss          # Entry point — @use all partials, exposes dm-theme-mixin()
  _dm-tokens.scss         # Documents all --dm-* CSS variable names (the contract; no values)
  _dm-base.scss           # Reset, body, global layout, icon defaults, scrollbar
  dm/
    _dm-dark.scss         # Dark theme — all --dm-* values under html.dm-dark
    _dm-light.scss        # Light theme — all --dm-* values under html.dm-light
```

Each partial wraps its rules in a mixin — nothing emits CSS at `@use` time, only when `dm-theme-mixin()` is invoked from the entry point.

Wired up in the Demo app `styles.scss`:

```scss
@use 'dm-themes';
@import 'tailwindcss';
@include dm-themes.dm-theme-mixin();
```

A theme class (e.g. `dm-dark`) must be applied on the document root (`<html class="dm-dark">`) to activate that theme's token values. `_dm-base.scss` styles `body` background/text and global scrollbars via `var(--dm-*)` — applying the class only to a nested element (e.g. `<dm-root>`) will not affect those globals.

## CSS Variable Tokens (`--dm-*`)

All tokens are defined in the theme partials under `dm/`. The `--dm-*` token contract is documented in `_dm-tokens.scss`.

## Guidelines

- SCSS only in this library — no TypeScript runtime logic
- No Angular Material imports — this system is fully custom
- All color values via `--dm-*` tokens — no hardcoded hex values in components
- Add new themes as `dm/_dm-<mode>.scss` partials and register them in `dm-themes.scss`
- Tokens are consumed by components via Tailwind CSS variable syntax (e.g., `text-(--dm-on-surface)`, `bg-(--dm-surface)`) — not by writing SCSS in component files

## Using Tokens in Components

```html
<span class="border-(--dm-outline) bg-(--dm-surface-container) text-(--dm-on-surface)"></span>
```

Component SCSS is kept to a minimum — only pseudo-elements, `:focus-within`, and child selectors that cannot be expressed as flat Tailwind utilities.

## Review Checklist

- [ ] No `--mat-sys-*` or Angular Material tokens used
- [ ] All colors reference `--dm-*` variables — no hardcoded values
- [ ] New themes added as `dm/_dm-<mode>.scss` and registered in `dm-themes.scss`
- [ ] `_dm-tokens.scss` updated when new tokens are introduced

## References

- Constraints: `docs/ai/CONSTRAINTS.md`
