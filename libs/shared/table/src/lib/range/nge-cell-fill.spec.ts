import type { Cell } from '@tanstack/angular-table';

import { TestBed } from '@angular/core/testing';

import type { NgeTableFixtureRow } from '../../testing';
import type { NgeTableEvent } from '../events';
import type { NgeTableConfig } from '../nge-table-config';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_COLUMNS } from '../../testing';
import { createNgeTableConfig } from '../nge-table-config';
import { createNgeTableState } from '../nge-table-state';
import { NgeTableStore } from '../nge-table/store';
import { provideNgeCellRange } from './provide-nge-cell-range';

const rows = createNgeTableFixture({ rows: 12 });

type Store = InstanceType<typeof NgeTableStore>;

interface Harness {
  events: NgeTableEvent<unknown>[];
  store: Store;
}

/**
 * A store with the addon registered the way a consumer registers it, plus the event
 * sink `<nge-table>` would wire.
 *
 * ⚠️ **The sink is the whole point of this file.** ARCH-271's finding is that an addon
 * had no route to axis 4 at all; every assertion below that reads `events` is checking
 * the seam that opened it, not merely the fill.
 */
function createHarness(config?: Partial<NgeTableConfig<NgeTableFixtureRow>>): Harness {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [NgeTableStore, ...provideNgeCellRange()] });

  const store = TestBed.inject(NgeTableStore);
  const events: NgeTableEvent<unknown>[] = [];

  store.setEventSink(event => events.push(event));
  store.setConfig(
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: rows,
      getRowId: row => row.id,
      ...config,
    }) as NgeTableConfig<unknown>
  );

  return { events, store };
}

/**
 * Read the adapter's proxy, which re-applies options to the raw engine instance.
 *
 * ⚠️ **Not a test smell — it is what an application does on every change-detection
 * pass.** The feature's read paths hold the RAW instance (that is what `createTable`
 * hands over), and its `options.state` refreshes only when the proxy is read. So a
 * spec asserting on a read *straight after* a write is asserting on the pre-write
 * answer unless something renders in between. ARCH-269 records the same caveat for
 * `ngeRangePredicate`; this is the spec-side counterpart.
 */
function refresh(store: Store): void {
  store.table.getRowModel();
}

function cellAt(store: Store, rowIndex: number, columnId: string): Cell<unknown, unknown> {
  const row = store.table.getRowModel().rows[rowIndex];
  const cell = row.getAllCells().find(entry => entry.column.id === columnId);

  if (!cell) {
    throw new Error(`no cell for column ${columnId}`);
  }

  return cell;
}

/** Select a block, then drag the handle to one cell and release. */
function fillFrom(
  store: Store,
  from: { columnId: string; rowIndex: number },
  to: { columnId: string; rowIndex: number },
  through: { columnId: string; rowIndex: number } = to
): void {
  cellAt(store, from.rowIndex, from.columnId).startNgeRange();
  cellAt(store, to.rowIndex, to.columnId).extendNgeRange();

  const target = store.table.getRowModel().rows[through.rowIndex];
  store.table.moveNgeFillTo(target.id, through.columnId);
  store.table.commitNgeFill();
}

function fillIntents(events: NgeTableEvent<unknown>[]) {
  return events.filter(event => event.kind === 'fill-intent');
}

describe('ngeCellFill — registration and the emit seam', () => {
  it('reaches the instance through provideNgeCellRange alone', () => {
    const { store } = createHarness();

    expect(typeof store.table.commitNgeFill).toBe('function');
    expect(typeof store.table.moveNgeFillTo).toBe('function');
    expect(typeof store.table.ngeFillPlan).toBe('function');
  });

  // ⚠️ The seam ARCH-271 had to open: `emitTableEvent` is a closure on the store, and
  // an addon holds only the engine instance. Publishing the sink onto the instance is
  // what makes an addon audible at all.
  it('puts the event emitter on the instance for any feature to use', () => {
    const { events, store } = createHarness();

    store.table.emitNgeTableEvent({
      cells: [],
      kind: 'fill-intent',
      sourceColumnIds: [],
      sourceRowIds: [],
    });

    expect(events).toHaveLength(1);
  });
});

