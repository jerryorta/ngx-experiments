import type { Column, Row, RowData, Table, TableFeature } from '@tanstack/angular-table';

import { makeStateUpdater } from '@tanstack/angular-table';

import type { NgeCellContext } from '../slots';
import type { NgeHighlightRowOrder, NgeHighlightState } from './nge-highlight-state';

import {
  clearNgeHighlight,
  createNgeHighlightState,
  extendNgeHighlightToCell,
  isNgeCellHighlighted,
  normalizeNgeHighlightState,
  parseNgeHighlightCellKey,
  toggleNgeHighlightCell,
} from './nge-highlight-state';

declare module '../nge-table-state' {
  /**
   * The highlight slice on the **host-owned** state.
   *
   * Targets this module rather than the `@nge/table` barrel because a
   * library cannot import its own barrel — see `NgeTableState`'s own § Addon
   * slices, which also covers the specifier an addon outside this library uses.
   */
  interface NgeTableState {
    ngeHighlight?: NgeHighlightState;
  }
}

declare module '@tanstack/table-core' {
  /**
   * The same slice on the **engine's** state.
   *
   * Declared twice on purpose, and it is not duplication. `NgeTableState` and
   * TanStack's `TableState` are deliberately separate types that happen to be
   * structurally identical (see `NgeTableState`'s own note on why it is declared
   * rather than aliased); an addon slice has to exist on both for the same reason
   * every built-in slice does — the host reads and writes one, the engine reads the
   * other, and `buildTableOptions` is the single point where they meet.
   *
   * ⚠️ Optional on both sides. `createNgeTableState()` cannot know about an
   * addon's slice, so a host that builds its state the documented way hands in a
   * state where this is `undefined` — which is exactly what the updaters below are
   * given on the first interaction.
   */
  interface TableState {
    ngeHighlight?: NgeHighlightState;
  }

  interface Table<TData extends RowData> {
    /** Drop every mark. Whatever a "clear highlighting" control should call. */
    clearNgeHighlight: () => void;
    /**
     * A predicate over highlighted cells, shaped for the export seam.
     *
     * **This is the whole of the ARCH-251 composition, and it is deliberately
     * anonymous in both directions.** `readNgeExportData({ cellPredicate })` takes
     * exactly this signature and never learns that highlighting exists; this addon
     * never imports the export seam. The two compose because both hold the table.
     *
     * ```ts
     * table.readNgeExportData({ cellPredicate: table.ngeHighlightPredicate() });
     * ```
     *
     * Returns a fresh closure per call, capturing the row order once — so a
     * 10,000-row export resolves ranges against one map rather than rebuilding it
     * per cell.
     */
    ngeHighlightPredicate: () => (cell: NgeCellContext<TData>) => boolean;
    /** The current slice, normalised. Never `undefined`. */
    readNgeHighlightState: () => NgeHighlightState;
    /**
     * Write the slice, through the engine's own updater plumbing.
     *
     * `makeStateUpdater` → `table.setState` → `options.onStateChange`, which
     * `buildTableOptions` routes into the host's state. Public because a toolbar
     * outside any cell legitimately needs it; the cell-level methods below are the
     * ergonomic path.
     */
    writeNgeHighlight: (updater: (state: NgeHighlightState) => NgeHighlightState) => void;
  }

  // `TData` / `TValue` are unused by the members below but cannot be dropped or
  // renamed: TypeScript requires every declaration of an interface to carry
  // *identical* type parameters (TS2428), names included, or the merge is rejected
  // outright. The engine's `Cell` is generic; this augmentation therefore has to be
  // too, whether or not it has anything to say about the payload.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Cell<TData extends RowData, TValue> {
    /**
     * Extend the block from the anchor to this cell — the shift-click path.
     *
     * Spans every column between the anchor's and this one **in visual order**,
     * which is the order the three lanes are drawn in and therefore the block the
     * user sees themselves dragging out. Reading declaration order instead would
     * make a pinned column produce a block with a hole in it.
     */
    extendNgeHighlight: () => void;
    /** Whether this cell is currently marked, by either enumeration or descriptor. */
    isNgeHighlighted: () => boolean;
    /** Add or remove this cell, and make it the anchor — the plain-click path. */
    toggleNgeHighlight: () => void;
  }
}

/**
 * Row order, cached against the row-model array it describes.
 *
 * The same trick — and the same justification — as `NgeTableStore`'s cell-context
 * cache. `isNgeHighlighted` runs once per rendered cell, and a range needs a row
 * id → position lookup to resolve its endpoints; rebuilding that map per cell would
 * be O(rows) per cell. The engine memoises the row model array, so its identity is
 * a sound cache key: anything that reorders or refilters the rows produces a new
 * array, and a stale entry has nothing to be stale against.
 */
const rowOrderCache = new WeakMap<object, NgeHighlightRowOrder>();

function ngeHighlightRowOrder<TData extends RowData>(table: Table<TData>): NgeHighlightRowOrder {
  const rows = table.getRowModel().rows;
  const cached = rowOrderCache.get(rows);

  if (cached) {
    return cached;
  }

  const order = new Map(rows.map((row, index) => [row.id, index]));
  rowOrderCache.set(rows, order);

  return order;
}

/**
 * The visible leaf columns in the order they are drawn, across the three lanes.
 *
 * Same composition as the export seam's `visibleColumnsInVisualOrder` and the
 * store's `columnIndexById`, and duplicated here rather than imported for the
 * reason the gate exists: an addon that reached into the core for a helper would
 * be coupling to it, and the whole claim being tested is that it need not.
 */
function visibleColumnsInVisualOrder<TData extends RowData>(
  table: Table<TData>
): Column<TData, unknown>[] {
  return [
    ...table.getLeftVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getRightVisibleLeafColumns(),
  ];
}

