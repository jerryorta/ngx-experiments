import { ChangeDetectionStrategy, Component, computed, input, output, ViewEncapsulation } from '@angular/core';
import type { Account, AccountType } from '@nge/ledger-models';
import { formatMoney } from '@nge/ledger-utils';
import { DlcIconDirective } from '@nge/ui-design-library';

// Material Symbol per account type — the card's leading glyph.
const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  cash: 'payments',
  checking: 'account_balance',
  credit: 'credit_card',
  investment: 'trending_up',
  savings: 'savings',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-account-card' },
  imports: [DlcIconDirective],
  selector: 'ldg-account-card',
  styleUrl: './ldg-account-card.component.scss',
  templateUrl: './ldg-account-card.component.html',
})
export class LdgAccountCardComponent {
  readonly account = input.required<Account>();
  readonly selected = input(false);

  readonly pressed = output<Account>();

  readonly typeIcon = computed(() => ACCOUNT_TYPE_ICONS[this.account().type]);
  readonly isNegative = computed(() => this.account().balanceCents < 0);
  readonly formattedBalance = computed(() => {
    const account = this.account();
    return formatMoney(account.balanceCents, { currency: account.currency });
  });

  // Institution, plus a masked "•••• 4412" suffix when the account carries one.
  readonly institutionLabel = computed(() => {
    const account = this.account();
    return account.last4 ? `${account.institution} · •••• ${account.last4}` : account.institution;
  });

  protected onPressed(): void {
    this.pressed.emit(this.account());
  }
}
