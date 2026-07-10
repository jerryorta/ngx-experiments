import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EventClick } from '@nge/calendar';
import { NgeCalendarComponent } from '@nge/calendar';
import {
  LdgAmountInputComponent,
  LdgBudgetCardComponent,
  LdgEmptyStateComponent,
  LdgHeaderBarComponent,
  LdgIconButtonComponent,
  LdgPageContentComponent,
} from '@nge/ledger-design-library';
import type { Bill } from '@nge/ledger-models';
import { LedgerFacade } from '@nge/ledger-store';
import { DlcButtonComponent, DlcDialogComponent } from '@nge/ui-design-library';

import { BudgetsStore } from './budgets.store';

/**
 * The Budgets screen: per-category budget cards with an edit-limit dialog,
 * plus a bills & due-dates calendar. All join/derivation logic lives in
 * `BudgetsStore` — this component is template glue over it and `LedgerFacade`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-budgets' },
  imports: [
    DlcButtonComponent,
    DlcDialogComponent,
    FormsModule,
    LdgAmountInputComponent,
    LdgBudgetCardComponent,
    LdgEmptyStateComponent,
    LdgHeaderBarComponent,
    LdgIconButtonComponent,
    LdgPageContentComponent,
    NgeCalendarComponent,
  ],
  providers: [BudgetsStore],
  selector: 'ldg-budgets',
  styleUrl: './ldg-budgets.component.scss',
  templateUrl: './ldg-budgets.component.html',
})
export class LdgBudgetsComponent {
  protected readonly store = inject(BudgetsStore);
  protected readonly facade = inject(LedgerFacade);

  /** Reads the clicked calendar event's `Bill` payload back into the store. */
  protected onBillEventClick(event: EventClick<Bill>): void {
    if (event.event.data) {
      this.store.selectBill(event.event.data);
    }
  }
}
