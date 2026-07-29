import type { Cell, Table, TableFeature } from '@tanstack/angular-table';

import { TestBed } from '@angular/core/testing';
import {
  createTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/angular-table';

import type { NgeTableFixtureRow } from '../../testing';
import type { NgeTableExportData } from '../export';
import type { NgeTableConfig } from '../nge-table-config';
import type { NgeTableState } from '../nge-table-state';
import type { NgeCsvOptions } from './nge-csv';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_COLUMNS } from '../../testing';
import { NGE_CELL_NO_EDIT } from '../edit';
import { NGE_TABLE_CORE_FEATURES, provideNgeTableFeatures } from '../features';
import { createNgeTableConfig } from '../nge-table-config';
import { createNgeTableState } from '../nge-table-state';
import { NgeTableStore } from '../nge-table/store';
import { NGE_CELL_ALWAYS_SETTLED } from '../nge-table/store/nge-table-slot-registry';
// Importing the highlight addon HERE is not the coupling the gate forbids — it is
// the gate itself. `nge-csv.ts` imports nothing from `../highlight`, and
// `../highlight` imports nothing from here; a spec proving two independent addons
// compose is the one place that necessarily holds both.
import { ngeCellHighlighting } from '../highlight';
import { toNgeCsv, toNgeCsvBlob } from './nge-csv';

const rows = createNgeTableFixture({ rows: 12 });

const allColumnIds = ['name', 'status', 'quantity', 'amount', 'createdAt', 'isActive', 'owner'];

type Store = InstanceType<typeof NgeTableStore>;

// ─── the pure tier ───────────────────────────────────────────────────────────
//
// `toNgeCsv` is a pure function over the neutral export shape, so its unit tests
// build that shape directly. That is NOT a breach of ARCH-241's never-inline-rows
// rule, which governs table *row data*: nothing here is fed to a table. It is also
// forced — no fixture value contains a quote, a newline, or a non-ASCII character,
// and adding one would shift every draw in the fixture's single PRNG stream and
// re-baseline every story in the epic (see AGENTS.md § The shared fixture).

/** A one-column, one-row export carrying exactly `formatted`. */
function oneField(formatted: string): NgeTableExportData {
  return {
    columns: [{ header: 'Value', id: 'value' }],
    rows: [{ cells: [{ columnId: 'value', formatted, raw: formatted }], id: 'r1' }],
  };
}

/** A one-column, one-row export carrying exactly `raw`. */
function oneRawField(raw: unknown): NgeTableExportData {
  return {
    columns: [{ header: 'Value', id: 'value' }],
    rows: [{ cells: [{ columnId: 'value', formatted: 'ignored', raw }], id: 'r1' }],
  };
}

/** The single data record of a one-field CSV. */
function fieldOf(csv: string): string {
  return csv.split('\r\n')[1];
}

describe('toNgeCsv — RFC 4180 quoting', () => {
  it('leaves a field needing no quoting bare', () => {
    expect(fieldOf(toNgeCsv(oneField('plain')))).toBe('plain');
  });

  it('quotes a field containing the delimiter', () => {
    expect(fieldOf(toNgeCsv(oneField('Doe, Jane')))).toBe('"Doe, Jane"');
  });

  it('quotes a field containing a double quote, and doubles it', () => {
    expect(fieldOf(toNgeCsv(oneField('she said "hi"')))).toBe('"she said ""hi"""');
  });

  it('quotes a field containing a line feed', () => {
    expect(fieldOf(toNgeCsv(oneField('line one\nline two')))).toBe('"line one\nline two"');
  });

  it('quotes a field containing a CRLF', () => {
    const csv = toNgeCsv(oneField('line one\r\nline two'));

    expect(csv).toBe('Value\r\n"line one\r\nline two"');
  });

  // A lone CR is a record separator to classic-Mac readers, so it has to be quoted
  // even though the field contains no line feed. Testing only for `\n` is the
  // omission that lets this one through.
  it('quotes a field containing a lone carriage return', () => {
    expect(fieldOf(toNgeCsv(oneField('a\rb')))).toBe('"a\rb"');
  });

  it('passes unicode through unchanged and without quoting', () => {
    expect(fieldOf(toNgeCsv(oneField('café 東京 🎉')))).toBe('café 東京 🎉');
  });

  it('quotes a header that contains the delimiter', () => {
    const data: NgeTableExportData = {
      columns: [{ header: 'Last, First', id: 'name' }],
      rows: [],
    };

    expect(toNgeCsv(data)).toBe('"Last, First"');
  });
});

