# Fieldwork — Demo App Build Brief

> **Purpose:** the flagship "what we can build with Claude on the `@nge` stack" demo.
> Build a portfolio-grade app that showcases every `@nge` shared library and this
> repo's modern-Angular architecture end-to-end. It must look and feel
> production-quality: polished, responsive, coherent.
>
> `Fieldwork` / prefix `fw` are placeholders — rename freely, but keep the prefix
> consistent across the domain libs, the app, and the `--fw-*` tokens.

## Concept

A **home-services scheduling & operations console** — a small
cleaning / landscaping / handyman business managing clients, bookings, and jobs.

This concept was chosen because it does three things at once:

- **Exercises every `@nge` lib in one coherent product** (see coverage below).
- **Maps 1:1 onto the three existing personas** — *Professional / Home /
  Service Provider* are literally the operator, the homeowner, and the business —
  so the showpiece is **"one app, three brands, live theme switch, light + dark."**
- **Echoes the concierge origin** of the design library without being chained to it,
  so it reads as a real product rather than a kitchen sink.

## What it showcases

| Library | How this app uses it |
| --- | --- |
| `@nge/ui-design-library` (`dlc-*`) | data-table, drawer, dialog, stepper, chips, filters, cards, inputs, selects, tooltip, header-bar |
| `@nge/themes` | the persona switcher — Professional / Home / Service Provider × light & dark |
| `@nge/calendar` | the Schedule week/day view + date-picker + time-picker |
| `@nge/charts` | the Dashboard revenue-trend + jobs-by-status charts |
| `@nge/date` · `@nge/rxjs` | date math, async simulation of the mock backend |
| `@nge/storybook` | stories for every new `fw-` presentational component |

## Ground yourself first

Run `/explain` (or read `.claude/commands/explain.md`), then read
`docs/reference/` (architecture, domain-library-set, angular-conventions, styling)
and `docs/ai-instructions/reference/multi-component-signal-store.instructions.md`.
Do a **code-architect blueprint pass** before writing code.

## Scaffold

- Run **`/new-domain`** with prefix **`fw`** to create the `fieldwork`
  domain-library-set (`models` / `store` / `ui` / `design-library` / `utils` /
  `mocks` / `themes`) + Storybook wiring.
- Add the host app **`apps/fieldwork`** via the Nx Angular app generator (use the
  `nx-generate` skill). Page components are thin wrappers built from
  `<dlc-header-bar>` + `<dlc-mobile-page-content>`.

## V1 scope — three screens

Each screen is chosen to exercise specific libraries.

1. **Dashboard** — KPI stat cards, a revenue-trend chart + a jobs-by-status chart
   (`@nge/charts`), and a recent-jobs table.
2. **Schedule** — a week/day calendar of appointments (`@nge/calendar`); clicking a
   slot opens a `dlc` drawer/dialog with a **booking wizard** (`dlc` stepper) using
   the date-picker + time-picker, service-type / client selects, and notes.
3. **Clients** — a filterable `dlc` data-table (search input, status chips,
   filters); row → detail drawer with an edit form.

**Showpiece:** an in-app **persona switcher** (Professional / Home / Service
Provider) that live-swaps `@nge/themes` tokens — the same UI under all three
brands, light and dark. This is the money shot; make it prominent.

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
  `libs/fieldwork/store` with **facades + selectors**. The component store
  *supplements*, never replaces, the global store.
- **No real backend** — serve from `libs/fieldwork/mocks`, consume via signals with
  `@let`, and simulate async with small `@nge/rxjs` delays.
- **Reuse `@nge/ui-design-library` (`dlc-*`)** — do **not** rebuild buttons, inputs,
  tables, dialogs, drawers, steppers, chips, etc. Build only genuinely new
  presentational pieces in `libs/fieldwork/design-library` (own **`fw-`** prefix),
  each with a Storybook story (persona-themed).
- **Styling:** Tailwind utility classes in HTML by default; SCSS + BEM only for
  complex layout / animation where Tailwind is insufficient. Self-theme via
  own-namespace **`--fw-*`** CSS-variable tokens with literal fallbacks.
  **No Angular Material, no `--mat-*` / `--mat-sys-*`.**
- **Testing:** **Jest only** (never Jasmine). Cover the stores and key components.

## Done criteria

- `npx nx run-many --target=lint,test --all` is green.
- `npx nx run storybook-app:build-storybook` succeeds; new `fw-` components appear
  in Storybook with the persona theme switcher.
- The app serves; all three screens work under **all three personas** in **light
  and dark**.

## Suggested build order

architect / blueprint → `/new-domain` + app shell → models + mocks + global
store / facade → Dashboard → Clients → Schedule → persona switcher →
Storybook stories → verify.
