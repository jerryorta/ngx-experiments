import type { Category, Transaction } from '@nge/ledger-models';

import type { IsoDateRange } from './date-range.model';

/** One donut-chart slice: total spend in a single expense category. */
export interface CategorySpending {
  accent: string;
  categoryId: string;
  name: string;
  /** Positive integer minor units (cents). */
  totalCents: number;
}

/**
 * Total spend per expense category, for the Overview screen's spending
 * donut. Sums the absolute value of every outflow (`amountCents < 0`) booked
 * to each `kind: 'expense'` category, optionally narrowed to `range`.
 * Income categories, and expense categories with zero spend in range, are
 * omitted — a donut has no use for empty slices. Results are sorted
 * largest-first so the biggest slice renders first.
 */
export function spendingByCategory(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  range?: IsoDateRange
): CategorySpending[] {
  const totalsByCategory = new Map<string, number>();

  for (const txn of transactions) {
    if (txn.amountCents >= 0) continue;
    if (range && (txn.date < range.start || txn.date > range.end)) continue;

    const priorTotal = totalsByCategory.get(txn.categoryId) ?? 0;
    totalsByCategory.set(txn.categoryId, priorTotal + Math.abs(txn.amountCents));
  }

  return categories
    .filter(category => category.kind === 'expense')
    .map(category => ({
      accent: category.accent,
      categoryId: category.id,
      name: category.name,
      totalCents: totalsByCategory.get(category.id) ?? 0,
    }))
    .filter(entry => entry.totalCents > 0)
    .sort((a, b) => b.totalCents - a.totalCents);
}
