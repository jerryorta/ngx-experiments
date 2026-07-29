import type { NgeHighlightRowOrder } from './nge-highlight-state';

import {
  clearNgeHighlight,
  createNgeHighlightState,
  extendNgeHighlightToCell,
  ngeHighlightCellKey,
  hasNgeHighlight,
  isNgeCellHighlighted,
  normalizeNgeHighlightState,
  parseNgeHighlightCellKey,
  toggleNgeHighlightCell,
} from './nge-highlight-state';

/** Ten rows in display order, which is what a range resolves against. */
const rowOrder: NgeHighlightRowOrder = new Map(
  Array.from({ length: 10 }, (_, index) => [`row-${index}`, index])
);

describe('ngeHighlightCellKey / parseNgeHighlightCellKey', () => {
  it('round-trips a plain id pair', () => {
    expect(parseNgeHighlightCellKey(ngeHighlightCellKey('row-1', 'amount'))).toEqual({
      columnId: 'amount',
      rowId: 'row-1',
    });
  });

  // A row id is `getRowId(row)` — the consumer's own value, and a Firestore document
  // path is a very ordinary thing for it to be. Splitting on the FIRST separator
  // would hand back a truncated row id and silently mark the wrong record.
  it('splits on the last separator, so a row id may contain one', () => {
    const key = ngeHighlightCellKey('orgs/a::b/docs/c', 'status');

    expect(parseNgeHighlightCellKey(key)).toEqual({
      columnId: 'status',
      rowId: 'orgs/a::b/docs/c',
    });
  });
});

describe('normalizeNgeHighlightState', () => {
  // ⚠️ The failure this prevents: `createNgeTableState()` cannot know about an
  // addon's slice, so a host that builds its state the documented way hands in
  // `undefined` — and the feature's updaters are given exactly that.
  it('fills in a slice the host has never written', () => {
    expect(normalizeNgeHighlightState(undefined)).toEqual({
      anchor: null,
      cells: [],
      exclusions: [],
      ranges: [],
    });
  });

  it('passes an existing slice through untouched', () => {
    const state = createNgeHighlightState({ cells: ['row-1::amount'] });

    expect(normalizeNgeHighlightState(state)).toBe(state);
  });
});

