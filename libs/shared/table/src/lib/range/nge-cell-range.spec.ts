import type { ComponentFixture } from '@angular/core/testing';
import type { Cell, Column } from '@tanstack/angular-table';

import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { NgeTableFixtureRow } from '../../testing';
import type { NgeTableConfig } from '../nge-table-config';
import type { NgeTableState } from '../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_COLUMNS } from '../../testing';
import { NGE_CELL_NO_EDIT } from '../edit';
import { provideNgeTableFeatures } from '../features';
import { NgeTableComponent } from '../nge-table';
import { createNgeTableConfig } from '../nge-table-config';
import { createNgeTableState } from '../nge-table-state';
import { NGE_CELL_ALWAYS_SETTLED, NgeTableStore } from '../nge-table/store';
import { NgeTableSlotDirective } from '../slots';
import { ngeCellRange } from './nge-cell-range';
import {
  NGE_RANGE_CELL_ATTRIBUTE,
  NGE_RANGE_COLUMN_ATTRIBUTE,
  NgeRangeBridge,
} from './nge-range-bridge';
import { NgeRangeOverlayComponent } from './nge-range-overlay.component';
import { parseNgeRangeCellKey } from './nge-range-state';
import { provideNgeCellRange } from './provide-nge-cell-range';

const rows = createNgeTableFixture({ rows: 12 });

type Store = InstanceType<typeof NgeTableStore>;

/** Every root {@link mountRangeDom} put in the document, torn down after each test. */
const mounted: HTMLElement[] = [];

afterEach(() => {
  while (mounted.length > 0) {
    mounted.pop()?.remove();
  }
});

/**
 * A store with the addon registered exactly the way a consumer registers it.
 *
 * Through `provideNgeTableFeatures` and nothing else — no test-only hook, no
 * privileged wiring. That this is the whole of the setup is the gate's claim, so
 * the setup is part of what is under test.
 *
 * ⚠️ Resets the testing module first, so a single spec can build **two** stores and
 * compare what two entry points did to them.
 */
function createStore(config?: Partial<NgeTableConfig<NgeTableFixtureRow>>): Store {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [NgeTableStore, provideNgeTableFeatures(ngeCellRange)],
  });

  const store = TestBed.inject(NgeTableStore);

  store.setConfig(
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: rows,
      // ⚠️ Not optional once anything selects a cell — without it the engine keys
      // rows by array index and a sort moves the rectangle onto different records.
      getRowId: row => row.id,
      ...config,
    }) as NgeTableConfig<unknown>
  );

  return store;
}

/** The same, plus the bridge a projected overlay and the gesture both resolve to. */
function createStoreWithBridge(): { bridge: NgeRangeBridge; store: Store } {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [NgeTableStore, ...provideNgeCellRange()],
  });

  const store = TestBed.inject(NgeTableStore);

  store.setConfig(
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: rows,
      getRowId: row => row.id,
    }) as NgeTableConfig<unknown>
  );

  const bridge = TestBed.inject(NgeRangeBridge);
  bridge.attach(store.table);

  return { bridge, store };
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

/**
 * One column of the current model, reached **through a cell**.
 *
 * Deliberately not `store.table.getColumn(id)`: the store holds the adapter's proxy,
 * which turns every `get*` accessor into a computed keyed by `JSON.stringify(args)`.
 * That works for a string id, but going through a `Cell` gets the same `Column`
 * object with none of the reasoning — and this file already reaches for cells.
 */
function columnAt(store: Store, columnId: string): Column<unknown, unknown> {
  return cellAt(store, 0, columnId).column;
}

/** Row ids currently inside a rectangle, read through one column, in view order. */
function selectedRowIds(store: Store, columnId: string): string[] {
  return store.table
    .getRowModel()
    .rows.filter(row => {
      const cell = row.getAllCells().find(entry => entry.column.id === columnId);

      return cell?.isNgeInRange() ?? false;
    })
    .map(row => row.id);
}

/** Column ids currently inside a rectangle, read through one row, in visual order. */
function selectedColumnIds(store: Store, rowIndex: number): string[] {
  const row = store.table.getRowModel().rows[rowIndex];

  return [
    ...row.getLeftVisibleCells(),
    ...row.getCenterVisibleCells(),
    ...row.getRightVisibleCells(),
  ]
    .filter(cell => cell.isNgeInRange())
    .map(cell => cell.column.id);
}

/** Row ids in the order the table currently shows them. */
function viewRowIds(store: Store): string[] {
  return store.table.getRowModel().rows.map(row => row.id);
}

/**
 * The markup the gesture hit-tests against, built by hand.
 *
 * Exactly what `<nge-range-overlay>` publishes at runtime — the same attribute on
 * the same core class — because that coupling is the point: the bridge depends on
 * nothing the core renders. jsdom lays nothing out, so this stands in for a
 * rendered table's structure and never for its geometry; the drag itself, the
 * auto-scroll, and the text-selection guard are browser-only.
 */
function mountRangeDom(store: Store): (rowIndex: number, columnId: string) => Element {
  const root = document.createElement('div');
  root.className = 'nge-table';

  const viewport = document.createElement('div');
  viewport.className = 'nge-table__viewport';
  root.append(viewport);

  for (const row of store.table.getRowModel().rows) {
    const rowElement = document.createElement('div');
    rowElement.className = 'nge-table__row';

    for (const cell of row.getAllCells()) {
      const cellElement = document.createElement('div');
      cellElement.className = 'nge-table__cell';
      cellElement.setAttribute(NGE_RANGE_CELL_ATTRIBUTE, `${row.id}::${cell.column.id}`);
      rowElement.append(cellElement);
    }

    viewport.append(rowElement);
  }

  document.body.append(root);
  mounted.push(root);

  return (rowIndex, columnId) => {
    const selector = `[${NGE_RANGE_CELL_ATTRIBUTE}="${viewRowIds(store)[rowIndex]}::${columnId}"]`;
    const cell = root.querySelector(selector);

    if (!cell) {
      throw new Error(`no mounted cell for ${selector}`);
    }

    return cell;
  };
}

/**
 * One press and release on a cell.
 *
 * ⚠️ jsdom has no `PointerEvent`, so these are `MouseEvent`s dispatched under the
 * pointer type names — enough to exercise target resolution, the modifier
 * branches, and the delegation, and nothing at all like a real drag. `pointerType`
 * is `undefined` on them, which the touch guard reads as "not touch"; a real touch
 * is verified in the browser.
 */