describe('ngeCellFill — the handle', () => {
  it('sits on the range’s trailing-bottom corner and nowhere else', () => {
    const { store } = createHarness();

    cellAt(store, 1, 'name').startNgeRange();
    cellAt(store, 3, 'quantity').extendNgeRange();

    expect(cellAt(store, 3, 'quantity').isNgeFillHandle()).toBe(true);
    expect(cellAt(store, 1, 'name').isNgeFillHandle()).toBe(false);
    expect(cellAt(store, 3, 'name').isNgeFillHandle()).toBe(false);
  });

  it('follows the corner when the block is dragged the other way', () => {
    const { store } = createHarness();

    cellAt(store, 5, 'quantity').startNgeRange();
    cellAt(store, 2, 'name').extendNgeRange();

    expect(cellAt(store, 5, 'quantity').isNgeFillHandle()).toBe(true);
  });

  // ⚠️ **ARCH-270's consequence.** A whole-column range covers every row, so it has no
  // bottom corner and nothing below to fill into.
  it('is absent on a whole-column range', () => {
    const { store } = createHarness();

    cellAt(store, 0, 'quantity').column.startNgeColumnRange();

    expect(
      store.table
        .getRowModel()
        .rows.every(row => row.getAllCells().every(cell => !cell.isNgeFillHandle()))
    ).toBe(true);
  });

  it('is absent after select-all, which writes the same unbounded shape', () => {
    const { store } = createHarness();

    store.table.selectAllNgeRange();

    expect(cellAt(store, 11, 'owner').isNgeFillHandle()).toBe(false);
  });

  it('is absent with nothing selected', () => {
    const { store } = createHarness();

    expect(cellAt(store, 3, 'quantity').isNgeFillHandle()).toBe(false);
  });
});

describe('ngeCellFill — proposing', () => {
  it('emits exactly one fill-intent on release', () => {
    const { events, store } = createHarness();

    fillFrom(
      store,
      { columnId: 'quantity', rowIndex: 0 },
      { columnId: 'quantity', rowIndex: 1 },
      {
        columnId: 'quantity',
        rowIndex: 4,
      }
    );

    expect(fillIntents(events)).toHaveLength(1);
  });

  it('carries the swept cells, their proposed values, and what they hold today', () => {
    const { events, store } = createHarness();

    fillFrom(
      store,
      { columnId: 'quantity', rowIndex: 0 },
      { columnId: 'quantity', rowIndex: 1 },
      {
        columnId: 'quantity',
        rowIndex: 4,
      }
    );

    const intent = fillIntents(events)[0];

    expect(intent).toMatchObject({ kind: 'fill-intent' });

    if (intent.kind !== 'fill-intent') {
      throw new Error('expected a fill-intent');
    }

    expect(intent.cells.map(cell => cell.rowId)).toEqual([rows[2].id, rows[3].id, rows[4].id]);
    expect(intent.cells.every(cell => cell.columnId === 'quantity')).toBe(true);
    expect(intent.cells.map(cell => cell.previousValue)).toEqual([
      rows[2].quantity,
      rows[3].quantity,
      rows[4].quantity,
    ]);
    expect(intent.sourceRowIds).toEqual([rows[0].id, rows[1].id]);
  });

  // ⚠️ **The load-bearing claim of the whole story.** The library owns no data and
  // must never acquire any: the values in the event are a proposal, and the table
  // still reads exactly what the host handed it.
  it('changes nothing until the host acts', () => {
    const { store } = createHarness();
    const before = cellAt(store, 4, 'quantity').getValue();

    fillFrom(
      store,
      { columnId: 'quantity', rowIndex: 0 },
      { columnId: 'quantity', rowIndex: 1 },
      {
        columnId: 'quantity',
        rowIndex: 4,
      }
    );

    expect(cellAt(store, 4, 'quantity').getValue()).toBe(before);
    expect(rows[4].quantity).toBe(before);
  });

  // Dragging back inside the block is a RETRACTION, not a fill — it reshapes and
  // proposes nothing. What it does instead is the describe block below.
  it('emits nothing when the drag came back inside the source', () => {
    const { events, store } = createHarness();

    fillFrom(
      store,
      { columnId: 'quantity', rowIndex: 0 },
      { columnId: 'quantity', rowIndex: 2 },
      {
        columnId: 'quantity',
        rowIndex: 1,
      }
    );

    expect(fillIntents(events)).toEqual([]);
  });

  it('emits nothing on cancel, and drops the pending region', () => {
    const { events, store } = createHarness();

    cellAt(store, 0, 'quantity').startNgeRange();
    cellAt(store, 1, 'quantity').extendNgeRange();
    store.table.moveNgeFillTo(rows[5].id, 'quantity');
    refresh(store);

    expect(store.table.ngeFillPlan()).not.toBeNull();

    store.table.cancelNgeFill();
    refresh(store);

    expect(fillIntents(events)).toEqual([]);
    expect(store.table.ngeFillPlan()).toBeNull();
  });

  it('emits nothing when there is no selection to fill from', () => {
    const { events, store } = createHarness();

    store.table.moveNgeFillTo(rows[5].id, 'quantity');
    store.table.commitNgeFill();

    expect(fillIntents(events)).toEqual([]);
  });

  // One gesture, one proposal. The commit consumes the pending target, so nothing is
  // left for a second release to re-announce — a listener never sees the same fill twice.
  it('clears the pending region after a commit, so a second release proposes nothing', () => {
    const { events, store } = createHarness();

    fillFrom(
      store,
      { columnId: 'quantity', rowIndex: 0 },
      { columnId: 'quantity', rowIndex: 1 },
      {
        columnId: 'quantity',
        rowIndex: 4,
      }
    );
    refresh(store);
    store.table.commitNgeFill();

    expect(fillIntents(events)).toHaveLength(1);
  });
});

