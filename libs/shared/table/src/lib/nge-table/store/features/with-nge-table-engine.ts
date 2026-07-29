import type { Table, Updater } from '@tanstack/angular-table';

import { inject } from '@angular/core';
import { patchState, signalStoreFeature, withMethods, withProps } from '@ngrx/signals';
import { createAngularTable, functionalUpdate } from '@tanstack/angular-table';

import type { NgeTableEvent, NgeTableEventSink } from '../../../events';
import type { NgeTableConfig } from '../../../nge-table-config';
import type { NgeTableState } from '../../../nge-table-state';
import type { NgeTableStateWriter } from '../nge-table-options';
import type { NgeCellRegistration, NgeTableSlotRegistration } from '../nge-table-slot-registry';
import type { NgeTableBaseStore } from '../nge-table-store.types';

import { createNgeTableEmitterFeature, ngeTableStateEventFor } from '../../../events';
import { NGE_TABLE_CORE_FEATURES, NGE_TABLE_FEATURES } from '../../../features';
import { buildTableOptions } from '../nge-table-options';

/**
 * The engine and the state contract around it — the composition root's first
 * feature, and the only one every other feature depends on.
 *
 * Three things that have to be born together: the event sink (extension axis 4),
 * the two state writers the engine's `onXChange` callbacks route through, and the
 * TanStack instance those callbacks belong to. Splitting them would mean the
 * instance reaching back through a store that is still being composed, which is
 * exactly the ordering hazard the local closures below remove.
 */
