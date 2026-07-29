import type { Signal } from '@angular/core';
import type { Cell, Header, Row, Table } from '@tanstack/angular-table';

import { computed, effect } from '@angular/core';
import { patchState, signalStoreFeature, withComputed, withMethods } from '@ngrx/signals';

import type { NgeCellEditPort } from '../../../edit';
import type { NgeTableEvent } from '../../../events';
import type {
  NgeCellContext,
  NgeHeaderContext,
  NgeRowContext,
  NgeTableSlotName,
} from '../../../slots';
import type {
  NgeCellTemplate,
  NgeTableSlotRegistry,
  NgeTableSlotTemplate,
} from '../nge-table-slot-registry';
import type { NgeTableBaseStore } from '../nge-table-store.types';
import type { NgeTableRenderedRow } from '../nge-table-virtual';

import { NGE_CELL_NO_EDIT, isNgeColumnAlwaysLive, isNgeColumnEditable } from '../../../edit';
import {
  ngeTableSlotTemplateFor,
  toNgeCellContext,
  toNgeHeaderContext,
  toNgeRowContext,
} from '../nge-table-slot-registry';

interface NgeTableSlotsDeps extends NgeTableBaseStore {
  cellTemplateById: Signal<ReadonlyMap<string, NgeCellTemplate>>;
  editorTemplateById: Signal<ReadonlyMap<string, NgeCellTemplate>>;
  emitTableEvent(event: NgeTableEvent<unknown>): void;
  renderedRows: Signal<NgeTableRenderedRow[]>;
  scrollSettled: Signal<boolean>;
  slotRegistry: Signal<NgeTableSlotRegistry>;
  table: Table<unknown>;
  toggleRowExpansion(row: Row<unknown>): void;
}

/**
 * The render-slot seam (ARCH-246), inline editing (ARCH-292), and the pointer half
 * of the event stream (ARCH-247).
 *
 * Everything slot-related here is lookup and translation: which template belongs
 * at a position, and what context it is handed. **No method names a slot.** The
 * template asks for `'empty'` or `'row-detail'` by the name it is anchoring, so
 * a ninth name reaches its anchor without a line changing in this feature — which
 * is the property ARCH-250 and ARCH-251 exist to audit.
 *
 * Editing belongs here on the merits: what a cell renders while it is being edited
 * is a `[ngeCell]` template resolved by the registry below, and the edit port
 * exists to feed the cell context this feature builds. `editEnabled` sits with it
 * for the same reason — the port reads it.
 *
 * `cellClicked` / `rowClicked` are bound straight from the template, exactly as
 * `toggleColumnSort` is, and hand over the same context objects. The two are
 * separate sites rather than one, and DOM bubbling does the rest: a click inside a
 * cell reaches the cell first and then the row, so `cell-click` precedes
 * `row-click` with nothing here ordering them. A click on a row's own padding, or
 * inside a `row-detail` band, emits `row-click` alone.
 */
