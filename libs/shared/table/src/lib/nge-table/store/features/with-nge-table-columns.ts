import type { Header, Table, Updater } from '@tanstack/angular-table';

import { patchState, signalStoreFeature, withMethods } from '@ngrx/signals';

import type { NgeTableEvent } from '../../../events';
import type { NgeTableState } from '../../../nge-table-state';
import type { NgeTableBaseStore } from '../nge-table-store.types';

import {
  captureResizeStart,
  clampColumnWidth,
  columnBoundsOf,
  resizeColumnSizing,
} from '../nge-table-resize';

interface NgeTableColumnsDeps extends NgeTableBaseStore {
  applyTableStateChange<TKey extends keyof NgeTableState>(
    key: TKey,
    updater: Updater<NgeTableState[TKey]>
  ): void;
  emitTableEvent(event: NgeTableEvent<unknown>): void;
  table: Table<unknown>;
}

/**
 * What a user can do to a column: drag it wider, nudge it from the keyboard, reset
 * it, and cycle its sort.
 *
 * ### Column drag-to-resize (ARCH-244)
 *
 * The library owns the gesture; the engine owns everything downstream of the
 * number. `header.getResizeHandler()` is deliberately NOT used — despite the
 * name it is a mouse-and-touch handler that attaches `mousemove` / `mouseup` or
 * `touchmove` / `touchend` to the document
 * (`table-core/src/features/ColumnSizing.ts:343-513`), which would forgo pointer
 * capture and contradict this feature's pointer-events constraint. What is kept
 * is its arithmetic, in {@link resizeColumnSizing}.
 *
 * Widths are written through `applyTableStateChange` rather than
 * `table.setColumnSizing`, so `buildTableOptions` stays the library's only site
 * of `@tanstack/*` option names. From there `column.getSize()`,
 * `getStart()` / `getAfter()`, and the lane totals all recompute on their own —
 * which is why resizing a pinned column keeps every downstream offset correct
 * without a line of code here knowing about pinning.
 */
export function withNgeTableColumns(store: NgeTableColumnsDeps) {
  return signalStoreFeature(
    withMethods(() => ({
      /**
       * Grab a column's resize handle.
       *
       * Refuses a column that cannot be resized, so the guard holds even if a caller
       * renders a handle it should not have — the capability decides the effect, not
       * merely the affordance.
       */
      beginColumnResize(
        header: Header<unknown, unknown>,
        pointerId: number,
        clientX: number
      ): void {
        if (header.column.getCanResize()) {
          patchState(store, { resize: captureResizeStart(header, pointerId, clientX) });
        }
      },

      /**
       * Release the drag. Idempotent, so a stray `pointercancel` is harmless.
       *
       * **This is where a resize announces itself** (ARCH-247), not
       * {@link updateColumnResize}, which runs on every `pointermove`. One gesture
       * is one `column-resize` event; the live widths are still on `stateChange`
       * for anyone who wants them.
       */
      endColumnResize(): void {
        const start = store.resize();

        if (!start) {
          return;
        }

        patchState(store, { resize: null });

        // A grab that never moved is not a resize. Comparing against the width
        // captured at `pointerdown` is what keeps a stray click on the grip — and
        // a `pointercancel` before the first move — out of the stream.
        const width = store.table.getColumn(start.columnId)?.getSize();

        if (width !== undefined && width !== start.startSize) {
          store.emitTableEvent({
            columnId: start.columnId,
            columnSizing: store.tableState().columnSizing,
            kind: 'column-resize',
            width,
          });
        }
      },

      /**
       * Move one column's width by a fixed step — the keyboard path.
       *
       * Deliberately not expressed as a one-pixel drag: a keyboard resize has no
       * grab point to be proportional to, and stepping the column's *current* width
       * is what makes repeated presses accumulate the way a user expects.
       */
      nudgeColumnSize(columnId: string, deltaPx: number): void {
        const column = store.table.getColumn(columnId);

        if (!column?.getCanResize()) {
          return;
        }

        const before = column.getSize();
        const width = clampColumnWidth(before + deltaPx, columnBoundsOf(column));

        store.applyTableStateChange('columnSizing', current => ({ ...current, [columnId]: width }));

        // Each press is its own commit, so each press is its own event — except at
        // a bound, where the width has nowhere left to go and repeating the key
        // would otherwise repeat the announcement.
        if (width !== before) {
          store.emitTableEvent({
            columnId,
            columnSizing: store.tableState().columnSizing,
            kind: 'column-resize',
            width,
          });
        }
      },

      /**
       * Forget a column's dragged width so it falls back to its definition's `size`.
       *
       * Deleting the key rather than writing the default back is what keeps a later
       * change to `columnDefaultWidth` (or to the column's own `size`) reaching a
       * table whose user has reset a column — the engine's own `resetSize()` does
       * the same.
       */
      resetColumnSize(columnId: string): void {
        const column = store.table.getColumn(columnId);

        if (!column?.getCanResize()) {
          return;
        }

        const before = column.getSize();
        const leafIds = new Set(column.getLeafColumns().map(leaf => leaf.id));

        store.applyTableStateChange('columnSizing', current =>
          Object.fromEntries(Object.entries(current).filter(([id]) => !leafIds.has(id)))
        );

        // A reset is a commit like any other, and resetting a column nobody had
        // dragged changes nothing worth announcing.
        //
        // ⚠️ Re-resolved through `store.table` rather than reused from `column`
        // above. The adapter's proxy is what re-applies the engine's options from
        // the current state; a `Column` captured before a state change keeps
        // answering from the options it was last given, so `column.getSize()` here
        // would report the width the reset was meant to undo. Same reason
        // `endColumnResize` reaches back through the proxy for its width.
        const width = store.table.getColumn(columnId)?.getSize();

        if (width !== undefined && width !== before) {
          store.emitTableEvent({
            columnId,
            columnSizing: store.tableState().columnSizing,
            kind: 'column-resize',
            width,
          });
        }
      },

      /**
       * Cycle a column's sort — the one interaction `<nge-table>` ships with, and
       * the shortest proof that the round trip is real: the click goes into the
       * engine, the engine's `onSortingChange` comes back into `tableState`, and the
       * component emits it. A column that cannot sort is a no-op rather than an
       * error, so a template need not guard the call.
       */
      toggleColumnSort(columnId: string): void {
        const column = store.table.getColumn(columnId);
        if (column?.getCanSort()) {
          column.toggleSorting();
        }
      },

      /**
       * Apply the drag at the pointer's current position.
       *
       * Matched on `pointerId` so a second finger landing mid-drag cannot hijack the
       * gesture — the pointer that grabbed the handle is the only one that moves it.
       */
      updateColumnResize(pointerId: number, clientX: number): void {
        const start = store.resize();

        if (!start || start.pointerId !== pointerId) {
          return;
        }

        const sizing = resizeColumnSizing(start, clientX);

        store.applyTableStateChange('columnSizing', current => ({ ...current, ...sizing }));
      },
    }))
  );
}
