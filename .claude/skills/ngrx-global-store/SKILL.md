---
name: ngrx-global-store
description: Create or refactor a classic global `@ngrx/store` slice (actions + reducer + effects + selectors + facade) following the Gigasoftware workspace conventions. Hybrid skill — authoritative API guidance comes from a local NgRx clone (kept current via `git pull`); layout and Firestore-integration conventions come from the in-workspace concierge + real-estate store slices. Use when the user wants to add a classic global store slice, wire effects, introduce `@ngrx/entity`, integrate `@ngrx/router-store`, connect a Firestore websocket subscription to state, or refactor an existing slice. Do NOT use for component-scoped signalStore work — the `ngrx-component-state` skill handles those.
---

# NgRx Global Store

Hybrid skill: authoritative `@ngrx/store` + `@ngrx/effects` + `@ngrx/entity` + `@ngrx/router-store` API docs live in a local NgRx clone (kept current via `git pull`). Workspace layout, Firestore-subscription wiring, and write-state invariants come from the existing concierge + real-estate slices.

---

## Phase 0 — Resolve and refresh the local NgRx docs

### 0a — Resolve the path

1. Check `$NGRX_DOCS` env var. If set, use it.
2. Fallback: `/Users/gigasoftware_developer/Dev/research/platform`.
3. Verify: `$NGRX_DOCS/projects/www/src/app/pages/guide/store/` must exist (with `effects/`, `entity/`, `router-store/`, `store-devtools/` siblings).

If the path doesn't resolve, ask the user to set `$NGRX_DOCS` or point out their clone's location and stop until they confirm.

Substitute `$NGRX_DOCS` throughout with the resolved path.

### 0b — Refresh the clone (best-effort, non-blocking)

Run the following with a 10-second timeout on the fetch; never block the skill on a slow network:

```
cd $NGRX_DOCS
timeout 10 git fetch --quiet 2>/dev/null || echo "fetch-failed"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")
DIRTY=$(git status --porcelain)
```

Then branch on the result:

- **`LOCAL == REMOTE`**, or `REMOTE` empty, or `fetch-failed` → skip the pull, proceed silently.
- **`REMOTE` ahead and `DIRTY` empty** → `git pull --ff-only` and report "Refreshed NgRx docs clone to `<REMOTE short sha>`."
- **`REMOTE` ahead and `DIRTY` non-empty** → skip. Warn: "NgRx docs clone at `$NGRX_DOCS` has uncommitted changes; proceeding with current checkout. Pull manually if you want newer docs."
- **Fast-forward fails (diverged history)** → skip. Warn: "NgRx docs clone has diverged from upstream; proceeding with current checkout."

Continue to Phase 1 regardless.

---

## Phase 1 — Clarify scope

Ask one at a time when answers shape later questions:

1. **Slice name** (e.g. `transactions`, `budgets`) and target library (`libs/ledger/store/src/lib/`, or a new `libs/<domain>/store/`). Slice directories are **not** `+`-prefixed in this workspace, and a single-slice store stays flat.
2. **Data shape** — single doc? Collection? Collection-under-parent? Write-only (no subscription)?
3. **Firestore path(s)** — where does the data live? Workspace invariant: reads are always `onSnapshot` subscriptions, never `.get()`.
4. **Writes** — create / update / delete patterns? Optimistic? Debounced?
5. **Consumers** — who reads this state? App-wide (`providedIn: 'root'` facade)? A specific feature module?
6. **Side-effects** — navigation, toasts, analytics, inter-slice dispatches on write success?
7. **Entity semantics** — is this a keyed collection where `@ngrx/entity` adapters fit?
8. **Router coupling** — does URL state drive reads (route params → dispatch)?
9. **Existing code to refactor** — path to the slice being migrated.

If the feature is purely component-local transient state (wizard fields, toggles, one-component OTP channel) — **stop and recommend the `ngrx-component-state` skill instead**. Classic store is overkill for those.

---

## Phase 2 — Load relevant docs

Read only the guide sections that map to what you're building. Paths under `$NGRX_DOCS/projects/www/src/app/pages/guide/`:

### `store/` — core primitives

| Concern                                      | File                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| Actions, `createActionGroup`                 | `store/actions.md`                                                               |
| Reducers, `createReducer`, `on`              | `store/reducers.md`                                                              |
| Selectors, `createSelector`, `createFeature` | `store/selectors.md`                                                             |
| Feature state, `provideState`                | `store/feature-creators.md` or `store/providing-store.md`                        |
| Meta-reducers                                | `store/metareducers.md`                                                          |
| Typed-actions conventions                    | `store/walkthrough.md` (start here if building the first slice in a new project) |