describe('toggleNgeHighlightCell', () => {
  it('adds a cell and anchors on it', () => {
    const state = toggleNgeHighlightCell(createNgeHighlightState(), 'row-2', 'amount', rowOrder);

    expect(state.cells).toEqual(['row-2::amount']);
    expect(state.anchor).toBe('row-2::amount');
  });

  it('removes a cell that was already marked', () => {
    const first = toggleNgeHighlightCell(createNgeHighlightState(), 'row-2', 'amount', rowOrder);
    const second = toggleNgeHighlightCell(first, 'row-2', 'amount', rowOrder);

    expect(second.cells).toEqual([]);
  });

  // Un-highlighting is still an interaction, and where the user last interacted is
  // where a subsequent shift-click should reach from.
  it('re-anchors even when it un-highlights', () => {
    const first = toggleNgeHighlightCell(createNgeHighlightState(), 'row-2', 'amount', rowOrder);
    const second = toggleNgeHighlightCell(first, 'row-2', 'amount', rowOrder);

    expect(second.anchor).toBe('row-2::amount');
  });

  it('never mutates the state it is given', () => {
    const state = createNgeHighlightState();

    toggleNgeHighlightCell(state, 'row-2', 'amount', rowOrder);

    expect(state.cells).toEqual([]);
  });

  // ⚠️ The dead end this shape exists to fix. Testing `cells.includes(key)` alone
  // meant clicking a range-covered cell added a duplicate that changed nothing on
  // screen, and clicking again removed it while the range kept the cell lit — so a
  // range-covered cell could never be un-highlighted at all.
  describe('a cell covered by a range', () => {
    const ranged = createNgeHighlightState({
      ranges: [{ anchorRowId: 'row-2', columnIds: ['amount'], focusRowId: 'row-5' }],
    });

    it('un-highlights on the first click, by recording an exclusion', () => {
      const state = toggleNgeHighlightCell(ranged, 'row-3', 'amount', rowOrder);

      expect(isNgeCellHighlighted(state, 'row-3', 'amount', rowOrder)).toBe(false);
      expect(state.exclusions).toEqual(['row-3::amount']);
      expect(state.ranges).toEqual(ranged.ranges);
    });

    it('re-highlights on the second click, by dropping the exclusion', () => {
      const off = toggleNgeHighlightCell(ranged, 'row-3', 'amount', rowOrder);
      const on = toggleNgeHighlightCell(off, 'row-3', 'amount', rowOrder);

      expect(isNgeCellHighlighted(on, 'row-3', 'amount', rowOrder)).toBe(true);
      expect(on.exclusions).toEqual([]);
    });

    // Re-including is enough on its own — the block already describes the cell, so
    // adding it to `cells` too would hold the same fact twice.
    it('does not enumerate a re-included cell', () => {
      const off = toggleNgeHighlightCell(ranged, 'row-3', 'amount', rowOrder);
      const on = toggleNgeHighlightCell(off, 'row-3', 'amount', rowOrder);

      expect(on.cells).toEqual([]);
    });

    it('leaves the rest of the block alone', () => {
      const state = toggleNgeHighlightCell(ranged, 'row-3', 'amount', rowOrder);

      expect(isNgeCellHighlighted(state, 'row-2', 'amount', rowOrder)).toBe(true);
      expect(isNgeCellHighlighted(state, 'row-4', 'amount', rowOrder)).toBe(true);
    });
  });

  // No block is holding this cell up, so removing it from `cells` is enough — an
  // exclusion here would subtract from nothing and still have to be persisted.
  it('records no exclusion when only an enumerated cell is removed', () => {
    const on = toggleNgeHighlightCell(createNgeHighlightState(), 'row-2', 'amount', rowOrder);
    const off = toggleNgeHighlightCell(on, 'row-2', 'amount', rowOrder);

    expect(off.exclusions).toEqual([]);
  });
});

describe('extendNgeHighlightToCell', () => {
  const anchored = toggleNgeHighlightCell(createNgeHighlightState(), 'row-2', 'amount', rowOrder);

  it('stores a descriptor rather than enumerating the block', () => {
    const state = extendNgeHighlightToCell(anchored, 'row-6', ['amount', 'quantity']);

    expect(state.ranges).toEqual([
      { anchorRowId: 'row-2', columnIds: ['amount', 'quantity'], focusRowId: 'row-6' },
    ]);
  });

  // Dragging the focus around re-shapes one selection rather than leaving a trail —
  // the behaviour a spreadsheet has.
  it('replaces the block rather than appending, and keeps the anchor put', () => {
    const first = extendNgeHighlightToCell(anchored, 'row-6', ['amount']);
    const second = extendNgeHighlightToCell(first, 'row-4', ['amount']);

    expect(second.ranges).toHaveLength(1);
    expect(second.ranges[0].focusRowId).toBe('row-4');
    expect(second.anchor).toBe('row-2::amount');
  });

  it('does nothing without an anchor', () => {
    const state = createNgeHighlightState();

    expect(extendNgeHighlightToCell(state, 'row-6', ['amount'])).toBe(state);
  });

  // Shift-clicking the same focus twice takes the block back off — the gesture is
  // its own undo. Without it a mis-aimed shift-click could only be corrected by
  // aiming again; there was no way to end up with no block at all.
  describe('shift-clicking the same block again', () => {
    it('removes it', () => {
      const on = extendNgeHighlightToCell(anchored, 'row-6', ['amount']);
      const off = extendNgeHighlightToCell(on, 'row-6', ['amount']);

      expect(off.ranges).toEqual([]);
    });

    it('matches regardless of the order the columns were collected in', () => {
      const on = extendNgeHighlightToCell(anchored, 'row-6', ['amount', 'quantity']);
      const off = extendNgeHighlightToCell(on, 'row-6', ['quantity', 'amount']);

      expect(off.ranges).toEqual([]);
    });

    // Exclusions only ever subtract from a block; with no block left they would
    // silently suppress a later re-selection of the same cells.
    //
    // Built as a literal rather than by clicking, deliberately: un-highlighting a
    // cell also re-anchors on it, so a click-driven setup would leave the anchor at
    // the hole and the next shift-click would describe a *different* block — which
    // correctly replaces rather than toggles. That is the behaviour, not a gap; this
    // test is about the removal path itself.
    it('drops exclusions once no block is left to subtract from', () => {
      const holed = createNgeHighlightState({
        anchor: 'row-2::amount',
        exclusions: ['row-4::amount'],
        ranges: [{ anchorRowId: 'row-2', columnIds: ['amount'], focusRowId: 'row-6' }],
      });

      const off = extendNgeHighlightToCell(holed, 'row-6', ['amount']);

      expect(off.ranges).toEqual([]);
      expect(off.exclusions).toEqual([]);
    });

    it('still replaces when the block is a different one', () => {
      const on = extendNgeHighlightToCell(anchored, 'row-6', ['amount']);
      const moved = extendNgeHighlightToCell(on, 'row-7', ['amount']);

      expect(moved.ranges).toHaveLength(1);
      expect(moved.ranges[0].focusRowId).toBe('row-7');
    });
  });
});

