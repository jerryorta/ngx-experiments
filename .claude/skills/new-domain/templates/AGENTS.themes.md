# {{DOMAIN_TITLE}} Themes — Contributor Notes

## Overview

- **Purpose**: Custom CSS-variable token system for the {{DOMAIN_TITLE}} application — no Angular Material
- **Consumed by**: The {{DOMAIN_TITLE}} app (and Storybook) via `stylePreprocessorOptions.includePaths`. This library is **style-only**: it has no TypeScript export, no `src/index.ts`, and no `@gigasoftware/{{DOMAIN}}-themes` path alias in `tsconfig.base.json`.

## Commands

- Lint: `npx nx run {{DOMAIN}}-themes:lint`

## Architecture

```
src/lib/styles/
  {{PREFIX}}-themes.scss          # Entry point — @use all partials, exposes {{PREFIX}}-theme-mixin()
  _{{PREFIX}}-tokens.scss         # Documents all --{{PREFIX}}-* CSS variable names (the contract; no values)
  _{{PREFIX}}-base.scss           # Reset, body, global layout, icon defaults, scrollbar
  {{PREFIX}}/
    _{{PREFIX}}-dark.scss         # Dark theme — all --{{PREFIX}}-* values under html.{{PREFIX}}-dark
    _{{PREFIX}}-light.scss        # Light theme — all --{{PREFIX}}-* values under html.{{PREFIX}}-light
```

Each partial wraps its rules in a mixin — nothing emits CSS at `@use` time, only when `{{PREFIX}}-theme-mixin()` is invoked from the entry point.

Wired up in the {{DOMAIN_TITLE}} app `styles.scss`:

```scss
@use '{{PREFIX}}-themes';
@import 'tailwindcss';
@include {{PREFIX}}-themes.{{PREFIX}}-theme-mixin();
```

A theme class (e.g. `{{PREFIX}}-dark`) must be applied on the document root (`<html class="{{PREFIX}}-dark">`) to activate that theme's token values. `_{{PREFIX}}-base.scss` styles `body` background/text and global scrollbars via `var(--{{PREFIX}}-*)` — applying the class only to a nested element (e.g. `<{{PREFIX}}-root>`) will not affect those globals.

## CSS Variable Tokens (`--{{PREFIX}}-*`)

All tokens are defined in the theme partials under `{{PREFIX}}/`. The `--{{PREFIX}}-*` token contract is documented in `_{{PREFIX}}-tokens.scss`.

## Guidelines

- SCSS only in this library — no TypeScript runtime logic
- No Angular Material imports — this system is fully custom
- All color values via `--{{PREFIX}}-*` tokens — no hardcoded hex values in components
- Add new themes as `{{PREFIX}}/_{{PREFIX}}-<mode>.scss` partials and register them in `{{PREFIX}}-themes.scss`
- Tokens are consumed by components via Tailwind CSS variable syntax (e.g., `text-(--{{PREFIX}}-on-surface)`, `bg-(--{{PREFIX}}-surface)`) — not by writing SCSS in component files

## Using Tokens in Components

```html
<span class="border-(--{{PREFIX}}-outline) bg-(--{{PREFIX}}-surface-container) text-(--{{PREFIX}}-on-surface)"></span>
```

Component SCSS is kept to a minimum — only pseudo-elements, `:focus-within`, and child selectors that cannot be expressed as flat Tailwind utilities.

## Review Checklist

- [ ] No `--mat-sys-*` or Angular Material tokens used
- [ ] All colors reference `--{{PREFIX}}-*` variables — no hardcoded values
- [ ] New themes added as `{{PREFIX}}/_{{PREFIX}}-<mode>.scss` and registered in `{{PREFIX}}-themes.scss`
- [ ] `_{{PREFIX}}-tokens.scss` updated when new tokens are introduced

## References

- Constraints: `docs/ai/CONSTRAINTS.md`
