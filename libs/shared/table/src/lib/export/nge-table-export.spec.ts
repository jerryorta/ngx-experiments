import type { Table, TableFeature } from '@tanstack/angular-table';

import { TestBed } from '@angular/core/testing';
import {
  createTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/angular-table';

import type { NgeTableFixtureRow } from '../../testing';
import type { NgeTableColumn } from '../nge-table-column';
import type { NgeTableConfig } from '../nge-table-config';
import type { NgeTableState } from '../nge-table-state';
import type { NgeTableExportData } from './nge-table-export';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../testing';
import { NGE_CELL_NEVER_EDITING } from '../edit';
import { NGE_TABLE_CORE_FEATURES } from '../features';
import { createNgeTableConfig } from '../nge-table-config';
import { createNgeTableState } from '../nge-table-state';
import { NGE_CELL_ALWAYS_SETTLED, NgeTableStore } from '../nge-table/store';
import { toNgeTableExportData } from './nge-table-export';

const rows = createNgeTableFixture({ rows: 12 });

const allColumnIds = ['name', 'status', 'quantity', 'amount', 'createdAt', 'isActive', 'owner'];

/**
 * A bare engine instance, with every row model this seam can read wired.
 *
 * Deliberately NOT the store's table. Sorting is all `buildTableOptions` switches
 * on today, and the acceptance criteria cover filtering and pagination too — both
 * of which sit *upstream* of the model this seam reads, so wiring them here proves
 * the export follows them the day the library does. The store's (proxied) instance
 * gets its own describe further down, where the proxy is the thing under test.
 */
function createFixtureTable(
  state: Partial<NgeTableState> = {},
  columns: NgeTableColumn<NgeTableFixtureRow>[] = NGE_TABLE_FIXTURE_COLUMNS,
  data: NgeTableFixtureRow[] = rows
): Table<NgeTableFixtureRow> {
  return createTable<NgeTableFixtureRow>({
    _features: NGE_TABLE_CORE_FEATURES as TableFeature[],
    columns,
    data,
    enablePinning: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: row => row.id,
    getSortedRowModel: getSortedRowModel(),
    onStateChange: () => undefined,
    renderFallbackValue: null,
    state: createNgeTableState(state),
  });
}

/** The exported column ids, in export order. */
function columnIdsOf(data: NgeTableExportData): string[] {
  return data.columns.map(column => column.id);
}

/** One column's formatted values, in row order. */
function formattedOf(data: NgeTableExportData, columnId: string): string[] {
  return data.rows.map(row => row.cells.find(cell => cell.columnId === columnId)?.formatted ?? '');
}

/** One column's raw values, in row order. */
function rawOf(data: NgeTableExportData, columnId: string): unknown[] {
  return data.rows.map(row => row.cells.find(cell => cell.columnId === columnId)?.raw);
}

describe('toNgeTableExportData', () => {
  it('exports every visible column of every row by default', () => {
    const data = toNgeTableExportData(createFixtureTable());

    expect(columnIdsOf(data)).toEqual(allColumnIds);
    expect(data.rows).toHaveLength(rows.length);
    expect(data.rows.every(row => row.cells.length === allColumnIds.length)).toBe(true);
    expect(data.rows.map(row => row.id)).toEqual(rows.map(row => row.id));
  });

  it('carries each column header as text', () => {
    const data = toNgeTableExportData(createFixtureTable());

    expect(data.columns.map(column => column.header)).toEqual([
      'Name',
      'Status',
      'Quantity',
      'Amount',
      'Created',
      'Active',
      'Owner',
    ]);
  });

  // A `header` may be a string, a function, or a component — the same reason
  // `NgeHeaderContext` carries no `label`. A text export still needs text.
  it('falls back to the column id when the header is not a string', () => {
    const data = toNgeTableExportData(
      createFixtureTable({}, [{ accessorKey: 'name', header: () => 'rendered', id: 'name' }])
    );

    expect(data.columns).toEqual([{ header: 'name', id: 'name' }]);
  });

  // ─── the processed row model ─────────────────────────────────────────────────
  //
  // The whole contract: what the user currently sees, never the source data.

  describe('reflects what the user currently sees', () => {
    it('follows the sort order rather than the source order', () => {
      const sorted = toNgeTableExportData(
        createFixtureTable({ sorting: [{ desc: true, id: 'amount' }] })
      );
      const amounts = rawOf(sorted, 'amount') as number[];

      expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
      expect(sorted.rows.map(row => row.id)).not.toEqual(rows.map(row => row.id));
    });

    it('drops the rows an active filter removed', () => {
      const filtered = toNgeTableExportData(
        createFixtureTable({ columnFilters: [{ id: 'status', value: 'active' }] })
      );

      expect(filtered.rows.length).toBeLessThan(rows.length);
      expect(formattedOf(filtered, 'status').every(status => status === 'active')).toBe(true);
    });

    it('follows the column order', () => {
      const reordered = toNgeTableExportData(
        createFixtureTable({ columnOrder: ['owner', 'amount', ...allColumnIds] })
      );

      expect(columnIdsOf(reordered).slice(0, 2)).toEqual(['owner', 'amount']);
      expect(reordered.rows[0].cells.slice(0, 2).map(cell => cell.columnId)).toEqual([
        'owner',
        'amount',
      ]);
    });

    it('omits a hidden column from the columns and from every row', () => {
      const hidden = toNgeTableExportData(
        createFixtureTable({ columnVisibility: { status: false } })
      );

      expect(columnIdsOf(hidden)).not.toContain('status');
      expect(hidden.rows.every(row => row.cells.length === allColumnIds.length - 1)).toBe(true);
      expect(hidden.rows.flatMap(row => row.cells).some(cell => cell.columnId === 'status')).toBe(
        false
      );
    });

    // Pinning is exactly what makes visual order diverge from declaration order,
    // and "the user's current column order" has to mean the order they can see.
    it('puts a pinned column where the user sees it, not where it was declared', () => {
      const pinned = toNgeTableExportData(
        createFixtureTable({ columnPinning: { left: ['owner'], right: ['name'] } })
      );

      expect(columnIdsOf(pinned)[0]).toBe('owner');
      expect(columnIdsOf(pinned).at(-1)).toBe('name');
      expect(pinned.rows[0].cells[0].columnId).toBe('owner');
      expect(pinned.rows[0].cells.at(-1)?.columnId).toBe('name');
    });
  });

  // ─── slices ──────────────────────────────────────────────────────────────────

  describe('the slice option', () => {
    const paged = { pagination: { pageIndex: 1, pageSize: 5 } };

    it('covers every processed row for `all`, past the page window', () => {
      const data = toNgeTableExportData(createFixtureTable(paged), { slice: 'all' });

      expect(data.rows).toHaveLength(rows.length);
    });

    it('covers only the rendered page for `page`', () => {
      const data = toNgeTableExportData(createFixtureTable(paged), { slice: 'page' });

      expect(data.rows.map(row => row.id)).toEqual(rows.slice(5, 10).map(row => row.id));
    });

    it('covers only the selected rows for `selected`', () => {
      const selected = { [rows[3].id]: true, [rows[7].id]: true };
      const data = toNgeTableExportData(createFixtureTable({ rowSelection: selected }), {
        slice: 'selected',
      });

      expect(data.rows.map(row => row.id)).toEqual([rows[3].id, rows[7].id]);
    });

    // ⚠️ The reason `selected` filters the processed rows rather than calling
    // `table.getSelectedRowModel()`: that accessor is memoised off
    // `getCoreRowModel()`, so it answers in source order and includes rows the
    // active filters removed.
    it('keeps `selected` inside the filtered, sorted rows', () => {
      const selected = Object.fromEntries(rows.map(row => [row.id, true]));
      const table = createFixtureTable({
        columnFilters: [{ id: 'status', value: 'active' }],
        rowSelection: selected,
        sorting: [{ desc: true, id: 'amount' }],
      });

      const data = toNgeTableExportData(table, { slice: 'selected' });
      const amounts = rawOf(data, 'amount') as number[];

      expect(data.rows.length).toBe(table.getPrePaginationRowModel().rows.length);
      expect(data.rows.length).toBeLessThan(rows.length);
      expect(formattedOf(data, 'status').every(status => status === 'active')).toBe(true);
      expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
    });
  });

  // ─── raw vs formatted ────────────────────────────────────────────────────────

  describe('raw and formatted', () => {
    it('differ for a date column', () => {
      const data = toNgeTableExportData(createFixtureTable());
      const cell = data.rows[0].cells.find(entry => entry.columnId === 'createdAt');

      expect(cell?.raw).toBeInstanceOf(Date);
      expect(cell?.formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(cell?.formatted).not.toBe(String(cell?.raw));
    });

    it('differ for a currency column', () => {
      const data = toNgeTableExportData(createFixtureTable());
      const cell = data.rows[0].cells.find(entry => entry.columnId === 'amount');

      expect(typeof cell?.raw).toBe('number');
      expect(cell?.formatted).toMatch(/^\$[\d,]+\.\d{2}$/);
      expect(cell?.formatted).not.toBe(String(cell?.raw));
    });

    it('agree for a column that declares no format', () => {
      const data = toNgeTableExportData(createFixtureTable());
      const cell = data.rows[0].cells.find(entry => entry.columnId === 'name');

      expect(cell?.formatted).toBe(cell?.raw);
    });

    it('reads an absent value as the empty string rather than "null"', () => {
      const data = toNgeTableExportData(
        createFixtureTable({}, [{ accessorFn: () => null, header: 'Blank', id: 'blank' }])
      );

      expect(data.rows[0].cells[0]).toEqual({ columnId: 'blank', formatted: '', raw: null });
    });
  });

  // ─── the composition seam ────────────────────────────────────────────────────
  //
  // The predicate is exercised with an ordinary inline function and no addon in
  // sight, which is the point: nothing in this seam knows what a highlight is.

  describe('the cell predicate', () => {
    it('keeps only the cells an arbitrary inline predicate accepts', () => {
      const table = createFixtureTable();
      const data = toNgeTableExportData(table, {
        cellPredicate: cell => cell.columnId === 'amount' || cell.columnId === 'name',
      });

      expect(columnIdsOf(data)).toEqual(['name', 'amount']);
      expect(data.rows).toHaveLength(rows.length);
      expect(data.rows.every(row => row.cells.length === 2)).toBe(true);
    });

    it('drops a row the predicate emptied', () => {
      const keptRowId = rows[2].id;
      const data = toNgeTableExportData(createFixtureTable(), {
        cellPredicate: cell => cell.rowId === keptRowId && cell.columnId === 'amount',
      });

      expect(data.rows).toHaveLength(1);
      expect(data.rows[0].id).toBe(keptRowId);
      expect(columnIdsOf(data)).toEqual(['amount']);
    });

    it('hands the predicate the same context a [ngeCell] template receives', () => {
      const seen: unknown[] = [];

      toNgeTableExportData(createFixtureTable(), {
        cellPredicate: cell => {
          seen.push(cell);
          return false;
        },
      });

      expect(seen[0]).toEqual({
        beginEdit: expect.any(Function),
        cancelEdit: expect.any(Function),
        columnId: 'name',
        commitEdit: expect.any(Function),
        // An export has no editor to activate either, and "nothing is being edited"
        // is its answer rather than a stand-in for one — the same reasoning that
        // makes `isSettled` the constant below.
        isEditing: NGE_CELL_NEVER_EDITING,
        // An export reads a row model, not a viewport — there is no scroll here to
        // be quiet, so the seam hands the constant rather than a live signal.
        isSettled: NGE_CELL_ALWAYS_SETTLED,
        row: rows[0],
        rowId: rows[0].id,
        rowIndex: 0,
        value: rows[0].name,
      });
    });

    it('composes with a slice', () => {
      const selected = { [rows[1].id]: true, [rows[6].id]: true };
      const data = toNgeTableExportData(createFixtureTable({ rowSelection: selected }), {
        cellPredicate: cell => cell.columnId === 'owner',
        slice: 'selected',
      });

      expect(data.rows.map(row => row.id)).toEqual([rows[1].id, rows[6].id]);
      expect(columnIdsOf(data)).toEqual(['owner']);
    });
  });

  // ─── constraints ─────────────────────────────────────────────────────────────

  it('leaves the table state untouched — export is a pure read', () => {
    const table = createFixtureTable({ sorting: [{ desc: true, id: 'amount' }] });
    const before = JSON.stringify(table.getState());

    toNgeTableExportData(table, { cellPredicate: cell => cell.columnId === 'name' });
    toNgeTableExportData(table, { slice: 'selected' });

    expect(JSON.stringify(table.getState())).toBe(before);
  });

  it('exports the 10,000-row fixture in one pass', () => {
    const large = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });
    const data = toNgeTableExportData(createFixtureTable({}, NGE_TABLE_FIXTURE_COLUMNS, large));

    expect(data.rows).toHaveLength(NGE_TABLE_FIXTURE_SIZES.large);
    expect(data.rows.at(-1)?.cells).toHaveLength(allColumnIds.length);
  });
});

