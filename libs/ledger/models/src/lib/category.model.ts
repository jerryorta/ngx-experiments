/** Whether a category buckets money coming in or going out. */
export type CategoryKind = 'income' | 'expense';

/**
 * A label applied to transactions and budgets — drives the spending donut's
 * slices, the category chips on Transactions, and the budget cards.
 */
export interface Category {
  /**
   * Color token/key for this category's chip and donut slice (e.g. a
   * `--chart-series-*` token name, or a literal color). Finalized once the
   * `ldg-*` design-library components land.
   */
  accent: string;
  /** Material Symbols icon name, consumed via `dlcIcon`. */
  icon?: string;
  id: string;
  kind: CategoryKind;
  name: string;
}
