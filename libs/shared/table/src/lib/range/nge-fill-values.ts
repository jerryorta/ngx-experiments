import type { NgeCellPatch } from '../events';
import type { NgeFillBounds, NgeFillPlan } from './nge-fill-state';

/** Read one cell's current value — supplied by the caller that holds the table. */
export type NgeFillValueReader = (rowId: string, columnId: string) => unknown;

/** Whether a column accepts a fill — the `ColumnMeta.ngeFill` opt-out, resolved. */
export type NgeFillColumnPredicate = (columnId: string) => boolean;

/**
 * Every cell a fill would change, in view order.
 *
 * ⚠️ **Two passes, and the order is the whole design.** A two-dimensional drag can
 * grow both axes at once, which leaves a corner quadrant belonging to neither the
 * source's rows nor its columns:
 *
 * ```
 *      A    B    C    D          [ ] = the source
 *  0  [10] [20]  ↦    ↦          ↧   = pass 1, from the source's own columns
 *  1  [15] [25]  ↦    ↦          ↦   = pass 2, from each row's A–B
 *  2   ↧    ↧    ⇘    ⇘          ⇘   = the corner: pass 2 reading pass 1
 *  3   ↧    ↧    ⇘    ⇘
 * ```
 *
 * Pass 1 extends the **rows**, for the columns the source actually had. Pass 2 then
 * extends the **columns** across every row of the new block — including the rows pass 1
 * just produced — so the corner is derived from derived values. That is deterministic
 * and is the only reading available: nothing in the source points at the corner. Excel
 * declines diagonal fills rather than take it; this library takes it, and says so.
 *
 * ⚠️ **Positions come from the CURRENT view**, so filling down after a sort fills the
 * rows the user sees, in the order they see them.
 *
 * A column the opt-out excludes contributes nothing as a **target** — it is skipped
 * while its neighbours fill — but is still read as a **source**, so a derived column can
 * seed a series it refuses to receive.
 */
export function computeNgeFillCells(
  plan: NgeFillPlan,
  rowIdsInOrder: readonly string[],
  columnIdsInOrder: readonly string[],
  readValue: NgeFillValueReader,
  isFillable: NgeFillColumnPredicate
): NgeCellPatch[] {
  const { next, source } = plan;

  // Pass 1's results, overlaid on the real data so pass 2 can read them. The library
  // writes nothing, so this is the only place those values exist.
  //
  // ⚠️ **Nested by row then column, never keyed by a joined string.** A row id is
  // `getRowId(row)` — the consumer's own value, frequently a Firestore document path —
  // so any separator is a collision argument waiting to be lost. Nesting has none to
  // choose and is collision-proof by construction. ARCH-285: the first attempt joined
  // with a NUL, which is collision-proof and *also* made git classify this file as
  // binary — no diff, no blame, no textual merge, and a pull request that showed the
  // reviewer nothing.
  const produced = new Map<string, Map<string, unknown>>();
  const read: NgeFillValueReader = (rowId, columnId) => {
    const row = produced.get(rowId);

    return row?.has(columnId) === true ? row.get(columnId) : readValue(rowId, columnId);
  };

  const cells: NgeCellPatch[] = [];
  const emit = (rowId: string, columnId: string, value: unknown): void => {
    const row = produced.get(rowId) ?? new Map<string, unknown>();
    row.set(columnId, value);
    produced.set(rowId, row);

    if (isFillable(columnId)) {
      cells.push({ columnId, previousValue: readValue(rowId, columnId), rowId, value });
    }
  };

  // ─── pass 1: extend the rows, over the columns the source had ──────────────
  //
  // Restricted to columns still in the block, so a drag that grows the rows while
  // shrinking the columns does not fill a column it is about to drop.
  const sharedColumnFrom = Math.max(source.columnFrom, next.columnFrom);
  const sharedColumnTo = Math.min(source.columnTo, next.columnTo);

  for (let column = sharedColumnFrom; column <= sharedColumnTo; column++) {
    const columnId = columnIdsInOrder[column];

    if (columnId === undefined) {
      continue;
    }

    const series = readSpan(source.rowFrom, source.rowTo, index =>
      read(rowIdsInOrder[index], columnId)
    );

    fillOutward(
      { from: source.rowFrom, to: source.rowTo },
      { from: next.rowFrom, to: next.rowTo },
      series,
      (index, value) => {
        const rowId = rowIdsInOrder[index];

        if (rowId !== undefined) {
          emit(rowId, columnId, value);
        }
      }
    );
  }

  // ─── pass 2: extend the columns, over every row of the NEW block ───────────
  //
  // Reading through `read`, so the rows pass 1 produced seed the corner quadrant.
  for (let row = next.rowFrom; row <= next.rowTo; row++) {
    const rowId = rowIdsInOrder[row];

    if (rowId === undefined) {
      continue;
    }

    const series = readSpan(sharedColumnFrom, sharedColumnTo, index =>
      read(rowId, columnIdsInOrder[index])
    );

    fillOutward(
      { from: sharedColumnFrom, to: sharedColumnTo },
      { from: next.columnFrom, to: next.columnTo },
      series,
      (index, value) => {
        const columnId = columnIdsInOrder[index];

        if (columnId !== undefined) {
          emit(rowId, columnId, value);
        }
      }
    );
  }

  return cells;
}

