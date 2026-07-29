import type { NgeFillBounds, NgeFillPlan } from './nge-fill-state';

import { computeNgeFillCells, ngeFillSeries } from './nge-fill-values';

const rowIds = ['row-0', 'row-1', 'row-2', 'row-3', 'row-4', 'row-5'];
const columnIds = ['name', 'status', 'quantity', 'amount'];

/** The block before and after — the whole of what a drag decides. */
function plan(source: NgeFillBounds, next: NgeFillBounds): NgeFillPlan {
  return { next, source };
}

/** Two rows of `quantity` (col 2), grown down to row 4. */
function downFrom(next: Partial<NgeFillBounds> = {}): NgeFillPlan {
  return plan(
    { columnFrom: 2, columnTo: 2, rowFrom: 0, rowTo: 1 },
    { columnFrom: 2, columnTo: 2, rowFrom: 0, rowTo: 4, ...next }
  );
}

/** Values by cell, for the reader the walk is handed. */
function readerFor(values: Record<string, unknown>): (row: string, column: string) => unknown {
  return (row, column) => values[`${row}::${column}`];
}

const allFillable = (): boolean => true;

describe('ngeFillSeries — copy', () => {
  it('repeats a single source value', () => {
    expect(ngeFillSeries([7], 3, false)).toEqual([7, 7, 7]);
  });

  it('cycles a multi-cell pattern', () => {
    expect(ngeFillSeries(['a', 'b'], 5, false)).toEqual(['a', 'b', 'a', 'b', 'a']);
  });

  // ⚠️ Backwards continues the pattern UPWARD rather than restarting on the wrong
  // side, which is what makes a repeated block read as continuous in both directions.
  // In view order the three cells above an `[a, b, c]` source therefore read `a b c`.
  it('continues a pattern upward, in view order', () => {
    expect(ngeFillSeries(['a', 'b', 'c'], 3, true)).toEqual(['a', 'b', 'c']);
  });

  it('falls back to copy when the source is not all numeric', () => {
    expect(ngeFillSeries([1, 'a'], 3, false)).toEqual([1, 'a', 1]);
  });

  // A single numeric cell is not a series — there is no second value to infer a step
  // from, so dragging one number down repeats it rather than counting.
  it('treats one number as copy, not as a series', () => {
    expect(ngeFillSeries([5], 3, false)).toEqual([5, 5, 5]);
  });

  it('produces nothing for a zero-length fill or an empty source', () => {
    expect(ngeFillSeries([1, 2], 0, false)).toEqual([]);
    expect(ngeFillSeries([], 3, false)).toEqual([]);
  });
});

describe('ngeFillSeries — linear', () => {
  it('extrapolates from two numbers', () => {
    expect(ngeFillSeries([10, 20], 3, false)).toEqual([30, 40, 50]);
  });

  it('takes the step across the whole source, not the last pair', () => {
    expect(ngeFillSeries([1, 3, 5], 2, false)).toEqual([7, 9]);
  });

  // ⚠️ Backwards changes the ARITHMETIC, not just the order: dragging up from
  // `[10, 20]` must approach zero, never continue to 30.
  it('extrapolates downward when sweeping backwards, in view order', () => {
    expect(ngeFillSeries([10, 20], 2, true)).toEqual([-10, 0]);
  });

  // Zero is a legitimate step, which is why `linearStep` answers `null` rather than
  // `0` for "not a series" — conflating them would send this down the copy path.
  it('repeats a constant source through the series path', () => {
    expect(ngeFillSeries([5, 5, 5], 2, false)).toEqual([5, 5]);
  });

  it('handles a descending source', () => {
    expect(ngeFillSeries([9, 6, 3], 2, false)).toEqual([0, -3]);
  });

  // `NaN` and `Infinity` are numbers but not points on a line; treating them as a
  // series would propose `NaN` down a whole column.
  it('does not treat NaN or Infinity as a series', () => {
    expect(ngeFillSeries([1, Number.NaN], 2, false)).toEqual([1, Number.NaN]);
    expect(ngeFillSeries([1, Number.POSITIVE_INFINITY], 1, false)).toEqual([1]);
  });
});

