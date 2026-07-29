import type { NgeChartConfig } from '@nge/charts';

import { DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  createLineChartConfig,
  createScatterChartConfig,
  createSparklineChartConfig,
  NgeChartComponent,
} from '@nge/charts';

import type { NgeCellSelectOption } from '../../../../editors';
import type { NgeTableFixtureRow } from '../../../../testing';
import type { NgeCellPatch, NgeTableEvent } from '../../../events';
import type { NgeTableExportData } from '../../../export';
import type { NgeTableColumn } from '../../../nge-table-column';
import type { NgeTableConfig } from '../../../nge-table-config';
import type { NgeTableState } from '../../../nge-table-state';

import {
  NgeCellCheckboxComponent,
  NgeCellInputComponent,
  ngeCellSelectEdit,
  ngeCellTextareaEdit,
} from '../../../../editors';
import { NGE_TABLE_FIXTURE_COLUMNS, NGE_TABLE_FIXTURE_STATUSES } from '../../../../testing';
import { NgeCellShellComponent } from '../../../cell-shell';
import { toNgeCsvBlob } from '../../../csv';
import { createNgeTableConfig } from '../../../nge-table-config';
import {
  NgeHighlightBridge,
  NgeHighlightOverlayComponent,
  provideNgeCellHighlighting,
} from '../../../highlight';
import {
  NgeFillHandleComponent,
  NgeRangeBridge,
  NgeRangeColumnHandleComponent,
  NgeRangeOverlayComponent,
  provideNgeCellRange,
} from '../../../range';
import { NgeCellDirective, NgeTableSlotDirective } from '../../../slots';
import { NgeTableComponent } from '../../nge-table.component';

/** Gives the `series` sparkline room to draw at all (ARCH-291). Not a control — structural. */
const SHOWCASE_ROW_HEIGHT = 96;

/** The three lags the detail band's second chart plots the series against itself at. */
const SHOWCASE_LAGS: readonly number[] = [1, 2, 3];

/** Tall enough for the detail band's title plus a legible line chart (ARCH-298). */
const SHOWCASE_ROW_DETAIL_HEIGHT = 260;

/** One fixture column, found rather than re-declared — never mutated in place. */
function fixtureColumn(id: string): NgeTableColumn<NgeTableFixtureRow> {
  const found = NGE_TABLE_FIXTURE_COLUMNS.find(column => column.id === id);

  if (!found) {
    throw new Error(`nge-table showcase: no fixture column named "${id}"`);
  }

  return found;
}

const STATUS_OPTIONS: readonly NgeCellSelectOption[] = NGE_TABLE_FIXTURE_STATUSES.map(status => ({
  label: status.charAt(0).toUpperCase() + status.slice(1),
  value: status,
}));

const amountColumn = fixtureColumn('amount');

/**
 * The chart column — local to the showcase and never added to
 * `NGE_TABLE_FIXTURE_COLUMNS`, exactly as `chart-cells/usage` establishes:
 * `enableSorting: false` (ordering a `number[]` is meaningless), the export
 * seam's own formatter (the default `String(value)` comma-joins the array), and
 * `ngeFill.enabled: false` (a series is a fine fill SOURCE and a meaningless
 * fill TARGET).
 */
const SERIES_COLUMN: NgeTableColumn<NgeTableFixtureRow> = {
  accessorKey: 'series',
  enableSorting: false,
  header: 'Trend',
  id: 'series',
  meta: {
    ngeExport: { format: value => (Array.isArray(value) ? `${value.length} points` : '') },
    ngeFill: { enabled: false },
  },
  size: 200,
};

/**
 * The long-text column — a fixture ROW field (ARCH-290) deliberately absent from
 * `NGE_TABLE_FIXTURE_COLUMNS`: the frozen ARCH-289 baseline renders that array
 * wholesale, so an eighth shared column would change what it measures.
 */
const DESCRIPTION_COLUMN: NgeTableColumn<NgeTableFixtureRow> = {
  accessorKey: 'description',
  header: 'Description',
  id: 'description',
  meta: { ngeEdit: ngeCellTextareaEdit({ label: 'Edit description', rows: 3 }) },
  size: 220,
};

/**
 * Every shipped feature's column, declared over the fixture's own FIELDS rather
 * than by touching `NGE_TABLE_FIXTURE_COLUMNS` — the frozen ARCH-289 baseline
 * renders that array wholesale, so a column added there is a feature added to
 * the frozen story by the back door.
 *
 * ⚠️ `amount` MERGES its `meta` rather than replacing it: the fixture column
 * already carries `ngeExport.format`, and a bare `{ ...column, meta: {...} }`
 * would silently drop it.
 */
