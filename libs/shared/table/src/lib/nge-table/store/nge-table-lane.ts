import type { Cell, Header } from '@tanstack/angular-table';

/**
 * Which of the three lanes a row is divided into.
 *
 * The substrate is three flex lanes per row, and **pinning is `position: sticky`
 * on the lane wrapper, never per-cell**. That is the whole reason more than one
 * pinned column works here: pinned cells are ordinary flex children of a single
 * sticky box, so there is no per-cell `left` for a second pinned column to
 * collide with. The per-cell arrangement this replaces carries the opposite
 * consequence, documented in the earlier data table as *"only one sticky column
 * is supported; multiple sticky columns will overlap because they all use
 * `left: 0`"* — which is the limitation the lane substrate exists to remove.
 */
export type NgeTableLaneKind = 'center' | 'pinned-left' | 'pinned-right';

/**
 * One lane's worth of renderables, tagged with the lane it belongs to.
 *
 * Generic over the item because a header row and a body row have identical lane
 * structure and differ only in what fills them — so the template renders one
 * lane definition rather than three, and `@for`-iterates lanes instead of
 * switching on them. A fourth lane kind would be a new entry in
 * {@link toNgeTableLanes} and a CSS class, never an edit to a central branch.
 */
export interface NgeTableLane<TItem> {
  items: TItem[];
  kind: NgeTableLaneKind;
}

/** A header row, split into lanes. One entry per level of column grouping. */
export interface NgeTableHeaderRow {
  id: string;
  lanes: NgeTableLane<Header<unknown, unknown>>[];
}

/** A body row, split into lanes. */
export type NgeTableCellLane = NgeTableLane<Cell<unknown, unknown>>;

/**
 * Total width of each lane, in pixels, plus the table's full width.
 *
 * Every value comes from the engine (`table.getLeftTotalSize()` and friends),
 * never from arithmetic of our own — the engine derives them by reducing
 * `getSize()` over the visible leaf columns of that lane, so they stay correct
 * across a resize (ARCH-244) and a reorder without anything here being told.
 */
export interface NgeTableLaneWidths {
  center: number;
  left: number;
  right: number;
  total: number;
}

/**
 * Assemble the three lanes in visual order, dropping any that are empty.
 *
 * Dropping empties is what keeps the unpinned table — the overwhelmingly common
 * one — rendering exactly one wrapper per row instead of two extra zero-width
 * sticky boxes, each of which would still cost a stacking context.
 */
export function toNgeTableLanes<TItem>(
  left: TItem[],
  center: TItem[],
  right: TItem[]
): NgeTableLane<TItem>[] {
  const lanes: NgeTableLane<TItem>[] = [
    { items: left, kind: 'pinned-left' },
    { items: center, kind: 'center' },
    { items: right, kind: 'pinned-right' },
  ];

  return lanes.filter(lane => lane.items.length > 0);
}
