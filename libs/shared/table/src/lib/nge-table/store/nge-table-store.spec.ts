import type { Header, Row } from '@tanstack/angular-table';

import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { NgeTableFixtureRow } from '../../../testing';
import type { NgeTableEvent } from '../../events';
import type { NgeTableConfig } from '../../nge-table-config';
import type { NgeTableState } from '../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_COLUMNS } from '../../../testing';
import { NGE_CELL_NEVER_EDITING } from '../../edit';
import { createNgeTableConfig } from '../../nge-table-config';
import { NGE_TABLE_DEFAULTS } from '../../nge-table-defaults';
import { createNgeTableState } from '../../nge-table-state';
import { NGE_TABLE_EXPANSION_COLUMN_ID } from './nge-table-expansion';
import { NGE_TABLE_SELECTION_COLUMN_ID } from './nge-table-selection';
import { buildTableOptions, NgeTableStore } from './nge-table-store';

const rows = createNgeTableFixture({ rows: 12 });

const allColumnIds = NGE_TABLE_FIXTURE_COLUMNS.map(column => column.id).filter(
  (id): id is string => id !== undefined
);

/** The fixture config, narrowed to the payload-agnostic shape the store holds. */
function fixtureConfig(
  overrides: Partial<NgeTableConfig<NgeTableFixtureRow>> = {}
): NgeTableConfig<unknown> {
  return createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    ...overrides,
  }) as NgeTableConfig<unknown>;
}

function names(store: InstanceType<typeof NgeTableStore>): string[] {
  return store.table.getRowModel().rows.map(row => (row.original as NgeTableFixtureRow).name);
}

function createStore(): InstanceType<typeof NgeTableStore> {
  TestBed.configureTestingModule({ providers: [NgeTableStore] });
  return TestBed.inject(NgeTableStore);
}

describe('buildTableOptions', () => {
  it('falls back to NGE_TABLE_DEFAULTS when the config supplies no geometry', () => {
    const options = buildTableOptions({ columns: [], data: [] }, createNgeTableState(), {
      applyTableState: jest.fn(),
      applyTableStateChange: jest.fn(),
    });

    expect(options.defaultColumn).toEqual({
      maxSize: NGE_TABLE_DEFAULTS.columnMaxWidth,
      minSize: NGE_TABLE_DEFAULTS.columnMinWidth,
      size: NGE_TABLE_DEFAULTS.columnDefaultWidth,
    });
  });

  it('tolerates a null config so the store can exist before one arrives', () => {
    const options = buildTableOptions(null, createNgeTableState(), {
      applyTableState: jest.fn(),
      applyTableStateChange: jest.fn(),
    });

    expect(options.columns).toEqual([]);
    expect(options.data).toEqual([]);
  });

  it('hands the supplied state straight to the engine', () => {
    const tableState = createNgeTableState({ sorting: [{ desc: true, id: 'name' }] });

    expect(
      buildTableOptions(null, tableState, {
        applyTableState: jest.fn(),
        applyTableStateChange: jest.fn(),
      }).state
    ).toBe(tableState);
  });

  // Every slice named in the controlled-state contract must have a live handler.
  // A missing one is a change the host would never hear about.
  it.each([
    ['onColumnFiltersChange', 'columnFilters'],
    ['onColumnOrderChange', 'columnOrder'],
    ['onColumnPinningChange', 'columnPinning'],
    ['onColumnSizingChange', 'columnSizing'],
    ['onColumnVisibilityChange', 'columnVisibility'],
    ['onExpandedChange', 'expanded'],
    ['onGlobalFilterChange', 'globalFilter'],
    ['onPaginationChange', 'pagination'],
    ['onRowSelectionChange', 'rowSelection'],
    ['onSortingChange', 'sorting'],
  ] as const)('routes %s to the %s slice', (handler, slice) => {
    const applyTableStateChange = jest.fn();
    const options = buildTableOptions(null, createNgeTableState(), {
      applyTableState: jest.fn(),
      applyTableStateChange,
    });

    const callback = options[handler];
    expect(typeof callback).toBe('function');
    callback?.('sentinel' as never);

    expect(applyTableStateChange).toHaveBeenCalledWith(slice, 'sentinel');
  });

  // `enableSorting: false` already suppresses state-driven sorting — the engine
  // filters `state.sorting` through `getCanSort()` in `getSortedRowModel`. Its
  // pinning feature has no equivalent, reading `state.columnPinning` raw, so the
  // capability flag is honoured here instead. Otherwise the two flags would mean
  // different kinds of thing.
  describe('the pinning capability flag', () => {
    const pinned = createNgeTableState({
      columnPinning: { left: ['name'], right: ['owner'] },
    });

    it('hides the pinning from the engine when the config switches pinning off', () => {
      const options = buildTableOptions(fixtureConfig({ enablePinning: false }), pinned, {
        applyTableState: jest.fn(),
        applyTableStateChange: jest.fn(),
      });

      expect(options.state?.columnPinning).toEqual({ left: [], right: [] });
    });

    it('forwards the pinning when the config switches pinning on', () => {
      const options = buildTableOptions(fixtureConfig({ enablePinning: true }), pinned, {
        applyTableState: jest.fn(),
        applyTableStateChange: jest.fn(),
      });

      expect(options.state).toBe(pinned);
    });

    // The overwhelmingly common case, and the one that must not allocate: the
    // boundary's echo check in `<nge-table>` is reference-based, so handing back a
    // copy of an unpinned state would make every rebuild look like a host change.
    it('passes an unpinned state straight through even with pinning off', () => {
      const unpinned = createNgeTableState();
      const options = buildTableOptions(fixtureConfig({ enablePinning: false }), unpinned, {
        applyTableState: jest.fn(),
        applyTableStateChange: jest.fn(),
      });

      expect(options.state).toBe(unpinned);
    });

    // Blanking what the engine sees must never blank what the host owns — a saved
    // view keeps its pinned columns across a toggle of the flag.
    it('does not rewrite the state it was handed', () => {
      buildTableOptions(fixtureConfig({ enablePinning: false }), pinned, {
        applyTableState: jest.fn(),
        applyTableStateChange: jest.fn(),
      });

      expect(pinned.columnPinning).toEqual({ left: ['name'], right: ['owner'] });
    });
  });
});

describe('NgeTableStore lane derivations', () => {
  /** Every column in the fixture takes the default width, so the sums are exact. */
  const { columnDefaultWidth } = NGE_TABLE_DEFAULTS;

  function pinnedStore(
    columnPinning: NgeTableState['columnPinning']
  ): InstanceType<typeof NgeTableStore> {
    const store = createStore();
    store.setConfig(fixtureConfig({ enablePinning: true }));
    store.setTableState(createNgeTableState({ columnPinning }));
    return store;
  }

  function laneKinds(store: InstanceType<typeof NgeTableStore>): string[] {
    return (store.headerRows()[0]?.lanes ?? []).map(lane => lane.kind);
  }

  /** Pinning state → the lanes it should produce, in visual order. */
  const laneCases: [NgeTableState['columnPinning'], string[]][] = [
    [{}, ['center']],
    [{ left: ['name'] }, ['pinned-left', 'center']],
    [{ right: ['owner'] }, ['center', 'pinned-right']],
    [{ left: ['name'], right: ['owner'] }, ['pinned-left', 'center', 'pinned-right']],
    // Every column pinned is a legitimate state, not an edge case to crash on.
    [{ left: allColumnIds }, ['pinned-left']],
  ];

  it('reports everything as center width when nothing is pinned', () => {
    const store = createStore();
    store.setConfig(fixtureConfig());

    const total = columnDefaultWidth * NGE_TABLE_FIXTURE_COLUMNS.length;
    expect(store.laneWidths()).toEqual({ center: total, left: 0, right: 0, total });
  });

  // The widths are the engine's own reduction over each lane's visible leaf
  // columns, which is what keeps them right after a resize (ARCH-244) or a reorder
  // without anything here being told about it.
  it('splits the widths across the lanes once columns are pinned', () => {
    const store = pinnedStore({ left: ['name', 'status'], right: ['owner'] });

    expect(store.laneWidths()).toEqual({
      center: columnDefaultWidth * 4,
      left: columnDefaultWidth * 2,
      right: columnDefaultWidth,
      total: columnDefaultWidth * NGE_TABLE_FIXTURE_COLUMNS.length,
    });
  });

  it('recomputes the widths when the pinning changes', () => {
    const store = pinnedStore({ left: ['name'] });
    expect(store.laneWidths().left).toBe(columnDefaultWidth);

    store.setTableState(createNgeTableState({ columnPinning: { left: ['name', 'status'] } }));

    expect(store.laneWidths().left).toBe(columnDefaultWidth * 2);
  });

  // Empty lanes are dropped rather than rendered, which is what keeps the unpinned
  // table — the common one — at one wrapper per row instead of three.
  it.each(laneCases)('turns the pinning %j into the lanes %j', (columnPinning, expected) => {
    expect(laneKinds(pinnedStore(columnPinning))).toEqual(expected);
  });

  it('has no lanes at all before a config arrives', () => {
    expect(laneKinds(createStore())).toEqual([]);
  });

  it('splits a row into the same lanes as the header', () => {
    const store = pinnedStore({ left: ['name', 'status'], right: ['owner'] });
    const row = store.table.getRowModel().rows[0];

    expect(store.laneCellsFor(row).map(lane => [lane.kind, lane.items.length])).toEqual([
      ['pinned-left', 2],
      ['center', 4],
      ['pinned-right', 1],
    ]);
  });

  it('numbers columns by visual position, so pinning reorders the indices', () => {
    const store = pinnedStore({ left: ['owner'], right: ['name'] });

    expect(store.columnIndexById()).toEqual({
      amount: 4,
      createdAt: 5,
      isActive: 6,
      name: 7,
      owner: 1,
      quantity: 3,
      status: 2,
    });
  });

  it('counts header rows into the aria row count', () => {
    const store = createStore();
    store.setConfig(fixtureConfig());

    expect(store.ariaColumnCount()).toBe(NGE_TABLE_FIXTURE_COLUMNS.length);
    expect(store.ariaRowCount()).toBe(rows.length + 1);
  });
});

