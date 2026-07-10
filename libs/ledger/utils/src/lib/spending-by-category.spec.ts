import type { Category, Transaction } from '@nge/ledger-models';

import { spendingByCategory } from './spending-by-category';

const categories: Category[] = [
  { accent: 'chart-1', id: 'cat-groceries', kind: 'expense', name: 'Groceries' },
  { accent: 'chart-2', id: 'cat-dining', kind: 'expense', name: 'Dining' },
  { accent: 'chart-3', id: 'cat-income', kind: 'income', name: 'Paycheck' },
  { accent: 'chart-4', id: 'cat-travel', kind: 'expense', name: 'Travel' }, // no transactions below
];

const transactions: Transaction[] = [
  { accountId: 'a1', amountCents: -5000, categoryId: 'cat-groceries', date: '2026-01-05', id: 't1', merchant: "Trader Joe's" },
  { accountId: 'a1', amountCents: -3000, categoryId: 'cat-groceries', date: '2026-01-15', id: 't2', merchant: 'Whole Foods' },
  { accountId: 'a1', amountCents: -2000, categoryId: 'cat-dining', date: '2026-01-10', id: 't3', merchant: 'Cafe' },
  { accountId: 'a1', amountCents: 300000, categoryId: 'cat-income', date: '2026-01-01', id: 't4', merchant: 'Paycheck' },
  { accountId: 'a1', amountCents: -1000, categoryId: 'cat-groceries', date: '2026-02-01', id: 't5', merchant: 'Corner store' },
];

describe('spendingByCategory', () => {
  it('sums outflows per expense category, largest first', () => {
    expect(spendingByCategory(transactions, categories)).toEqual([
      { accent: 'chart-1', categoryId: 'cat-groceries', name: 'Groceries', totalCents: 9000 },
      { accent: 'chart-2', categoryId: 'cat-dining', name: 'Dining', totalCents: 2000 },
    ]);
  });

  it('excludes income categories and zero-spend expense categories', () => {
    const result = spendingByCategory(transactions, categories);
    expect(result.some(entry => entry.categoryId === 'cat-income')).toBe(false);
    expect(result.some(entry => entry.categoryId === 'cat-travel')).toBe(false);
  });

  it('narrows to an inclusive date range', () => {
    expect(
      spendingByCategory(transactions, categories, { end: '2026-01-31', start: '2026-01-01' })
    ).toEqual([
      { accent: 'chart-1', categoryId: 'cat-groceries', name: 'Groceries', totalCents: 8000 },
      { accent: 'chart-2', categoryId: 'cat-dining', name: 'Dining', totalCents: 2000 },
    ]);
  });

  it('returns an empty array when there is no spend', () => {
    expect(spendingByCategory([], categories)).toEqual([]);
  });
});
