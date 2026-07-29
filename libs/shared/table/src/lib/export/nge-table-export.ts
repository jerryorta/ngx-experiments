import type { Cell, Column, Row, RowData, Table } from '@tanstack/angular-table';

import type { NgeCellContext } from '../slots';

import { NGE_CELL_NO_EDIT } from '../edit';
import {
  NGE_CELL_ALWAYS_SETTLED,
  toNgeCellContext,
} from '../nge-table/store/nge-table-slot-registry';

/**
 * How a column's value is turned into text for an export.
 *
 * Declared rather than derived, and that is the whole point. A cell in this
 * library is an arbitrary Angular render target — a chart, an input, an image —
 * so there is no general way to ask a cell what it "displayed". Rendering one to
 * find out would also mean rendering ten thousand of them. So a column that wants
 * its export to read the way its cell reads says so here.
 *
 * ⚠️ **Keeping this in step with the column's cell renderer is the consumer's
 * job.** Nothing can check it: the library sees a template on one side and a
 * function on the other, and cannot compare them.
 *
 * @typeParam TRow - The shape of one row of data.
 * @typeParam TValue - The accessor's return type for this column.
 */
export interface NgeTableColumnExport<TRow, TValue> {
  /**
   * Human-facing text for one cell of this column.
   *
   * Defaults to `String(value)` (with `null` / `undefined` becoming `''`) when a
   * column supplies none, which is right for the text and number columns that
   * make up most tables and wrong for exactly the two cases worth declaring: a
   * date and a currency.
   */
  format?: (value: TValue, row: TRow) => string;
}

declare module '@tanstack/table-core' {
  /**
   * The export seam's column-level options, namespaced under `ngeExport`.
   *
   * Namespaced rather than added as bare fields because `ColumnMeta` is a single
   * globally-merged interface: every addon and every consuming domain in the
   * workspace shares it, so an unqualified `format` key would be claimed by
   * whoever declared it first.
   *
   * The augmentation targets `@tanstack/table-core` because that is the module
   * which *declares* `ColumnMeta` — the most direct target, and one of the few
   * places the core package name appears in this library. Augmenting the
   * `@tanstack/angular-table` that re-exports it would merge just as well (a
   * `export *` re-export resolves an augmentation's name through to the
   * declaration behind it), and is what an addon outside this library uses, since
   * the adapter is the workspace's declared dependency and the core only its
   * transitive one.
   */
  interface ColumnMeta<TData extends RowData, TValue> {
    ngeExport?: NgeTableColumnExport<TData, TValue>;
  }
}

/** One column in an export, in the order the user currently sees it. */
export interface NgeTableExportColumn {
  /**
   * The column's header as text.
   *
   * A `header` may be a string, a function, or a component — the same reason
   * `NgeHeaderContext` carries no `label`. Anything that is not already a string
   * falls back to the column id, because a text export needs text and the id is
   * the one thing every column is guaranteed to have.
   */
  readonly header: string;
  /** Matches `NgeTableColumn.id`, and the `columnId` on every cell below. */
  readonly id: string;
}

/**
 * One exported cell, carrying both readings of its value.
 *
 * `raw` is for a machine — a CSV column that must stay sortable, a spreadsheet
 * that wants a real number. `formatted` is for a person. Handing over both is
 * what lets one neutral shape serve every formatter without the seam knowing
 * which kind is being written.
 */
export interface NgeTableExportCell {
  readonly columnId: string;
  /** The column's {@link NgeTableColumnExport.format} applied, or `String(raw)`. */
  readonly formatted: string;
  /** Exactly what the column's accessor returned — a `Date` stays a `Date`. */
  readonly raw: unknown;
}

/** One exported row. Cells are keyed by column, never by position. */
export interface NgeTableExportRow {
  /**
   * The row's cells, in the export's column order.
   *
   * **Possibly a subset**, when a cell predicate was supplied — which is why each
   * cell carries its `columnId`. A formatter re-aligns a ragged set against
   * {@link NgeTableExportData.columns} rather than assuming index parity.
   */
  readonly cells: readonly NgeTableExportCell[];
  /** The row's engine id — `getRowId(row)` when the config supplies one, else the index. */
  readonly id: string;
}

