/**
 * An inclusive ISO `'YYYY-MM-DD'` bound pair used to scope the aggregation
 * helpers to a date window (e.g. "last 90 days" on the Overview screen).
 * String-based and inclusive on both ends so callers can compare directly
 * against `Transaction.date`/`Bill.dueDate` without parsing a `Date`.
 */
export interface IsoDateRange {
  end: string;
  start: string;
}
