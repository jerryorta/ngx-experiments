---
name: ngrx-global-store
description: Create or refactor a classic global `@ngrx/store` slice (actions + reducer + effects + selectors + facade) following the Gigasoftware workspace conventions. Hybrid skill — authoritative API guidance comes from a local NgRx clone (kept current via `git pull`); layout and Firestore-integration conventions come from the in-workspace concierge + real-estate store slices. Use when the user wants to add a classic global store slice, wire effects, introduce `@ngrx/entity`, integrate `@ngrx/router-store`, connect a Firestore websocket subscription to state, or refactor an existing slice. Do NOT use for component-scoped signalStore work — the `ngrx-signal-store` skill handles those.
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

1. **Slice name** (e.g. `+notifications`, `+circles`) and target library (`libs/concierge/store/src/lib/`, `libs/real-estate/store/src/lib/`, etc.). Slice directories are prefixed with `+` in this workspace.
2. **Data shape** — single doc? Collection? Collection-under-parent? Write-only (no subscription)?
3. **Firestore path(s)** — where does the data live? Workspace invariant: reads are always `onSnapshot` subscriptions, never `.get()`.
4. **Writes** — create / update / delete patterns? Optimistic? Debounced?
5. **Consumers** — who reads this state? App-wide (`providedIn: 'root'` facade)? A specific feature module?
6. **Side-effects** — navigation, toasts, analytics, inter-slice dispatches on write success?
7. **Entity semantics** — is this a keyed collection where `@ngrx/entity` adapters fit?
8. **Router coupling** — does URL state drive reads (route params → dispatch)?
9. **Existing code to refactor** — path to the slice being migrated.

If the feature is purely component-local transient state (wizard fields, toggles, one-component OTP channel) — **stop and recommend the `ngrx-signal-store` skill instead**. Classic store is overkill for those.

---

## Phase 2 — Load relevant docs

Read only the guide sections that map to what you're building. Paths under `$NGRX_DOCS/projects/www/src/app/pages/guide/`:

### `store/` — core primitives

| Concern | File |
|---|---|
| Actions, `createActionGroup` | `store/actions.md` |
| Reducers, `createReducer`, `on` | `store/reducers.md` |
| Selectors, `createSelector`, `createFeature` | `store/selectors.md` |
| Feature state, `provideState` | `store/feature-creators.md` or `store/providing-store.md` |
| Meta-reducers | `store/metareducers.md` |
| Typed-actions conventions | `store/walkthrough.md` (start here if building the first slice in a new project) |

### `effects/` — action-driven side effects

| Concern | File |
|---|---|
| `createEffect`, `ofType`, subscribing to actions | `effects/index.md` |
| Lifecycle (`ROOT_EFFECTS_INIT`), dispatch control, filtering | siblings of above |
| Testing effects with `provideMockActions` + marbles | `effects/testing.md` |
| Integrating cloud function / HTTP side-effects | use the effect patterns, then wrap with workspace's `firestoreWriteEffect` (see Phase 3) |

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

### Canonical classic-slice layout — `libs/concierge/store/src/lib/+<feature>/`

```
+<feature>/
  <feature>.model.ts                         ← types + WriteStateSlice if writes involved
  <feature>.actions.ts                       ← createActionGroup
  <feature>.reducer.ts                       ← feature key + initial state + handlers
  <feature>.selectors.ts                     ← createFeature + derived selectors
  <feature>-write.service.ts                 ← wraps firestoreService.upsertDoc$ / deleteDoc$
  <feature>-firestore-watch.service.ts       ← implements WebsocketConnectableService (onSnapshot)
  <feature>.effects.ts                       ← uses firestoreWriteEffect for writes + side-effects
  <feature>.facade.ts                        ← (optional) ergonomic inject-in-component layer
  index.ts                                   ← barrel
  + specs for each
```

Pick your template based on what you're building:

| Template slice | Read when scaffolding… |
|---|---|
| `libs/concierge/store/src/lib/+account/` | Single-doc Firestore state + writes + facade. Canonical shape for the rest. |
| `libs/concierge/store/src/lib/+onboarding-draft/` | Same as +account but with a sub-doc path and a stale-guard in the reducer. Has the clear-on-finalize cross-slice effect pattern. |
| `libs/concierge/store/src/lib/+brokerage/` | Single-doc with a mutable source key (the active brokerage id) that rewires the subscription when the selected id changes. |
| `libs/concierge/store/src/lib/+onboarding-write/` | Write-only slice — no subscription, just actions → effect → atomic batched `writeBatch`. |
| `libs/real-estate/store/src/lib/+brokerages/brokerage-entity.service.ts` | Collection slice with `GigaFirestoreCollectionQuery` + `aggregateUpdates` — entity-style CRUD via snapshots. |
| `libs/real-estate/store/src/lib/+chat/chat-firestore-watch.service.ts` | Nested collection driven by a parent entity via `QueryEngineCache`. |

Always read before scaffolding:

1. The `.actions.ts`, `.reducer.ts`, `.effects.ts` from your chosen template — copy conventions, don't reinvent them.
2. `libs/concierge/store/src/lib/firestore-write/index.ts` — shared write helpers: `firestoreWriteEffect`, `createWriteId`, `onWriteStarted/Succeeded/Failed`, `WriteStateSlice`, `createWriteStateInitial`, `anyWriteInFlight`, `isWriteInFlight`. Always reuse for new write paths.
3. `libs/concierge/store/src/lib/+websocket-registry/` — the `WebsocketConnectableService` interface and `WebsocketServiceConnector` contract that every watch service implements.
4. `libs/concierge/store/src/lib/state.concierge-app.ts` — root state composition; you'll register the new reducer / effects / watch service here.

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

1. `<feature>.model.ts` — types (doc shape) + `extends WriteStateSlice` on the state interface if writes are involved.
2. `<feature>.actions.ts` — `createActionGroup({ source: 'Feature', events: { ... } })`. Include `loadedFromSnapshotChanges({ doc })`, `snapshotMissing()`, plus dedicated `update*` / `create*` / `delete*` action + Success + Failure triples.
3. `<feature>.reducer.ts` — `<feature>FeatureKey = 'kebab-case'`; initial state via `createWriteStateInitial()` + feature-specific fields; handlers using `onWriteStarted/Succeeded/Failed`.
4. `<feature>.selectors.ts` — `createFeature({ name, reducer })` gives auto-generated selectors; add derived `selectWriteError`, `selectAnyWriteInFlight`, `selectIsWriteInFlight(writeId)` via `extraSelectors`.
5. `<feature>-write.service.ts` (if writes) — `@Injectable({ providedIn: 'root' })` class, inject `GigaFirestoreService` + `Store` (for `selectUid`), expose `update<X>$(patch): Observable<void>` methods that wrap `firestoreService.upsertDoc$(path, payload)`.
6. `<feature>-firestore-watch.service.ts` (if subscription) — implements `WebsocketConnectableService`, has `connectionKey = <feature>FeatureKey`, constructs `connection = new WebsocketServiceConnector(this, this.store)`, `onConnect({ uid })` opens `onSnapshot(path)` → dispatches `loadedFromSnapshotChanges` or `snapshotMissing`, `onDisconnect()` unsubscribes.
7. `<feature>.effects.ts` — wrap each write in `firestoreWriteEffect({ trigger, work, onSuccess, onFailure })`. Add cross-slice effects (e.g. clear-on-signout) here, not in the reducer.
8. `<feature>.facade.ts` (optional) — `@Injectable({ providedIn: 'root' })` wrapping the store with ergonomic methods + signals (`toSignal(store.select(...))`). Components inject the facade, not the store directly.
9. `index.ts` — barrel re-exports.
10. **Register** in `libs/concierge/store/src/lib/state.concierge-app.ts`: add the reducer to the reducers map, the effects class to the effects array, and provide the watch service so its connector initializes.
11. **Barrel export** from `libs/concierge/store/src/index.ts` so consumers can `import { ... } from '@gigasoftware/concierge-store'`.
12. **Specs** for reducer, effects, watch service, write service, facade (follow existing spec shapes for the template slice).

If sign-out needs to clear this slice: add `OnboardingDraftActions.reset()`-style dispatch to the existing signOut chain in `libs/concierge/store/src/lib/+account/account.effects.ts`.

---

## Phase 5 — Verify

1. `npx nx run <project>:lint` — clean on touched files.
2. `npx nx run <project>:test` — all new specs pass.
3. Type-check at consumers: `inject(FeatureFacade)`, `store.select(selectX)` resolve cleanly.
4. Confirm the watch service's connector actually initializes — grep for `provide` / `bootstrap` wiring in `state.concierge-app.ts` and any app module; a silently-unregistered watch service yields a slice that never hydrates.
5. Confirm the reducer is in the root state config (selectors fail silently if the slice isn't registered under the right feature key).

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

Don't solve it in the component with imperative hydrate effects. If the slice's data needs to drive form fields, either (a) use a component-scoped signalStore that reads the slice reactively (see `ngrx-signal-store` skill + REX-298), or (b) use `@if` gating on an `isHydrated` selector so the form doesn't render until the snapshot arrives.

---

## What this skill deliberately does NOT do

- **Scaffold without reading docs first.** Always read the relevant guide page(s) before writing code.
- **Handle component-scoped SignalStore work.** If the feature is a component-local store, stop and recommend the `ngrx-signal-store` skill.
- **Use `.get()` for Firestore reads.** Workspace invariant — subscriptions only.
- **Apply optimistic reducer updates for writes.** Workspace invariant (REX-278) — snapshot echo is the source of truth. Pending-merge views belong in facades or component signalStores, not in the reducer.
- **Introduce `@ngrx/data` or `@ngrx/component-store` for new code.** Both are legacy.
- **Skip the `firestoreWriteEffect` helper for writes.** Reuse the shared `error + inFlight` pattern — don't hand-roll.
- **Block on a slow / offline `git fetch`.** Phase 0b times out cleanly; stale-but-working is always better than stopping.
