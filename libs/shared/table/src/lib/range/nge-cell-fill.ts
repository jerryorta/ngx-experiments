import type { Column, Row, RowData, Table, TableFeature } from '@tanstack/angular-table';

import type { NgeFillPlan, NgeFillState, NgeFillTarget } from './nge-fill-state';

import { ngeRangeColumnOrder, ngeRangeRowOrder } from './nge-cell-range';
import {
  clearNgeFillTarget,
  createNgeFillState,
  isNgeCellDropping,
  isNgeCellFilling,
  normalizeNgeFillState,
  resolveNgeFillPlan,
  setNgeFillTarget,
} from './nge-fill-state';
import { computeNgeFillCells } from './nge-fill-values';
import { activeNgeCellRange, setActiveNgeCellRange } from './nge-range-state';

declare module '../nge-table-state' {
  /** The fill slice on the **host-owned** state — see `NgeRangeState`'s § Addon slices. */
  interface NgeTableState {
    ngeFill?: NgeFillState;
  }
}

declare module '@tanstack/table-core' {
  /** The same slice on the **engine's** state. Optional on both sides, as ARCH-269's is. */
  interface TableState {
    ngeFill?: NgeFillState;
  }

  // Unlike ARCH-269's `Table` augmentation, nothing here is generic over the payload —
  // a fill is expressed entirely in ids and `unknown` values. The parameter still
  // cannot be dropped: TS2428 requires every declaration of an interface to carry
  // identical type parameters, names included.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Table<TData extends RowData> {
    /** Abandon a fill without proposing anything. What `Escape` calls. */
    cancelNgeFill: () => void;
    /**
     * End the gesture and **propose** the result.
     *
     * Emits exactly one `fill-intent` carrying every cell it would change, then clears
     * the pending target. ⚠️ **It changes nothing else** — the library owns no data, so
     * a host that ignores the event sees no fill. A drag that never left the source
     * emits nothing at all rather than an empty proposal.
     */
    commitNgeFill: () => void;
    /**
     * What the in-flight drag would do — the block before and after — or `null`.
     *
     * One accessor for the whole gesture: extending, retracting, and doing both on
     * different axes at once are the same question about one rectangle.
     *
     * ⚠️ **A READ off the raw instance, so it answers as of the last time anything
     * read the adapter's proxy** — the same caveat ARCH-269 records for
     * `ngeRangePredicate`. An application reads the proxy on every change-detection
     * pass, so the paint is always current and a commit from a real `pointerup` sees a
     * real plan. A spec that never renders does not, which is why the specs here force
     * a proxy read between a write and a read. Writes have no such exposure — they
     * resolve inside `setState`.
     */
    ngeFillPlan: () => NgeFillPlan | null;
    /** Move the drag's target cell. Cheap to call per frame — an unchanged move writes nothing. */
    moveNgeFillTo: (rowId: string, columnId: string) => void;
    /** The current slice, normalised. Never `undefined`. */
    readNgeFillState: () => NgeFillState;
    /** Write the slice through the engine's own updater plumbing, as ARCH-269 does. */
    writeNgeFill: (updater: (state: NgeFillState) => NgeFillState) => void;
  }

  // See `nge-cell-range.ts` for why the unused type parameters cannot be dropped.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Cell<TData extends RowData, TValue> {
    /** Whether this cell is about to LEAVE the selection — the drag shrank past it. */
    isNgeFillDrop: () => boolean;
    /**
     * Whether this cell carries the fill handle — the active range's trailing-bottom
     * corner.
     *
     * ⚠️ **False for every cell while the active range is unbounded on the row axis**
     * (a whole column, or cmd/ctrl-A). Such a range covers every row, so it has no
     * bottom to hang a handle off and nothing below to extend into — the consequence
     * ARCH-270's nullable endpoints carry into this story.
     */
    isNgeFillHandle: () => boolean;
    /** Whether this cell would take a proposed value — the drag grew past it. */
    isNgeFillTarget: () => boolean;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    ngeFill?: NgeColumnFill;
  }
}

/**
 * A column's fill options, namespaced under `ngeFill`.
 *
 * Namespaced rather than bare for the reason ARCH-248 records: `ColumnMeta` is one
 * globally-merged interface every addon shares, so a bare field is a collision waiting
 * for the next feature.
 */
