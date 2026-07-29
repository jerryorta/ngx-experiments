import type { Column, Row, RowData, Table, TableFeature } from '@tanstack/angular-table';

import type { NgeCellContext } from '../slots';
import type {
  NgeRangeColumnOrder,
  NgeRangeRowOrder,
  NgeRangeState,
  NgeRangeStep,
} from './nge-range-state';

import {
  clearNgeRange,
  createNgeRangeState,
  extendNgeColumnRangeTo,
  extendNgeRangeTo,
  isNgeCellInRange,
  isNgeColumnSelected,
  normalizeNgeRangeState,
  setNgeRange,
  startNgeColumnRange,
  startNgeRange,
  stepNgeRangeFocus,
  toggleNgeColumnRange,
} from './nge-range-state';

declare module '../nge-table-state' {
  /**
   * The cell-range slice on the **host-owned** state.
   *
   * Targets this module rather than the `@nge/table` barrel because a
   * library cannot import its own barrel — see `NgeTableState`'s own § Addon
   * slices, which also covers the specifier an addon outside this library uses.
   */
  interface NgeTableState {
    ngeRange?: NgeRangeState;
  }
}

declare module '@tanstack/table-core' {
  /**
   * The same slice on the **engine's** state.
   *
   * Declared twice on purpose, and it is not duplication. `NgeTableState` and
   * TanStack's `TableState` are deliberately separate types that happen to be
   * structurally identical; an addon slice has to exist on both for the same reason
   * every built-in slice does — the host reads and writes one, the engine reads the
   * other, and `buildTableOptions` is the single point where they meet.
   *
   * ⚠️ Optional on both sides. `createNgeTableState()` cannot know about an
   * addon's slice, so a host that builds its state the documented way hands in a
   * state where this is `undefined` — which is exactly what the updaters below are
   * given on the first interaction.
   */
  interface TableState {
    ngeRange?: NgeRangeState;
  }

  interface Table<TData extends RowData> {
    /** Drop every rectangle. Whatever a "clear selection" control should call. */
    clearNgeRange: () => void;
    /**
     * Move the active rectangle's focus by one cell — the `Shift`+arrow path.
     *
     * Positions are resolved against the **current** view on every call: the
     * processed row model for rows, the visible leaf columns in visual order for
     * columns. So an arrow means "one row down the table as it stands", and after a
     * sort that is a different record than it was before.
     *
     * It funnels into the same extension shift-click and drag use, so the anchor
     * stays put and the three entry points cannot drift apart. Clamped at the ends;
     * a no-op when nothing is selected.
     */
    extendNgeRangeByStep: (step: NgeRangeStep) => void;
    /**
     * A predicate over selected cells, shaped for the export seam (ARCH-248).
     *
     * **Anonymous in both directions, and that is the composition.**
     * `readNgeExportData({ cellPredicate })` takes exactly this signature and never
     * learns that cell ranges exist; nothing in this file imports the export seam.
     * The two compose because both hold the table.
     *
     * ```ts
     * table.readNgeExportData({ cellPredicate: table.ngeRangePredicate() });
     * ```
     *
     * Returns a fresh closure per call, capturing the state and both order maps
     * once — so a 10,000-row export resolves every rectangle against one pair of
     * maps rather than rebuilding them per cell.
     */
    ngeRangePredicate: () => (cell: NgeCellContext<TData>) => boolean;
    /** The current slice, normalised. Never `undefined`. */
    readNgeRangeState: () => NgeRangeState;
    /**
     * Select every cell of the current view — the cmd/ctrl-A path.
     *
     * "Current view" is the **processed** row model and the visible leaf columns in
     * visual order, so it takes what the user can reach by scrolling rather than
     * what the source data holds. A table with no rows or no columns writes nothing.
     */
    selectAllNgeRange: () => void;
    /**
     * Write the slice, through the engine's own updater plumbing.
     *
     * `table.setState` → `options.onStateChange`, which `buildTableOptions` routes
     * into the host's state. Public because a toolbar outside any cell legitimately
     * needs it; the cell-level methods below are the ergonomic path. The updater is
     * handed the **current** slice — see the implementation for why that is not the
     * same as reading it first.
     */
    writeNgeRange: (updater: (state: NgeRangeState) => NgeRangeState) => void;
  }

