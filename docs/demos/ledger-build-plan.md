# Ledger Demo — Build Plan & Multi-Session Log

> **Concept/spec:** `docs/demos/personal-finance-demo-prompt.md` (the brief — *what* to build).
> **This file:** the execution plan + **living status** (*how*, and *where we are*). Source of truth across sessions.

## How to resume in a new session
1. Read this file + `docs/demos/personal-finance-demo-prompt.md` + the auto-loaded `MEMORY.md`
   (especially `project-ngx-experiments-stale-docs` — the repo's reference docs are partly stale).
2. Check **Status** below for the current wave. Fine-grained API signatures are in **Appendix A** (no need to re-scout).
3. Work on branch `feat/ledger-demo`. Update the Status checklist + Decisions log as you go.
4. Model strategy: **Opus orchestrates + verifies; Sonnet workers build** (tight, de-staled briefs). Reuse shared `dlc-*` / charts / calendar; build only new `ldg-*` presentational pieces.

---

## Status (living — update every session)
- **Phase:** **Wave 1 COMPLETE** (2026-07-10) — data core (models/utils), deterministic mocks, global `@ngrx/store` + facade, and theming backbone all green (82 tests). Ready for **Wave 2** (`ldg-*` design-library components + stories).
- **Branch:** `feat/ledger-demo` — create + commit this plan/brief as the baseline at the start of Wave 0.
- **Resolved decisions:**
  - [x] **D1 — Spending-by-category viz:** BUILD `ldg-donut-chart` (bespoke d3 arc, token-themed, reuses `nge-chart-legend`). *Not* the horizontal-bar substitute.
  - [x] **D2 — Blueprint approved** by user.
- **Wave checklist:**
  - [x] Wave 0 — scaffold + post-gen + green gate ✅ (2026-07-10)
  - [x] Wave 1 — models → mocks → global store; theming backbone ✅ (2026-07-10)
  - [ ] Wave 2 — `ldg-*` design-library components (incl. `ldg-donut-chart`) + stories
  - [ ] Wave 3 — three screens + component signal stores
  - [ ] Wave 4 — app shell / routing + theme-switcher showpiece
  - [ ] Wave 5 — stories complete; full lint/test/build/storybook; browser-verify 3 screens × 6 personas
- **Decisions log:**
  - 2026-07-10: Reuse shared `dlc` personas for theming (deviation from `/new-domain` default); `--ldg-*` aliases `--dlc-*`. Scaffold via the corrected generator sequence, **not** the stale `/new-domain` skill agent orchestration.
  - 2026-07-10: **D1 → build `ldg-donut-chart`** (donut, not bar). **D2 → blueprint approved.** Cleared to start Wave 0.
  - 2026-07-10 (**Wave 0 done**): Scaffolded 8 projects (`ledger-app` + 7 libs) via the corrected generator sequence. `@nx/js` libs (`models`, `mocks`) used `--bundler=none` to match `libs/shared/date` (no stray tsc build target). Generators **already emit zoneless `test-setup.ts`** (identical to shared libs) — no fixup needed; `zone.js` confirmed absent. Stripped the generator's sample components (they emitted `.component.css`, violating the scss convention) + the nx-welcome splash; every `index.ts` is now a documented `export {}` stub. `themes` reduced to styles-only (`export {}` + `src/lib/styles/ldg-themes.scss` stub). App wired for **Tailwind v4** (`src/tailwind.css` as a separate styles entry + `stylePreprocessorOptions.includePaths` → `libs/shared/themes/src/lib/styles`) and reuses `.dlc-professional-dark` on `<body>` until `ldg-themes` tokens land (Wave 1/2). Serve **port 4203** + `local-dev` build/serve configs added. **Green gate PASSED:** `nx run-many -t lint,test --projects=ledger-*` (8/8) + `nx run ledger-app:build` (clean).
  - 2026-07-10 (**Wave 0 deviations — flagged for confirm**): SKIPPED two plan post-gen items. (a) `apps/ledger/{backend,desktop,mobile}` `.nxignore` / nx.json eslint entries — those sibling apps don't exist (this is a web-app-only demo), and nx.json has no eslint-exclude array to mirror; adding entries for non-existent dirs is noise. (b) `s.app.ledger` / `b.app.ledger` npm scripts — recent commit `1ef5321` deliberately dropped the analogous `s.app.demo`/`b.app.demo`, and the repo now uses generic `nx run` scripts; serve via `nx run ledger-app:serve` (port 4203). Revisit if the sibling apps or per-app scripts are later wanted.
  - 2026-07-10 (**Wave 1 done** — 3 commits, Opus-orchestrated + verified, Sonnet/Haiku workers): **round 1** (parallel) `ledger-models` + `ledger-utils` (Sonnet) ∥ `ledger-themes` backbone (Sonnet); **round 2** `ledger-mocks` seed (Haiku); **round 3** `ledger-store` (Sonnet, reused round-1 worker for warm model/util context). 82 tests green + app build. **API contract for later waves:** money = signed integer cents, `Transaction.amountCents` sign *is* the type (neg=outflow); utils aggregations `spendingByCategory`/`netWorthSeries`/`cashflow`/`budgetVsActual(month)`; store exposes `LedgerFacade` (root, signal reads + `load()`, `budgetVsActual(month='2026-07')`) — **components inject `LedgerFacade`, never `Store`**; `provideLedgerStore()` awaits Wave 4 app wiring; `LEDGER_LOAD_LATENCY_MS` token (300ms; 0 in tests). Theming: `--ldg-*` aliases follow the active `.dlc-*` persona; ledger-only `--ldg-money-positive/negative` + `--ldg-category-1..8` (slot 8 = "Other"); category `accent` values are `var(--ldg-category-N)`. Seed: ~148 txns Feb–Jul 2026, deterministic (no random/Date), anchored to "today" 2026-07-10.
  - 2026-07-10 (**Wave 1 deviations — worth noting**): (a) **`ngrx-global-store` skill NOT used** — it's Firestore/concierge-specific (watch services, `firestoreWriteEffect`, `state.concierge-app.ts`) and references libs absent from this repo; the store is mock-loaded read-only, built from NgRx 21 source instead. The plan's "use the skill" line is stale for this demo. (b) **`ledger-utils` uses plain ISO-string date ops, not date-fns** — `new Date('YYYY-MM-DD')` + date-fns shifts a calendar day in non-UTC zones; string compare/`.slice(0,7)` is exact + TZ-proof. (c) **mocks on Haiku** per plan, guarded by a 39-assertion referential-integrity spec.

---

## Coordination model (multi-session)
- **One branch `feat/ledger-demo`, one PR** — consolidate edits (don't split each edit into its own PR).
- Waves have dependencies; **parallelize only within a wave, on independent files.**
- **Serialization points** (only one session/agent edits at a time): `tsconfig.base.json`, `nx.json`, `.nxignore`, and storybook-app config (`.storybook/main.ts`, `.storybook/tsconfig.json`, `project.json`, `src/styles.scss`). Nx generators also mutate these.
- For genuinely parallel building, use **git worktrees** (isolate per component/screen), then merge to the branch.
- **Scratchpad is session-local** — never use it for anything another session needs; durable notes go in this file.

---

## Ground truth — corrections to brief/docs (verified against package.json + tsconfig.base.json + the libs)
| Brief/doc says | Reality | Consequence |
|---|---|---|
| pages use `<dlc-header-bar>` + `<dlc-mobile-page-content>` | neither exists | build `ldg-header-bar` + `ldg-page-content` |
| `@nge/charts` has a donut/pie | no pie/donut — one `<nge-chart [config]>`, preset-driven, layer types `bar\|line\|area*\|scatter\|bullet\|diverging-bar\|grouped-bar` (*`area` has no renderer → line + `showArea`) | D1: build `ldg-donut-chart` |
| simulate async with `@nge/rxjs` delays | `@nge/rxjs` = only `memoize` | simulate with rxjs `delay()` + `toSignal()` in store effects |
| date-picker in `@nge/date` | it's in `@nge/calendar` (`nge-date-picker`, CVA, ISO-string value) | import from calendar |
| Storybook container `Giga*` | `NgeStorybookReviewContainerComponent` / `nge-storybook-review-container` | fix all story imports |
| Tailwind v3 (`tailwind.config.js` + `createGlobPatternsForDependencies`) | Tailwind v4 CSS-first (mirror `apps/storybook-app`) | v4 wiring only |
| `@gigasoftware/ledger/...` slash aliases; `ui-design-library-deprecated`; `@angular/material` | flat `@nge/ledger-*` (Nx default, matches repo); no `-deprecated`; no Material installed | correct aliases; zero Material |
| just run `/new-domain` | skill + create-storybook + create-chart-storybook are gigasoftware-flavored, cite nonexistent paths (`media-workbench`, `-deprecated`) | run corrected generator sequence directly; use `apps/storybook-app` + `libs/shared/*` as the only references |

Import specifiers (this repo): `@nge/{charts,ui-design-library,themes,date,calendar,rxjs,storybook}`.
Toolchain: Angular 22.0.6 · Nx 23.0.1 · NgRx 21.1 · Storybook 10.5.0-beta.2 · Tailwind v4 · TS 6 · zoneless · d3 + date-fns under the hood.

---

## Blueprint

### 1. Scaffold (Wave 0)
App nests at `apps/ledger/app`; 7 libs under `libs/ledger/`. Generators (de-staled):
```
app    npx nx g @nx/angular:application apps/ledger/app --name=ledger-app --prefix=ldg --routing=true --e2eTestRunner=none --tags="ledger,app"
models npx nx g @nx/js:library     libs/ledger/models  --name=ledger-models  --tags="models,lib"
store  npx nx g @nx/angular:library libs/ledger/store   --name=ledger-store   --prefix=ldg --tags="store,lib"
themes npx nx g @nx/angular:library libs/ledger/themes  --name=ledger-themes  --prefix=ldg --unitTestRunner=none --tags="ledger,themes,lib"
ui     npx nx g @nx/angular:library libs/ledger/ui      --name=ledger-ui      --prefix=ldg --tags="ui,lib"
dlib   npx nx g @nx/angular:library libs/ledger/design-library --name=ledger-design-library --prefix=ldg --tags="ledger,design,lib"
utils  npx nx g @nx/angular:library libs/ledger/utils   --name=ledger-utils   --prefix=ldg --tags="utils,lib"
mocks  npx nx g @nx/js:library     libs/ledger/mocks   --name=ledger-mocks   --tags="mocks,lib"
```
Post-gen (mirror `apps/storybook-app` + `libs/shared/*`): verify flat `@nge/ledger-*` aliases; keep `themes` `index.ts` as `export {}` stub; **zoneless** `test-setup.ts` on store/ui/dlib/utils; eslint selector prefix→`ldg`; add `lint` target to the two `@nx/js` libs; **Tailwind v4** wiring (verify storybook-app's exact files — `src/tailwind.css` + build `styles` array + `@tailwindcss/postcss`); `provideZonelessChangeDetection()`; add **`local-dev`** build+serve configs; `index.html` (`ldg-dark`, `<ldg-root>`); add `apps/ledger/{backend,desktop,mobile}` to `.nxignore` + `nx.json` eslint excludes; add `s.app.ledger`/`b.app.ledger` scripts (port **4203**). **Gate:** `nx run-many --target=lint,test --projects=ledger-*` green + `nx run ledger-app:build`.

### 2. Theming — the showpiece (deliberate deviation from `/new-domain`)
Reuse the shared persona system (the brief's intent: "prove the token architecture — same UI, swapped token sets").
- App root carries one of the 6 shared classes `.dlc-{professional|home|service-provider}-{light|dark}` (via `dlc-theme-mixin()`). Reused components auto-theme: `dlc-*` (`--dlc-*`), charts (`--chart-*` bridge), calendar (`--nge-calendar-*` bridge).
- `ledger/themes` defines `--ldg-*` as semantic aliases over `--dlc-*` (+ a few ledger-only tokens: positive/negative money, category accents) → `ldg-*` components are namespaced yet follow the active persona.
- **Switcher** swaps the root class; reuse `ThemeConfig` / `STORYBOOK_THEME_CONFIGS` (6 personas) from `@nge/storybook`. Narrative: advisor / household / bookkeeper.
- Bonus: ledger design-library stories theme correctly under the existing Storybook switcher — no `STORYBOOK_THEME_CONFIGS` change, only the 4 wiring edits.

### 3. Data architecture
- `ledger/models` — `Account`, `Transaction`, `Category`, `Budget`, `Bill`; **money = integer minor units (cents)**.
- `ledger/mocks` — seed (~4 accounts, ~10 categories, 3–6 months of transactions, budgets, bills).
- `ledger/store` — global classic `@ngrx/store` (`@ngrx/entity` slices; facades + selectors; effects load from `ledger-mocks` via simulated `delay()`); derived selectors for net-worth series, spending-by-category, budget-vs-actual, cashflow. Use the `ngrx-global-store` skill.
- Component-scoped `@ngrx/signals` SignalStores (colocated, `providers:[Store]`, never root; children `inject()`, no prop-drilling): `TransactionsStore` (search/filters/date-range/sort/selected-row/dialog), `BudgetsStore` (edit draft), minimal Overview store (trend-range toggle). Use `ngrx-component-state`.

### 4. Components — reuse vs. build
Reuse: `dlc-data-table` (presentational — store owns sort/filter), `dlc-dialog`, `dlc-drawer`, `dlc-input`, `dlc-select`, `dlc-search-input`, `dlc-filter-popover`, `dlc-sort-control`, `dlc-stats-card`, `dlc-analytics-card` (chart-in-body), `dlc-progress-bar`, `dlc-button`, `dlc-fab`, `dlc-badge`, `dlc-avatar`, `[dlcTooltip]`, `<nge-chart>` + `<nge-chart-legend>`, `<nge-calendar>` + `<nge-date-picker>`.
Build (`libs/ledger/design-library`, `ldg-`, each with a story): `ldg-header-bar`, `ldg-page-content`, `ldg-amount-input` (cents in / decimal out), `ldg-category-chip` (selectable), `ldg-account-card`, `ldg-budget-card`, `ldg-empty-state`, likely `ldg-icon-button`, and **`ldg-donut-chart`** (D1: confirmed — bespoke d3 donut, reuses `nge-chart-legend`, themed via `--chart-*`/`--dlc-*`).
Gotcha: `dlc-button` is `w-full` + has no `type` input (defaults to submit in a form) → drive the add/edit dialog via button-click outputs, not a native `<form>` submit.

### 5. Screens (`libs/ledger/ui`)
1. **Overview** — stats cards; `dlc-analytics-card`s wrapping charts (net-worth trend = `createLineChartConfig`, `x:Date`, `showArea`; spending-by-category = `ldg-donut-chart`; budget-vs-actual = `createGroupedBarChartConfig`; cashflow = composite bar+line); `ldg-account-card` grid; recent-transactions `dlc-data-table`.
2. **Transactions** — `dlc-search-input` + `ldg-category-chip` + date-range (`dlc-filter-popover` + `nge-date-picker`) + `dlc-sort-control`; `dlc-data-table` (`dlcCell` + `dlcRowExpansion`); row → `dlc-drawer`; add/edit `dlc-dialog` (`ldg-amount-input`, `dlc-select` ×2, `nge-date-picker`). State in `TransactionsStore`.
3. **Budgets** — `ldg-budget-card` grid (budget vs spent) + edit form (`ldg-amount-input`); bills `<nge-calendar>` (bills = `config.events`, domain obj in `data`).

### 6. Storybook
Every `ldg-*` gets a story (de-staled `create-storybook`; `ldg-donut-chart` via `create-chart-storybook`). Register with 4 edits: `.storybook/main.ts` glob, `.storybook/tsconfig.json` include (keep main.ts↔tsconfig in sync), `project.json` `stylePreprocessorOptions.includePaths` += `libs/ledger/themes/src/lib/styles`, `src/styles.scss` `@use 'ldg-themes'` + `@include`. Reference: `libs/shared/calendar/.../stories/generic/`.

### 7. Money math & testing
Integer cents everywhere; format only at the edge (`ledger/utils` `formatMoney`/`parseMoney`); `ldg-amount-input` internal cents. **Jest only, zoneless.** Cover money utils + aggregations, global reducers/selectors/effects, signal stores, key components.

---

## Build waves & delegation
| Wave | Work | Who |
|---|---|---|
| 0 | Scaffold + post-gen + green gate | Opus (close-drive — trap-heavy) |
| 1 | models → mocks → global store (chain); theming backbone (parallel) | Sonnet (Haiku for mock seed) |
| 2 | `ldg-*` components + stories | Sonnet, fan out parallel |
| 3 | 3 screens + signal stores | Sonnet, pipelined; Opus reviews state design |
| 4 | app shell/routing + theme-switcher showpiece | Sonnet + Opus |
| 5 | remaining stories; full lint/test/build/storybook; browser-verify | Opus (verify) |

## Done criteria
`nx run-many --target=lint,test --all` green · `nx run storybook-app:build-storybook` succeeds with themed `ldg-` stories · app serves; all 3 screens work under all 6 personas (light + dark).

---

## Appendix A — Builder's API cheat-sheet & gotchas (from grounding scouts; avoids re-scouting)

### Charts — `@nge/charts`
One component `<nge-chart [config]="cfg">` (+ standalone `<nge-chart-legend [items] [orientation]>`). Build `cfg` with a preset factory (each returns `NgeChartConfig`):
- `createLineChartConfig({ data: NgeLineDataPoint[], showArea?, areaOpacity?, curveType?:'linear'|'monotone'|'step', seriesColors?, showXAxis?, showYAxis?, xAxisLabel?, yAxisLabel?, tooltip?, legend? })` — `NgeLineDataPoint {x: Date|number|string; y: number; seriesId?; color?}`. `x:Date` ⇒ auto time axis. → **net-worth trend**.
- `createBarChartConfig({ data: NgeBarDataPoint[], orientation?:'vertical'|'horizontal', labelFormat?, showMeanLine?, showMedianLine?, yAxisTickFormat?, ... })` — `NgeBarDataPoint {label; value; color?}`.
- `createGroupedBarChartConfig({ data: NgeGroupedBarDataPoint[], groupPadding?, ... })` — `NgeGroupedBarDataPoint {groupId; label; value; color?}`. → **budget vs actual**.
- `createDivergingBarChartConfig(SINGLE NgeDivergingBarDataPoint {min; max; value; positiveColor?; negativeColor?})` (defaults +green/-red). → **net cashflow ±**.
- `createBulletChartConfig(SINGLE NgeBulletDataPoint {min; max; progress})` → goal progress.
- `createScatterChartConfig({ data: NgeScatterDataPoint[] })`.
- Composite (bar+line cashflow): merge preset layers into `{ base, layers: [...bar.layers, ...line.layers], legend, scaleFactory }`; `scaleFactory` supplies one shared Y. Helpers: `addLayer`, `renderBarLayer`/`renderLineLayer`/…, `extractLineChartLegendItems`.
- **Gotchas:** axes OFF by default (set `showXAxis`/`showYAxis`); currency via `labelFormat`/`xAxisTickFormat`/`yAxisTickFormat` = `d=>'$'+d`; `'area'` type has no renderer → line + `showArea`; diverging/bullet take a SINGLE object not array; NO pie/donut (we build `ldg-donut-chart`).
- **Theme:** charts read `--chart-*` (18 tokens), bridged to `--dlc-*` by persona classes (inherits through shadow root — set class on ancestor). Per-chart override: `config.theme` (deep-merged).

### dlc components — `@nge/ui-design-library` (all standalone, OnPush, signal I/O)
- `dlc-data-table` `[columns: DlcTableColumn[]] [rows] [groups: DlcTableGroup[]] [expandedRowId] [getRowId]`, `(columnDropped)`. `DlcTableColumn {key; label; sticky?; width?}` (one sticky max); `DlcTableGroup {label; rows; id?; collapsible?; accentColor?}`. Custom cell `<ng-template dlcCell="colKey" let-row let-value="value">`; row expand `<ng-template dlcRowExpansion let-row>`. **Presentational — store owns sort/filter.**
- `dlc-dialog` `[visible] [size:'sm'|'md'|'lg'] [dismissOnBackdropClick] [dismissOnEscape] [showCloseButton]`, `(dismissed)`; slots `[dlc-dialog-title]` `[dlc-dialog-content]` `[dlc-dialog-actions]`.
- `dlc-drawer` `[opened] [defaultWidth] [minWidth] [maxWidth] [storageKey]`, `(closedStart) (widthChange)`; default `<ng-content>`.
- `dlc-input` (CVA, string) `[label] [placeholder] [type:'text'|'number'|'email'|'password'|'tel'|'url'|'date'] [helperText] [errorText] [disabled]`. `dlc-select` (CVA, single) `[options: {label;value}[]] [placeholder] [panelMinWidth?]`, `(selectedValueChange)`. `dlc-search-input` (not CVA) `[value] [placeholder]`, `(queryChange) (micClick)`. `dlc-textarea`, `dlc-checkbox`, `dlc-toggle` also available.
- `dlc-filter-popover` `[label] [active] [valueLabel] [clearable]`, `(opened)(closed)(cleared)`, panel via `<ng-content>`. `dlc-sort-control` `[fieldOptions: DlcSortFieldOption[]] [field] [direction]`, `(sortChange:{field,direction})` — pass your own `fieldOptions`. `dlc-filter-bar` (scrollable row, projects triggers).
- `dlc-stats-card` `[label] [value:string] [trend:'up'|'down'|'flat'] [trendLabel] [routerLink]`. `dlc-analytics-card` `[label] [headline] [explainer] [accentColor]` + default `<ng-content>` (put a chart in the body).
- `dlc-progress-bar` `[mode:'determinate'|'indeterminate'] [value] [label]`. `dlc-button` `[variant:'primary'|'ghost'|'danger'] [size] [loading] [light]` ⚠️ **w-full by default, no `type` input** (defaults to submit in a `<form>`). `dlc-fab` `[icon] [ariaLabel]`, `(fabClick)`. `dlc-badge` `[count] [variant]`. `dlc-avatar` `[imageUrl] [initials] [size] [status]`. `[dlcTooltip]="text" [dlcTooltipPosition]`. `[dlcIcon]="matSymbolName"`.

### Calendar / date
- `<nge-calendar [config]="cfg">` `(eventClick)(eventDrop)(eventResize)(rangeChange)(slotClick)(viewChange)`. `NgeCalendarConfig<T> { date; view:'day'|'week'|'month'|'year'; events: NgeCalendarEvent<T>[]; weekStartsOn?; monthLayout?:'grid'|'agenda'; eventOverlay?; theme? }`. `NgeCalendarEvent<T> { id; title; start; end?; allDay?; color?; data?:T }` — **bills/due-dates = events; carry the domain object in `data`**. Types accept `Date|number|string|NgeTimeStamp`.
- `<nge-date-picker>` (CVA; value = ISO `'YYYY-MM-DD'`) `[min] [max] [placeholder] [weekStartsOn]`, `(dateChange)`. **Lives in `@nge/calendar`.** Also `<nge-time-picker>`.
- `@nge/date` pure fns/types: `getMonthMatrix(date, weekStartsOn?)`, `addMonths/addDays/addYears`, `startOfMonth/endOfMonth/startOfWeek/…`, `DateRange {start; end}` (alias of `DateInterval`), `isWithinInterval`, `eachDayOfInterval`, `isSameDay/isSameMonth`, `differenceInMinutes/Hours`, `WeekStartsOn = 0..6`.

### Storybook / themes / rxjs / mocks
- From `@nge/storybook`: `NgeStorybookReviewContainerComponent` (`nge-storybook-review-container`, inputs `figmaUrl/uxUrl/storybookFilePath/trackingNumber/reviewStatus`), `REVIEW_STATUS` enum (DRAFT/EXPERIMENTAL/FINAL/PROTOTYPE), `ThemeConfig {cssClass;isDark;isDefault;name}`, `STORYBOOK_THEME_CONFIGS` (the 6 personas), `getDefaultThemeConfig`, `resolveThemeForGroup`, `THEME_GROUP_CONFIGS`, `ThemeGroupKey='cg'`. Scope a story's picker with `parameters:{ themeGroup:'cg' }`.
- Themes: 6 host classes `.dlc-{professional|home|service-provider}-{light|dark}` set `--dlc-*`; **no theme service — swap the class** (bind via `[class]` from a signal). Persona files also bridge `--chart-*` and `--nge-calendar-*` onto `--dlc-*`. App opt-in: `@use 'dlc-themes'; @include dlc-themes.dlc-theme-mixin();` + `includePaths` has `libs/shared/themes/src/lib/styles`.
- `@nge/rxjs` = **only `memoize`** (no delay). **Async-mock pattern (build it):** `of(SEED).pipe(delay(300))` → `toSignal(...)` (rxjs-interop) → consume with `@let` in the template. Use inside store effects for realistic NgRx flow.
- create-storybook / create-chart-storybook skills are **stale on imports** — use `@nge/storybook` + `NgeStorybookReviewContainerComponent` (not `Giga*`) and `nge-chart`/`NgeChartComponent`. Real reference story: `libs/shared/calendar/src/lib/nge-calendar/stories/generic/`.
