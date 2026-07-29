import type { Row } from '@tanstack/angular-table';

import { NGE_TABLE_DEFAULTS } from '../../nge-table-defaults';
import {
  createNgeSelectionColumn,
  NGE_TABLE_SELECTION_COLUMN_ID,
  ngeSelectionOf,
  ngeSelectionRangeIds,
  ngeSelectionToggled,
} from './nge-table-selection';

/**
 * The two members {@link ngeSelectionRangeIds} reads, and nothing else.
 *
 * A stub rather than a real engine row because the function is a pure walk over an
 * ordered list — the engine adds nothing to exercise here, and standing one up
 * would make the *order* under test implicit rather than stated. The store spec
 * covers the same function against a real row model.
 */
function rowStub(id: string, canSelect = true): Row<unknown> {
  return { getCanSelect: () => canSelect, id } as Row<unknown>;
}

const rows = ['a', 'b', 'c', 'd', 'e'].map(id => rowStub(id));

describe('createNgeSelectionColumn', () => {
  it('is a display column under the namespaced id', () => {
    const column = createNgeSelectionColumn();

    expect(column.id).toBe(NGE_TABLE_SELECTION_COLUMN_ID);
    expect(NGE_TABLE_SELECTION_COLUMN_ID.startsWith('nge-table-')).toBe(true);
    // No accessor of any kind — what it renders is not data.
    expect(column).not.toHaveProperty('accessorKey');
    expect(column).not.toHaveProperty('accessorFn');
  });

  it('withholds sorting, resizing, and hiding', () => {
    expect(createNgeSelectionColumn()).toMatchObject({
      enableHiding: false,
      enableResizing: false,
      enableSorting: false,
    });
  });

  // Equal bounds are what pin the width at the level `getSize()` reads, rather
  // than only withdrawing the drag affordance.
  it('pins its width through the engine clamp, not just through the flag', () => {
    const { maxSize, minSize, size } = createNgeSelectionColumn();
    const { selectionColumnWidth } = NGE_TABLE_DEFAULTS;

    expect([maxSize, minSize, size]).toEqual([
      selectionColumnWidth,
      selectionColumnWidth,
      selectionColumnWidth,
    ]);
  });
});

describe('ngeSelectionRangeIds', () => {
  it('takes the rows between the anchor and the focus, inclusive', () => {
    expect(ngeSelectionRangeIds(rows, 'b', 'd')).toEqual(['b', 'c', 'd']);
  });

  // A user may shift-click above the anchor as readily as below it.
  it('reads the same range in either direction', () => {
    expect(ngeSelectionRangeIds(rows, 'd', 'b')).toEqual(['b', 'c', 'd']);
  });

  it('is the anchor alone when the anchor is also the focus', () => {
    expect(ngeSelectionRangeIds(rows, 'c', 'c')).toEqual(['c']);
  });

  // The first shift-click of a table's life has nothing to extend from, and
  // "select the row I clicked" is what the gesture means there.
  it('degenerates to the clicked row when there is no anchor', () => {
    expect(ngeSelectionRangeIds(rows, null, 'c')).toEqual(['c']);
  });

  // A filter or a re-fetch can retire the anchor while the user still holds it in
  // mind. Selecting from row zero would be worse than selecting nothing.
  it('degenerates to the clicked row when the anchor has left the row model', () => {
    expect(ngeSelectionRangeIds(rows, 'gone', 'c')).toEqual(['c']);
  });

  it('is empty when the clicked row is not in the row model', () => {
    expect(ngeSelectionRangeIds(rows, 'a', 'gone')).toEqual([]);
  });

  // The engine applies `getCanSelect()` inside `mutateRowIsSelected`, which a
  // one-shot range write never reaches — so the capability check has to be here.
  it('drops rows that cannot be selected', () => {
    const mixed = [rowStub('a'), rowStub('b', false), rowStub('c')];

    expect(ngeSelectionRangeIds(mixed, 'a', 'c')).toEqual(['a', 'c']);
  });

  // The whole reason the caller passes the PROCESSED row model: the range is
  // whatever currently sits between the two clicks, not what the source order
  // held. Re-sorting is expressed here as re-ordering the array.
  it('follows the order it is given rather than any source order', () => {
    const sorted = ['e', 'd', 'c', 'b', 'a'].map(id => rowStub(id));

    expect(ngeSelectionRangeIds(sorted, 'b', 'd')).toEqual(['d', 'c', 'b']);
  });
});

describe('ngeSelectionOf', () => {
  it('marks every id as selected', () => {
    expect(ngeSelectionOf(['a', 'c'])).toEqual({ a: true, c: true });
  });

  it('is empty for an empty range', () => {
    expect(ngeSelectionOf([])).toEqual({});
  });
});

describe('ngeSelectionToggled', () => {
  it('adds a row without disturbing the rest', () => {
    expect(ngeSelectionToggled({ a: true }, 'b', true)).toEqual({ a: true, b: true });
  });

  // ⚠️ Absent, never `false`. A map of `false` values would grow for the whole
  // life of a session and persist that way into a saved view.
  it('removes a row by deleting its key rather than writing false', () => {
    const next = ngeSelectionToggled({ a: true, b: true }, 'b', false);

    expect(next).toEqual({ a: true });
    expect('b' in next).toBe(false);
  });

  it('leaves the object it was given untouched', () => {
    const selection = { a: true };

    ngeSelectionToggled(selection, 'b', true);

    expect(selection).toEqual({ a: true });
  });
});
