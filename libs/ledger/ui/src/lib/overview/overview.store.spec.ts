import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { NgeGroupedBarDataPoint, NgeLineDataPoint } from '@nge/charts';
import type { Transaction } from '@nge/ledger-models';
import type { CashflowPeriod, CategoryBudgetActual, CategorySpending, NetWorthPoint } from '@nge/ledger-utils';

import { ledgerAccounts, ledgerBudgets, ledgerCategories, ledgerTransactions } from '@nge/ledger-mocks';
import { LedgerFacade } from '@nge/ledger-store';
import {
  budgetVsActual as computeBudgetVsActual,
  cashflow as computeCashflow,
  netWorthSeries as computeNetWorthSeries,
  spendingByCategory as computeSpendingByCategory,
} from '@nge/ledger-utils';

import { OverviewStore } from './overview.store';

/**
 * Builds a stub `LedgerFacade` seeded from realistic mock data, with any
 * signal overridden per test so KPI/trend edge cases (up vs down vs flat,
 * over- vs under-budget) are deterministic rather than depending on exactly
 * what the seed happens to contain.
 */
function createFakeFacade(overrides: Partial<Record<keyof LedgerFacade, unknown>> = {}): LedgerFacade {
  const base = {
    accounts: signal(ledgerAccounts),
    budgetVsActual: () => signal(computeBudgetVsActual(ledgerBudgets, ledgerTransactions, '2026-07')),
    cashflow: signal(computeCashflow(ledgerTransactions)),
    categories: signal(ledgerCategories),
    netWorthSeries: signal(computeNetWorthSeries(ledgerAccounts, ledgerTransactions)),
    spendingByCategory: signal(computeSpendingByCategory(ledgerTransactions, ledgerCategories)),
    transactions: signal(ledgerTransactions),
  };
  return { ...base, ...overrides } as unknown as LedgerFacade;
}

function setup(overrides: Partial<Record<keyof LedgerFacade, unknown>> = {}) {
  const facade = createFakeFacade(overrides);
  TestBed.configureTestingModule({
    providers: [OverviewStore, { provide: LedgerFacade, useValue: facade }],
  });
  return { facade, store: TestBed.inject(OverviewStore) };
}

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    accountId: 'acc-checking',
    amountCents: -1000,
    categoryId: 'cat-groceries',
    date: '2026-07-01',
    id: 'txn-default',
    merchant: 'Test Merchant',
    ...overrides,
  };
}

