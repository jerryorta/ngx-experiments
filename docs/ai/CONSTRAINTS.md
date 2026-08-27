# Constraints — Authoritative Invariants

> **If any guidance in the repository conflicts with this file, this file prevails.**

## Component File Structure (ALL components)

- MUST use separate files: `.ts`, `.html`, `.scss`, `.spec.ts`
- NEVER inline `template` or `styles` in `@Component`
- MUST use `templateUrl` and `styleUrl`

## Zoneless Change Detection

- Angular 22 uses signal-based zoneless change detection — Zone.js is deprecated
- App config MUST use `provideZonelessChangeDetection()` — NEVER `provideZoneChangeDetection()` or Zone.js polyfills
- Test setup MUST use `setupZonelessTestEnv` from `jest-preset-angular/setup-env/zoneless` — NEVER `setupZoneTestEnv`
- **Legacy exceptions — do not copy them into anything new.** Two bootstraps still call `provideZoneChangeDetection()`: `apps/cognition/marketing/src/main.ts` and `apps/storybook-app/src/app/app.config.ts`. Every other bootstrap in the graph is zoneless. (The frozen `evolving-cognition` / `real-estate` domains are outside the graph and outside this count.)
- **Test-setup migration is partial.** 32 `test-setup.ts` files use `setupZonelessTestEnv`; 25 still use `setupZoneTestEnv` and need migration — every `libs/shared/*` library except `calendar`, `table`, `table-addon-conformance` and `ui-design-library` (`api` has no `test-setup.ts` at all), all of `libs/media-workbench/*`, plus `libs/concierge/secrets` and `libs/tailwind-preset`, and the apps `cognition/marketing`, `gigasoftware/marketing` and `storybook-app`. Measure with `grep -rl setupZoneTestEnv libs apps --include='test-setup.ts' | grep -vE '^(apps|libs)/(evolving-cognition|real-estate)/'`.

## Angular Conventions

- Use new control flow syntax: `@if`, `@for`, `@switch` — NEVER `*ngIf`, `*ngFor`, `*ngSwitch`
- Use `inject()` function — NEVER constructor injection
- Use signal `input()` / `output()` — NEVER `@Input()` / `@Output()` decorators
- Use `@let` declarations in templates for signal values
- NEVER implement lifecycle hooks (`OnDestroy`, `OnInit`, etc.) on `@Injectable` services. Lifecycle hooks are designed for components and directives; on services they only run when the **providing injector** is destroyed — which for `providedIn: 'root'` means application shutdown (effectively never). For subscription cleanup in services, inject `DestroyRef` and use `takeUntilDestroyed(destroyRef)` — this ties the subscription to the host injector's lifetime and works in tests (fires on `TestBed.resetTestingModule()`)

## UI Design Library (`libs/shared/ui-design-library`)

- MUST use `ViewEncapsulation.None`
- MUST have `host: { class: 'selector-name' }` matching the component selector
- SCSS MUST wrap ALL styles in the component class (e.g., `.dlc-component-name { }`)
- Define CSS variables first for overridable styles (e.g., `--dlc-component-name-padding: 1rem;`)
- Use CSS variables in component styles (e.g., `padding: var(--dlc-component-name-padding);`)
- NEVER use `:host` in SCSS files (incompatible with ViewEncapsulation.None)
- Component selector prefix: `dlc-`
- Full guide: `libs/shared/ui-design-library/COMPONENT-ARCHITECTURE-BEST-PRACTICES.md`

## Application Components (`apps/*/src/app/`)

