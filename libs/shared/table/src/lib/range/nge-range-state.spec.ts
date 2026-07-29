import type { NgeCellRange, NgeRangeColumnOrder, NgeRangeRowOrder } from './nge-range-state';

import {
  activeNgeCellRange,
  clearNgeCellIfSole,
  clearNgeRange,
  createNgeRangeState,
  extendNgeColumnRangeTo,
  extendNgeRangeTo,
  ngeRangeCellKey,
  ngeWholeColumnRange,
  hasNgeRange,
  isNgeCellInRange,
  isNgeColumnSelected,
  isNgeRangeFocusCell,
  isSameNgeCellRange,
  normalizeNgeRangeState,
  parseNgeRangeCellKey,
  selectOrClearNgeColumnRange,
  setNgeRange,
  startNgeColumnRange,
  startNgeRange,
  stepNgeRangeFocus,
  toggleNgeColumnRange,
} from './nge-range-state';

/**
 * Ids in the order they are shown → their position, which is the shape both axes
 * resolve against.
 *
 * Built from an ordered array rather than written as a `Map` literal so the source
 * reads as the order it describes: `perfectionist/sort-maps` would otherwise require
 * the entries alphabetically, which is the one arrangement that hides what they mean.
 */
function orderOf(ids: string[]): NgeRangeColumnOrder & NgeRangeRowOrder {
  return new Map(ids.map((id, index) => [id, index]));
}

/** Ten rows in display order, which is what a rectangle's rows resolve against. */
const rowOrder: NgeRangeRowOrder = orderOf(
  Array.from({ length: 10 }, (_, index) => `row-${index}`)
);

/**
 * Four columns in VISUAL order — the composition across the three lanes, not the
 * order they were declared in. Pinning is precisely what makes those diverge, and
 * the whole reason this addon resolves its column span at read time.
 */
const columnOrder = orderOf(['name', 'status', 'quantity', 'amount']);

/** A rectangle from `row-2 / status` to `row-5 / amount`. */
const block: NgeCellRange = {
  anchorColumnId: 'status',
  anchorRowId: 'row-2',
  focusColumnId: 'amount',
  focusRowId: 'row-5',
};

describe('ngeRangeCellKey / parseNgeRangeCellKey', () => {
  it('round-trips a plain id pair', () => {
    expect(parseNgeRangeCellKey(ngeRangeCellKey('row-1', 'amount'))).toEqual({
      columnId: 'amount',
      rowId: 'row-1',
    });
  });

  // A row id is `getRowId(row)` — the consumer's own value, and a Firestore document
  // path is a very ordinary thing for it to be. Splitting on the FIRST separator
  // would hand back a truncated row id and silently select the wrong record — which
  // matters more here than for highlighting, because these keys make a round trip
  // through a DOM attribute the gesture reads back.
  it('splits on the last separator, so a row id may contain one', () => {
    const key = ngeRangeCellKey('orgs/a::b/docs/c', 'status');

    expect(parseNgeRangeCellKey(key)).toEqual({
      columnId: 'status',
      rowId: 'orgs/a::b/docs/c',
    });
  });
});

describe('normalizeNgeRangeState', () => {
  // ⚠️ The failure this prevents: `createNgeTableState()` cannot know about an
  // addon's slice, so a host that builds its state the documented way hands in
  // `undefined` — and the feature's updaters are given exactly that.
  it('fills in a slice the host has never written', () => {
    expect(normalizeNgeRangeState(undefined)).toEqual({ ranges: [] });
  });

  it('passes an existing slice through untouched', () => {
    const state = createNgeRangeState({ ranges: [block] });

    expect(normalizeNgeRangeState(state)).toBe(state);
  });
});

