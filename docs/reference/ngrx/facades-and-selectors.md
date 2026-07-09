# NgRx Facade & Selector Conventions

Guidelines for building NgRx facades (component-facing API) and selectors (data composition) in this workspace.

## TL;DR

- **Signals are reserved for component / DOM updates.** Data flow (streams, merges, aggregations, conditions) uses RxJS Observables — more performant for dynamic updates.
- **Facades expose a clean, component-consumable API.**
- **Business logic lives in selectors, not facades.** When selectors cause circular dependencies, create a separate aggregation-selectors file (preferred) rather than pushing the logic into the facade.

## Facade reads: signal vs observable

A facade is the public-facing surface of a store slice, typically consumed by components.

### Rule

- If a read property is consumed **directly by a component template / signal effect**, expose it as a **signal** via `this.store.selectSignal(selector)`. This removes the `toSignal(...)` ceremony on every consumer.
- If a read property participates in **data flow** — piped through operators, merged with other observables, combined with HTTP streams — expose it as an **observable** via `this.store.select(selector)`. RxJS is more performant for composition and streaming.

### Naming

Keep the `$` suffix on both signal- and observable-returning facade properties. The `$` marks "this is a data stream" and keeps the facade's public API stable if the underlying implementation later swaps between `select` and `selectSignal`.

```ts
@Injectable({ providedIn: 'root' })
export class FooFacade {
  readonly #store = inject(Store);

  // Component-facing reads: signals for zero-ceremony template consumption.
  readonly profile$   = this.#store.selectSignal(selectFooProfile);
  readonly isLoaded$  = this.#store.selectSignal(selectFooIsLoaded);
  readonly error$     = this.#store.selectSignal(selectFooError);

  // Data-flow reads: observable, for composition in effects / HTTP pipelines.
  readonly activityStream$ = this.#store.select(selectFooActivityStream);
}
```

### When in doubt

If the slice is primarily consumed by components (the common case), default to `selectSignal`. If you find yourself adding a `toSignal(...)` at every consumer, the facade should have been exposing a signal.

## Selectors own business logic

Any **merging, filtering, conditional aggregation, derived values** — put it in a selector, not the facade. Facades are API, not logic.

```ts
// Good — selector owns the derivation
export const selectFooSummary = createSelector(
  selectFooItems,
  selectFooFilters,
  (items, filters) => applyFilters(items, filters)
);

@Injectable({ providedIn: 'root' })
export class FooFacade {
  readonly #store = inject(Store);
  // facade is just a passthrough
  readonly summary$ = this.#store.selectSignal(selectFooSummary);
}
```

```ts
// Avoid — facade doing the derivation
@Injectable({ providedIn: 'root' })
export class FooFacade {
  readonly items$   = this.#store.selectSignal(selectFooItems);
  readonly filters$ = this.#store.selectSignal(selectFooFilters);
  // Business logic leaking out of selectors:
  summary() {
    return applyFilters(this.items$(), this.filters$());
  }
}
```

## Aggregation across slices

Sometimes a derived selector needs to combine data from two or more slices. Naively adding it to one slice's `*.selectors.ts` often creates **circular import dependencies** as the graph grows.

**Preferred solution: a dedicated aggregation-selectors file**, typically at the library root (e.g. `libs/<domain>/store/src/lib/aggregate-selectors.ts`). It imports from each slice's selectors file; none of the slice selector files import from it. This keeps each slice's internal graph flat.

```
libs/concierge/store/src/lib/
  ├── +account/account.selectors.ts      ← slice-local selectors
  ├── +brokerage/brokerage.selectors.ts  ← slice-local selectors
  └── aggregate.selectors.ts             ← imports from both; exports cross-slice selectors
```

**Last resort:** if an aggregation file isn't worth the overhead for a one-off combination, the derived `computed()` can live in the facade — but only when it's consumed exclusively through that facade and the logic is trivial.

## Summary checklist

When designing or reviewing a facade + selector pair:

- [ ] Component-facing reads use `selectSignal` (or document why observable is required).
- [ ] Data-flow reads (effects, HTTP pipelines, cross-slice streaming) use `select`.
- [ ] All derivations / aggregations live in selectors, not the facade.
- [ ] Cross-slice selectors live in a dedicated aggregate selectors file if a slice's own selector file would otherwise need to import from a sibling slice.
- [ ] Facade has no business logic beyond dispatch wrappers + memoized passthroughs.
- [ ] `$` suffix used on both signal- and observable-returning facade reads for API stability.

## Where logic goes

Each NgRx layer has a single, well-defined responsibility. Logic that drifts to the wrong layer is the dominant source of architectural rot in this workspace — the table below is the authoritative split.

| Layer | Owns | Does NOT |
|-------|------|----------|
| Action | Naming the intent + payload shape (typed via `createActionGroup` / `props`) | Logic, side effects, state mutation |
| Reducer | Pure state transitions: apply success/failure/loading flags + entity inserts/updates from snapshot deltas | Side effects, async work, optimistic mutation of entity state (snapshot is authoritative) |
| Effect | Side effects: Firestore / HTTP / I/O; long-lived subscriptions; debouncing/throttling input streams | State mutation (effects only dispatch follow-up actions) |
| Selector | Derivations / aggregations / filtering; cross-slice composition (in `aggregate.selectors.ts`) | Dispatch, side effects, hard-coded business rules unrelated to data shape |
| Facade | Component-facing API surface: signal/observable reads + thin dispatch wrappers + (optional) telemetry emit | Business logic, Firestore I/O, HTTP, derived computation (push to selectors) |
| Component | Template binding + UX state machines (forms, drawers, modals) | Direct store reads (use facade signals/observables), Firestore writes (use facade methods) |

