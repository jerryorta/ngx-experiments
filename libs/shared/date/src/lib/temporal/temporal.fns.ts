import {
  addDays as dfAddDays,
  addMonths as dfAddMonths,
  addWeeks as dfAddWeeks,
  addYears as dfAddYears,
  differenceInHours as dfDifferenceInHours,
  differenceInMinutes as dfDifferenceInMinutes,
  eachDayOfInterval as dfEachDayOfInterval,
  eachHourOfInterval as dfEachHourOfInterval,
  endOfDay as dfEndOfDay,
  endOfMonth as dfEndOfMonth,
  endOfWeek as dfEndOfWeek,
  endOfYear as dfEndOfYear,
  isSameDay as dfIsSameDay,
  isSameMonth as dfIsSameMonth,
  isWithinInterval as dfIsWithinInterval,
  startOfDay as dfStartOfDay,
  startOfMonth as dfStartOfMonth,
  startOfWeek as dfStartOfWeek,
  startOfYear as dfStartOfYear,
} from 'date-fns';

import type { DateInterval, MonthMatrix, WeekStartsOn } from './temporal.models';

// ── start-of / end-of boundaries ───────────────────────────────────────────

/** Start of the calendar day (00:00:00.000) containing `date`. */
export function startOfDay(date: Date): Date {
  return dfStartOfDay(date);
}

/** End of the calendar day (23:59:59.999) containing `date`. */
export function endOfDay(date: Date): Date {
  return dfEndOfDay(date);
}

/** Start of the week containing `date`, with weeks starting on `weekStartsOn`. */
export function startOfWeek(date: Date, weekStartsOn: WeekStartsOn = 0): Date {
  return dfStartOfWeek(date, { weekStartsOn });
}

/** End of the week containing `date`, with weeks starting on `weekStartsOn`. */
export function endOfWeek(date: Date, weekStartsOn: WeekStartsOn = 0): Date {
  return dfEndOfWeek(date, { weekStartsOn });
}

/** First day (00:00) of the month containing `date`. */
export function startOfMonth(date: Date): Date {
  return dfStartOfMonth(date);
}

/** Last moment of the month containing `date`. */
export function endOfMonth(date: Date): Date {
  return dfEndOfMonth(date);
}

/** First moment (Jan 1, 00:00) of the year containing `date`. */
export function startOfYear(date: Date): Date {
  return dfStartOfYear(date);
}

/** Last moment of the year containing `date`. */
export function endOfYear(date: Date): Date {
  return dfEndOfYear(date);
}

// ── arithmetic ───────────────────────────────────────────────────────────────

/** `date` shifted by `amount` days (negative subtracts). */
export function addDays(date: Date, amount: number): Date {
  return dfAddDays(date, amount);
}

/** `date` shifted by `amount` weeks (negative subtracts). */
export function addWeeks(date: Date, amount: number): Date {
  return dfAddWeeks(date, amount);
}

/** `date` shifted by `amount` months (negative subtracts). */
export function addMonths(date: Date, amount: number): Date {
  return dfAddMonths(date, amount);
}

/** `date` shifted by `amount` years (negative subtracts). */
export function addYears(date: Date, amount: number): Date {
  return dfAddYears(date, amount);
}

// ── comparisons ──────────────────────────────────────────────────────────────

/** True if `left` and `right` fall on the same calendar day. */
export function isSameDay(left: Date, right: Date): boolean {
  return dfIsSameDay(left, right);
}

/** True if `left` and `right` fall in the same calendar month (and year). */
export function isSameMonth(left: Date, right: Date): boolean {
  return dfIsSameMonth(left, right);
}

/** True if `date` falls within `interval`, inclusive of both ends. */
export function isWithinInterval(date: Date, interval: DateInterval): boolean {
  return dfIsWithinInterval(date, interval);
}

// ── differences ──────────────────────────────────────────────────────────────

/** Whole minutes between the two instants (`left - right`). */
export function differenceInMinutes(left: Date, right: Date): number {
  return dfDifferenceInMinutes(left, right);
}

/** Whole hours between the two instants (`left - right`). */
export function differenceInHours(left: Date, right: Date): number {
  return dfDifferenceInHours(left, right);
}

// ── interval generators ──────────────────────────────────────────────────────

/** Every calendar day in `interval`, inclusive of both ends. */
export function eachDayOfInterval(interval: DateInterval): Date[] {
  return dfEachDayOfInterval(interval);
}

/** Every hour boundary in `interval`, inclusive of both ends. */
export function eachHourOfInterval(interval: DateInterval): Date[] {
  return dfEachHourOfInterval(interval);
}

// ── composites ───────────────────────────────────────────────────────────────

/**
 * Build the calendar grid for the month containing `date`, with weeks starting
 * on `weekStartsOn`. Always a fixed **6 rows × 7 columns** so the grid height is
 * stable month-to-month; leading/trailing cells spill into the adjacent months.
 */
export function getMonthMatrix(date: Date, weekStartsOn: WeekStartsOn = 0): MonthMatrix {
  const gridStart = startOfWeek(startOfMonth(date), weekStartsOn);
  const weeks: MonthMatrix = [];

  for (let week = 0; week < 6; week++) {
    const row: Date[] = [];
    for (let day = 0; day < 7; day++) {
      row.push(addDays(gridStart, week * 7 + day));
    }
    weeks.push(row);
  }

  return weeks;
}

/**
 * The seven weekday labels in display order, starting on `weekStartsOn`,
 * formatted short in `locale` (defaults to the runtime locale). Example:
 * `getWeekDays(1, 'en-US')` → `['Mon','Tue','Wed','Thu','Fri','Sat','Sun']`.
 */
export function getWeekDays(weekStartsOn: WeekStartsOn = 0, locale?: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const labels: string[] = [];

  for (let index = 0; index < 7; index++) {
    // 2023-01-01 is a Sunday (getDay() === 0); offset from it by the requested start.
    labels.push(formatter.format(new Date(2023, 0, 1 + ((weekStartsOn + index) % 7))));
  }

  return labels;
}
