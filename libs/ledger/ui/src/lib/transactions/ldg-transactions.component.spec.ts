import type { ComponentFixture } from '@angular/core/testing';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { LedgerFacade } from '@nge/ledger-store';
import { ledgerAccounts, ledgerCategories, ledgerTransactions } from '@nge/ledger-mocks';

import { LdgTransactionsComponent } from './ldg-transactions.component';

// Stubbed facade — same shape as the store spec, so the screen renders the
// real seed data deterministically without a Store/effects round trip.
const fakeFacade = {
  accounts: signal(ledgerAccounts),
  categories: signal(ledgerCategories),
  transactions: signal(ledgerTransactions),
} as unknown as LedgerFacade;

describe('LdgTransactionsComponent', () => {
  let fixture: ComponentFixture<LdgTransactionsComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LdgTransactionsComponent],
      providers: [provideAnimationsAsync(), { provide: LedgerFacade, useValue: fakeFacade }],
    }).compileComponents();

    fixture = TestBed.createComponent(LdgTransactionsComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    // CDK overlays (filter popover / sort control / selects / date pickers)
    // attach to the document — make sure none leak between tests.
    fixture.destroy();
  });

  it('creates', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the header title', () => {
    expect(el.textContent).toContain('Transactions');
  });

  it('renders one table row per mock transaction when unfiltered', () => {
    const rows = el.querySelectorAll('.dlc-data-table__row');
    expect(rows.length).toBe(ledgerTransactions.length);
  });

  it('renders one category chip per mock category', () => {
    const chips = el.querySelectorAll('ldg-category-chip');
    expect(chips.length).toBe(ledgerCategories.length);
  });

  it('opens the add dialog when the header add button is pressed', () => {
    expect(el.querySelector('.dlc-dialog__overlay')).toBeNull();

    const addButton = el.querySelector('ldg-icon-button button') as HTMLButtonElement;
    addButton.click();
    fixture.detectChanges();

    expect(el.querySelector('.dlc-dialog__overlay')).not.toBeNull();
    expect(el.textContent).toContain('Add Transaction');
  });

  it('clicking a transaction row opens the detail drawer for that transaction', () => {
    // Narrow to the one seed transaction with this merchant name so the
    // clicked row is unambiguous.
    const searchInput = el.querySelector('.dlc-search-input__field') as HTMLInputElement;
    searchInput.value = 'Local Bistro';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const rows = el.querySelectorAll('.dlc-data-table__row');
    expect(rows.length).toBe(1);

    const cellButton = rows[0].querySelector('.ldg-transactions__cell-btn') as HTMLButtonElement;
    cellButton.click();
    fixture.detectChanges();

    expect(el.querySelector('.dlc-drawer__panel')).not.toBeNull();
    expect(el.textContent).toContain('Local Bistro');
  });

  it('shows the empty state with a Clear filters action when a search matches nothing', () => {
    const searchInput = el.querySelector('.dlc-search-input__field') as HTMLInputElement;
    searchInput.value = 'zzz-no-such-merchant';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(el.querySelectorAll('.dlc-data-table__row').length).toBe(0);
    const emptyState = el.querySelector('ldg-empty-state');
    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent).toContain('No transactions found');

    const clearButton = el.querySelector('dlc-button[ldgEmptyStateAction] button') as HTMLButtonElement;
    clearButton.click();
    fixture.detectChanges();

    expect(el.querySelectorAll('.dlc-data-table__row').length).toBe(ledgerTransactions.length);
  });
});
