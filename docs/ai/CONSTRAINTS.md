# Constraints — Authoritative Invariants

> **If any guidance in the repository conflicts with this file, this file prevails.**

## Component File Structure (ALL components)

- MUST use separate files: `.ts`, `.html`, `.scss`, `.spec.ts`
- NEVER inline `template` or `styles` in `@Component`
- MUST use `templateUrl` and `styleUrl`

## Zoneless Change Detection

- Angular 21 uses signal-based zoneless change detection — Zone.js is deprecated
- App config MUST use `provideZonelessChangeDetection()` — NEVER `provideZoneChangeDetection()` or Zone.js polyfills
- Test setup MUST use `setupZonelessTestEnv` from `jest-preset-angular/setup-env/zoneless` — NEVER `setupZoneTestEnv`
- **Known issue:** `libs/media-workbench/*`, `libs/real-estate/*`, and `libs/evolving-cognition/*` library `test-setup.ts` files still use the deprecated `setupZoneTestEnv` and need migration

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
- App page components are wrappers — use `<dlc-header-bar>` and `<dlc-mobile-page-content>` for layout
- Full guide: `docs/ai-instructions/reference/angular-app-component.instructions.md`

## Styling

- Tailwind CSS preferred over SCSS
- SCSS for complex component-specific styles only

## Angular Material — Legacy Only (NOT for New Development)

- **New apps and all new components do NOT use Angular Material.** Never add `@angular/material` imports, `mat-*` components, or `--mat-sys-*` design tokens to new code.
- Angular Material remains **only** in the established **evolving-cognition** and **real-estate** apps. That code is legacy and stays as-is — this is a forward-looking policy for new development, **NOT** a directive to remove Material from existing apps (do not tear down working code).
- **New component architecture** (proven to work without Material — reference: `libs/shared/calendar`): `ViewEncapsulation.None` + `host: { class: '<prefix>-name' }`, Tailwind utility classes, and a self-sufficient **own-namespace CSS-variable token set** — `--<prefix>-*` with **literal fallbacks** (e.g. `var(--giga-calendar-surface, #ffffff)`), centralized as a token map/helper. Consumers theme via `--<prefix>-*` overrides — never `--mat-sys-*`.
- Docs/examples written against `--mat-sys-*` or `mat-*` describe how the **legacy** apps work; do not follow them when building anything new.

## NgRx Facades & Selectors

- **Signals are reserved for component / DOM updates; data flow uses RxJS.** RxJS Observables are more performant for streams, merges, and dynamic composition.
- **Facade reads consumed directly by components** — expose via `store.selectSignal(selector)` so consumers don't need a `toSignal()` wrapper.
- **Facade reads participating in data flow** (piped, merged, composed) — expose via `store.select(selector)` as an Observable.
- **Keep the `$` suffix on facade read properties** whether they return a Signal or an Observable — the suffix marks "data stream" and keeps the public API stable when the underlying changes.
- **Business logic (filtering, merging, conditional aggregation, derived values) lives in selectors, not facades.** Facades are API, not logic.
- **Cross-slice aggregations go in a dedicated aggregate selectors file** (e.g. `libs/<domain>/store/src/lib/aggregate.selectors.ts`) rather than importing sibling slices from one slice's selector file. Prevents circular dependencies as the graph grows.
- Full guide: `docs/reference/ngrx/facades-and-selectors.md`

## Component-Scoped State (All Components & Multi-Component Systems)

