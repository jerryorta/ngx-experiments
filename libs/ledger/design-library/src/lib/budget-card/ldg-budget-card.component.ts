import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import type { Category } from '@nge/ledger-models';
import { formatMoney } from '@nge/ledger-utils';
import { DlcProgressBarComponent } from '@nge/ui-design-library';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-budget-card' },
  imports: [DlcProgressBarComponent],
  selector: 'ldg-budget-card',
  styleUrl: './ldg-budget-card.component.scss',
  templateUrl: './ldg-budget-card.component.html',
})
export class LdgBudgetCardComponent {
  readonly category = input.required<Category>();
  readonly limitCents = input.required<number>();
  readonly spentCents = input.required<number>();

  readonly isOver = computed(() => this.spentCents() > this.limitCents());

  // Guards a zero-or-negative limit: any spend against it reads as fully (100%) over.
  readonly pct = computed(() => {
    const limit = this.limitCents();
    if (limit <= 0) return this.spentCents() > 0 ? 100 : 0;
    return Math.min(100, Math.round((this.spentCents() / limit) * 100));
  });

  /** Cents left in the budget — negative once `isOver()`. */
  readonly remaining = computed(() => this.limitCents() - this.spentCents());

  readonly formattedLimit = computed(() => formatMoney(this.limitCents()));
  readonly formattedSpent = computed(() => formatMoney(this.spentCents()));

  // Always a positive amount — remainingLabel supplies "over"/"left" for polarity.
  readonly formattedRemaining = computed(() => formatMoney(Math.abs(this.remaining())));

  readonly remainingLabel = computed(() =>
    this.isOver() ? `${this.formattedRemaining()} over` : `${this.formattedRemaining()} left`
  );
}
