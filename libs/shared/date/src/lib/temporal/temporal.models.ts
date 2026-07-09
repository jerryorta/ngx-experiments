/**
 * A closed interval between two instants (`start` <= `end`). The shared temporal
 * primitive reused by the calendar (and future charts time-series). Distinct
 * from date-fns' own `Interval` (which also allows numbers) — strictly `Date`.
 */
export interface DateInterval {
  end: Date;
  start: Date;
}

/** Alias for {@link DateInterval} — use whichever reads better at the call site. */
export type DateRange = DateInterval;

/**
 * The day a week starts on, locale-style: `0` = Sunday … `6` = Saturday.
 * Matches date-fns' `weekStartsOn` option.
 */
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * A month rendered as a grid of weeks — rows of 7 day columns (`Date[][]`),
 * padded with leading/trailing days so every row is a full week. Produced by
 * {@link getMonthMatrix}.
 */
export type MonthMatrix = Date[][];