describe('computeNgeFillCells', () => {
  const values = readerFor({
    'row-0::quantity': 10,
    'row-1::quantity': 20,
    'row-2::quantity': 0,
    'row-3::quantity': 0,
    'row-4::quantity': 0,
  });

  it('proposes one cell per swept position, in view order', () => {
    const cells = computeNgeFillCells(downFrom(), rowIds, columnIds, values, allFillable);

    expect(cells.map(cell => cell.rowId)).toEqual(['row-2', 'row-3', 'row-4']);
    expect(cells.map(cell => cell.value)).toEqual([30, 40, 50]);
    expect(cells.every(cell => cell.columnId === 'quantity')).toBe(true);
  });

  // ⚠️ The story's answer to "undo belongs to the host" — the before-image travels
  // with the proposal so a consumer need not build one first.
  it('carries what each cell holds today', () => {
    const cells = computeNgeFillCells(downFrom(), rowIds, columnIds, values, allFillable);

    expect(cells.map(cell => cell.previousValue)).toEqual([0, 0, 0]);
  });

  // ⚠️ Positions come from the ids the caller passes, which are the PROCESSED row
  // order — so a fill after a sort walks the rows the user sees, in the order they
  // see them, rather than the source array's order.
  it('follows the row order it is given, not the data order', () => {
    const resorted = ['row-4', 'row-3', 'row-2', 'row-1', 'row-0', 'row-5'];
    const cells = computeNgeFillCells(downFrom(), resorted, columnIds, values, allFillable);

    expect(cells.map(cell => cell.rowId)).toEqual(['row-2', 'row-1', 'row-0']);
  });

  it('fills each column of a multi-column source independently', () => {
    const twoColumns = plan(
      { columnFrom: 1, columnTo: 2, rowFrom: 0, rowTo: 1 },
      { columnFrom: 1, columnTo: 2, rowFrom: 0, rowTo: 4 }
    );
    const multi = readerFor({
      'row-0::quantity': 10,
      'row-0::status': 1,
      'row-1::quantity': 20,
      'row-1::status': 2,
    });
    const cells = computeNgeFillCells(twoColumns, rowIds, columnIds, multi, allFillable);

    expect(cells.filter(cell => cell.columnId === 'status').map(cell => cell.value)).toEqual([
      3, 4, 5,
    ]);
    expect(cells.filter(cell => cell.columnId === 'quantity').map(cell => cell.value)).toEqual([
      30, 40, 50,
    ]);
  });

  // A derived or read-only column seeds a neighbour's series but is never a target.
  it('skips a column the opt-out excludes', () => {
    const twoColumns = plan(
      { columnFrom: 1, columnTo: 2, rowFrom: 0, rowTo: 1 },
      { columnFrom: 1, columnTo: 2, rowFrom: 0, rowTo: 4 }
    );
    const cells = computeNgeFillCells(
      twoColumns,
      rowIds,
      columnIds,
      values,
      columnId => columnId !== 'status'
    );

    expect(cells.every(cell => cell.columnId === 'quantity')).toBe(true);
    expect(cells).toHaveLength(3);
  });

  it('walks columns when the block grew sideways', () => {
    const across = plan(
      { columnFrom: 0, columnTo: 1, rowFrom: 0, rowTo: 0 },
      { columnFrom: 0, columnTo: 3, rowFrom: 0, rowTo: 0 }
    );
    const values = readerFor({ 'row-0::name': 2, 'row-0::status': 4 });
    const cells = computeNgeFillCells(across, rowIds, columnIds, values, allFillable);

    expect(cells.map(cell => cell.columnId)).toEqual(['quantity', 'amount']);
    expect(cells.map(cell => cell.value)).toEqual([6, 8]);
  });

  // ⚠️ **The two-pass rule, and the corner quadrant it exists for.** Growing both axes
  // at once leaves cells belonging to neither the source's rows nor its columns; pass 1
  // extends the rows, pass 2 extends the columns across every row INCLUDING those, so
  // the corner is derived from derived values. Nothing in the source points at it.
  it('fills the corner quadrant of a two-dimensional grow', () => {
    const diagonal = plan(
      { columnFrom: 0, columnTo: 1, rowFrom: 0, rowTo: 1 },
      { columnFrom: 0, columnTo: 2, rowFrom: 0, rowTo: 2 }
    );
    const grid = readerFor({
      'row-0::name': 10,
      'row-0::status': 20,
      'row-1::name': 15,
      'row-1::status': 25,
    });
    const cells = computeNgeFillCells(diagonal, rowIds, columnIds, grid, allFillable);
    const at = (row: string, column: string) =>
      cells.find(cell => cell.rowId === row && cell.columnId === column)?.value;

    // pass 1 — the rows, from the source's own columns
    expect(at('row-2', 'name')).toBe(20);
    expect(at('row-2', 'status')).toBe(30);
    // pass 2 — the columns, from each row's name/status
    expect(at('row-0', 'quantity')).toBe(30);
    expect(at('row-1', 'quantity')).toBe(35);
    // the corner — pass 2 reading pass 1
    expect(at('row-2', 'quantity')).toBe(40);
  });

  // A drag that grew the rows while shrinking the columns fills only what survives.
  it('does not fill a column the same drag is dropping', () => {
    const growAndShrink = plan(
      { columnFrom: 1, columnTo: 2, rowFrom: 0, rowTo: 1 },
      { columnFrom: 1, columnTo: 1, rowFrom: 0, rowTo: 3 }
    );
    const cells = computeNgeFillCells(growAndShrink, rowIds, columnIds, values, allFillable);

    expect(cells.every(cell => cell.columnId === 'status')).toBe(true);
    expect(cells.map(cell => cell.rowId)).toEqual(['row-2', 'row-3']);
  });

  // A drag that ONLY shrank proposes nothing — `next \\ source` is simply empty.
  it('proposes nothing when the block only shrank', () => {
    const shrink = plan(
      { columnFrom: 2, columnTo: 2, rowFrom: 0, rowTo: 4 },
      { columnFrom: 2, columnTo: 2, rowFrom: 0, rowTo: 2 }
    );

    expect(computeNgeFillCells(shrink, rowIds, columnIds, values, allFillable)).toEqual([]);
  });

  // The plan is resolved against the current view; an index the view no longer holds
  // contributes nothing rather than proposing a cell for a phantom row.
  it('ignores positions the view does not hold', () => {
    const cells = computeNgeFillCells(
      downFrom({ rowTo: 99 }),
      rowIds,
      columnIds,
      values,
      allFillable
    );

    expect(cells.map(cell => cell.rowId)).toEqual(['row-2', 'row-3', 'row-4', 'row-5']);
  });
});