  // See the note on `Cell` below for why the unused type parameters stay.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Column<TData extends RowData, TValue> {
    /**
     * Take the contiguous span of columns from the active anchor out to this one —
     * the `shift`-click on a header strip.
     *
     * ⚠️ Unbounds the row axis of whatever was active, so extending from a cell
     * block gives full columns rather than a band. A no-op when nothing is selected;
     * the gesture layer starts a column instead.
     */
    extendNgeColumnRange: () => void;
    /**
     * Whether **every** cell of this column is selected — what tints a header.
     *
     * Deliberately not "any cell of this column", so the header band distinguishes a
     * column the user selected from one their block happens to pass through.
     */
    isNgeColumnSelected: () => boolean;
    /**
     * Select this whole column, replacing the selection — the plain header-strip
     * click.
     *
     * `{ additive: true }` is cmd/ctrl-click, which **toggles**: it adds a disjoint
     * column, or drops it when that exact column is already selected. That differs
     * from `Cell.startNgeRange`'s append-only additive path on purpose — see
     * `toggleNgeColumnRange`.
     */
    startNgeColumnRange: (options?: { additive?: boolean }) => void;
  }

  // `TData` / `TValue` are unused by the members below but cannot be dropped or
  // renamed: TypeScript requires every declaration of an interface to carry
  // *identical* type parameters (TS2428), names included, or the merge is rejected
  // outright. The engine's `Cell` is generic; this augmentation therefore has to be
  // too, whether or not it has anything to say about the payload.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Cell<TData extends RowData, TValue> {
    /**
     * Move the active rectangle's focus to this cell — the shift-click, drag, and
     * keyboard-extend path.
     *
     * The anchor stays put, so the block grows *and shrinks* as the focus moves.
     * A no-op when nothing is selected; the gesture layer starts a range instead.
     */
    extendNgeRange: () => void;
    /** Whether this cell falls inside any selected rectangle. */
    isNgeInRange: () => boolean;
    /**
     * Begin a rectangle at this cell — the plain-click path.
     *
     * `{ additive: true }` is cmd/ctrl-click: it appends a disjoint rectangle rather
     * than replacing the selection, which is what makes `ranges` an array.
     */
    startNgeRange: (options?: { additive?: boolean }) => void;
  }
}

/**
 * Row order, cached against the row-model array it describes.
 *
 * The same trick — and the same justification — as `NgeTableStore`'s cell-context
 * cache. `isNgeInRange` runs once per rendered cell, and a rectangle needs a row
 * id → position lookup to resolve its endpoints; rebuilding that map per cell would
 * be O(rows) per cell, which at 10,000 rows is the difference between a table and a
 * stall. The engine memoises the row model array, so its identity is a sound cache
 * key: anything that reorders or refilters the rows produces a new array, and a
 * stale entry has nothing to be stale against.
 */
const rowOrderCache = new WeakMap<object, NgeRangeRowOrder>();