Facades are the only layer components import from. A component that pulls in `Store` and calls `Store.dispatch(...)` or `Store.select(...)` directly is a smell — every dispatch and every read should pass through the slice's facade so the facade remains the single, type-safe public API of the slice.

## Mutation flow — facade → action → effect → reducer → telemetry

The canonical write shape is a six-step round-trip. Components never see Firestore, never see action types, and never optimistically mutate state.

1. **Component** calls `facade.createFoo(payload)` — passes a domain payload, no `writeId`. The facade is the only API the component sees.
2. **Facade method**:
   1. Generates `const writeId = createWriteId()` (from `libs/concierge/store/src/lib/firestore-write`).
   2. Dispatches `FooActions.createFoo({ writeId, payload })`.
   3. Optionally fires `LoggingFacade.log({ category: 'feature-use', action: 'feature-used', name: 'foo.created', ...contextFKs, metadata })` — fire-and-forget.
   4. Returns the `writeId` so the component can correlate UI state via `isWriteInFlight(state, writeId)`.
3. **Reducer** handles the action triple via `onWriteStarted` / `onWriteSucceeded` / `onWriteFailed` (composed into the slice's `WriteStateSlice`). Reducer never optimistically inserts the entity.
4. **Effect** uses `firestoreWriteEffect` to call the slice's write service → resolves to `*Success` or `*Failure`.
5. **Snapshot** — the slice's `*FirestoreWatchService` delivers the new/updated entity into state via `upsertedFromSnapshot` / `modifiedFromSnapshot`. Snapshot is authoritative.
6. **Component** reads `selectWriteError` / `isWriteInFlight` (per-`writeId`) to render banners/spinners.

Skeleton mirroring `libs/concierge/store/src/lib/firestore-write/README.md`:

```ts
// foo.facade.ts
@Injectable({ providedIn: 'root' })
export class FooFacade {
  readonly #store = inject(Store);
  readonly #logging = inject(LoggingFacade);

  createFoo(payload: CreateFooPayload): string {
    const writeId = createWriteId();
    this.#store.dispatch(FooActions.createFoo({ writeId, payload }));
    this.#logging.log({
      category: 'feature-use',
      action: 'feature-used',
      name: 'foo.created',
      circleId: payload.circleId ?? null,
      metadata: { /* small payload diff */ },
    });
    return writeId;
  }
}
```

### Telemetry placement

**Dispatch-site emit by default.** The facade emits telemetry the same line it dispatches — the event records *intent* (the user clicked), runs fire-and-forget, and does not depend on the Firestore write landing. The component never sees the telemetry call; it sees only a `writeId`.

**Effect-success emit only when the event must record an outcome that the dispatch site cannot know** — e.g. a server-generated id that only exists after the write resolves, or a verb like `*.created` whose semantics demand the row be confirmed in Firestore before the event is emitted. When in doubt, dispatch-site is the right answer; an effect-success emit is the exception.

## Worked example — `CirclesFacade.updateTaskStatus`

The canonical example of dispatch + telemetry-on-side-effect lives in the circles slice. Trace it end-to-end:

**Action** — `libs/concierge/store/src/lib/+circles/circles.actions.ts:12`:

```ts
updateTaskStatus: props<{ circleId: string; status: TaskStatus; taskId: string }>(),
```

This is a non-Firestore-write action — it dispatches a status change that the snapshot will eventually echo back; the slice does not use the `firestore-write` triple here. The facade still owns the dispatch + telemetry boundary.

**Facade method** — `libs/concierge/store/src/lib/+circles/circles.facade.ts:89`:

```ts
updateTaskStatus(circleId: string, taskId: string, status: TaskStatus): void {
  this.#store.dispatch(CirclesActions.updateTaskStatus({ circleId, status, taskId }));
  if (status === TaskStatus.DONE) {
    // Denormalize labels at emit time from the circle + task lookup so
    // BigQuery rows are self-contained — null-safe when the lookup misses.
    const circle = this.selectById(circleId);
    const task = this.#findTaskInCircle(circle, taskId);
    // ...compose actor-named description...
    this.#logging.log({
      action: 'task-completed',
      category: 'activity',
      circleAddress: circle?.address ?? null,
      circleId,
      circleName: circle?.address ?? null,
      description,
      name: 'concierge.task.completed',
      taskId,
      taskTitle: task?.title ?? null,
      taskType: task?.type ?? null,
      visibility: 'broker-internal',
    });
  }
}
```

**Telemetry** — the `if (status === TaskStatus.DONE)` branch fires `LoggingFacade.log({ category: 'activity', ... })` for `task-completed`. Note this is a *conditional* dispatch-site emit: the facade decides at emit time whether the row qualifies (not every status change is a completion event).

This example uses `category: 'activity'` (broker-visible audit row, denormalized for BigQuery). The `category: 'feature-use'` flow above primarily covers product-analytics intent rows, but the same dispatch-site emit pattern applies — the facade owns telemetry placement, the component never sees it.
