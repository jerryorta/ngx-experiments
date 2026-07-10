import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NgeDatePickerComponent } from '@nge/calendar';

import {
  LdgAmountInputComponent,
  LdgCategoryChipComponent,
  LdgEmptyStateComponent,
  LdgHeaderBarComponent,
  LdgIconButtonComponent,
  LdgPageContentComponent,
} from '@nge/ledger-design-library';

import { LedgerFacade } from '@nge/ledger-store';
import { formatMoney } from '@nge/ledger-utils';

import type { DlcSortFieldOption, DlcSortSelection, DlcTableColumn } from '@nge/ui-design-library';

import {
  DlcButtonComponent,
  DlcCellDirective,
  DlcDataTableComponent,
  DlcDialogComponent,
  DlcDrawerComponent,
  DlcFilterPopoverComponent,
  DlcInputComponent,
  DlcSearchInputComponent,
  DlcSelectComponent,
  DlcSortControlComponent,
} from '@nge/ui-design-library';

import { type TransactionSortField, TransactionsStore } from './transactions.store';

const COLUMNS: DlcTableColumn[] = [
  { key: 'date', label: 'Date', width: '110px' },
  { key: 'merchant', label: 'Merchant' },
  { key: 'categoryId', label: 'Category' },
  { key: 'amountCents', label: 'Amount', width: '120px' },
];

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
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-transactions' },
  imports: [
    DlcButtonComponent,
    DlcCellDirective,
    DlcDataTableComponent,
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
    NgeDatePickerComponent,
  ],
  providers: [TransactionsStore],
  selector: 'ldg-transactions',
  styleUrl: './ldg-transactions.component.scss',
  templateUrl: './ldg-transactions.component.html',
})
export class LdgTransactionsComponent {
  protected readonly store = inject(TransactionsStore);
  protected readonly facade = inject(LedgerFacade);

  protected readonly columns = COLUMNS;
  protected readonly sortFieldOptions = SORT_FIELD_OPTIONS;

  protected categoryName(categoryId: string): string {
    return this.facade.categories().find(cat => cat.id === categoryId)?.name ?? categoryId;
  }

  protected accountName(accountId: string): string {
    return this.facade.accounts().find(acc => acc.id === accountId)?.name ?? accountId;
  }

  protected formatAmount(cents: number): string {
    return formatMoney(cents);
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
