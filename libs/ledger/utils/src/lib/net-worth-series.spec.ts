import type { Account, Transaction } from '@nge/ledger-models';

import { netWorthSeries } from './net-worth-series';

const accounts: Account[] = [
  {
    balanceCents: 1000,
    currency: 'USD',
    id: 'a1',
    institution: 'Chase',
    name: 'Checking',
    type: 'checking',
  },
  { balanceCents: 500, currency: 'USD', id: 'a2', institution: 'Ally', name: 'Savings', type: 'savings' },
];

// Current total across both accounts is 1500. Reconstructed history:
// 01-01 (+500) -> 1600, 01-05 (-200) -> 1400, 01-10 (+100) -> 1500 (== current).
const transactions: Transaction[] = [
  { accountId: 'a1', amountCents: 500, categoryId: 'cat-income', date: '2026-01-01', id: 't1', merchant: 'Paycheck' },
  { accountId: 'a2', amountCents: -200, categoryId: 'cat-groceries', date: '2026-01-05', id: 't2', merchant: 'Groceries' },
  { accountId: 'a1', amountCents: 100, categoryId: 'cat-income', date: '2026-01-10', id: 't3', merchant: 'Refund' },
];

describe('netWorthSeries', () => {
  it('reconstructs historical totals by walking the current total backwards', () => {
    expect(netWorthSeries(accounts, transactions)).toEqual([
      { date: '2026-01-01', valueCents: 1600 },
      { date: '2026-01-05', valueCents: 1400 },
      { date: '2026-01-10', valueCents: 1500 },
    ]);
  });

  it('the most recent point always equals the current total across all accounts', () => {
    const series = netWorthSeries(accounts, transactions);
    const currentTotal = accounts.reduce((sum, account) => sum + account.balanceCents, 0);
    expect(series[series.length - 1].valueCents).toBe(currentTotal);
  });

  it('narrows to an inclusive date range', () => {
    expect(
      netWorthSeries(accounts, transactions, { range: { end: '2026-01-10', start: '2026-01-05' } })
    ).toEqual([
      { date: '2026-01-05', valueCents: 1400 },
      { date: '2026-01-10', valueCents: 1500 },
    ]);
  });

  it('returns an empty series with no transactions', () => {
    expect(netWorthSeries(accounts, [])).toEqual([]);
  });

  it('collapses same-day transactions into a single point', () => {
    const sameDay: Transaction[] = [
      { accountId: 'a1', amountCents: 200, categoryId: 'cat-income', date: '2026-03-01', id: 't4', merchant: 'A' },
      { accountId: 'a1', amountCents: -50, categoryId: 'cat-dining', date: '2026-03-01', id: 't5', merchant: 'B' },
    ];
    expect(netWorthSeries(accounts, sameDay)).toEqual([{ date: '2026-03-01', valueCents: 1500 }]);
  });
});