export function ngeRangeRowOrder<TData extends RowData>(table: Table<TData>): NgeRangeRowOrder {
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
 * reason the gate exists: an addon that reached into the core for a helper would be
 * coupling to it, and the whole claim being tested is that it need not. The sibling
 * addon `src/lib/highlight/nge-cell-highlighting.ts` carries its own copy for the
 * same reason — three copies of four lines is the price of the property, and the
 * duplication is deliberate rather than an oversight to be tidied away.
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

/**
 * Column id → its position in visual order.
 *
 * The column-axis counterpart of {@link ngeRangeRowOrder}, and deliberately **not
 * cached**. The row map is cached because rows reach ten thousand and the map is
 * rebuilt per cell without it; columns are bounded by what a human can look at, so
 * a fresh `Map` per call costs less than the invalidation would. And invalidating
 * it correctly is not free: the three lane accessors are individually memoised but
 * their concatenation is a new array every call, and the obvious key —
 * `getVisibleLeafColumns()` — does not change identity when `columnPinning` moves,
 * so a cache built on it would serve a stale visual order after exactly the
 * operation this addon exists to follow.
 */
export function ngeRangeColumnOrder<TData extends RowData>(
  table: Table<TData>
): NgeRangeColumnOrder {
  return new Map(visibleColumnsInVisualOrder(table).map((column, index) => [column.id, index]));
}

/**
 * Fail loudly in dev when a range is written without a stable row identity.
 *
 * Without `config.getRowId` the engine keys rows by **array index**
 * (`table-core/src/core/row.ts`), so a sort, a filter, or a re-fetch leaves the
 * user's rectangle sitting on whichever records happen to occupy those positions
 * afterwards. Nothing throws, nothing renders wrong, and the table quietly reports
 * a selection of different cells than the one the user made — the ARCH-268 failure
 * that reads as data corruption rather than as a bug.
 *
 * ⚠️ **Checked on the WRITE, not at construction and not on the read.** The core's
 * equivalent (`assertSelectableRowsAreIdentified`) can throw from
 * `buildTableOptions` because `enableRowSelection` is a config field it already
 * reads; an addon has no such moment — registering the feature happens inside
 * `createTable`, where a throw escapes through the adapter's `lazyInit`
 * microtask rather than through the caller. The read path is worse still: it runs
 * once per rendered cell, so a throw there would take out the render. The first
 * write is both the earliest point reachable from a caller's own stack and the
 * exact moment a key would be minted from an index.
 *
 * Dev-only, because in production a thrown error here would take out a table over
 * a misconfiguration that has already shipped; the `ngDevMode` guard is compiled
 * out of a production build entirely.
 */
function assertRangeRowsAreIdentified<TData extends RowData>(table: Table<TData>): void {
  if (ngDevMode && !table.options.getRowId) {
    throw new Error(
      '[nge-table] Cell range selection requires `config.getRowId`. Without it the engine ' +
        'keys rows by array index, so a sort, a filter, or a re-fetch moves the selected ' +
        'range onto different records.'
    );
  }
}

/**
 * Cell range selection — a `TableFeature` addon, and the second of the two the
 * extensibility gate's seams were left open for.
 *
 * ```ts
 * @Component({ providers: [provideNgeCellRange()], … })
 * ```
 *
 * An **anchored rectangle with a focus cell**, extended by drag and by keyboard —
 * which is what distinguishes it from ARCH-250's cell highlighting, an arbitrary
 * marked *set*. The epic settled that the two coexist as independent addons over
 * one cell rather than one being re-expressed on the other: both supply a
 * `cellPredicate` to the export seam, and **neither imports the other**. Two
 * overlays on one cell is the intended composition, not an accident to be
 * reconciled.
 *
 * This file is the state and the API. The gesture — pointer drag, auto-scroll,
 * `Escape`, cmd/ctrl-A — lives in `nge-range-bridge.ts`, and the paint lives in
 * `nge-range-overlay.component.ts`. Registering this feature on its own is
 * supported and gives state plus export composition with no rendered selection.
 *
 * ⚠️ **`config.getRowId` stops being optional once this is switched on** — see
 * {@link assertRangeRowsAreIdentified}.
 *
 * ⚠️ **No member here may be named `get*`.** `@tanstack/angular-table` proxies the
 * instance and turns every `get*` accessor into a computed: a zero-arity one
 * becomes a `Signal` that swallows its arguments, and a higher-arity one is cached
 * by `JSON.stringify(args)` where a function serialises to `{}` — so two different
 * predicates would collide on one cache key and the second caller would receive the
 * first one's cells. `readNgeExportData` is named the way it is for the same
 * reason, and so are the five members above.
 */
export const ngeCellRange: TableFeature = {
  createCell: <TData extends RowData, TValue>(
    cell: unknown,
    column: Column<TData, TValue>,
    row: Row<TData>,
    table: Table<TData>
  ): void => {
    const target = cell as {
      extendNgeRange: () => void;
      isNgeInRange: () => boolean;
      startNgeRange: (options?: { additive?: boolean }) => void;
    };

    target.isNgeInRange = () =>
      isNgeCellInRange(
        table.readNgeRangeState(),
        row.id,
        column.id,
        ngeRangeRowOrder(table),
        ngeRangeColumnOrder(table)
      );

    target.startNgeRange = (options = {}) => {
      table.writeNgeRange(state => startNgeRange(state, row.id, column.id, options));
    };

    target.extendNgeRange = () => {
      table.writeNgeRange(state => extendNgeRangeTo(state, row.id, column.id));
    };
  },

  createColumn: <TData extends RowData, TValue>(
    column: Column<TData, TValue>,
    table: Table<TData>
  ): void => {
    const target = column as {
      extendNgeColumnRange: () => void;
      isNgeColumnSelected: () => boolean;
      startNgeColumnRange: (options?: { additive?: boolean }) => void;
    };

    target.isNgeColumnSelected = () =>
      isNgeColumnSelected(
        table.readNgeRangeState(),
        column.id,
        ngeRangeRowOrder(table),
        ngeRangeColumnOrder(table)
      );

    target.startNgeColumnRange = (options = {}) => {
      table.writeNgeRange(state =>
        options.additive
          ? toggleNgeColumnRange(state, column.id)
          : startNgeColumnRange(state, column.id)
      );
    };

    target.extendNgeColumnRange = () => {
      table.writeNgeRange(state => extendNgeColumnRangeTo(state, column.id));
    };
  },

  createTable: <TData extends RowData>(table: Table<TData>): void => {
    // Reading through `getState()` is how every built-in feature reads its slice,
    // and it is not the thing the controlled-state contract forbids: `options.state`
    // IS the host's state, handed in on every recompute. What the contract rules out
    // is the *library* treating the instance as the source of truth, which is why the
    // write below goes out through `setState` → `onStateChange` rather than staying
    // in here.
    //
    // ⚠️ It is only as current as the last read of the adapter's **proxy**, which is
    // what re-applies options to the raw instance (`setOptions` mutates it in place).
    // An app reads the proxy on every change-detection pass so the lag is invisible
    // there; anything holding the raw instance between renders — an addon's bridge
    // does, because `createTable` hands over the real object — must not make a
    // decision on it. See {@link writeNgeRange}.
    table.readNgeRangeState = () => normalizeNgeRangeState(table.getState().ngeRange);

    // ⚠️ **The updater is resolved INSIDE `setState`, never against a pre-read, and
    // this is load-bearing rather than stylistic.** `setState` forwards to
    // `options.onStateChange`, which `NgeTableStore.applyTableState` resolves
    // against the *store's* own state — so the `state` handed in below is always
    // current. Deciding from `readNgeRangeState()` first (the shape ARCH-250's
    // `writeNgeHighlight` uses) reads the raw instance instead, and two writes in
    // one synchronous burst then both see the same "before": a `pointerdown` that
    // starts a rectangle followed by the drag's first `pointermove` would extend a
    // range the second call could not see, and silently do nothing.
    //
    // ⚠️ **`makeStateUpdater` cannot be used here**, which is the other half of the
    // same decision: it allocates a new top-level state object unconditionally, so
    // `applyTableState`'s identity short-circuit never trips and every no-op — an
    // `Escape` on an empty table, each frame of a drag that has not left the cell it
    // is on — would patch the host's state and emit a `stateChange`. Returning the
    // same `state` reference is what makes an unchanged write cost nothing.
    table.writeNgeRange = updater => {
      table.setState(state => {
        const current = normalizeNgeRangeState(state.ngeRange);
        const next = updater(current);

        if (next === current) {
          return state;
        }

        assertRangeRowsAreIdentified(table);

        return { ...state, ngeRange: next };
      });
    };

    table.clearNgeRange = () => {
      table.writeNgeRange(clearNgeRange);
    };

    table.extendNgeRangeByStep = step => {
      // Read the two orders once per press, outside the updater. They describe the
      // view rather than the selection, so they cannot move between the read and the
      // write — unlike the slice itself, which is why that is resolved inside
      // `setState`. A held arrow key therefore repeats correctly: each repeat sees
      // the focus the previous one wrote, with no render required in between.
      const rowIds = table.getRowModel().rows.map(row => row.id);
      const columnIds = visibleColumnsInVisualOrder(table).map(column => column.id);

      table.writeNgeRange(state => stepNgeRangeFocus(state, step, rowIds, columnIds));
    };

    table.selectAllNgeRange = () => {
      const rows = table.getRowModel().rows;
      const columns = visibleColumnsInVisualOrder(table);

      if (rows.length === 0 || columns.length === 0) {
        return;
      }

      // ⚠️ **The row axis is unbounded, not the first and last row ids.** Naming
      // those two records would leave select-all anchored on them, so a sort would
      // move them and "everything" would silently shrink to whatever now lies
      // between — the exact defect the nullable endpoints (ARCH-270) exist to
      // prevent, and one this call carried until they existed.
      table.writeNgeRange(state =>
        setNgeRange(state, {
          anchorColumnId: columns[0].id,
          anchorRowId: null,
          focusColumnId: columns[columns.length - 1].id,
          focusRowId: null,
        })
      );
    };

    table.ngeRangePredicate = () => {
      const state = table.readNgeRangeState();
      const rowOrder = ngeRangeRowOrder(table);
      const columnOrder = ngeRangeColumnOrder(table);

      return cell => isNgeCellInRange(state, cell.rowId, cell.columnId, rowOrder, columnOrder);
    };
  },

  /**
   * Seeds the engine's `initialState`, which is what the Angular adapter's internal
   * state signal starts from — so a cell can ask whether it is selected before the
   * host has ever written the slice.
   *
   * It does **not** reach `NgeTableState`: the host owns that, and the library does
   * not write to a host's object uninvited. That asymmetry is why every updater
   * normalises rather than assuming this ran.
   */
  getInitialState: (state): Record<string, unknown> => ({
    ngeRange: createNgeRangeState(),
    ...state,
  }),
};
