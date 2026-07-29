import type { ComponentFixture } from '@angular/core/testing';
import type { Cell } from '@tanstack/angular-table';

import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { NgeTableFixtureRow } from '../../testing';
import type { NgeTableEvent } from '../events';
import type { NgeTableConfig } from '../nge-table-config';
import type { NgeTableState } from '../nge-table-state';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../testing';
import { provideNgeTableFeatures } from '../features';
import { NgeTableComponent } from '../nge-table';
import { createNgeTableConfig } from '../nge-table-config';
import { createNgeTableState } from '../nge-table-state';
import { NgeTableStore } from '../nge-table/store';
import { NgeTableSlotDirective } from '../slots';
import { ngeCellHighlighting } from './nge-cell-highlighting';
import { NgeHighlightBridge } from './nge-highlight-bridge';
import { NgeHighlightOverlayComponent } from './nge-highlight-overlay.component';
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

/**
 * The identity the specs below assert on, stamped by the HOST template rather than
 * by the overlay.
 *
 * ⚠️ **Test-harness markup, deliberately not production DOM.** The range overlay
 * publishes an equivalent attribute of its own, but it does so because its drag
 * gesture hit-tests on one — this overlay renders nothing and needs nothing, so
 * adding a stamp to it to make a spec easier would be shipping DOM for a test's
 * benefit. A consumer's own template is exactly where such a thing belongs, and a
 * consumer template is what a spec host is.
 *
 * It is bound from the slot context, so it moves with the row: the row `@for` tracks
 * `row.id` and Angular relocates the whole subtree, which makes document order of
 * these elements the table's CURRENT view order without asking the engine anything.
 */
const SPEC_CELL_ATTRIBUTE = 'data-spec-cell';