describe('NgeTableStore', () => {
  it('starts with no config and an empty state', () => {
    const store = createStore();

    expect(store.config()).toBeNull();
    expect(store.tableState()).toEqual(createNgeTableState());
  });

  it('renders the config rows once one is set', () => {
    const store = createStore();
    store.setConfig(fixtureConfig());

    expect(store.table.getRowModel().rows).toHaveLength(rows.length);
  });

  describe('the controlled-state round trip', () => {
    it('reflects state pushed in from outside', () => {
      const store = createStore();
      store.setConfig(fixtureConfig());
      const unsorted = names(store);

      store.setTableState(createNgeTableState({ sorting: [{ desc: false, id: 'name' }] }));

      expect(names(store)).toEqual([...unsorted].sort());
    });

    it('records interaction driven through the engine', () => {
      const store = createStore();
      store.setConfig(fixtureConfig());

      store.table.getColumn('name')?.toggleSorting(false);

      expect(store.tableState().sorting).toEqual([{ desc: false, id: 'name' }]);
    });

    it('leaves the other slices untouched when one changes', () => {
      const store = createStore();
      store.setConfig(fixtureConfig());
      store.setTableState(createNgeTableState({ columnOrder: ['status', 'name'] }));

      store.table.getColumn('amount')?.toggleSorting(true);

      expect(store.tableState().columnOrder).toEqual(['status', 'name']);
      expect(store.tableState().sorting).toEqual([{ desc: true, id: 'amount' }]);
    });
  });

  describe('applyTableStateChange', () => {
    it('accepts a bare value', () => {
      const store = createStore();

      store.applyTableStateChange('sorting', [{ desc: true, id: 'quantity' }]);

      expect(store.tableState().sorting).toEqual([{ desc: true, id: 'quantity' }]);
    });

    it('accepts an updater function and resolves it against the current slice', () => {
      const store = createStore();
      store.applyTableStateChange('columnOrder', ['name']);

      store.applyTableStateChange('columnOrder', current => [...current, 'status']);

      expect(store.tableState().columnOrder).toEqual(['name', 'status']);
    });

    it('replaces rather than mutates, so an emitted state is safe to keep', () => {
      const store = createStore();
      const before = store.tableState();

      store.applyTableStateChange('sorting', [{ desc: false, id: 'name' }]);

      expect(store.tableState()).not.toBe(before);
      expect(before.sorting).toEqual([]);
    });
  });
});

describe('NgeTableStore column resizing', () => {
  const { columnDefaultWidth, columnMaxWidth, columnMinWidth } = NGE_TABLE_DEFAULTS;

  /** A store with resizing switched on, plus the header a drag would grab. */
  function resizableStore(
    overrides: Partial<NgeTableConfig<NgeTableFixtureRow>> = {}
  ): InstanceType<typeof NgeTableStore> {
    const store = createStore();
    store.setConfig(fixtureConfig({ enableColumnResizing: true, ...overrides }));
    return store;
  }

  function headerFor(
    store: InstanceType<typeof NgeTableStore>,
    columnId: string
  ): Header<unknown, unknown> {
    const header = store.table
      .getHeaderGroups()[0]
      ?.headers.find(candidate => candidate.column.id === columnId);

    if (!header) {
      throw new Error(`no header for ${columnId}`);
    }

    return header;
  }

  /** Grab `columnId` at x=500 and drag the pointer to `clientX`. */
  function drag(
    store: InstanceType<typeof NgeTableStore>,
    columnId: string,
    clientX: number
  ): void {
    store.beginColumnResize(headerFor(store, columnId), 1, 500);
    store.updateColumnResize(1, clientX);
  }

  describe('the drag lifecycle', () => {
    it('reports the grabbed column while a drag is in flight', () => {
      const store = resizableStore();
      expect(store.resizingColumnId()).toBeNull();

      store.beginColumnResize(headerFor(store, 'name'), 1, 500);

      expect(store.resizingColumnId()).toBe('name');
    });

    it('clears the drag on release', () => {
      const store = resizableStore();
      store.beginColumnResize(headerFor(store, 'name'), 1, 500);

      store.endColumnResize();

      expect(store.resizingColumnId()).toBeNull();
    });

    it('tolerates a release with no drag in flight', () => {
      const store = resizableStore();

      expect(() => store.endColumnResize()).not.toThrow();
      expect(store.resizingColumnId()).toBeNull();
    });

    // The capability decides the effect, not merely whether a handle is drawn —
    // a caller that renders one anyway still cannot resize the column.
    it('refuses to start when the config withholds resizing', () => {
      const store = resizableStore({ enableColumnResizing: false });

      store.beginColumnResize(headerFor(store, 'name'), 1, 500);

      expect(store.resizingColumnId()).toBeNull();
      expect(store.tableState().columnSizing).toEqual({});
    });

    // Pointer capture makes this rare, but a second finger must not be able to
    // take over a drag the first one owns.
    it('ignores a move from a pointer that does not own the drag', () => {
      const store = resizableStore();
      store.beginColumnResize(headerFor(store, 'name'), 1, 500);

      store.updateColumnResize(2, 700);

      expect(store.tableState().columnSizing).toEqual({});
    });

    it('ignores a move with no drag in flight', () => {
      const store = resizableStore();

      store.updateColumnResize(1, 700);

      expect(store.tableState().columnSizing).toEqual({});
    });
  });

  describe('the resulting width', () => {
    it('follows the pointer', () => {
      const store = resizableStore();

      drag(store, 'name', 560);

      expect(store.tableState().columnSizing).toEqual({ name: columnDefaultWidth + 60 });
      expect(store.table.getColumn('name')?.getSize()).toBe(columnDefaultWidth + 60);
    });

    // Clamping on the write is the whole point: the engine would render these
    // correctly either way, but the state a consumer persists would be junk.
    it('is clamped in the emitted state, not just in the render', () => {
      const store = resizableStore();

      drag(store, 'name', -4000);

      expect(store.tableState().columnSizing).toEqual({ name: columnMinWidth });
    });

    it('is clamped at the maximum too', () => {
      const store = resizableStore();

      drag(store, 'name', 40_000);

      expect(store.tableState().columnSizing).toEqual({ name: columnMaxWidth });
    });

    it('leaves the other columns alone', () => {
      const store = resizableStore();

      drag(store, 'status', 600);

      expect(store.tableState().columnSizing).toEqual({ status: columnDefaultWidth + 100 });
      expect(store.table.getColumn('name')?.getSize()).toBe(columnDefaultWidth);
    });

    it('leaves the other state slices alone', () => {
      const store = resizableStore();
      store.setTableState(createNgeTableState({ sorting: [{ desc: true, id: 'name' }] }));

      drag(store, 'name', 600);

      expect(store.tableState().sorting).toEqual([{ desc: true, id: 'name' }]);
    });

    // The lane totals are the engine's own reduction over each lane's leaves, so
    // a resize inside a pinned lane has to move the lane's width with it — this is
    // what keeps the sticky offsets right without any arithmetic of ours.
    it('moves the pinned lane width when a pinned column is dragged', () => {
      const store = resizableStore({ enablePinning: true });
      store.setTableState(createNgeTableState({ columnPinning: { left: ['name'] } }));
      expect(store.laneWidths().left).toBe(columnDefaultWidth);

      drag(store, 'name', 600);

      expect(store.laneWidths().left).toBe(columnDefaultWidth + 100);
      expect(store.laneWidths().center).toBe(columnDefaultWidth * 6);
    });
  });

  describe('the keyboard path', () => {
    it('steps a column wider and narrower', () => {
      const store = resizableStore();

      store.nudgeColumnSize('name', 16);
      expect(store.tableState().columnSizing).toEqual({ name: columnDefaultWidth + 16 });

      store.nudgeColumnSize('name', -16);
      expect(store.tableState().columnSizing).toEqual({ name: columnDefaultWidth });
    });

    // Stepping the CURRENT width is what makes a held arrow key accumulate.
    it('accumulates across repeated steps', () => {
      const store = resizableStore();

      store.nudgeColumnSize('name', 16);
      store.nudgeColumnSize('name', 16);

      expect(store.tableState().columnSizing).toEqual({ name: columnDefaultWidth + 32 });
    });

    it('clamps at the bounds', () => {
      const store = resizableStore();

      store.nudgeColumnSize('name', -10_000);
      expect(store.tableState().columnSizing).toEqual({ name: columnMinWidth });

      store.nudgeColumnSize('name', 10_000);
      expect(store.tableState().columnSizing).toEqual({ name: columnMaxWidth });
    });

    it('does nothing when the config withholds resizing', () => {
      const store = resizableStore({ enableColumnResizing: false });

      store.nudgeColumnSize('name', 16);

      expect(store.tableState().columnSizing).toEqual({});
    });
  });

  describe('resetting a column', () => {
    // Dropping the key rather than writing the default back is what lets a later
    // change to the column's `size` reach a table whose user has reset it.
    it('drops the width so the definition takes over again', () => {
      const store = resizableStore();
      drag(store, 'name', 600);
      store.endColumnResize();

      store.resetColumnSize('name');

      expect(store.tableState().columnSizing).toEqual({});
      expect(store.table.getColumn('name')?.getSize()).toBe(columnDefaultWidth);
    });

    it('leaves the other columns their widths', () => {
      const store = resizableStore();
      drag(store, 'name', 600);
      store.endColumnResize();
      drag(store, 'status', 600);
      store.endColumnResize();

      store.resetColumnSize('name');

      expect(store.tableState().columnSizing).toEqual({ status: columnDefaultWidth + 100 });
    });

    it('does nothing when the config withholds resizing', () => {
      const store = resizableStore({ enableColumnResizing: false });
      store.setTableState(createNgeTableState({ columnSizing: { name: 400 } }));

      store.resetColumnSize('name');

      expect(store.tableState().columnSizing).toEqual({ name: 400 });
    });
  });

  // Disabling the drag must not discard a width the HOST set — the flag governs
  // what the user may do, not whether the table honours its own state. This is the
  // opposite of `enablePinning`, which does suppress the state it is given, and the
  // asymmetry is deliberate.
  it('still applies a width the host set with resizing switched off', () => {
    const store = resizableStore({ enableColumnResizing: false });

    store.setTableState(createNgeTableState({ columnSizing: { name: 320 } }));

    expect(store.table.getColumn('name')?.getSize()).toBe(320);
  });
});