const SHOWCASE_COLUMNS: NgeTableColumn<NgeTableFixtureRow>[] = [
  fixtureColumn('name'),
  {
    ...fixtureColumn('status'),
    meta: { ngeEdit: ngeCellSelectEdit(STATUS_OPTIONS, { label: 'Edit status' }) },
  },
  {
    ...fixtureColumn('quantity'),
    meta: {
      ngeEdit: {
        editor: NgeCellInputComponent,
        editorInputs: { label: 'Edit quantity', type: 'number' },
        enabled: true,
      },
    },
  },
  {
    ...amountColumn,
    meta: {
      ...amountColumn.meta,
      ngeEdit: {
        editor: NgeCellInputComponent,
        editorInputs: { label: 'Edit amount', type: 'number' },
        enabled: true,
      },
    },
  },
  SERIES_COLUMN,
  DESCRIPTION_COLUMN,
  {
    ...fixtureColumn('isActive'),
    meta: {
      ngeEdit: {
        alwaysLive: true,
        editor: NgeCellCheckboxComponent,
        editorInputs: { label: 'Active' },
        enabled: true,
      },
    },
  },
  fixtureColumn('owner'),
  fixtureColumn('createdAt'),
];

/** One line of the `(ngeTableEvent)` log — the readout that makes the rest legible. */
function describeShowcaseEvent(event: NgeTableEvent<NgeTableFixtureRow>): string {
  switch (event.kind) {
    case 'cell-click':
      return `cell-click — ${event.cell.columnId}`;
    case 'column-pin':
      return `column-pin — left [${(event.columnPinning.left ?? []).join(', ')}] right [${(event.columnPinning.right ?? []).join(', ')}]`;
    case 'column-reorder':
      return `column-reorder — ${event.columnOrder.length} column(s)`;
    case 'column-resize':
      return `column-resize — ${event.columnId} → ${Math.round(event.width)}px`;
    case 'edit-intent':
      return `edit-intent — ${event.cells.length} cell(s) proposed`;
    case 'expansion-change':
      return `expansion-change — ${event.expanded === true ? 'all' : Object.keys(event.expanded).length} open`;
    case 'fill-intent':
      return `fill-intent — ${event.cells.length} cell(s) proposed`;
    case 'filter-change':
      return 'filter-change';
    case 'load-complete':
      return `load-complete — ${event.rowCount} row(s)`;
    case 'pagination-change':
      return `pagination-change — page ${event.pagination.pageIndex}`;
    case 'render-complete':
      return `render-complete — ${event.renderedRowCount}/${event.rowCount} rendered`;
    case 'row-click':
      return `row-click — ${event.row.rowId}`;
    case 'selection-change':
      return `selection-change — ${Object.keys(event.rowSelection).length} row(s)`;
    case 'sort-change':
      return event.sorting.length === 0
        ? 'sort-change — cleared'
        : `sort-change — ${event.sorting[0].id} ${event.sorting[0].desc ? 'desc' : 'asc'}`;
  }
}