- Use default `ViewEncapsulation.Emulated` (or omit encapsulation)
- When using SCSS with `:host`: ALL styles MUST be wrapped in `:host { }` EXCEPT `@media` queries
- `@media` queries must be outside `:host`, with `:host` nested inside them
- App page components are thin wrappers — they compose components from **their own domain's design library** (`libs/<domain>/design-library`, selector prefix `cg-` / `gy-` / `cog-` / `mw-` / `nge-` / `jo-`) and read state through a store; layout markup and logic stay out of the page.
- **There is no cross-domain page shell.** Each domain has its own: got-you wraps page bodies in `<gy-page-content>` under the shell's `<gy-header-bar>`; cognition titles pages with `<cog-page-heading>` inside a `<cog-top-bar>` / `<cog-bottom-bar>` / `<cog-nav-sidebar>` shell; concierge composes plain elements under `<cg-nav-sidebar>` + `<cg-breadcrumb>`; media-workbench, nge-marketing and jerryorta pages own their markup over `--mw-*` / `--nge-*` / `--jo-*` tokens. Match the domain you are writing in.
- **Legacy — evolving-cognition and real-estate only:** those apps' pages use `<dlc-header-bar>` + `<dlc-mobile-page-content>` and the `dlc-global-mobile-page` host class from `@nge/ui-design-library-deprecated`. That library is deprecated: existing pages stay as-is, and nothing new imports from it. (A global mobile-page layout class on the root `AppComponent` is separate from any page-component rule: concierge and media-workbench keep the `dlc-global-mobile-page` name, got-you uses its own `gy-global-mobile-page`, and each domain's `_<prefix>-base.scss` defines the one it uses.)
- Full guide: `docs/ai-instructions/reference/angular-app-component.instructions.md`

## Styling

- Tailwind CSS preferred over SCSS
- SCSS for complex component-specific styles only

## Angular Material — Legacy Only (NOT for New Development)

- **New apps and all new components do NOT use Angular Material.** Never add `@angular/material` imports, `mat-*` components, or `--mat-sys-*` design tokens to new code.
- Angular Material remains only in legacy code, all of which stays as-is — this is a forward-looking policy for new development, **NOT** a directive to remove Material from existing apps (do not tear down working code). The full set of `@angular/material` importers:
  - **evolving-cognition** — `apps/evolving-cognition/app` (84 files), `libs/evolving-cognition/ui` (71), `apps/evolving-cognition/marketing`, `libs/evolving-cognition/store`
  - **real-estate** — `libs/real-estate/ui` (219 files), `apps/real-estate/app` (97)
  - **legacy marketing sites** — `apps/gigasoftware/marketing` (17 files), `apps/cognition/marketing`
  - **shared libraries with legacy surface** — `libs/shared/ui-design-library-deprecated` (54), `libs/shared/material` (6), `libs/shared/store` (3), `libs/shared/feature-flag` (3), and `libs/shared/themes`' `nge-storybook-review-container` (the Storybook harness)
  Measure with `grep -rl "@angular/material" libs apps --include='*.ts'`. Every domain design library (`cg-`, `gy-`, `mw-`, `cog-`, `nge-`, `jo-`) is Material-free — the only matches there are comments recording that its dialog primitive exists so nobody reaches for `@angular/material/dialog`.
- **New component architecture** (proven to work without Material — reference: `libs/shared/calendar`): `ViewEncapsulation.None` + `host: { class: '<prefix>-name' }`, Tailwind utility classes, and a self-sufficient **own-namespace CSS-variable token set** — `--<prefix>-*` with **literal fallbacks** (e.g. `var(--nge-calendar-surface, #ffffff)`), centralized as a token map/helper. Consumers theme via `--<prefix>-*` overrides — never `--mat-sys-*`.
- Docs/examples written against `--mat-sys-*` or `mat-*` describe how the **legacy** apps work; do not follow them when building anything new.

## Shared Library Namespacing

- **A shared library declares ZERO un-namespaced CSS custom properties.** Every token it publishes carries the library's own prefix — `--nge-calendar-*` (`libs/shared/calendar`, 28 tokens, none bare), `--nge-chart-*` (`libs/shared/charts`), `--nge-table-*` (`libs/shared/table`). A bare `--surface` or `--primary` is a collision waiting to happen in the host app, and the failure is **silent**: an unresolved custom property yields an unstyled element with a green build.
- **Every CSS class and component/directive selector a `ViewEncapsulation.None` library emits is prefixed too.** Encapsulation `None` makes the class global, so class naming is correctness work, not cosmetics.
- **A library that scopes story/demo scaffolding needs a second, disjoint namespace** — charts uses `nge-story-*` for story-internal classes so they can never collide with the `nge-chart-*` classes the runtime emits. See `libs/shared/charts/AGENTS.md` § Naming convention.
- **TS: prefix the identity surface** — components, directives, services, injection tokens, top-level public types. Supporting option / model types may stay bare (calendar prefixes 29 of 106 deliberately); do not blanket-prefix.
- Historical note: charts was the one shared library that skipped this and was brought onto the convention by ARCH-252.