describe('startNgeRange', () => {
  it('begins a one-cell rectangle', () => {
    const state = startNgeRange(createNgeRangeState(), 'row-2', 'status');

    expect(state.ranges).toEqual([
      {
        anchorColumnId: 'status',
        anchorRowId: 'row-2',
        focusColumnId: 'status',
        focusRowId: 'row-2',
      },
    ]);
  });

  // Clicking into a spreadsheet replaces what was selected. cmd/ctrl is the one
  // modifier that does not.
  it('replaces whatever was selected', () => {
    const state = startNgeRange(createNgeRangeState({ ranges: [block] }), 'row-8', 'name');

    expect(state.ranges).toHaveLength(1);
    expect(state.ranges[0].anchorRowId).toBe('row-8');
  });

  it('appends a disjoint rectangle when additive', () => {
    const state = startNgeRange(createNgeRangeState({ ranges: [block] }), 'row-8', 'name', {
      additive: true,
    });

    expect(state.ranges).toHaveLength(2);
    expect(state.ranges[0]).toEqual(block);
  });

  // The last entry is the active one, which is what a following extend moves.
  it('makes the new rectangle the active one', () => {
    const state = startNgeRange(createNgeRangeState({ ranges: [block] }), 'row-8', 'name', {
      additive: true,
    });

    expect(activeNgeCellRange(state)?.anchorRowId).toBe('row-8');
  });

  // Same reference, so clicking the same cell twice writes nothing and emits no
  // `stateChange`.
  it('returns the same state when the selection is already exactly that cell', () => {
    const first = startNgeRange(createNgeRangeState(), 'row-2', 'status');

    expect(startNgeRange(first, 'row-2', 'status')).toBe(first);
  });

  it('never mutates the state it is given', () => {
    const state = createNgeRangeState();

    startNgeRange(state, 'row-2', 'status');

    expect(state.ranges).toEqual([]);
  });
});

describe('extendNgeRangeTo', () => {
  it('moves the focus and leaves the anchor where it was', () => {
    const state = extendNgeRangeTo(createNgeRangeState({ ranges: [block] }), 'row-7', 'name');

    expect(state.ranges[0]).toEqual({
      anchorColumnId: 'status',
      anchorRowId: 'row-2',
      focusColumnId: 'name',
      focusRowId: 'row-7',
    });
  });

  // ⚠️ What lets a rectangle be grown AND shrunk rather than only ratcheted: a
  // second extend towards the anchor makes the block smaller, which is how a user
  // corrects an over-shoot.
  it('shrinks the block when the focus moves back towards the anchor', () => {
    const wide = extendNgeRangeTo(createNgeRangeState({ ranges: [block] }), 'row-9', 'name');
    const narrow = extendNgeRangeTo(wide, 'row-3', 'quantity');

    expect(isNgeCellInRange(narrow, 'row-9', 'name', rowOrder, columnOrder)).toBe(false);
    expect(isNgeCellInRange(narrow, 'row-3', 'quantity', rowOrder, columnOrder)).toBe(true);
  });

  it('is a no-op with nothing selected', () => {
    const state = createNgeRangeState();

    expect(extendNgeRangeTo(state, 'row-4', 'amount')).toBe(state);
  });

  // A drag fires an extend per frame and most land on the cell the focus already
  // sits on. Returning the same reference is what keeps that from churning the
  // host's state sixty times a second.
  it('returns the same state when the focus has not moved', () => {
    const state = createNgeRangeState({ ranges: [block] });

    expect(extendNgeRangeTo(state, 'row-5', 'amount')).toBe(state);
  });

  it('moves only the active rectangle', () => {
    const two = startNgeRange(createNgeRangeState({ ranges: [block] }), 'row-8', 'name', {
      additive: true,
    });
    const state = extendNgeRangeTo(two, 'row-9', 'quantity');

    expect(state.ranges[0]).toEqual(block);
    expect(state.ranges[1].focusRowId).toBe('row-9');
  });
});

