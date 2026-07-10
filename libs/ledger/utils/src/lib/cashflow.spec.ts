import type { Transaction } from '@nge/ledger-models';

import { cashflow } from './cashflow';

const transactions: Transaction[] = [
  { accountId: 'a1', amountCents: 300000, categoryId: 'cat-income', date: '2026-01-01', id: 't1', merchant: 'Paycheck' },
  { accountId: 'a1', amountCents: -5000, categoryId: 'cat-groceries', date: '2026-01-05', id: 't2', merchant: 'Store' },
  { accountId: 'a1', amountCents: -2000, categoryId: 'cat-dining', date: '2026-01-15', id: 't3', merchant: 'Cafe' },
  { accountId: 'a1', amountCents: 300000, categoryId: 'cat-income', date: '2026-02-01', id: 't4', merchant: 'Paycheck' },
  { accountId: 'a1', amountCents: -10000, categoryId: 'cat-groceries', date: '2026-02-10', id: 't5', merchant: 'Store' },
  { accountId: 'a1', amountCents: 100, categoryId: 'cat-income', date: '2026-03-01', id: 't6', merchant: 'Interest' },
];

describe('cashflow', () => {
  it('buckets inflow/outflow/net by YYYY-MM, in chronological order', () => {
    expect(cashflow(transactions)).toEqual([
      { inflowCents: 300000, netCents: 293000, outflowCents: 7000, period: '2026-01' },
      { inflowCents: 300000, netCents: 290000, outflowCents: 10000, period: '2026-02' },
      { inflowCents: 100, netCents: 100, outflowCents: 0, period: '2026-03' },
    ]);
  });

  it('narrows to an inclusive date range', () => {
    expect(cashflow(transactions, { range: { end: '2026-02-28', start: '2026-01-01' } })).toEqual([
      { inflowCents: 300000, netCents: 293000, outflowCents: 7000, period: '2026-01' },
      { inflowCents: 300000, netCents: 290000, outflowCents: 10000, period: '2026-02' },
    ]);
  });

  it('omits months with no transactions rather than zero-filling', () => {
    const result = cashflow(transactions, { range: { end: '2026-02-28', start: '2026-01-01' } });
    expect(result.some(p => p.period === '2026-03')).toBe(false);
  });

  it('returns an empty array with no transactions', () => {
    expect(cashflow([])).toEqual([]);
  });
});
