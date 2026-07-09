---
applyTo: '**/*.component.ts,**/*.store.ts'
---

# Component & Multi-Component State — Component-Scoped SignalStore Instructions

> **Write-time shape** (state / with-* / composition-root layout) is distilled in [`../standards/signal-store.md`](../standards/signal-store.md) and auto-injected on write; the binding invariant is in `docs/ai/CONSTRAINTS.md` § Component-Scoped State. This file adds the rationale, the global-vs-component comparison, and reference implementations.

This instruction defines the standard for component state: **internal reactive state does not live in component classes — it lives in a colocated component-scoped SignalStore.** There is **no size or line-count threshold** (rule strengthened 2026-06-12, GY-72: the previous "substantial state" trigger is removed — a component with a single internal signal still extracts). Two shapes, same mechanics:

- **A single component** — any component holding internal reactive state: a form step, an editor, a page, a container orchestrating services. Extract the state + orchestration into a colocated SignalStore; the store is independently testable and the class stays a thin template binder.
- **A multi-component system** — a root component orchestrating a tree of child / grandchild components that share state and interaction (a calendar with views + cells + event chips + drag layer; a data-table with header + rows + toolbar).

The only difference is whether the store has one consumer (the component itself) or several (the root + its children).

## The rule

Extract that state into **one component-scoped `@ngrx/signals` SignalStore provided at the component** (for a system, its root component):

- Provide the store on the component: `providers: [FeatureStore]` — **NEVER `providedIn: 'root'`**. One instance per component instance (correct lifecycle, isolation; multiple instances on a page never collide).
- **Colocate the store** next to the component (or system root) it serves — its own folder in the same directory, never a shared / central store directory. It ships and is tested with the component.
- The store holds **reactive state**, not algorithms. Derivable view-models are `withComputed`; pure / derivable logic stays in **pure functions** the store calls.
- For a **system**, child components `inject(FeatureStore)` and read its signals / call its methods — they do **not** receive the shared state as `input()` nor bubble interactions back as `output()`.
- `input()` / `output()` live **only at the component's public boundary** — config in, domain events out. The component translates inputs into store state and store effects into outputs; inputs / outputs are NOT threaded between internal components (no prop-drilling, no output-bubbling).

### When this applies — always (no size threshold)

**Internal reactive state** means: writable `signal()`s, stateful `computed()`/`linkedSignal()`s, `effect()`s, `toSignal` bridges, RxJS subscriptions, and the methods that orchestrate them. If a component class holds ANY of these beyond its public boundary, they move to the colocated store — regardless of how small the component is. Do not size-gate ("it's only 50 lines", "it's just two signals"): the next story grows it, and the store is where that growth lands testably.

**What stays in the component class:**

- `input()` / `output()` — the public boundary (config in, domain events out).
- The injected store (`protected readonly store = inject(FeatureStore)`).
- Template-only glue: pure presentational derivations reading the store or inputs (e.g. an error-copy method), host bindings, and event wiring the store can't own.

**Exemptions — by kind, never by size:**

- **Design-library presentational primitives**: intrinsic widget mechanics — a CVA input's reveal toggle, a select's open flag, hover/focus state — are the widget's own machinery and may stay as component signals. Feature state never belongs in a design-library primitive anyway.
- **Zero-state components**: nothing to extract — no store.
- Passing config to a couple of presentational leaves via `input()`/`output()` at their public boundaries is boundary wiring, not internal state. (For *systems* — ≥ 3 components sharing state, drilling ≥ 2 levels, or siblings that must stay in sync — use ONE root-provided store per the rule above.)

## This supplements the global store — it doesn't replace it

Two stores, two jobs — they coexist. This rule is about **local UI state**, not the domain's data layer.

| | Global classic `@ngrx/store` (domain store) | Component-scoped `@ngrx/signals` SignalStore |
|---|---|---|
| **Scope** | App-/domain-wide, shared across unrelated features | One component system (a root + its children) |
| **Lifetime** | App session — the system of record | Born and dies with the root component |
| **Holds** | Persistent data slices, `@ngrx/entity`, Firestore websocket subscriptions, router-store, devtools time-travel | Ephemeral UI/interaction state — selection, hover, drag, focus, current view, popovers |
| **Wiring** | `providedIn: 'root'` / app providers; consumed via **facades + selectors** | `providers: [Store]` on the system's root component; consumed via `inject()` |
| **Lives in** | `libs/<domain>/store` | colocated next to the component system it serves |
| **Skill** | `ngrx-global-store` | `ngrx-component-state` |

