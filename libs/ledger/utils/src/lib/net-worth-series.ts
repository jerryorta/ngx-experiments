import type { Account, Transaction } from '@nge/ledger-models';

import type { IsoDateRange } from './date-range.model';

/** One point on the net-worth trend line: total balance as of `date`. */
export interface NetWorthPoint {
  date: string;
  valueCents: number;
}

/** Options for {@link netWorthSeries}. */
export interface NetWorthSeriesOptions {
  /** Narrows the series to this window. Defaults to the transactions' own first..last date. */
  range?: IsoDateRange;
}

/**
 * Cumulative net worth over time, for the Overview trend line. Every
 * account's `balanceCents` already reflects the *current* moment, so each
 * historical point is reconstructed by walking that total backwards:
 * `valueCents(date) = currentTotal - Σ(amountCents of transactions after date)`.
 * One point is emitted per distinct transaction date (in range) — enough
 * resolution for a trend line without inventing values for days nothing
 * happened, and correct for any mix of account currencies since balances are
 * simply summed.
 *
 * Deliberately does NOT round-trip dates through `Date`/date-fns:
 * `Transaction.date` and `IsoDateRange` are calendar-day strings, and
 * reparsing one as a `Date` then reformatting it can shift by a day under
 * date-fns' local-time getters, depending on the runtime's timezone. Plain
 * string comparisons are exact and timezone-proof for `'YYYY-MM-DD'` values.
 */
export function netWorthSeries(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
  opts: NetWorthSeriesOptions = {}
): NetWorthPoint[] {
  if (transactions.length === 0) {
    return [];
  }

  const currentTotalCents = accounts.reduce((sum, account) => sum + account.balanceCents, 0);
  const distinctDates = [...new Set(transactions.map(txn => txn.date))].sort();

  const range = opts.range;
  const start = range?.start ?? distinctDates[0];
  const end = range?.end ?? distinctDates[distinctDates.length - 1];

  return distinctDates
    .filter(date => date >= start && date <= end)
    .map(date => ({
      date,
      valueCents: currentTotalCents - sumAmountsAfter(transactions, date),
    }));
}

/** Sum of `amountCents` for every transaction strictly after `date` (exclusive). */
function sumAmountsAfter(transactions: readonly Transaction[], date: string): number {
  return transactions.reduce((sum, txn) => (txn.date > date ? sum + txn.amountCents : sum), 0);
}