export function withNgeTableEngine(store: NgeTableBaseStore) {
  // ─── the event stream (ARCH-247) ───────────────────────────────────────────
  //
  // The **whole** emission pipeline: one sink, called from wherever an event
  // originates. Adding a kind is a member on `NgeTableEvent` plus a call to
  // `emitTableEvent` at the site that causes it; nothing here ever changes, and
  // nothing in it names a kind.
  //
  // A closure rather than signal state, deliberately. An event is a notification
  // that happened once — holding it in state would make it replayable, would make
  // `patchState` the thing that "sends" it, and would invite a reader to treat the
  // last event as a source of truth. That is precisely the second, competing
  // contract this axis must not become; state flows through `tableState`, events
  // flow through here, and the two never meet.

  /** No-op until `<nge-table>` wires its output, so the store is usable alone. */
  let sink: NgeTableEventSink = () => undefined;

  /** Announce something the table did. Silent until a sink is set. */
  const emitTableEvent = (event: NgeTableEvent<unknown>): void => {
    sink(event);
  };

  /**
   * Resolve a **whole-state** updater and store the result — the addon path.
   *
   * The sibling of {@link applyTableStateChange}, for the one case that method
   * cannot serve: its key is `keyof NgeTableState`, which is closed over the
   * slices this library declares, whereas an addon's slice is merged in from
   * outside. `buildTableOptions` points `onStateChange` here, so an addon writing
   * through the engine's own `makeStateUpdater` lands in the host's state and
   * leaves on `stateChange` exactly like a built-in slice — with no privileged
   * access to this store, which is what keeps a feature a plain `TableFeature`.
   *
   * ⚠️ The updater is resolved against **our** `tableState`, never the engine's.
   * The adapter merges its own internal copy under ours before handing the engine
   * a state, so resolving against `table.getState()` would fold that copy into the
   * host's state and quietly make the table a second source of truth — the exact
   * inversion the controlled-state contract exists to prevent.
   *
   * Announcement reuses the per-slice resolver over every key that moved, so
   * nothing here names a slice: an addon key has no entry and stays silent, while
   * a built-in routed through this path would still announce correctly.
   */
  const applyTableState = (updater: Updater<NgeTableState>): void => {
    const current = store.tableState();
    const next = functionalUpdate(updater, current);

    if (next === current) {
      return;
    }

    patchState(store, { tableState: next });

    // Both key sets, so a slice an addon *removed* is compared rather than
    // skipped — `Object.keys(next)` alone would never visit it.
    const keys = new Set([...Object.keys(current), ...Object.keys(next)]);

    for (const key of keys) {
      const event = ngeTableStateEventFor(key as keyof NgeTableState, current, next);

      if (event) {
        emitTableEvent(event);
      }
    }
  };

  /**
   * Resolve one of the engine's updaters against the current slice and store
   * the result.
   *
   * Every `onXChange` funnels through here. `functionalUpdate` is the engine's
   * own helper, so a value-versus-callback updater is resolved with exactly the
   * engine's semantics rather than a reimplementation that can drift; the slice
   * is then replaced, never mutated, which is what keeps the emitted state safe
   * to hand straight to a consumer.
   *
   * It is also where a state change announces itself on the event stream
   * (ARCH-247). Only changes that reach *here* emit: state a host hands in
   * arrives through {@link setTableState} and is deliberately silent, because
   * an echo of the host's own write is not news. Which slice announces what is
   * `NGE_TABLE_STATE_EVENT_BY_SLICE` — a lookup, not a switch.
   */
  const applyTableStateChange = <TKey extends keyof NgeTableState>(
    key: TKey,
    updater: Updater<NgeTableState[TKey]>
  ): void => {
    const current = store.tableState();
    const slice = functionalUpdate(updater, current[key]);
    const next = { ...current, [key]: slice };

    patchState(store, { tableState: next });

    // The resolver decides both whether this is worth announcing and what to
    // say — the state above is written either way, so nothing about the state
    // flow depends on the answer.
    const event = ngeTableStateEventFor(key, current, next);

    if (event) {
      emitTableEvent(event);
    }
  };

  /**
   * What `buildTableOptions` writes through.
   *
   * The two writers as a plain object rather than the store itself, because the
   * store does not carry them yet — they are declared by this very feature. The
   * builder only ever wanted these two methods, which is why the interface was
   * carved out in the first place.
   */
  const writer: NgeTableStateWriter = { applyTableState, applyTableStateChange };

  /**
   * Every `TableFeature` this instance runs — extension axis 1 of 4.
   *
   * Resolved **once**, here, and not from `config`: the engine reads
   * `_features` only while constructing the instance, which the adapter does
   * from a microtask scheduled as soon as this store exists — before
   * `<nge-table>`'s effect has pushed any config in. Injection has no such
   * window, and a feature factory runs inside the store's own construction, so
   * the injection context is live.
   */
  const features = [
    ...NGE_TABLE_CORE_FEATURES,
    // Hands the event sink to the instance, which is the only route an ADDON has
    // to axis 4: `emitTableEvent` is a closure on this store, and an addon's
    // services live in the consumer's injector. Ahead of the injected features so
    // `emitNgeTableEvent` is already there when an addon's `createTable` runs.
    createNgeTableEmitterFeature(event => emitTableEvent(event)),
    ...(inject(NGE_TABLE_FEATURES, { optional: true }) ?? []),
  ];

  /**
   * The live TanStack instance, reactive to `config` and `tableState`.
   *
   * `createAngularTable` proxies every `get*` accessor into a `computed`, so a
   * template reading `table.getRowModel()` re-renders when either signal
   * changes — no manual change detection, and `OnPush` stays honest.
   *
   * Widened to plain `Table` on purpose. The adapter also returns the instance
   * as a callable `Signal`, whose type carries Angular's internal `SIGNAL` brand
   * — un-nameable from a `.d.ts`, so leaving it in place fails the library's
   * declaration emit (TS4023/TS4029). Nothing here calls `table()`; the
   * reactivity lives in the proxied accessors, which the widening keeps.
   */
  const table = createAngularTable(() =>
    buildTableOptions(store.config(), store.tableState(), writer, features)
  ) as Table<unknown>;

  return signalStoreFeature(
    withProps(() => ({ table })),

    withMethods(() => ({
      applyTableState,
      applyTableStateChange,
      emitTableEvent,

      /**
       * Hand over the `[ngeCell]` templates the consumer projected (ARCH-246).
       *
       * Pushed in by `<nge-table>` rather than queried here, for the same reason
       * {@link setScrollElement} is: the store has no view to run a
       * `contentChildren` against. It also keeps an Angular query signal out of the
       * store's own props, which is what the declaration-emit note in `AGENTS.md`
       * is about.
       */
      setCellTemplates(cellTemplates: readonly NgeCellRegistration[]): void {
        patchState(store, { cellTemplates });
      },

      /** Replace the config. Called by `<nge-table>` whenever its `config` input changes. */
      setConfig(config: NgeTableConfig<unknown>): void {
        patchState(store, { config });
      },

      /**
       * Point the stream at `<nge-table>`'s `ngeTableEvent` output.
       *
       * Pushed in by the component for the same reason `setScrollElement` and
       * `setCellTemplates` are: the store has no view, and here specifically no
       * output — an `output()` belongs to a component. One call, never reactive.
       */
      setEventSink(eventSink: NgeTableEventSink): void {
        sink = eventSink;
      },

      /**
       * Hand the store the element that scrolls, once `<nge-table>` has one.
       *
       * The store cannot find it alone — it has no view — so the component resolves
       * `.nge-table__viewport` through a `viewChild` and pushes it here. Until it
       * does, the row virtualizer observes nothing and reports an empty window,
       * which is the correct answer for a table that has not been laid out yet.
       */
      setScrollElement(scrollElement: HTMLElement | null): void {
        patchState(store, { scrollElement });
      },

      /** Hand over the `[ngeTableSlot]` templates the consumer projected (ARCH-246). */
      setSlotTemplates(slotTemplates: readonly NgeTableSlotRegistration[]): void {
        patchState(store, { slotTemplates });
      },

      /** Replace the whole interaction state — the host-driven half of the contract. */
      setTableState(tableState: NgeTableState): void {
        patchState(store, { tableState });
      },
    }))
  );
}
