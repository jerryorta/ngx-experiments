import type { Budget, Transaction } from '@nge/ledger-models';

import { budgetVsActual } from './budget-vs-actual';

const budgets: Budget[] = [
  { categoryId: 'cat-groceries', id: 'b1', limitCents: 10000, month: '2026-01' },
  { categoryId: 'cat-dining', id: 'b2', limitCents: 5000, month: '2026-01' },
  { categoryId: 'cat-groceries', id: 'b3', limitCents: 12000, month: '2026-02' },
];

const transactions: Transaction[] = [
  { accountId: 'a1', amountCents: -4000, categoryId: 'cat-groceries', date: '2026-01-05', id: 't1', merchant: 'Store' },
  { accountId: 'a1', amountCents: -3000, categoryId: 'cat-groceries', date: '2026-01-20', id: 't2', merchant: 'Store 2' },
  { accountId: 'a1', amountCents: -6000, categoryId: 'cat-dining', date: '2026-01-15', id: 't3', merchant: 'Restaurant' },
  { accountId: 'a1', amountCents: -1000, categoryId: 'cat-groceries', date: '2026-02-05', id: 't4', merchant: 'Store 3' },
  { accountId: 'a1', amountCents: 500, categoryId: 'cat-groceries', date: '2026-01-10', id: 't5', merchant: 'Refund' },
];

describe('budgetVsActual', () => {
  it("pairs each month's budget with the absolute spend in that category+month", () => {
    expect(budgetVsActual(budgets, transactions, '2026-01')).toEqual([
      { budgetCents: 10000, categoryId: 'cat-groceries', spentCents: 7000 },
      { budgetCents: 5000, categoryId: 'cat-dining', spentCents: 6000 }, // over budget
    ]);
  });

  it('ignores inflows (refunds/income) when summing spend', () => {
    const [groceries] = budgetVsActual(budgets, transactions, '2026-01');
    expect(groceries.spentCents).toBe(7000); // the +500 refund on 2026-01-10 is excluded
  });

  it('only includes budgets for the requested month', () => {
    expect(budgetVsActual(budgets, transactions, '2026-02')).toEqual([
      { budgetCents: 12000, categoryId: 'cat-groceries', spentCents: 1000 },
    ]);
  });

  it('returns an empty array for a month with no budgets', () => {
    expect(budgetVsActual(budgets, transactions, '2026-03')).toEqual([]);
  });
});