// ⚠️ The classic bug in a CSV writer: quoting against a literal comma rather than
// against the configured delimiter. It fails in both directions at once — a comma is
// needlessly quoted (harmless) and a semicolon is left bare (silently splits one
// field into two on the reader's side).
describe('toNgeCsv — the delimiter decides the quoting', () => {
  const semicolon: NgeCsvOptions = { delimiter: ';' };

  it('does not quote a comma when the delimiter is a semicolon', () => {
    expect(toNgeCsv(oneField('Doe, Jane'), semicolon).split('\r\n')[1]).toBe('Doe, Jane');
  });

  it('quotes a semicolon when the delimiter is a semicolon', () => {
    expect(toNgeCsv(oneField('a;b'), semicolon).split('\r\n')[1]).toBe('"a;b"');
  });

  it('joins fields with the configured delimiter', () => {
    const data: NgeTableExportData = {
      columns: [
        { header: 'A', id: 'a' },
        { header: 'B', id: 'b' },
      ],
      rows: [
        {
          cells: [
            { columnId: 'a', formatted: '1', raw: 1 },
            { columnId: 'b', formatted: '2', raw: 2 },
          ],
          id: 'r1',
        },
      ],
    };

    expect(toNgeCsv(data, semicolon)).toBe('A;B\r\n1;2');
  });

  it('handles a multi-character delimiter', () => {
    expect(toNgeCsv(oneField('a||b'), { delimiter: '||' }).split('\r\n')[1]).toBe('"a||b"');
  });
});

describe('toNgeCsv — document shape', () => {
  const twoRows: NgeTableExportData = {
    columns: [
      { header: 'A', id: 'a' },
      { header: 'B', id: 'b' },
    ],
    rows: [
      {
        cells: [
          { columnId: 'a', formatted: '1', raw: 1 },
          { columnId: 'b', formatted: '2', raw: 2 },
        ],
        id: 'r1',
      },
      {
        cells: [
          { columnId: 'a', formatted: '3', raw: 3 },
          { columnId: 'b', formatted: '4', raw: 4 },
        ],
        id: 'r2',
      },
    ],
  };

  it('separates records with CRLF by default, per the spec', () => {
    expect(toNgeCsv(twoRows)).toBe('A,B\r\n1,2\r\n3,4');
  });

  it('honours a custom record separator', () => {
    expect(toNgeCsv(twoRows, { newline: '\n' })).toBe('A,B\n1,2\n3,4');
  });

  // A trailing separator reads as an empty final record to a strict parser, and a
  // caller who wants one adds it with a single concatenation.
  it('does not terminate the last record', () => {
    expect(toNgeCsv(twoRows).endsWith('3,4')).toBe(true);
  });

  it('omits the header row when asked', () => {
    expect(toNgeCsv(twoRows, { header: false })).toBe('1,2\r\n3,4');
  });

  it('writes the header alone when there are no rows', () => {
    expect(toNgeCsv({ columns: twoRows.columns, rows: [] })).toBe('A,B');
  });

  it('writes nothing at all for no rows and no header', () => {
    expect(toNgeCsv({ columns: twoRows.columns, rows: [] }, { header: false })).toBe('');
  });
});