function press(cell: Element, modifiers: MouseEventInit = {}): void {
  cell.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, ...modifiers }));
  cell.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, ...modifiers }));
}

/**
 * One `Shift`+arrow press, on the document where the listener lives.
 *
 * Deliberately no `detectChanges()` between calls — several of these in a row is a
 * held key, which is the burst case the write path has to survive.
 */
function arrow(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, key, shiftKey: true }));
}

describe('ngeCellRange — registration', () => {
  it('reaches the instance through _features alone', () => {
    const store = createStore();

    expect(typeof store.table.readNgeRangeState).toBe('function');
    expect(typeof store.table.writeNgeRange).toBe('function');
    expect(typeof store.table.selectAllNgeRange).toBe('function');
  });

  it('puts its API on every cell', () => {
    const cell = cellAt(createStore(), 0, 'amount');

    expect(typeof cell.isNgeInRange).toBe('function');
    expect(typeof cell.startNgeRange).toBe('function');
    expect(typeof cell.extendNgeRange).toBe('function');
  });

  it('starts with nothing selected', () => {
    expect(createStore().table.readNgeRangeState()).toEqual({ ranges: [] });
  });
});

describe('ngeCellRange — the controlled-state round trip', () => {
  // ⚠️ THE gate assertion. Before `onStateChange` was wired, an addon rendered and
  // even survived a scroll — the Angular adapter's internal state signal absorbed
  // every write — while `tableState` never moved. A passing `isNgeInRange()` is
  // therefore NOT sufficient evidence that the seam works; the host's state is.
  it('lands a range in the host-owned state', () => {
    const store = createStore();

    cellAt(store, 1, 'name').startNgeRange();
    cellAt(store, 3, 'status').extendNgeRange();

    expect(store.tableState().ngeRange?.ranges).toEqual([
      {
        anchorColumnId: 'name',
        anchorRowId: rows[1].id,
        focusColumnId: 'status',
        focusRowId: rows[3].id,
      },
    ]);
  });

  it('reads back through the cells it covers', () => {
    const store = createStore();

    cellAt(store, 1, 'name').startNgeRange();
    cellAt(store, 3, 'status').extendNgeRange();

    expect(cellAt(store, 2, 'name').isNgeInRange()).toBe(true);
    expect(cellAt(store, 2, 'status').isNgeInRange()).toBe(true);
    expect(cellAt(store, 2, 'quantity').isNgeInRange()).toBe(false);
    expect(cellAt(store, 4, 'name').isNgeInRange()).toBe(false);
  });

  // A host that built its state the documented way has no `ngeRange` key at all.
  // The updaters normalise rather than assuming `getInitialState` seeded it.
  it('accepts a host state that has never carried the slice', () => {
    const store = createStore();

    store.setTableState(createNgeTableState());
    cellAt(store, 3, 'status').startNgeRange();

    expect(store.tableState().ngeRange?.ranges).toHaveLength(1);
  });

  it('restores a rectangle a host hands back in', () => {
    const store = createStore();

    store.setTableState(
      createNgeTableState({
        ngeRange: {
          ranges: [
            {
              anchorColumnId: 'name',
              anchorRowId: rows[5].id,
              focusColumnId: 'quantity',
              focusRowId: rows[7].id,
            },
          ],
        },
      })
    );

    expect(cellAt(store, 6, 'status').isNgeInRange()).toBe(true);
  });

  it('leaves the other state slices alone', () => {
    const store = createStore();

    store.setTableState(createNgeTableState({ sorting: [{ desc: true, id: 'amount' }] }));
    cellAt(store, 0, 'amount').startNgeRange();

    expect(store.tableState().sorting).toEqual([{ desc: true, id: 'amount' }]);
  });

  // The state-slice event map has no entry for an addon key, so nothing is
  // announced — the same silence `columnSizing` keeps, and for the same reason:
  // the slice is on `stateChange` for anyone who wants it.
  it('emits no NgeTableEvent for an addon slice', () => {
    const store = createStore();
    const events: unknown[] = [];

    store.setEventSink(event => events.push(event));
    cellAt(store, 0, 'amount').startNgeRange();

    expect(events).toEqual([]);
  });

  // Descriptors are what keep a 10,000-row block from being ~270 KB of JSON on
  // every `stateChange`.
  it('keeps a block of any size to four strings', () => {
    const store = createStore();

    cellAt(store, 0, 'name').startNgeRange();
    cellAt(store, 11, 'owner').extendNgeRange();

    const slice = store.tableState().ngeRange;

    expect(slice?.ranges).toHaveLength(1);
    expect(JSON.stringify(slice).length).toBeLessThan(300);
    expect(cellAt(store, 6, 'amount').isNgeInRange()).toBe(true);
  });
});