export function withNgeTableSlots(store: NgeTableSlotsDeps) {
  /**
   * Cell contexts, cached against the engine cell they describe.
   *
   * `props` reaching `*flexRender` with a new identity sets
   * `PropsReferenceChanged` on every pass, and at 10,000 rows the allocations
   * are the kind of churn virtualization was added to avoid. The cache is safe
   * because a `Cell` is created with its row model: sorting reorders rows
   * without recreating them, and anything that *does* change a value — new
   * `config.data`, a different `getRowId` — rebuilds the row model and with it
   * every cell, so a stale entry has nothing to be stale against.
   *
   * ⚠️ The same trick would be **wrong** for headers and rows, and that
   * asymmetry is the thing to remember here. A `Header` survives a sort and a
   * resize while `sortDirection` and `width` both move underneath it, and a
   * `Row` survives an expand while `isExpanded` moves — so those two contexts
   * are rebuilt on every read, and their outlets update a context object rather
   * than recreating a view, which costs nothing worth caching against.
   *
   * ⚠️ **A field that moves is why `isSettled` and `isEditing` are signals**
   * (ARCH-291, ARCH-292). The cache makes any *plain* field on this object a value
   * frozen at first render, so the live information a cell template needs travels
   * as a signal instead — object identity stays stable, the value stays current,
   * and the two requirements stop being in tension. A future field that changes
   * under a cell takes the same shape; a plain one would be served stale here and
   * would look like it worked.
   */
  const cellContexts = new WeakMap<Cell<unknown, unknown>, NgeCellContext<unknown>>();

  /**
   * Whether any column has opted into inline editing (ARCH-292).
   *
   * Read by the edit port — a table that answers `false` hands every cell the one
   * shared `NGE_CELL_NO_EDIT` bundle instead of allocating per cell — and by the
   * row element, which becomes a tab stop for editing on the same terms it already
   * does for selection.
   */
  const editEnabled = computed(() =>
    (store.config()?.columns ?? []).some(column => isNgeColumnEditable(column))
  );

  // ─── inline editing (ARCH-292) ─────────────────────────────────────────────

  const cancelCellEdit = (): void => {
    if (store.editing() !== null) {
      patchState(store, { editing: null });
    }
  };

  const beginCellEdit = (rowId: string, columnId: string): void => {
    if (!isNgeColumnEditable(store.table.getColumn(columnId)?.columnDef)) {
      return;
    }

    patchState(store, { editing: { columnId, rowId } });
  };

  const commitCellEdit = (rowId: string, columnId: string, value: unknown): void => {
    const cell = store.table
      .getRowModel()
      .rows.find(row => row.id === rowId)
      ?.getAllCells()
      .find(candidate => candidate.column.id === columnId);

    patchState(store, { editing: null });

    // Silent when the cell can no longer be resolved: a commit racing a filter or
    // a re-fetch has nothing to propose, and inventing a patch against a record
    // that has left the row model is the one outcome worse than dropping it.
    if (!cell) {
      return;
    }

    store.emitTableEvent({
      cells: [{ columnId, previousValue: cell.getValue(), rowId, value }],
      kind: 'edit-intent',
    });
  };

  /**
   * ⚠️ **Scrolling an in-progress edit out of the window CANCELS it.**
   * Virtualization recycles rows, so a draft that survived its row leaving would
   * belong to whichever record the recycled element shows next — the failure that
   * reads as data corruption rather than as a bug. The same check covers a row
   * leaving the *processed* row model at all: a filter, a sort that drops it, or
   * new `config.data` each take it out of `renderedRows` too, and cancelling is
   * the honest answer to every one of them.
   *
   * ⚠️ **`editing()` is read before anything else, and the ordering is the whole
   * cost story.** Signal dependencies are tracked as they are read, so while no
   * edit is open this effect depends on `editing` alone and a scroll costs it
   * nothing at all. Reading `renderedRows()` first would subscribe every table in
   * the workspace to a per-slide effect body — which is exactly the regression
   * ARCH-289's budget exists to catch, introduced by the guard against it.
   */
  effect(() => {
    const target = store.editing();

    if (target === null) {
      return;
    }

    const stillRendered = store.renderedRows().some(rendered => rendered.row.id === target.rowId);

    if (!stillRendered) {
      cancelCellEdit();
    }
  });

  /**
   * How a cell context reaches editing.
   *
   * ⚠️ **A table that has opted into nothing allocates nothing.** `isEditing`
   * describes the *cell* rather than the viewport, so unlike ARCH-291's settle
   * signal it cannot be one signal shared by every context — an opted-in table
   * pays one `computed` per cell it renders. Handing back `NGE_CELL_NO_EDIT`'s
   * single frozen bundle when no column is editable keeps that cost off every
   * other table in the workspace, and keeps it off structurally: there is no
   * per-cell allocation left to regress.
   */
  const editPort = computed<NgeCellEditPort>(() =>
    editEnabled()
      ? {
          forCell: (rowId, columnId) => ({
            beginEdit: () => beginCellEdit(rowId, columnId),
            cancelEdit: cancelCellEdit,
            commitEdit: value => commitCellEdit(rowId, columnId, value),
            isEditing: computed(() => {
              // An always-live column never waits to be activated, so its cells
              // report editing for the life of the table.
              if (isNgeColumnAlwaysLive(store.table.getColumn(columnId)?.columnDef)) {
                return true;
              }

              const target = store.editing();

              return target?.rowId === rowId && target.columnId === columnId;
            }),
          }),
        }
      : NGE_CELL_NO_EDIT
  );

  const cellContextFor = (cell: Cell<unknown, unknown>): NgeCellContext<unknown> => {
    const cached = cellContexts.get(cell);

    if (cached) {
      return cached;
    }

    // `scrollSettled` is one signal per table, shared by every context rather than
    // derived per cell: the flag describes the viewport, not the cell, and ten
    // thousand `computed`s over one source is the allocation this cache exists to
    // avoid. The edit port is the other half of that trade — see `editPort`.
    const context = toNgeCellContext(cell, store.scrollSettled, editPort());
    cellContexts.set(cell, context);

    return context;
  };

  return signalStoreFeature(
    withComputed(() => ({ editEnabled })),

    withMethods(() => ({
      beginCellEdit,
      cancelCellEdit,

      /** A click landed on a cell. */
      cellClicked(cell: Cell<unknown, unknown>): void {
        store.emitTableEvent({ cell: cellContextFor(cell), kind: 'cell-click' });
      },

      /** The `props` a custom cell template is rendered with. Stable per cell. */
      cellContext: cellContextFor,

      /** The same context, wrapped for `ngTemplateOutlet` — used by `cell-overlay`. */
      cellSlotContext(cell: Cell<unknown, unknown>): { $implicit: NgeCellContext<unknown> } {
        return { $implicit: cellContextFor(cell) };
      },

      /**
       * What one column's cells render, or `null` to fall back to the column
       * definition's own `cell`.
       *
       * That last fallback is what makes adoption per-column: a table with one
       * custom cell renders its other six exactly as it did before this seam
       * existed.
       *
       * ⚠️ **The order of the two lookups is the contract, not a detail**
       * (ARCH-293). A projected `[ngeCell]` is consulted first, so a consumer's
       * own template shadows the editor component the column named — ARCH-278's
       * resolution order, which it recorded as the half that "compiles, lints and
       * renders perfectly while silently ignoring every consumer template" when it
       * is written the other way round. Reversing these two lines is exactly that
       * failure.
       */
      cellTemplate(columnId: string): NgeCellTemplate | null {
        return (
          store.cellTemplateById().get(columnId) ?? store.editorTemplateById().get(columnId) ?? null
        );
      },

      /**
       * Propose a value for one cell and close its editor.
       *
       * ⚠️ **Nothing is written.** `config.data` belongs to the host, so this
       * announces the patch as `edit-intent` and stops — the contract ARCH-271
       * established for `fill-intent`, extended to editing rather than re-decided.
       * `previousValue` rides along so a host can reverse the edit without having
       * had to build its own before-image first.
       */
      commitCellEdit,

      /**
       * Whether anything at all is registered for a slot.
       *
       * Distinct from `slotTemplate(name)` returning non-null, because a slot can
       * be filled per column and have no shared template — which is the normal
       * shape for `footer-cell`, and exactly the case that decides whether the
       * footer band is rendered at all.
       */
      hasSlot(name: NgeTableSlotName): boolean {
        return store.slotRegistry().has(name);
      },

      /** The outlet context for `header-cell`, `header-overlay`, and `footer-cell`. */
      headerSlotContext(header: Header<unknown, unknown>): { $implicit: NgeHeaderContext } {
        return { $implicit: toNgeHeaderContext(header) };
      },

      /** A click landed on a row. */
      rowClicked(row: Row<unknown>): void {
        store.emitTableEvent({
          kind: 'row-click',
          row: toNgeRowContext(row, () => store.toggleRowExpansion(row)),
        });
      },

      /** The outlet context for `row-detail`. */
      rowSlotContext(row: Row<unknown>): { $implicit: NgeRowContext<unknown> } {
        return { $implicit: toNgeRowContext(row, () => store.toggleRowExpansion(row)) };
      },

      /**
       * The template registered at one slot, narrowed to a column where the slot
       * is addressed that way. `null` when nothing is registered.
       */
      slotTemplate(name: NgeTableSlotName, columnId?: string): NgeTableSlotTemplate | null {
        return ngeTableSlotTemplateFor(store.slotRegistry(), name, columnId);
      },
    }))
  );
}