describe('isNgeCellHighlighted', () => {
  it('is false for an empty slice', () => {
    expect(isNgeCellHighlighted(createNgeHighlightState(), 'row-1', 'amount', rowOrder)).toBe(
      false
    );
  });

  it('matches an individually-picked cell', () => {
    const state = createNgeHighlightState({ cells: ['row-1::amount'] });

    expect(isNgeCellHighlighted(state, 'row-1', 'amount', rowOrder)).toBe(true);
    expect(isNgeCellHighlighted(state, 'row-1', 'status', rowOrder)).toBe(false);
    expect(isNgeCellHighlighted(state, 'row-2', 'amount', rowOrder)).toBe(false);
  });

  describe('ranges', () => {
    const state = createNgeHighlightState({
      ranges: [{ anchorRowId: 'row-2', columnIds: ['amount', 'quantity'], focusRowId: 'row-5' }],
    });

    it('covers every row between the endpoints, inclusive', () => {
      expect(isNgeCellHighlighted(state, 'row-2', 'amount', rowOrder)).toBe(true);
      expect(isNgeCellHighlighted(state, 'row-4', 'amount', rowOrder)).toBe(true);
      expect(isNgeCellHighlighted(state, 'row-5', 'amount', rowOrder)).toBe(true);
    });

    it('excludes rows outside the endpoints and columns outside the span', () => {
      expect(isNgeCellHighlighted(state, 'row-1', 'amount', rowOrder)).toBe(false);
      expect(isNgeCellHighlighted(state, 'row-6', 'amount', rowOrder)).toBe(false);
      expect(isNgeCellHighlighted(state, 'row-3', 'status', rowOrder)).toBe(false);
    });

    it('resolves the same block when the focus sorts above the anchor', () => {
      const inverted = createNgeHighlightState({
        ranges: [{ anchorRowId: 'row-5', columnIds: ['amount'], focusRowId: 'row-2' }],
      });

      expect(isNgeCellHighlighted(inverted, 'row-3', 'amount', rowOrder)).toBe(true);
    });

    // A filter that hides an endpoint has removed the block's boundary. Inventing
    // one would highlight rows the user never dragged across.
    it('matches nothing when an endpoint is not in the current row model', () => {
      expect(isNgeCellHighlighted(state, 'row-3', 'amount', new Map([['row-3', 0]]))).toBe(false);
    });

    // ⚠️ The documented consequence of an id-anchored descriptor, and the reason
    // ARCH-269 inherits this decision rather than re-litigating it: the endpoints
    // follow their records, so the block follows the view.
    it('follows the view order, so a re-sort re-shapes the block', () => {
      // Built from an ordered array rather than a map literal: the ids are
      // deliberately NOT in id order — that is the whole point — and position is
      // the value being asserted on.
      const resorted: NgeHighlightRowOrder = new Map(
        ['row-5', 'row-9', 'row-2', 'row-4'].map((id, index) => [id, index])
      );

      expect(isNgeCellHighlighted(state, 'row-9', 'amount', resorted)).toBe(true);
      expect(isNgeCellHighlighted(state, 'row-4', 'amount', resorted)).toBe(false);
    });
  });
});