// ⚠️ THE TWO HALVES OF ONE AFFORDANCE MUST AGREE. ARCH-268 shipped a defect where
// shift-clicking the row body extended the range while shift-clicking the checkbox
// toggled one row — caught only by hand. A cell range has MORE entry points than a
// row does, so the agreement is asserted first and directly.
describe('ngeCellRange — the entry points agree', () => {
  it('a delegated pointerdown does what the cell API does', () => {
    const viaApi = createStore();
    cellAt(viaApi, 1, 'name').startNgeRange();
    cellAt(viaApi, 4, 'quantity').extendNgeRange();

    const viaPointer = createStoreWithBridge();
    const cell = mountRangeDom(viaPointer.store);
    viaPointer.bridge.attachRoot(cell(0, 'name'));

    press(cell(1, 'name'));
    press(cell(4, 'quantity'), { shiftKey: true });

    expect(viaPointer.store.tableState().ngeRange).toEqual(viaApi.tableState().ngeRange);
  });

  it('the bridge id API does too', () => {
    const viaApi = createStore();
    cellAt(viaApi, 1, 'name').startNgeRange();
    cellAt(viaApi, 4, 'quantity').extendNgeRange();

    const viaBridge = createStoreWithBridge();
    viaBridge.bridge.start(rows[1].id, 'name');
    viaBridge.bridge.extendTo(rows[4].id, 'quantity');

    expect(viaBridge.store.tableState().ngeRange).toEqual(viaApi.tableState().ngeRange);
  });

  // cmd/ctrl-click is the one modifier that adds rather than replaces, on every
  // entry point alike.
  it('adds a disjoint rectangle on cmd/ctrl, whichever entry point is used', () => {
    const viaApi = createStore();
    cellAt(viaApi, 1, 'name').startNgeRange();
    cellAt(viaApi, 5, 'quantity').startNgeRange({ additive: true });

    const viaPointer = createStoreWithBridge();
    const cell = mountRangeDom(viaPointer.store);
    viaPointer.bridge.attachRoot(cell(0, 'name'));

    press(cell(1, 'name'));
    press(cell(5, 'quantity'), { metaKey: true });

    expect(viaApi.tableState().ngeRange?.ranges).toHaveLength(2);
    expect(viaPointer.store.tableState().ngeRange).toEqual(viaApi.tableState().ngeRange);
  });

  // ⚠️ THE THIRD ENTRY POINT. `Shift`+arrow reaches the same state as a shift-click
  // to the same cell, because it resolves to the same extension rather than to a
  // parallel implementation of one.
  it('Shift+arrow agrees with the cell API for the same destination', () => {
    const viaApi = createStore();
    cellAt(viaApi, 1, 'name').startNgeRange();
    cellAt(viaApi, 3, 'status').extendNgeRange();

    const viaKeys = createStoreWithBridge();
    viaKeys.bridge.start(rows[1].id, 'name');
    arrow('ArrowDown');
    arrow('ArrowDown');
    arrow('ArrowRight');

    expect(viaKeys.store.tableState().ngeRange).toEqual(viaApi.tableState().ngeRange);
  });

  // ⚠️ THE BURST CASE, on the entry point that produces it naturally. A held arrow
  // key repeats many times with no render between, which is exactly the two-writes-
  // in-one-tick shape that swallowed the second write before `writeNgeRange` was
  // moved inside `setState`. Three presses must land three rows, not one.
  it('lands every press of a held key, with no render in between', () => {
    const { bridge, store } = createStoreWithBridge();

    bridge.start(rows[1].id, 'name');
    arrow('ArrowDown');
    arrow('ArrowDown');
    arrow('ArrowDown');

    expect(store.tableState().ngeRange?.ranges[0].focusRowId).toBe(rows[4].id);
  });

  it('steps the focus column on Shift+ArrowRight', () => {
    const { bridge, store } = createStoreWithBridge();

    bridge.start(rows[1].id, 'name');
    arrow('ArrowRight');

    expect(store.tableState().ngeRange?.ranges[0].focusColumnId).toBe('status');
  });

  // ⚠️ Scoped by engagement, exactly as cmd/ctrl-A is: taking an arrow key means
  // `preventDefault()`, so an unscoped listener would stop every arrow key on the
  // page from scrolling.
  it('leaves Shift+arrow alone until the user has clicked into the table', () => {
    const { store } = createStoreWithBridge();

    const event = new KeyboardEvent('keydown', {
      cancelable: true,
      key: 'ArrowDown',
      shiftKey: true,
    });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(store.tableState().ngeRange?.ranges ?? []).toEqual([]);
  });

  it('consumes the key once the user has engaged', () => {
    const { bridge } = createStoreWithBridge();

    bridge.start(rows[1].id, 'name');
    const event = new KeyboardEvent('keydown', {
      cancelable: true,
      key: 'ArrowDown',
      shiftKey: true,
    });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  // A plain arrow is a scroll, and cmd/alt + Shift + arrow are the platform's own
  // "extend to end of line / document" gestures. Neither belongs to this table.
  it('ignores an arrow without Shift, and Shift+arrow with another modifier', () => {
    const { bridge, store } = createStoreWithBridge();

    bridge.start(rows[1].id, 'name');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', metaKey: true, shiftKey: true })
    );

    expect(store.tableState().ngeRange?.ranges[0].focusRowId).toBe(rows[1].id);
  });

  it('leaves Shift+arrow inside an interactive cell to that control', () => {
    const { bridge, store } = createStoreWithBridge();
    bridge.start(rows[1].id, 'name');

    const input = document.createElement('input');
    document.body.append(input);
    mounted.push(input);
    input.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown', shiftKey: true })
    );

    expect(store.tableState().ngeRange?.ranges[0].focusRowId).toBe(rows[1].id);
  });

  // ⚠️ A drag must not begin inside a control: a cell is an arbitrary render target
  // and inline editing is a supported cell pattern.
  it('ignores a pointerdown inside an interactive cell', () => {
    const { bridge, store } = createStoreWithBridge();
    const cell = mountRangeDom(store);
    bridge.attachRoot(cell(0, 'name'));

    const input = document.createElement('input');
    cell(2, 'status').append(input);
    input.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

    expect(store.tableState().ngeRange?.ranges ?? []).toEqual([]);
  });

  it('ignores a pointerdown outside any cell', () => {
    const { bridge, store } = createStoreWithBridge();
    const cell = mountRangeDom(store);
    bridge.attachRoot(cell(0, 'name'));

    document
      .querySelector('.nge-table__viewport')
      ?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

    expect(store.tableState().ngeRange?.ranges ?? []).toEqual([]);
  });

  // Touch is deliberately out of scope: the drag surface is every cell, so the
  // `touch-action: none` it would need makes the table unscrollable by finger.
  it('ignores a touch pointer', () => {
    const { bridge, store } = createStoreWithBridge();
    const cell = mountRangeDom(store);
    bridge.attachRoot(cell(0, 'name'));

    cell(1, 'name').dispatchEvent(
      Object.assign(new MouseEvent('pointerdown', { bubbles: true }), { pointerType: 'touch' })
    );

    expect(store.tableState().ngeRange?.ranges ?? []).toEqual([]);
  });

  // ⚠️ With no gesture anchor a shift-click STARTS a rectangle rather than
  // extending the one a restored view happens to carry — the whole consequence of
  // keeping the anchor out of the persisted state.
  it('starts rather than extends when the user has not clicked into this table', () => {
    const { bridge, store } = createStoreWithBridge();

    store.setTableState(
      createNgeTableState({
        ngeRange: {
          ranges: [
            {
              anchorColumnId: 'name',
              anchorRowId: rows[0].id,
              focusColumnId: 'name',
              focusRowId: rows[0].id,
            },
          ],
        },
      })
    );

    bridge.extendTo(rows[6].id, 'quantity');

    expect(store.tableState().ngeRange?.ranges).toEqual([
      {
        anchorColumnId: 'quantity',
        anchorRowId: rows[6].id,
        focusColumnId: 'quantity',
        focusRowId: rows[6].id,
      },
    ]);
  });
});

