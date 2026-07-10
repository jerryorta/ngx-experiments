/** How often a bill recurs. */
export type BillRecurrence = 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'annual' | 'once';

/** Where a bill stands relative to its `dueDate`. */
export type BillStatus = 'upcoming' | 'paid' | 'overdue';

/**
 * A recurring or one-off obligation tracked on the Budgets screen's bill
 * calendar — each bill becomes an `NgeCalendarEvent`'s `data` payload.
 */
export interface Bill {
  /** Account the bill is paid from/expected to hit, if known. */
  accountId?: string;
  /** Positive integer minor units (cents). */
  amountCents: number;
  /** True if the bill is on an automatic payment plan. */
  autopay?: boolean;
  categoryId?: string;
  /** ISO `'YYYY-MM-DD'`. */
  dueDate: string;
  id: string;
  name: string;
  recurrence: BillRecurrence;
  /** Where the bill stands; defaults to `'upcoming'` when not tracked explicitly. */
  status?: BillStatus;
}