describe('isNgeCellInRange', () => {
  const state = createNgeRangeState({ ranges: [block] });

  it('covers the cells inside the rectangle', () => {
    expect(isNgeCellInRange(state, 'row-3', 'quantity', rowOrder, columnOrder)).toBe(true);
    expect(isNgeCellInRange(state, 'row-2', 'status', rowOrder, columnOrder)).toBe(true);
    expect(isNgeCellInRange(state, 'row-5', 'amount', rowOrder, columnOrder)).toBe(true);
  });

  it('excludes cells outside it on either axis', () => {
    expect(isNgeCellInRange(state, 'row-6', 'quantity', rowOrder, columnOrder)).toBe(false);
    expect(isNgeCellInRange(state, 'row-3', 'name', rowOrder, columnOrder)).toBe(false);
  });

  it('reads the same with the endpoints the other way round', () => {
    const reversed = createNgeRangeState({
      ranges: [
        {
          anchorColumnId: 'amount',
          anchorRowId: 'row-5',
          focusColumnId: 'status',
          focusRowId: 'row-2',
        },
      ],
    });

    expect(isNgeCellInRange(reversed, 'row-3', 'quantity', rowOrder, columnOrder)).toBe(true);
    expect(isNgeCellInRange(reversed, 'row-6', 'quantity', rowOrder, columnOrder)).toBe(false);
  });

  it('matches nothing when nothing is selected', () => {
    expect(
      isNgeCellInRange(createNgeRangeState(), 'row-3', 'quantity', rowOrder, columnOrder)
    ).toBe(false);
  });

  it('covers disjoint rectangles independently', () => {
    const two = startNgeRange(state, 'row-8', 'name', { additive: true });

    expect(isNgeCellInRange(two, 'row-3', 'quantity', rowOrder, columnOrder)).toBe(true);
    expect(isNgeCellInRange(two, 'row-8', 'name', rowOrder, columnOrder)).toBe(true);
    expect(isNgeCellInRange(two, 'row-8', 'quantity', rowOrder, columnOrder)).toBe(false);
  });

  // ⚠️ The degeneracy rules inherited verbatim from ARCH-268's `ngeSelectionRangeIds`,
  // applied to both axes. A filter that hid the moving corner has removed the
  // block's boundary; inventing one would select cells the user never dragged over.
  describe('an endpoint that is no longer in the view', () => {
    it('matches nothing when the focus row has gone', () => {
      const orphaned = createNgeRangeState({ ranges: [{ ...block, focusRowId: 'row-99' }] });

      expect(isNgeCellInRange(orphaned, 'row-3', 'quantity', rowOrder, columnOrder)).toBe(false);
    });

    it('matches nothing when the focus column has gone', () => {
      const orphaned = createNgeRangeState({ ranges: [{ ...block, focusColumnId: 'gone' }] });

      expect(isNgeCellInRange(orphaned, 'row-3', 'quantity', rowOrder, columnOrder)).toBe(false);
    });

    // A missing anchor degenerates to the focus cell alone rather than throwing or
    // selecting from index zero — a filtered-away anchor is an ordinary thing for a
    // restored view to carry.
    it('degenerates to the focus cell when the anchor row has gone', () => {
      const orphaned = createNgeRangeState({ ranges: [{ ...block, anchorRowId: 'row-99' }] });

      expect(isNgeCellInRange(orphaned, 'row-5', 'amount', rowOrder, columnOrder)).toBe(true);
      expect(isNgeCellInRange(orphaned, 'row-3', 'amount', rowOrder, columnOrder)).toBe(false);
    });

    it('degenerates to the focus cell when the anchor column has gone', () => {
      const orphaned = createNgeRangeState({ ranges: [{ ...block, anchorColumnId: 'gone' }] });

      expect(isNgeCellInRange(orphaned, 'row-3', 'amount', rowOrder, columnOrder)).toBe(true);
      expect(isNgeCellInRange(orphaned, 'row-3', 'status', rowOrder, columnOrder)).toBe(false);
    });
  });

  // ⚠️ The property the four-id descriptor exists for, and the divergence from
  // `NgeHighlightRange`: both spans resolve at READ time, so re-ordering the
  // columns re-shapes the block exactly as a re-sort does. A materialised
  // `columnIds` would keep describing the columns by name and the rectangle would
  // develop a hole the moment one moved out from between the endpoints.
  it('re-shapes when the visual column order changes', () => {
    const pinned: NgeRangeColumnOrder = orderOf(['amount', 'name', 'status', 'quantity']);

    // `status`→`amount` spanned three columns before; pinning `amount` to the left
    // leaves the same two endpoints spanning the whole row.
    expect(isNgeCellInRange(state, 'row-3', 'name', rowOrder, pinned)).toBe(true);
    expect(isNgeCellInRange(state, 'row-3', 'quantity', rowOrder, columnOrder)).toBe(true);
    expect(isNgeCellInRange(state, 'row-3', 'quantity', rowOrder, pinned)).toBe(false);
  });

  // The row-axis half of the same reading, which ARCH-250 settled: endpoints follow
  // their records, membership follows the view.
  it('re-shapes when the row order changes', () => {
    const sorted: NgeRangeRowOrder = orderOf(['row-5', 'row-9', 'row-2', 'row-3']);

    // `row-9` sits between the endpoints in the sorted view and did not before.
    expect(isNgeCellInRange(state, 'row-9', 'quantity', rowOrder, columnOrder)).toBe(false);
    expect(isNgeCellInRange(state, 'row-9', 'quantity', sorted, columnOrder)).toBe(true);
  });
});