// ⚠️ What a spreadsheet does, and what puts the grip on the new bottom edge so a second
// drag extends further without re-selecting.
describe('ngeCellFill — the selection grows to cover what was filled', () => {
  it('covers source ∪ swept after a commit', () => {
    const { store } = createHarness();

    fillFrom(
      store,
      { columnId: 'quantity', rowIndex: 0 },
      { columnId: 'quantity', rowIndex: 1 },
      {
        columnId: 'quantity',
        rowIndex: 4,
      }
    );
    refresh(store);

    expect(store.tableState().ngeRange?.ranges).toEqual([
      {
        anchorColumnId: 'quantity',
        anchorRowId: rows[0].id,
        focusColumnId: 'quantity',
        focusRowId: rows[4].id,
      },
    ]);
  });

  it('moves the grip to the new bottom edge, so a second fill can extend further', () => {
    const { store } = createHarness();

    fillFrom(
      store,
      { columnId: 'quantity', rowIndex: 0 },
      { columnId: 'quantity', rowIndex: 1 },
      {
        columnId: 'quantity',
        rowIndex: 4,
      }
    );
    refresh(store);

    expect(cellAt(store, 4, 'quantity').isNgeFillHandle()).toBe(true);
    expect(cellAt(store, 1, 'quantity').isNgeFillHandle()).toBe(false);
  });

  // A fill upward and a fill downward leave the same rectangle — the union is always
  // anchored at its first corner.
  it('anchors the union the same way when the fill went backwards', () => {
    const { store } = createHarness();

    fillFrom(
      store,
      { columnId: 'quantity', rowIndex: 4 },
      { columnId: 'quantity', rowIndex: 5 },
      {
        columnId: 'quantity',
        rowIndex: 2,
      }
    );
    refresh(store);

    expect(store.tableState().ngeRange?.ranges[0]).toMatchObject({
      anchorRowId: rows[2].id,
      focusRowId: rows[5].id,
    });
  });

  // ⚠️ Only the ACTIVE rectangle reshapes. A user who cmd/ctrl-added disjoint blocks
  // keeps them — dropping them would make a fill destructive to a selection it never
  // touched.
  it('leaves disjoint rectangles alone', () => {
    const { store } = createHarness();

    cellAt(store, 8, 'name').startNgeRange();
    cellAt(store, 0, 'quantity').startNgeRange({ additive: true });
    cellAt(store, 1, 'quantity').extendNgeRange();

    const target = store.table.getRowModel().rows[4];
    store.table.moveNgeFillTo(target.id, 'quantity');
    store.table.commitNgeFill();
    refresh(store);

    const ranges = store.tableState().ngeRange?.ranges ?? [];

    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toMatchObject({ anchorColumnId: 'name', anchorRowId: rows[8].id });
    expect(ranges[1]).toMatchObject({ anchorRowId: rows[0].id, focusRowId: rows[4].id });
  });

  // ⚠️ The block still reshapes when the proposal is empty, and that is the plan model
  // being honest: the user made the gesture. Only the VALUES are withheld, because the
  // column opted out of receiving them.
  it('still reshapes when every swept column opted out', () => {
    const { store } = createHarness({
      columns: NGE_TABLE_FIXTURE_COLUMNS.map(column =>
        column.id === 'quantity' ? { ...column, meta: { ngeFill: { enabled: false } } } : column
      ),
    });

    fillFrom(
      store,
      { columnId: 'quantity', rowIndex: 0 },
      { columnId: 'quantity', rowIndex: 1 },
      {
        columnId: 'quantity',
        rowIndex: 4,
      }
    );
    refresh(store);

    expect(store.tableState().ngeRange?.ranges[0]).toMatchObject({ focusRowId: rows[4].id });
  });
});

