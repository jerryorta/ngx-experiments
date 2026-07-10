import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';
import type { Account } from '@nge/ledger-models';

import { LdgAccountCardComponent } from './ldg-account-card.component';

const CHECKING: Account = {
  balanceCents: 542350,
  currency: 'USD',
  id: 'acc-checking',
  institution: 'Chase',
  last4: '4412',
  name: 'Checking',
  type: 'checking',
};

const NEGATIVE_CREDIT: Account = {
  balanceCents: -350500,
  currency: 'USD',
  id: 'acc-credit',
  institution: 'American Express',
  last4: '3456',
  name: 'Credit Card',
  type: 'credit',
};

describe('LdgAccountCardComponent', () => {
  let component: LdgAccountCardComponent;
  let fixture: ComponentFixture<LdgAccountCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LdgAccountCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LdgAccountCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('account', CHECKING);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the account name and institution with the masked last4', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-account-card__name')?.textContent?.trim()).toBe('Checking');
    expect(el.querySelector('.ldg-account-card__meta')?.textContent?.trim()).toBe(
      'Chase · •••• 4412'
    );
  });

  it('omits the masked number when the account has no last4', () => {
    fixture.componentRef.setInput('account', { ...CHECKING, last4: undefined });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-account-card__meta')?.textContent?.trim()).toBe('Chase');
  });

  it('formats the balance with formatMoney', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-account-card__balance')?.textContent?.trim()).toBe('$5,423.50');
  });

  it('applies the negative-balance modifier and renders a leading minus for a negative balance', () => {
    fixture.componentRef.setInput('account', NEGATIVE_CREDIT);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const balance = el.querySelector('.ldg-account-card__balance');
    expect(balance?.classList.contains('ldg-account-card__balance--negative')).toBe(true);
    expect(balance?.textContent?.trim()).toBe('-$3,505.00');
  });

  it('maps each account type to its Material Symbol icon', () => {
    const cases: Array<[Account['type'], string]> = [
      ['checking', 'account_balance'],
      ['savings', 'savings'],
      ['credit', 'credit_card'],
      ['investment', 'trending_up'],
      ['cash', 'payments'],
    ];

    for (const [type, icon] of cases) {
      fixture.componentRef.setInput('account', { ...CHECKING, type });
      fixture.detectChanges();
      expect(component.typeIcon()).toBe(icon);
    }
  });

  it('emits pressed with the account when clicked', () => {
    let emitted: Account | undefined;
    component.pressed.subscribe(account => (emitted = account));

    const button = fixture.nativeElement.querySelector(
      '.ldg-account-card__button'
    ) as HTMLButtonElement;
    button.click();

    expect(emitted).toEqual(CHECKING);
  });

  it('reflects the selected input as aria-pressed and a modifier class', () => {
    let button = fixture.nativeElement.querySelector(
      '.ldg-account-card__button'
    ) as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.classList.contains('ldg-account-card__button--selected')).toBe(false);

    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();

    button = fixture.nativeElement.querySelector('.ldg-account-card__button') as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.classList.contains('ldg-account-card__button--selected')).toBe(true);
  });
});