describe('ngeCellRange — the block follows the view', () => {
  // ⚠️ The epic's reading, applied to the row axis: endpoints follow their records,
  // membership follows the current view — so a re-sort RE-SHAPES the block rather
  // than carrying it or clearing it.
  it('re-shapes when the rows are re-sorted', () => {
    const store = createStore();

    cellAt(store, 1, 'name').startNgeRange();
    cellAt(store, 3, 'name').extendNgeRange();

    const anchorId = rows[1].id;
    const focusId = rows[3].id;

    store.setTableState(
      createNgeTableState({
        ngeRange: store.tableState().ngeRange,
        sorting: [{ desc: true, id: 'amount' }],
      })
    );

    const view = viewRowIds(store);
    const from = view.indexOf(anchorId);
    const to = view.indexOf(focusId);

    expect(selectedRowIds(store, 'name')).toEqual(
      view.slice(Math.min(from, to), Math.max(from, to) + 1)
    );
  });

  it('keeps both endpoints selected across the sort', () => {
    const store = createStore();

    cellAt(store, 1, 'name').startNgeRange();
    cellAt(store, 3, 'name').extendNgeRange();

    store.setTableState(
      createNgeTableState({
        ngeRange: store.tableState().ngeRange,
        sorting: [{ desc: true, id: 'amount' }],
      })
    );

    expect(selectedRowIds(store, 'name')).toEqual(expect.arrayContaining([rows[1].id, rows[3].id]));
  });

  // ⚠️ The column-axis equivalent, and the reason this addon's descriptor names two
  // COLUMNS rather than materialising the span the way `NgeHighlightRange` does.
  it('re-shapes when the columns are re-ordered', () => {
    const store = createStore();

    cellAt(store, 2, 'name').startNgeRange();
    cellAt(store, 2, 'quantity').extendNgeRange();

    expect(selectedColumnIds(store, 2)).toEqual(['name', 'status', 'quantity']);

    store.setTableState(
      createNgeTableState({
        columnOrder: ['status', 'name', 'quantity', 'amount', 'createdAt', 'isActive', 'owner'],
        ngeRange: store.tableState().ngeRange,
      })
    );

    expect(selectedColumnIds(store, 2)).toEqual(['name', 'quantity']);
  });

  // Pinning is precisely what makes DOM order diverge from declaration order, so it
  // is the case a materialised column span gets wrong.
  it('re-shapes when a column is pinned to a lane', () => {
    const store = createStore({ enablePinning: true });

    cellAt(store, 2, 'name').startNgeRange();
    cellAt(store, 2, 'quantity').extendNgeRange();

    expect(selectedColumnIds(store, 2)).toEqual(['name', 'status', 'quantity']);

    store.setTableState(
      createNgeTableState({
        columnPinning: { left: ['status'], right: [] },
        ngeRange: store.tableState().ngeRange,
      })
    );

    // `status` now leads the row, so it has left the span between the two
    // endpoints — the block narrows to the two columns still between them.
    expect(selectedColumnIds(store, 2)).toEqual(['name', 'quantity']);
  });

  // Recycled DOM re-derives from state, so a virtualized scroll cannot lose a
  // rectangle: nothing about membership is held in a node. This is the state-level
  // half of that claim; the scroll itself is browser-only.
  it('answers for a row far outside any rendered window', () => {
    const store = createStore();

    cellAt(store, 0, 'name').startNgeRange();
    cellAt(store, 11, 'name').extendNgeRange();

    expect(cellAt(store, 7, 'name').isNgeInRange()).toBe(true);
  });
});

describe('ngeCellRange — composition with the export seam', () => {
  // The whole of the ARCH-248 coupling: the predicate reads this addon's state and
  // is handed to a seam that has never heard of it. Neither file imports the other,
  // and `src/lib/export/` is untouched by this story.
  it('narrows an export to exactly the selected cells', () => {
    const store = createStore();

    cellAt(store, 1, 'name').startNgeRange();
    cellAt(store, 2, 'status').extendNgeRange();

    const data = store.table.readNgeExportData({
      cellPredicate: store.table.ngeRangePredicate(),
    });

    expect(data.columns.map(column => column.id)).toEqual(['name', 'status']);
    expect(data.rows.map(row => row.id)).toEqual([rows[1].id, rows[2].id]);
    expect(data.rows[0].cells.map(cell => cell.columnId)).toEqual(['name', 'status']);
  });

  it('exports nothing when nothing is selected', () => {
    const store = createStore();

    const data = store.table.readNgeExportData({
      cellPredicate: store.table.ngeRangePredicate(),
    });

    expect(data.rows).toEqual([]);
  });

  it('covers disjoint rectangles', () => {
    const store = createStore();

    cellAt(store, 1, 'name').startNgeRange();
    cellAt(store, 5, 'quantity').startNgeRange({ additive: true });

    const data = store.table.readNgeExportData({
      cellPredicate: store.table.ngeRangePredicate(),
    });

    expect(data.rows.map(row => row.id)).toEqual([rows[1].id, rows[5].id]);
    expect(data.columns.map(column => column.id)).toEqual(['name', 'quantity']);
  });
});

describe('ngeCellRange — the getRowId requirement', () => {
  // ⚠️ Fails loudly in dev rather than keying the rectangle by array index, where a
  // sort or a re-fetch would silently move the selection onto other records.
  it('throws on the first write when the config carries no getRowId', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [NgeTableStore, provideNgeTableFeatures(ngeCellRange)],
    });

    const store = TestBed.inject(NgeTableStore);
    store.setConfig(
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: rows,
      }) as NgeTableConfig<unknown>
    );

    expect(() => cellAt(store, 0, 'name').startNgeRange()).toThrow(/getRowId/);
  });

  // The read path runs once per rendered cell, so it must stay out of the way — a
  // throw there would take out the render rather than the misconfiguration.
  it('still answers the read path without throwing', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [NgeTableStore, provideNgeTableFeatures(ngeCellRange)],
    });

    const store = TestBed.inject(NgeTableStore);
    store.setConfig(
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: rows,
      }) as NgeTableConfig<unknown>
    );

    expect(cellAt(store, 0, 'name').isNgeInRange()).toBe(false);
  });
});

