import { signalStore, withFeature, withState } from '@ngrx/signals';

import { withNgeTableColumns } from './features/with-nge-table-columns';
import { withNgeTableEngine } from './features/with-nge-table-engine';
import { withNgeTableExpansion } from './features/with-nge-table-expansion';
import { withNgeTableLanes } from './features/with-nge-table-lanes';
import { withNgeTableRows } from './features/with-nge-table-rows';
import { withNgeTableSelection } from './features/with-nge-table-selection';
import { withNgeTableSlots } from './features/with-nge-table-slots';
import { initialNgeTableStoreState } from './nge-table-store.state';

// Re-exported so `buildTableOptions` keeps the specifier it has always had; the
// builder now lives in its own module because both the composition root below and
// the engine feature need it, and neither should have to import the other.
// `NgeTableStateWriter` deliberately does NOT come with it — it is the builder's
// argument shape, not part of the library's public surface.
export { buildTableOptions } from './nge-table-options';

/**
 * Component-scoped table SignalStore.
 *
 * Provide it on `<nge-table>` (`providers: [NgeTableStore]`) — NEVER
 * `providedIn: 'root'`, or every table on a page would share one sort order. It
 * supplements (never replaces) whatever global domain store the consumer runs:
 * rows arrive as config, interaction state leaves as an output. The one thing it
 * injects is `NGE_TABLE_FEATURES`, the addon registration axis, which has to be
 * DI because the engine reads `_features` before any config exists.
 *
 * It owns the engine instance and the **effective** interaction state, and that
 * ownership *is* the controlled-state contract in code. The engine is handed
 * `state` on every recompute and its `onXChange` callbacks route straight back
 * into `tableState`, so the store — never the engine — is the single source of
 * truth. Turning on server-side mode later changes where the *data* comes from
 * and nothing at all about how state flows.
 *
 * ### The order is the dependency graph (ARCH-297)
 *
 * Each feature declares a `…Deps` interface naming what an earlier one
 * contributed, so the sequence below is checked rather than remembered — swap two
 * entries and the later one's deps stop being satisfied:
 *
 * | Feature | Needs |
 * | --- | --- |
 * | `withNgeTableEngine` | the state alone; supplies `table`, the writers, the event sink |
 * | `withNgeTableLanes` | `table` |
 * | `withNgeTableRows` | `table`, `headerRows` |
 * | `withNgeTableColumns` | `table`, `applyTableStateChange`, `emitTableEvent` |
 * | `withNgeTableExpansion` | `table` |
 * | `withNgeTableSlots` | the two template registries, `slotRegistry`, `renderedRows`, `scrollSettled`, `toggleRowExpansion` |
 * | `withNgeTableSelection` | `table`, `applyTableStateChange` |
 *
 * ⚠️ **Expansion sits BEFORE slots, and that is the ordering rule doing its job.**
 * `NgeRowContext` carries a `toggleExpanded` callback so a `row-detail` band can
 * collapse itself, and the slots feature builds that context — so it needs the
 * gesture in hand. Written the other way round, `toggleRowExpansion` would be
 * missing from the slots feature's `store` argument and the failure would arrive at
 * *click time* rather than at compile time (the trap ARCH-278 documented).
 *
 * ⚠️ **Eight of `signalStore`'s fifteen slots, and the headroom is the point.**
 * A sixteenth feature matches no overload and inference collapses silently — see
 * `nge-table-store.composition.spec.ts`, which fails at ten so the fix is never a
 * rescue, and `AGENTS.md` § The store's composition root for where a new concern
 * belongs.
 */
export const NgeTableStore = signalStore(
  withState(initialNgeTableStoreState),
  withFeature(store => withNgeTableEngine(store)),
  withFeature(store => withNgeTableLanes(store)),
  withFeature(store => withNgeTableRows(store)),
  withFeature(store => withNgeTableColumns(store)),
  withFeature(store => withNgeTableExpansion(store)),
  withFeature(store => withNgeTableSlots(store)),
  withFeature(store => withNgeTableSelection(store))
);