describe('isNgeRangeFocusCell', () => {
  it('is the active rectangles moving corner', () => {
    const state = createNgeRangeState({ ranges: [block] });

    expect(isNgeRangeFocusCell(state, 'row-5', 'amount')).toBe(true);
    expect(isNgeRangeFocusCell(state, 'row-2', 'status')).toBe(false);
  });

  it('follows the last rectangle when several are selected', () => {
    const two = startNgeRange(createNgeRangeState({ ranges: [block] }), 'row-8', 'name', {
      additive: true,
    });

    expect(isNgeRangeFocusCell(two, 'row-8', 'name')).toBe(true);
    expect(isNgeRangeFocusCell(two, 'row-5', 'amount')).toBe(false);
  });

  it('is false with nothing selected', () => {
    expect(isNgeRangeFocusCell(createNgeRangeState(), 'row-5', 'amount')).toBe(false);
  });
});

describe('stepNgeRangeFocus', () => {
  const rowIds = Array.from({ length: 10 }, (_, index) => `row-${index}`);
  const columnIds = ['name', 'status', 'quantity', 'amount'];
  const state = createNgeRangeState({ ranges: [block] });

  it('moves the focus one row down', () => {
    const next = stepNgeRangeFocus(state, { column: 0, row: 1 }, rowIds, columnIds);

    expect(next.ranges[0].focusRowId).toBe('row-6');
  });

  it('moves the focus one column left', () => {
    const next = stepNgeRangeFocus(state, { column: -1, row: 0 }, rowIds, columnIds);

    expect(next.ranges[0].focusColumnId).toBe('quantity');
  });

  // The same rule shift-click has, inherited rather than restated — which is what
  // stops a third entry point from drifting away from the other two.
  it('never moves the anchor', () => {
    const next = stepNgeRangeFocus(state, { column: 1, row: 1 }, rowIds, columnIds);

    expect(next.ranges[0].anchorRowId).toBe(block.anchorRowId);
    expect(next.ranges[0].anchorColumnId).toBe(block.anchorColumnId);
  });

  it('shrinks the block when it steps back towards the anchor', () => {
    const next = stepNgeRangeFocus(state, { column: 0, row: -1 }, rowIds, columnIds);

    expect(isNgeCellInRange(next, 'row-5', 'amount', rowOrder, columnOrder)).toBe(false);
    expect(isNgeCellInRange(next, 'row-4', 'amount', rowOrder, columnOrder)).toBe(true);
  });

  // ⚠️ Clamped, never wrapped: a selection that teleports to the other end of the
  // table is never what the key meant.
  it('clamps at the last row rather than wrapping', () => {
    const atEnd = createNgeRangeState({ ranges: [{ ...block, focusRowId: 'row-9' }] });

    expect(stepNgeRangeFocus(atEnd, { column: 0, row: 1 }, rowIds, columnIds)).toBe(atEnd);
  });

  it('clamps at the first column rather than wrapping', () => {
    const atEdge = createNgeRangeState({ ranges: [{ ...block, focusColumnId: 'name' }] });

    expect(stepNgeRangeFocus(atEdge, { column: -1, row: 0 }, rowIds, columnIds)).toBe(atEdge);
  });

  // ⚠️ A stray `Shift`+arrow on a table nobody has clicked into must do nothing —
  // NOT start a rectangle. Starting one would put a selection on screen in response
  // to a key the user aimed at a scroll container.
  it('is a no-op with nothing selected', () => {
    const empty = createNgeRangeState();

    expect(stepNgeRangeFocus(empty, { column: 0, row: 1 }, rowIds, columnIds)).toBe(empty);
  });

  // A focus the current view no longer holds has no position to step from, and
  // guessing one would move the block somewhere the user cannot see.
  it('is a no-op when the focus has been filtered out of the view', () => {
    const orphaned = createNgeRangeState({ ranges: [{ ...block, focusRowId: 'row-99' }] });

    expect(stepNgeRangeFocus(orphaned, { column: 0, row: 1 }, rowIds, columnIds)).toBe(orphaned);
  });

  it('moves only the active rectangle', () => {
    const two = startNgeRange(state, 'row-8', 'name', { additive: true });
    const next = stepNgeRangeFocus(two, { column: 0, row: 1 }, rowIds, columnIds);

    expect(next.ranges[0]).toEqual(block);
    expect(next.ranges[1].focusRowId).toBe('row-9');
  });
});

