import type { Transaction } from '@nge/ledger-models';

import { categoryTrendSeries, LEDGER_TREND_LENGTH } from './category-trend-series';

function txn(id: string, categoryId: string, date: string, amountCents: number): Transaction {
  return { accountId: 'a1', amountCents, categoryId, date, id, merchant: 'Merchant' };
}

const transactions: Transaction[] = [
  txn('t1', 'cat-groceries', '2026-01-05', -4000),
  txn('t2', 'cat-dining', '2026-01-06', -2500),
  txn('t3', 'cat-groceries', '2026-01-12', -4500),
  txn('t4', 'cat-groceries', '2026-01-19', -5000),
  txn('t5', 'cat-salary', '2026-01-01', 350000),
];

describe('categoryTrendSeries', () => {
  it('gives every transaction the trailing run of its own category, ending with itself', () => {
    const series = categoryTrendSeries(transactions);

    expect(series.get('t1')).toEqual([4000]);
    expect(series.get('t3')).toEqual([4000, 4500]);
    expect(series.get('t4')).toEqual([4000, 4500, 5000]);
  });

  it('keeps categories apart', () => {
    const series = categoryTrendSeries(transactions);

    expect(series.get('t2')).toEqual([2500]);
    expect(series.get('t5')).toEqual([350000]);
  });

  it('reports magnitudes, so an income series is not a mirror of an expense one', () => {
    const series = categoryTrendSeries(transactions);

    expect(series.get('t5')?.every(point => point > 0)).toBe(true);
    expect(series.get('t4')?.every(point => point > 0)).toBe(true);
  });

  it('windows to at most `length` points', () => {
    const long = Array.from({ length: 20 }, (_value, index) =>
      txn(`t${index}`, 'cat-groceries', `2026-01-${String(index + 1).padStart(2, '0')}`, -(index + 1) * 100)
    );

    const series = categoryTrendSeries(long);

    expect(series.get('t19')).toHaveLength(LEDGER_TREND_LENGTH);
    // The window ends on the transaction itself: t19 is -2000, t8 is -900.
    expect(series.get('t19')?.at(-1)).toBe(2000);
    expect(series.get('t19')?.at(0)).toBe(900);
  });

  it('honours an explicit length', () => {
    const series = categoryTrendSeries(transactions, { length: 2 });

    expect(series.get('t4')).toEqual([4500, 5000]);
  });

  it('orders by date, then by id, regardless of input order', () => {
    const shuffled = [
      txn('t-c', 'cat-groceries', '2026-01-10', -300),
      txn('t-a', 'cat-groceries', '2026-01-05', -100),
      txn('t-b', 'cat-groceries', '2026-01-05', -200),
    ];

    expect(categoryTrendSeries(shuffled).get('t-c')).toEqual([100, 200, 300]);
  });

  it('never mutates the array it is handed', () => {
    const input = [...transactions];
    categoryTrendSeries(input);

    expect(input).toEqual(transactions);
  });

  it('returns an empty map for no transactions', () => {
    expect(categoryTrendSeries([]).size).toBe(0);
  });
});