describe('OverviewStore', () => {
  it('defaults trendRange to 6m', () => {
    const { store } = setup();
    expect(store.trendRange()).toBe('6m');
  });

  it('setTrendRange updates trendRange', () => {
    const { store } = setup();
    store.setTrendRange('3m');
    expect(store.trendRange()).toBe('3m');
    store.setTrendRange('all');
    expect(store.trendRange()).toBe('all');
  });

  it('creates without throwing and produces well-formed derived signals against realistic seed data', () => {
    const { store } = setup();
    expect(store).toBeTruthy();
    expect(store.netWorthChartConfig().layers[0].data.length).toBeGreaterThan(0);
    expect(store.spendingSegments().length).toBeGreaterThan(0);
    expect(store.cashflowChartConfig().layers[0].data.length).toBeGreaterThan(0);
    expect(store.hasBudgetData()).toBe(true);
    expect(store.recentTransactions()).toHaveLength(8);
  });

  describe('spendingSegments', () => {
    it('maps CategorySpending to LdgDonutSegment (accent -> color, name -> label, totalCents -> value)', () => {
      const spending: CategorySpending[] = [
        { accent: 'var(--ldg-category-1)', categoryId: 'cat-groceries', name: 'Groceries', totalCents: 42000 },
      ];
      const { store } = setup({ spendingByCategory: signal(spending) });
      expect(store.spendingSegments()).toEqual([
        { color: 'var(--ldg-category-1)', label: 'Groceries', value: 42000 },
      ]);
    });
  });

  describe('netWorthChartConfig / trendRange slicing', () => {
    const points: NetWorthPoint[] = [
      { date: '2026-01-15', valueCents: 100000 },
      { date: '2026-03-15', valueCents: 110000 },
      { date: '2026-05-15', valueCents: 120000 },
      { date: '2026-07-01', valueCents: 130000 },
    ];

    it('slices to the last 3 months when trendRange is 3m (cutoff 2026-04-01)', () => {
      const { store } = setup({ netWorthSeries: signal(points) });
      store.setTrendRange('3m');
      const data = store.netWorthChartConfig().layers[0].data as NgeLineDataPoint[];
      expect(data).toHaveLength(2);
      expect(data[data.length - 1].y).toBe(130000);
    });

    it('slices to the last 6 months when trendRange is 6m (cutoff 2026-01-01)', () => {
      const { store } = setup({ netWorthSeries: signal(points) });
      store.setTrendRange('6m');
      const data = store.netWorthChartConfig().layers[0].data as NgeLineDataPoint[];
      expect(data).toHaveLength(4);
    });

    it('includes every point when trendRange is all', () => {
      const { store } = setup({ netWorthSeries: signal(points) });
      store.setTrendRange('all');
      const data = store.netWorthChartConfig().layers[0].data as NgeLineDataPoint[];
      expect(data).toHaveLength(points.length);
    });

    it('builds a well-formed line chart config with area + both axes enabled', () => {
      const { store } = setup({ netWorthSeries: signal(points) });
      const config = store.netWorthChartConfig();
      const layer = config.layers[0] as { showArea?: boolean; type: string };
      expect(layer.type).toBe('line');
      expect(layer.showArea).toBe(true);
      expect(config.base?.showXAxis).toBe(true);
      expect(config.base?.showYAxis).toBe(true);
    });

    it('returns an empty series (not a throw) when there is no net worth history', () => {
      const { store } = setup({ netWorthSeries: signal([]) });
      expect(store.netWorthChartConfig().layers[0].data).toEqual([]);
    });
  });

  describe('budgetChartConfig / hasBudgetData', () => {
    it('reports hasBudgetData false when there is no budget-vs-actual data', () => {
      const { store } = setup({ budgetVsActual: () => signal([]) });
      expect(store.hasBudgetData()).toBe(false);
      expect(store.budgetChartConfig().layers[0].data).toEqual([]);
    });

    it('builds two bars per category (Budget, Spent) joined with the category name/accent', () => {
      const bva: CategoryBudgetActual[] = [{ budgetCents: 50000, categoryId: 'cat-groceries', spentCents: 42000 }];
      const { store } = setup({ budgetVsActual: () => signal(bva) });

      expect(store.hasBudgetData()).toBe(true);
      const data = store.budgetChartConfig().layers[0].data as NgeGroupedBarDataPoint[];
      expect(data).toHaveLength(2);
      expect(data[0]).toMatchObject({ groupId: 'Groceries', label: 'Budget', value: 50000 });
      expect(data[1]).toMatchObject({
        color: 'var(--ldg-category-1)',
        groupId: 'Groceries',
        label: 'Spent',
        value: 42000,
      });
    });

    it('colors the Spent bar with the over-budget token when spending exceeds the limit', () => {
      const bva: CategoryBudgetActual[] = [{ budgetCents: 50000, categoryId: 'cat-groceries', spentCents: 60000 }];
      const { store } = setup({ budgetVsActual: () => signal(bva) });
      const data = store.budgetChartConfig().layers[0].data as NgeGroupedBarDataPoint[];
      expect(data[1].color).toBe('var(--ldg-money-negative)');
    });

    it('falls back to the raw categoryId as the group label when the category is unknown', () => {
      const bva: CategoryBudgetActual[] = [{ budgetCents: 1000, categoryId: 'cat-does-not-exist', spentCents: 500 }];
      const { store } = setup({ budgetVsActual: () => signal(bva) });
      const data = store.budgetChartConfig().layers[0].data as NgeGroupedBarDataPoint[];
      expect(data[0].groupId).toBe('cat-does-not-exist');
    });
  });

  describe('cashflowChartConfig', () => {
    it('builds an Inflow/Outflow grouped bar per period, colored by the money tokens', () => {
      const periods: CashflowPeriod[] = [
        { inflowCents: 500000, netCents: 100000, outflowCents: 400000, period: '2026-06' },
        { inflowCents: 520000, netCents: 120000, outflowCents: 400000, period: '2026-07' },
      ];
      const { store } = setup({ cashflow: signal(periods) });
      const data = store.cashflowChartConfig().layers[0].data as NgeGroupedBarDataPoint[];
      expect(data).toHaveLength(4);
      expect(data[0]).toMatchObject({
        color: 'var(--ldg-money-positive)',
        groupId: '2026-06',
        label: 'Inflow',
        value: 500000,
      });
      expect(data[1]).toMatchObject({
        color: 'var(--ldg-money-negative)',
        groupId: '2026-06',
        label: 'Outflow',
        value: 400000,
      });
    });
  });

  describe('recentTransactions', () => {
    it('sorts newest-first and caps at 8', () => {
      const txns: Transaction[] = Array.from({ length: 10 }, (_, i) =>
        makeTransaction({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, id: `txn-${i}` })
      );
      const { store } = setup({ transactions: signal(txns) });
      const rows = store.recentTransactions();
      expect(rows).toHaveLength(8);
      expect(rows[0].id).toBe('txn-9'); // 2026-01-10, most recent
      expect(rows[0].date).toBe('Jan 10');
      expect(rows[7].id).toBe('txn-2'); // 2026-01-03, 8th most recent
    });

    it('joins the category name and falls back to Uncategorized for an unknown category', () => {
      const txn = makeTransaction({ categoryId: 'cat-does-not-exist', date: '2026-07-05', id: 'txn-x' });
      const { store } = setup({ transactions: signal([txn]) });
      const [row] = store.recentTransactions();
      expect(row.categoryName).toBe('Uncategorized');
      expect(row.date).toBe('Jul 5');
    });
  });

  describe('KPI computeds', () => {
    it('netWorthKpi shows the latest value and an up trend + all-time delta when net worth grew', () => {
      const points: NetWorthPoint[] = [
        { date: '2026-02-01', valueCents: 100000 },
        { date: '2026-07-01', valueCents: 150000 },
      ];
      const { store } = setup({ netWorthSeries: signal(points) });
      expect(store.netWorthKpi()).toEqual({
        label: 'Net Worth',
        trend: 'up',
        trendLabel: '+$500.00 all-time',
        value: '$1,500.00',
      });
    });

    it('netWorthKpi degrades cleanly to zero/flat when there is no history', () => {
      const { store } = setup({ netWorthSeries: signal([]) });
      expect(store.netWorthKpi()).toEqual({
        label: 'Net Worth',
        trend: 'flat',
        trendLabel: null,
        value: '$0.00',
      });
    });

    it('totalBalanceKpi sums account balances and reports the account count (always flat)', () => {
      const { store } = setup({
        accounts: signal([
          { balanceCents: 100000, currency: 'USD', id: 'a', institution: 'X', name: 'A', type: 'checking' },
          { balanceCents: -20000, currency: 'USD', id: 'b', institution: 'Y', name: 'B', type: 'credit' },
        ]),
      });
      expect(store.totalBalanceKpi()).toEqual({
        label: 'Total Balance',
        trend: 'flat',
        trendLabel: '2 accounts',
        value: '$800.00',
      });
    });

    it('monthSpendingKpi trends down (and shows a negative value) when spending increases month over month', () => {
      const periods: CashflowPeriod[] = [
        { inflowCents: 0, netCents: -30000, outflowCents: 30000, period: '2026-06' },
        { inflowCents: 0, netCents: -50000, outflowCents: 50000, period: '2026-07' },
      ];
      const { store } = setup({ cashflow: signal(periods) });
      expect(store.monthSpendingKpi()).toEqual({
        label: 'This Month Spending',
        trend: 'down',
        trendLabel: '-$200.00 vs last month',
        value: '-$500.00',
      });
    });

    it('monthSpendingKpi trends up when spending decreases month over month', () => {
      const periods: CashflowPeriod[] = [
        { inflowCents: 0, netCents: -50000, outflowCents: 50000, period: '2026-06' },
        { inflowCents: 0, netCents: -30000, outflowCents: 30000, period: '2026-07' },
      ];
      const { store } = setup({ cashflow: signal(periods) });
      expect(store.monthSpendingKpi().trend).toBe('up');
    });

    it('monthNetCashflowKpi trends up with a formatted delta when net cashflow improves', () => {
      const periods: CashflowPeriod[] = [
        { inflowCents: 400000, netCents: 10000, outflowCents: 390000, period: '2026-06' },
        { inflowCents: 450000, netCents: 60000, outflowCents: 390000, period: '2026-07' },
      ];
      const { store } = setup({ cashflow: signal(periods) });
      expect(store.monthNetCashflowKpi()).toEqual({
        label: 'This Month Net Cashflow',
        trend: 'up',
        trendLabel: '+$500.00 vs last month',
        value: '$600.00',
      });
    });

    it('KPIs with cashflow data degrade cleanly to zero/flat/null when there is only one period', () => {
      const periods: CashflowPeriod[] = [{ inflowCents: 100000, netCents: 40000, outflowCents: 60000, period: '2026-07' }];
      const { store } = setup({ cashflow: signal(periods) });
      expect(store.monthSpendingKpi().trend).toBe('flat');
      expect(store.monthSpendingKpi().trendLabel).toBeNull();
      expect(store.monthNetCashflowKpi().trendLabel).toBeNull();
    });
  });
});