export interface NgeColumnFill {
  /**
   * Whether this column accepts a fill. Defaults to `true`.
   *
   * `false` excludes the column as a **target** while leaving it perfectly usable as a
   * source — which is what a derived or read-only column wants: its values can seed a
   * neighbour's series, but nothing may propose overwriting them.
   */
  enabled?: boolean;
}

/**
 * The fill handle's state and API — an addon on ARCH-269's range.
 *
 * Registered by `provideNgeCellRange()` alongside `ngeCellRange`, because a fill is
 * an operation *on the active range* and has no meaning without one. The pending
 * target is a slice; the values are computed once, on release, and leave through the
 * event stream as a proposal.
 *
 * ⚠️ **This feature never writes `config.data`, and must never learn how.** That is
 * the whole architectural point of ARCH-271: the host owns the rows, so the library's
 * only honest move is to announce what it would change and wait. Every existing
 * feature reads data and writes `NgeTableState`; this one reads data and writes an
 * *event*.
 *
 * ⚠️ **No member here may be named `get*`** — the adapter proxies those into computeds.
 */
export const ngeCellFill: TableFeature = {
  createCell: <TData extends RowData, TValue>(
    cell: unknown,
    column: Column<TData, TValue>,
    row: Row<TData>,
    table: Table<TData>
  ): void => {
    const target = cell as {
      isNgeFillDrop: () => boolean;
      isNgeFillHandle: () => boolean;
      isNgeFillTarget: () => boolean;
    };

    target.isNgeFillDrop = () => atCell(table, row.id, column.id, isNgeCellDropping);

    target.isNgeFillHandle = () => {
      const corner = ngeFillHandleCell(table);

      return corner !== null && corner.columnId === column.id && corner.rowId === row.id;
    };

    target.isNgeFillTarget = () => atCell(table, row.id, column.id, isNgeCellFilling);
  },

  createTable: <TData extends RowData>(table: Table<TData>): void => {
    table.readNgeFillState = () => normalizeNgeFillState(table.getState().ngeFill);

    // ⚠️ The updater resolves INSIDE `setState`, never against a pre-read — the
    // ARCH-269 finding, and it bites harder here: a fill drag is a burst of moves with
    // no render between them, which is exactly the shape that swallows a write decided
    // from a stale instance. `makeStateUpdater` is likewise ruled out; it allocates a
    // new top-level state unconditionally, so every no-op frame of the drag would
    // patch the host's state.
    table.writeNgeFill = updater => {
      table.setState(state => {
        const current = normalizeNgeFillState(state.ngeFill);
        const next = updater(current);

        return next === current ? state : { ...state, ngeFill: next };
      });
    };

    table.moveNgeFillTo = (rowId, columnId) => {
      table.writeNgeFill(state => setNgeFillTarget(state, { columnId, rowId }));
    };

    table.cancelNgeFill = () => {
      table.writeNgeFill(clearNgeFillTarget);
    };

    table.ngeFillPlan = () => {
      const source = activeNgeCellRange(table.readNgeRangeState());

      return source === null
        ? null
        : resolveNgeFillPlan(
            source,
            table.readNgeFillState().target,
            ngeRangeRowOrder(table),
            ngeRangeColumnOrder(table)
          );
    };

    table.commitNgeFill = () => {
      const plan = table.ngeFillPlan();

      // Read the plan BEFORE clearing, and clear unconditionally: a drag that went
      // nowhere still has a target to drop, it just has nothing to do.
      table.cancelNgeFill();

      if (plan === null) {
        return;
      }

      const rows = table.getRowModel().rows;
      const rowIds = rows.map(row => row.id);
      const columnIds = [...ngeRangeColumnOrder(table).keys()];

      // One pass over the row model rather than a `find` per cell. A fill down a
      // 10,000-row table reads every row it covers, and the linear lookup would make
      // that quadratic.
      const byId = new Map(rows.map(row => [row.id, row]));

      const cells = computeNgeFillCells(
        plan,
        rowIds,
        columnIds,
        (rowId, columnId) => byId.get(rowId)?.getValue(columnId),
        columnId => table.getColumn(columnId)?.columnDef.meta?.ngeFill?.enabled !== false
      );

      // ⚠️ **A drag that only SHRANK proposes nothing, and that is not a special
      // case** — `next \\ source` is simply empty, so the walk returns no cells and
      // there is nothing to announce. Shrinking is pure interaction state; a
      // spreadsheet's extra step of clearing the cells dragged over is deliberately not
      // taken, because what "cleared" means belongs to a host's schema.
      if (cells.length > 0) {
        table.emitNgeTableEvent({
          cells,
          kind: 'fill-intent',
          sourceColumnIds: columnIds.slice(plan.source.columnFrom, plan.source.columnTo + 1),
          sourceRowIds: rowIds.slice(plan.source.rowFrom, plan.source.rowTo + 1),
        });
      }

      // ⚠️ **The selection becomes the new block**, whether the drag grew it, shrank it,
      // or did both on different axes — so the grip lands on the new corner and a second
      // drag continues from there without re-selecting.
      //
      // This DOES move the rectangle's anchor, which every other operation is careful
      // not to do; a fill reshapes the block rather than re-aiming it, and leaving the
      // anchor put would strand it inside the new rectangle instead of on a corner.
      //
      // ⚠️ Interaction state, not a claim about data. The host may ignore the intent
      // entirely — that is the contract — and the user still made this gesture.
      table.writeNgeRange(state =>
        setActiveNgeCellRange(state, {
          anchorColumnId: columnIds[plan.next.columnFrom],
          anchorRowId: rowIds[plan.next.rowFrom],
          focusColumnId: columnIds[plan.next.columnTo],
          focusRowId: rowIds[plan.next.rowTo],
        })
      );
    };
  },

  /** Seeds the engine's `initialState`, as ARCH-269's feature does. It never reaches the host's. */
  getInitialState: (state): Record<string, unknown> => ({
    ngeFill: createNgeFillState(),
    ...state,
  }),
};

