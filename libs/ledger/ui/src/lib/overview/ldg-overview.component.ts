import { ChangeDetectionStrategy, Component, computed, inject, ViewEncapsulation } from '@angular/core';

import type { NgeTableColumn, NgeTableConfig } from '@nge/table';

import { NgeChartComponent } from '@nge/charts';
import {
  LdgAccountCardComponent,
  LdgDonutChartComponent,
  LdgEmptyStateComponent,
  LdgHeaderBarComponent,
  LdgPageContentComponent,
} from '@nge/ledger-design-library';
import { LedgerFacade } from '@nge/ledger-store';
import { formatMoney } from '@nge/ledger-utils';
import { createNgeTableConfig, NgeCellDirective, NgeTableComponent } from '@nge/table';
import { DlcAnalyticsCardComponent, DlcStatsCardComponent } from '@nge/ui-design-library';

import type { OverviewTransactionRow, OverviewTrendRange } from './overview.store';

import { OverviewStore } from './overview.store';

/** Static config for the trend-range segmented toggle above the net-worth chart. */
const TREND_RANGE_OPTIONS: { label: string; value: OverviewTrendRange }[] = [
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: 'All', value: 'all' },
];

/**
 * Static column config for the "Recent Transactions" table.
 *
 * Sorting stays off: the rows are already "the eight most recent", so a header
 * click reordering them would quietly contradict the heading above the table.
 */
const TRANSACTION_COLUMNS: NgeTableColumn<OverviewTransactionRow>[] = [
  { accessorKey: 'date', header: 'Date', id: 'date', size: 110 },
  { accessorKey: 'merchant', header: 'Merchant', id: 'merchant', size: 300 },
  { accessorKey: 'categoryName', header: 'Category', id: 'categoryName', size: 210 },
  { accessorKey: 'amountCents', header: 'Amount', id: 'amountCents', size: 160 },
];

/**
 * The Ledger demo's analytics dashboard — KPI tiles, a net-worth trend, a
 * spending donut, budget-vs-actual, cashflow, an accounts grid, and a
 * recent-transactions table. Pure template glue: every derivation lives in
 * the colocated `OverviewStore`; every domain read comes from `LedgerFacade`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-overview' },
  imports: [
    DlcAnalyticsCardComponent,
    DlcStatsCardComponent,
    LdgAccountCardComponent,
    LdgDonutChartComponent,
    LdgEmptyStateComponent,
    LdgHeaderBarComponent,
    LdgPageContentComponent,
    NgeCellDirective,
    NgeChartComponent,
    NgeTableComponent,
  ],
  providers: [OverviewStore],
  selector: 'ldg-overview',
  styleUrl: './ldg-overview.component.scss',
  templateUrl: './ldg-overview.component.html',
})
export class LdgOverviewComponent {
  protected readonly store = inject(OverviewStore);
  protected readonly facade = inject(LedgerFacade);

  /** Exposed for the amount-cell template — a pure formatter, not component logic. */
  protected readonly formatMoney = formatMoney;

  protected readonly trendRangeOptions = TREND_RANGE_OPTIONS;

  /**
   * The recent-transactions table.
   *
   * `getRowId` even without selection or expansion state to key: it costs one
   * arrow function and it is what keeps the engine from identifying rows by array
   * index, which would shift every row's identity onto a different transaction the
   * moment the ledger gains one at the top — exactly what "most recent" does.
   */
  protected readonly tableConfig = computed<NgeTableConfig<OverviewTransactionRow>>(() =>
    createNgeTableConfig<OverviewTransactionRow>({
      columns: TRANSACTION_COLUMNS,
      data: this.store.recentTransactions(),
      enableSorting: false,
      getRowId: row => row.id,
    })
  );
}