describe('NgeTableStore event stream', () => {
  const { columnDefaultWidth, columnMinWidth } = NGE_TABLE_DEFAULTS;

  /** A store wired to a sink, plus the events it has emitted so far. */
  function observedStore(overrides: Partial<NgeTableConfig<NgeTableFixtureRow>> = {}): {
    events: NgeTableEvent<unknown>[];
    store: InstanceType<typeof NgeTableStore>;
  } {
    const store = createStore();
    const events: NgeTableEvent<unknown>[] = [];

    store.setEventSink(event => events.push(event));
    store.setConfig(fixtureConfig(overrides));

    return { events, store };
  }

  function headerFor(
    store: InstanceType<typeof NgeTableStore>,
    columnId: string
  ): Header<unknown, unknown> {
    const header = store.table
      .getHeaderGroups()[0]
      ?.headers.find(candidate => candidate.column.id === columnId);

    if (!header) {
      throw new Error(`no header for ${columnId}`);
    }

    return header;
  }

  function kinds(events: NgeTableEvent<unknown>[]): string[] {
    return events.map(event => event.kind);
  }

  // The store has to be usable before `<nge-table>` has wired its output — and
  // in a spec that never wires one at all.
  it('is silent, not broken, before a sink is set', () => {
    const store = createStore();
    store.setConfig(fixtureConfig());

    expect(() =>
      store.applyTableStateChange('sorting', [{ desc: false, id: 'name' }])
    ).not.toThrow();
  });

  describe('state changes the table made', () => {
    it.each([
      ['sorting', [{ desc: true, id: 'name' }], 'sort-change'],
      ['columnOrder', ['owner', 'name'], 'column-reorder'],
      ['columnPinning', { left: ['name'], right: [] }, 'column-pin'],
      ['pagination', { pageIndex: 3, pageSize: 10 }, 'pagination-change'],
      ['columnFilters', [{ id: 'status', value: 'open' }], 'filter-change'],
      ['globalFilter', 'acme', 'filter-change'],
    ] as const)('announces a %s change as %s', (slice, value, kind) => {
      const { events, store } = observedStore();

      store.applyTableStateChange(slice, value as never);

      expect(kinds(events)).toEqual([kind]);
      expect(events[0]).toMatchObject({ kind });
    });

    it('carries the resulting slice, so a listener need not ask for it', () => {
      const { events, store } = observedStore();

      store.applyTableStateChange('sorting', [{ desc: true, id: 'amount' }]);

      expect(events[0]).toEqual({ kind: 'sort-change', sorting: [{ desc: true, id: 'amount' }] });
    });

    // Otherwise `[(state)]` would read as a stream of user activity, and a host
    // restoring a saved view would hear its own write come back at it.
    it('says nothing about state the host handed in', () => {
      const { events, store } = observedStore();

      store.setTableState(createNgeTableState({ sorting: [{ desc: true, id: 'name' }] }));

      expect(events).toEqual([]);
    });

    it('says nothing when a slice is rewritten to the value it already held', () => {
      const { events, store } = observedStore();
      store.applyTableStateChange('globalFilter', 'acme');
      events.length = 0;

      store.applyTableStateChange('globalFilter', 'acme');

      expect(events).toEqual([]);
    });

    // Its feature is a later story; it brings its own kind when it lands, exactly
    // as `expanded` did in ARCH-298.
    it('says nothing yet about columnVisibility', () => {
      const { events, store } = observedStore();

      store.applyTableStateChange('columnVisibility', { name: false });

      expect(events).toEqual([]);
    });

    it('announces an expansion change with the whole resulting slice', () => {
      const { events, store } = observedStore();

      store.applyTableStateChange('expanded', { 'row-1': true });

      expect(events).toEqual([{ expanded: { 'row-1': true }, kind: 'expansion-change' }]);
    });

    it('announces a selection change with the whole resulting slice', () => {
      const { events, store } = observedStore();

      store.applyTableStateChange('rowSelection', { 'row-1': true });

      expect(events).toEqual([{ kind: 'selection-change', rowSelection: { 'row-1': true } }]);
    });
  });

  describe('a column resize', () => {
    // ⚠️ THE THROTTLING CONTRACT. A drag writes `columnSizing` on every move —
    // that is what makes the column follow the pointer — and the stream must not
    // mirror it. One gesture, one event, emitted on release.
    it('says nothing while the pointer is still moving', () => {
      const { events, store } = observedStore({ enableColumnResizing: true });

      store.beginColumnResize(headerFor(store, 'name'), 1, 500);
      store.updateColumnResize(1, 540);
      store.updateColumnResize(1, 560);
      store.updateColumnResize(1, 600);

      expect(events).toEqual([]);
    });

    it('announces one commit on release, with the column and its new width', () => {
      const { events, store } = observedStore({ enableColumnResizing: true });

      store.beginColumnResize(headerFor(store, 'name'), 1, 500);
      store.updateColumnResize(1, 560);
      store.endColumnResize();

      expect(events).toEqual([
        {
          columnId: 'name',
          columnSizing: { name: columnDefaultWidth + 60 },
          kind: 'column-resize',
          width: columnDefaultWidth + 60,
        },
      ]);
    });

    it('says nothing when the grip was grabbed but never moved', () => {
      const { events, store } = observedStore({ enableColumnResizing: true });

      store.beginColumnResize(headerFor(store, 'name'), 1, 500);
      store.endColumnResize();

      expect(events).toEqual([]);
    });

    // Each press is its own commit, so each press is its own event.
    it('announces every keyboard step', () => {
      const { events, store } = observedStore({ enableColumnResizing: true });

      store.nudgeColumnSize('name', 16);
      store.nudgeColumnSize('name', 16);

      expect(kinds(events)).toEqual(['column-resize', 'column-resize']);
      expect(events.at(-1)).toMatchObject({ width: columnDefaultWidth + 32 });
    });

    it('stops announcing once a keyboard step has nowhere left to go', () => {
      const { events, store } = observedStore({ enableColumnResizing: true });
      store.nudgeColumnSize('name', -10_000);
      expect(events.at(-1)).toMatchObject({ width: columnMinWidth });
      events.length = 0;

      store.nudgeColumnSize('name', -10_000);

      expect(events).toEqual([]);
    });

    it('announces a reset as the commit it is', () => {
      const { events, store } = observedStore({ enableColumnResizing: true });
      store.nudgeColumnSize('name', 64);
      events.length = 0;

      store.resetColumnSize('name');

      expect(events).toEqual([
        { columnId: 'name', columnSizing: {}, kind: 'column-resize', width: columnDefaultWidth },
      ]);
    });

    it('says nothing when resetting a column nobody had dragged', () => {
      const { events, store } = observedStore({ enableColumnResizing: true });

      store.resetColumnSize('name');

      expect(events).toEqual([]);
    });
  });

  describe('a click', () => {
    it('hands a cell over in the shape a [ngeCell] template is handed', () => {
      const { events, store } = observedStore();
      const cell = store.table.getRowModel().rows[0].getAllCells()[0];

      store.cellClicked(cell);

      expect(events).toEqual([
        {
          cell: {
            beginEdit: expect.any(Function),
            cancelEdit: expect.any(Function),
            columnId: 'name',
            commitEdit: expect.any(Function),
            // No column here declares `meta.ngeEdit`, so the store hands the shared
            // no-edit bundle — the allocation-free path ARCH-292 owes every table
            // that has not opted in.
            isEditing: NGE_CELL_NEVER_EDITING,
            // The table's own settled signal, by reference — see the dedicated
            // assertion below.
            isSettled: store.scrollSettled,
            row: rows[0],
            rowId: expect.any(String),
            rowIndex: 0,
            value: rows[0].name,
          },
          kind: 'cell-click',
        },
      ]);
    });

    // ARCH-291. Every cell of a table shares one settled signal rather than each
    // deriving its own: the flag describes the viewport, not the cell, and ten
    // thousand `computed`s over one source is the allocation the context cache
    // exists to avoid.
    it('hands every cell the same settled signal', () => {
      const { store } = observedStore();
      const [first, second] = store.table.getRowModel().rows[0].getAllCells();

      expect(store.cellContext(first).isSettled).toBe(store.scrollSettled);
      expect(store.cellContext(second).isSettled).toBe(store.scrollSettled);
    });

    // With virtualization off the engine attaches no scroll listener at all, so
    // `isScrolling` never moves — which makes "settled" permanently true. That is
    // the right answer rather than a gap: a table rendering every row builds each
    // cell once and never recycles it, so there is nothing a shell would save.
    it('reads as settled when nothing is virtualized', () => {
      const { store } = observedStore();

      expect(store.scrollSettled()).toBe(true);
    });

    // The very same object, not merely the same shape — cell contexts are
    // memoised against the engine cell, so a click and a render agree by identity.
    it('reuses the memoised cell context the slot seam already built', () => {
      const { events, store } = observedStore();
      const cell = store.table.getRowModel().rows[0].getAllCells()[0];

      store.cellClicked(cell);

      expect((events[0] as { cell: unknown }).cell).toBe(store.cellContext(cell));
    });

    it('hands a row over in the shape a row-detail template is handed', () => {
      const { events, store } = observedStore();

      store.rowClicked(store.table.getRowModel().rows[0]);

      expect(events).toEqual([
        {
          kind: 'row-click',
          row: {
            canExpand: false,
            isExpanded: false,
            row: rows[0],
            rowId: expect.any(String),
            rowIndex: 0,
            toggleExpanded: expect.any(Function),
          },
        },
      ]);
    });
  });
});

