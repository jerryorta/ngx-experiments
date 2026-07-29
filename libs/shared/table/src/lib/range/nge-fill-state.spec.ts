import type { NgeCellRange, NgeRangeColumnOrder, NgeRangeRowOrder } from './nge-range-state';

import {
  clearNgeFillTarget,
  createNgeFillState,
  isNgeCellDropping,
  isNgeCellFilling,
  normalizeNgeFillState,
  resolveNgeFillPlan,
  setNgeFillTarget,
} from './nge-fill-state';
import { ngeWholeColumnRange } from './nge-range-state';

function orderOf(ids: string[]): NgeRangeColumnOrder & NgeRangeRowOrder {
  return new Map(ids.map((id, index) => [id, index]));
}

const rowOrder: NgeRangeRowOrder = orderOf(
  Array.from({ length: 10 }, (_, index) => `row-${index}`)
);

const columnOrder = orderOf(['name', 'status', 'quantity', 'amount']);

/** Two cells of `status`, rows 1–2 — the block every fill below extends. */
const source: NgeCellRange = {
  anchorColumnId: 'status',
  anchorRowId: 'row-1',
  focusColumnId: 'status',
  focusRowId: 'row-2',
};

function planTo(columnId: string, rowId: string, from: NgeCellRange = source) {
  return resolveNgeFillPlan(from, { columnId, rowId }, rowOrder, columnOrder);
}

describe('normalizeNgeFillState / setNgeFillTarget / clearNgeFillTarget', () => {
  it('fills in a slice the host has never written', () => {
    expect(normalizeNgeFillState(undefined)).toEqual({ target: null });
  });

  it('moves the target', () => {
    const state = setNgeFillTarget(createNgeFillState(), { columnId: 'status', rowId: 'row-4' });

    expect(state.target).toEqual({ columnId: 'status', rowId: 'row-4' });
  });

  // ⚠️ A drag fires a move per frame and most land on the cell the target already
  // sits on. The same reference is what keeps that from churning the host's state.
  it('returns the same state when the target has not moved', () => {
    const state = setNgeFillTarget(createNgeFillState(), { columnId: 'status', rowId: 'row-4' });

    expect(setNgeFillTarget(state, { columnId: 'status', rowId: 'row-4' })).toBe(state);
  });

  it('clears, and is a no-op when nothing is in flight', () => {
    const state = setNgeFillTarget(createNgeFillState(), { columnId: 'status', rowId: 'row-4' });
    const empty = createNgeFillState();

    expect(clearNgeFillTarget(state).target).toBeNull();
    expect(clearNgeFillTarget(empty)).toBe(empty);
  });
});

describe('resolveNgeFillPlan — nothing changes', () => {
  it('has no plan without a target', () => {
    expect(resolveNgeFillPlan(source, null, rowOrder, columnOrder)).toBeNull();
  });

  // ⚠️ **ARCH-270's consequence, and the gate the handle and the commit share.** A
  // whole-column selection covers every row, so it has no corner to drag and nothing
  // below it to extend into. Reachable by cmd/ctrl-A too, not only the header strip.
  it('has no plan when the source is unbounded on the row axis', () => {
    expect(planTo('status', 'row-5', ngeWholeColumnRange('status'))).toBeNull();
  });

  it('has no plan when the drag is still on the far corner', () => {
    expect(planTo('status', 'row-2')).toBeNull();
  });

  it('has no plan for ids the view no longer holds', () => {
    expect(planTo('status', 'row-filtered-away')).toBeNull();
    expect(planTo('hidden-column', 'row-5')).toBeNull();
  });
});

describe('resolveNgeFillPlan — one axis', () => {
  it('grows downward', () => {
    expect(planTo('status', 'row-5')?.next).toEqual({
      columnFrom: 1,
      columnTo: 1,
      rowFrom: 1,
      rowTo: 5,
    });
  });

  // ⚠️ Past the NEAR edge the span flips to `[target, far]`, which is what keeps the
  // source inside the block when a drag goes backwards.
  it('grows upward, keeping the source', () => {
    expect(planTo('status', 'row-0')?.next).toEqual({
      columnFrom: 1,
      columnTo: 1,
      rowFrom: 0,
      rowTo: 2,
    });
  });

  it('shrinks when the drag comes back inside', () => {
    expect(planTo('status', 'row-1')?.next).toEqual({
      columnFrom: 1,
      columnTo: 1,
      rowFrom: 1,
      rowTo: 1,
    });
  });

  it('grows sideways', () => {
    expect(planTo('amount', 'row-2')?.next).toMatchObject({ columnFrom: 1, columnTo: 3 });
  });

  it('grows sideways past the near edge', () => {
    expect(planTo('name', 'row-2')?.next).toMatchObject({ columnFrom: 0, columnTo: 1 });
  });

  it('carries the source it started from', () => {
    expect(planTo('status', 'row-5')?.source).toEqual({
      columnFrom: 1,
      columnTo: 1,
      rowFrom: 1,
      rowTo: 2,
    });
  });
});

// ⚠️ **The axes resolve INDEPENDENTLY** — there is no dominant-axis lock. One drag can
// grow the rows and shrink the columns at the same time, which is why extending and
// retracting stopped being separable concepts and became one plan.
describe('resolveNgeFillPlan — both axes at once', () => {
  const wide: NgeCellRange = {
    anchorColumnId: 'name',
    anchorRowId: 'row-1',
    focusColumnId: 'quantity',
    focusRowId: 'row-2',
  };

  it('grows both axes on a diagonal drag', () => {
    expect(planTo('amount', 'row-5', wide)?.next).toEqual({
      columnFrom: 0,
      columnTo: 3,
      rowFrom: 1,
      rowTo: 5,
    });
  });

  it('shrinks both axes on a diagonal drag back in', () => {
    expect(planTo('name', 'row-1', wide)?.next).toEqual({
      columnFrom: 0,
      columnTo: 0,
      rowFrom: 1,
      rowTo: 1,
    });
  });

  it('grows one axis while shrinking the other', () => {
    expect(planTo('name', 'row-5', wide)?.next).toEqual({
      columnFrom: 0,
      columnTo: 0,
      rowFrom: 1,
      rowTo: 5,
    });
  });
});

describe('isNgeCellFilling / isNgeCellDropping', () => {
  const grow = planTo('status', 'row-5');
  const shrink = planTo('status', 'row-1');

  it('fills what the block gained, and nothing it already had', () => {
    expect(isNgeCellFilling(grow, 3, 1)).toBe(true);
    expect(isNgeCellFilling(grow, 5, 1)).toBe(true);
    // inside the SOURCE — already selected, never a proposal
    expect(isNgeCellFilling(grow, 2, 1)).toBe(false);
    expect(isNgeCellFilling(grow, 3, 2)).toBe(false);
  });

  it('drops what the block lost', () => {
    expect(isNgeCellDropping(shrink, 2, 1)).toBe(true);
    expect(isNgeCellDropping(shrink, 1, 1)).toBe(false);
  });

  // A grow drops nothing and a shrink fills nothing — the two are answers about the
  // same plan, not a mode it is in.
  it('never reports a cell as both', () => {
    expect(isNgeCellDropping(grow, 3, 1)).toBe(false);
    expect(isNgeCellFilling(shrink, 2, 1)).toBe(false);
  });

  it('answers false without a plan', () => {
    expect(isNgeCellFilling(null, 3, 1)).toBe(false);
    expect(isNgeCellDropping(null, 3, 1)).toBe(false);
  });
});
