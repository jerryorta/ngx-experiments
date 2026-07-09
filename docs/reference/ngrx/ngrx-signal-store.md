# NgRx SignalStore — Workspace Conventions

This document captures how `@ngrx/signals` SignalStores are used in this workspace. Read this before reaching for the upstream ngrx.io documentation — the workspace conventions here override the upstream defaults where they differ.

## Two valid scopes for a SignalStore

A SignalStore is feature-local state. There are exactly two valid scopes:

1. **Single component** — local UI state colocated with one component. The component provides the store via `providers: [FooStore]`.
2. **Feature system** — multiple coordinated components for ONE feature (a wizard, a modal flow, a multi-pane workspace). Provide the store at the feature shell component, then child components inject it.

If the state is needed across unrelated features or pages, it belongs in a global slice in `libs/concierge/store` (or the equivalent classic `@ngrx/store` library for the domain) — **not** in a SignalStore. Promoting feature state to a global slice purely for read-side coupling is anti-pattern; bridge via `_globalStore` instead (see below).

## Composition pattern

`signalStore(...)` composes a store from features. The recipe:

```ts
import { signalStore, withFeature, withHooks, withProps, withState } from '@ngrx/signals';

export const FooStore = signalStore(
  withState(initialFooState),
  withProps(() => ({
    _service: inject(FooService),
    _globalStore: inject(Store),  // <-- global @ngrx/store, for cross-system reads/dispatches
  })),
  withFeature((store) => withFooSelection(store)),
  withFeature((store) => withFooFilters(store)),
  withHooks({
    onDestroy(store) { /* cleanup */ },
  })
);
```

**Worked example:** `libs/real-estate/ui/src/lib/cma/store/cma.store.ts:17-54` composes 6 `with*` features (selection, pricing, filters, search, view-mode, storage) and injects `_globalStore: inject(Store)` for cross-system reads. The numbered comments in that file mirror the recipe order — state, props, features, hooks.

## Injecting the global Store

A feature SignalStore can read from global slices and dispatch global actions via `_globalStore: inject(Store)` inside `withProps`. Use `_globalStore.select(selectActiveOrg)` to subscribe; combine with `withProps` / `withFeature` `computed` for cross-state derivations.

This is the **canonical bridge** between feature-scoped state and global state. Components inside the feature subtree should still use the SignalStore as their primary API; the global Store should be reached only through the SignalStore. Treat `_globalStore` as a private port — the leading underscore is the convention for SignalStore props that exist only for the store's own internal wiring, never for component consumption.

## When to use a SignalStore vs a global slice

- **SignalStore** when the state is feature-scoped, lifecycle-bound to the component or feature shell, and ephemeral. Examples: a multi-step wizard's draft state, a modal's transient selection set, a workspace's per-pane filters.
- **Global slice** in `libs/concierge/store` (or the domain's classic `@ngrx/store` library) when state is cross-feature, app-wide, persisted, multi-consumer, or server-synced (e.g. websocket-fed Firestore subscriptions).

If a feature SignalStore needs to react to global state (active org, current user, brokerage), inject the global Store inside `withProps` and bridge via selectors. Do NOT lift the entire feature state to a global slice for read-side coupling alone — coupling reads is what `_globalStore` is for.

## Further reading (ngrx.io)

The links below are the upstream API reference. Use them after the workspace conventions above, not before.

### Core fundamentals

- [Overview](https://ngrx.io/guide/signals): Introduction to the SignalStore and its philosophy.
- [Installation](https://ngrx.io/guide/signals/install): How to add `@ngrx/signals` to your Angular project.
- [Core Concepts](https://ngrx.io/guide/signals/signal-store): Understanding the foundational building blocks.
- [SignalStore API](https://ngrx.io/guide/signals/signal-store#signalstore): Detailed reference for the `signalStore` function.

### State & properties

- [SignalState](https://ngrx.io/guide/signals/signal-state): Managing standalone signal-based state.
- [Custom Store Properties](https://ngrx.io/guide/signals/signal-store/custom-store-properties): Adding static properties, observables, or dependencies.
- [Linked State](https://ngrx.io/guide/signals/signal-store/linked-state): Handling state that depends on other state slices.
- [DeepComputed](https://ngrx.io/guide/signals/deep-computed): Working with deeply nested computed signals.
- [State Tracking](https://ngrx.io/guide/signals/signal-store/state-tracking): How SignalStore tracks changes and reactivity.

### Features & customization

- [Custom Store Features](https://ngrx.io/guide/signals/signal-store/custom-store-features): Creating reusable logic to extend your stores.
- [Entity Management](https://ngrx.io/guide/signals/signal-store/entity-management): Using the `@ngrx/signals/entities` plugin for CRUD operations.
- [Lifecycle Hooks](https://ngrx.io/guide/signals/signal-store/lifecycle-hooks): Using `onInit` and `onDestroy` within the store.
- [Private Store Members](https://ngrx.io/guide/signals/signal-store/private-store-members): Restricting access to specific store properties or methods.
- [Events](https://ngrx.io/guide/signals/signal-store/events): Handling communication and events within the store architecture.

### Methods & integration

- [SignalMethod](https://ngrx.io/guide/signals/signal-method): Defining functional methods within the store.
- [RxJS Integration](https://ngrx.io/guide/signals/rxjs-integration): Using `rxMethod` to handle asynchronous side effects and streams.
- [Updating State](https://ngrx.io/guide/signals/signal-state#updating-state): Best practices for using `patchState`.

### Maintenance & FAQ

- [Testing](https://ngrx.io/guide/signals/signal-store/testing): Strategies for unit testing SignalStores.
- [Frequently Asked Questions](https://ngrx.io/guide/signals/faq): Common patterns and troubleshooting.