describe('hasNgeHighlight', () => {
  it('is false for an empty slice', () => {
    expect(hasNgeHighlight(createNgeHighlightState())).toBe(false);
  });

  it('is true for a picked cell or a range', () => {
    expect(hasNgeHighlight(createNgeHighlightState({ cells: ['row-1::amount'] }))).toBe(true);
    expect(
      hasNgeHighlight(
        createNgeHighlightState({
          ranges: [{ anchorRowId: 'row-2', columnIds: ['amount'], focusRowId: 'row-5' }],
        })
      )
    ).toBe(true);
  });

  // An anchor is where the NEXT gesture would start — invisible, and not something
  // the user can give up. This is what keeps the Escape handler out of a dialog's way.
  it('ignores a lone anchor', () => {
    expect(hasNgeHighlight(createNgeHighlightState({ anchor: 'row-2::amount' }))).toBe(false);
  });
});

describe('clearNgeHighlight', () => {
  // The anchor goes too: keeping it would leave a later shift-click extending from a
  // cell the user can no longer see.
  it('drops the marks AND the anchor', () => {
    const state = clearNgeHighlight(
      createNgeHighlightState({
        anchor: 'row-2::amount',
        cells: ['row-1::amount'],
        ranges: [{ anchorRowId: 'row-2', columnIds: ['amount'], focusRowId: 'row-5' }],
      })
    );

    expect(state).toEqual({ anchor: null, cells: [], exclusions: [], ranges: [] });
  });

  // Same reference when there is nothing to give up, so a key handler can call it
  // freely without churning state or emitting a no-op stateChange.
  it('returns the same object when nothing is marked', () => {
    const state = createNgeHighlightState({ anchor: 'row-2::amount' });

    expect(clearNgeHighlight(state)).toBe(state);
  });
});

describe('the persistable-view property', () => {
  it('survives a JSON round trip unchanged', () => {
    const state = createNgeHighlightState({
      anchor: 'row-2::amount',
      cells: ['row-1::amount', 'row-3::status'],
      ranges: [{ anchorRowId: 'row-2', columnIds: ['amount', 'quantity'], focusRowId: 'row-5' }],
    });

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  /**
   * ⚠️ **The reason this slice is not a per-cell map**, asserted rather than
   * asserted-in-prose.
   *
   * Highlighting one column of the 10,000-row fixture as `Record<cellKey, true>`
   * is ~270 KB of JSON re-emitted on every `stateChange`, and three or four such
   * columns exceed Firestore's 1 MiB document limit — which breaks the "a user's
   * view can be persisted and restored" property, not merely the frame budget. A
   * descriptor is one object regardless of row count.
   */
  it('keeps a whole-column highlight to a constant size', () => {
    const enumerated = Object.fromEntries(
      Array.from({ length: 10_000 }, (_, index) => [`row-${index}::amount`, true])
    );
    const descriptor = createNgeHighlightState({
      ranges: [{ anchorRowId: 'row-0', columnIds: ['amount'], focusRowId: 'row-9999' }],
    });

    expect(JSON.stringify(enumerated).length).toBeGreaterThan(200_000);
    expect(JSON.stringify(descriptor).length).toBeLessThan(200);
  });

  it('answers membership across the whole 10,000-row block without materialising it', () => {
    const order: NgeHighlightRowOrder = new Map(
      Array.from({ length: 10_000 }, (_, index) => [`row-${index}`, index])
    );
    const state = createNgeHighlightState({
      ranges: [{ anchorRowId: 'row-0', columnIds: ['amount'], focusRowId: 'row-9999' }],
    });

    expect(isNgeCellHighlighted(state, 'row-7777', 'amount', order)).toBe(true);
    expect(isNgeCellHighlighted(state, 'row-7777', 'status', order)).toBe(false);
  });
});