describe('NgeRangeBridge — clearing and select-all', () => {
  it('clears everything through the bridge', () => {
    const { bridge, store } = createStoreWithBridge();

    bridge.start(rows[1].id, 'name');
    bridge.clear();

    expect(store.tableState().ngeRange).toEqual({ ranges: [] });
  });

  it('clears on Escape', () => {
    const { bridge, store } = createStoreWithBridge();

    bridge.start(rows[2].id, 'name');
    bridge.extendTo(rows[6].id, 'quantity');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(store.tableState().ngeRange).toEqual({ ranges: [] });
  });

  // ⚠️ What makes a document-level listener acceptable. `Escape` belongs to whatever
  // is on top — a dialog, a menu — so a table with nothing to give up must leave the
  // key alone: no `preventDefault`, and no state churn either.
  it('does not consume Escape, and writes nothing when unselected', () => {
    const { store } = createStoreWithBridge();

    const before = store.tableState();
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'Escape' });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(store.tableState()).toBe(before);
  });

  it('ignores keys other than its two', () => {
    const { bridge, store } = createStoreWithBridge();

    bridge.start(rows[1].id, 'name');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(store.tableState().ngeRange?.ranges).toHaveLength(1);
  });

  it('takes every cell on cmd/ctrl-A once the user has engaged', () => {
    const { bridge, store } = createStoreWithBridge();

    bridge.start(rows[3].id, 'status');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', metaKey: true }));

    expect(cellAt(store, 0, 'name').isNgeInRange()).toBe(true);
    expect(cellAt(store, 11, 'owner').isNgeInRange()).toBe(true);
  });

  // ⚠️ Unlike `Escape`, taking cmd/ctrl-A means calling `preventDefault()`, so an
  // unscoped listener would swallow every select-all on the page. Engagement with
  // THIS table is the scope.
  it('leaves cmd/ctrl-A alone until the user has clicked into the table', () => {
    const { store } = createStoreWithBridge();

    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'a', metaKey: true });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(store.tableState().ngeRange?.ranges ?? []).toEqual([]);
  });

  it('hands cmd/ctrl-A back after a clear', () => {
    const { bridge, store } = createStoreWithBridge();

    bridge.start(rows[3].id, 'status');
    bridge.clear();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', metaKey: true }));

    expect(store.tableState().ngeRange?.ranges ?? []).toEqual([]);
  });

  // ⚠️ The escape hatch for a page with two range-enabled tables, where one
  // document-level listener each means a single Escape clears both.
  it('does not listen when clearOnEscape is false', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [NgeTableStore, ...provideNgeCellRange({ clearOnEscape: false })],
    });

    const store = TestBed.inject(NgeTableStore);
    store.setConfig(
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: rows,
        getRowId: row => row.id,
      }) as NgeTableConfig<unknown>
    );

    const bridge = TestBed.inject(NgeRangeBridge);
    bridge.attach(store.table);
    bridge.start(rows[1].id, 'name');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(store.tableState().ngeRange?.ranges).toHaveLength(1);
  });

  // The listeners are scoped to the injector that provided the bridge, so tearing
  // that down must stop them — a leaked document listener would clear a table
  // nobody is looking at any more.
  it('stops listening once its injector is destroyed', () => {
    const { bridge, store } = createStoreWithBridge();

    bridge.start(rows[1].id, 'name');
    const selected = store.tableState().ngeRange?.ranges;

    TestBed.resetTestingModule();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(store.tableState().ngeRange?.ranges).toEqual(selected);
  });

  it('matches no cell before a table has attached', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [NgeRangeBridge] });

    const bridge = TestBed.inject(NgeRangeBridge);

    expect(bridge.rowOrder().size).toBe(0);
    expect(bridge.columnOrder().size).toBe(0);
    expect(
      bridge.predicate()({
        columnId: 'name',
        ...NGE_CELL_NO_EDIT.forCell('', ''),
        isSettled: NGE_CELL_ALWAYS_SETTLED,
        row: {},
        rowId: rows[0].id,
        rowIndex: 0,
        value: 1,
      })
    ).toBe(false);
  });
});