describe('NgeTableStore row virtualization', () => {
  function virtualStore(
    overrides: Partial<NgeTableConfig<NgeTableFixtureRow>> = {}
  ): InstanceType<typeof NgeTableStore> {
    const store = createStore();
    store.setConfig(fixtureConfig({ enableVirtualization: true, ...overrides }));
    return store;
  }

  describe('the resolved geometry', () => {
    it('falls back to the shipped row height', () => {
      expect(virtualStore().rowHeight()).toBe(NGE_TABLE_DEFAULTS.rowHeight);
    });

    it('takes the row height the config names', () => {
      expect(virtualStore({ rowHeight: 56 }).rowHeight()).toBe(56);
    });

    // The header is sticky IN FLOW inside the body's own scroll viewport, so the
    // rows begin a header's height down the scrollable content. Telling the
    // virtualizer as much is what stops its window sitting that far too low.
    it('offsets the window by the header the rows sit below', () => {
      expect(virtualStore().scrollMargin()).toBe(NGE_TABLE_DEFAULTS.headerHeight);
    });

    it('counts every header row, so grouped columns stay correct', () => {
      const store = virtualStore();
      const headerRowCount = store.headerRows().length;

      expect(headerRowCount).toBeGreaterThan(0);
      expect(store.scrollMargin()).toBe(headerRowCount * NGE_TABLE_DEFAULTS.headerHeight);
    });
  });

  describe('with the capability withheld', () => {
    it('renders every row', () => {
      const store = createStore();
      store.setConfig(fixtureConfig());

      expect(store.virtualizationEnabled()).toBe(false);
      expect(store.renderedRows()).toHaveLength(rows.length);
    });

    // `null`, not `0`: the template binds `top` unconditionally and Angular drops
    // the property, which is what leaves the rows in normal flow.
    it('positions nothing', () => {
      const store = createStore();
      store.setConfig(fixtureConfig());

      expect(store.renderedRows().every(entry => entry.top === null)).toBe(true);
      expect(store.virtualTotalHeight()).toBeNull();
    });
  });

  describe('with the capability granted', () => {
    // ⚠️ **The window itself cannot be tested here, and that is not a gap in the
    // test — it is the engine being correct.** `calculateRange` returns `null` the
    // moment the viewport measures zero, and a store standing on its own has no
    // element to measure at all. So a virtualized store renders NOTHING here,
    // which is the right answer for a table that has not been laid out. The
    // window's shape is asserted in the component spec (which can feed the
    // viewport a height) and proved for real in a browser.
    it('renders no window until something has been laid out to window over', () => {
      expect(virtualStore().renderedRows()).toEqual([]);
    });

    // The one number that survives having no layout, because it is arithmetic
    // rather than measurement — which is exactly why the row height is pinned to
    // the config while virtualization is on.
    it('sizes the body to the whole dataset so the scrollbar describes it', () => {
      expect(virtualStore().virtualTotalHeight()).toBe(rows.length * NGE_TABLE_DEFAULTS.rowHeight);
    });

    it('sizes the body from the config row height when one is named', () => {
      expect(virtualStore({ rowHeight: 56 }).virtualTotalHeight()).toBe(rows.length * 56);
    });

    // A spacer of zero would collapse the box the empty band sits in.
    it('leaves the body unsized when there are no rows', () => {
      const store = virtualStore({ data: [] });

      expect(store.virtualTotalHeight()).toBeNull();
      expect(store.renderedRows()).toEqual([]);
    });
  });

  // ⚠️ **The geometry decision this feature turns on, and the one part of it jsdom
  // CAN answer.** The total size is arithmetic over the sizes `estimateSize`
  // returned — no layout involved — so it is the honest proxy for "did the rows
  // beneath an expanded one move down". If they do not, the band overlaps its
  // neighbour, which is the failure the declared height exists to prevent.
  describe('what an expanded row costs the window (ARCH-298)', () => {
    function expandableVirtualStore(state?: NgeTableState): InstanceType<typeof NgeTableStore> {
      const store = createStore();

      store.setConfig(
        fixtureConfig({
          enableRowExpansion: true,
          enableVirtualization: true,
          getRowId: row => (row as NgeTableFixtureRow).id,
        })
      );

      if (state) {
        store.setTableState(state);
      }

      // The re-measure effect is what makes a new size reach the virtualizer at
      // all; without a flush the assertion below would read the stale total and
      // pass for the wrong reason.
      TestBed.inject(ApplicationRef).tick();

      return store;
    }

    const plainTotal = rows.length * NGE_TABLE_DEFAULTS.rowHeight;

    it('costs nothing while every row is closed', () => {
      expect(expandableVirtualStore().virtualTotalHeight()).toBe(plainTotal);
    });

    it('grows the body by exactly one band per expanded row', () => {
      const store = expandableVirtualStore(
        createNgeTableState({ expanded: { [rows[0].id]: true, [rows[4].id]: true } })
      );

      expect(store.virtualTotalHeight()).toBe(plainTotal + 2 * NGE_TABLE_DEFAULTS.rowDetailHeight);
    });

    it('takes the band height the config names', () => {
      const store = createStore();
      store.setConfig(
        fixtureConfig({
          enableRowExpansion: true,
          enableVirtualization: true,
          getRowId: row => (row as NgeTableFixtureRow).id,
          rowDetailHeight: 200,
        })
      );
      store.setTableState(createNgeTableState({ expanded: { [rows[2].id]: true } }));
      TestBed.inject(ApplicationRef).tick();

      expect(store.virtualTotalHeight()).toBe(plainTotal + 200);
    });

    // Expand-all writes the `true` shorthand rather than a key per row, so the
    // arithmetic has to read it as every row rather than as none.
    it('reads the true shorthand as every row carrying a band', () => {
      const store = expandableVirtualStore(createNgeTableState({ expanded: true }));

      expect(store.virtualTotalHeight()).toBe(
        plainTotal + rows.length * NGE_TABLE_DEFAULTS.rowDetailHeight
      );
    });

    // ⚠️ THE REGRESSION THIS BLOCK EXISTS FOR — a size that changes and is never
    // read, leaving the band open and the row beneath it exactly where it was.
    // Toggling through the store (rather than seeding the state up front) is what
    // exercises that path.
    //
    // ⚠️ **Two independent things keep it passing, and this test cannot tell them
    // apart.** The explicit `measure()` in `withNgeTableRows`, and the fresh
    // `getItemKey` identity on every options rebuild — which invalidates the
    // measurement memo as a side effect. Disabling either alone still passes;
    // disabling both fails. So do NOT read a green here as proof the explicit path
    // works: if you are changing that code, disable `getItemKey`'s churn as well
    // and re-run.
    it('re-measures when a row is expanded after the first render', () => {
      const store = expandableVirtualStore();

      expect(store.virtualTotalHeight()).toBe(plainTotal);

      store.toggleRowExpansion(store.table.getRowModel().rows[3]);
      TestBed.inject(ApplicationRef).tick();

      expect(store.virtualTotalHeight()).toBe(plainTotal + NGE_TABLE_DEFAULTS.rowDetailHeight);
    });

    it('gives the space back when the row is closed again', () => {
      const store = expandableVirtualStore();

      store.toggleRowExpansion(store.table.getRowModel().rows[3]);
      TestBed.inject(ApplicationRef).tick();
      store.toggleRowExpansion(store.table.getRowModel().rows[3]);
      TestBed.inject(ApplicationRef).tick();

      expect(store.virtualTotalHeight()).toBe(plainTotal);
    });
  });
});

