import {
  createNgeTableState,
  NGE_TABLE_DEFAULT_PAGE_SIZE,
  NGE_TABLE_INITIAL_STATE,
  type NgeTableState,
} from './nge-table-state';

/**
 * A state with every slice populated — including the awkward corners: a nested
 * object inside a filter value, both pinning edges, and the `expanded: true`
 * shorthand. If this survives JSON, anything a consumer can build survives it.
 */
function fullyPopulatedState(): NgeTableState {
  return createNgeTableState({
    columnFilters: [
      { id: 'status', value: ['active', 'pending'] },
      { id: 'amount', value: { max: 500, min: 100 } },
      { id: 'isActive', value: true },
    ],
    columnOrder: ['name', 'status', 'amount'],
    columnPinning: { left: ['name'], right: ['owner'] },
    columnSizing: { amount: 120, name: 240 },
    columnVisibility: { createdAt: false, name: true },
    expanded: { 'row-1': true },
    globalFilter: 'widget',
    pagination: { pageIndex: 3, pageSize: 25 },
    rowSelection: { 'row-1': true, 'row-7': true },
    sorting: [
      { desc: false, id: 'name' },
      { desc: true, id: 'amount' },
    ],
  });
}

describe('createNgeTableState', () => {
  it('returns an empty state with the default page size', () => {
    expect(createNgeTableState()).toEqual({
      columnFilters: [],
      columnOrder: [],
      columnPinning: { left: [], right: [] },
      columnSizing: {},
      columnVisibility: {},
      expanded: {},
      globalFilter: null,
      pagination: { pageIndex: 0, pageSize: NGE_TABLE_DEFAULT_PAGE_SIZE },
      rowSelection: {},
      sorting: [],
    });
  });

  it('applies overrides over the empty baseline', () => {
    const state = createNgeTableState({ sorting: [{ desc: true, id: 'amount' }] });

    expect(state.sorting).toEqual([{ desc: true, id: 'amount' }]);
    expect(state.columnFilters).toEqual([]);
  });

  it('never shares nested collections between calls', () => {
    const first = createNgeTableState();
    const second = createNgeTableState();

    expect(first.sorting).not.toBe(second.sorting);
    expect(first.columnPinning).not.toBe(second.columnPinning);
    expect(first.columnSizing).not.toBe(second.columnSizing);
  });
});

describe('NgeTableState serialization', () => {
  // The whole point of the controlled-state contract: a consumer can persist a
  // user's view to Firestore and restore it. If a slice ever gains a Date, a Map,
  // or a function, this is what fails.
  it('round-trips through JSON with no loss', () => {
    const state = fullyPopulatedState();

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('round-trips the expand-all shorthand', () => {
    const state = createNgeTableState({ expanded: true });

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('round-trips the empty baseline', () => {
    expect(JSON.parse(JSON.stringify(NGE_TABLE_INITIAL_STATE))).toEqual(NGE_TABLE_INITIAL_STATE);
  });

  it('drops nothing — every key survives', () => {
    const state = fullyPopulatedState();

    expect(Object.keys(JSON.parse(JSON.stringify(state))).sort()).toEqual(
      Object.keys(state).sort()
    );
  });
});
