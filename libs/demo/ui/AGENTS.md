# Demo UI — Contributor Notes

> **Before writing a new component or layout in this library, READ THIS FILE in full.** The design-library-first rule below is binding and is the single most common source of regressions.

## Overview

- **Purpose**: Smart/container components for the Demo application — page-level and feature-level components wired to state
- **Stack**: Angular 21, `ViewEncapsulation.None`, custom `--dm-*` CSS variables. **No Angular Material primitives in templates or imports** (see Design-library-first rule below).
- **Consumed by**: The Demo app and Storybook

## Design-library-first rule (HARD RULE)

**Every interactive widget or layout primitive used in `demo-ui` MUST come from a design library.** No Angular Material widgets, no hand-rolled buttons / inputs / chips / modals.

- **Domain-scoped primitives** (`dm-*`): `libs/demo/design-library/src/lib/` — first choice for anything in this library.
- **Cross-app shared primitives** (`dlc-*`): `libs/shared/ui-design-library/src/lib/` — second choice when a primitive is genuinely workspace-wide.
- **Forbidden**: anything in `@angular/material/*` that renders DOM (`mat-button`, `mat-form-field`, `matInput`, `mat-icon`, `mat-checkbox`, `mat-select`, `MatDialog`, etc.). These break the `--dm-*` theming contract and ship un-themed widgets to users — even inside a styled wrapper.

### Workflow when writing a new component or layout

1. **Read this AGENTS.md** in full (you are here).
2. **List what's already available.** Run `ls libs/demo/design-library/src/lib/ | grep '^dm-'` and skim the names. Read the `.component.ts` of any candidate that might fit.
3. **Reuse the matching `dm-*` primitive.** If one exists for your use case, use it. Do not re-style a `<button>` or `<input>` yourself, even with Tailwind.
4. **If the design library lacks a primitive you need**, STOP and surface the gap:
   - Identify whether the missing primitive is reusable beyond this one feature (it almost always is).
   - Propose adding a new `dm-*` component to `libs/demo/design-library`, or extending an existing one with a new input.
   - **Do NOT reach for Angular Material as a fallback.** Mat primitives are not theme-compatible with `--dm-*` tokens.
   - **Do NOT hand-roll the primitive inline.** A bespoke `<button class="...">` in a feature template is a private fork of a primitive that should be reused.

## State Management

- Feature-local / component-local state: use an **NgRx Signal Store** colocated next to the component it serves (same directory)
- **Multi-component systems** (a root component orchestrating a tree of child components that share state / interaction): use ONE component-scoped `@ngrx/signals` Signal Store **provided at the root component** (`providers: [Store]`, never `providedIn: 'root'`); children `inject()` it; `input()` / `output()` stay ONLY at the root's public boundary — never prop-drill state/events between internal components. Full rule: `docs/ai-instructions/multi-component-signal-store.instructions.md`
- Global shared state: consume from `@nge/demo-store` — do not duplicate it here

## Commands

- Test: `npx nx run demo-ui:test`
- Lint: `npx nx run demo-ui:lint`

## Component Conventions

- Separate `.ts` / `.html` / `.scss` / `.spec.ts` — never inline `template`/`styles`
- `ViewEncapsulation.None` + `host: { class: 'dm-component-name' }`
- `input()` / `output()` signals — never `@Input()` / `@Output()`
- `inject()` — never constructor injection
- Angular control flow: `@if`, `@for`, `@switch` — never `*ngIf` / `*ngFor`
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

- [ ] **Design-library-first rule observed**: every interactive widget is a `dm-*` (or `dlc-*`) primitive; no `mat-*` directives, no hand-rolled buttons/inputs
- [ ] Any design-library gap surfaced as a proposal (new `dm-*` component or input extension), not papered over with Material or inline markup
- [ ] Separate `.ts`/`.html`/`.scss`/`.spec.ts` files (`.scss` may be absent if empty)
- [ ] `ViewEncapsulation.None` with host class
- [ ] No Angular Material imports (`@angular/material/*` — including `MatDialog`)
- [ ] All colors use `--dm-*` tokens via Tailwind — no hardcoded values, no `--mat-sys-*`
- [ ] Tailwind used for layout, spacing, typography — SCSS only for pseudo-selectors/child selectors
- [ ] Feature-local Signal Stores are colocated in the same directory as the component they serve
- [ ] New exports added to `src/index.ts`

## References

- Design library: `libs/demo/design-library/src/lib/`
- Design library AGENTS: `libs/demo/design-library/AGENTS.md`
- Theme tokens: `libs/demo/themes/src/lib/styles/_dm-tokens.scss`
- Constraints: `docs/ai/CONSTRAINTS.md`
