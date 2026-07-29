import type { Row, Table, Updater } from '@tanstack/angular-table';

import { computed } from '@angular/core';
import { patchState, signalStoreFeature, withComputed, withMethods } from '@ngrx/signals';

import type { NgeTableState } from '../../../nge-table-state';
import type { NgeSelectionCellContext, NgeSelectionHeaderContext } from '../../../slots';
import type { NgeTableSelectionModifiers } from '../nge-table-selection';
import type { NgeTableBaseStore } from '../nge-table-store.types';

import {
  NGE_TABLE_SELECTION_COLUMN_ID,
  ngeSelectionOf,
  ngeSelectionRangeIds,
  ngeSelectionToggled,
} from '../nge-table-selection';

interface NgeTableSelectionDeps extends NgeTableBaseStore {
  applyTableStateChange<TKey extends keyof NgeTableState>(
    key: TKey,
    updater: Updater<NgeTableState[TKey]>
  ): void;
  table: Table<unknown>;
}

/**
 * Row selection (ARCH-268) and its swappable control (ARCH-278).
 *
 * The affordances that let a **user** write `state.rowSelection` — a checkbox
 * column, click / cmd-click / shift-click, `Space`, and select-all. A host can
 * equally write the slice directly; both routes produce the same state, which is
 * the controlled-state contract applied to selection.
 *
 * Everything here writes through `applyTableStateChange` or through the engine's
 * own row API (`row.toggleSelected`, `table.toggleAllRowsSelected`), both of which
 * land in the same place — the engine's setters forward to
 * `options.onRowSelectionChange`, which `buildTableOptions` points back at the
 * store. What is never called is `table.setRowSelection`, because that is an engine
 * *option* name and `buildTableOptions` is the only place those are allowed to
 * appear.
 *
 * The two `…SlotContext` builders are what a consuming app's projected
 * `selection-cell` / `selection-header` templates receive, so a table dropped into
 * a domain wears that domain's checkbox — `cg-checkbox`, `gy-checkbox`. The
 * callbacks they carry are what make the seam work at all: a projected
 * `ng-template` is instantiated with its **declaration** injector — the
 * consumer's — so it cannot inject this store. ARCH-250's overlay needed a whole
 * bridge for that reason. Here the table is already building the context and can
 * close over the gesture directly, so the action travels with the state and no
 * per-table provider scope is needed.
 */
