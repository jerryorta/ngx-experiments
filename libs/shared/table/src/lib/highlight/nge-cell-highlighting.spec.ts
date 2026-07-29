import type { Cell } from '@tanstack/angular-table';

import { TestBed } from '@angular/core/testing';

import type { NgeTableFixtureRow } from '../../testing';
import type { NgeTableConfig } from '../nge-table-config';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../testing';
import { provideNgeTableFeatures } from '../features';
import { createNgeTableConfig } from '../nge-table-config';
import { createNgeTableState } from '../nge-table-state';
import { NgeTableStore } from '../nge-table/store';
import { ngeCellHighlighting } from './nge-cell-highlighting';
import { NgeHighlightBridge } from './nge-highlight-bridge';
import { provideNgeCellHighlighting } from './provide-nge-cell-highlighting';

const rows = createNgeTableFixture({ rows: 12 });

type Store = InstanceType<typeof NgeTableStore>;

/**
 * A store with the addon registered exactly the way a consumer registers it.
 *
 * Through `provideNgeTableFeatures` and nothing else — no test-only hook, no
 * privileged wiring. That this is the whole of the setup is the gate's claim, so
 * the setup is part of what is under test.
 */
function createStore(): Store {
  TestBed.configureTestingModule({
    providers: [NgeTableStore, provideNgeTableFeatures(ngeCellHighlighting)],
  });

  const store = TestBed.inject(NgeTableStore);

  store.setConfig(
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: rows,
      // ⚠️ Not optional once anything marks a row — without it the engine keys rows
      // by array index and a sort moves every mark onto a different record.
      getRowId: row => row.id,
    }) as NgeTableConfig<unknown>
  );

  return store;
}

/** One cell of the rendered model, by row index and column id. */
function cellAt(store: Store, rowIndex: number, columnId: string): Cell<unknown, unknown> {
  const row = store.table.getRowModel().rows[rowIndex];
  const cell = row.getAllCells().find(entry => entry.column.id === columnId);

  if (!cell) {
    throw new Error(`no cell for column ${columnId}`);
  }

  return cell;
}

describe('ngeCellHighlighting — registration', () => {
  it('reaches the instance through _features alone', () => {
    const store = createStore();

    expect(typeof store.table.readNgeHighlightState).toBe('function');
    expect(typeof store.table.writeNgeHighlight).toBe('function');
  });

  it('puts its API on every cell', () => {
    const cell = cellAt(createStore(), 0, 'amount');

    expect(typeof cell.isNgeHighlighted).toBe('function');
    expect(typeof cell.toggleNgeHighlight).toBe('function');
    expect(typeof cell.extendNgeHighlight).toBe('function');
  });

  it('starts with nothing marked', () => {
    expect(createStore().table.readNgeHighlightState()).toEqual({
      anchor: null,
      cells: [],
      exclusions: [],
      ranges: [],
    });
  });
});

describe('ngeCellHighlighting — the controlled-state round trip', () => {
  // ⚠️ THE gate assertion. Before `onStateChange` was wired, this addon rendered and
  // even survived a scroll — the Angular adapter's internal state signal absorbed
  // every write — while `tableState` never moved. A passing `isNgeHighlighted()` is
  // therefore NOT sufficient evidence that the seam works; the host's state is.
  it('lands a toggle in the host-owned state', () => {
    const store = createStore();

    cellAt(store, 0, 'amount').toggleNgeHighlight();

    expect(store.tableState().ngeHighlight?.cells).toEqual([`${rows[0].id}::amount`]);
  });

  it('reads back through the cell it was set on', () => {
    const store = createStore();

    cellAt(store, 0, 'amount').toggleNgeHighlight();

    expect(cellAt(store, 0, 'amount').isNgeHighlighted()).toBe(true);
    expect(cellAt(store, 1, 'amount').isNgeHighlighted()).toBe(false);
    expect(cellAt(store, 0, 'status').isNgeHighlighted()).toBe(false);
  });

  it('toggles back off', () => {
    const store = createStore();

    cellAt(store, 0, 'amount').toggleNgeHighlight();
    cellAt(store, 0, 'amount').toggleNgeHighlight();

    expect(store.tableState().ngeHighlight?.cells).toEqual([]);
  });

  // A host that built its state the documented way has no `ngeHighlight` key at
  // all. The updaters normalise rather than assuming `getInitialState` seeded it.
  it('accepts a host state that has never carried the slice', () => {
    const store = createStore();

    store.setTableState(createNgeTableState());
    cellAt(store, 3, 'status').toggleNgeHighlight();

    expect(store.tableState().ngeHighlight?.cells).toEqual([`${rows[3].id}::status`]);
  });

  it('restores marks a host hands back in', () => {
    const store = createStore();
    const key = `${rows[5].id}::amount`;

    store.setTableState(
      createNgeTableState({
        ngeHighlight: { anchor: key, cells: [key], exclusions: [], ranges: [] },
      })
    );

    expect(cellAt(store, 5, 'amount').isNgeHighlighted()).toBe(true);
  });

  it('leaves the other state slices alone', () => {
    const store = createStore();

    store.setTableState(createNgeTableState({ sorting: [{ desc: true, id: 'amount' }] }));
    cellAt(store, 0, 'amount').toggleNgeHighlight();

    expect(store.tableState().sorting).toEqual([{ desc: true, id: 'amount' }]);
  });

  // The state-slice event map has no entry for an addon key, so nothing is
  // announced — the same silence `columnSizing` keeps, and for the same reason:
  // the slice is on `stateChange` for anyone who wants it.
  it('emits no NgeTableEvent for an addon slice', () => {
    const store = createStore();
    const events: unknown[] = [];

    store.setEventSink(event => events.push(event));
    cellAt(store, 0, 'amount').toggleNgeHighlight();

    expect(events).toEqual([]);
  });
});

