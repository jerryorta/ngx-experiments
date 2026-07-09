---
applyTo: 'libs/*/ui/**'
title: UI library standard (smart/container components)
---

A `*-ui` library holds smart/container components wired to state (the domain app + Storybook consume it). Global component invariants (separate files, `inject()`, signals, control flow, component-scoped store, Tailwind-first) are injected separately — this is what's specific to a UI library.

**Design-library-first (HARD RULE).** Every interactive widget or layout primitive MUST come from a design library — no Angular Material, no hand-rolled buttons / inputs / chips / modals.

- First choice: the domain's own `<prefix>-*` primitives in `libs/<domain>/design-library/`.
- Second: cross-app `dlc-*` primitives (`libs/shared/ui-design-library/` — go-forward home; most still in `libs/shared/ui-design-library-deprecated/` during migration) when genuinely workspace-wide.
- Forbidden: anything in `@angular/material/*` that renders DOM — it breaks the `--<prefix>-*` theming contract and ships un-themed widgets, even inside a styled wrapper.

Workflow for a new component / layout:

1. `ls libs/<domain>/design-library/src/lib/ | grep '^<prefix>-'` and read the likely candidates.
2. Reuse the matching `<prefix>-*` primitive — never re-style a raw `<button>` / `<input>`, even with Tailwind.
3. If a primitive is missing, STOP and surface the gap: propose a new `<prefix>-*` component (or a new input on an existing one). Do NOT fall back to Material and do NOT hand-roll it inline.

**Global state** is consumed from `@gigasoftware/<domain>-store` via its **facades** (signals for reads, methods for dispatch) — never `Store` / selectors directly.