## NgRx Facades & Selectors

- **Signals are reserved for component / DOM updates; data flow uses RxJS.** RxJS Observables are more performant for streams, merges, and dynamic composition.
- **Facade reads consumed directly by components** — expose via `store.selectSignal(selector)` so consumers don't need a `toSignal()` wrapper.
- **Facade reads participating in data flow** (piped, merged, composed) — expose via `store.select(selector)` as an Observable.
- **Keep the `$` suffix on facade read properties** whether they return a Signal or an Observable — the suffix marks "data stream" and keeps the public API stable when the underlying changes.
- **Business logic (filtering, merging, conditional aggregation, derived values) lives in selectors, not facades.** Facades are API, not logic.
- **Cross-slice aggregations go in a dedicated aggregate selectors file** (e.g. `libs/<domain>/store/src/lib/aggregate.selectors.ts`) rather than importing sibling slices from one slice's selector file. Prevents circular dependencies as the graph grows.
- Full guide: `docs/reference/ngrx/facades-and-selectors.md`

## Reactive Rendering — NEVER Gate UI on Subscription Resolution

- **A page or route NEVER blocks on whether a subscription has loaded or resolved.** Add the subscription and render the surface from whatever the store currently holds. Never hold a whole page, route or shell behind a load flag — and never AND such flags across sources, which is the same mistake compounded.
- **A load flag IS fine for status and small, local UI.** A skeleton on one list, a spinner on one card, an inline "syncing" hint, an empty-vs-warming decision for a single collection — all legitimate. The line is scope: it may decorate a region, never gate the page.
- **Empty is a renderable state, not a "not yet" state.** Derive view state as a `computed` / selector over the current entities; it renders immediately and fills in as snapshots land.
- **A failing subscription degrades ITS OWN region only** — every other part of the page still renders. Gating the page makes every listener a single point of TOTAL failure, in a state visually indistinguishable from "still loading".
- **Why:** Firestore over websockets is a streaming model; a load gate bolts a request/response mental model on top of it. It is both wasted engineering (a state field, reducer arm, selector and facade signal per slice, answering a question reactive rendering never asks) and actively fragile.
- Measured (COG-142): cognition's `/small/home` feed ANDed **ten** independent load confirmations — five facades, one of which (`workspaces`) was itself six per-slug flags. It spun forever for an account whose collections were empty and looked fine for a data-bearing one, so it passed every browser check and only surfaced on a device. Patching each source's error path one at a time defends a design that should not be able to stall at all.

## Component-Scoped State (All Components & Multi-Component Systems)

- ALL of a component's **internal reactive state** — writable `signal()`s, stateful `computed()`/`linkedSignal()`s, `effect()`s, `toSignal` bridges, RxJS subscriptions, and the orchestration methods around them — MUST live in ONE **component-scoped `@ngrx/signals` SignalStore provided at that component** (`providers: [Store]`; for a multi-component system, its root component) — NEVER `providedIn: 'root'` (one instance per component instance; correct lifecycle + isolation).
- **No size or line-count threshold** (rule strengthened 2026-06-12, GY-72 — the previous "substantial state" trigger is removed): a component with a single internal signal still extracts. The component class keeps ONLY `input()`/`output()` (the public boundary), the injected store, and template-only glue (pure presentational derivations, host bindings).
- **Colocate** the store next to the component / system root it serves (its own folder in the same directory) — NEVER a shared / central store directory; it ships and is tested with its component.
- Child components MUST `inject()` the store. NEVER thread the shared state as `input()` nor bubble interactions as `output()` between internal components.
- `input()` / `output()` live ONLY at the root component's public boundary (config in, domain events out). NEVER prop-drill inputs or bubble outputs through ≥ 2 component levels — that is the anti-pattern this rule replaces.
- The store holds reactive UI state; derived view-models are `withComputed`; algorithms stay in **pure functions** the store calls. State, not logic.
- Exemptions are by KIND, never size: design-library presentational primitives keep their **intrinsic widget mechanics** (CVA internals — a reveal toggle, an open flag, hover/focus state) as component signals; zero-state components need no store; passing config to presentational leaves via `input()`/`output()` at their public boundary is boundary wiring, not internal state.
- **This SUPPLEMENTS the global classic `@ngrx/store`; it does NOT replace it.** Different jobs: the global domain store (`@nge/<domain>-store`, consumed via facades/selectors — see "NgRx Facades & Selectors" above) is the system of record for app-/domain-wide persistent data, `@ngrx/entity`, and Firestore websocket subscriptions; the component-scoped SignalStore holds the *ephemeral, local UI/interaction state* of one component system. A system typically does BOTH — consume global state via its facade AND run its own SignalStore. Never migrate a global slice into a component store, nor promote a component's local UI state into the global store.
- Reference impls: `libs/real-estate/ui/src/lib/cma/store/` (CMA — multi-component system) and `libs/got-you/ui/src/lib/onboarding-shell/steps/create-group/gy-create-group-step.store.ts` + `onboarding-shell/data/with-onboarding-step-form.ts` (single-component form step composing a reusable `signalStoreFeature` — GY-72). Full guide: `docs/ai-instructions/reference/multi-component-signal-store.instructions.md`. Scaffold via the `ngrx-component-state` skill.

