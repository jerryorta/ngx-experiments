# Ledger — Personal-Finance Dashboard Demo Build Brief

> **Purpose:** an alternate flagship demo for the `@nge` stack — a
> **charts-forward** personal-finance dashboard that showcases the shared libraries
> and this repo's modern-Angular architecture end-to-end. Portfolio-grade: polished,
> responsive, coherent.
>
> `Ledger` / domain `ledger` / prefix `ldg` are placeholders — rename freely, but
> keep the prefix consistent across the domain libs, the app, and the `--ldg-*`
> tokens.

## Concept

A **personal-finance / budgeting dashboard** — track accounts, transactions, and
budgets, with rich spending analytics. Where *Fieldwork* leans on the calendar and
workflow primitives, **Ledger leans on `@nge/charts`** — it's the demo to reach for
when you want to show data-visualization depth.

## What it showcases

| Library | How this app uses it |
| --- | --- |
| `@nge/charts` | **the centerpiece** — balance / net-worth trend, spending-by-category donut, budget-vs-actual bars, monthly cashflow |
| `@nge/ui-design-library` (`dlc-*`) | transactions data-table, filters, category chips, add/edit dialog, detail drawer, account cards, inputs, selects, tooltip, header-bar |
| `@nge/date` | month navigation + date-range filtering |
| `@nge/calendar` | the bills & due-dates calendar + the transaction date-picker |
| `@nge/themes` | the theme switcher (see persona note below) |
| `@nge/rxjs` · `@nge/storybook` | async simulation of the mock backend; stories for new `ldg-*` components |

**Persona note:** the three `@nge` personas (*Professional / Home / Service
Provider*) map less literally to personal finance than they do to Fieldwork. Keep
the persona / theme switcher anyway — its job here is to **prove the token
architecture** (same UI, swapped `--*` token sets, light + dark), which is valuable
regardless of semantic fit. If you want a narrative, frame them as
*advisor view / household budgeting / bookkeeper*.

## Ground yourself first

Run `/explain` (or read `.claude/commands/explain.md`), then read
`docs/reference/` (architecture, domain-library-set, angular-conventions, styling)
and `docs/ai-instructions/reference/multi-component-signal-store.instructions.md`.
Do a **code-architect blueprint pass** before writing code.

## Scaffold

- Run **`/new-domain`** with prefix **`ldg`** to create the `ledger`
  domain-library-set (`models` / `store` / `ui` / `design-library` / `utils` /
  `mocks` / `themes`) + Storybook wiring.
- Add the host app **`apps/ledger`** via the Nx Angular app generator (use the
  `nx-generate` skill). Page components are thin wrappers built from
  `<dlc-header-bar>` + `<dlc-mobile-page-content>`.

## V1 scope — three screens

Each screen is chosen to exercise specific libraries.

1. **Overview** — the analytics dashboard: a balance / net-worth trend chart, a
   spending-by-category donut, budget-vs-actual bars (`@nge/charts`), account
   summary cards, and a recent-transactions table.
2. **Transactions** — a filterable `dlc` data-table (search input, category chips,
   **date-range filter** via `@nge/date` + date-picker); row → detail drawer; an
   add / edit transaction dialog (amount input, category + account selects,
   date-picker).
3. **Budgets** — per-category budget cards with progress (budget vs spent) and an
   edit-budget form, plus a **bills & due-dates calendar** (`@nge/calendar`) for
   recurring bills.

**Showpiece:** an in-app **theme switcher** that live-swaps `@nge/themes` tokens —
the same dashboard under each brand, light and dark. Make it prominent.

## Architecture — non-negotiable (the repo's invariants)

- **Standalone** components; **`inject()`** (never constructor DI);
  **`input()` / `output()`** (never `@Input()` / `@Output()`); **`@if` / `@for` /
  `@switch`** (never `*ngIf` / `*ngFor`); **OnPush**; **separate
  `.ts` / `.html` / `.scss` / `.spec.ts`** per component (never inline
  `template` / `styles`).
- **ALL local UI / interaction state** lives in a **component-scoped
  `@ngrx/signals` SignalStore** (`providers: [Store]`, colocated, **never**
  `providedIn: 'root'`). The component class keeps only inputs / outputs, the
  injected store, and template glue. For a screen's subtree, children **`inject()`**
  the store — no prop-drilling `input()` / `output()` down the tree.
- **App / domain data** lives in a **global `@ngrx/store`** slice under
  `libs/ledger/store` with **facades + selectors**. The component store
  *supplements*, never replaces, the global store.
- **No real backend** — serve from `libs/ledger/mocks`, consume via signals with
  `@let`, and simulate async with small `@nge/rxjs` delays.
- **Reuse `@nge/ui-design-library` (`dlc-*`)** — do **not** rebuild buttons, inputs,
  tables, dialogs, drawers, chips, etc. Build only genuinely new presentational
  pieces in `libs/ledger/design-library` (own **`ldg-`** prefix), each with a
  Storybook story (persona-themed).
- **Styling:** Tailwind utility classes in HTML by default; SCSS + BEM only for
  complex layout / animation where Tailwind is insufficient. Self-theme via
  own-namespace **`--ldg-*`** CSS-variable tokens with literal fallbacks.
  **No Angular Material, no `--mat-*` / `--mat-sys-*`.**
- **Testing:** **Jest only** (never Jasmine). Cover the stores and key components —
  especially any money math (keep amounts in integer minor units, format at the edge).

## Done criteria

- `npx nx run-many --target=lint,test --all` is green.
- `npx nx run storybook-app:build-storybook` succeeds; new `ldg-` components appear
  in Storybook with the theme switcher.
- The app serves; all three screens work under **all themes** in **light and dark**.

## Suggested build order

architect / blueprint → `/new-domain` + app shell → models + mocks + global
store / facade → Overview (charts) → Transactions → Budgets → theme switcher →
Storybook stories → verify.
