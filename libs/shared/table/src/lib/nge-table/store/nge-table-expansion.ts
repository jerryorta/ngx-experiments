import type { NgeTableColumn } from '../../nge-table-column';
import type { NgeTableExpanded } from '../../nge-table-state';

import { NGE_TABLE_DEFAULTS } from '../../nge-table-defaults';

/**
 * The id of the expansion column the library injects.
 *
 * Namespaced for the reason {@link NGE_TABLE_SELECTION_COLUMN_ID} is: this column
 * shares an id space with the consumer's own, and a table whose data happens to
 * carry an `expand` field would otherwise render disclosure controls where its
 * values should be.
 *
 * Exported because a consumer legitimately needs it — to pin the column to an
 * edge, to exclude it from an export, or to assert against it in a test.
 */
export const NGE_TABLE_EXPANSION_COLUMN_ID = 'nge-table-expansion';

/**
 * The leading disclosure column, built once per options rebuild.
 *
 * A **display column** — no accessor, no value — because what it renders is not
 * data. Its control is markup in `<nge-table>`'s own template rather than a `cell`
 * renderer here, the same arrangement the selection checkbox, the sort indicator
 * and the resize grip use: they are the library's built-in affordances, and routing
 * them through ARCH-246's consumer-facing template registry would put a
 * library-owned control into the seam consumers project into.
 *
 * `minSize` and `maxSize` are pinned to the same value as `size` deliberately. The
 * engine clamps inside `column.getSize()`, so equal bounds fix the width at the
 * level the *renderer* reads rather than only at the level of the affordance —
 * belt and braces alongside `enableResizing: false`.
 */
export function createNgeExpansionColumn(): NgeTableColumn<unknown> {
  return {
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    // Empty rather than absent: the header cell renders the expand-all control in
    // its place, and a label here would be read out alongside that control's own.
    header: '',
    id: NGE_TABLE_EXPANSION_COLUMN_ID,
    maxSize: NGE_TABLE_DEFAULTS.expansionColumnWidth,
    minSize: NGE_TABLE_DEFAULTS.expansionColumnWidth,
    size: NGE_TABLE_DEFAULTS.expansionColumnWidth,
  };
}

/**
 * Whether `state.expanded` names this row.
 *
 * ⚠️ **The `true` shorthand is the whole reason this exists.** `NgeTableExpanded`
 * is `Record<string, boolean> | true`, and `true` means *everything* — the engine's
 * own convention, kept because expand-all over ten thousand rows should not have to
 * materialise ten thousand map entries. Reading the slice as a plain `Record` is a
 * type error the compiler catches, and a silent "nothing is expanded" for anyone
 * who casts past it.
 *
 * The engine answers the same question through `row.getIsExpanded()`, which is what
 * the render path uses. This exists for the paths that have only a **row id** and no
 * `Row` — chiefly the virtualizer's `estimateSize`, which is asked for a size at an
 * index while the row it describes is precisely the one not yet rendered.
 */
export function isNgeRowIdExpanded(expanded: NgeTableExpanded, rowId: string): boolean {
  return expanded === true || expanded[rowId] === true;
}

/**
 * Whether any row is expanded at all.
 *
 * The cheap guard in front of the virtualizer's per-index arithmetic: with nothing
 * expanded every row is exactly `rowHeight`, which is the overwhelmingly common
 * case and the one the fixed-height fast path was written for.
 */
export function hasNgeExpandedRows(expanded: NgeTableExpanded): boolean {
  return expanded === true || Object.values(expanded).some(Boolean);
}

/**
 * How much taller than a plain row this one renders — the detail band's height, or
 * zero.
 *
 * Kept as a function over `(expanded, rowId, detailHeight)` rather than folded into
 * the virtualizer's closure so it can be unit-tested without a DOM, which is the
 * only way the geometry decision this story owns is testable at all: jsdom lays
 * nothing out, so the arithmetic is the part a spec can reach.
 */
export function ngeRowDetailOffset(
  expanded: NgeTableExpanded,
  rowId: string,
  detailHeight: number
): number {
  return isNgeRowIdExpanded(expanded, rowId) ? detailHeight : 0;
}