describe('ngeCellHighlighting — shift-click ranges', () => {
  it('writes a descriptor rather than enumerating the block', () => {
    const store = createStore();

    cellAt(store, 2, 'amount').toggleNgeHighlight();
    cellAt(store, 6, 'amount').extendNgeHighlight();

    expect(store.tableState().ngeHighlight?.ranges).toEqual([
      { anchorRowId: rows[2].id, columnIds: ['amount'], focusRowId: rows[6].id },
    ]);
  });

  it('marks every cell in the block', () => {
    const store = createStore();

    cellAt(store, 2, 'amount').toggleNgeHighlight();
    cellAt(store, 6, 'amount').extendNgeHighlight();

    expect(cellAt(store, 4, 'amount').isNgeHighlighted()).toBe(true);
    expect(cellAt(store, 7, 'amount').isNgeHighlighted()).toBe(false);
    expect(cellAt(store, 4, 'status').isNgeHighlighted()).toBe(false);
  });

  it('spans the columns between the anchor and the focus, in visual order', () => {
    const store = createStore();

    cellAt(store, 2, 'name').toggleNgeHighlight();
    cellAt(store, 4, 'quantity').extendNgeHighlight();

    expect(store.tableState().ngeHighlight?.ranges[0].columnIds).toEqual([
      'name',
      'status',
      'quantity',
    ]);
  });

  it('is a no-op without an anchor', () => {
    const store = createStore();

    cellAt(store, 4, 'amount').extendNgeHighlight();

    expect(store.tableState().ngeHighlight?.ranges ?? []).toEqual([]);
  });

  // Descriptors are what keep a whole-column highlight from being ~270 KB of JSON
  // on every `stateChange`.
  it('keeps a 10,000-row block to one object', () => {
    const store = createStore();
    const large = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

    store.setConfig(
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: large,
        getRowId: row => row.id,
      }) as NgeTableConfig<unknown>
    );

    cellAt(store, 0, 'amount').toggleNgeHighlight();
    cellAt(store, NGE_TABLE_FIXTURE_SIZES.large - 1, 'amount').extendNgeHighlight();

    const slice = store.tableState().ngeHighlight;

    expect(slice?.ranges).toHaveLength(1);
    expect(JSON.stringify(slice).length).toBeLessThan(500);
    expect(cellAt(store, 5_000, 'amount').isNgeHighlighted()).toBe(true);
  });
});

describe('ngeCellHighlighting — composition with the export seam', () => {
  // The whole of ARCH-251's coupling: the predicate reads this addon's state and is
  // handed to a seam that has never heard of it. Neither file imports the other.
  it('narrows an export to the highlighted cells', () => {
    const store = createStore();

    cellAt(store, 1, 'amount').toggleNgeHighlight();
    cellAt(store, 4, 'amount').toggleNgeHighlight();

    const data = store.table.readNgeExportData({
      cellPredicate: store.table.ngeHighlightPredicate(),
    });

    expect(data.columns.map(column => column.id)).toEqual(['amount']);
    expect(data.rows.map(row => row.id)).toEqual([rows[1].id, rows[4].id]);
  });

  it('covers a range descriptor too', () => {
    const store = createStore();

    cellAt(store, 2, 'amount').toggleNgeHighlight();
    cellAt(store, 5, 'amount').extendNgeHighlight();

    const data = store.table.readNgeExportData({
      cellPredicate: store.table.ngeHighlightPredicate(),
    });

    expect(data.rows.map(row => row.id)).toEqual([rows[2].id, rows[3].id, rows[4].id, rows[5].id]);
  });

  it('exports nothing when nothing is highlighted', () => {
    const store = createStore();

    const data = store.table.readNgeExportData({
      cellPredicate: store.table.ngeHighlightPredicate(),
    });

    expect(data.rows).toEqual([]);
  });
});

