import type { NgeTableState } from '../nge-table-state';
import type { NgeTableEvent } from './nge-table-event';

/**
 * Which state slice announces itself as which event, and with what payload.
 *
 * A **lookup table, not a switch.** Nothing in the emission path branches on a
 * kind: the store resolves an entry and hands whatever it returns to the sink, so
 * adding an event for a slice is one line here plus a member on
 * {@link NgeTableEvent} — the two-step the epic's extensibility gate audits.
 *
 * The builders take the *resulting* state rather than the changed slice alone, so
 * an event can carry more than the one field that moved: `filter-change` reports
 * both filter slices whichever of them changed, because a listener reacting to
 * "the visible rows may have moved" does not care which it was.
 *
 * Typed `NgeTableEvent<never>` because nothing state-derived carries a row —
 * `never` is the row shape that is assignable to every `NgeTableEvent<TRow>`,
 * which is what lets these entries flow out through any table's output without a
 * cast.
 *
 * ⚠️ **`columnSizing` is deliberately absent, and that absence is the throttling
 * contract.** A drag writes it on every `pointermove` — that is what makes the
 * column follow the pointer — so an entry here would emit sixty events a second
 * for one gesture. `column-resize` is emitted from the *commit* sites instead
 * (`endColumnResize`, `nudgeColumnSize`, `resetColumnSize`), which also happen to
 * be the only places that know which column moved. A spec pins the absence.
 *
 * `columnVisibility` is absent for a different reason — scope, not design. Its
 * feature is a later story, and it brings its own event kind when it lands, exactly
 * as `expanded` did in ARCH-298.
 */
export const NGE_TABLE_STATE_EVENT_BY_SLICE: Partial<{
  [TKey in keyof NgeTableState]: (state: NgeTableState) => NgeTableEvent<never>;
}> = {
  columnFilters: state => ({
    columnFilters: state.columnFilters,
    globalFilter: state.globalFilter,
    kind: 'filter-change',
  }),
  columnOrder: state => ({ columnOrder: state.columnOrder, kind: 'column-reorder' }),
  columnPinning: state => ({ columnPinning: state.columnPinning, kind: 'column-pin' }),
  expanded: state => ({ expanded: state.expanded, kind: 'expansion-change' }),
  globalFilter: state => ({
    columnFilters: state.columnFilters,
    globalFilter: state.globalFilter,
    kind: 'filter-change',
  }),
  pagination: state => ({ kind: 'pagination-change', pagination: state.pagination }),
  rowSelection: state => ({ kind: 'selection-change', rowSelection: state.rowSelection }),
  sorting: state => ({ kind: 'sort-change', sorting: state.sorting }),
};

/**
 * Whether two values of a state slice are the same **by value**.
 *
 * Reference identity is not enough, and the case that proves it is the engine's
 * own. `_autoResetPageIndex` runs whenever the core, sorted, filtered, or grouped
 * row model rebuilds (`table-core/src/utils/getSortedRowModel.ts:118` and its
 * three siblings) and calls `resetPageIndex()` — which writes a **new**
 * `pagination` object holding the values it already held. So every sort on an
 * unpaginated table would announce a `pagination-change` that changed nothing,
 * and a consumer's log would fill with an event for a feature the table has not
 * even wired.
 *
 * A value comparison is well-defined here precisely because `NgeTableState` is
 * JSON by construction — every slice is a primitive, an array, or a plain object
 * of those, and `nge-table-state.spec.ts` asserts the round trip. Arrays compare
 * in order (a sort stack is ordered); objects compare by key set (a
 * `columnSizing` map is not).
 */
function isSameSliceValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((entry, index) => isSameSliceValue(entry, b[index]))
    );
  }

  const keys = Object.keys(a);
  const other = b as Record<string, unknown>;

  return (
    keys.length === Object.keys(b).length &&
    keys.every(
      key =>
        Object.prototype.hasOwnProperty.call(other, key) &&
        isSameSliceValue((a as Record<string, unknown>)[key], other[key])
    )
  );
}

/**
 * The event a change to one state slice should announce, or `null` when there is
 * nothing to announce.
 *
 * `null` is an ordinary answer rather than an oversight, and it has two causes.
 * The slice may have no entry in {@link NGE_TABLE_STATE_EVENT_BY_SLICE} — it is
 * either commit-driven (`columnSizing`) or belongs to a feature that has not
 * shipped. Or the "change" may have left the value where it was, which is the
 * engine rewriting a slice rather than a user moving it; see
 * {@link isSameSliceValue}.
 *
 * Both questions live here rather than in the store because both are answers
 * about the *event*, not about the state: the state is written either way.
 */
export function ngeTableStateEventFor(
  key: keyof NgeTableState,
  previous: NgeTableState,
  next: NgeTableState
): NgeTableEvent<never> | null {
  if (isSameSliceValue(previous[key], next[key])) {
    return null;
  }

  return NGE_TABLE_STATE_EVENT_BY_SLICE[key]?.(next) ?? null;
}