describe('setNgeRange', () => {
  it('replaces everything with one rectangle', () => {
    const two = startNgeRange(createNgeRangeState({ ranges: [block] }), 'row-8', 'name', {
      additive: true,
    });

    expect(setNgeRange(two, block).ranges).toEqual([block]);
  });

  it('returns the same state when it changes nothing', () => {
    const state = createNgeRangeState({ ranges: [block] });

    expect(setNgeRange(state, { ...block })).toBe(state);
  });
});

describe('clearNgeRange', () => {
  it('drops every rectangle', () => {
    expect(clearNgeRange(createNgeRangeState({ ranges: [block] })).ranges).toEqual([]);
  });

  // ⚠️ What lets the `Escape` handler be wired unconditionally and still be polite:
  // an unchanged result never reaches `setState`, so nothing is written and no
  // `stateChange` is emitted for a key that was meant for a dialog.
  it('returns the same reference when there is nothing to clear', () => {
    const state = createNgeRangeState();

    expect(clearNgeRange(state)).toBe(state);
  });
});

describe('hasNgeRange / activeNgeCellRange / isSameNgeCellRange', () => {
  it('reports whether anything is selected', () => {
    expect(hasNgeRange(createNgeRangeState())).toBe(false);
    expect(hasNgeRange(createNgeRangeState({ ranges: [block] }))).toBe(true);
  });

  it('has no active rectangle when nothing is selected', () => {
    expect(activeNgeCellRange(createNgeRangeState())).toBeNull();
  });

  it('compares rectangles corner for corner', () => {
    expect(isSameNgeCellRange(block, { ...block })).toBe(true);
    expect(isSameNgeCellRange(block, { ...block, focusColumnId: 'name' })).toBe(false);
  });
});

// ─── Column selection (ARCH-270) ─────────────────────────────────────────────

/** The whole `status` column, as the rectangle a header click writes. */
const wholeStatus = ngeWholeColumnRange('status');

/** The same ten rows, re-sorted — what a rectangle has to be re-resolved against. */
const resortedRowOrder: NgeRangeRowOrder = orderOf([
  'row-7',
  'row-2',
  'row-9',
  'row-0',
  'row-4',
  'row-1',
  'row-8',
  'row-3',
  'row-6',
  'row-5',
]);

