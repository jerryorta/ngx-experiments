import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';

import type { DlcTableColumn } from '@nge/ui-design-library';

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
import { DlcAnalyticsCardComponent, DlcCellDirective, DlcDataTableComponent, DlcStatsCardComponent } from '@nge/ui-design-library';

import type { OverviewTrendRange } from './overview.store';

import { OverviewStore } from './overview.store';

/** Static config for the trend-range segmented toggle above the net-worth chart. */
const TREND_RANGE_OPTIONS: { label: string; value: OverviewTrendRange }[] = [
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: 'All', value: 'all' },
];

/** Static column config for the "Recent Transactions" table. */
const TRANSACTION_COLUMNS: DlcTableColumn[] = [
  { key: 'date', label: 'Date', width: '90px' },
  { key: 'merchant', label: 'Merchant' },
  { key: 'categoryName', label: 'Category' },
  { key: 'amountCents', label: 'Amount', width: '120px' },
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
    DlcCellDirective,
    DlcDataTableComponent,
    DlcStatsCardComponent,
    LdgAccountCardComponent,
    LdgDonutChartComponent,
    LdgEmptyStateComponent,
    LdgHeaderBarComponent,
    LdgPageContentComponent,
    NgeChartComponent,
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

  protected readonly transactionColumns = TRANSACTION_COLUMNS;
  protected readonly trendRangeOptions = TREND_RANGE_OPTIONS;
}
