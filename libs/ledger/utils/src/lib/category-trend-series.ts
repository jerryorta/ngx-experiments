import type { Transaction } from '@nge/ledger-models';

/**
 * How many points one trend window carries by default — twelve, a sparkline's
 * worth, and the same length `@nge/table`'s own fixture uses for its in-cell
 * chart column.
 *
 * Fixed rather than per-row, and that half is load-bearing: a varying length
 * would make the x-axis domain of an in-cell chart differ row to row, so two
 * cells in the same column could no longer be read against each other. A window
 * shorter than this only occurs at the head of a category, where there is
 * genuinely less history to show.
 */
export const LEDGER_TREND_LENGTH = 12;

/** Arguments to {@link categoryTrendSeries}. */
export interface CategoryTrendOptions {
  /** Points per window. Defaults to {@link LEDGER_TREND_LENGTH}. */
  length?: number;
}

/**
 * Per-transaction spend context: for each transaction, the magnitudes of the
 * trailing run of transactions in the **same category**, oldest first, ending
 * with the transaction itself.
 *
 * Answers "how does this charge sit against recent activity in its category?",
 * which is what an in-cell sparkline on a transactions table is for — the row's
 * own amount is the series' last point, so the sparkline's end dot marks it.
 *
 * **Category, not merchant, and the choice is what makes the column worth
 * drawing.** A merchant's history is a handful of near-identical charges, so a
 * per-merchant series is a flat line for most of the ledger; a category
 * accumulates every merchant booked to it, so its run actually moves.
 *
 * **Magnitudes (`Math.abs`), not signed cents.** `amountCents` is signed by the
 * convention every other helper here keys off (negative is outflow), and a
 * sparkline mixing the two would draw an income category as a mirror image of an
 * expense one. Callers that need the direction have the transaction.
 *
 * Ordering inside a category is by ISO date, tie-broken by `id`, so the result
 * is deterministic for a seed that books several transactions on one day. The
 * input array is never mutated.
 *
 * @returns Transaction id → its window. Every supplied transaction gets an
 * entry, and every window holds at least one point (the transaction itself).
 */
export function categoryTrendSeries(
  transactions: readonly Transaction[],
  options: CategoryTrendOptions = {}
): Map<string, number[]> {
  const { length = LEDGER_TREND_LENGTH } = options;
  const byCategory = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    const group = byCategory.get(txn.categoryId);
    if (group) {
      group.push(txn);
    } else {
      byCategory.set(txn.categoryId, [txn]);
    }
  }

  const seriesById = new Map<string, number[]>();

  for (const group of byCategory.values()) {
    // Sorting the per-category bucket rather than the argument: the buckets are
    // arrays this function built, so nothing a caller holds is reordered.
    group.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));

    const magnitudes = group.map(txn => Math.abs(txn.amountCents));

    group.forEach((txn, index) => {
      seriesById.set(txn.id, magnitudes.slice(Math.max(0, index - length + 1), index + 1));
    });
  }

  return seriesById;
}
