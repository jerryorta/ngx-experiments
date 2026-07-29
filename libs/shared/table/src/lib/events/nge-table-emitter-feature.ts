import type { RowData, Table, TableFeature } from '@tanstack/angular-table';

import type { NgeTableEvent, NgeTableEventSink } from './nge-table-event';

declare module '@tanstack/table-core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Table<TData extends RowData> {
    /**
     * Announce something on the table's one event stream.
     *
     * ⚠️ **This exists so an ADDON can emit**, which until ARCH-271 it could not.
     * `emitTableEvent` is a closure on `NgeTableStore`, and the store is provided at
     * `<nge-table>`; an addon's services live in the **consumer's** injector and hold
     * the raw engine instance, so they have no route to it. `applyTableState` — the
     * route ARCH-250 opened for addon *state* — is deliberately silent for an addon's
     * slice, so it is not one either.
     *
     * Publishing the sink onto the instance is the same move ARCH-248 makes for
     * `readNgeExportData`: the engine object is the one thing a `TableFeature` and the
     * store both hold, so it is where they meet. Kind-agnostic by construction —
     * nothing here names an event, so a future addon's kind needs no second seam.
     *
     * ⚠️ Not named `get*`: the Angular adapter proxies every `get*` accessor into a
     * computed, which would turn this into a signal that swallows its argument.
     */
    emitNgeTableEvent: (event: NgeTableEvent<unknown>) => void;
  }
}

/**
 * The core feature that hands the event sink to the engine instance.
 *
 * A factory rather than a constant because it closes over the store's emitter, which
 * only exists once the store does — the same reason `createNgeRangeBridgeFeature`
 * is one. Registered by `NgeTableStore` alongside `NGE_TABLE_CORE_FEATURES`, ahead
 * of any addon, so `emitNgeTableEvent` is already on the instance by the time an
 * addon's own `createTable` runs.
 *
 * ⚠️ **It does not make an addon's state changes announce themselves.** Those still
 * route through `applyTableState`, which stays silent for addon slices on purpose —
 * an addon that wants to be heard says so explicitly, through this. Silence remains
 * the default, and that is what keeps `stateChange` from becoming a second event bus.
 */
export function createNgeTableEmitterFeature(emit: NgeTableEventSink): TableFeature {
  return {
    createTable: (table: Table<unknown>): void => {
      table.emitNgeTableEvent = emit;
    },
  };
}