// ⚠️ Excel on Windows reads a UTF-8 file as the ambient code page without a BOM, so
// every non-ASCII character arrives mojibake. It is off by default because a BOM in
// a *string* is a surprise — it is a file-level concern.
describe('toNgeCsv — the byte-order mark', () => {
  it('is absent by default', () => {
    expect(toNgeCsv(oneField('café')).startsWith('﻿')).toBe(false);
  });

  it('is prepended exactly once when asked', () => {
    const csv = toNgeCsv(oneField('café'), { byteOrderMark: true });

    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.split('﻿')).toHaveLength(2);
  });
});

describe('toNgeCsv — the formatted / raw toggle', () => {
  const both: NgeTableExportData = {
    columns: [{ header: 'Amount', id: 'amount' }],
    rows: [{ cells: [{ columnId: 'amount', formatted: '$1,234.50', raw: 1234.5 }], id: 'r1' }],
  };

  it('writes the human reading by default, quoted because it carries a comma', () => {
    expect(toNgeCsv(both)).toBe('Amount\r\n"$1,234.50"');
  });

  it('writes the machine reading on request, bare and still a number', () => {
    expect(toNgeCsv(both, { values: 'raw' })).toBe('Amount\r\n1234.5');
  });

  it('writes a raw Date as ISO rather than the locale string', () => {
    const value = new Date(Date.UTC(2026, 0, 15, 8, 30));

    expect(fieldOf(toNgeCsv(oneRawField(value), { values: 'raw' }))).toBe(
      '2026-01-15T08:30:00.000Z'
    );
  });

  it('writes a raw object as JSON rather than [object Object]', () => {
    expect(fieldOf(toNgeCsv(oneRawField({ id: 'o1' }), { values: 'raw' }))).toBe(
      '"{""id"":""o1""}"'
    );
  });

  it.each([
    ['null', null, ''],
    ['undefined', undefined, ''],
    ['a boolean', false, 'false'],
    ['a number', 42, '42'],
    ['a string', 'text', 'text'],
  ])('writes a raw %s as %p', (_label, raw, expected) => {
    expect(fieldOf(toNgeCsv(oneRawField(raw), { values: 'raw' }))).toBe(expected);
  });
});