export function withNgeTableSelection(store: NgeTableSelectionDeps) {
  // `Boolean`, because the option may be a per-row predicate: supplying one means
  // the feature is on and *some* rows are selectable. Which rows is the engine's
  // question, answered per row by `getCanSelect()`.
  const selectionEnabled = computed(() => Boolean(store.config()?.enableRowSelection ?? false));

  /**
   * Whether the user may hold more than one row at a time — the conjunction, not
   * the raw flag, because every caller wants both questions answered at once and
   * `enableMultiRowSelection` defaults to `true` for a table with selection off.
   */
  const multiSelectEnabled = computed(
    () => selectionEnabled() && (store.config()?.enableMultiRowSelection ?? true)
  );

  /**
   * Every selectable row is selected — the header checkbox's checked state.
   *
   * Gated on multi-select as well, so the tri-state cannot report "all" for a
   * table that can only ever hold one row.
   */
  const allRowsSelected = computed(
    () => multiSelectEnabled() && store.table.getIsAllRowsSelected()
  );

  /** Some but not all rows are selected — the header checkbox's indeterminate state. */
  const someRowsSelected = computed(
    () => multiSelectEnabled() && store.table.getIsSomeRowsSelected()
  );

  /**
   * Remember the row a later shift-click should extend from.
   *
   * Read from the state **after** the write that preceded it, so an emptied
   * selection drops the anchor with it: keeping one would leave the next
   * shift-click extending from a row the user can no longer see marked. Pass
   * `null` for a gesture with no meaningful pivot, such as select-all.
   */
  const rememberAnchor = (rowId: null | string): void => {
    const isEmpty = Object.keys(store.tableState().rowSelection).length === 0;

    patchState(store, { selectionAnchorRowId: isEmpty ? null : rowId });
  };

  /**
   * Replace the selection with the range from the anchor to this row.
   *
   * Shared by the row gesture and the checkbox, because a user shift-clicking a
   * checkbox means the same thing as one shift-clicking the row it sits in —
   * every data grid treats the two alike, and having only one of them extend is
   * the kind of inconsistency a user reads as the feature being broken.
   *
   * ⚠️ The range is cut from `table.getRowModel()` — the **processed** rows — so
   * shift-clicking after a sort takes what the user sees between the two clicks
   * rather than what the source array holds. One `applyTableStateChange` rather
   * than one per row, so one gesture is one state change and one event.
   *
   * The anchor deliberately does **not** move: repeated shift-clicks pivot around
   * the row the user last chose, which is what lets a range be grown and shrunk
   * rather than only ratcheted.
   */
  const extendRangeTo = (row: Row<unknown>): void => {
    const rowIds = ngeSelectionRangeIds(
      store.table.getRowModel().rows,
      store.selectionAnchorRowId(),
      row.id
    );

    store.applyTableStateChange('rowSelection', () => ngeSelectionOf(rowIds));

    // The first shift-click of a table's life has nothing to extend from, so it
    // selects one row and becomes the pivot for the next one.
    if (store.selectionAnchorRowId() === null) {
      rememberAnchor(row.id);
    }
  };

  /**
   * Select or clear every row — the header checkbox.
   *
   * The engine's own `toggleAllRowsSelected` covers the *filtered* rows and
   * skips any that cannot be selected, which is what a user means by "all".
   */
  const toggleAllRowsSelection = (): void => {
    if (!multiSelectEnabled()) {
      return;
    }

    store.table.toggleAllRowsSelected();
    rememberAnchor(null);
  };

  /**
   * Add or remove one row — the per-row checkbox, and the `Space` key.
   *
   * `row.toggleSelected()` rather than a hand-built map, because the engine
   * already refuses a row that cannot be selected and already clears the others
   * when `enableMultiRowSelection` is off (`mutateRowIsSelected` deletes every
   * key when `!getCanMultiSelect()`). Single-row mode therefore costs no code
   * here, which is the point of reaching for the engine's row API.
   */
  const toggleRowSelection = (row: Row<unknown>, modifiers?: NgeTableSelectionModifiers): void => {
    if (!selectionEnabled()) {
      return;
    }

    // ⚠️ A shift-click on the CHECKBOX extends the range, exactly as one on the
    // row body does. Without this the two halves of the same affordance
    // disagree — the row extends, the checkbox inside it toggles one row — and
    // a user reads that as the range being broken rather than as two gestures.
    // The checkbox is the control most likely to be shift-clicked, because it
    // is the one that looks like a multi-select affordance.
    if (modifiers?.shiftKey && multiSelectEnabled() && row.getCanSelect()) {
      extendRangeTo(row);

      return;
    }

    // Plain and cmd/ctrl clicks are both ADDITIVE here, unlike a click on the
    // row body which replaces. That asymmetry is deliberate and is the
    // convention everywhere: a checkbox is a per-item switch, so ticking one
    // must never clear the rest.
    row.toggleSelected();
    rememberAnchor(row.id);
  };

  return signalStoreFeature(
    withComputed(() => ({
      allRowsSelected,
      multiSelectEnabled,
      selectionEnabled,
      someRowsSelected,
    })),

    withMethods(() => ({
      /**
       * Whether this column is the one the library injected (ARCH-268).
       *
       * A lookup the template asks by column, so no markup has to know the id — and
       * it answers `false` outright when selection is off, which is what withholds
       * the affordance rather than merely hiding it.
       */
      isSelectionColumn(columnId: string): boolean {
        return selectionEnabled() && columnId === NGE_TABLE_SELECTION_COLUMN_ID;
      },

      /**
       * What a projected `selection-cell` template receives.
       *
       * Rebuilt per read, like the header and row contexts and for the same reason:
       * `isSelected` moves underneath a row that has not itself changed, so a cached
       * object would serve a stale tick.
       */
      selectionCellSlotContext(row: Row<unknown>): {
        $implicit: NgeSelectionCellContext<unknown>;
      } {
        return {
          $implicit: {
            canSelect: row.getCanSelect(),
            isSelected: row.getIsSelected(),
            row: row.original,
            rowId: row.id,
            rowIndex: row.index,
            toggle: modifiers => toggleRowSelection(row, modifiers),
          },
        };
      },

      /** What a projected `selection-header` template receives. */
      selectionHeaderSlotContext(): { $implicit: NgeSelectionHeaderContext } {
        return {
          $implicit: {
            allSelected: allRowsSelected(),
            rowCount: store.table.getRowModel().rows.length,
            selectedCount: Object.keys(store.tableState().rowSelection).length,
            someSelected: someRowsSelected(),
            toggleAll: () => toggleAllRowsSelection(),
          },
        };
      },

      /**
       * Selection driven by a click on the row itself.
       *
       * Three gestures, and the modifier decides which: a plain click **replaces**
       * the selection, cmd/ctrl **adds or removes** one row, and shift **takes the
       * range** from the anchor. With `enableMultiRowSelection: false` both
       * modifiers fall through to the plain replace, which is the whole of what
       * "one row at a time" means.
       *
       * See {@link extendRangeTo} for how the shift range is cut, and
       * {@link toggleRowSelection} for the same modifiers arriving by the other
       * route.
       */
      selectRowFromClick(row: Row<unknown>, modifiers: NgeTableSelectionModifiers): void {
        if (!selectionEnabled() || !row.getCanSelect()) {
          return;
        }

        const multiSelect = multiSelectEnabled();

        if (multiSelect && modifiers.shiftKey) {
          extendRangeTo(row);

          return;
        }

        if (multiSelect && (modifiers.ctrlKey || modifiers.metaKey)) {
          // Read before the write: a `Row` captured across a state change keeps
          // answering from the options it was last given.
          const wasSelected = row.getIsSelected();

          store.applyTableStateChange('rowSelection', current =>
            ngeSelectionToggled(current, row.id, !wasSelected)
          );
          rememberAnchor(row.id);

          return;
        }

        store.applyTableStateChange('rowSelection', () => ngeSelectionOf([row.id]));
        rememberAnchor(row.id);
      },

      toggleAllRowsSelection,
      toggleRowSelection,
    }))
  );
}
