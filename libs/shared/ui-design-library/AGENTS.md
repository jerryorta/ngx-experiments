# UI Design Library — Contributor Notes

> **Go-forward shared design library.** This is the clean successor to
> `ui-design-library-deprecated`; new `dlc-` components land here and existing
> ones migrate in over time. Same component architecture, non-deprecated identity.

## Overview

- **Purpose**: Reusable Angular components with `dlc-` prefix for all ngx-experiments applications
- **When to build here (SECOND choice)**: build a new presentational primitive in your domain's own `libs/<domain>/design-library` FIRST; promote it here only when a second application genuinely needs it. Domain design-library is the default; this shared lib is for genuinely cross-app primitives.
- **Architecture**: every component uses `ViewEncapsulation.None` with strict SCSS scoping

## Test & Lint

- Test: `npx nx run shared-ui-design-library:test`
- Lint: `npx nx run shared-ui-design-library:lint`
- Auto-fix: `npx nx run shared-ui-design-library:lint --fix`

## Guidelines

- Every component MUST use `ViewEncapsulation.None`
- Every component MUST have `host: { class: 'dlc-selector-name' }`
- SCSS MUST wrap ALL styles in `.dlc-component-name { }` — NEVER use `:host`
- **NO Angular Material** — never import `@angular/material/*`, add `<mat-*>` elements, or reference `--mat-sys-*` tokens (enforced by eslint `no-restricted-imports`). Use Tailwind + `@angular/cdk` primitives + `--dlc-*` tokens. Being Material-free is the whole reason this lib supersedes `-deprecated`.
- Define overridable tokens FIRST, at the top of each component's OWN `.scss` (inside its host class), named `--<component-selector>-<css-property>` (e.g. `--dlc-deleted-badge-bg-color`) with literal fallbacks. Tokens live with their component — NEVER a shared/central token file. Full convention: `COMPONENT-ARCHITECTURE-BEST-PRACTICES.md` § "CSS Variables for Overridable Styles"
- Selector prefix: `dlc-`
- Dual-selector migration: `selector: 'dlc-name,gs-name'` during transition
- Multi-component systems: share state via a **component-scoped `@ngrx/signals` SignalStore** provided at the root component (`providers: [Store]`, never `providedIn: 'root'`); children `inject()` it — don't prop-drill `input()`/`output()` between internal components
- See `COMPONENT-ARCHITECTURE-BEST-PRACTICES.md` in this directory for full rules

## Review Checklist

- [ ] Separate .ts/.html/.scss/.spec.ts files
- [ ] `ViewEncapsulation.None` set
- [ ] `host: { class: 'dlc-...' }` matches selector
- [ ] SCSS wrapped in component class (no `:host`)
- [ ] No Angular Material — no `@angular/material` import, `<mat-*>` element, or `--mat-sys-*` token
- [ ] Per-component `--<selector>-<property>` tokens defined first (no shared/central token file)
- [ ] `inject()` for DI, signal `input()`/`output()`
- [ ] Accessibility: label `for`/`id`, keyboard support, ARIA attributes
- [ ] No `!` non-null assertions
- [ ] Multi-component systems use a root-provided component-scoped SignalStore (not prop-drilled inputs/outputs)

## References

- Constraints: `docs/ai/CONSTRAINTS.md`
- Full guide: `libs/shared/ui-design-library/COMPONENT-ARCHITECTURE-BEST-PRACTICES.md`
- Multi-component SignalStore: `docs/ai-instructions/reference/multi-component-signal-store.instructions.md`