describe('NgeTableStore row selection', () => {
  const NO_MODIFIERS = { ctrlKey: false, metaKey: false, shiftKey: false };

  function selectableStore(
    overrides: Partial<NgeTableConfig<NgeTableFixtureRow>> = {}
  ): InstanceType<typeof NgeTableStore> {
    const store = createStore();

    store.setConfig(
      fixtureConfig({
        enableRowSelection: true,
        getRowId: row => (row as NgeTableFixtureRow).id,
        ...overrides,
      })
    );

    return store;
  }

  /** The row at a position in the PROCESSED model — what the user is looking at. */
  function rowAt(store: InstanceType<typeof NgeTableStore>, index: number): Row<unknown> {
    return store.table.getRowModel().rows[index];
  }

  function selectedIds(store: InstanceType<typeof NgeTableStore>): string[] {
    return Object.keys(store.tableState().rowSelection).sort();
  }

  describe('the injected selection column', () => {
    it('leads the columns when selection is on', () => {
      const store = selectableStore();

      expect(store.table.getAllLeafColumns()[0].id).toBe(NGE_TABLE_SELECTION_COLUMN_ID);
      expect(store.table.getAllLeafColumns()).toHaveLength(allColumnIds.length + 1);
    });

    it('is absent entirely when selection is off', () => {
      const store = createStore();
      store.setConfig(fixtureConfig());

      expect(store.table.getAllLeafColumns().map(column => column.id)).not.toContain(
        NGE_TABLE_SELECTION_COLUMN_ID
      );
    });

    // `orderColumns` appends whatever it does not find in `state.columnOrder`, so a
    // host listing only its own columns would otherwise push the checkboxes to the
    // far end of the row.
    it('still leads when the host supplies an explicit column order', () => {
      const store = selectableStore();
      store.setTableState(createNgeTableState({ columnOrder: [...allColumnIds].reverse() }));

      expect(store.table.getAllLeafColumns()[0].id).toBe(NGE_TABLE_SELECTION_COLUMN_ID);
    });

    // The host's own state is never rewritten — only what the engine is handed.
    it('leaves the host column order untouched', () => {
      const store = selectableStore();
      const columnOrder = [...allColumnIds].reverse();
      store.setTableState(createNgeTableState({ columnOrder }));

      expect(store.tableState().columnOrder).toEqual(columnOrder);
    });

    it('cannot be sorted or resized', () => {
      const column = selectableStore().table.getColumn(NGE_TABLE_SELECTION_COLUMN_ID);

      expect(column?.getCanSort()).toBe(false);
      expect(column?.getCanResize()).toBe(false);
    });

    it('answers isSelectionColumn only for itself', () => {
      const store = selectableStore();

      expect(store.isSelectionColumn(NGE_TABLE_SELECTION_COLUMN_ID)).toBe(true);
      expect(store.isSelectionColumn('name')).toBe(false);
    });
  });

  // ⚠️ Without `getRowId` the engine keys selection by array index, so a re-fetch
  // moves the user's ticks onto different records — a failure that looks like data
  // corruption rather than a bug. It is worth a dev-mode throw.
  describe('the getRowId requirement', () => {
    it('throws when selection is switched on without a stable row identity', () => {
      expect(() =>
        buildTableOptions(
          { columns: [], data: [], enableRowSelection: true },
          createNgeTableState(),
          { applyTableState: jest.fn(), applyTableStateChange: jest.fn() }
        )
      ).toThrow(/getRowId/);
    });

    it('is satisfied by a getRowId', () => {
      expect(() =>
        buildTableOptions(
          { columns: [], data: [], enableRowSelection: true, getRowId: () => 'id' },
          createNgeTableState(),
          { applyTableState: jest.fn(), applyTableStateChange: jest.fn() }
        )
      ).not.toThrow();
    });

    // A table that never offers selection has no marks to misplace.
    it('says nothing when selection is off', () => {
      expect(() =>
        buildTableOptions({ columns: [], data: [] }, createNgeTableState(), {
          applyTableState: jest.fn(),
          applyTableStateChange: jest.fn(),
        })
      ).not.toThrow();
    });
  });

  describe('a click on a row', () => {
    it('replaces the selection with that row alone', () => {
      const store = selectableStore();

      store.selectRowFromClick(rowAt(store, 2), NO_MODIFIERS);
      store.selectRowFromClick(rowAt(store, 5), NO_MODIFIERS);

      expect(selectedIds(store)).toEqual([rowAt(store, 5).id]);
    });

    it('adds and removes one row on cmd/ctrl-click', () => {
      const store = selectableStore();

      store.selectRowFromClick(rowAt(store, 1), NO_MODIFIERS);
      store.selectRowFromClick(rowAt(store, 3), { ...NO_MODIFIERS, metaKey: true });

      expect(selectedIds(store)).toEqual([rowAt(store, 1).id, rowAt(store, 3).id].sort());

      store.selectRowFromClick(rowAt(store, 3), { ...NO_MODIFIERS, ctrlKey: true });

      expect(selectedIds(store)).toEqual([rowAt(store, 1).id]);
    });

    it('takes the contiguous range on shift-click', () => {
      const store = selectableStore();

      store.selectRowFromClick(rowAt(store, 2), NO_MODIFIERS);
      store.selectRowFromClick(rowAt(store, 5), { ...NO_MODIFIERS, shiftKey: true });

      expect(selectedIds(store)).toEqual([2, 3, 4, 5].map(index => rowAt(store, index).id).sort());
    });

    // The anchor stays put so a range can be grown and shrunk, not only ratcheted.
    it('pivots repeated shift-clicks around the same anchor', () => {
      const store = selectableStore();

      store.selectRowFromClick(rowAt(store, 4), NO_MODIFIERS);
      store.selectRowFromClick(rowAt(store, 7), { ...NO_MODIFIERS, shiftKey: true });
      store.selectRowFromClick(rowAt(store, 2), { ...NO_MODIFIERS, shiftKey: true });

      expect(selectedIds(store)).toEqual([2, 3, 4].map(index => rowAt(store, index).id).sort());
    });

    // ⚠️ THE ACCEPTANCE CRITERION THAT MOTIVATES READING THE PROCESSED MODEL. A
    // range taken from the source array would select records the user cannot see
    // between the two rows they clicked.
    it('takes the range the user sees after a sort, not the source order', () => {
      const store = selectableStore();
      store.applyTableStateChange('sorting', [{ desc: true, id: 'name' }]);

      const sortedIds = store.table.getRowModel().rows.map(row => row.id);

      store.selectRowFromClick(rowAt(store, 1), NO_MODIFIERS);
      store.selectRowFromClick(rowAt(store, 3), { ...NO_MODIFIERS, shiftKey: true });

      expect(selectedIds(store)).toEqual(sortedIds.slice(1, 4).sort());
      // And the same three rows are NOT what the unsorted order holds there.
      expect(selectedIds(store)).not.toEqual(
        rows
          .slice(1, 4)
          .map(row => row.id)
          .sort()
      );
    });
  });

  // Selection is state-keyed, so a re-sort moves the rows and the ticks follow the
  // records rather than the positions. This is the half of "survives a sort" that
  // jsdom can prove; the scroll half is browser-only.
  it('keeps the same records selected across a sort', () => {
    const store = selectableStore();
    store.selectRowFromClick(rowAt(store, 0), NO_MODIFIERS);
    store.selectRowFromClick(rowAt(store, 1), { ...NO_MODIFIERS, metaKey: true });
    const before = selectedIds(store);

    store.applyTableStateChange('sorting', [{ desc: true, id: 'amount' }]);

    expect(selectedIds(store)).toEqual(before);
    expect(store.table.getRowModel().rows.filter(row => row.getIsSelected())).toHaveLength(2);
  });

  describe('the header checkbox', () => {
    it('selects every row, then clears them', () => {
      const store = selectableStore();

      store.toggleAllRowsSelection();
      expect(selectedIds(store)).toEqual(rows.map(row => row.id).sort());
      expect(store.allRowsSelected()).toBe(true);

      store.toggleAllRowsSelection();
      expect(selectedIds(store)).toEqual([]);
    });

    it('reads as indeterminate while only some rows are selected', () => {
      const store = selectableStore();

      store.selectRowFromClick(rowAt(store, 0), NO_MODIFIERS);

      expect(store.someRowsSelected()).toBe(true);
      expect(store.allRowsSelected()).toBe(false);
    });
  });

  describe('a checkbox on one row', () => {
    it('adds and removes that row without disturbing the others', () => {
      const store = selectableStore();
      const [first, second] = [rowAt(store, 0), rowAt(store, 1)];

      store.toggleRowSelection(first);
      store.toggleRowSelection(second);
      expect(selectedIds(store)).toEqual([first.id, second.id].sort());

      store.toggleRowSelection(rowAt(store, 1));
      expect(selectedIds(store)).toEqual([first.id]);
    });
  });

  // "One row at a time" costs no code here: `mutateRowIsSelected` clears every
  // other key when `getCanMultiSelect()` is false. Both entry points inherit it.
  describe('enableMultiRowSelection: false', () => {
    const single = { enableMultiRowSelection: false };

    it('withholds the select-all affordance', () => {
      const store = selectableStore(single);

      store.toggleAllRowsSelection();

      expect(store.multiSelectEnabled()).toBe(false);
      expect(selectedIds(store)).toEqual([]);
    });

    it('reduces cmd-click and shift-click to a plain replace', () => {
      const store = selectableStore(single);

      store.selectRowFromClick(rowAt(store, 0), NO_MODIFIERS);
      store.selectRowFromClick(rowAt(store, 4), { ...NO_MODIFIERS, shiftKey: true });
      expect(selectedIds(store)).toEqual([rowAt(store, 4).id]);

      store.selectRowFromClick(rowAt(store, 2), { ...NO_MODIFIERS, metaKey: true });
      expect(selectedIds(store)).toEqual([rowAt(store, 2).id]);
    });

    it('keeps a checkbox to one row as well', () => {
      const store = selectableStore(single);

      store.toggleRowSelection(rowAt(store, 0));
      store.toggleRowSelection(rowAt(store, 3));

      expect(selectedIds(store)).toEqual([rowAt(store, 3).id]);
    });
  });

  // ⚠️ THE CAPABILITY-FLAG ASYMMETRY, RUN AND ANSWERED. `getCanSelect()` gates the
  // WRITE — `mutateRowIsSelected` only sets a key when it passes — but
  // `getIsSelected()` reads `state.rowSelection` raw, so a selection the HOST
  // pushed in survives the flag being off. That follows ARCH-244's resize
  // precedent, not ARCH-243's pinning one: switching the flag off withdraws the
  // USER's affordance, it does not discard a selection the APPLICATION chose. No
  // `applyPinningCapability` sibling is needed, because the engine already gates
  // the effect.
  describe('enableRowSelection: false', () => {
    function disabledStore(): InstanceType<typeof NgeTableStore> {
      const store = createStore();
      store.setConfig(fixtureConfig({ getRowId: row => (row as NgeTableFixtureRow).id }));
      return store;
    }

    it('refuses every user gesture', () => {
      const store = disabledStore();
      const row = rowAt(store, 0);

      store.selectRowFromClick(row, NO_MODIFIERS);
      store.toggleRowSelection(row);
      store.toggleAllRowsSelection();

      expect(selectedIds(store)).toEqual([]);
      expect(store.selectionEnabled()).toBe(false);
      // ...which is also what withholds the column and its checkboxes.
      expect(store.isSelectionColumn(NGE_TABLE_SELECTION_COLUMN_ID)).toBe(false);
    });

    it('honours a selection the host pushed in anyway', () => {
      const store = disabledStore();
      const rowId = rows[0].id;

      store.setTableState(createNgeTableState({ rowSelection: { [rowId]: true } }));

      expect(store.table.getRowModel().rows[0].getIsSelected()).toBe(true);
    });
  });

  describe('the shift-click anchor', () => {
    // Scratch state for one gesture — a saved view carrying an anchor would have
    // the user's next shift-click extend from a row they never touched.
    it('is not part of the persisted state', () => {
      const store = selectableStore();

      store.selectRowFromClick(rowAt(store, 2), NO_MODIFIERS);

      expect(store.selectionAnchorRowId()).toBe(rowAt(store, 2).id);
      expect(store.tableState()).not.toHaveProperty('selectionAnchorRowId');
    });

    // Otherwise a later shift-click would extend from a row that is no longer
    // marked — ARCH-250 reached the same conclusion about its highlight anchor.
    it('is dropped when the selection empties', () => {
      const store = selectableStore();

      store.toggleRowSelection(rowAt(store, 2));
      store.toggleRowSelection(rowAt(store, 2));

      expect(store.selectionAnchorRowId()).toBeNull();
    });

    it('selects one row when a shift-click is the first gesture', () => {
      const store = selectableStore();

      store.selectRowFromClick(rowAt(store, 3), { ...NO_MODIFIERS, shiftKey: true });

      expect(selectedIds(store)).toEqual([rowAt(store, 3).id]);
      // ...and becomes the pivot for the next one.
      expect(store.selectionAnchorRowId()).toBe(rowAt(store, 3).id);
    });
  });

  // The whole point of the affordance: what the user picks is what ARCH-248's
  // reader returns, with no coupling between the two features.
  it('feeds readNgeExportData({ slice: selected }) exactly the rows the user picked', () => {
    const store = selectableStore();

    store.selectRowFromClick(rowAt(store, 1), NO_MODIFIERS);
    store.selectRowFromClick(rowAt(store, 3), { ...NO_MODIFIERS, shiftKey: true });

    const exported = store.table.readNgeExportData({ slice: 'selected' });

    expect(exported.rows.map(row => row.id)).toEqual(
      [1, 2, 3].map(index => rowAt(store, index).id)
    );
  });

  // A range is ONE state write, so it is one event — not one per row.
  it('announces a range as a single selection-change', () => {
    const store = selectableStore();
    const events: NgeTableEvent<unknown>[] = [];
    store.setEventSink(event => events.push(event));

    store.selectRowFromClick(rowAt(store, 0), NO_MODIFIERS);
    events.length = 0;
    store.selectRowFromClick(rowAt(store, 4), { ...NO_MODIFIERS, shiftKey: true });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'selection-change' });
    expect(Object.keys((events[0] as { rowSelection: object }).rowSelection)).toHaveLength(5);
  });
});