- ALL of a component's **internal reactive state** — writable `signal()`s, stateful `computed()`/`linkedSignal()`s, `effect()`s, `toSignal` bridges, RxJS subscriptions, and the orchestration methods around them — MUST live in ONE **component-scoped `@ngrx/signals` SignalStore provided at that component** (`providers: [Store]`; for a multi-component system, its root component) — NEVER `providedIn: 'root'` (one instance per component instance; correct lifecycle + isolation).
- **No size or line-count threshold** (rule strengthened 2026-06-12, GY-72 — the previous "substantial state" trigger is removed): a component with a single internal signal still extracts. The component class keeps ONLY `input()`/`output()` (the public boundary), the injected store, and template-only glue (pure presentational derivations, host bindings).
- **Colocate** the store next to the component / system root it serves (its own folder in the same directory) — NEVER a shared / central store directory; it ships and is tested with its component.
- Child components MUST `inject()` the store. NEVER thread the shared state as `input()` nor bubble interactions as `output()` between internal components.
- `input()` / `output()` live ONLY at the root component's public boundary (config in, domain events out). NEVER prop-drill inputs or bubble outputs through ≥ 2 component levels — that is the anti-pattern this rule replaces.
- The store holds reactive UI state; derived view-models are `withComputed`; algorithms stay in **pure functions** the store calls. State, not logic.
- Exemptions are by KIND, never size: design-library presentational primitives keep their **intrinsic widget mechanics** (CVA internals — a reveal toggle, an open flag, hover/focus state) as component signals; zero-state components need no store; passing config to presentational leaves via `input()`/`output()` at their public boundary is boundary wiring, not internal state.
- **This SUPPLEMENTS the global classic `@ngrx/store`; it does NOT replace it.** Different jobs: the global domain store (`@gigasoftware/<domain>-store`, consumed via facades/selectors — see "NgRx Facades & Selectors" above) is the system of record for app-/domain-wide persistent data, `@ngrx/entity`, and Firestore websocket subscriptions; the component-scoped SignalStore holds the *ephemeral, local UI/interaction state* of one component system. A system typically does BOTH — consume global state via its facade AND run its own SignalStore. Never migrate a global slice into a component store, nor promote a component's local UI state into the global store.
- Reference impls: `libs/real-estate/ui/src/lib/cma/store/` (CMA — multi-component system) and `libs/got-you/ui/src/lib/onboarding-shell/steps/create-group/gy-create-group-step.store.ts` + `onboarding-shell/data/with-onboarding-step-form.ts` (single-component form step composing a reusable `signalStoreFeature` — GY-72). Full guide: `docs/ai-instructions/reference/multi-component-signal-store.instructions.md`. Scaffold via the `ngrx-component-state` skill.

## Testing

- Framework: Jest — NEVER Jasmine
- Colocate test files as `*.spec.ts` next to source
- Mock externals (Firebase, network) at library boundaries

## Domain Library Creation

- ALWAYS use the Nx CLI (`npx nx generate`) to create domain libraries — NEVER create library files and configuration manually
- Full guide: `docs/reference/domain-library-set.md`

## Tooling

- Package manager: npm
- Nx Version: 22.4.3
- ALWAYS use `npx nx run [project]:[target]` format — NEVER `nx [target] [project]`
- NEVER install nx-console VSCode extension
- Package updates: ALWAYS use `npx nx migrate [package]@[version]`

## Build Verification

- Do NOT run builds unless explicitly asked
- Real Estate App: `npm run b.prod.app.re.com`
- Evolving Cognition App: `npm run b.app.ec.com`

## Cloud Function Deploys

- Deploy ONLY the function(s) you changed — never a full all-functions deploy by default. This is a global rule across every function-bearing domain (concierge, evolving-cognition, got-you, real-estate). Each function is its own Cloud Run container (separate cold-start, IAM binding, build/deploy artifact, per-function cost); a full deploy churns every unrelated one and is slower.
- A FULL deploy (`firebase deploy --only functions`, no function name) is reserved for exactly three cases: first-time setup, a cross-cutting change to shared `index.ts` / shared code, or DROPPING a function whose trigger was removed or renamed in source (a selective `--only functions:<name>` deploy never deletes a removed trigger).
- Per-domain commands (run from each domain's backend dir): concierge, evolving-cognition, and got-you share an IDENTICAL wrapper — `npm run d.fn -- <env> <name>` to deploy one (e.g. `npm run d.fn -- prod myFunction`; omit the name for a full deploy), `npm run delete.fn -- <env> <name>` to remove one. Real-estate's functions live in an external repo, deployed via the `/deploy-re-functions <name>` command. Full detail in each `apps/<domain>/backend/AGENTS.md`.

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
- [ ] **No Angular Material in new code** — no `@angular/material`, `<mat-*>`, or `--mat-sys-*`; use own-namespace `--<prefix>-*` tokens with literal fallbacks (evolving-cognition / real-estate legacy exempt) (§ Angular Material — Legacy Only)
- [ ] **Testing** — Jest, never Jasmine; `*.spec.ts` colocated next to source (§ Testing)
- [ ] **Tooling** — `npx nx run [project]:[target]` format, never `nx [target] [project]` (§ Tooling)
- [ ] **Security** — no secrets, credentials, or `.env` files committed (§ Security)
