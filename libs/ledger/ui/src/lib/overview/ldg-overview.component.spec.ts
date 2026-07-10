import type { ComponentFixture } from '@angular/core/testing';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ledgerAccounts, ledgerBudgets, ledgerCategories, ledgerTransactions } from '@nge/ledger-mocks';
import { LedgerFacade } from '@nge/ledger-store';
import {
  budgetVsActual as computeBudgetVsActual,
  cashflow as computeCashflow,
  netWorthSeries as computeNetWorthSeries,
  spendingByCategory as computeSpendingByCategory,
} from '@nge/ledger-utils';

import { LdgOverviewComponent } from './ldg-overview.component';

/** Stub `LedgerFacade` seeded from realistic mock data — provided at the TestBed
 * level (not the component level) since the component provides its own `OverviewStore`,
 * which resolves `LedgerFacade` up through the same injector chain. */
function createFakeFacade(): LedgerFacade {
  return {
    accounts: signal(ledgerAccounts),
    budgetVsActual: () => signal(computeBudgetVsActual(ledgerBudgets, ledgerTransactions, '2026-07')),
    cashflow: signal(computeCashflow(ledgerTransactions)),
    categories: signal(ledgerCategories),
    netWorthSeries: signal(computeNetWorthSeries(ledgerAccounts, ledgerTransactions)),
    spendingByCategory: signal(computeSpendingByCategory(ledgerTransactions, ledgerCategories)),
    transactions: signal(ledgerTransactions),
  } as unknown as LedgerFacade;
}

describe('LdgOverviewComponent', () => {
  let fixture: ComponentFixture<LdgOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LdgOverviewComponent],
      providers: [{ provide: LedgerFacade, useValue: createFakeFacade() }],
    }).compileComponents();

    fixture = TestBed.createComponent(LdgOverviewComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the header bar with the screen title', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-header-bar__title')?.textContent?.trim()).toBe('Overview');
  });

  it('renders a KPI stats card for each of the four tiles', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('dlc-stats-card').length).toBe(4);
  });

  it('renders the net-worth trend chart and the trend-range toggle', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('nge-chart')).toBeTruthy();
    expect(el.querySelectorAll('[data-testid^="overview-trend-range-"]').length).toBeGreaterThan(0);
  });

  it('renders the spending donut', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('ldg-donut-chart')).toBeTruthy();
  });

  it('renders an account card per account', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('ldg-account-card').length).toBe(ledgerAccounts.length);
  });

  it('renders the recent-transactions data table', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('dlc-data-table')).toBeTruthy();
  });

  it('switches the active trend-range button on click', () => {
    const el: HTMLElement = fixture.nativeElement;
    const threeMonthBtn = el.querySelector<HTMLButtonElement>('[data-testid="overview-trend-range-3m"]');
    expect(threeMonthBtn?.getAttribute('aria-pressed')).toBe('false');

    threeMonthBtn?.click();
    fixture.detectChanges();

    expect(threeMonthBtn?.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders empty states instead of throwing when the facade has no data', async () => {
    TestBed.resetTestingModule();
    const emptyFacade = {
      accounts: signal([]),
      budgetVsActual: () => signal([]),
      cashflow: signal([]),
      categories: signal([]),
      netWorthSeries: signal([]),
      spendingByCategory: signal([]),
      transactions: signal([]),
    } as unknown as LedgerFacade;

    await TestBed.configureTestingModule({
      imports: [LdgOverviewComponent],
      providers: [{ provide: LedgerFacade, useValue: emptyFacade }],
    }).compileComponents();

    const emptyFixture = TestBed.createComponent(LdgOverviewComponent);
    emptyFixture.detectChanges();

    const el: HTMLElement = emptyFixture.nativeElement;
    expect(el.querySelectorAll('ldg-empty-state').length).toBeGreaterThan(0);
    expect(el.querySelector('nge-chart')).toBeFalsy();
  });
});
