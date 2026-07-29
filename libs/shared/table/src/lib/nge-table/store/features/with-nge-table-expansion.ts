import type { Row, Table } from '@tanstack/angular-table';

import { computed } from '@angular/core';
import { signalStoreFeature, withComputed, withMethods } from '@ngrx/signals';

import type { NgeExpandCellContext, NgeExpandHeaderContext } from '../../../slots';
import type { NgeTableBaseStore } from '../nge-table-store.types';

import { NGE_TABLE_EXPANSION_COLUMN_ID, hasNgeExpandedRows } from '../nge-table-expansion';

/**
 * `table` alone — no `applyTableStateChange`, and the absence is worth stating.
 *
 * Selection needs the writer because a shift-click range is one state write the
 * engine has no API for. Expansion has no such gesture: every write here goes
 * through `row.toggleExpanded()` or `table.toggleAllRowsExpanded()`, both of which
 * already route to `onExpandedChange` and so reach the same place. Declaring a
 * dependency this feature does not use would make the composition root's ordering
 * look more constrained than it is.
 */
interface NgeTableExpansionDeps extends NgeTableBaseStore {
  table: Table<unknown>;
}

/**
 * Row expansion (ARCH-298) and its swappable control.
 *
 * The affordances that let a **user** write `state.expanded` — a leading
 * disclosure column, a click or `Enter`/`Space` on the control, and expand-all in
 * the header. A host can equally write the slice directly, which is what Wave 0
 * shipped and what the `row-detail` slot has always gated on; both routes produce
 * the same state, which is the controlled-state contract applied to expansion.
 *
 * Everything writes through the engine's own row and table API —
 * `row.toggleExpanded()`, `table.toggleAllRowsExpanded()` — which forward to
 * `options.onExpandedChange`, which `buildTableOptions` points back at the store.
 * `table.setExpanded` is the banned one: it is an engine *option* name, and
 * `buildTableOptions` is the only place those may appear.
 *
 * ⚠️ **This is a detail band, not tree data.** Nothing here touches
 * `getExpandedRowModel()`, which exists to flatten *sub-rows* into the visible row
 * model. A band needs only `getRowCanExpand` and `row.getIsExpanded()`; wiring the
 * row model as well would drag `getSubRows`, `row.depth`, indentation and grouping
 * into a story about a disclosure control.
 *
 * The geometry half lives in `withNgeTableRows`, deliberately, because that is
 * where the virtualizer is: an expanded row is sized `rowHeight + rowDetailHeight`,
 * and the arithmetic belongs beside the `estimateSize` it feeds rather than beside
 * the gesture that triggers it.
 */