// The whole addon, wired the way a consumer wires it: three providers, one
// projected `cell-overlay` template, and no core template touched. What jsdom can
// prove here is the wiring — that the overlay publishes a key onto a REAL core
// cell, that the bridge finds the root from it, and that a pointerdown on that
// cell reaches the host's own `stateChange`. What it cannot prove is any of the
// geometry: the drag, the auto-scroll, and the suppressed text selection are
// browser-only.
describe('NgeRangeOverlayComponent — in a real table', () => {
  @Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgeRangeOverlayComponent, NgeTableComponent, NgeTableSlotDirective],
    providers: [...provideNgeCellRange()],
    selector: 'nge-range-host',
    standalone: true,
    template: `
      <nge-table [config]="config()" [state]="tableState()" (stateChange)="onStateChange($event)">
        <ng-template ngeTableSlot="cell-overlay" [ngeTableSlotOf]="rows" let-cell>
          <nge-range-overlay [cell]="cell" [state]="tableState()" />
        </ng-template>
      </nge-table>
    `,
  })
  class RangeHostComponent {
    readonly config = input.required<NgeTableConfig<NgeTableFixtureRow>>();

    /** Type carrier for the slot context; never read at runtime. */
    readonly rows = rows;

    readonly tableState = signal(createNgeTableState());

    /** ⚠️ Every emission, which is the gate's evidence — see the spec below. */
    readonly stateChanges: NgeTableState[] = [];

    onStateChange(state: NgeTableState): void {
      this.stateChanges.push(state);
      this.tableState.set(state);
    }
  }

  async function createHost(): Promise<ComponentFixture<RangeHostComponent>> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [RangeHostComponent] });

    const fixture = TestBed.createComponent(RangeHostComponent);
    fixture.componentRef.setInput(
      'config',
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: rows,
        getRowId: row => row.id,
      })
    );
    fixture.detectChanges();
    // The overlay publishes its cell key from an `afterRenderEffect`, so nothing is
    // stamped and no root is attached until the render hooks have run.
    await fixture.whenStable();

    return fixture;
  }

  function cellElement(
    fixture: ComponentFixture<RangeHostComponent>,
    rowIndex: number,
    columnId: string
  ): Element {
    const selector = `[${NGE_RANGE_CELL_ATTRIBUTE}="${rows[rowIndex].id}::${columnId}"]`;
    const cell = fixture.nativeElement.querySelector(selector);

    if (!cell) {
      throw new Error(`no rendered cell for ${selector}`);
    }

    return cell;
  }

  /**
   * Every stamped cell of one column, in the order the DOM holds them.
   *
   * ⚠️ Read from the DOM rather than from the row model on purpose. Touching
   * `store.table` is a read of the adapter's **proxy**, which re-applies options to
   * the raw instance — so a helper that consults the table between an action and an
   * assertion refreshes the very thing under test and can turn a real staleness
   * defect green. The rendered attributes are the user's own view order and owe
   * nothing to the engine.
   */
  function cellsInColumn(
    fixture: ComponentFixture<RangeHostComponent>,
    columnId: string
  ): Element[] {
    const cells: Element[] = Array.from(
      (fixture.nativeElement as Element).querySelectorAll(`[${NGE_RANGE_CELL_ATTRIBUTE}]`)
    );

    return cells.filter(cell =>
      (cell.getAttribute(NGE_RANGE_CELL_ATTRIBUTE) ?? '').endsWith(`::${columnId}`)
    );
  }

  function keyOf(cell: Element): { columnId: string; rowId: string } {
    return parseNgeRangeCellKey(cell.getAttribute(NGE_RANGE_CELL_ATTRIBUTE) ?? '');
  }

  /** Row ids in the order the table currently shows them, taken from the DOM. */
  function viewOrderInDom(
    fixture: ComponentFixture<RangeHostComponent>,
    columnId: string
  ): string[] {
    return cellsInColumn(fixture, columnId).map(cell => keyOf(cell).rowId);
  }

  /** Row ids the overlay is actually PAINTING — what a user sees selected. */
  function paintedRowIds(
    fixture: ComponentFixture<RangeHostComponent>,
    columnId: string
  ): string[] {
    return cellsInColumn(fixture, columnId)
      .filter(cell => cell.querySelector('.nge-range-overlay--on') !== null)
      .map(cell => keyOf(cell).rowId);
  }

  /** Column ids the overlay is painting across one row, in visual order. */
  function paintedColumnIds(
    fixture: ComponentFixture<RangeHostComponent>,
    rowId: string
  ): string[] {
    const anyCell = (fixture.nativeElement as Element).querySelector(
      `[${NGE_RANGE_CELL_ATTRIBUTE}^="${rowId}::"]`
    );
    const cells: Element[] = Array.from(
      anyCell?.closest('.nge-table__row')?.querySelectorAll(`[${NGE_RANGE_CELL_ATTRIBUTE}]`) ?? []
    );

    return cells
      .filter(cell => cell.querySelector('.nge-range-overlay--on') !== null)
      .map(cell => keyOf(cell).columnId);
  }

  /** The contiguous span between two ids in a view order, either way round. */
  function spanBetween(view: string[], from: string, to: string): string[] {
    const start = view.indexOf(from);
    const end = view.indexOf(to);

    return view.slice(Math.min(start, end), Math.max(start, end) + 1);
  }

  /** Drag a block out with the pointer, exactly as the gesture does. */
  function selectBlock(
    fixture: ComponentFixture<RangeHostComponent>,
    anchor: { columnId: string; rowIndex: number },
    focus: { columnId: string; rowIndex: number }
  ): void {
    cellElement(fixture, anchor.rowIndex, anchor.columnId).dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true })
    );
    fixture.detectChanges();
    cellElement(fixture, focus.rowIndex, focus.columnId).dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, shiftKey: true })
    );
    fixture.detectChanges();
  }

  it('stamps every rendered cell with its row and column ids', async () => {
    const fixture = await createHost();

    expect(fixture.nativeElement.querySelectorAll(`[${NGE_RANGE_CELL_ATTRIBUTE}]`).length).toBe(
      rows.length * NGE_TABLE_FIXTURE_COLUMNS.length
    );
    expect(cellElement(fixture, 3, 'status').className).toContain('nge-table__cell');
  });

  // ⚠️ THE GATE ASSERTION, in its strongest form. ARCH-250 found that an addon can
  // render, toggle, and survive a scroll while `NgeTableState` never moves and
  // `stateChange` never fires — the Angular adapter's internal state signal absorbs
  // the write. So the evidence is not that a cell looks selected; it is that the
  // HOST heard about it.
  it('reaches the host through stateChange', async () => {
    const fixture = await createHost();
    const host = fixture.componentInstance;

    cellElement(fixture, 1, 'name').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(host.stateChanges.length).toBeGreaterThan(0);
    expect(host.stateChanges[host.stateChanges.length - 1].ngeRange?.ranges).toEqual([
      {
        anchorColumnId: 'name',
        anchorRowId: rows[1].id,
        focusColumnId: 'name',
        focusRowId: rows[1].id,
      },
    ]);
  });

  // The keyboard path through the same gate: a real `keydown` on the document, a
  // real overlay, and the host's own output as the evidence.
  it('reaches the host through stateChange on Shift+arrow', async () => {
    const fixture = await createHost();
    const host = fixture.componentInstance;

    cellElement(fixture, 1, 'name').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    const before = host.stateChanges.length;
    arrow('ArrowDown');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.stateChanges.length).toBeGreaterThan(before);
    expect(host.stateChanges[host.stateChanges.length - 1].ngeRange?.ranges[0]).toEqual({
      anchorColumnId: 'name',
      anchorRowId: rows[1].id,
      focusColumnId: 'name',
      focusRowId: rows[2].id,
    });
    expect(paintedRowIds(fixture, 'name')).toEqual([rows[1].id, rows[2].id]);
  });

  it('paints the cells the rectangle covers, and only those', async () => {
    const fixture = await createHost();

    cellElement(fixture, 1, 'name').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    cellElement(fixture, 3, 'quantity').dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, shiftKey: true })
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.nge-range-overlay--on').length).toBe(9);
    expect(fixture.nativeElement.querySelectorAll('.nge-range-overlay--focus').length).toBe(1);
  });

  // Nothing in the core template mentions this addon, so a table whose consumer
  // projected no overlay is unchanged — which is what makes the seam a seam.
  it('leaves the core template free of any range markup', async () => {
    const fixture = await createHost();

    expect(fixture.nativeElement.querySelector('.nge-table__cell-overlay')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-nge-range-selected]')).toBeNull();
  });

  // ⚠️ THE CLAIM THE WHOLE STORY RESTS ON, asserted where a user actually sees it.
  //
  // The unit specs above answer through `cell.isNgeInRange()` — the FEATURE's read
  // path, which re-derives on every call and is genuinely correct. What a user looks
  // at is the OVERLAY's `computed`, and a computed re-runs only when one of its
  // inputs changes identity. A sort changes neither:
  //
  // - `state.ngeRange` is untouched by sorting, so a `[range]`-shaped input holds
  //   the same object;
  // - `getSortedRowModel` REORDERS the same `Row` instances rather than rebuilding
  //   them, `getAllCells` is memoised per row, and the slot context is memoised per
  //   `Cell` — so `[cell]` holds the same object too;
  // - the row `@for` tracks `row.id` and the cell `@for` tracks `cell.id`, so
  //   Angular moves the existing DOM nodes instead of recreating them.
  //
  // Everything therefore holds still while the view order moves underneath it, and
  // the painted block silently becomes an enumeration of whatever was under the
  // pointer at drag time. These two specs fail against a `[range]`-shaped input and
  // pass against a `[state]`-shaped one; they assert on painted DOM only, and never
  // read `store.table` between the action and the assertion.
  it('re-shapes the PAINTED block when the rows are re-sorted', async () => {
    const fixture = await createHost();
    const host = fixture.componentInstance;

    selectBlock(fixture, { columnId: 'name', rowIndex: 0 }, { columnId: 'name', rowIndex: 3 });
    await fixture.whenStable();

    expect(paintedRowIds(fixture, 'name')).toEqual(
      spanBetween(viewOrderInDom(fixture, 'name'), rows[0].id, rows[3].id)
    );

    host.tableState.set({ ...host.tableState(), sorting: [{ desc: false, id: 'name' }] });
    fixture.detectChanges();
    await fixture.whenStable();

    const sorted = viewOrderInDom(fixture, 'name');

    // The endpoints follow their records; which rows lie between them follows the
    // view. A block that stayed the same four records would be an enumeration.
    expect(paintedRowIds(fixture, 'name')).toEqual(spanBetween(sorted, rows[0].id, rows[3].id));
  });

  // The column-axis half — the property decision 1's four-id descriptor exists for,
  // and equally invisible to a `[range]`-shaped input, because a reorder moves
  // `state.columnOrder` and not `state.ngeRange`.
  it('re-shapes the PAINTED block when the columns are re-ordered', async () => {
    const fixture = await createHost();
    const host = fixture.componentInstance;

    selectBlock(fixture, { columnId: 'name', rowIndex: 2 }, { columnId: 'quantity', rowIndex: 2 });
    await fixture.whenStable();

    expect(paintedColumnIds(fixture, rows[2].id)).toEqual(['name', 'status', 'quantity']);

    host.tableState.set({
      ...host.tableState(),
      columnOrder: ['status', 'name', 'quantity', 'amount', 'createdAt', 'isActive', 'owner'],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    // `status` has moved out from between the endpoints, so the block narrows.
    expect(paintedColumnIds(fixture, rows[2].id)).toEqual(['name', 'quantity']);
  });
});

