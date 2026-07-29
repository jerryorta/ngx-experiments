import { ChangeDetectionStrategy, Component, computed, inject, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NgeDatePickerComponent } from '@nge/calendar';

import type { NgeChartConfig } from '@nge/charts';

import { createSparklineChartConfig, NgeChartComponent } from '@nge/charts';

import {
  LdgAmountInputComponent,
  LdgCategoryChipComponent,
  LdgEmptyStateComponent,
  LdgHeaderBarComponent,
  LdgIconButtonComponent,
  LdgPageContentComponent,
} from '@nge/ledger-design-library';

import type { Transaction } from '@nge/ledger-models';

import { LedgerFacade } from '@nge/ledger-store';

import type { NgeTableColumn, NgeTableConfig, NgeTableEvent } from '@nge/table';

import { createNgeTableConfig, NgeCellDirective, NgeCellShellComponent, NgeTableComponent } from '@nge/table';

import { formatMoney } from '@nge/ledger-utils';

import type { DlcSortFieldOption, DlcSortSelection } from '@nge/ui-design-library';

import {
  DlcButtonComponent,
  DlcDialogComponent,
  DlcDrawerComponent,
  DlcFilterPopoverComponent,
  DlcInputComponent,
  DlcSearchInputComponent,
  DlcSelectComponent,
  DlcSortControlComponent,
} from '@nge/ui-design-library';

import { type TransactionSortField, TransactionsStore } from './transactions.store';

/**
 * Tall enough for a sparkline to read as a shape rather than a smudge.
 *
 * Load-bearing rather than cosmetic while `enableVirtualization` is on: a windowed
 * row is *positioned* at `index × rowHeight`, not laid out, so this number is what
 * the scroll arithmetic runs on. It is also what gives the chart cell its room —
 * `<nge-chart>` is `height: 100%` and resolves against the cell's definite height,
 * so at the library's 40px default the trend would simply be squeezed.
 */
const ROW_HEIGHT_PX = 72;

/**
 * The table's columns, built against the trend windows the sparkline column reads.
 *
 * A factory rather than a module constant because `trend`'s accessor closes over
 * that map — it is rebuilt only when the underlying ledger changes, never per
 * filter keystroke, so the column identities stay stable across the table's real
 * churn.
 *
 * `date` / `merchant` / `categoryId` / `amountCents` carry `accessorKey`s even
 * though each is drawn by a projected `[ngeCell]` template: the accessor is what
 * the export seam and any future sort read, and a display column would leave both
 * with nothing to work from.
 */
function buildColumns(trend: Map<string, number[]>): NgeTableColumn<Transaction>[] {
  // ⚠️ Every width is a fixed pixel size, because that is what this table is: the
  // lanes are flexbox with no intrinsic sizing, so a column is as wide as it says
  // and never negotiates with its neighbours (the trade that buys drag-to-resize).
  // The total is kept near a laptop's content width rather than a desktop's —
  // trailing space on a wide monitor reads better than a horizontal scrollbar on a
  // small one, and the row's own background paints edge to edge either way.
  return [
    { accessorKey: 'date', header: 'Date', id: 'date', size: 130 },
    { accessorKey: 'merchant', header: 'Merchant', id: 'merchant', size: 320 },
    { accessorKey: 'categoryId', header: 'Category', id: 'categoryId', size: 190 },
    {
      accessorFn: row => trend.get(row.id) ?? [],
      // Ordering a `number[]` is meaningless, so the column opts out on its own
      // merits rather than relying on the table-level flag below — the answer
      // stays right if that flag is ever flipped.
      enableSorting: false,
      header: 'Category trend',
      id: 'trend',
      // The export seam's default formatter is `String(value)`, which comma-joins
      // an array — legible, but not what belongs in an exported file.
      meta: {
        ngeExport: {
          format: value => (Array.isArray(value) ? `${value.length} points` : ''),
        },
      },
      size: 260,
    },
    { accessorKey: 'amountCents', header: 'Amount', id: 'amountCents', size: 170 },
  ];
}

