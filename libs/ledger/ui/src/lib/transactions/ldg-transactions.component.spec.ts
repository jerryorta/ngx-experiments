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

/**
 * The screen's table is virtualized, and jsdom lays nothing out — a viewport that
 * measures zero produces no window at all, so every row assertion below would see
 * an empty table. `offsetHeight` is the one property `@tanstack/virtual-core`
 * reads to size the viewport, so feeding it is what makes a window exist; the
 * table library's own virtualization specs shim exactly this.
 *
 * It stays a SHAPE claim either way — that the DOM holds a window rather than the
 * dataset. Where the window lands, and whether a real scroll moves it, is
 * browser-only.
 */
const VIEWPORT_HEIGHT = 560;

describe('LdgTransactionsComponent', () => {
  let fixture: ComponentFixture<LdgTransactionsComponent>;
  let el: HTMLElement;
  let originalOffsetHeight: PropertyDescriptor | undefined;

  beforeEach(async () => {
    originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => VIEWPORT_HEIGHT,
    });

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

    if (originalOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
    }
  });

  it('creates', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the header title', () => {
    expect(el.textContent).toContain('Transactions');
  });

  it('windows the rows rather than putting the whole ledger in the DOM', () => {
    const rendered = el.querySelectorAll('.nge-table__row');
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(ledgerTransactions.length);
  });

  it('sizes the scrolled body to the whole ledger, so the scrollbar describes it', () => {
    const body = el.querySelector<HTMLElement>('.nge-table__body');
    expect(body?.classList).toContain('nge-table__body--virtualized');
    // Every row the user cannot see is still accounted for in the height.
    expect(body?.style.height).toBe(`${ledgerTransactions.length * 72}px`);
  });

  it('still describes the whole unfiltered ledger to assistive technology', () => {
    // One header row plus every transaction — the count a windowed grid would
    // otherwise announce as "row 4 of 7".
    const grid = el.querySelector('[role="grid"]');
    expect(grid?.getAttribute('aria-rowcount')).toBe(`${ledgerTransactions.length + 1}`);
  });

  it('renders a sparkline in the trend column of every windowed row', () => {
    const rendered = el.querySelectorAll('.nge-table__row');
    expect(rendered.length).toBeGreaterThan(0);

    // The scroll is quiet on first paint, so `isSettled()` is true and every
    // windowed row draws the chart rather than the placeholder shell.
    expect(el.querySelectorAll('.ldg-transactions__chart-cell nge-chart').length).toBe(
      rendered.length
    );
    expect(el.querySelector('nge-cell-shell')).toBeNull();
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

    const rows = el.querySelectorAll<HTMLElement>('.nge-table__row');
    expect(rows.length).toBe(1);

    // A click anywhere on the row, not on a per-cell button: `<nge-table>`
    // announces `row-click` itself.
    rows[0].click();
    fixture.detectChanges();

    expect(el.querySelector('.dlc-drawer__panel')).not.toBeNull();
    expect(el.textContent).toContain('Local Bistro');
  });

  it('shows the empty state with a Clear filters action when a search matches nothing', () => {
    const searchInput = el.querySelector('.dlc-search-input__field') as HTMLInputElement;
    searchInput.value = 'zzz-no-such-merchant';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // The screen swaps the table out for the empty state entirely — a fixed-height
    // table showing "No rows" would leave 560px of chrome around the message.
    expect(el.querySelector('nge-table')).toBeNull();
    const emptyState = el.querySelector('ldg-empty-state');
    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent).toContain('No transactions found');

    const clearButton = el.querySelector('dlc-button[ldgEmptyStateAction] button') as HTMLButtonElement;
    clearButton.click();
    fixture.detectChanges();

    expect(el.querySelectorAll('.nge-table__row').length).toBeGreaterThan(0);
    expect(el.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe(
      `${ledgerTransactions.length + 1}`
    );
  });
});