/**
 * One table wearing every shipped NgeTable feature at once — the composition
 * proof ARCH-304 exists to make. Every extension axis meets here: two addons
 * (cell highlighting; cell range with its fill-handle and column-selection
 * siblings), a swappable render slot (the row-selection control), a projected
 * cell (the chart), and a row-detail band (also a chart, animating open). None
 * of it needed a core edit — this component is only the columns, the slot
 * wiring, and the host-side reaction to the two `*-intent` events.
 *
 * ⚠️ **Both addons are ALWAYS provided.** `provideNgeCellHighlighting()` and
 * `provideNgeCellRange()` are construction-time providers — an addon's
 * *presence* on a table is not a runtime toggle — so only the config-gated
 * CAPABILITIES (`enableRowSelection`, `enableVirtualization`, `enableStriping`,
 * `enableRowExpansion`, `enableColumnResizing`, `enablePinning`) are exposed as
 * `input()` signals feeding a `computed()` config. Turning one of those off
 * withdraws the capability; it never removes an addon from the table, and
 * `clearOnEscape` / `selectAllOnModifierA` are left at their defaults on both.
 *
 * ⚠️ **`rowHeight` is fixed at {@link SHOWCASE_ROW_HEIGHT}px, not a control.** It
 * is the number that gives the `series` sparkline room to draw at all
 * (ARCH-291), so it is structural to this table rather than a preference a
 * reviewer might reasonably want to turn off.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-showcase-demo',
  },
  imports: [
    NgeCellDirective,
    NgeCellShellComponent,
    NgeChartComponent,
    NgeFillHandleComponent,
    NgeHighlightOverlayComponent,
    NgeRangeColumnHandleComponent,
    NgeRangeOverlayComponent,
    NgeTableComponent,
    NgeTableSlotDirective,
  ],
  providers: [provideNgeCellHighlighting(), provideNgeCellRange()],
  selector: 'nge-table-showcase-demo',
  standalone: true,
  styleUrl: './showcase-demo-table.component.scss',
  templateUrl: './showcase-demo-table.component.html',
})
export class NgeTableShowcaseDemoComponent {
  private readonly document = inject(DOCUMENT);

  /** The addon's view-side reader — the cell-click gesture, "clear", and the export predicate. */
  private readonly highlight = inject(NgeHighlightBridge);

  /** Only reached here for its `clear()` — the range/fill/column gestures ride the projected components. */
  private readonly range = inject(NgeRangeBridge);

  // ─── The six config-gated flags — construction-time addons stay off this list ──

  readonly enableColumnResizing = input<boolean>(true);

  readonly enablePinning = input<boolean>(true);

  readonly enableRowExpansion = input<boolean>(true);

  readonly enableRowSelection = input<boolean>(true);

  readonly enableStriping = input<boolean>(true);

  readonly enableVirtualization = input<boolean>(true);

  /** How tall the scroll viewport is. Bound to `nge-table` itself, never a wrapper. */
  readonly maxHeight = input<number>(560);

  /** Whether to render the download / clear-marks control bar. */
  readonly showControls = input<boolean>(true);

  /** Whether to render the `(ngeTableEvent)` log — the readout that makes the rest legible. */
  readonly showEventLog = input<boolean>(true);

  /** The rows this table owns. A model, because a fill or an edit replaces them. */
  readonly rows = model.required<NgeTableFixtureRow[]>();

  readonly state = model.required<NgeTableState>();

  readonly config = computed<NgeTableConfig<NgeTableFixtureRow>>(() =>
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: SHOWCASE_COLUMNS,
      data: this.rows(),
      enableColumnResizing: this.enableColumnResizing(),
      enablePinning: this.enablePinning(),
      enableRowExpansion: this.enableRowExpansion(),
      enableRowSelection: this.enableRowSelection(),
      enableStriping: this.enableStriping(),
      enableVirtualization: this.enableVirtualization(),
      getRowId: row => row.id,
      rowDetailHeight: SHOWCASE_ROW_DETAIL_HEIGHT,
      rowHeight: SHOWCASE_ROW_HEIGHT,
    })
  );

  /** Every kind the table has announced, most-recent first. */
  readonly eventLog = signal<string[]>([]);

  /**
   * Whether anything is marked, for the "Clear marks" control's disabled state.
   *
   * Reads `state()` first and deliberately — both bridges hold the raw engine
   * instance and are not reactive on their own, so `state()` is what tells this
   * computed the marks may have moved.
   */
  readonly hasMarks = computed(() => {
    const current = this.state();

    return (
      (current.ngeHighlight?.cells.length ?? 0) > 0 ||
      (current.ngeHighlight?.ranges.length ?? 0) > 0 ||
      (current.ngeRange?.ranges.length ?? 0) > 0
    );
  });

  readonly statusSummary = computed(() => {
    const current = this.state();
    const selected = Object.keys(current.rowSelection).length;
    const expanded =
      current.expanded === true ? this.rows().length : Object.keys(current.expanded).length;
    const [sort] = current.sorting;

    return [
      `${selected} row(s) selected`,
      `${expanded} row(s) expanded`,
      sort ? `sorted by ${sort.id} (${sort.desc ? 'desc' : 'asc'})` : 'unsorted',
    ].join(' · ');
  });

  /**
   * Whether `shift` was down when the current `cell-click` gesture started.
   *
   * Read on `mousedown`, because `cell-click` carries a `NgeCellContext` and no
   * keyboard modifiers — it describes what happened to the table, not what the
   * pointer was doing.
   */
  private shiftHeld = false;

  /** Row → sparkline config for the `series` cell, memoised by the ROW OBJECT (never the `Cell`, never an id in a `Map`). */
  private readonly sparklineConfigs = new WeakMap<NgeTableFixtureRow, NgeChartConfig>();

  /** Row → the detail band's lag scatter, the band's second chart, memoised the same way. */
  private readonly lagConfigs = new WeakMap<NgeTableFixtureRow, NgeChartConfig>();

  /** Row → the detail band's larger trend chart, memoised the same way. */
  private readonly trendConfigs = new WeakMap<NgeTableFixtureRow, NgeChartConfig>();

  private readonly table = viewChild.required(NgeTableComponent<NgeTableFixtureRow>);

  captureModifier(event: MouseEvent): void {
    this.shiftHeld = event.shiftKey;

    // Suppress the browser's own shift-click text selection. Gated on the
    // modifier rather than applied unconditionally: an unconditional
    // `preventDefault()` would also suppress focus, breaking a click into an
    // in-cell `<input>` editor.
    if (event.shiftKey) {
      event.preventDefault();
    }
  }

  /** Puts every mark down at once — the button-driven twin of pressing `Escape`. */
  clearMarks(): void {
    this.highlight.clear();
    this.range.clear();
  }

  downloadEverything(): void {
    this.download(this.table().readNgeExportData(), 'nge-table-showcase-everything.csv');
  }

  downloadHighlighted(): void {
    this.download(
      this.table().readNgeExportData({ cellPredicate: this.highlight.predicate() }),
      'nge-table-showcase-highlighted.csv'
    );
  }

  /**
   * The whole host side of the contract. Everything the table announces passes
   * through here into the log; only a highlight-toggling `cell-click` and the
   * two `*-intent` kinds change anything.
   */
  onNgeTableEvent(event: NgeTableEvent<NgeTableFixtureRow>): void {
    this.eventLog.update(seen => [describeShowcaseEvent(event), ...seen].slice(0, 12));

    if (event.kind === 'cell-click') {
      const { columnId, rowId } = event.cell;

      if (this.shiftHeld) {
        this.highlight.extendTo(rowId, columnId);
      } else {
        this.highlight.toggle(rowId, columnId);
      }

      return;
    }

    if (event.kind === 'edit-intent' || event.kind === 'fill-intent') {
      this.applyPatches(event.cells, cell => cell.value);
    }
  }

  /** Row → sparkline config for the chart cell. */
  sparklineFor(row: NgeTableFixtureRow): NgeChartConfig {
    const cached = this.sparklineConfigs.get(row);

    if (cached) {
      return cached;
    }

    const config = createSparklineChartConfig({
      animationMs: 0,
      data: row.series.map((y, x) => ({ x, y })),
      yDomain: [0, 100],
    });

    this.sparklineConfigs.set(row, config);

    return config;
  }

  /**
   * Row → the band's second chart: the same twelve numbers plotted against
   * themselves at three lags, each point `(series[i], series[i + lag])`.
   *
   * Both axes carry the fixture's own `[0, 100]` bound on `series`, so the cloud
   * is read against a fixed square and one row stays comparable to the next.
   */
  lagFor(row: NgeTableFixtureRow): NgeChartConfig {
    const cached = this.lagConfigs.get(row);

    if (cached) {
      return cached;
    }

    const config = createScatterChartConfig({
      animationMs: 0,
      data: SHOWCASE_LAGS.flatMap(lag =>
        row.series.slice(0, -lag).map((value, index) => ({
          seriesId: `Lag ${lag}`,
          x: value,
          y: row.series[index + lag],
        }))
      ),
      legend: { enabled: true, interactive: true, position: 'bottom' },
      margin: { bottom: 45, left: 52, right: 20, top: 12 },
      pointRadius: 3,
      seriesColors: ['#1e88e5', '#7b1fa2', '#ef6c00'],
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Value at day i',
      xDomain: [0, 100],
      yAxisLabel: 'Value at day i + lag',
      yDomain: [0, 100],
    });

    this.lagConfigs.set(row, config);

    return config;
  }

  /** Row → the bigger line chart drawn in the row-detail band. */
  trendFor(row: NgeTableFixtureRow): NgeChartConfig {
    const cached = this.trendConfigs.get(row);

    if (cached) {
      return cached;
    }

    const config = createLineChartConfig({
      data: row.series.map((y, x) => ({ seriesId: 'Trend', x: `Day ${x + 1}`, y })),
      margin: { bottom: 36, left: 44, right: 16, top: 12 },
      seriesColors: ['#1e88e5'],
      showPoints: true,
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Day',
      yDomain: [0, 100],
    });

    this.trendConfigs.set(row, config);

    return config;
  }

  /** Rewrite the rows a proposal names, leaving every other row's identity untouched. */
  private applyPatches(
    cells: readonly NgeCellPatch[],
    pick: (cell: NgeCellPatch) => unknown
  ): void {
    const patches = new Map<string, Record<string, unknown>>();

    for (const cell of cells) {
      const patch = patches.get(cell.rowId) ?? {};

      patch[cell.columnId] = pick(cell);
      patches.set(cell.rowId, patch);
    }

    this.rows.update(rows =>
      rows.map(row => {
        const patch = patches.get(row.id);

        return patch ? ({ ...row, ...patch } as NgeTableFixtureRow) : row;
      })
    );
  }

  /**
   * Downloading is the host's concern, not the library's — the same call the
   * export story makes. The formatter returns a `Blob`; the object URL, the
   * anchor, the filename and the revoke are all application decisions.
   */
  private download(data: NgeTableExportData, filename: string): void {
    const url = URL.createObjectURL(toNgeCsvBlob(data));
    const link = this.document.createElement('a');

    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }
}