// ─── Row expansion (ARCH-298) ────────────────────────────────────────────────
//
// The affordance half. What the detail band CONTAINS is not here and is not the
// store's business — that is a `row-detail` template resolved through the registry.
// The geometry half is exercised in the virtualization block above and, for the
// arithmetic itself, in `nge-table-expansion.spec.ts`.
describe('NgeTableStore row expansion', () => {
  function expandableStore(
    overrides: Partial<NgeTableConfig<NgeTableFixtureRow>> = {}
  ): InstanceType<typeof NgeTableStore> {
    const store = createStore();

    store.setConfig(
      fixtureConfig({
        enableRowExpansion: true,
        getRowId: row => (row as NgeTableFixtureRow).id,
        ...overrides,
      })
    );

    return store;
  }

  function rowAt(store: InstanceType<typeof NgeTableStore>, index: number): Row<unknown> {
    return store.table.getRowModel().rows[index];
  }

  function expandedIds(store: InstanceType<typeof NgeTableStore>): string[] {
    const { expanded } = store.tableState();

    return expanded === true ? ['<all>'] : Object.keys(expanded).sort();
  }

  describe('the injected expansion column', () => {
    it('leads the columns when expansion is on', () => {
      const store = expandableStore();

      expect(store.table.getAllLeafColumns()[0].id).toBe(NGE_TABLE_EXPANSION_COLUMN_ID);
      expect(store.table.getAllLeafColumns()).toHaveLength(allColumnIds.length + 1);
    });

    it('is absent entirely when expansion is off', () => {
      const store = createStore();
      store.setConfig(fixtureConfig());

      expect(store.table.getAllLeafColumns().map(column => column.id)).not.toContain(
        NGE_TABLE_EXPANSION_COLUMN_ID
      );
    });

    // ⚠️ Both injected columns lead, and they must agree on the order rather than
    // each forcing itself to index 0. The chevron comes first: it describes the
    // row's own shape, where a checkbox describes its membership in a set.
    it('leads the selection column when both are on', () => {
      const store = expandableStore({ enableRowSelection: true });

      expect(
        store.table
          .getAllLeafColumns()
          .slice(0, 2)
          .map(column => column.id)
      ).toEqual([NGE_TABLE_EXPANSION_COLUMN_ID, NGE_TABLE_SELECTION_COLUMN_ID]);
    });

    it('still leads when the host supplies an explicit column order', () => {
      const store = expandableStore({ enableRowSelection: true });
      store.setTableState(createNgeTableState({ columnOrder: [...allColumnIds].reverse() }));

      expect(
        store.table
          .getAllLeafColumns()
          .slice(0, 2)
          .map(column => column.id)
      ).toEqual([NGE_TABLE_EXPANSION_COLUMN_ID, NGE_TABLE_SELECTION_COLUMN_ID]);
    });

    it('leaves the host column order untouched', () => {
      const store = expandableStore();
      const columnOrder = [...allColumnIds].reverse();
      store.setTableState(createNgeTableState({ columnOrder }));

      expect(store.tableState().columnOrder).toEqual(columnOrder);
    });

    it('cannot be sorted or resized', () => {
      const column = expandableStore().table.getColumn(NGE_TABLE_EXPANSION_COLUMN_ID);

      expect(column?.getCanSort()).toBe(false);
      expect(column?.getCanResize()).toBe(false);
    });

    it('answers isExpansionColumn only for itself', () => {
      const store = expandableStore();

      expect(store.isExpansionColumn(NGE_TABLE_EXPANSION_COLUMN_ID)).toBe(true);
      expect(store.isExpansionColumn('name')).toBe(false);
    });

    // Withholding the affordance rather than merely hiding it: the template asks
    // this before rendering a control, so `false` here is what keeps a chevron out
    // of a table that never switched expansion on.
    it('answers isExpansionColumn false while the feature is off', () => {
      const store = createStore();
      store.setConfig(fixtureConfig());

      expect(store.isExpansionColumn(NGE_TABLE_EXPANSION_COLUMN_ID)).toBe(false);
    });
  });

  // ⚠️ `getRowCanExpand` is what switches expansion on at the ENGINE. Its own
  // default is `!!row.subRows?.length`, which is false for every row of flat data —
  // so without the override supplied by `buildTableOptions` nothing could ever open.
  describe('what a row reports it can do', () => {
    it('lets every row expand when the flag is a plain true', () => {
      const store = expandableStore();

      expect(rowAt(store, 0).getCanExpand()).toBe(true);
      expect(rowAt(store, 5).getCanExpand()).toBe(true);
    });

    // The predicate takes the row DATUM, never an engine row — a consumer writing
    // one must not need a `@tanstack/*` import.
    it('asks a predicate about the row datum', () => {
      const store = expandableStore({
        enableRowExpansion: row => (row as NgeTableFixtureRow).id === rows[1].id,
      });

      expect(store.table.getRowModel().rows.filter(row => row.getCanExpand())).toHaveLength(1);
    });

    it('lets nothing expand when the feature is off', () => {
      const store = createStore();
      store.setConfig(fixtureConfig());

      expect(store.table.getRowModel().rows.some(row => row.getCanExpand())).toBe(false);
    });
  });

  describe('the toggle', () => {
    it('opens a row and closes it again', () => {
      const store = expandableStore();

      store.toggleRowExpansion(rowAt(store, 2));
      expect(expandedIds(store)).toEqual([rows[2].id]);

      store.toggleRowExpansion(rowAt(store, 2));
      expect(expandedIds(store)).toEqual([]);
    });

    // ⚠️ `row.toggleExpanded()` does NOT consult `getCanExpand()` — only
    // `getToggleExpandedHandler()` does, and this library uses neither. So the
    // capability check has to be applied here, or a rejected row would still open
    // by keyboard while its control rendered disabled.
    it('refuses a row the predicate rejects', () => {
      const store = expandableStore({
        enableRowExpansion: row => (row as NgeTableFixtureRow).id === rows[0].id,
      });

      store.toggleRowExpansion(rowAt(store, 3));

      expect(expandedIds(store)).toEqual([]);
    });

    it('does nothing at all when the feature is off', () => {
      const store = createStore();
      store.setConfig(fixtureConfig());

      store.toggleRowExpansion(rowAt(store, 0));

      expect(expandedIds(store)).toEqual([]);
    });
  });

  describe('expand-all', () => {
    // ⚠️ The engine writes the `true` SHORTHAND rather than one key per row, and
    // that is what makes expand-all affordable on ten thousand rows. Every
    // predicate downstream — the virtualizer's size arithmetic above all — has to
    // handle it.
    it('writes the true shorthand rather than a key per row', () => {
      const store = expandableStore();

      store.toggleAllRowsExpansion();

      expect(store.tableState().expanded).toBe(true);
    });

    it('collapses back to an empty map', () => {
      const store = expandableStore();

      store.toggleAllRowsExpansion();
      store.toggleAllRowsExpansion();

      expect(store.tableState().expanded).toEqual({});
    });

    it('reports all and some expanded', () => {
      const store = expandableStore();

      expect(store.allRowsExpanded()).toBe(false);
      expect(store.someRowsExpanded()).toBe(false);

      store.toggleRowExpansion(rowAt(store, 0));
      expect(store.allRowsExpanded()).toBe(false);
      expect(store.someRowsExpanded()).toBe(true);

      store.toggleAllRowsExpansion();
      expect(store.allRowsExpanded()).toBe(true);
      expect(store.someRowsExpanded()).toBe(true);
    });

    it('does nothing at all when the feature is off', () => {
      const store = createStore();
      store.setConfig(fixtureConfig());

      store.toggleAllRowsExpansion();

      expect(store.tableState().expanded).toEqual({});
    });
  });

  // ⚠️ The half a virtualized scroll does NOT cover. Surviving a scroll comes free
  // from re-deriving; surviving a row-model rebuild is what `getRowId` buys, and it
  // is the failure that reads as data corruption rather than as a bug.
  describe('surviving a sort', () => {
    it('keeps a row open across a re-sort rather than moving the band', () => {
      const store = expandableStore();
      const opened = rowAt(store, 0);
      const openedName = (opened.original as NgeTableFixtureRow).name;

      store.toggleRowExpansion(opened);
      store.toggleColumnSort('name');

      const stillOpen = store.table.getRowModel().rows.filter(row => row.getIsExpanded());

      expect(stillOpen).toHaveLength(1);
      expect((stillOpen[0].original as NgeTableFixtureRow).name).toBe(openedName);
    });

    // `_autoResetExpanded` is reachable only from `getGroupedRowModel`, which this
    // library does not wire — so a sort leaves the slice alone. Pinned because a
    // later story wiring grouping would silently start collapsing the user's rows.
    it('does not reset the slice when the row model rebuilds', () => {
      const store = expandableStore();

      store.toggleRowExpansion(rowAt(store, 0));
      store.toggleColumnSort('name');
      store.toggleColumnSort('name');

      expect(expandedIds(store)).toEqual([rows[0].id]);
    });
  });

  describe('the slot contexts', () => {
    it('hands an expand-cell template the row, its state, and a toggle', () => {
      const store = expandableStore();
      const { $implicit } = store.expandCellSlotContext(rowAt(store, 1));

      expect($implicit).toMatchObject({
        canExpand: true,
        isExpanded: false,
        row: rows[1],
        rowId: rows[1].id,
      });

      $implicit.toggle();

      expect(expandedIds(store)).toEqual([rows[1].id]);
    });

    it('hands an expand-header template the counts and a toggle-all', () => {
      const store = expandableStore();
      const { $implicit } = store.expandHeaderSlotContext();

      expect($implicit).toMatchObject({
        allExpanded: false,
        rowCount: rows.length,
        someExpanded: false,
      });

      $implicit.toggleAll();

      expect(store.tableState().expanded).toBe(true);
    });

    // A band collapsing itself is the first thing a consumer wants from one, and a
    // projected template resolves DI from its DECLARATION injector — so the action
    // has to ride on the context rather than be injected.
    it('lets a row-detail band close itself', () => {
      const store = expandableStore();
      const opened = rowAt(store, 4);

      store.toggleRowExpansion(opened);
      store.rowSlotContext(rowAt(store, 4)).$implicit.toggleExpanded();

      expect(expandedIds(store)).toEqual([]);
    });
  });

  // ⚠️ Without `getRowId` the engine keys `state.expanded` by array index, so a
  // sort or a re-fetch leaves the band open on a different record.
  describe('the getRowId requirement', () => {
    it('throws when expansion is switched on without a stable row identity', () => {
      expect(() =>
        buildTableOptions(
          { columns: [], data: [], enableRowExpansion: true },
          createNgeTableState(),
          { applyTableState: jest.fn(), applyTableStateChange: jest.fn() }
        )
      ).toThrow(/getRowId/);
    });

    // A predicate is just as much "switched on" as a bare `true`.
    it('throws for a per-row predicate too', () => {
      expect(() =>
        buildTableOptions(
          { columns: [], data: [], enableRowExpansion: () => true },
          createNgeTableState(),
          { applyTableState: jest.fn(), applyTableStateChange: jest.fn() }
        )
      ).toThrow(/getRowId/);
    });

    it('is satisfied by a getRowId', () => {
      expect(() =>
        buildTableOptions(
          { columns: [], data: [], enableRowExpansion: true, getRowId: () => 'id' },
          createNgeTableState(),
          { applyTableState: jest.fn(), applyTableStateChange: jest.fn() }
        )
      ).not.toThrow();
    });

    // A host driving `state.expanded` itself has always been able to, and this
    // story does not withdraw that — the throw is about the AFFORDANCE being on.
    it('says nothing when expansion is off', () => {
      expect(() =>
        buildTableOptions({ columns: [], data: [] }, createNgeTableState(), {
          applyTableState: jest.fn(),
          applyTableStateChange: jest.fn(),
        })
      ).not.toThrow();
    });
  });
});

