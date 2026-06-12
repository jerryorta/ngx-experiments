# Demo Design Library — Contributor Notes

## Overview

- **Purpose**: Reusable presentational components, directives, and pipes for the Demo domain — no store dependency
- **Stack**: Angular 21, `ViewEncapsulation.None`, custom `--dm-*` CSS variables. Built with `@angular/cdk` utilities. No Angular Material. GSAP for sophisticated animations.
- **Consumed by**: `demo-ui`, the Demo app, and Storybook

## State Management

- This library has **no store dependency** — components are purely presentational
- Components accept all data via `input()` signals and emit events via `output()` signals
- Feature-local state (if truly needed) may use a lightweight NgRx Signal Store colocated in the same directory — never import from `demo-store`
- **Multi-component systems** (a root component orchestrating a tree of child components that share state / interaction): use ONE component-scoped `@ngrx/signals` Signal Store **provided at the root component** (`providers: [Store]`, never `providedIn: 'root'`); children `inject()` it; `input()` / `output()` stay ONLY at the root's public boundary — never prop-drill state/events between internal components. Full rule: `docs/ai-instructions/multi-component-signal-store.instructions.md`

## Commands

- Test: `npx nx run demo-design-library:test`
- Lint: `npx nx run demo-design-library:lint`

## Component Conventions

- Separate `.ts` / `.html` / `.scss` / `.spec.ts` — never inline `template`/`styles`
- `ViewEncapsulation.None` + `host: { class: 'dm-component-name' }`
- `input()` / `output()` signals — never `@Input()` / `@Output()`
- `inject()` — never constructor injection
- Angular control flow: `@if`, `@for`, `@switch` — never `*ngIf` / `*ngFor`
- Use `@angular/cdk` (overlay, portal, a11y, drag-drop, etc.) for behavior primitives — not Angular Material
- Use GSAP for animations that require timeline control or physics — keep animation logic in the component class, not templates
- Export all public symbols through `src/index.ts`

## Styling Approach

**Tailwind first** — put layout, spacing, sizing, typography, and colors directly on HTML elements using Tailwind utility classes. Use `--dm-*` tokens via CSS variable syntax: `text-(--dm-on-surface)`, `bg-(--dm-surface)`, `border-(--dm-outline)`.

**SCSS is minimal** — only keep the `.dm-component-name { }` wrapper if rules remain. Use SCSS only for:

- `:hover`, `:focus`, `:focus-within`, `:first-child` pseudo-states (or Tailwind variants: `hover:`, `focus:`, `first:`)
- `::placeholder`, `::before`, `::after` pseudo-elements
- Nested child element selectors
- CSS custom property overrides

If the SCSS file contains only the root wrapper with no rules inside, delete the `.scss` file and remove `styleUrl` from the component decorator.

## Review Checklist

- [ ] Separate `.ts`/`.html`/`.scss`/`.spec.ts` files (`.scss` may be absent if empty)
- [ ] `ViewEncapsulation.None` with host class
- [ ] No Angular Material imports — use `@angular/cdk` for behavior primitives
- [ ] No imports from `demo-store` — purely presentational
- [ ] All colors use `--dm-*` tokens via Tailwind — no hardcoded values, no `--mat-sys-*`
- [ ] Tailwind used for layout, spacing, typography — SCSS only for pseudo-selectors/child selectors
- [ ] GSAP used for complex animations (timelines, physics) — simple transitions via Tailwind/CSS
- [ ] New exports added to `src/index.ts`

## References

- Theme tokens: `libs/demo/themes/src/lib/styles/_dm-tokens.scss`
- Constraints: `docs/ai/CONSTRAINTS.md`