// ─── Column selection (ARCH-270) ─────────────────────────────────────────────

/**
 * The header markup the keyboard route resolves against, built by hand.
 *
 * Exactly what `<nge-range-column-handle>` publishes at runtime — the same
 * attribute on the same core class. The POINTER gesture is deliberately not
 * exercised here: it is bound on the handle's own element rather than delegated from
 * the root, so it belongs to that component's spec and to the browser.
 */
function mountHeaderDom(store: Store): (columnId: string) => Element {
  const root = document.createElement('div');
  root.className = 'nge-table';

  for (const cell of store.table.getRowModel().rows[0].getAllCells()) {
    const header = document.createElement('div');
    header.className = 'nge-table__header-cell';
    header.setAttribute(NGE_RANGE_COLUMN_ATTRIBUTE, cell.column.id);
    header.tabIndex = 0;
    root.append(header);
  }

  document.body.append(root);
  mounted.push(root);

  return columnId => {
    const header = root.querySelector(`[${NGE_RANGE_COLUMN_ATTRIBUTE}="${columnId}"]`);

    if (!header) {
      throw new Error(`no mounted header for ${columnId}`);
    }

    return header;
  };
}

/** cmd + `Space`, dispatched so it bubbles from a header to the document listener. */
function columnKey(header: Element, modifiers: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: ' ',
    metaKey: true,
    ...modifiers,
  });
  header.dispatchEvent(event);

  return event;
}

describe('ngeCellRange — the column API', () => {
  it('reaches every column through _features alone', () => {
    const store = createStore();
    const column = columnAt(store, 'status');

    expect(typeof column.startNgeColumnRange).toBe('function');
    expect(typeof column.extendNgeColumnRange).toBe('function');
    expect(typeof column.isNgeColumnSelected).toBe('function');
  });

  it('selects every cell of a column', () => {
    const store = createStore();

    columnAt(store, 'status').startNgeColumnRange();

    expect(selectedRowIds(store, 'status')).toEqual(viewRowIds(store));
    expect(selectedColumnIds(store, 4)).toEqual(['status']);
  });

  // ⚠️ **The story's central acceptance criterion, and what the nullable row
  // endpoints buy.** A span between the first and last records would follow those two
  // records through the sort and the "column" would shrink to whatever now lies
  // between them.
  it('keeps the whole column selected across a re-sort', () => {
    const store = createStore();

    columnAt(store, 'status').startNgeColumnRange();

    store.setTableState(
      createNgeTableState({
        ngeRange: store.tableState().ngeRange,
        sorting: [{ desc: true, id: 'amount' }],
      })
    );

    expect(selectedRowIds(store, 'status')).toEqual(viewRowIds(store));
  });

  it('reports the column as selected, and its neighbours as not', () => {
    const store = createStore();

    columnAt(store, 'status').startNgeColumnRange();

    expect(columnAt(store, 'status').isNgeColumnSelected()).toBe(true);
    expect(columnAt(store, 'name').isNgeColumnSelected()).toBe(false);
  });

  // Fully, not partially — a column a dragged block passes through is not a selected
  // column, even though its cells are in the range.
  it('does not report a column a dragged block merely passes through', () => {
    const store = createStore();

    cellAt(store, 1, 'name').startNgeRange();
    cellAt(store, 3, 'quantity').extendNgeRange();

    expect(cellAt(store, 2, 'status').isNgeInRange()).toBe(true);
    expect(columnAt(store, 'status').isNgeColumnSelected()).toBe(false);
  });

  it('takes the span of columns on extend, in visual order', () => {
    const store = createStore();

    columnAt(store, 'name').startNgeColumnRange();
    columnAt(store, 'quantity').extendNgeColumnRange();

    expect(selectedColumnIds(store, 0)).toEqual(['name', 'status', 'quantity']);
    expect(selectedRowIds(store, 'status')).toEqual(viewRowIds(store));
  });

  // ⚠️ `enablePinning` defaults to false, so a column-axis claim about VISUAL order
  // has to switch it on — and pinning a column between the endpoints moves it OUT of
  // the span rather than joining it.
  it('follows visual order when a column between the endpoints is pinned', () => {
    const store = createStore({ enablePinning: true });

    columnAt(store, 'name').startNgeColumnRange();
    columnAt(store, 'quantity').extendNgeColumnRange();

    expect(selectedColumnIds(store, 0)).toEqual(['name', 'status', 'quantity']);

    store.setTableState(
      createNgeTableState({
        columnPinning: { left: ['status'], right: [] },
        ngeRange: store.tableState().ngeRange,
      })
    );

    expect(selectedColumnIds(store, 0)).toEqual(['name', 'quantity']);
  });

  it('toggles a disjoint column on and off with the additive flag', () => {
    const store = createStore();

    columnAt(store, 'name').startNgeColumnRange();
    columnAt(store, 'amount').startNgeColumnRange({ additive: true });

    expect(selectedColumnIds(store, 0)).toEqual(['name', 'amount']);

    columnAt(store, 'amount').startNgeColumnRange({ additive: true });

    expect(selectedColumnIds(store, 0)).toEqual(['name']);
  });

  // Recycled DOM re-derives from state, so a column selection covers rows no window
  // has ever rendered. The scroll itself is browser-only; this is the state half.
  it('covers a row far outside any rendered window', () => {
    const store = createStore();

    columnAt(store, 'status').startNgeColumnRange();

    expect(cellAt(store, 11, 'status').isNgeInRange()).toBe(true);
  });

  // ⚠️ The AC that pins the seam: a selected column exports through ARCH-248's
  // predicate with no change to `src/lib/export/` and none to ARCH-269's path either.
  it('exports a selected column through the untouched export seam', () => {
    const store = createStore();

    columnAt(store, 'status').startNgeColumnRange();

    const data = store.table.readNgeExportData({
      cellPredicate: store.table.ngeRangePredicate(),
    });

    expect(data.columns.map(column => column.id)).toEqual(['status']);
    expect(data.rows.map(row => row.id)).toEqual(viewRowIds(store));
  });
});