// ─── Inline editing (ARCH-292) ───────────────────────────────────────────────
//
// The activation model and the intent it commits. What a cell RENDERS while it is
// being edited is not here and is not the store's business — that is a `[ngeCell]`
// template resolved through the registry.
describe('NgeTableStore inline editing', () => {
  const EDITABLE_COLUMNS = NGE_TABLE_FIXTURE_COLUMNS.map(column =>
    column.id === 'name' ? { ...column, meta: { ngeEdit: { enabled: true } } } : column
  );

  function editableStore(
    overrides: Partial<NgeTableConfig<NgeTableFixtureRow>> = {}
  ): InstanceType<typeof NgeTableStore> {
    const store = createStore();

    store.setConfig(
      fixtureConfig({ columns: EDITABLE_COLUMNS, getRowId: row => row.id, ...overrides })
    );

    return store;
  }

  function firstRowId(store: InstanceType<typeof NgeTableStore>): string {
    return store.table.getRowModel().rows[0].id;
  }

  describe('the capability', () => {
    it('is off for a table whose columns declare nothing', () => {
      const store = createStore();
      store.setConfig(fixtureConfig());

      expect(store.editEnabled()).toBe(false);
    });

    it('is on as soon as one column opts in', () => {
      expect(editableStore().editEnabled()).toBe(true);
    });

    // The cost claim, at the store level: a table that opted into nothing must hand
    // out the shared no-edit bundle rather than build a `computed` per cell.
    it('gives a non-editing table the shared no-edit members', () => {
      const store = createStore();
      store.setConfig(fixtureConfig());

      const cells = store.table.getRowModel().rows[0].getAllCells();
      const first = store.cellContext(cells[0]);
      const second = store.cellContext(cells[1]);

      expect(first.isEditing).toBe(NGE_CELL_NEVER_EDITING);
      expect(first.beginEdit).toBe(second.beginEdit);
    });
  });

  describe('activation', () => {
    it('opens the editor for the cell that was engaged', () => {
      const store = editableStore();
      const rowId = firstRowId(store);

      store.beginCellEdit(rowId, 'name');

      expect(store.editing()).toEqual({ columnId: 'name', rowId });
    });

    // No branch guards the click handler, so this method has to be the one that
    // declines — otherwise the template would grow the switch ARCH-292 forbids.
    it('ignores a column that has not opted in', () => {
      const store = editableStore();

      store.beginCellEdit(firstRowId(store), 'amount');

      expect(store.editing()).toBeNull();
    });

    it('reports only the engaged cell as editing', () => {
      const store = editableStore();
      const rowId = firstRowId(store);
      const [nameCell] = store.table
        .getRowModel()
        .rows[0].getAllCells()
        .filter(cell => cell.column.id === 'name');
      const otherRowNameCell = store.table
        .getRowModel()
        .rows[1].getAllCells()
        .filter(cell => cell.column.id === 'name')[0];

      const context = store.cellContext(nameCell);
      const otherContext = store.cellContext(otherRowNameCell);

      expect(context.isEditing()).toBe(false);

      store.beginCellEdit(rowId, 'name');

      // ⚠️ ARCH-291's memo rule, exercised through the store rather than the builder:
      // the SAME context object reports the new answer. A plain boolean here would
      // have been frozen at first build and this cell would never activate.
      expect(store.cellContext(nameCell)).toBe(context);
      expect(context.isEditing()).toBe(true);
      expect(otherContext.isEditing()).toBe(false);
    });

    it('holds one editor at a time', () => {
      const store = editableStore();
      const rows = store.table.getRowModel().rows;

      store.beginCellEdit(rows[0].id, 'name');
      store.beginCellEdit(rows[2].id, 'name');

      expect(store.editing()).toEqual({ columnId: 'name', rowId: rows[2].id });
    });

    // An always-live column never waits to be activated — the column-of-sliders case.
    it('reports an always-live column as editing with no gesture at all', () => {
      const store = createStore();

      store.setConfig(
        fixtureConfig({
          columns: NGE_TABLE_FIXTURE_COLUMNS.map(column =>
            column.id === 'quantity'
              ? { ...column, meta: { ngeEdit: { alwaysLive: true, enabled: true } } }
              : column
          ),
          getRowId: row => row.id,
        })
      );

      const quantityCell = store.table
        .getRowModel()
        .rows[0].getAllCells()
        .filter(cell => cell.column.id === 'quantity')[0];

      expect(store.editing()).toBeNull();
      expect(store.cellContext(quantityCell).isEditing()).toBe(true);
    });
  });

  describe('committing', () => {
    it('announces the patch and closes the editor', () => {
      const store = editableStore();
      const events: NgeTableEvent<unknown>[] = [];
      const rowId = firstRowId(store);
      const previous = (store.table.getRowModel().rows[0].original as NgeTableFixtureRow).name;

      store.setEventSink(event => events.push(event));
      store.beginCellEdit(rowId, 'name');
      store.commitCellEdit(rowId, 'name', 'Renamed');

      expect(events).toEqual([
        {
          cells: [{ columnId: 'name', previousValue: previous, rowId, value: 'Renamed' }],
          kind: 'edit-intent',
        },
      ]);
      expect(store.editing()).toBeNull();
    });

    // ⚠️ The data boundary, and the whole reason this is an *intent*. The library owns
    // no data: it announces the patch and stops. A host that ignores the event sees no
    // edit, which is correct behaviour rather than a bug.
    it('leaves the table data untouched', () => {
      const store = editableStore();
      const rowId = firstRowId(store);
      const before = (store.table.getRowModel().rows[0].original as NgeTableFixtureRow).name;

      store.beginCellEdit(rowId, 'name');
      store.commitCellEdit(rowId, 'name', 'Renamed');

      expect((store.table.getRowModel().rows[0].original as NgeTableFixtureRow).name).toBe(before);
      expect(rows[0].name).toBe(before);
    });

    it('announces nothing when the edit is abandoned', () => {
      const store = editableStore();
      const events: NgeTableEvent<unknown>[] = [];
      const rowId = firstRowId(store);

      store.beginCellEdit(rowId, 'name');
      store.setEventSink(event => events.push(event));
      store.cancelCellEdit();

      expect(events).toEqual([]);
      expect(store.editing()).toBeNull();
    });

    // A commit racing a re-fetch has nothing to propose, and inventing a patch against
    // a record that has left the row model is worse than dropping it.
    it('announces nothing for a row the model no longer holds', () => {
      const store = editableStore();
      const events: NgeTableEvent<unknown>[] = [];

      store.setEventSink(event => events.push(event));
      store.commitCellEdit('no-such-row', 'name', 'Renamed');

      expect(events).toEqual([]);
    });
  });

  // ⚠️ The corollary the ticket requires a spec to pin. Virtualization recycles rows,
  // so a draft that survived its row leaving the window would belong to whichever
  // record the recycled element shows next. The virtualized half needs a real browser
  // (jsdom measures every viewport as zero); what is assertable here is the same rule
  // reached by the other route — the row leaving the processed row model at all.
  describe('a row leaving the rendered set', () => {
    it('cancels an edit whose row is no longer in the data', async () => {
      const store = editableStore();
      const rowId = firstRowId(store);

      store.beginCellEdit(rowId, 'name');
      expect(store.editing()).not.toBeNull();

      store.setConfig(
        fixtureConfig({
          columns: EDITABLE_COLUMNS,
          data: rows.slice(1),
          getRowId: row => row.id,
        })
      );
      await TestBed.inject(ApplicationRef).whenStable();

      expect(store.editing()).toBeNull();
    });

    it('leaves an edit alone while its row is still rendered', async () => {
      const store = editableStore();
      const rowId = firstRowId(store);

      store.beginCellEdit(rowId, 'name');
      await TestBed.inject(ApplicationRef).whenStable();

      expect(store.editing()).toEqual({ columnId: 'name', rowId });
    });
  });

  // ⚠️ Selection puts a tick on the wrong row without `getRowId`; editing proposes a
  // WRITE to it, so the same class of failure lands one layer worse.
  describe('the getRowId requirement', () => {
    it('throws when a column is editable without a stable row identity', () => {
      expect(() =>
        buildTableOptions(
          { columns: [{ id: 'name', meta: { ngeEdit: { enabled: true } } }], data: [] },
          createNgeTableState(),
          { applyTableState: jest.fn(), applyTableStateChange: jest.fn() }
        )
      ).toThrow(/requires `config.getRowId`/);
    });

    it('says nothing about a table whose columns are all read-only', () => {
      expect(() =>
        buildTableOptions({ columns: [{ id: 'name' }], data: [] }, createNgeTableState(), {
          applyTableState: jest.fn(),
          applyTableStateChange: jest.fn(),
        })
      ).not.toThrow();
    });
  });
});
