import type { NgeTableState } from '../nge-table-state';

import { createNgeTableState } from '../nge-table-state';
import { ngeTableStateEventFor } from './nge-table-state-event';

/** The baseline every case below is compared against. */
const EMPTY = createNgeTableState();

describe('ngeTableStateEventFor', () => {
  it('announces a sort with the whole resulting stack', () => {
    const state = createNgeTableState({ sorting: [{ desc: true, id: 'amount' }] });

    expect(ngeTableStateEventFor('sorting', EMPTY, state)).toEqual({
      kind: 'sort-change',
      sorting: [{ desc: true, id: 'amount' }],
    });
  });

  it('announces a pin with the whole resulting slice', () => {
    const state = createNgeTableState({ columnPinning: { left: ['name'], right: ['owner'] } });

    expect(ngeTableStateEventFor('columnPinning', EMPTY, state)).toEqual({
      columnPinning: { left: ['name'], right: ['owner'] },
      kind: 'column-pin',
    });
  });

  it('announces a reorder with the whole resulting slice', () => {
    const state = createNgeTableState({ columnOrder: ['owner', 'name'] });

    expect(ngeTableStateEventFor('columnOrder', EMPTY, state)).toEqual({
      columnOrder: ['owner', 'name'],
      kind: 'column-reorder',
    });
  });

  it('announces pagination with the whole resulting slice', () => {
    const state = createNgeTableState({ pagination: { pageIndex: 2, pageSize: 25 } });

    expect(ngeTableStateEventFor('pagination', EMPTY, state)).toEqual({
      kind: 'pagination-change',
      pagination: { pageIndex: 2, pageSize: 25 },
    });
  });

  // One kind for two slices, and it carries both — a listener reacting to "the
  // visible rows may have moved" should not have to ask which of them moved.
  it.each(['columnFilters', 'globalFilter'] as const)(
    'announces a %s change as one filter-change carrying both filter slices',
    slice => {
      const state = createNgeTableState({
        columnFilters: [{ id: 'status', value: 'open' }],
        globalFilter: 'acme',
      });

      expect(ngeTableStateEventFor(slice, EMPTY, state)).toEqual({
        columnFilters: [{ id: 'status', value: 'open' }],
        globalFilter: 'acme',
        kind: 'filter-change',
      });
    }
  );

  // ⚠️ THE THROTTLING CONTRACT, AS A TEST. A drag writes `columnSizing` on every
  // `pointermove`, so a mapping here would emit an event per frame of a gesture.
  // `column-resize` is emitted from the commit sites in `NgeTableStore` instead
  // — which are also the only places that know which column moved. Do not
  // "complete the table" by adding an entry for this slice.
  it('says nothing for columnSizing, which is announced on commit instead', () => {
    const state = createNgeTableState({ columnSizing: { name: 320 } });

    expect(ngeTableStateEventFor('columnSizing', EMPTY, state)).toBeNull();
  });

  // Absent for a different reason than columnSizing: scope, not design. It brings
  // its own kind when its feature story lands, exactly as `expanded` did below.
  it('says nothing for columnVisibility, whose feature has not shipped', () => {
    const state = createNgeTableState({ columnVisibility: { name: false } });

    expect(ngeTableStateEventFor('columnVisibility', EMPTY, state)).toBeNull();
  });

  it('announces an expansion change with the whole resulting slice', () => {
    const state = createNgeTableState({ expanded: { 'row-1': true } });

    expect(ngeTableStateEventFor('expanded', EMPTY, state)).toEqual({
      expanded: { 'row-1': true },
      kind: 'expansion-change',
    });
  });

  // ⚠️ The shorthand reaches a listener as the literal `true`, not as a map — so a
  // consumer that narrows this payload to a `Record` is wrong for exactly the
  // gesture (expand-all) most likely to produce a large one.
  it('carries the true shorthand through rather than materialising a map', () => {
    const state = createNgeTableState({ expanded: true });

    expect(ngeTableStateEventFor('expanded', EMPTY, state)).toEqual({
      expanded: true,
      kind: 'expansion-change',
    });
  });

  it('announces a selection change with the whole resulting slice', () => {
    const state = createNgeTableState({ rowSelection: { 'row-1': true, 'row-2': true } });

    expect(ngeTableStateEventFor('rowSelection', EMPTY, state)).toEqual({
      kind: 'selection-change',
      rowSelection: { 'row-1': true, 'row-2': true },
    });
  });

  // ⚠️ THE ENGINE'S OWN PHANTOM WRITE. `_autoResetPageIndex` fires on every
  // row-model rebuild and calls `resetPageIndex()`, which writes a NEW pagination
  // object holding the values it already held. Comparing by reference would let
  // every sort on an unpaginated table announce a pagination change that changed
  // nothing.
  describe('a slice rewritten to the value it already held', () => {
    it('says nothing when the engine resets a page index that was already zero', () => {
      const next = createNgeTableState({ pagination: { pageIndex: 0, pageSize: 50 } });

      expect(next.pagination).not.toBe(EMPTY.pagination);
      expect(ngeTableStateEventFor('pagination', EMPTY, next)).toBeNull();
    });

    it('still announces a reset that actually moved the page', () => {
      const previous = createNgeTableState({ pagination: { pageIndex: 3, pageSize: 50 } });
      const next = createNgeTableState({ pagination: { pageIndex: 0, pageSize: 50 } });

      expect(ngeTableStateEventFor('pagination', previous, next)).toMatchObject({
        kind: 'pagination-change',
      });
    });

    // Typed rather than `as const`: the fixtures feed `createNgeTableState`, whose
    // slices are mutable, and a deeply-readonly literal is not assignable to them.
    it.each<[string, Partial<NgeTableState>]>([
      ['an equal sort stack', { sorting: [{ desc: true, id: 'name' }] }],
      ['an equal pinning map', { columnPinning: { left: ['name'], right: [] } }],
      ['an equal column order', { columnOrder: ['owner', 'name'] }],
      ['an equal filter list', { columnFilters: [{ id: 'status', value: 'open' }] }],
    ])('says nothing for %s rebuilt as a new object', (_label, overrides) => {
      const key = Object.keys(overrides)[0] as
        'columnFilters' | 'columnOrder' | 'columnPinning' | 'sorting';

      // Round-tripped through JSON rather than shared, so the two states hold
      // equal values in entirely separate objects — which is exactly the shape
      // the engine's own rewrites arrive in.
      const clone = JSON.parse(JSON.stringify(overrides)) as Partial<NgeTableState>;

      expect(
        ngeTableStateEventFor(key, createNgeTableState(overrides), createNgeTableState(clone))
      ).toBeNull();
    });

    // Ordered where order is meaning (a sort STACK), unordered where it is not.
    it('announces a reordered sort stack, because the order is the meaning', () => {
      const previous = createNgeTableState({
        sorting: [
          { desc: false, id: 'name' },
          { desc: false, id: 'amount' },
        ],
      });
      const next = createNgeTableState({
        sorting: [
          { desc: false, id: 'amount' },
          { desc: false, id: 'name' },
        ],
      });

      expect(ngeTableStateEventFor('sorting', previous, next)).toMatchObject({
        kind: 'sort-change',
      });
    });
  });
});
