import type { WritableSignal } from '@angular/core';

import { Component, computed, Input, signal, ViewEncapsulation } from '@angular/core';
import { NgeStorybookReviewContainerComponent, REVIEW_STATUS } from '@nge/storybook';

import type { Account, AccountType } from '@nge/ledger-models';

import { LdgAccountCardComponent } from '../ldg-account-card.component';

const ACCOUNT_TYPES: Account[] = [
  {
    balanceCents: 542350,
    currency: 'USD',
    id: 'acc-checking',
    institution: 'Chase',
    last4: '4412',
    name: 'Checking',
    type: 'checking',
  },
  {
    balanceCents: 2500000,
    currency: 'USD',
    id: 'acc-savings',
    institution: 'Bank of America',
    last4: '8901',
    name: 'Savings',
    type: 'savings',
  },
  {
    balanceCents: -350500,
    currency: 'USD',
    id: 'acc-credit',
    institution: 'American Express',
    last4: '3456',
    name: 'Credit Card',
    type: 'credit',
  },
  {
    balanceCents: 8500000,
    currency: 'USD',
    id: 'acc-investment',
    institution: 'Fidelity',
    last4: '7890',
    name: 'Brokerage',
    type: 'investment',
  },
  {
    balanceCents: 42000,
    currency: 'USD',
    id: 'acc-cash',
    institution: 'Wallet',
    name: 'Cash',
    type: 'cash',
  },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-account-card-stories' },
  imports: [LdgAccountCardComponent, NgeStorybookReviewContainerComponent],
  selector: 'ldg-account-card-stories',
  standalone: true,
  styleUrl: './ldg-account-card-stories.component.scss',
  templateUrl: './ldg-account-card-stories.component.html',
})
export class LdgAccountCardStoriesComponent {
  readonly nameSig: WritableSignal<string> = signal('Checking');
  readonly institutionSig: WritableSignal<string> = signal('Chase');
  readonly last4Sig: WritableSignal<string> = signal('4412');
  readonly balanceCentsSig: WritableSignal<number> = signal(542350);
  readonly typeSig: WritableSignal<AccountType> = signal('checking');
  readonly selectedSig: WritableSignal<boolean> = signal(false);

  readonly account = computed<Account>(() => ({
    balanceCents: this.balanceCentsSig(),
    currency: 'USD',
    id: 'acc-storybook',
    institution: this.institutionSig(),
    last4: this.last4Sig() || undefined,
    name: this.nameSig(),
    type: this.typeSig(),
  }));

  readonly accountTypes = ACCOUNT_TYPES;

  /** Which of the picker demo's accounts is selected — proves `selected` + `pressed` together. */
  readonly pickedId: WritableSignal<null | string> = signal(ACCOUNT_TYPES[0].id);
  readonly lastPressed: WritableSignal<string> = signal('none yet');

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/ledger/design-library/src/lib/account-card/stories';

  @Input()
  set name(v: string) {
    this.nameSig.set(v);
  }

  @Input()
  set institution(v: string) {
    this.institutionSig.set(v);
  }

  @Input()
  set last4(v: string) {
    this.last4Sig.set(v);
  }

  @Input()
  set balanceCents(v: number) {
    this.balanceCentsSig.set(v);
  }

  @Input()
  set type(v: AccountType) {
    this.typeSig.set(v);
  }

  @Input()
  set selected(v: boolean) {
    this.selectedSig.set(v);
  }

  onPicked(account: Account): void {
    this.pickedId.set(account.id);
    this.lastPressed.set(account.name);
  }
}