export function withNgeTableExpansion(store: NgeTableExpansionDeps) {
  // `Boolean`, because the option may be a per-row predicate: supplying one means
  // the feature is on and *some* rows can be opened. Which rows is the engine's
  // question, answered per row by `getCanExpand()`.
  const expansionEnabled = computed(() => Boolean(store.config()?.enableRowExpansion ?? false));

  /**
   * Every expandable row is open — the header control's expanded state.
   *
   * ⚠️ **Derived from `tableState`, NOT from `table.getIsAllRowsExpanded()`**, and
   * the difference is the controlled-state lock rather than a preference. The
   * engine's answer reads `table.getState()`, which is the options object the
   * adapter last applied — so two writes inside one change-detection pass have the
   * second one deciding against the state before the first. Expand-all then
   * *expanded* twice instead of toggling, which a spec caught. Our own slice is the
   * source of truth by contract; this is what that contract is for.
   *
   * The row model is still consulted, because "all" means all the rows the user can
   * actually open — a table where nothing can expand is not "all expanded".
   */
  const allRowsExpanded = computed(() => {
    if (!expansionEnabled()) {
      return false;
    }

    const expanded = store.tableState().expanded;

    if (expanded === true) {
      return true;
    }

    const expandable = store.table.getRowModel().rows.filter(row => row.getCanExpand());

    return expandable.length > 0 && expandable.every(row => expanded[row.id] === true);
  });

  /**
   * Any row is open at all — what the header control needs to decide whether its
   * next activation expands everything or collapses everything.
   */
  const someRowsExpanded = computed(
    () => expansionEnabled() && hasNgeExpandedRows(store.tableState().expanded)
  );

  /**
   * Open or close one row.
   *
   * `row.toggleExpanded()` rather than a hand-built map, for the reason
   * `toggleRowSelection` reaches for `row.toggleSelected()`: the engine already
   * knows how to fold a single row into the `true` shorthand — it materialises the
   * full map first and removes the one key (`RowExpanding.ts:281-318`) — and
   * re-deriving that here would be re-implementing the shorthand rather than
   * honouring it.
   *
   * The capability check is ours rather than the engine's because
   * `toggleExpanded` does **not** consult `getCanExpand()`; only
   * `getToggleExpandedHandler()` does, and that returns a handler this library has
   * no use for. So a row the config rejects would otherwise open by keyboard even
   * while its control rendered disabled.
   */
  const toggleRowExpansion = (row: Row<unknown>): void => {
    if (!expansionEnabled() || !row.getCanExpand()) {
      return;
    }

    row.toggleExpanded();
  };

  /**
   * Open or close every expandable row — the header control.
   *
   * ⚠️ **Expanding writes the `true` shorthand, not ten thousand keys.** That is
   * the engine's own behaviour (`table.toggleAllRowsExpanded` → `setExpanded(true)`)
   * and it is why expand-all is affordable on the large fixture at all: the slice
   * stays one boolean, and every predicate downstream — including the virtualizer's
   * size arithmetic — has to handle it. Collapsing writes `{}` rather than a map of
   * `false`, matching how the rest of `NgeTableState` treats absence.
   *
   * ⚠️ **The direction is passed explicitly**, which is what stops the engine
   * falling back on `getIsAllRowsExpanded()` — see {@link allRowsExpanded} for why
   * reading the engine's own copy of the state is the wrong source here.
   */
  const toggleAllRowsExpansion = (): void => {
    if (!expansionEnabled()) {
      return;
    }

    store.table.toggleAllRowsExpanded(!allRowsExpanded());
  };

  return signalStoreFeature(
    withComputed(() => ({
      allRowsExpanded,
      expansionEnabled,
      someRowsExpanded,
    })),

    withMethods(() => ({
      /**
       * What a projected `expand-cell` template receives.
       *
       * Rebuilt per read, like the selection contexts and for the same reason:
       * `isExpanded` moves underneath a row that has not itself changed, so a
       * cached object would serve a stale chevron.
       */
      expandCellSlotContext(row: Row<unknown>): { $implicit: NgeExpandCellContext<unknown> } {
        return {
          $implicit: {
            canExpand: row.getCanExpand(),
            isExpanded: row.getIsExpanded(),
            row: row.original,
            rowId: row.id,
            rowIndex: row.index,
            toggle: () => toggleRowExpansion(row),
          },
        };
      },

      /** What a projected `expand-header` template receives. */
      expandHeaderSlotContext(): { $implicit: NgeExpandHeaderContext } {
        return {
          $implicit: {
            allExpanded: allRowsExpanded(),
            rowCount: store.table.getRowModel().rows.length,
            someExpanded: someRowsExpanded(),
            toggleAll: () => toggleAllRowsExpansion(),
          },
        };
      },

      /**
       * Whether this column is the one the library injected (ARCH-298).
       *
       * A lookup the template asks by column, so no markup has to know the id — and
       * it answers `false` outright when expansion is off, which is what withholds
       * the affordance rather than merely hiding it.
       */
      isExpansionColumn(columnId: string): boolean {
        return expansionEnabled() && columnId === NGE_TABLE_EXPANSION_COLUMN_ID;
      },

      toggleAllRowsExpansion,
      toggleRowExpansion,
    }))
  );
}
