import type { Table, TableFeature } from '@tanstack/angular-table';

import {
  createTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
} from '@tanstack/angular-table';

import type { NgeTableFixtureRow } from '../testing';
import type { NgeTableColumn } from './nge-table-column';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_COLUMNS } from '../testing';
import { toNgeCsv } from './csv';
import { toNgeTableExportData } from './export';
import { NGE_TABLE_CORE_FEATURES } from './features';
import { createNgeTableState } from './nge-table-state';
import { ngeFillSeries } from './range';

/**
 * What an array-valued accessor forces (ARCH-291).
 *
 * A cell is an arbitrary Angular render target, so a column can return anything —
 * and the chart column ARCH-291 introduces returns the fixture's `series`, a
 * `readonly number[]`. Every seam that reads a *value* rather than rendering one
 * then has to have an answer, and these are the three, pinned.
 *
 * ⚠️ **They are per-column answers, not library rules.** A consumer whose chart
 * transform reads three scalar fields instead faces none of them. What is being
 * fixed here is that each seam behaves predictably and none of them throws — the
 * column author then decides which of the three opt-outs to take.
 *
 * The column is declared here rather than imported from the shared fixture on
 * purpose: `NGE_TABLE_FIXTURE_COLUMNS` is still exactly its seven columns, and the
 * frozen ARCH-289 baseline story renders that array wholesale, so a chart column
 * added there would change the epic's reference measurement by the back door.
 */
const rows = createNgeTableFixture({ rows: 6 });

/** The bare array column — no export format, no opt-outs. The default path. */
const seriesColumn: NgeTableColumn<NgeTableFixtureRow> = {
  accessorKey: 'series',
  header: 'Series',
  id: 'series',
};

function createArrayColumnTable(
  column: NgeTableColumn<NgeTableFixtureRow> = seriesColumn
): Table<NgeTableFixtureRow> {
  return createTable<NgeTableFixtureRow>({
    _features: NGE_TABLE_CORE_FEATURES as TableFeature[],
    columns: [...NGE_TABLE_FIXTURE_COLUMNS, column],
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: row => row.id,
    getSortedRowModel: getSortedRowModel(),
    onStateChange: () => undefined,
    renderFallbackValue: null,
    state: createNgeTableState(),
  });
}

function seriesCell(table: Table<NgeTableFixtureRow>): { formatted: string; raw: unknown } {
  const data = toNgeTableExportData(table);
  const cell = data.rows[0].cells.find(entry => entry.columnId === 'series');

  return { formatted: cell?.formatted ?? '', raw: cell?.raw };
}

describe('an array-valued column — export', () => {
  // `raw` is the accessor's return, untouched. The export seam is format-agnostic
  // by design (ARCH-248), so a consumer writing JSON gets the array itself rather
  // than someone else's idea of how to flatten it.
  it('carries the array through as raw', () => {
    expect(seriesCell(createArrayColumnTable()).raw).toEqual(rows[0].series);
  });

  // The default formatter is `String(value)`, and `String([1,2,3])` is "1,2,3" —
  // which is legible, lossless enough to re-parse, and above all not a throw.
  it('falls back to String(value), which comma-joins the array', () => {
    const { formatted } = seriesCell(createArrayColumnTable());

    expect(formatted).toBe(String(rows[0].series));
    expect(formatted).toContain(',');
  });

  // ⚠️ The formatted text contains the CSV delimiter, so the writer MUST quote it.
  // Unquoted, one column would silently become twelve on the reader's side — the
  // failure mode that looks like a working export until someone opens the file.
  it('is quoted by the CSV writer, because it contains the delimiter', () => {
    const csv = toNgeCsv(toNgeTableExportData(createArrayColumnTable()));
    const firstRecord = csv.split('\r\n')[1];

    expect(firstRecord).toContain(`"${String(rows[0].series)}"`);
  });

  // The opt-out a column author takes when "1,2,3" is not what belongs in the file.
  it('honours meta.ngeExport.format when the column declares one', () => {
    const table = createArrayColumnTable({
      ...seriesColumn,
      meta: {
        ngeExport: {
          format: value => (Array.isArray(value) ? `${value.length} points` : ''),
        },
      },
    });

    expect(seriesCell(table).formatted).toBe('12 points');
  });
});

describe('an array-valued column — sorting', () => {
  // Sorting a `number[]` is meaningless — the engine would compare array
  // references or their string forms, and neither answers a question a user
  // asked. `enableSorting: false` is the column's answer; the alternative is a
  // scalar aggregate column beside it.
  it('is not sortable when the column opts out', () => {
    const table = createArrayColumnTable({ ...seriesColumn, enableSorting: false });

    expect(table.getColumn('series')?.getCanSort()).toBe(false);
  });

  // Stated so the opt-out above reads as a decision rather than a default: nothing
  // in the library infers "this value cannot be ordered" from its type.
  it('is sortable by default, so opting out is a decision the column has to make', () => {
    expect(createArrayColumnTable().getColumn('series')?.getCanSort()).toBe(true);
  });
});

describe('an array-valued column — fill', () => {
  // The fill infers copy-vs-series from finite numbers, so an array fails that
  // test by construction (`source.every(isFiniteNumber)`) and falls to the copy
  // path. What matters is that it degrades rather than throws.
  it('falls to the copy path rather than extrapolating', () => {
    const source = [rows[0].series, rows[1].series];

    expect(() => ngeFillSeries(source, 4, false)).not.toThrow();
    expect(ngeFillSeries(source, 4, false)).toEqual([
      rows[0].series,
      rows[1].series,
      rows[0].series,
      rows[1].series,
    ]);
  });

  // A single array source repeats, exactly as a single string would.
  it('repeats a lone array value', () => {
    expect(ngeFillSeries([rows[0].series], 3, false)).toEqual([
      rows[0].series,
      rows[0].series,
      rows[0].series,
    ]);
  });

  // The opt-out for a column whose values nothing should propose overwriting. It
  // excludes the column as a fill TARGET while leaving it usable as a source.
  it('can be excluded as a target with meta.ngeFill.enabled', () => {
    const table = createArrayColumnTable({
      ...seriesColumn,
      meta: { ngeFill: { enabled: false } },
    });

    expect(table.getColumn('series')?.columnDef.meta?.ngeFill?.enabled).toBe(false);
  });
});