describe('ngeCellHighlighting — clearing', () => {
  it('drops every mark through the instance', () => {
    const store = createStore();

    cellAt(store, 1, 'amount').toggleNgeHighlight();
    cellAt(store, 2, 'amount').toggleNgeHighlight();
    store.table.clearNgeHighlight();

    expect(store.tableState().ngeHighlight?.cells).toEqual([]);
    expect(cellAt(store, 1, 'amount').isNgeHighlighted()).toBe(false);
  });

  it('drops ranges as well as picked cells, and resets the anchor', () => {
    const store = createStore();

    cellAt(store, 2, 'amount').toggleNgeHighlight();
    cellAt(store, 6, 'amount').extendNgeHighlight();
    store.table.clearNgeHighlight();

    expect(store.tableState().ngeHighlight).toEqual({
      anchor: null,
      cells: [],
      exclusions: [],
      ranges: [],
    });
  });

  // A cleared table must not leave a shift-click extending from a cell the user can
  // no longer see — the next gesture starts fresh.
  it('makes a shift-click after a clear a no-op until something is re-anchored', () => {
    const store = createStore();

    cellAt(store, 2, 'amount').toggleNgeHighlight();
    store.table.clearNgeHighlight();
    cellAt(store, 6, 'amount').extendNgeHighlight();

    expect(store.tableState().ngeHighlight?.ranges).toEqual([]);
  });
});

describe('NgeHighlightBridge — clear all', () => {
  function createBridge(store: Store): NgeHighlightBridge {
    const bridge = TestBed.inject(NgeHighlightBridge);
    bridge.attach(store.table);

    return bridge;
  }

  function createStoreWithBridge(): { bridge: NgeHighlightBridge; store: Store } {
    TestBed.configureTestingModule({
      providers: [
        NgeHighlightBridge,
        NgeTableStore,
        provideNgeTableFeatures(ngeCellHighlighting),
      ],
    });

    const store = TestBed.inject(NgeTableStore);

    store.setConfig(
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: rows,
        getRowId: row => row.id,
      }) as NgeTableConfig<unknown>
    );

    return { bridge: createBridge(store), store };
  }

  it('clears everything through the bridge', () => {
    const { bridge, store } = createStoreWithBridge();

    cellAt(store, 1, 'amount').toggleNgeHighlight();
    bridge.clear();

    expect(store.tableState().ngeHighlight).toEqual({
      anchor: null,
      cells: [],
      exclusions: [],
      ranges: [],
    });
  });

  it('clears on Escape', () => {
    const { store } = createStoreWithBridge();

    cellAt(store, 2, 'amount').toggleNgeHighlight();
    cellAt(store, 6, 'amount').extendNgeHighlight();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(store.tableState().ngeHighlight).toEqual({
      anchor: null,
      cells: [],
      exclusions: [],
      ranges: [],
    });
  });

  // ⚠️ What makes a document-level listener acceptable. `Escape` belongs to whatever
  // is on top — a dialog, a menu — so a table with nothing to give up must leave the
  // key alone: no `preventDefault`, and no state churn either.
  it('does not consume Escape, and writes nothing when unmarked', () => {
    const { store } = createStoreWithBridge();

    const before = store.tableState();
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'Escape' });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(store.tableState()).toBe(before);
  });

  it('emits no stateChange for an Escape that clears nothing', () => {
    const { store } = createStoreWithBridge();
    const events: unknown[] = [];

    store.setEventSink(event => events.push(event));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(events).toEqual([]);
  });

  it('ignores keys other than Escape', () => {
    const { store } = createStoreWithBridge();

    cellAt(store, 1, 'amount').toggleNgeHighlight();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(store.tableState().ngeHighlight?.cells).toHaveLength(1);
  });

  // ⚠️ The escape hatch for a page with two highlight-enabled tables, where one
  // document-level listener each means a single Escape clears both.
  it('does not listen when clearOnEscape is false', () => {
    TestBed.configureTestingModule({
      providers: [
        NgeTableStore,
        provideNgeTableFeatures(ngeCellHighlighting),
        provideNgeCellHighlighting({ clearOnEscape: false }),
      ],
    });

    const store = TestBed.inject(NgeTableStore);
    store.setConfig(
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: rows,
        getRowId: row => row.id,
      }) as NgeTableConfig<unknown>
    );
    TestBed.inject(NgeHighlightBridge).attach(store.table);

    cellAt(store, 1, 'amount').toggleNgeHighlight();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(store.tableState().ngeHighlight?.cells).toHaveLength(1);
  });

  // The listener is scoped to the injector that provided the bridge, so tearing that
  // down must stop it — a leaked document listener would clear a table nobody is
  // looking at any more.
  it('stops listening once its injector is destroyed', () => {
    const { store } = createStoreWithBridge();

    cellAt(store, 1, 'amount').toggleNgeHighlight();
    const marked = store.tableState().ngeHighlight?.cells;

    TestBed.resetTestingModule();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(store.tableState().ngeHighlight?.cells).toEqual(marked);
  });
});
