import type { NgeCellRange, NgeRangeColumnOrder, NgeRangeRowOrder } from './nge-range-state';

/**
 * The cell a fill drag has reached, while the gesture is in flight.
 *
 * Two ids rather than a rectangle, because the rectangle is *derived*: it is the
 * active range's own span extended to here. Storing the derived shape as well would
 * be two things to keep in step, and the second one would be the one that went stale
 * after a sort.
 */
export interface NgeFillTarget {
  columnId: string;
  rowId: string;
}

/**
 * The fill slice of {@link NgeTableState}, owned by the host like every other.
 *
 * ⚠️ **The pending region is STATE, not scratch on the bridge** — deliberately, and
 * unlike `NgeRangeBridge`'s gesture anchor. The epic locks that anything marking a
 * row, a cell, or a column is id-keyed state, and this one has to survive a scroll
 * *mid-gesture*: auto-scroll recycles the very DOM the outline is drawn over, so an
 * outline held on those elements would follow whichever rows they were recycled into.
 * Keyed by id and re-derived every render, it cannot.
 *
 * It is transient — `null` except while a drag is in flight — which is why it holds
 * a target rather than a result. Nothing here is a proposed *value*; the values are
 * computed once, on release, and leave through the event stream.
 */
export interface NgeFillState {
  /** Where the drag has reached, or `null` when no fill is in flight. */
  target: NgeFillTarget | null;
}

/** A fresh, empty fill slice, optionally seeded. */
export function createNgeFillState(overrides: Partial<NgeFillState> = {}): NgeFillState {
  return { target: null, ...overrides };
}

/**
 * Fill in a slice the host has not written yet.
 *
 * ⚠️ Every entry point goes through this, for the reason
 * `normalizeNgeRangeState` documents: `createNgeTableState()` cannot know about an
 * addon's slice, so a host building state the documented way hands in `undefined`.
 */
export function normalizeNgeFillState(state: NgeFillState | undefined): NgeFillState {
  return state ?? createNgeFillState();
}

/**
 * Move the drag's target cell.
 *
 * Returns the **same reference** when it has not moved, which is what keeps a drag
 * from churning the host's state once per frame — the same discipline
 * `extendNgeRangeTo` follows, and what `writeNgeFill`'s identity short-circuit is
 * looking for.
 */
export function setNgeFillTarget(state: NgeFillState, target: NgeFillTarget): NgeFillState {
  const current = state.target;

  if (current !== null && current.columnId === target.columnId && current.rowId === target.rowId) {
    return state;
  }

  return { ...state, target };
}

/** End the gesture. Same reference when nothing was in flight. */
export function clearNgeFillTarget(state: NgeFillState): NgeFillState {
  return state.target === null ? state : createNgeFillState();
}

/**
 * An inclusive rectangle in the current view's index space.
 *
 * Index bounds rather than ids, because every consumer wants to walk the view: the
 * paint (is this cell inside?), the value computation (which cells, in what order?),
 * and the reshape (what does the block become?).
 */
export interface NgeFillBounds {
  columnFrom: number;
  columnTo: number;
  rowFrom: number;
  rowTo: number;
}

/**
 * What one fill drag would do: the block it started as, and the block it becomes.
 *
 * ⚠️ **One concept, not two.** Extending and retracting were separate resolutions
 * until the gesture went two-dimensional, at which point they stopped being separable:
 * a single drag can grow the rows *and* shrink the columns. Expressing the whole
 * gesture as "the rectangle before, the rectangle after" makes that fall out — the
 * cells to fill are `next \ source`, the cells to drop are `source \ next`, and either
 * may be empty.
 */
export interface NgeFillPlan {
  /** The rectangle the block becomes on release. */
  next: NgeFillBounds;
  /** The rectangle it started as, which stays fixed for the whole gesture. */
  source: NgeFillBounds;
}