describe('a null row endpoint', () => {
  it('covers every row of its column', () => {
    const state = createNgeRangeState({ ranges: [wholeStatus] });
    const covered = [...rowOrder.keys()].filter(rowId =>
      isNgeCellInRange(state, rowId, 'status', rowOrder, columnOrder)
    );

    expect(covered).toEqual([...rowOrder.keys()]);
  });

  it('leaves the other columns alone', () => {
    const state = createNgeRangeState({ ranges: [wholeStatus] });

    expect(isNgeCellInRange(state, 'row-3', 'name', rowOrder, columnOrder)).toBe(false);
  });

  // ⚠️ **The property the whole descriptor exists for.** A span between the two
  // records that happened to be first and last would follow those records, so a sort
  // would shrink the "column" to whatever now lies between them. Naming no record at
  // all is what makes a re-sort a no-op here — the same rectangle, resolved against a
  // different order, still covers everything.
  it('means the view boundary, so a re-sort cannot shrink it', () => {
    const state = createNgeRangeState({ ranges: [wholeStatus] });
    const covered = [...resortedRowOrder.keys()].filter(rowId =>
      isNgeCellInRange(state, rowId, 'status', resortedRowOrder, columnOrder)
    );

    expect(covered).toEqual([...resortedRowOrder.keys()]);
  });

  // ⚠️ `null` and "not in the model" are different answers and must stay so. A
  // filtered-away focus removes the block's boundary and matches nothing; collapsing
  // the two would make it select to the end of the table instead.
  it('is not the same as an id the view no longer holds', () => {
    const state = createNgeRangeState({
      ranges: [{ ...wholeStatus, focusRowId: 'row-filtered-away' }],
    });

    expect(isNgeCellInRange(state, 'row-3', 'status', rowOrder, columnOrder)).toBe(false);
  });

  // Half-bounded is a real shape: it is what a shift-click into the body produces
  // after a select-all, and it reads as "from the top of the view down to here".
  it('bounds only its own end when the other end names a row', () => {
    const state = createNgeRangeState({
      ranges: [{ ...wholeStatus, focusRowId: 'row-2' }],
    });

    expect(isNgeCellInRange(state, 'row-0', 'status', rowOrder, columnOrder)).toBe(true);
    expect(isNgeCellInRange(state, 'row-2', 'status', rowOrder, columnOrder)).toBe(true);
    expect(isNgeCellInRange(state, 'row-3', 'status', rowOrder, columnOrder)).toBe(false);
  });

  // A whole column has no single cell to draw the focus ring on, and that falls out
  // of the comparison rather than needing a branch.
  it('leaves a whole-column mark with no focus cell', () => {
    const state = createNgeRangeState({ ranges: [wholeStatus] });

    expect(isNgeRangeFocusCell(state, 'row-0', 'status')).toBe(false);
    expect(isNgeRangeFocusCell(state, 'row-9', 'status')).toBe(false);
  });

  // ⚠️ There is no cell to step FROM, so the arrows do nothing rather than
  // materialising the row axis at one end — which would silently turn "this whole
  // column" into "these rows of it".
  it('makes Shift+arrow a no-op on a whole-column mark', () => {
    const state = createNgeRangeState({ ranges: [wholeStatus] });

    expect(
      stepNgeRangeFocus(
        state,
        { column: 0, row: 1 },
        [...rowOrder.keys()],
        [...columnOrder.keys()]
      )
    ).toBe(state);
  });
});

describe('ngeWholeColumnRange', () => {
  it('is an ordinary rectangle, unbounded on the row axis', () => {
    expect(ngeWholeColumnRange('amount')).toEqual({
      anchorColumnId: 'amount',
      anchorRowId: null,
      focusColumnId: 'amount',
      focusRowId: null,
    });
  });
});

describe('startNgeColumnRange', () => {
  it('replaces the selection with one whole column', () => {
    const state = startNgeColumnRange(createNgeRangeState({ ranges: [block] }), 'status');

    expect(state.ranges).toEqual([wholeStatus]);
  });

  it('returns the same reference when that column is already the whole selection', () => {
    const state = createNgeRangeState({ ranges: [wholeStatus] });

    expect(startNgeColumnRange(state, 'status')).toBe(state);
  });
});

describe('selectOrClearNgeColumnRange', () => {
  it('replaces the selection with one whole column', () => {
    const state = selectOrClearNgeColumnRange(createNgeRangeState({ ranges: [block] }), 'status');

    expect(state.ranges).toEqual([wholeStatus]);
  });

  // The plain-click deselect. `startNgeColumnRange` returns the same state here,
  // so a second click on a selected column used to be invisible.
  it('clears when that column is already the whole selection', () => {
    const state = selectOrClearNgeColumnRange(
      createNgeRangeState({ ranges: [wholeStatus] }),
      'status'
    );

    expect(state.ranges).toEqual([]);
  });

  // Only the already-alone case clears. A plain click has always meant "just this",
  // so a column selected *alongside* other blocks is selected, not cleared.
  it('replaces rather than clears when other ranges are also selected', () => {
    const state = selectOrClearNgeColumnRange(
      createNgeRangeState({ ranges: [wholeStatus, block] }),
      'status'
    );

    expect(state.ranges).toEqual([wholeStatus]);
  });

  it('replaces when a DIFFERENT column is the whole selection', () => {
    const state = selectOrClearNgeColumnRange(
      createNgeRangeState({ ranges: [wholeStatus] }),
      'name'
    );

    expect(state.ranges).toEqual([ngeWholeColumnRange('name')]);
  });
});