// Excel and Sheets evaluate a field beginning `=`, `+`, `-`, `@`, a tab or a CR as a
// formula on open, so an exported cell becomes code execution in the reader's
// spreadsheet. The mitigation alters the user's data, which is why it is opt-in.
describe('toNgeCsv — formula-injection escaping', () => {
  const escaping: NgeCsvOptions = { escapeFormulas: true };

  it('writes a formula through unchanged by default', () => {
    expect(fieldOf(toNgeCsv(oneField('=SUM(A1:A2)')))).toBe('=SUM(A1:A2)');
  });

  it.each([
    ['an equals sign', '=SUM(A1:A2)', "'=SUM(A1:A2)"],
    ['a plus sign', '+SUM(A1:A2)', "'+SUM(A1:A2)"],
    ['a minus sign', '-2+3+cmd|/C', "'-2+3+cmd|/C"],
    ['an at sign', '@SUM(A1:A2)', "'@SUM(A1:A2)"],
    ['a tab', '\t=SUM(A1:A2)', "'\t=SUM(A1:A2)"],
  ])('prefixes a field beginning with %s', (_label, input, expected) => {
    expect(fieldOf(toNgeCsv(oneField(input), escaping))).toBe(expected);
  });

  // A lone CR is also a record separator, so this field is quoted as well — the two
  // passes stacking is the point, and the `'` sits inside the quotes.
  it('prefixes and quotes a field beginning with a carriage return', () => {
    expect(fieldOf(toNgeCsv(oneField('\r=SUM(A1:A2)'), escaping))).toBe('"\'\r=SUM(A1:A2)"');
  });

  it('leaves a benign field untouched', () => {
    expect(fieldOf(toNgeCsv(oneField('plain'), escaping))).toBe('plain');
    expect(fieldOf(toNgeCsv(oneField('café 東京 🎉'), escaping))).toBe('café 東京 🎉');
  });

  it('escapes a dangerous header, because a column set can be data-derived', () => {
    const data: NgeTableExportData = {
      columns: [{ header: '=cmd', id: 'a' }],
      rows: [],
    };

    expect(toNgeCsv(data, escaping)).toBe("'=cmd");
  });

  // ⚠️ THE false positive. Testing the prefix alone is the obvious implementation and
  // it mangles every negative number in the document — not a security fix but a
  // corrupted column, and silent because the file still opens.
  describe('the negative-number false positive', () => {
    it.each([
      ['a negative integer', '-1234'],
      ['a negative decimal', '-1234.5'],
      ['an explicitly signed positive', '+42'],
      ['a negative in exponent notation', '-1.5e-9'],
    ])('leaves %s bare', (_label, input) => {
      expect(fieldOf(toNgeCsv(oneField(input), escaping))).toBe(input);
    });

    it('leaves a raw negative number bare', () => {
      expect(fieldOf(toNgeCsv(oneRawField(-1234.5), { ...escaping, values: 'raw' }))).toBe(
        '-1234.5'
      );
    });

    // The cost of the guard being numeric rather than path-based, asserted rather
    // than discovered: a FORMATTED negative currency is not a plain number, so it is
    // escaped. Acceptable — it was already text a spreadsheet could not sum.
    it('escapes a formatted negative currency — the flag paying its visible cost', () => {
      expect(fieldOf(toNgeCsv(oneField('-$1,234.50'), escaping))).toBe('"\'-$1,234.50"');
    });
  });

  // A `raw` reading is not automatically safe: only a raw NUMBER is, and it is the
  // numeric guard that makes it so rather than the path it came down.
  it('escapes a dangerous raw string just as it does a formatted one', () => {
    expect(fieldOf(toNgeCsv(oneRawField('=SUM(A1:A2)'), { ...escaping, values: 'raw' }))).toBe(
      "'=SUM(A1:A2)"
    );
  });

  it('puts the prefix inside the quotes when the field also needs quoting', () => {
    expect(fieldOf(toNgeCsv(oneField('=SUM(A1,A2)'), escaping))).toBe('"\'=SUM(A1,A2)"');
  });

  // ⚠️ Stated outright rather than left for a later reader to discover: escaping is a
  // change to the user's data, and an escaped field is no longer byte-identical to
  // what the table held. That is the whole reason the flag defaults to off.
  it('costs the round trip — an escaped field no longer matches its input', () => {
    const input = '=SUM(A1:A2)';
    const escaped = fieldOf(toNgeCsv(oneField(input), escaping));

    expect(escaped).not.toBe(input);
    expect(escaped).toBe(`'${input}`);
    expect(fieldOf(toNgeCsv(oneField(input)))).toBe(input);
  });
});

// The neutral shape is deliberately ragged once a cell predicate narrows it — a row
// carries only its surviving cells. Re-aligning against `data.columns` is what makes
// a highlighted-cell export come out rectangular with no bookkeeping in the
// formatter, and it is why every cell carries its `columnId`.
describe('toNgeCsv — re-aligning a ragged export', () => {
  const ragged: NgeTableExportData = {
    columns: [
      { header: 'A', id: 'a' },
      { header: 'B', id: 'b' },
      { header: 'C', id: 'c' },
    ],
    rows: [
      { cells: [{ columnId: 'b', formatted: 'b1', raw: 'b1' }], id: 'r1' },
      {
        cells: [
          { columnId: 'a', formatted: 'a2', raw: 'a2' },
          { columnId: 'c', formatted: 'c2', raw: 'c2' },
        ],
        id: 'r2',
      },
    ],
  };

  it('writes an empty field wherever a row has no cell for a column', () => {
    expect(toNgeCsv(ragged)).toBe('A,B,C\r\n,b1,\r\na2,,c2');
  });

  // Cells are looked up by column, never consumed positionally — so a cell for a
  // column the export dropped has nowhere to land and is not written.
  it('ignores a cell whose column is not in the export', () => {
    const stray: NgeTableExportData = {
      columns: [{ header: 'A', id: 'a' }],
      rows: [
        {
          cells: [
            { columnId: 'a', formatted: 'a1', raw: 'a1' },
            { columnId: 'gone', formatted: 'x', raw: 'x' },
          ],
          id: 'r1',
        },
      ],
    };

    expect(toNgeCsv(stray)).toBe('A\r\na1');
  });
});

