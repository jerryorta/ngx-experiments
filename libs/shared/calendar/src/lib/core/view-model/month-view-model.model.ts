import type { NormalizedCalendarEvent } from '../models';

/**
 * A spanning event bar within a single month week row. `startCol`/`endCol` are
 * 0..6 columns; `span` is `endCol - startCol + 1`; `rowIndex` is the vertical
 * lane the bar occupies (from lane packing). `isStart`/`isEnd` say whether the
 * real event start/end fall inside this week row (so rounded vs flush edges).
 */
export interface MonthEventBar {
  endCol: number;
  event: NormalizedCalendarEvent;
  isEnd: boolean;
  isStart: boolean;
  rowIndex: number;
  span: number;
  startCol: number;
}

/** A single day cell in the month grid. */
export interface MonthDayCell {
  /** All single-day events for this cell, sorted by start (before overflow). */
  chips: NormalizedCalendarEvent[];
  date: Date;
  dayOfMonth: number;
  /** How many chips are hidden behind the "+N more" affordance. */
  hiddenCount: number;
  /** True when this cell is the config's anchor date. */
  isAnchor: boolean;
  /** True when this cell belongs to the previous/next month. */
  isOutOfMonth: boolean;
  /** True for Saturday/Sunday. */
  isWeekend: boolean;
  /** The first `maxEventsPerCell` chips actually rendered. */
  visible: NormalizedCalendarEvent[];
}

/** One week (row) of the month grid: its day cells plus spanning bars. */
export interface MonthWeekRow {
  bars: MonthEventBar[];
  days: MonthDayCell[];
}

/** The full month view: weekday header labels plus six week rows. */
export interface MonthViewModel {
  weekdayLabels: string[];
  weeks: MonthWeekRow[];
}