### `effects/` — action-driven side effects

| Concern                                                      | File                                                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `createEffect`, `ofType`, subscribing to actions             | `effects/index.md`                                                                       |
| Lifecycle (`ROOT_EFFECTS_INIT`), dispatch control, filtering | siblings of above                                                                        |
| Testing effects with `provideMockActions` + marbles          | `effects/testing.md`                                                                     |
| Integrating cloud function / HTTP side-effects               | use the effect patterns, then wrap with workspace's `firestoreWriteEffect` (see Phase 3) |

### `entity/` — collection adapters

Read when the slice holds a keyed collection with CRUD. Skip if the slice is a single doc or a free-form object.

### `router-store/` — URL ↔ state

Read only when route params or navigation events drive reads. Otherwise skip.

### `store-devtools/` — time-travel

Read when setting up a new app's root store or when debugging a specific slice. For adding a new slice to an existing app, the root is already wired — nothing to do here.

### Don't read these for new code

- `component-store/` — predecessor to signalStore. Only read if migrating an existing component-store away.
- `data/` — `@ngrx/data` is legacy. Don't introduce into new code.
- `operators/` — niche; read only if the user specifically asks about `ofType` quirks or `concatLatestFrom`.
- `eslint-plugin/` — rules config, not coding guidance.
- `migration/` — version upgrade guides. Read only during an actual version bump.

### API reference (structured metadata)

`$NGRX_DOCS/projects/www/src/app/reference/store/`, `effects/`, `entity/`, etc. — JSON files with the exact signatures of each function. Handy when the guide glosses over a parameter.

### Typical read sets

- **New single-doc Firestore-backed slice**: `store/actions.md` + `store/reducers.md` + `store/selectors.md` + `effects/index.md`.
- **New collection slice**: add `entity/` guide.
- **Slice with navigation side-effects**: add selected parts of `effects/index.md` for navigation-after-success patterns.
- **Slice with URL coupling**: add `router-store/` guide.
- **Adding effects to an existing slice**: just `effects/index.md` + `effects/testing.md`.

---

## Phase 3 — Read the workspace template

The monorepo has strong conventions. Pick the closest in-repo analogue before scaffolding.

### Canonical classic-slice layout — `libs/ledger/store/src/lib/`

This repo has ONE global slice and it is **flat**, not folder-per-feature. There is no `+<feature>/`
directory convention here — that is a gigasoftware workspace convention that deliberately did not
come across:

```
libs/ledger/store/src/lib/
  ledger-seed.model.ts        ← types
  ledger.actions.ts           ← createActionGroup — one load lifecycle
  ledger.feature.ts           ← createFeature + createEntityAdapter (5 EntityState collections)
  ledger.effects.ts           ← resolves the @nge/ledger-mocks seed behind an artificial delay
  ledger.facade.ts            ← the ergonomic inject-in-component layer
  provide-ledger-store.ts     ← makeEnvironmentProviders(provideState + provideEffects)
  index.ts                    ← barrel
  + specs for feature, effects and facade
```

When a SECOND slice arrives, split into `libs/<domain>/store/src/lib/<feature>/` and keep the same
file names inside it. Do not introduce the `+` prefix.

Always read before scaffolding:

1. `libs/ledger/store/src/lib/ledger.feature.ts` — `createFeature` + `createEntityAdapter` shape and where derived selectors go.
2. `libs/ledger/store/src/lib/ledger.effects.ts` — effect shape, plus the `InjectionToken` latency override that lets specs resolve on the next macrotask instead of waiting out a real delay. **This repo is zoneless — no `fakeAsync` / `tick`.**
3. `libs/ledger/store/src/lib/ledger.facade.ts` — the layer components actually inject.
4. `libs/ledger/store/src/lib/provide-ledger-store.ts` — registration via `makeEnvironmentProviders`, called once at the app root.

⚠️ **The Firestore half of this skill does not apply in this repo.** ngx has no Firebase: no
`onSnapshot` subscriptions, no `WebsocketConnectableService` / `WebsocketServiceConnector` contract, no
`firestoreWriteEffect` / `WriteStateSlice` write helpers, and no root `state.<app>.ts` composition file.
Ledger's "backend" is a static seed resolved behind an artificial delay, which exercises the same
loading / loaded / error state machine a real call would. Read the Firestore-specific sections that
follow as **background on the pattern this skill was written for**, not as instructions for here.