/**
 * Answer a plan predicate for one cell, resolving its ids to view positions.
 *
 * Shared by `isNgeFillTarget` and `isNgeFillDrop` so "where is this cell relative to
 * the plan" is computed one way; only the predicate differs.
 */
function atCell<TData extends RowData>(
  table: Table<TData>,
  rowId: string,
  columnId: string,
  predicate: (plan: NgeFillPlan | null, rowIndex: number, columnIndex: number) => boolean
): boolean {
  const rowIndex = ngeRangeRowOrder(table).get(rowId);
  const columnIndex = ngeRangeColumnOrder(table).get(columnId);

  return (
    rowIndex !== undefined &&
    columnIndex !== undefined &&
    predicate(table.ngeFillPlan(), rowIndex, columnIndex)
  );
}

/**
 * The cell the handle belongs on — the active range's trailing-bottom corner in the
 * current view, or `null` when there is no eligible range.
 *
 * Exported because the bridge needs the same answer to decide whether a pointerdown
 * landed on a handle, and two definitions of "the corner" would eventually disagree.
 */
export function ngeFillHandleCell<TData extends RowData>(
  table: Table<TData>
): NgeFillTarget | null {
  const active = activeNgeCellRange(table.readNgeRangeState());

  if (active === null || active.anchorRowId === null || active.focusRowId === null) {
    return null;
  }

  const rowOrder = ngeRangeRowOrder(table);
  const columnOrder = ngeRangeColumnOrder(table);

  const anchorRow = rowOrder.get(active.anchorRowId);
  const focusRow = rowOrder.get(active.focusRowId);
  const anchorColumn = columnOrder.get(active.anchorColumnId);
  const focusColumn = columnOrder.get(active.focusColumnId);

  if (
    anchorRow === undefined ||
    focusRow === undefined ||
    anchorColumn === undefined ||
    focusColumn === undefined
  ) {
    return null;
  }

  const rowIds = [...rowOrder.keys()];
  const columnIds = [...columnOrder.keys()];

  return {
    columnId: columnIds[Math.max(anchorColumn, focusColumn)],
    rowId: rowIds[Math.max(anchorRow, focusRow)],
  };
}