/**
 * `dlc-sort-control`'s field union is hardcoded to real-estate dimensions
 * (`DlcSortField = 'baths' | 'beds' | 'lot' | 'price' | 'sqft' | 'year'`) —
 * not generic over the consumer's own fields. Cast the constant once here
 * rather than sprinkling `$any()` through the template; `onSortChange` casts
 * the emitted field back. Worth promoting: make `DlcSortField` /
 * `DlcSortFieldOption` / `DlcSortSelection` generic over the field union.
 */
const SORT_FIELD_OPTIONS = [
  { field: 'date', label: 'Date' },
  { field: 'merchant', label: 'Merchant' },
  { field: 'amount', label: 'Amount' },
] as unknown as DlcSortFieldOption[];

/**
 * The Transactions screen — a filterable, sortable transaction table with a
 * detail drawer and an add/edit dialog. Thin by design: every filter/sort/
 * selection/dialog interaction lives in the injected `TransactionsStore`;
 * this class holds only that store, the injected `LedgerFacade` (for the raw
 * `categories()` / `accounts()` lists the filter chips and name-joins need),
 * and template glue.
 *
 * The table is `<nge-table>` (`@nge/table`) with a **fixed height** and
 * virtualization on, so the full seed ledger scrolls through a window of a
 * handful of rows rather than putting every row in the DOM. Two things follow
 * from that pairing and neither is optional: the height goes on `<nge-table>`
 * itself (there is no window to compute without a bounded viewport), and every
 * cell re-derives what it shows from the context it is handed, because a windowed
 * row's DOM is recycled.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-transactions' },
  imports: [
    DlcButtonComponent,
    DlcDialogComponent,
    DlcDrawerComponent,
    DlcFilterPopoverComponent,
    DlcInputComponent,
    DlcSearchInputComponent,
    DlcSelectComponent,
    DlcSortControlComponent,
    FormsModule,
    LdgAmountInputComponent,
    LdgCategoryChipComponent,
    LdgEmptyStateComponent,
    LdgHeaderBarComponent,
    LdgIconButtonComponent,
    LdgPageContentComponent,
    NgeCellDirective,
    NgeCellShellComponent,
    NgeChartComponent,
    NgeDatePickerComponent,
    NgeTableComponent,
  ],
  providers: [TransactionsStore],
  selector: 'ldg-transactions',
  styleUrl: './ldg-transactions.component.scss',
  templateUrl: './ldg-transactions.component.html',
})
export class LdgTransactionsComponent {
  protected readonly store = inject(TransactionsStore);
  protected readonly facade = inject(LedgerFacade);

  protected readonly sortFieldOptions = SORT_FIELD_OPTIONS;

  protected readonly columns = computed(() => buildColumns(this.store.trendSeries()));

  /**
   * What the table is: the filtered rows, the columns, and the geometry.
   *
   * ⚠️ `enableSorting` is **off**, and that is a decision rather than an omission.
   * The screen's own `dlc-sort-control` already owns the order through
   * `store.sort()`; a sortable header would be a second, silent source of truth,
   * so a header click would reorder the table while the control above it went on
   * displaying the sort the user last chose.
   *
   * ⚠️ `getRowId` is not optional here — `enableVirtualization` keys its window on
   * it, and the drawer opens by row id.
   */
  protected readonly tableConfig = computed<NgeTableConfig<Transaction>>(() =>
    createNgeTableConfig<Transaction>({
      columns: this.columns(),
      data: this.store.visibleTransactions(),
      enableSorting: false,
      enableStriping: true,
      enableVirtualization: true,
      getRowId: row => row.id,
      rowHeight: ROW_HEIGHT_PX,
    })
  );

  /**
   * Row → sparkline config, memoised by the ROW OBJECT.
   *
   * ⚠️ The memo is the load-bearing half. `chartFor(cell.row)` is called from a
   * template binding, so without it a fresh config is allocated on every
   * change-detection pass — `<nge-chart>`'s `config` input would change identity
   * and the chart would re-render, which under virtualization is exactly the cost
   * `cell.isSettled()` exists to avoid.
   *
   * A `WeakMap` keyed by `row`, not a `Map` keyed by `row.id`: a `Map` never
   * forgets a row it has seen, so scrolling the whole ledger would leave a config
   * behind for every transaction in it. The row object is also the correct key on
   * its own merits — the engine reorders and rewraps rows under filtering, but
   * never replaces the underlying datum.
   */
  private readonly chartConfigs = new WeakMap<Transaction, NgeChartConfig>();

  protected chartFor(row: Transaction): NgeChartConfig {
    const cached = this.chartConfigs.get(row);
    if (cached) {
      return cached;
    }

    const series = this.store.trendSeries().get(row.id) ?? [];

    const config = createSparklineChartConfig({
      // ⚠️ Virtualization recreates the cell on every window slide, so an entrance
      // animation replays per slide and reads as a strobe rather than as motion.
      animationMs: 0,
      data: series.map((cents, index) => ({ x: index, y: cents })),
      // ⚠️ Room for the end dot, which is what the preset's own 2px margin does not
      // leave: the last point sits ON the right edge of the plot area, so a
      // 2.5px-radius marker is half outside the SVG and renders as a clipped
      // crescent. The extra right margin is the whole fix.
      margin: { bottom: 6, left: 4, right: 8, top: 6 },
      // The money colour the Amount cell beside it already uses, so a row reads as
      // one statement rather than as a chart next to a number. The palette's own
      // `--nge-chart-primary` is `--dlc-primary` — a deep navy that all but
      // disappears against a dark persona's row surface.
      //
      // ⚠️ A `var()` REFERENCE, never a resolved literal, and that is what keeps the
      // persona switcher working: the renderer sets `stroke` through `.style()`, so
      // the value is a CSS declaration the browser re-resolves whenever the theme
      // class on `<body>` changes. Resolving it here would freeze every already-built
      // config at the colours of whichever persona happened to be active. Custom
      // properties inherit through `<nge-chart>`'s shadow boundary, so the token
      // reaches the line from the app's theme with nothing bridging it. The
      // last-value dot inherits the same colour — the preset hands it this palette.
      seriesColors: [
        row.amountCents >= 0 ? 'var(--ldg-money-positive)' : 'var(--ldg-money-negative)',
      ],
      // ⚠️ Per-row, anchored at zero — deliberately NOT the column-wide domain the
      // library's own chart-cell story uses. That story's fixture bounds every
      // series to [0, 100] by construction, so one shared domain keeps its rows
      // comparable. Ledger amounts do not cooperate: a category spans $15
      // entertainment charges to $3,500 payroll deposits, so a shared domain would
      // press nine rows in ten flat against the axis and the column would stop
      // saying anything at all. The magnitude is already in the Amount cell beside
      // it; what this column adds is the SHAPE — where this charge sits in its
      // category's recent run. Anchoring at zero rather than at the series minimum
      // is what keeps a flat run (rent, a subscription) drawing as a flat line
      // instead of collapsing into a degenerate domain.
      yDomain: [0, Math.max(...series, 1) * 1.15],
    });

    this.chartConfigs.set(row, config);

    return config;
  }

  protected categoryName(categoryId: string): string {
    return this.facade.categories().find(cat => cat.id === categoryId)?.name ?? categoryId;
  }

  protected accountName(accountId: string): string {
    return this.facade.accounts().find(acc => acc.id === accountId)?.name ?? accountId;
  }

  protected formatAmount(cents: number): string {
    return formatMoney(cents);
  }

  /**
   * Open the detail drawer for the clicked row.
   *
   * The whole reason the per-cell `<button>` wrappers this screen used to carry are
   * gone: `<nge-table>` announces the click itself, so a row is a row rather than
   * four buttons pretending to be one.
   */
  protected onTableEvent(event: NgeTableEvent<Transaction>): void {
    if (event.kind === 'row-click') {
      this.store.selectRow(event.row.row.id);
    }
  }

  protected onSortChange(selection: DlcSortSelection): void {
    // `dlc-sort-control`'s own "Clear" always reverts here to our default order.
    const field = (selection.field ?? 'date') as unknown as TransactionSortField;
    this.store.setSort({ direction: selection.direction, field });
  }

  protected onRangeStartChange(start: string): void {
    const current = this.store.dateRange();
    this.store.setDateRange({ end: current?.end ?? start, start });
  }

  protected onRangeEndChange(end: string): void {
    const current = this.store.dateRange();
    this.store.setDateRange({ end, start: current?.start ?? end });
  }
}
