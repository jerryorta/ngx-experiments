import type { Transaction } from '@nge/ledger-models';

import type { IsoDateRange } from './date-range.model';

/** One month's cash movement: total in, total out, and the net. */
export interface CashflowPeriod {
  /** Positive integer minor units (cents) — sum of that period's positive amounts. */
  inflowCents: number;
  /** Signed integer minor units (cents) — `inflowCents - outflowCents`. */
  netCents: number;
  /** Positive integer minor units (cents) — sum of the absolute value of that period's negative amounts. */
  outflowCents: number;
  /** ISO `'YYYY-MM'`. */
  period: string;
}

/** Options for {@link cashflow}. */
export interface CashflowOptions {
  range?: IsoDateRange;
}

/**
 * Monthly inflow/outflow/net, for the Overview cashflow chart (a composite
 * bar + line). Buckets every transaction by the `'YYYY-MM'` prefix of its
 * date, splitting each into `inflowCents` or `outflowCents` per the sign of
 * `amountCents`. Periods are returned in chronological order and only
 * appear if at least one transaction falls in them — no zero-filled gap
 * months.
 */
export function cashflow(
  transactions: readonly Transaction[],
  opts: CashflowOptions = {}
): CashflowPeriod[] {
  const range = opts.range;
  const inRange = range
    ? transactions.filter(txn => txn.date >= range.start && txn.date <= range.end)
    : transactions;

  const byPeriod = new Map<string, { inflowCents: number; outflowCents: number }>();

  for (const txn of inRange) {
    const period = txn.date.slice(0, 7);
    const bucket = byPeriod.get(period) ?? { inflowCents: 0, outflowCents: 0 };

    if (txn.amountCents >= 0) {
      bucket.inflowCents += txn.amountCents;
    } else {
      bucket.outflowCents += Math.abs(txn.amountCents);
    }

    byPeriod.set(period, bucket);
  }

  return [...byPeriod.entries()]
    .sort(([periodA], [periodB]) => (periodA < periodB ? -1 : periodA > periodB ? 1 : 0))
    .map(([period, totals]) => ({
      inflowCents: totals.inflowCents,
      netCents: totals.inflowCents - totals.outflowCents,
      outflowCents: totals.outflowCents,
      period,
    }));
}