/**
 * The neutral shape every formatter reads, and the only thing this seam produces.
 *
 * It knows nothing about CSV, XLSX, JSON, or any other format — that knowledge
 * lives in an addon, and keeping it out of here is what lets a second format be
 * added without this file changing.
 */
export interface NgeTableExportData {
  readonly columns: readonly NgeTableExportColumn[];
  readonly rows: readonly NgeTableExportRow[];
}

/**
 * Which rows an export covers.
 *
 * - `all` — every row that survived the active filters, in the current sort order.
 * - `page` — only the rows currently rendered. Identical to `all` until pagination
 *   is switched on, which is the correct degradation rather than a special case.
 * - `selected` — the selected rows, still filtered and still in sort order.
 */
export type NgeTableExportSlice = 'all' | 'page' | 'selected';

/**
 * What to export. Every field is optional; the default is every row and every
 * visible cell.
 *
 * @typeParam TRow - The shape of one row of data.
 */
export interface NgeTableExportOptions<TRow> {
  /**
   * Keep only the cells this returns `true` for.
   *
   * **The composition seam, and it is deliberately anonymous.** An addon that
   * marks cells — highlighting, validation errors, anything — supplies a predicate
   * reading its own state, and this file never learns the addon exists. It
   * receives a {@link NgeCellContext}, the same object a `[ngeCell]` template is
   * handed, rather than a TanStack `Cell`: an inline predicate must not force
   * `@tanstack/*` into a consumer's imports, and `rowId` + `columnId` is the key
   * such an addon has to store its marks under anyway, because virtualization
   * recycles DOM and an element-keyed mark survives neither a scroll nor a sort.
   *
   * Supplying one also narrows the export: a row with no surviving cell is
   * dropped, and a column with no surviving cell leaves
   * {@link NgeTableExportData.columns}.
   */
  cellPredicate?: (cell: NgeCellContext<TRow>) => boolean;
  /** Which rows to cover. Defaults to `all`. */
  slice?: NgeTableExportSlice;
}

/**
 * Read the table as neutral export data — extension axis 3 of 4.
 *
 * A **pure read over the processed row model**: post-filter, post-sort, in the
 * column order and visibility the user currently sees. Nothing here writes state,
 * and nothing here knows a single output format. That combination is the seam —
 * a formatter is then an addon over this shape, and two addons compose by both
 * talking to the table instance rather than to each other.
 *
 * Reading the *processed* model rather than `config.data` is what makes the seam
 * compose with every feature downstream of it for free: a sort reorders the rows
 * this cuts from, so the export follows without a line here knowing sorting
 * exists. Same property row virtualization relies on.
 *
 * ⚠️ **Eager, and proportional to rows × columns.** A 10,000-row export allocates
 * an object per cell in one synchronous pass. Measured cost is in
 * `docs/architecture/table.md` § The export seam; past that, the host should
 * export in chunks rather than expect this to yield.
 *
 * @typeParam TRow - The shape of one row of data.
 */
export function toNgeTableExportData<TRow>(
  table: Table<TRow>,
  options: NgeTableExportOptions<TRow> = {}
): NgeTableExportData {
  const { cellPredicate, slice = 'all' } = options;

  // Only tracked when a predicate can drop cells; `null` otherwise, so the common
  // path neither allocates a set nor filters the columns it already has.
  const survivingColumnIds = cellPredicate ? new Set<string>() : null;
  const columns = visibleColumnsInVisualOrder(table).map(toNgeTableExportColumn);
  const rows: NgeTableExportRow[] = [];

  for (const row of exportedRowsFor(table, slice)) {
    const cells: NgeTableExportCell[] = [];

    for (const cell of visibleCellsInVisualOrder(row)) {
      // Always-settled: an export reads a row model, not a viewport, so there is no
      // scroll to be quiet and every cell is visited exactly once.
      if (
        cellPredicate &&
        !cellPredicate(toNgeCellContext(cell, NGE_CELL_ALWAYS_SETTLED, NGE_CELL_NO_EDIT))
      ) {
        continue;
      }

      survivingColumnIds?.add(cell.column.id);
      cells.push(toNgeTableExportCell(cell));
    }

    // A row the predicate emptied is a row the caller did not ask for. Without a
    // predicate an empty row means the table has no visible columns, which is a
    // fact worth exporting rather than a row to drop.
    if (cellPredicate && cells.length === 0) {
      continue;
    }

    rows.push({ cells, id: row.id });
  }

  return {
    columns: survivingColumnIds
      ? columns.filter(column => survivingColumnIds.has(column.id))
      : columns,
    rows,
  };
}