/** Every column id between two columns in visual order, inclusive, either way round. */
function columnIdsBetween<TData extends RowData>(
  table: Table<TData>,
  fromColumnId: string,
  toColumnId: string
): string[] {
  const columns = visibleColumnsInVisualOrder(table);
  const from = columns.findIndex(column => column.id === fromColumnId);
  const to = columns.findIndex(column => column.id === toColumnId);

  // An anchor whose column has since been hidden leaves the block one-dimensional
  // rather than guessing at an edge it no longer has.
  if (from === -1 || to === -1) {
    return [toColumnId];
  }

  return columns.slice(Math.min(from, to), Math.max(from, to) + 1).map(column => column.id);
}

/**
 * Cell highlighting — a `TableFeature` addon, and the epic's extensibility gate.
 *
 * ```ts
 * @Component({ providers: [provideNgeTableFeatures(ngeCellHighlighting)], … })
 * ```
 *
 * It exists to be *built after the core was declared done*, spanning three of the
 * four extension axes at once — behaviour/state here, cell styling through the
 * `cell-overlay` render slot, and export composition through
 * `ngeHighlightPredicate`. Nothing in this file imports the export seam, nothing
 * in the export seam knows this file exists, and neither the entry component nor
 * its store names highlighting anywhere.
 *
 * ⚠️ **`config.getRowId` stops being optional once this is switched on.** Every
 * mark is keyed by `getRowId(row)`, so without one the engine keys rows by array
 * index and a sort, a filter, or a re-fetch silently moves the user's highlights
 * onto different records — the failure that reads as data corruption rather than as
 * a bug. Surviving a virtualized scroll is the easy half and falls out of
 * re-deriving from state; surviving a row-model rebuild is what `getRowId` buys.
 *
 * ⚠️ **No member here may be named `get*`.** `@tanstack/angular-table` proxies the
 * instance and turns every `get*` accessor into a computed: a zero-arity one becomes
 * a `Signal` that swallows its arguments, and a higher-arity one is cached by
 * `JSON.stringify(args)` where a function serialises to `{}`. `readNgeExportData`
 * is named the way it is for the same reason, and so are the four members above.
 */
export const ngeCellHighlighting: TableFeature = {
  createCell: <TData extends RowData, TValue>(
    cell: unknown,
    column: Column<TData, TValue>,
    row: Row<TData>,
    table: Table<TData>
  ): void => {
    const target = cell as {
      extendNgeHighlight: () => void;
      isNgeHighlighted: () => boolean;
      toggleNgeHighlight: () => void;
    };

    target.isNgeHighlighted = () =>
      isNgeCellHighlighted(
        table.readNgeHighlightState(),
        row.id,
        column.id,
        ngeHighlightRowOrder(table)
      );

    target.toggleNgeHighlight = () => {
      table.writeNgeHighlight(state =>
        toggleNgeHighlightCell(state, row.id, column.id, ngeHighlightRowOrder(table))
      );
    };

    target.extendNgeHighlight = () => {
      table.writeNgeHighlight(state => {
        if (!state.anchor) {
          return state;
        }

        const { columnId: anchorColumnId } = parseNgeHighlightCellKey(state.anchor);

        return extendNgeHighlightToCell(
          state,
          row.id,
          columnIdsBetween(table, anchorColumnId, column.id)
        );
      });
    };
  },

  createTable: <TData extends RowData>(table: Table<TData>): void => {
    // The engine's own helper rather than a hand-rolled `setState` call, so a
    // value-versus-callback updater resolves with exactly the engine's semantics.
    // Built once per table, not once per cell — there are seventy thousand of those
    // in the virtualization fixture.
    const write = makeStateUpdater('ngeHighlight', table);

    table.readNgeHighlightState = () =>
      normalizeNgeHighlightState(table.getState().ngeHighlight);

    // Reading through `getState()` is how every built-in feature reads its slice,
    // and it is not the thing the controlled-state contract forbids: `options.state`
    // IS the host's state, handed in on every recompute. What the contract rules out
    // is the *library* treating the instance as the source of truth, which is why the
    // write below goes out through `onStateChange` rather than staying in here.
    // Skips a write whose result is unchanged. `makeStateUpdater` allocates a new
    // top-level state object every time it runs, so without this an updater that
    // decided to do nothing — `clearNgeHighlight` on an unmarked table,
    // `extendNgeHighlightToCell` with no anchor — would still churn `tableState` and
    // emit a `stateChange`. That is what lets `Escape` be wired unconditionally.
    table.writeNgeHighlight = updater => {
      const current = table.readNgeHighlightState();

      if (updater(current) !== current) {
        write(state => updater(normalizeNgeHighlightState(state)));
      }
    };

    table.clearNgeHighlight = () => {
      table.writeNgeHighlight(clearNgeHighlight);
    };

    table.ngeHighlightPredicate = () => {
      const state = table.readNgeHighlightState();
      const rowOrder = ngeHighlightRowOrder(table);

      return cell => isNgeCellHighlighted(state, cell.rowId, cell.columnId, rowOrder);
    };
  },

  /**
   * Seeds the engine's `initialState`, which is what the Angular adapter's internal
   * state signal starts from — so a cell can ask whether it is highlighted before
   * the host has ever written the slice.
   *
   * It does **not** reach `NgeTableState`: the host owns that, and the library does
   * not write to a host's object uninvited. That asymmetry is why every updater
   * normalises rather than assuming this ran.
   */
  getInitialState: (state): Record<string, unknown> => ({
    ngeHighlight: createNgeHighlightState(),
    ...state,
  }),
};