## Testing

- Framework: Jest — NEVER Jasmine
- Colocate test files as `*.spec.ts` next to source
- Mock externals (Firebase, network) at library boundaries

## Domain Library Creation

- ALWAYS use the Nx CLI (`npx nx generate`) to create domain libraries — NEVER create library files and configuration manually
- Full guide: `docs/reference/domain-library-set.md`

## Module Boundaries

- **Every Nx project declares exactly one `scope:*` tag and exactly one `type:*` tag** in its `project.json`, and `@nx/enforce-module-boundaries` in the root ESLint config checks both axes on every import as an intersection — a project must satisfy every constraint whose `sourceTag` it carries. A new library is not registered until it has both tags; a project matching no constraint fails lint rather than being waved through.
- **`scope:*` is the vertical.** `scope:<domain>` (one per `libs/<domain>` directory) and `scope:shared`. A domain library or app depends only on its own domain plus `scope:shared`. A `scope:shared` library depends only on `scope:shared` — a shared lib that imports a domain lib inverts the graph, and that inversion is the failure this rule exists to catch.
- **`type:*` is the rung, and dependencies run downward only:** `models` / `themes` ← `utils` / `mocks` / `storybook` ← `store` ← `design-library` ← `ui` ← `app`. `models` and `themes` are leaves (`onlyDependOnLibsWithTags: []`, which is a total ban, not a wildcard). `store` may not depend on `design-library` or `ui` — state never learns what renders it. `storybook` is a leaf so the story harness cannot become a back channel between component libraries. `design-library` may depend on peer `design-library` libs (the table renders charts) but never on `store` or `ui`.
- **Read the live rule from the root ESLint config, not from a doc** — the `depConstraints` block is the source of truth, and it carries a comment per constraint stating why. Severity, any additional axis (such as a `deprecated` marker), and the ledger of pre-existing edges being paid down are workspace-specific and live in `docs/reference/architecture.md`.

## Tooling

- Package manager: npm
- Nx Version: 23.1.0
- ALWAYS use `npx nx run [project]:[target]` format — NEVER `nx [target] [project]`
- NEVER install nx-console VSCode extension
- Package updates: ALWAYS use `npx nx migrate [package]@[version]`

## Build Verification

- Do NOT run builds unless explicitly asked
- **evolving-cognition and real-estate are frozen legacy domains** — `.nxignore`d, so they are not in the project graph and cannot be built, linted or tested; there is nothing to verify there and nothing to fix. Their source remains on disk only until the cognition and concierge rebuilds deploy; the removal checklist is `docs/reference/architecture.md` § Frozen legacy domains.

## Cloud Function Deploys

