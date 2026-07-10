/**
 * A spending limit for one category in one calendar month — the target half
 * of `budgetVsActual`'s budget-vs-actual comparison on the Budgets screen.
 */
export interface Budget {
  categoryId: string;
  id: string;
  /** Positive integer minor units (cents) — the spending ceiling for the month. */
  limitCents: number;
  /** ISO `'YYYY-MM'`. */
  month: string;
}