/**
 * Resolve a fill drag into the rectangle the block would become.
 *
 * **The grip drags the far corner; the near corner stays put.** Per axis, given the
 * near edge `n`, the far edge `f` and the target `t`, the new span is:
 *
 * | Target | New span | Reads as |
 * | --- | --- | --- |
 * | `t > f` | `[n, t]` | extend outward |
 * | `n ≤ t ≤ f` | `[n, t]` | retract |
 * | `t < n` | `[t, f]` | extend backward, past the near edge |
 *
 * The first two collapse to the same formula, which is why one rule covers grow and
 * shrink — and why the two axes can resolve **independently**, giving a genuinely
 * two-dimensional gesture. A drag that goes down and left extends the rows and retracts
 * the columns in the same movement.
 *
 * ⚠️ **The source is fixed for the whole gesture.** A drag that dips inside the block
 * and then continues out fills from where the user started, not from whatever the block
 * momentarily became — which is why the plan resolves against the original rectangle
 * and commits on release rather than following the pointer.
 *
 * ⚠️ **A row-unbounded source has no plan at all**, which is ARCH-270's consequence
 * rather than an edge case. A whole-column selection covers every row, so it has no
 * corner to drag and nothing below to extend into. The gate lives here, in the one
 * place the paint and the commit both read, so neither can disagree with the other.
 *
 * Returns `null` when nothing would change: no target, ids the view no longer holds, an
 * unbounded source, or a target already on the far corner.
 */
export function resolveNgeFillPlan(
  source: NgeCellRange,
  target: NgeFillTarget | null,
  rowOrder: NgeRangeRowOrder,
  columnOrder: NgeRangeColumnOrder
): NgeFillPlan | null {
  if (target === null || source.anchorRowId === null || source.focusRowId === null) {
    return null;
  }

  const anchorRow = rowOrder.get(source.anchorRowId);
  const focusRow = rowOrder.get(source.focusRowId);
  const anchorColumn = columnOrder.get(source.anchorColumnId);
  const focusColumn = columnOrder.get(source.focusColumnId);
  const targetRow = rowOrder.get(target.rowId);
  const targetColumn = columnOrder.get(target.columnId);

  if (
    anchorRow === undefined ||
    focusRow === undefined ||
    anchorColumn === undefined ||
    focusColumn === undefined ||
    targetRow === undefined ||
    targetColumn === undefined
  ) {
    return null;
  }

  const bounds: NgeFillBounds = {
    columnFrom: Math.min(anchorColumn, focusColumn),
    columnTo: Math.max(anchorColumn, focusColumn),
    rowFrom: Math.min(anchorRow, focusRow),
    rowTo: Math.max(anchorRow, focusRow),
  };

  const rows = spanTo(bounds.rowFrom, bounds.rowTo, targetRow);
  const columns = spanTo(bounds.columnFrom, bounds.columnTo, targetColumn);

  const next: NgeFillBounds = {
    columnFrom: columns.from,
    columnTo: columns.to,
    rowFrom: rows.from,
    rowTo: rows.to,
  };

  return sameBounds(bounds, next) ? null : { next, source: bounds };
}

/** One axis resolved — see {@link resolveNgeFillPlan}'s table. */
function spanTo(near: number, far: number, target: number): { from: number; to: number } {
  return target < near ? { from: target, to: far } : { from: near, to: target };
}

function sameBounds(a: NgeFillBounds, b: NgeFillBounds): boolean {
  return (
    a.rowFrom === b.rowFrom &&
    a.rowTo === b.rowTo &&
    a.columnFrom === b.columnFrom &&
    a.columnTo === b.columnTo
  );
}

/** Whether one cell would take a proposed value — inside the new block, outside the old. */
export function isNgeCellFilling(
  plan: NgeFillPlan | null,
  rowIndex: number,
  columnIndex: number
): boolean {
  return (
    plan !== null &&
    isNgeCellInFillRegion(plan.next, rowIndex, columnIndex) &&
    !isNgeCellInFillRegion(plan.source, rowIndex, columnIndex)
  );
}

/** Whether one cell is about to leave the selection — inside the old block, outside the new. */
export function isNgeCellDropping(
  plan: NgeFillPlan | null,
  rowIndex: number,
  columnIndex: number
): boolean {
  return (
    plan !== null &&
    isNgeCellInFillRegion(plan.source, rowIndex, columnIndex) &&
    !isNgeCellInFillRegion(plan.next, rowIndex, columnIndex)
  );
}

/** Whether one cell falls inside a rectangle — the paint's whole read path. */
export function isNgeCellInFillRegion(
  bounds: NgeFillBounds | null,
  rowIndex: number,
  columnIndex: number
): boolean {
  return (
    bounds !== null &&
    rowIndex >= bounds.rowFrom &&
    rowIndex <= bounds.rowTo &&
    columnIndex >= bounds.columnFrom &&
    columnIndex <= bounds.columnTo
  );
}