// Dragging the grip back INTO the block shrinks it. ⚠️ Deliberately NOT a spreadsheet's
// clear-contents: that is a change to data, and what "cleared" means belongs to a host's
// schema. Shrinking is pure interaction state, which the library already owns.
describe('ngeCellFill — retracting by dragging back in', () => {
  /** Select rows 0..5 of `quantity`, then drag the grip back to `rowIndex`. */
  function retractTo(store: Store, rowIndex: number, columnId = 'quantity'): void {
    cellAt(store, 0, 'quantity').startNgeRange();
    cellAt(store, 5, 'quantity').extendNgeRange();

    const target = store.table.getRowModel().rows[rowIndex];
    store.table.moveNgeFillTo(target.id, columnId);
    store.table.commitNgeFill();
  }

  it('shrinks the block to the cell the drag came back to', () => {
    const { store } = createHarness();

    retractTo(store, 2);
    refresh(store);

    expect(store.tableState().ngeRange?.ranges[0]).toMatchObject({
      anchorRowId: rows[0].id,
      focusRowId: rows[2].id,
    });
  });

  it('proposes nothing — a retraction is not a fill', () => {
    const { events, store } = createHarness();

    retractTo(store, 2);

    expect(fillIntents(events)).toEqual([]);
  });

  it('leaves the values alone', () => {
    const { store } = createHarness();
    const before = cellAt(store, 4, 'quantity').getValue();

    retractTo(store, 2);
    refresh(store);

    expect(cellAt(store, 4, 'quantity').getValue()).toBe(before);
  });

  it('moves the grip to the new corner', () => {
    const { store } = createHarness();

    retractTo(store, 2);
    refresh(store);

    expect(cellAt(store, 2, 'quantity').isNgeFillHandle()).toBe(true);
    expect(cellAt(store, 5, 'quantity').isNgeFillHandle()).toBe(false);
  });

  it('does nothing when the drag never left the grip’s own corner', () => {
    const { store } = createHarness();

    retractTo(store, 5);
    refresh(store);

    expect(store.tableState().ngeRange?.ranges[0]).toMatchObject({ focusRowId: rows[5].id });
  });

  // ⚠️ **The source is fixed for the whole gesture.** A drag that dips inside and then
  // continues out past the original edge fills from where the user *started*, not from
  // whatever the block momentarily looked like — which is what a live-shrinking
  // selection would have produced.
  it('still fills from the original block when the drag goes back out', () => {
    const { events, store } = createHarness();

    cellAt(store, 0, 'quantity').startNgeRange();
    cellAt(store, 1, 'quantity').extendNgeRange();

    const rowsInView = store.table.getRowModel().rows;
    store.table.moveNgeFillTo(rowsInView[0].id, 'quantity'); // dip back inside
    store.table.moveNgeFillTo(rowsInView[4].id, 'quantity'); // and back out
    store.table.commitNgeFill();

    const intent = fillIntents(events)[0];

    if (intent.kind !== 'fill-intent') {
      throw new Error('expected a fill-intent');
    }

    expect(intent.sourceRowIds).toEqual([rows[0].id, rows[1].id]);
    expect(intent.cells.map(cell => cell.rowId)).toEqual([rows[2].id, rows[3].id, rows[4].id]);
  });

  it('marks the cells about to leave, and not the ones staying', () => {
    const { store } = createHarness();

    cellAt(store, 0, 'quantity').startNgeRange();
    cellAt(store, 5, 'quantity').extendNgeRange();
    store.table.moveNgeFillTo(store.table.getRowModel().rows[2].id, 'quantity');
    refresh(store);

    expect(cellAt(store, 4, 'quantity').isNgeFillDrop()).toBe(true);
    expect(cellAt(store, 1, 'quantity').isNgeFillDrop()).toBe(false);
    // A dropped cell is not a fill target — opposite outcomes, never the same paint.
    expect(cellAt(store, 4, 'quantity').isNgeFillTarget()).toBe(false);
  });

  // Same ARCH-270 gate as the fill: no corner, so no gesture at all.
  it('does not retract a row-unbounded range', () => {
    const { store } = createHarness();

    cellAt(store, 0, 'quantity').column.startNgeColumnRange();
    store.table.moveNgeFillTo(store.table.getRowModel().rows[3].id, 'quantity');
    refresh(store);

    expect(store.table.ngeFillPlan()).toBeNull();
  });
});