A component system typically uses **both**: it consumes app/domain state from the global store (via its facade) AND runs its own component-scoped SignalStore for local orchestration. Do NOT migrate global slices into a component SignalStore, and do NOT promote a component's local UI state into the global store.

### The component store as the system's local data-flow mediator

Because the component store can `inject()` the global store's facade, it doubles as the system's **mediator / feature-local facade** — child components inject ONLY the component store and never touch the global facade or `dispatch` directly:

- **Read (project) — global → local:** in `withProps`, `inject()` the domain facade; surface its reads through the store's `withComputed` signals. Per the workspace rule (*data flow uses RxJS; signals are for the view*), bridge the facade's Observable reads via `rxMethod` / `toSignal` → `patchState` (or `selectSignal` for direct signal reads) so global data lands as signals the template consumes.
- **Write (delegate) — local → global:** `withMethods` route child intents to facade mutation methods (which dispatch / run the Firestore-write flow). A leaf calls `store.save()`; the store calls `_facade.updateX(...)`.
- **Local-only state** (selection, hover, drag, draft / working copies) stays in the store and never reaches global.

Guardrail: the **global store stays the source of truth** for domain data. The component store *projects* it (and may hold an editable draft seeded from it), but never forks it into an independently-mutated copy that drifts. The reference CMA store works exactly this way — it `inject(Store)` + the Firestore service in `withProps`, and its `with-cma-storage` feature loads/saves through them while keeping selection / filters / pricing as local state.

## Reference implementation

The canonical example for a **multi-component system** is the **Real-Estate CMA store**:

- Store: `libs/real-estate/ui/src/lib/cma/store/cma.store.ts` — `signalStore(withState(...), withProps(() => ({ _service: inject(...) })), withFeature((s) => withCma*(s)), withHooks(...))`.
- Provided on the root: `libs/real-estate/ui/src/lib/task/task-editor-types/editors/cma-comparison/cma-comparison-task-editor.component.ts` → `providers: [CmaStore]`.
- Consumed by a descendant with no provider of its own: `libs/real-estate/ui/src/lib/cma/stats-bar/dlc-cma-stats-bar.component.ts` → `inject(CmaStore)`.
- Concerns split into `store/features/with-*.ts` (one cohesive concern each).

The canonical example for a **single component** (and for reusable cross-step mechanics via a parameterized `signalStoreFeature`) is the **Got You create-group step** (GY-72):

- Store: `libs/got-you/ui/src/lib/onboarding-shell/steps/create-group/gy-create-group-step.store.ts` — colocated, `providers: [GyCreateGroupStepStore]` on the component, composing the reusable `withOnboardingStepForm` feature (`libs/got-you/ui/src/lib/onboarding-shell/data/with-onboarding-step-form.ts`) + its own `submit()` machine.
- Component: `gy-create-group-step.component.ts` — a thin template binder (`store.form`, options, error copy); the store owns the form, effects, subscriptions, and orchestration.

## Anti-patterns

Threading shared state through intermediate components as `input()` and bubbling interactions back as `output()` across ≥ 2 levels (prop-drilling). If you find yourself re-emitting the same `output()` up a chain, or passing an `input()` straight through a component that doesn't use it, stop and introduce the component-scoped store.

**Size-gating is also an anti-pattern.** "This component is small, the signals can stay" accretes orchestration into component classes one story at a time — exactly what this rule exists to prevent. If you are writing a `signal()` / `effect()` / subscription inside a component class (outside the kind-based exemptions above), the colocated store is its home from the first signal.

## See also

- `docs/ai/CONSTRAINTS.md` → "Component-Scoped State (Complex Components & Multi-Component Systems)" (the binding invariant)
- The `ngrx-component-state` skill — scaffolds the store + `with-*` features
- `docs/reference/ngrx/facades-and-selectors.md` — the *global* classic-store path (a different tool: app-global state, websocket subscriptions, devtools time-travel)
