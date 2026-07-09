# Adding an NgRx Mutation Method (Facade Recipe)

Use this when adding a Firestore-write-backed mutation method to a global slice in `libs/concierge/store`. The recipe assumes the slice already exists and follows the workspace's `firestore-write` convention; if you're building a new slice from scratch, scaffold it first via the `ngrx-global-store` skill, then come back here for the per-method work.

## Prerequisites

Read first:

- `libs/concierge/store/src/lib/firestore-write/README.md` — the established write pattern (action triple, `WriteStateSlice`, `firestoreWriteEffect`, `createWriteId`).
- `docs/reference/ngrx/facades-and-selectors.md` — where logic goes + mutation flow + telemetry placement (worked example: `CirclesFacade.updateTaskStatus`).
- The slice you're extending — confirm its existing `*.actions.ts`, `*.reducer.ts`, `*.facade.ts`, `*-firestore-watch.service.ts` shapes; mirror their conventions exactly.

## Steps

### 1. Define the action triple

In `<slice>.actions.ts`, add the `create` / `success` / `failure` triple to the `createActionGroup` events map:

- `createFoo` props: `{ writeId: string; payload: CreateFooPayload }`
- `createFooSuccess` props: `{ writeId: string }` (or `{ writeId: string; id: string }` if the Firestore write generates the id and the UI needs it)
- `createFooFailure` props: `{ writeId: string; error: string }`

The same shape applies for `updateFoo` / `deleteFoo` triples.

### 2. Reduce the triple

In `<slice>.reducer.ts`, add three `on(...)` handlers using the helpers from `firestore-write`:

```ts
on(FooActions.createFoo, (state, { writeId }) => onWriteStarted(state, writeId)),
on(FooActions.createFooSuccess, (state, { writeId }) => onWriteSucceeded(state, writeId)),
on(FooActions.createFooFailure, (state, { writeId, error }) =>
  onWriteFailed(state, writeId, error)
),
```

Confirm the slice's state extends `WriteStateSlice` and `fooInitialState` spreads `createWriteStateInitial()`. **Do not optimistically mutate entity state** — the snapshot from `*FirestoreWatchService` is authoritative.

### 3. Add a write-service method

Extend the existing `*-firestore-watch.service.ts` with a `createFoo$(payload): Observable<void>` method (or similar), or create a new `*-firestore-write.service.ts` if the watch service is purely subscription-side and adding write methods would muddle responsibilities. The method must return an Observable that completes on success and errors on failure — `firestoreWriteEffect` distinguishes the two via the standard RxJS contract.

### 4. Wire the effect

In `<slice>.effects.ts` (create the file if it doesn't exist), declare the effect using `firestoreWriteEffect`:

```ts
export const createFoo$ = createEffect(
  (actions$ = inject(Actions), service = inject(FooService)) =>
    firestoreWriteEffect({
      actions$,
      trigger: FooActions.createFoo,
      work: (action) => service.createFoo$(action.payload),
      onSuccess: (writeId) => FooActions.createFooSuccess({ writeId }),
      onFailure: (writeId, error) => FooActions.createFooFailure({ writeId, error }),
    }),
  { functional: true }
);
```

Use `mergeMap` semantics (built into `firestoreWriteEffect`) so concurrent writes do not cancel each other.

### 5. Expose the facade method

In `<slice>.facade.ts`, add the dispatch wrapper:

```ts
createFoo(payload: CreateFooPayload): string {
  const writeId = createWriteId();
  this.#store.dispatch(FooActions.createFoo({ writeId, payload }));
  this.#logging.log({
    category: 'feature-use',
    action: 'feature-used',
    name: 'foo.created',
    /* ...context FKs from payload (circleId, brokerageId, etc.)... */
    metadata: { /* small diff */ },
  });
  return writeId;
}
```

Return the `writeId` so the component can correlate per-submission UI state via `isWriteInFlight(state, writeId)`.

### 6. Decide telemetry placement

Default to **dispatch-site emit** — fire-and-forget intent, the same line as `dispatch`. Use **effect-success emit** only when the event must record an outcome only the effect can know (server-generated id, or a verb that must wait for the Firestore write to land). When in doubt, dispatch-site is correct.

### 7. Update the slice barrel

Update `index.ts` (the slice barrel) to export the new effect + facade method (if not already exported transitively).

### 8. Wire the effect into the store registration

The app's `app.config.ts` registers each slice's effects via `provideEffects(...)`. If you created a new effects file (rather than adding to an existing one), add it to the slice's effect array. Confirm by reading the existing `app.config.ts` registration pattern and matching the slice's pre-existing convention.

### 9. Tests

Add four test layers to round out the change:

- **Facade dispatch test** — assert `dispatch` was called with the expected action and a non-empty `writeId`; assert `LoggingFacade.log` was called with the right shape (when telemetry emits).
- **Effect success test** — marbles or `provideMockActions` + service stub; assert `createFooSuccess` is dispatched with the trigger's `writeId`.
- **Effect failure test** — same setup, with the service rejecting; assert `createFooFailure` is dispatched with the trigger's `writeId` and the stringified error.
- **Reducer test** — `onWriteStarted` → `inFlight[writeId]` set + `error: null`; `onWriteSucceeded` → `inFlight[writeId]` cleared; `onWriteFailed` → `inFlight[writeId]` cleared + `error` set.

## Out-of-bounds

- Never call Firestore directly from a facade or component — always through an effect.
- Never optimistically insert entities in a reducer — the snapshot via `*FirestoreWatchService` is authoritative.
- Never use `Store.dispatch` from a component — go through the facade.
- Never modify the `firestore-write` helper itself when adding a new mutation; consume it as-is.
- Never generate `writeId` inside the action creator — callers generate and pass it so the UI can correlate pending state with its own submission.