- Deploy ONLY the function(s) you changed — never a full all-functions deploy by default. This is a global rule across every function-bearing domain (concierge, cognition, got-you, real-estate). Each function is its own Cloud Run container (separate cold-start, IAM binding, build/deploy artifact, per-function cost); a full deploy churns every unrelated one and is slower.
- A FULL deploy (`firebase deploy --only functions`, no function name) is reserved for exactly three cases: first-time setup, a cross-cutting change to shared `index.ts` / shared code, or DROPPING a function whose trigger was removed or renamed in source (a selective `--only functions:<name>` deploy never deletes a removed trigger).
- Per-domain commands (run from each domain's backend dir): concierge, cognition, and got-you share an IDENTICAL wrapper — `npm run d.fn -- <env> <name>` to deploy one (e.g. `npm run d.fn -- prod myFunction`; omit the name for a full deploy), `npm run delete.fn -- <env> <name>` to remove one. Real-estate's functions live in an external repo, deployed via the `/deploy-re-functions <name>` command. Full detail in each `apps/<domain>/backend/AGENTS.md`.
- **The cognition domain's deploy source is `apps/cognition/backend`, NOT `apps/evolving-cognition/backend`.** Both directories target the Firebase project `evolving-cognition-app` and share 17 functions (cognition's backend adds an 18th, COG-119's `sweepDeadlineNotifications`, which EC's copy cannot even resolve), so two deploy sources for one set of live functions would mean whichever deploys last silently wins. `apps/evolving-cognition/backend` is therefore **reference-only**: it has no deploy or live-mutation `npm run` script left (functions, rules, Remote Config, `firestore:delete`, subject seeding — all removed), and re-adding one is a review-blocking regression, not a fix. ⚠️ The standard is **npm entry points removed, source files retained** — COG-107 deleted no file but `tools/deploy-function.sh`, so several tools there (`tools/service-accounts/ec-*-version.*.js`, `tools/data/{dev,prd}-subjects.js`, `tools/data/set-cognition-flags.js`) can still write to a live project when run directly with `node`. They stay: EC's own frontend hosting deploys use the version stampers, and all six are byte-identical to their `apps/cognition/backend` counterparts, which is where to run them. Do not read "reference-only" as "nothing here is live", and do not delete them as tidy-up. The root `npm run d.functions.ec.prod` resolves to cognition's backend. (The `ec` in `d.functions.ec.*` / `use.ec.*` / `rules.ec.*` names that Firebase project, not the `evolving-cognition` directory.) See `apps/evolving-cognition/backend/AGENTS.md`.

## Security

- Never commit secrets
- Assist with defensive security tasks only

## PR Review Checklist

Review-time view of the invariants above — verify each on new/changed code (folded in from the former `REVIEW-CHECKLIST.json`; see each linked section for detail):

- [ ] **Separate files** — `.ts` / `.html` / `.scss` / `.spec.ts`; no inline `template` / `styles` (§ Component File Structure)
- [ ] **Control flow** — `@if` / `@for` / `@switch`, never `*ngIf` / `*ngFor` / `*ngSwitch` (§ Angular Conventions)
- [ ] **DI** — `inject()`, never constructor injection (§ Angular Conventions)
- [ ] **Signals** — `input()` / `output()`, never `@Input()` / `@Output()` (§ Angular Conventions)
- [ ] **Component state** — internal reactive state in a colocated component-scoped `@ngrx/signals` SignalStore, never `providedIn: 'root'` (§ Component-Scoped State)
- [ ] **Design-library components** — `ViewEncapsulation.None`, `host: { class: '…' }`, SCSS wrapped in the component class (never `:host`), CSS-variable tokens for overridables (§ UI Design Library)
- [ ] **App components** — SCSS wrapped in `:host {}` except `@media` (outside, with `:host` nested inside) (§ Application Components)
- [ ] **Styling** — Tailwind preferred; SCSS only for complex component-specific styles (§ Styling)
- [ ] **No Angular Material in new code** — no `@angular/material`, `<mat-*>`, or `--mat-sys-*`; use own-namespace `--<prefix>-*` tokens with literal fallbacks (the legacy importers listed in § Angular Material are exempt) (§ Angular Material — Legacy Only)
- [ ] **Shared library namespacing** — zero bare CSS custom properties; every emitted class / selector prefixed; TS identity surface prefixed (§ Shared Library Namespacing)
- [ ] **Module boundaries** — a new project carries one `scope:*` and one `type:*` tag; no `@nx/enforce-module-boundaries` finding is introduced, and none is silenced with an eslint-disable (§ Module Boundaries)
- [ ] **Testing** — Jest, never Jasmine; `*.spec.ts` colocated next to source (§ Testing)
- [ ] **Tooling** — `npx nx run [project]:[target]` format, never `nx [target] [project]` (§ Tooling)
- [ ] **Security** — no secrets, credentials, or `.env` files committed (§ Security)