/**
 * The rows one slice covers.
 *
 * `getRowModel()` is the engine's **paginated** model — `core/table.ts` defines it
 * as `getPaginationRowModel()` — so it is the rows on screen and therefore what
 * `page` means. `all` reaches one level up the chain, past the page window and no
 * further, which leaves the filters and the sort in place.
 *
 * ⚠️ `selected` filters the processed rows rather than calling
 * `table.getSelectedRowModel()`. That accessor is memoised off `getCoreRowModel()`
 * (`table-core/src/features/RowSelection.ts`), so it answers in *source* order and
 * includes rows the active filters removed — the exact opposite of what this seam
 * promises. `getFilteredSelectedRowModel()` fixes the filtering but still needs
 * the filtered row model wired, which it is not yet.
 */
function exportedRowsFor<TRow>(
  table: Table<TRow>,
  slice: NgeTableExportSlice
): readonly Row<TRow>[] {
  if (slice === 'page') {
    return table.getRowModel().rows;
  }

  const rows = table.getPrePaginationRowModel().rows;

  return slice === 'selected' ? rows.filter(row => row.getIsSelected()) : rows;
}

/** One cell, read both ways. */
function toNgeTableExportCell<TRow>(cell: Cell<TRow, unknown>): NgeTableExportCell {
  const raw = cell.getValue();
  const format = cell.column.columnDef.meta?.ngeExport?.format;

  return {
    columnId: cell.column.id,
    formatted: format ? format(raw, cell.row.original) : stringifyExportValue(raw),
    raw,
  };
}

/** One column, with its header flattened to text. */
function toNgeTableExportColumn<TRow>(column: Column<TRow, unknown>): NgeTableExportColumn {
  const { header } = column.columnDef;

  return { header: typeof header === 'string' ? header : column.id, id: column.id };
}

/**
 * The default reading of a value with no declared format.
 *
 * `null` and `undefined` become the empty string rather than the words "null" and
 * "undefined", because an absent value in a table is a blank cell and every
 * formatter would otherwise have to strip them back out.
 */
function stringifyExportValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * One row's cells in the order they are drawn, across the three lanes.
 *
 * The same composition `NgeTableStore.laneCellsFor` uses, and for the same
 * reason: pinning is exactly what makes visual order diverge from declaration
 * order, and an export claiming to reflect "the user's current column order" has
 * to mean the order they can see. The three accessors are memoised by the engine,
 * so this allocates one array per row and nothing else.
 */
function visibleCellsInVisualOrder<TRow>(row: Row<TRow>): Cell<TRow, unknown>[] {
  return [
    ...row.getLeftVisibleCells(),
    ...row.getCenterVisibleCells(),
    ...row.getRightVisibleCells(),
  ];
}

/**
 * The visible leaf columns in the order they are drawn.
 *
 * Identical composition to `NgeTableStore.columnIndexById`, which is what derives
 * `aria-colindex` — so an export's column order and what a screen reader announces
 * come from one definition of "visual order". Visibility and column order are
 * already applied by the engine; the three-lane split adds pinning.
 */
function visibleColumnsInVisualOrder<TRow>(table: Table<TRow>): Column<TRow, unknown>[] {
  return [
    ...table.getLeftVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getRightVisibleLeafColumns(),
  ];
}