describe('NgeHighlightOverlayComponent — in a real table', () => {
  /**
   * A consumer, in miniature — the same three moving parts
   * `stories/highlight/highlight-demo-table.component.ts` has, and nothing else.
   */
  @Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgeHighlightOverlayComponent, NgeTableComponent, NgeTableSlotDirective],
    providers: [provideNgeCellHighlighting()],
    selector: 'nge-highlight-host',
    standalone: true,
    template: `
      <div (mousedown)="captureModifier($event)">
        <nge-table
          [config]="config()"
          [state]="tableState()"
          (ngeTableEvent)="onNgeTableEvent($event)"
          (stateChange)="onStateChange($event)"
        >
          <ng-template ngeTableSlot="cell-overlay" [ngeTableSlotOf]="rows" let-cell>
            <nge-highlight-overlay
              [attr.data-spec-cell]="cell.rowId + '::' + cell.columnId"
              [cell]="cell"
              [state]="tableState()"
            />
          </ng-template>
        </nge-table>
      </div>
    `,
  })
  class HighlightHostComponent {
    private readonly bridge = inject(NgeHighlightBridge);

    /** Whether `shift` was down when the gesture started — see the demo component. */
    private shiftHeld = false;

    readonly config = input.required<NgeTableConfig<NgeTableFixtureRow>>();

    /** Type carrier for the slot context; never read at runtime. */
    readonly rows = rows;

    readonly tableState = signal(createNgeTableState());

    captureModifier(event: MouseEvent): void {
      this.shiftHeld = event.shiftKey;
    }

    onNgeTableEvent(event: NgeTableEvent<NgeTableFixtureRow>): void {
      if (event.kind !== 'cell-click') {
        return;
      }

      const { columnId, rowId } = event.cell;

      if (this.shiftHeld) {
        this.bridge.extendTo(rowId, columnId);
      } else {
        this.bridge.toggle(rowId, columnId);
      }
    }

    onStateChange(state: NgeTableState): void {
      this.tableState.set(state);
    }
  }

  async function createHost(): Promise<ComponentFixture<HighlightHostComponent>> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HighlightHostComponent] });

    const fixture = TestBed.createComponent(HighlightHostComponent);
    fixture.componentRef.setInput(
      'config',
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: rows,
        getRowId: row => row.id,
      })
    );
    fixture.detectChanges();
    await fixture.whenStable();

    return fixture;
  }

  /**
   * Every stamped overlay of one column, in the order the DOM holds them.
   *
   * ⚠️ Read from the DOM rather than from the row model on purpose. Touching
   * `store.table` is a read of the adapter's **proxy**, which re-applies options to
   * the raw instance — so a helper that consults the table between an action and an
   * assertion refreshes the very thing under test and can turn a real staleness
   * defect green. The rendered attributes are the user's own view order and owe
   * nothing to the engine.
   */
  function overlaysInColumn(
    fixture: ComponentFixture<HighlightHostComponent>,
    columnId: string
  ): Element[] {
    const overlays: Element[] = Array.from(
      (fixture.nativeElement as Element).querySelectorAll(`[${SPEC_CELL_ATTRIBUTE}]`)
    );

    return overlays.filter(overlay =>
      (overlay.getAttribute(SPEC_CELL_ATTRIBUTE) ?? '').endsWith(`::${columnId}`)
    );
  }

  function rowIdOf(overlay: Element): string {
    return (overlay.getAttribute(SPEC_CELL_ATTRIBUTE) ?? '').split('::')[0];
  }

  /** Row ids in the order the table currently shows them, taken from the DOM. */
  function viewOrderInDom(
    fixture: ComponentFixture<HighlightHostComponent>,
    columnId: string
  ): string[] {
    return overlaysInColumn(fixture, columnId).map(rowIdOf);
  }

  /** Row ids the overlay is actually PAINTING — what a user sees highlighted. */
  function paintedRowIds(
    fixture: ComponentFixture<HighlightHostComponent>,
    columnId: string
  ): string[] {
    return overlaysInColumn(fixture, columnId)
      .filter(overlay => overlay.classList.contains('nge-highlight-overlay--on'))
      .map(rowIdOf);
  }

  /** The contiguous span between two ids in a view order, either way round. */
  function spanBetween(view: string[], from: string, to: string): string[] {
    const start = view.indexOf(from);
    const end = view.indexOf(to);

    return view.slice(Math.min(start, end), Math.max(start, end) + 1);
  }

  /** The cell element enclosing one stamped overlay — what a user clicks. */
  function cellElement(
    fixture: ComponentFixture<HighlightHostComponent>,
    rowId: string,
    columnId: string
  ): Element {
    const selector = `[${SPEC_CELL_ATTRIBUTE}="${rowId}::${columnId}"]`;
    const cell = (fixture.nativeElement as Element)
      .querySelector(selector)
      ?.closest('.nge-table__cell');

    if (!cell) {
      throw new Error(`no rendered cell for ${selector}`);
    }

    return cell;
  }

  /**
   * Mark one cell exactly as a user does: `mousedown` first (which is where the
   * modifier is read), then the `click` the table turns into a `cell-click`.
   */
  function markCell(
    fixture: ComponentFixture<HighlightHostComponent>,
    rowId: string,
    columnId: string,
    shiftKey = false
  ): void {
    const cell = cellElement(fixture, rowId, columnId);

    cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, shiftKey }));
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
  }

  /** Anchor, then shift-extend — the whole block gesture. */
  function markBlock(
    fixture: ComponentFixture<HighlightHostComponent>,
    anchor: { columnId: string; rowId: string },
    focus: { columnId: string; rowId: string }
  ): void {
    markCell(fixture, anchor.rowId, anchor.columnId);
    markCell(fixture, focus.rowId, focus.columnId, true);
  }

  // The harness itself, asserted before anything is asked of it: the stamp reaches
  // every cell, and marking one paints exactly that one.
  it('stamps every rendered cell, and paints the one that is marked', async () => {
    const fixture = await createHost();

    expect(fixture.nativeElement.querySelectorAll(`[${SPEC_CELL_ATTRIBUTE}]`).length).toBe(
      rows.length * NGE_TABLE_FIXTURE_COLUMNS.length
    );

    markCell(fixture, rows[1].id, 'name');
    await fixture.whenStable();

    expect(paintedRowIds(fixture, 'name')).toEqual([rows[1].id]);
  });

  it('paints the contiguous block a shift-click extends to', async () => {
    const fixture = await createHost();

    markBlock(
      fixture,
      { columnId: 'name', rowId: rows[0].id },
      { columnId: 'name', rowId: rows[3].id }
    );
    await fixture.whenStable();

    expect(paintedRowIds(fixture, 'name')).toEqual(
      spanBetween(viewOrderInDom(fixture, 'name'), rows[0].id, rows[3].id)
    );
  });

  // ⚠️ THE CLAIM THE WHOLE STORY RESTS ON, asserted where a user actually sees it.
  //
  // Every spec above this block answers through `isNgeCellHighlighted` or through
  // the feature's cell API — both of which re-derive on every call and are genuinely
  // correct. What a user looks at is the OVERLAY's `computed`, and a computed re-runs
  // only when one of its inputs changes identity. A sort changes neither:
  //
  // - `state.ngeHighlight` is untouched by sorting, so an input bound to the slice
  //   alone holds the same object;
  // - `getSortedRowModel` REORDERS the same `Row` instances rather than rebuilding
  //   them, `getAllCells` is memoised per row, and the slot context is memoised per
  //   `Cell` — so `[cell]` holds the same object too;
  // - the row `@for` tracks `row.id` and the cell `@for` tracks `cell.id`, so Angular
  //   moves the existing DOM nodes instead of recreating them;
  // - `bridge.rowOrder()` is read inside the computed but is not a signal, so it
  //   registers no dependency.
  //
  // Everything therefore holds still while the view order moves underneath, and the
  // painted block silently becomes an enumeration of whatever was marked at click
  // time. This spec fails against a slice-shaped input and passes against the
  // state-shaped one; it asserts on painted DOM only, and never reads `store.table`
  // between the sort and the assertion.
  //
  // ⚠️ **Only the ROW axis discriminates.** `getAllLeafColumns` is memoised on
  // `[getAllColumns(), _getOrderColumnsFn()]` (`core/table.ts:499-506`) and
  // `_getOrderColumnsFn` depends on `columnOrder`, so a reorder yields new leaf
  // columns → new `Cell`s → a new context → the computed re-runs *incidentally*.
  // ARCH-269 wrote the column version of this expecting red and got green; there is
  // deliberately no column-reorder or pinning case here.
  it('re-shapes the PAINTED block when the rows are re-sorted', async () => {
    const fixture = await createHost();
    const host = fixture.componentInstance;

    markBlock(
      fixture,
      { columnId: 'name', rowId: rows[0].id },
      { columnId: 'name', rowId: rows[3].id }
    );
    await fixture.whenStable();

    const painted = paintedRowIds(fixture, 'name');
    expect(painted).toEqual(spanBetween(viewOrderInDom(fixture, 'name'), rows[0].id, rows[3].id));

    host.tableState.set({ ...host.tableState(), sorting: [{ desc: false, id: 'name' }] });
    fixture.detectChanges();
    await fixture.whenStable();

    // The endpoints follow their records; which rows lie between them follows the
    // view. A block that stayed the same four records would be an enumeration.
    const expected = spanBetween(viewOrderInDom(fixture, 'name'), rows[0].id, rows[3].id);

    // ⚠️ Self-check, so this can never pass vacuously: if a future fixture happened
    // to sort those four records into the same span, the assertion below would hold
    // for both a working overlay and a broken one.
    expect(expected).not.toEqual(painted);
    expect(paintedRowIds(fixture, 'name')).toEqual(expected);
  });

  it('keeps both endpoints painted across the sort', async () => {
    const fixture = await createHost();
    const host = fixture.componentInstance;

    markBlock(
      fixture,
      { columnId: 'name', rowId: rows[0].id },
      { columnId: 'name', rowId: rows[3].id }
    );
    await fixture.whenStable();

    host.tableState.set({ ...host.tableState(), sorting: [{ desc: false, id: 'name' }] });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(paintedRowIds(fixture, 'name')).toContain(rows[0].id);
    expect(paintedRowIds(fixture, 'name')).toContain(rows[3].id);
  });

  // The other half of the reading, and NOT a regression case: individually-picked
  // cells are enumerated by id, so they follow their records and hold still whether
  // the overlay re-derives or not. It is here to pin the contrast a user sees beside
  // a re-shaping block, not to discriminate the defect above.
  it('leaves individually-picked cells on their own records across a sort', async () => {
    const fixture = await createHost();
    const host = fixture.componentInstance;

    markCell(fixture, rows[2].id, 'name');
    markCell(fixture, rows[7].id, 'name');
    await fixture.whenStable();

    host.tableState.set({ ...host.tableState(), sorting: [{ desc: true, id: 'amount' }] });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(paintedRowIds(fixture, 'name').sort()).toEqual([rows[2].id, rows[7].id].sort());
  });
});