/**
 * Extend one line outward from `have` to `want`, on both sides.
 *
 * Both directions in one place because a single drag can only ever grow one side of an
 * axis — but which side depends on where the pointer went, and duplicating the walk per
 * direction is how the backwards case ends up with the forwards arithmetic.
 */
function fillOutward(
  have: { from: number; to: number },
  want: { from: number; to: number },
  series: readonly unknown[],
  write: (index: number, value: unknown) => void
): void {
  if (want.to > have.to) {
    const values = ngeFillSeries(series, want.to - have.to, false);

    for (let index = have.to + 1; index <= want.to; index++) {
      write(index, values[index - have.to - 1]);
    }
  }

  if (want.from < have.from) {
    const values = ngeFillSeries(series, have.from - want.from, true);

    for (let index = want.from; index <= have.from - 1; index++) {
      write(index, values[index - want.from]);
    }
  }
}

/**
 * Extend one line of source values by `count`, in **view order**.
 *
 * Two behaviours, and which one applies is inferred rather than configured:
 *
 * - **Linear numeric series** when the source is two or more finite numbers. The step
 *   is `(last - first) / (n - 1)` — exact for a real arithmetic sequence, and a
 *   reasonable reading of anything else. A source whose values are all equal yields a
 *   step of zero, which repeats the value; that is the right answer and needs no
 *   special case.
 * - **Copy** otherwise — a single cell, or anything non-numeric — cycling the source
 *   so a three-cell pattern repeats every three cells, exactly as a spreadsheet does.
 *
 * ⚠️ **`backwards` changes the arithmetic, not just the order.** Dragging up from
 * `[10, 20, 30]` must produce `…, 0` immediately above the source, not `40`. Values
 * are therefore built in *distance from the source* order and reversed at the end, so
 * the array a caller receives always runs top-to-bottom / left-to-right and can be
 * indexed straight off the block's own bounds.
 */
export function ngeFillSeries(
  source: readonly unknown[],
  count: number,
  backwards: boolean
): unknown[] {
  if (count <= 0 || source.length === 0) {
    return [];
  }

  const step = linearStep(source);
  const values: unknown[] = [];

  for (let distance = 1; distance <= count; distance++) {
    values.push(
      step === null
        ? copyAt(source, distance, backwards)
        : extrapolate(source, step, distance, backwards)
    );
  }

  return backwards ? values.reverse() : values;
}

/**
 * The per-cell step of a numeric source, or `null` when the source is not a series.
 *
 * `null` rather than `0` for "not a series" precisely because zero is a *legitimate*
 * step — a source of `[5, 5, 5]` is an arithmetic sequence whose step is zero, and
 * conflating the two would send it down the copy path where it happens to produce the
 * same answer today and would stop doing so the moment either behaviour changes.
 */
function linearStep(source: readonly unknown[]): null | number {
  if (source.length < 2 || !source.every(isFiniteNumber)) {
    return null;
  }

  const first = source[0] as number;
  const last = source[source.length - 1] as number;

  return (last - first) / (source.length - 1);
}

function extrapolate(
  source: readonly unknown[],
  step: number,
  distance: number,
  backwards: boolean
): number {
  const edge = (backwards ? source[0] : source[source.length - 1]) as number;

  return backwards ? edge - step * distance : edge + step * distance;
}

/**
 * The source value one cell out from the block, cycling.
 *
 * Backwards continues the pattern *upward*: the cell immediately above a
 * `[a, b, c]` source takes `c`, the one above that `b`, and so on — which is what
 * makes a repeated block read as continuous in both directions rather than restarting
 * at `a` on the wrong side.
 */
function copyAt(source: readonly unknown[], distance: number, backwards: boolean): unknown {
  const offset = (distance - 1) % source.length;

  return backwards ? source[source.length - 1 - offset] : source[offset];
}

function isFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Read an inclusive index span into an array, for a source line. */
function readSpan(from: number, to: number, read: (index: number) => unknown): unknown[] {
  const values: unknown[] = [];

  for (let index = from; index <= to; index++) {
    values.push(read(index));
  }

  return values;
}

/** Re-exported for the specs that assert on bounds arithmetic directly. */
export type { NgeFillBounds };