describe('clearNgeCellIfSole', () => {
  it('clears when that one cell is the whole selection', () => {
    const sole = startNgeRange(createNgeRangeState(), 'row-2', 'status');

    expect(clearNgeCellIfSole(sole, 'row-2', 'status').ranges).toEqual([]);
  });

  // ⚠️ The identity short-circuit is what keeps a no-op click from patching the
  // host's state — `applyTableState` compares by reference.
  it('returns the same reference for a cell that is not selected', () => {
    const sole = startNgeRange(createNgeRangeState(), 'row-2', 'status');

    expect(clearNgeCellIfSole(sole, 'row-3', 'status')).toBe(sole);
  });

  // A block collapses to the clicked cell through `startNgeRange` instead; widening
  // the clear to any covered cell would make a click inside a block ambiguous.
  it('leaves a multi-cell block alone even when the cell falls inside it', () => {
    const state = createNgeRangeState({ ranges: [block] });

    expect(clearNgeCellIfSole(state, 'row-2', 'status')).toBe(state);
  });

  it('leaves a lone cell alone when other ranges are also selected', () => {
    const one = { ...ngeWholeColumnRange('name') };
    const state = createNgeRangeState({
      ranges: [
        one,
        {
          anchorColumnId: 'status',
          anchorRowId: 'row-2',
          focusColumnId: 'status',
          focusRowId: 'row-2',
        },
      ],
    });

    expect(clearNgeCellIfSole(state, 'row-2', 'status')).toBe(state);
  });
});

describe('extendNgeColumnRangeTo', () => {
  it('takes the span of columns out from the anchor', () => {
    const state = extendNgeColumnRangeTo(
      createNgeRangeState({ ranges: [ngeWholeColumnRange('name')] }),
      'quantity'
    );
    const covered = [...columnOrder.keys()].filter(columnId =>
      isNgeCellInRange(state, 'row-4', columnId, rowOrder, columnOrder)
    );

    expect(covered).toEqual(['name', 'status', 'quantity']);
  });

  // ⚠️ The one place anything unbounds an axis. A user who shift-clicks a header is
  // asking for columns, so a two-row cell block becomes full-height rather than
  // staying a band under the new headers — which is what a spreadsheet does.
  it('unbounds the row axis of a cell block', () => {
    const state = extendNgeColumnRangeTo(createNgeRangeState({ ranges: [block] }), 'amount');

    expect(state.ranges[0]).toEqual({
      anchorColumnId: 'status',
      anchorRowId: null,
      focusColumnId: 'amount',
      focusRowId: null,
    });
    expect(isNgeCellInRange(state, 'row-0', 'amount', rowOrder, columnOrder)).toBe(true);
  });

  // The anchor COLUMN stays put, which is what lets a span be shrunk by a second
  // shift-click rather than only ratcheted — the rule every extension shares.
  it('keeps the anchor column put, so a repeat towards it shrinks the span', () => {
    const wide = extendNgeColumnRangeTo(
      createNgeRangeState({ ranges: [ngeWholeColumnRange('name')] }),
      'amount'
    );
    const narrow = extendNgeColumnRangeTo(wide, 'status');
    const covered = [...columnOrder.keys()].filter(columnId =>
      isNgeCellInRange(narrow, 'row-4', columnId, rowOrder, columnOrder)
    );

    expect(covered).toEqual(['name', 'status']);
  });

  it('is a no-op with nothing selected', () => {
    const state = createNgeRangeState();

    expect(extendNgeColumnRangeTo(state, 'status')).toBe(state);
  });

  it('returns the same reference when the span has not moved', () => {
    const state = createNgeRangeState({ ranges: [wholeStatus] });

    expect(extendNgeColumnRangeTo(state, 'status')).toBe(state);
  });
});