describe('toNgeCsvBlob', () => {
  it('carries the CSV media type and encoding', () => {
    expect(toNgeCsvBlob(oneField('a')).type).toBe('text/csv;charset=utf-8');
  });

  it('passes its options through to the text', () => {
    const plain = toNgeCsvBlob(oneField('café'));
    const marked = toNgeCsvBlob(oneField('café'), { byteOrderMark: true });

    // U+FEFF is three bytes in UTF-8.
    expect(marked.size).toBe(plain.size + 3);
  });
});

// ─── the integration tier ────────────────────────────────────────────────────

/**
 * A bare engine instance with every row model this seam can read wired.
 *
 * The same shape as `export/nge-table-export.spec.ts`, and for the same reason:
 * sorting is all `buildTableOptions` switches on today, but the acceptance criteria
 * cover filtering and pagination too, and both sit *upstream* of the model the
 * export reads — so wiring them here proves the CSV follows them the day the library
 * does.
 */
function createFixtureTable(state: Partial<NgeTableState> = {}): Table<NgeTableFixtureRow> {
  return createTable<NgeTableFixtureRow>({
    _features: NGE_TABLE_CORE_FEATURES as TableFeature[],
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
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

/** Every record of the CSV, header included. */
function recordsOf(csv: string): string[] {
  return csv.split('\r\n');
}

/**
 * One column's data records, isolated with a cell predicate.
 *
 * Narrowing to a single column is what makes a per-column assertion safe: a naive
 * split on the delimiter would tear the currency column apart, since its formatted
 * reading legitimately contains a comma.
 */
function columnRecordsOf(
  table: Table<NgeTableFixtureRow>,
  columnId: string,
  options?: NgeCsvOptions
): string[] {
  const data = table.readNgeExportData({ cellPredicate: cell => cell.columnId === columnId });

  return recordsOf(toNgeCsv(data, options)).slice(1);
}

describe('toNgeCsv over a real table', () => {
  it('writes the visible column headers as the first record', () => {
    const csv = toNgeCsv(createFixtureTable().readNgeExportData());

    expect(recordsOf(csv)[0]).toBe('Name,Status,Quantity,Amount,Created,Active,Owner');
  });

  it('writes one record per processed row', () => {
    const csv = toNgeCsv(createFixtureTable().readNgeExportData());

    expect(recordsOf(csv)).toHaveLength(rows.length + 1);
  });

  // The toggle earning its place: the same column is a human string one way and a
  // bare number the other, and only the second is still summable in a spreadsheet.
  //
  // ⚠️ Quoting is CONDITIONAL, and asserting otherwise is the trap. The fixture
  // spans $0–$2,500, so `$1,802.44` needs quotes and `$127.80` does not — a spec
  // expecting every currency record to be quoted passes only by luck of the seed.
  it('quotes the currency column under `formatted` exactly where the value needs it', () => {
    const formatted = columnRecordsOf(createFixtureTable(), 'amount');

    expect(rows.some(row => row.amount >= 1000)).toBe(true);
    expect(rows.some(row => row.amount < 1000)).toBe(true);

    rows.forEach((row, index) => {
      expect(formatted[index].startsWith('"')).toBe(row.amount >= 1000);
    });

    expect(formatted.filter(record => record.startsWith('"'))).toEqual(
      expect.arrayContaining([expect.stringMatching(/^"\$[\d,]+\.\d{2}"$/)])
    );
  });

  it('leaves the currency column bare and still numeric under `raw`', () => {
    expect(columnRecordsOf(createFixtureTable(), 'amount', { values: 'raw' })).toEqual(
      rows.map(row => String(row.amount))
    );
  });

  it('writes the date column as the column format, or as ISO under `raw`', () => {
    const table = createFixtureTable();

    expect(columnRecordsOf(table, 'createdAt')[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(columnRecordsOf(table, 'createdAt', { values: 'raw' })[0]).toBe(
      rows[0].createdAt.toISOString()
    );
  });

  // The reassuring half of the escaping flag: no fixture value is formula-shaped, so
  // turning it on over ordinary data changes nothing at all. A host can adopt it
  // without auditing its columns — the cost lands only on fields that earn it.
  it('changes nothing over the fixture when escaping is on', () => {
    const data = createFixtureTable().readNgeExportData();

    expect(toNgeCsv(data, { escapeFormulas: true })).toBe(toNgeCsv(data));
    expect(toNgeCsv(data, { escapeFormulas: true, values: 'raw' })).toBe(
      toNgeCsv(data, { values: 'raw' })
    );
  });
});

// Inherited from ARCH-248 and re-asserted here, because "the CSV reflects what the
// user currently sees" is a property of the pair rather than of either half.
describe('toNgeCsv reflects what the user currently sees', () => {
  it('follows the sort order rather than the source order', () => {
    const table = createFixtureTable({ sorting: [{ desc: true, id: 'amount' }] });
    const amounts = columnRecordsOf(table, 'amount', { values: 'raw' }).map(Number);

    expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
    expect(amounts).not.toEqual(rows.map(row => row.amount));
  });

  it('drops the rows an active filter removed', () => {
    const table = createFixtureTable({ columnFilters: [{ id: 'status', value: 'active' }] });
    const statuses = columnRecordsOf(table, 'status');

    expect(statuses.length).toBeLessThan(rows.length);
    expect(statuses.every(status => status === 'active')).toBe(true);
  });

  it('follows the column order', () => {
    const table = createFixtureTable({ columnOrder: ['owner', 'name', ...allColumnIds] });
    const csv = toNgeCsv(table.readNgeExportData());

    expect(recordsOf(csv)[0]).toBe('Owner,Name,Status,Quantity,Amount,Created,Active');
  });

  it('omits a hidden column from the header and from every record', () => {
    const table = createFixtureTable({ columnVisibility: { quantity: false } });
    const csv = toNgeCsv(table.readNgeExportData());

    expect(recordsOf(csv)[0]).toBe('Name,Status,Amount,Created,Active,Owner');
    // Precise rather than counting fields on a data record — the currency column is
    // quoted for some rows and not others, so a naive split has no fixed length.
    expect(
      table.readNgeExportData({ cellPredicate: cell => cell.columnId === 'quantity' }).rows
    ).toHaveLength(0);
  });

  it('puts a pinned column where the user sees it, not where it was declared', () => {
    const table = createFixtureTable({ columnPinning: { left: ['owner'], right: [] } });
    const csv = toNgeCsv(table.readNgeExportData());

    expect(recordsOf(csv)[0]).toBe('Owner,Name,Status,Quantity,Amount,Created,Active');
  });
});

// ─── THE GATE ────────────────────────────────────────────────────────────────
//
// Three pieces, none of which imports another: the highlight addon (ARCH-250)
// supplies a `NgeCellContext → boolean`, the export seam (ARCH-248) consumes it,
// and the CSV formatter (this story) reads the result. They meet on the table
// instance and nowhere else.

/** A store with BOTH addons reachable, registered the way a consumer registers them. */
function createStore(): Store {
  TestBed.configureTestingModule({
    providers: [NgeTableStore, provideNgeTableFeatures(ngeCellHighlighting)],
  });

  const store = TestBed.inject(NgeTableStore);

  store.setConfig(
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: rows,
      // ⚠️ Not optional once anything marks a cell — without it the engine keys rows
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

/** The CSV of whatever is currently highlighted. The whole composition, in one line. */
function highlightedCsv(store: Store, options?: NgeCsvOptions): string {
  return toNgeCsv(
    store.table.readNgeExportData({ cellPredicate: store.table.ngeHighlightPredicate() }),
    options
  );
}

describe('highlighted-cell CSV export — the extensibility gate', () => {
  it('writes only the highlighted cells', () => {
    const store = createStore();

    cellAt(store, 0, 'name').toggleNgeHighlight();
    cellAt(store, 2, 'name').toggleNgeHighlight();

    expect(recordsOf(highlightedCsv(store))).toEqual(['Name', rows[0].name, rows[2].name]);
  });

  it('narrows the header to the columns that survived', () => {
    const store = createStore();

    cellAt(store, 1, 'owner').toggleNgeHighlight();
    cellAt(store, 1, 'status').toggleNgeHighlight();

    expect(recordsOf(highlightedCsv(store))[0]).toBe('Status,Owner');
  });

  it('re-aligns a ragged block, leaving an empty field where a row was not marked', () => {
    const store = createStore();

    cellAt(store, 0, 'name').toggleNgeHighlight();
    cellAt(store, 1, 'owner').toggleNgeHighlight();

    expect(recordsOf(highlightedCsv(store))).toEqual([
      'Name,Owner',
      `${rows[0].name},`,
      `,${rows[1].owner.name}`,
    ]);
  });

  it('carries the formatted / raw toggle through the composition', () => {
    const store = createStore();
    // A four-figure row deliberately, so the formatted reading carries a thousands
    // comma and has to be quoted while the raw one stays a bare number.
    const index = rows.findIndex(row => row.amount >= 1000);

    cellAt(store, index, 'amount').toggleNgeHighlight();

    expect(recordsOf(highlightedCsv(store))[1]).toMatch(/^"\$[\d,]+\.\d{2}"$/);
    expect(recordsOf(highlightedCsv(store, { values: 'raw' }))[1]).toBe(String(rows[index].amount));
  });

  it('writes the header alone when nothing is highlighted', () => {
    expect(highlightedCsv(createStore())).toBe('');
  });

  // ⚠️ EXACTLY the case ARCH-248 renamed `getNgeExportData` to avoid. The Angular
  // adapter proxies every `get*` accessor into a computed cached by
  // `JSON.stringify(args)`, and a function serialises to `{}` — so a predicated read
  // followed by an unpredicated one would have returned the first call's cells.
  it('answers an unpredicated export correctly right after a predicated one', () => {
    const store = createStore();

    cellAt(store, 0, 'name').toggleNgeHighlight();

    expect(recordsOf(highlightedCsv(store))).toHaveLength(2);

    const everything = toNgeCsv(store.table.readNgeExportData());

    expect(recordsOf(everything)).toHaveLength(rows.length + 1);
    expect(recordsOf(everything)[0]).toBe('Name,Status,Quantity,Amount,Created,Active,Owner');
  });

  // Neither addon knows the other exists, and this is what that claim means in
  // practice: the predicate is an anonymous `NgeCellContext → boolean` on one side
  // and an anonymous option on the other.
  it('composes through a predicate neither addon named', () => {
    const store = createStore();

    cellAt(store, 3, 'quantity').toggleNgeHighlight();

    const predicate = store.table.ngeHighlightPredicate();

    expect(
      predicate({
        columnId: 'quantity',
        ...NGE_CELL_NO_EDIT.forCell('', ''),
        isSettled: NGE_CELL_ALWAYS_SETTLED,
        row: rows[3],
        rowId: rows[3].id,
        rowIndex: 3,
        value: rows[3].quantity,
      })
    ).toBe(true);
    expect(
      predicate({
        columnId: 'name',
        ...NGE_CELL_NO_EDIT.forCell('', ''),
        isSettled: NGE_CELL_ALWAYS_SETTLED,
        row: rows[3],
        rowId: rows[3].id,
        rowIndex: 3,
        value: rows[3].name,
      })
    ).toBe(false);
  });
});