// ─── the feature on the instance ───────────────────────────────────────────────

describe('the export feature on the table instance', () => {
  function createStore(): InstanceType<typeof NgeTableStore> {
    TestBed.configureTestingModule({ providers: [NgeTableStore] });

    const store = TestBed.inject(NgeTableStore);

    store.setConfig(
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: rows,
        getRowId: row => row.id,
      }) as NgeTableConfig<unknown>
    );

    return store;
  }

  it('registers through _features, so every <nge-table> instance carries it', () => {
    expect(typeof createStore().table.readNgeExportData).toBe('function');
  });

  it('reads the current state through the instance', () => {
    const store = createStore();

    store.setTableState(createNgeTableState({ sorting: [{ desc: true, id: 'amount' }] }));

    const amounts = rawOf(store.table.readNgeExportData(), 'amount') as number[];

    expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
  });

  // ⚠️ The regression the `read*` name exists to prevent. `@tanstack/angular-table`
  // proxies every `get*` accessor into a computed cached by `JSON.stringify(args)`
  // — and a function serialises to `{}`, so two different predicates would collide
  // on one key and the second caller would receive the first one's cells. A
  // non-`get` name is handed through to the raw closure instead.
  it('answers two different predicates independently', () => {
    const store = createStore();

    const names = store.table.readNgeExportData({
      cellPredicate: cell => cell.columnId === 'name',
    });
    const owners = store.table.readNgeExportData({
      cellPredicate: cell => cell.columnId === 'owner',
    });

    expect(names.columns.map(column => column.id)).toEqual(['name']);
    expect(owners.columns.map(column => column.id)).toEqual(['owner']);
  });

  it('honours the options object rather than silently dropping it', () => {
    const store = createStore();

    store.setTableState(createNgeTableState({ rowSelection: { [rows[4].id]: true } }));

    expect(store.table.readNgeExportData({ slice: 'selected' }).rows.map(row => row.id)).toEqual([
      rows[4].id,
    ]);
    expect(store.table.readNgeExportData().rows).toHaveLength(rows.length);
  });
});