describe('toggleNgeColumnRange', () => {
  it('adds a disjoint column', () => {
    const state = toggleNgeColumnRange(
      createNgeRangeState({ ranges: [ngeWholeColumnRange('name')] }),
      'amount'
    );

    expect(state.ranges).toEqual([ngeWholeColumnRange('name'), ngeWholeColumnRange('amount')]);
  });

  // ⚠️ It TOGGLES where a cmd-clicked cell only appends, and the asymmetry is the
  // interaction: a column is a named thing a user picks off a list, so clicking it
  // again to unpick it is the obvious reading.
  it('removes a column that is already selected', () => {
    const state = toggleNgeColumnRange(
      createNgeRangeState({ ranges: [ngeWholeColumnRange('name'), wholeStatus] }),
      'name'
    );

    expect(state.ranges).toEqual([wholeStatus]);
  });

  // Removal matches the whole column exactly, so a cmd-click never dismantles a
  // rectangle the user dragged out that happens to cover this column.
  it('leaves a dragged rectangle covering the column alone', () => {
    const state = toggleNgeColumnRange(createNgeRangeState({ ranges: [block] }), 'status');

    expect(state.ranges).toEqual([block, wholeStatus]);
  });
});

describe('isNgeColumnSelected', () => {
  it('reports a whole column as selected', () => {
    const state = createNgeRangeState({ ranges: [wholeStatus] });

    expect(isNgeColumnSelected(state, 'status', rowOrder, columnOrder)).toBe(true);
    expect(isNgeColumnSelected(state, 'name', rowOrder, columnOrder)).toBe(false);
  });

  // ⚠️ Fully, not partially. Tinting a header the user's block merely passes through
  // would make the band say the same thing for "I selected this column" and "my
  // selection happens to touch it".
  it('does not report a column a block merely passes through', () => {
    const state = createNgeRangeState({ ranges: [block] });

    expect(isNgeCellInRange(state, 'row-3', 'status', rowOrder, columnOrder)).toBe(true);
    expect(isNgeColumnSelected(state, 'status', rowOrder, columnOrder)).toBe(false);
  });

  // The question is what the rectangle covers, not which gesture produced it — so a
  // drag from the first visible row to the last does count.
  it('reports a block dragged across every row', () => {
    const state = createNgeRangeState({
      ranges: [
        {
          anchorColumnId: 'status',
          anchorRowId: 'row-0',
          focusColumnId: 'status',
          focusRowId: 'row-9',
        },
      ],
    });

    expect(isNgeColumnSelected(state, 'status', rowOrder, columnOrder)).toBe(true);
  });

  // ⚠️ The column axis resolves against VISUAL order, so pinning moves a column out
  // from between two endpoints rather than joining it to them — the case a
  // materialised span gets wrong.
  it('follows visual order rather than declaration order', () => {
    const state = createNgeRangeState({
      ranges: [
        { anchorColumnId: 'name', anchorRowId: null, focusColumnId: 'quantity', focusRowId: null },
      ],
    });
    const pinned = orderOf(['status', 'name', 'quantity', 'amount']);

    expect(isNgeColumnSelected(state, 'status', rowOrder, columnOrder)).toBe(true);
    expect(isNgeColumnSelected(state, 'status', rowOrder, pinned)).toBe(false);
  });

  it('answers false for a column the view no longer holds', () => {
    const state = createNgeRangeState({ ranges: [wholeStatus] });

    expect(isNgeColumnSelected(state, 'hidden', rowOrder, columnOrder)).toBe(false);
  });

  it('answers false when nothing is selected', () => {
    expect(isNgeColumnSelected(createNgeRangeState(), 'status', rowOrder, columnOrder)).toBe(
      false
    );
  });

  // A user who picked a column keeps it picked when the filter empties the table —
  // an empty result set is not a reason to un-pick it.
  it('still reports a whole column on a table with no rows', () => {
    const state = createNgeRangeState({ ranges: [wholeStatus] });

    expect(isNgeColumnSelected(state, 'status', orderOf([]), columnOrder)).toBe(true);
  });
});
