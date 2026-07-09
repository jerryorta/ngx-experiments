---
applyTo: '**/*.component.ts,**/*.store.ts'
title: Component-scoped SignalStore layout
---

The invariant (colocated, `providers: [Store]` never `providedIn: 'root'`, children `inject()` it) is enforced separately — this is the FILE SHAPE. Scaffold via the `ngrx-component-state` skill.

Three colocated files next to the component / system root:

- `<feature>-store.state.ts` — state interface + `initial<Feature>State`; reactive UI state only (selection, hover, drag, current view, draft) — never derived view-models, never algorithms.
- `features/with-<concern>.ts` — one `signalStoreFeature()` per cohesive concern; `withComputed` (derived signals; call pure fns) + `withMethods` (`patchState`; async via `rxMethod`).
- `<feature>.store.ts` — composition root, a plain `const` (no `@Injectable`, no `providedIn`):

```ts
export const FeatureStore = signalStore(
  withState(initialFeatureState),
  withProps(() => ({ _svc: inject(SomeService) })),   // private deps prefixed _
  withFeature((s) => withSelection(s)),
  withHooks({ onDestroy(s) { /* cleanup */ } }),
);
```

Root: `providers: [FeatureStore]` + `inject(FeatureStore)`; map `input()` → state and store effects → `output()`. Children: `inject(FeatureStore)`, NO `providers`. Reference: `libs/real-estate/ui/src/lib/cma/store/`.