describe('ngeCellFill — the fill follows the view', () => {
  // ⚠️ Filling down after a sort fills the rows the user SEES, in the order they see
  // them — not the source array's order.
  it('proposes the re-sorted rows, in view order', () => {
    const { events, store } = createHarness();

    store.setTableState(createNgeTableState({ sorting: [{ desc: true, id: 'amount' }] }));

    fillFrom(
      store,
      { columnId: 'quantity', rowIndex: 0 },
      { columnId: 'quantity', rowIndex: 1 },
      {
        columnId: 'quantity',
        rowIndex: 4,
      }
    );

    const intent = fillIntents(events)[0];

    if (intent.kind !== 'fill-intent') {
      throw new Error('expected a fill-intent');
    }

    const view = store.table.getRowModel().rows.map(row => row.id);

    expect(intent.cells.map(cell => cell.rowId)).toEqual(view.slice(2, 5));
  });

  // Recycled DOM re-derives from state, so a fill reaches rows no window has rendered.
  // The scroll itself is browser-only; this is the state half of the claim.
  it('reaches rows far outside any rendered window', () => {
    const { events, store } = createHarness();

    fillFrom(
      store,
      { columnId: 'quantity', rowIndex: 0 },
      { columnId: 'quantity', rowIndex: 1 },
      {
        columnId: 'quantity',
        rowIndex: 11,
      }
    );

    const intent = fillIntents(events)[0];

    if (intent.kind !== 'fill-intent') {
      throw new Error('expected a fill-intent');
    }

    expect(intent.cells).toHaveLength(10);
    expect(intent.cells.at(-1)?.rowId).toBe(rows[11].id);
  });
});

describe('ngeCellFill — the column opt-out', () => {
  it('never proposes a cell in a column that opted out', () => {
    const { events, store } = createHarness({
      columns: NGE_TABLE_FIXTURE_COLUMNS.map(column =>
        column.id === 'status' ? { ...column, meta: { ngeFill: { enabled: false } } } : column
      ),
    });

    fillFrom(
      store,
      { columnId: 'status', rowIndex: 0 },
      { columnId: 'quantity', rowIndex: 1 },
      {
        columnId: 'quantity',
        rowIndex: 4,
      }
    );

    const intent = fillIntents(events)[0];

    if (intent.kind !== 'fill-intent') {
      throw new Error('expected a fill-intent');
    }

    expect(intent.cells.some(cell => cell.columnId === 'status')).toBe(false);
    expect(intent.cells.some(cell => cell.columnId === 'quantity')).toBe(true);
  });
});
