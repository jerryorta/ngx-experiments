import type { Budget, Transaction } from '@nge/ledger-models';

/** One category's budget line for a month: the limit versus what was actually spent. */
export interface CategoryBudgetActual {
  /** Positive integer minor units (cents) — copied from `Budget.limitCents`. */
  budgetCents: number;
  categoryId: string;
  /** Positive integer minor units (cents) — absolute value of that category's outflows in the month. */
  spentCents: number;
}

/**
 * Budget-vs-actual per category for `month`, backing the Budgets screen's
 * progress bars / grouped-bar chart. For every `Budget` whose `month`
 * matches, sums the absolute value of that category's outflows within the
 * same month. Categories with no budget row for `month` are simply absent —
 * callers join in category name/accent by `categoryId` themselves, which
 * keeps this signature a pure numbers-in, numbers-out reducer.
 */
export function budgetVsActual(
  budgets: readonly Budget[],
  transactions: readonly Transaction[],
  month: string
): CategoryBudgetActual[] {
  return budgets
    .filter(budget => budget.month === month)
    .map(budget => {
      const spentCents = transactions
        .filter(
          txn =>
            txn.categoryId === budget.categoryId &&
            txn.date.startsWith(month) &&
            txn.amountCents < 0
        )
        .reduce((sum, txn) => sum + Math.abs(txn.amountCents), 0);

      return {
        budgetCents: budget.limitCents,
        categoryId: budget.categoryId,
        spentCents,
      };
    });
}