describe('ngeCellRange — select-all is unbounded on the row axis', () => {
  // ⚠️ **A regression this story fixes rather than introduces.** cmd/ctrl-A used to
  // write the first and last row ids, so a sort moved those two records and
  // "everything" quietly became the span between them.
  it('still covers every row after a re-sort', () => {
    const store = createStore();

    store.table.selectAllNgeRange();

    store.setTableState(
      createNgeTableState({
        ngeRange: store.tableState().ngeRange,
        sorting: [{ desc: true, id: 'amount' }],
      })
    );

    expect(selectedRowIds(store, 'name')).toEqual(viewRowIds(store));
    expect(selectedColumnIds(store, 0)).toHaveLength(NGE_TABLE_FIXTURE_COLUMNS.length);
  });
});

describe('NgeRangeBridge — column gestures', () => {
  it('selects a column, and extends to a span', () => {
    const { bridge, store } = createStoreWithBridge();

    bridge.startColumn('name');
    bridge.extendToColumn('quantity');

    expect(selectedColumnIds(store, 0)).toEqual(['name', 'status', 'quantity']);
  });

  // ⚠️ The same rule `extendTo` follows for cells: a user who has not told this table
  // where to reach from is starting, not continuing — so a saved view's rectangle is
  // never extended from a corner they never touched.
  it('starts a column when there is no gesture anchor', () => {
    const { bridge, store } = createStoreWithBridge();

    bridge.extendToColumn('quantity');

    expect(selectedColumnIds(store, 0)).toEqual(['quantity']);
  });

  it('clears a column selection on Escape', () => {
    const { bridge, store } = createStoreWithBridge();

    bridge.startColumn('status');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(store.tableState().ngeRange).toEqual({ ranges: [] });
  });

  it('takes cmd/ctrl-Space on a stamped header', () => {
    const { store } = createStoreWithBridge();
    const headerAt = mountHeaderDom(store);

    const event = columnKey(headerAt('status'));

    expect(event.defaultPrevented).toBe(true);
    expect(selectedColumnIds(store, 0)).toEqual(['status']);
  });

  it('extends the span on shift + cmd/ctrl-Space', () => {
    const { store } = createStoreWithBridge();
    const headerAt = mountHeaderDom(store);

    columnKey(headerAt('name'));
    columnKey(headerAt('quantity'), { shiftKey: true });

    expect(selectedColumnIds(store, 0)).toEqual(['name', 'status', 'quantity']);
  });

  // ⚠️ Scoped by the stamped header rather than by engagement, which is what makes it
  // a usable keyboard route — but it must still leave the key alone everywhere else,
  // because cmd/ctrl + `Space` is a platform input-method shortcut.
  it('leaves cmd/ctrl-Space alone away from a header', () => {
    const { store } = createStoreWithBridge();
    mountHeaderDom(store);

    const event = columnKey(document.body);

    expect(event.defaultPrevented).toBe(false);
    expect(store.tableState().ngeRange?.ranges ?? []).toEqual([]);
  });

  it('does not listen when selectColumnOnModifierSpace is false', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [NgeTableStore, ...provideNgeCellRange({ selectColumnOnModifierSpace: false })],
    });

    const store = TestBed.inject(NgeTableStore);
    store.setConfig(
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: rows,
        getRowId: row => row.id,
      }) as NgeTableConfig<unknown>
    );
    TestBed.inject(NgeRangeBridge).attach(store.table);

    const headerAt = mountHeaderDom(store);
    const event = columnKey(headerAt('status'));

    expect(event.defaultPrevented).toBe(false);
    expect(store.tableState().ngeRange?.ranges ?? []).toEqual([]);
  });

  // ⚠️ **The two header gestures cannot trigger each other, and one half is
  // structural.** Angular's `keydown.space` binding — what toggles the sort — matches
  // only when NO modifiers are held (`KeyEventsPlugin.matchEventFullKeyCode` appends
  // every pressed modifier before comparing), so a cmd/ctrl-modified press can never
  // reach it. The other half (the strip's click never sorting) is the handle
  // component's own spec.
  it('leaves an unmodified Space alone, so the sort keeps it', () => {
    const { store } = createStoreWithBridge();
    const headerAt = mountHeaderDom(store);

    const event = columnKey(headerAt('status'), { metaKey: false });

    expect(event.defaultPrevented).toBe(false);
    expect(store.tableState().ngeRange?.ranges ?? []).toEqual([]);
  });
});
