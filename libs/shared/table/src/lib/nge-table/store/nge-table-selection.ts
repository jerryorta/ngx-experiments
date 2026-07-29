import type { Row } from '@tanstack/angular-table';

import type { NgeTableColumn } from '../../nge-table-column';
import type { NgeTableRowSelection } from '../../nge-table-state';

import { NGE_TABLE_DEFAULTS } from '../../nge-table-defaults';

/**
 * The id of the selection column the library injects.
 *
 * Namespaced rather than a bare `select`, because this column shares an id space
 * with the consumer's own: a table whose data happens to have a `select` field
 * would otherwise collide, and the failure would be a column silently rendering
 * checkboxes instead of its values. The `nge-` prefix is the same insulation the
 * rest of the library's owned names carry.
 *
 * Exported because a consumer legitimately needs it — to pin the column to an
 * edge, to exclude it from an export, or to assert against it in a test.
 */
export const NGE_TABLE_SELECTION_COLUMN_ID = 'nge-table-selection';

/**
 * The modifier keys a click carried, as the selection gesture reads them.
 *
 * A narrow structural type rather than the `MouseEvent` itself, so the store's
 * gesture logic can be exercised without synthesising DOM events — and so the
 * component keeps its usual role of translating an event into an intent. `metaKey`
 * and `ctrlKey` are both carried because the additive modifier is cmd on macOS and
 * ctrl elsewhere, and the table has no business deciding which platform it is on.
 */
export interface NgeTableSelectionModifiers {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

/**
 * The leading checkbox column, built once per options rebuild.
 *
 * A **display column** — no accessor, no value — because what it renders is not
 * data. Its checkboxes are markup in `<nge-table>`'s own template rather than a
 * `cell` renderer here, for the same reason the sort indicator and the resize grip
 * are: they are the library's built-in affordances, and routing them through
 * ARCH-246's consumer-facing template registry would put a library-owned control
 * into the seam consumers project into.
 *
 * `minSize` and `maxSize` are pinned to the same value as `size` deliberately. The
 * engine clamps inside `column.getSize()`, so equal bounds make the width fixed at
 * the level the *renderer* reads, not merely at the level of the affordance —
 * belt and braces alongside `enableResizing: false`, and the same
 * gate-the-effect-not-the-affordance discipline the rest of this epic applies.
 */
export function createNgeSelectionColumn(): NgeTableColumn<unknown> {
  return {
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    // Empty rather than absent: the header cell renders the select-all checkbox in
    // its place, and a label here would be read out alongside the checkbox's own.
    header: '',
    id: NGE_TABLE_SELECTION_COLUMN_ID,
    maxSize: NGE_TABLE_DEFAULTS.selectionColumnWidth,
    minSize: NGE_TABLE_DEFAULTS.selectionColumnWidth,
    size: NGE_TABLE_DEFAULTS.selectionColumnWidth,
  };
}

/**
 * The row ids a shift-click covers, from the anchor to the row just clicked.
 *
 * ⚠️ **`rows` must be the PROCESSED row model** — `table.getRowModel().rows`,
 * post-filter and post-sort. Taking the range from `config.data` would mean
 * shift-clicking after a sort selects whatever happened to sit between the two
 * rows in the *source* order, which is not what the user has in front of them.
 * The range is a pair of endpoints resolved against the current view, exactly as
 * ARCH-250's highlight ranges are, and it follows the same reading: a re-sort
 * re-shapes the block while the endpoints follow their records.
 *
 * Rows that cannot be selected are dropped. The engine applies `getCanSelect()`
 * inside `mutateRowIsSelected`, but a range is written as one
 * `applyTableStateChange` rather than N `toggleSelected` calls — one state write
 * and one event for one gesture — so the capability check has to be applied here
 * instead of inherited.
 *
 * With no anchor (the first gesture of a table's life) the range degenerates to
 * the clicked row alone, which is what a user who shift-clicks into an empty
 * selection means. An anchor that is no longer in the row model — filtered away,
 * or belonging to data that has since been replaced — is treated the same way,
 * rather than throwing or silently selecting from row zero.
 */
export function ngeSelectionRangeIds(
  rows: readonly Row<unknown>[],
  anchorRowId: null | string,
  focusRowId: string
): string[] {
  const focusIndex = rows.findIndex(row => row.id === focusRowId);

  if (focusIndex === -1) {
    return [];
  }

  const anchorIndex = anchorRowId === null ? -1 : rows.findIndex(row => row.id === anchorRowId);

  const [start, end] =
    anchorIndex === -1
      ? [focusIndex, focusIndex]
      : [Math.min(anchorIndex, focusIndex), Math.max(anchorIndex, focusIndex)];

  return rows
    .slice(start, end + 1)
    .filter(row => row.getCanSelect())
    .map(row => row.id);
}

/**
 * A selection holding exactly these rows.
 *
 * Absent ids rather than `false` values, matching what the engine writes: `delete`
 * is how `mutateRowIsSelected` deselects, `getIsSelected` tests truthiness, and a
 * map full of `false` would grow without bound across a session and persist that
 * way into a saved view.
 */
export function ngeSelectionOf(rowIds: readonly string[]): NgeTableRowSelection {
  const selection: NgeTableRowSelection = {};

  for (const rowId of rowIds) {
    selection[rowId] = true;
  }

  return selection;
}

/**
 * The same selection with one row added or removed — the cmd/ctrl-click path.
 *
 * A copy rather than a mutation, because the object being changed is the one the
 * host is holding and may already have persisted.
 */
export function ngeSelectionToggled(
  selection: NgeTableRowSelection,
  rowId: string,
  selected: boolean
): NgeTableRowSelection {
  const next = { ...selection };

  if (selected) {
    next[rowId] = true;
  } else {
    delete next[rowId];
  }

  return next;
}