### Non-negotiable workspace invariants

From REX-274 / REX-296 onward:

- **Reads are always `onSnapshot` subscriptions — never `.get()`.** The watch service implements `WebsocketConnectableService` and registers with the websocket registry; `onConnect(user)` opens the listener, `onDisconnect()` tears it down.
- **Writes go through dedicated `create/update/delete` actions** → effect → service method → `firestoreService.upsertDoc$` / `updateDoc$` / `deleteDoc$`. No optimistic updates in the reducer. Snapshot echo is the source of truth.
- **Every write-enabled slice carries `error: null | string` + `inFlight: Record<string, boolean>`** (the `WriteStateSlice` shape) so write failures surface to the UI with per-writeId correlation.
- **Cross-slice dispatches go in effects**, not reducers. e.g., clear-on-finalize: effect listens to `createBrokerageWithMembershipSuccess` and dispatches `OnboardingDraftActions.clearDraft`.

### Three-entity invariant (for Firestore data shape)

When modelling business data in the concierge app:

- `/users/{uid}` — identity.
- `/brokerages/{bId}` — business subtree (self-contained).
- `/brokerages/{bId}/members/{uid}` — join.

Three slices, three watch services. No merging them into one denormalized slice. Reference: `docs-projects/projects/rex/concierge-data-architecture.md`.

---

## Phase 4 — Scaffold

Write files in dependency order so each can reference the previous:

1. `<feature>-seed.model.ts` (or `<feature>.model.ts`) — the data shape, plus the state interface carrying `status: 'idle' | 'loading' | 'loaded' | 'error'` and `error: string | null` the way `LedgerState` does. (`extends WriteStateSlice` is the source repo's shape — that helper does not exist here; see the § above.)
2. `<feature>.actions.ts` — `createActionGroup({ source: 'Feature', events: { ... } })`. Ledger's one lifecycle is `Load` / `Load Success` / `Load Failure`; a slice with writes adds a dedicated `create*` / `update*` / `delete*` + Success + Failure triple per write. (`loadedFromSnapshotChanges` / `snapshotMissing` belong to the Firestore-subscription shape — nothing here has a snapshot to echo.)
3. `<feature>.feature.ts` — `createFeature({ name: 'kebab-case', reducer: createReducer(initialState, on(...)) })` with one `createEntityAdapter` per collection; the handlers move `status` / `error` by hand — `load` → `'loading'`, success → `setAll` + `'loaded'`, failure → `'error'` + the message. (`createWriteStateInitial()` and `onWriteStarted/Succeeded/Failed` are source-repo helpers that do not exist here.)
4. Selectors — the same file's `extraSelectors`: each adapter's `getSelectors()`, plus derived selectors composed with `createSelector` over pure `@nge/<domain>-utils` functions (`ledger.feature.ts` derives cashflow, net worth, spending by category and budget-vs-actual this way). (`selectWriteError` / `selectAnyWriteInFlight` / `selectIsWriteInFlight(writeId)` read the `WriteStateSlice` fields of step 1 and go with it.)
5. `<feature>-write.service.ts` (if writes) — **source-repo-only** (there it injects the Firestore service and wraps `upsertDoc$`). This repo has no write path: Ledger is read-only over a static seed, so there is no write service to copy. If a slice needs one, make it a plain `@Injectable({ providedIn: 'root' })` service whose methods return `Observable<void>` from an in-memory source (`of(...)`, optionally behind a latency `InjectionToken` like `LEDGER_LOAD_LATENCY_MS`), called from an effect exactly as in step 7. The reducer stays free of optimistic updates — the success action carries what changed.
6. `<feature>-firestore-watch.service.ts` — **source-repo-only** (`WebsocketConnectableService` / `onSnapshot`). Its counterpart here is the load effect: `ledger.effects.ts` resolves the `@nge/ledger-mocks` seed behind `LEDGER_LOAD_LATENCY_MS` and dispatches `loadSuccess` / `loadFailure`. There is no watch service to write.
7. `<feature>.effects.ts` — an `@Injectable()` class of `createEffect(() => this.actions$.pipe(ofType(trigger), switchMap(() => work$.pipe(map(success), catchError(error => of(failure({ error: String(error) })))))))`. (`firestoreWriteEffect({ trigger, work, onSuccess, onFailure })` is the source repo's wrapper around this same shape; here the `switchMap` + `catchError` is written out, as in `ledger.effects.ts`.) Cross-slice effects go here, not in a reducer.
8. `<feature>.facade.ts` (optional) — `@Injectable({ providedIn: 'root' })` wrapping the store with ergonomic methods + signals (`toSignal(store.select(...))`). Components inject the facade, not the store directly.
9. `index.ts` — barrel re-exports.
10. **Register** via a `provide-<feature>-store.ts` returning `makeEnvironmentProviders([provideState(<feature>Feature), provideEffects(<Feature>Effects)])`, called once at the app root (`app.config.ts`). There is no central reducers map to edit — see `provide-ledger-store.ts`.
11. **Barrel export** from `libs/<domain>/store/src/index.ts` so consumers can `import { ... } from '@nge/<domain>-store'` (e.g. `@nge/ledger-store`).
12. **Specs** for the feature (reducer + selectors), effects and facade — the shapes in `ledger.feature.spec.ts`, `ledger.effects.spec.ts` and `ledger.facade.spec.ts` — plus one for any write service. Effects specs provide the latency token as `0`; this repo is zoneless, so no `fakeAsync` / `tick`.

There is no sign-out chain in this repo (no auth), so nothing needs a cross-slice reset dispatch. If one is ever added, put the clearing effect in the owning slice's `.effects.ts`, never in a reducer.

---

## Phase 5 — Verify

1. `npx nx run <project>:lint` — clean on touched files.
2. `npx nx run <project>:test` — all new specs pass.
3. Type-check at consumers: `inject(FeatureFacade)`, `store.select(selectX)` resolve cleanly.
4. Confirm `provide<Feature>Store()` is actually called in the app root's `providers` (`apps/<app>/src/app/app.config.ts`). An unregistered slice never hydrates, and the failure is silent.
5. Confirm the feature is registered under the right key — `provideState(<feature>Feature)` derives it from `createFeature({ name })`, and selectors return `undefined` rather than throwing if it is missing.

If refactoring, delete now-dead code after the new slice takes over.

---

## Common patterns — quick reference

### Single doc at `/users/{uid}/<subpath>`

Pattern: `+account` or `+onboarding-draft`. Watch service subscribes via `onSnapshot(cgUsersDoc(uid) + '/' + subpath)`; reducer handles `loadedFromSnapshotChanges` and `snapshotMissing`; write service wraps `upsertDoc$` with `serverTimestamp()` stamps.

### Collection under a parent entity

Pattern: `+chat` using `QueryEngineCache` (real-estate store). The cache subscribes to a parent slice's entities, dynamically adds/removes a child subscription per parent, dispatches `updateMany` / `upsertMany` / `deleteMany` on each change. No `.get()` calls anywhere.

### Write-only slice (no subscription, atomic multi-doc writes)

Pattern: `+onboarding-write`. No watch service. Actions dispatch → effect calls a write service that uses `firestoreService.writeBatch()` to atomically write multiple docs. Success action carries the generated id(s) so subsequent effects can chain.

### Cross-slice dispatch (clear-on-event pattern)

Pattern: effect in the consuming slice (`+onboarding-draft.effects.ts`) listens to the producing slice's success action (`createBrokerageWithMembershipSuccess`) and dispatches its own action (`clearDraft`). Keeps coupling at the effects layer; reducers stay pure and local.

### Data hydration race (component mounts before snapshot lands)

Don't solve it in the component with imperative hydrate effects. If the slice's data needs to drive form fields, either (a) use a component-scoped signalStore that reads the slice reactively (see `ngrx-component-state` skill + REX-298), or (b) use `@if` gating on an `isHydrated` selector so the form doesn't render until the snapshot arrives.

---

## What this skill deliberately does NOT do

- **Scaffold without reading docs first.** Always read the relevant guide page(s) before writing code.
- **Handle component-scoped SignalStore work.** If the feature is a component-local store, stop and recommend the `ngrx-component-state` skill.
- **Use `.get()` for Firestore reads.** Workspace invariant — subscriptions only.
- **Apply optimistic reducer updates for writes.** Workspace invariant (REX-278) — snapshot echo is the source of truth. Pending-merge views belong in facades or component signalStores, not in the reducer.
- **Introduce `@ngrx/data` or `@ngrx/component-store` for new code.** Both are legacy.
- **Skip the `firestoreWriteEffect` helper for writes.** Reuse the shared `error + inFlight` pattern — don't hand-roll. _(Source repo. Here there is no such helper — the written-out `switchMap` + `catchError` of Phase 4 step 7 is the pattern, and `status` / `error` on the state stand in for `error + inFlight`.)_
- **Block on a slow / offline `git fetch`.** Phase 0b times out cleanly; stale-but-working is always better than stopping.
