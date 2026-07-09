import type { DateInterval } from '@nge/date';

import {
  differenceInMinutes,
  endOfDay,
  isSameDay,
  isWithinInterval,
  startOfDay,
} from '@nge/date';

import type { NormalizedCalendarEvent } from '../models';

/** An event's visible span across a 7-day week row, expressed in columns 0..6. */
export interface DaySegment {
  /** Last column (0..6, inclusive) the event covers in this row. */
  endCol: number;
  /** True when the event's real end falls inside this row. */
  isEnd: boolean;
  /** True when the event's real start falls inside this row. */
  isStart: boolean;
  /** First column (0..6, inclusive) the event covers in this row. */
  startCol: number;
}

/** A clipped time window, or `null` when there was no overlap. */
export interface ClippedWindow {
  end: Date;
  start: Date;
}

/** All-day vs timed partition of a set of events. */
export interface SplitEvents {
  allDay: NormalizedCalendarEvent[];
  timed: NormalizedCalendarEvent[];
}

/** Whole days between the days containing `later` and `earlier` (can be negative). */
function dayOffset(later: Date, earlier: Date): number {
  return Math.round(
    (startOfDay(later).getTime() - startOfDay(earlier).getTime()) / (24 * 60 * 60 * 1000)
  );
}

/**
 * Partition events into all-day and timed buckets. An event is all-day when its
 * `allDay` flag is exactly `true`; everything else is timed.
 */
export function splitAllDayVsTimed(events: ReadonlyArray<NormalizedCalendarEvent>): SplitEvents {
  const allDay: NormalizedCalendarEvent[] = [];
  const timed: NormalizedCalendarEvent[] = [];

  for (const event of events) {
    if (event.allDay === true) {
      allDay.push(event);
    } else {
      timed.push(event);
    }
  }

  return { allDay, timed };
}

/**
 * Every event that intersects the calendar day containing `day`.
 *
 * - An event with `end === null` is treated as a point at `start` and matches
 *   only the day its `start` falls on.
 * - A multi-day event matches every calendar day from its `start` day through
 *   its `end` day (inclusive). The closed-interval check uses `[startOfDay,
 *   endOfDay]`, so an event ending exactly at the next midnight is treated as
 *   touching that next day too — the same inclusive behaviour date-fns uses.
 */
export function eventsForDay(
  events: ReadonlyArray<NormalizedCalendarEvent>,
  day: Date
): NormalizedCalendarEvent[] {
  const dayWindow: DateInterval = { end: endOfDay(day), start: startOfDay(day) };

  return events.filter(event => {
    if (event.end === null) {
      return isSameDay(event.start, day);
    }
    // The event touches the day if either endpoint is inside the day window, or
    // the event spans completely over the day (start before, end after).
    return (
      isWithinInterval(event.start, dayWindow) ||
      isWithinInterval(event.end, dayWindow) ||
      (event.start.getTime() <= dayWindow.start.getTime() &&
        event.end.getTime() >= dayWindow.end.getTime())
    );
  });
}

/**
 * Intersect the time window `[start, end]` with the day window `[dayStart,
 * dayEnd]`. Returns the clipped window, or `null` when the two do not overlap.
 */
export function clipToDayWindow(
  start: Date,
  end: Date,
  dayStart: Date,
  dayEnd: Date
): ClippedWindow | null {
  // Return the actual boundary instances (later start, earlier end) rather than
  // constructing new Dates — keeps the lib deterministic and identity-stable.
  const clippedStart = start.getTime() >= dayStart.getTime() ? start : dayStart;
  const clippedEnd = end.getTime() <= dayEnd.getTime() ? end : dayEnd;

  if (clippedEnd.getTime() <= clippedStart.getTime()) {
    return null;
  }

  return { end: clippedEnd, start: clippedStart };
}

/**
 * Project an event onto a 7-day week row spanning `[rangeStart, rangeEnd]`
 * (`rangeStart` is the first column, day 0). The returned `startCol`/`endCol`
 * are clamped to `0..6`; `isStart`/`isEnd` report whether the event's real
 * start/end fall inside this row.
 *
 * `rangeEnd` is the start-of-day of the row's last (7th) column.
 */
export function daySegmentsInRange(
  event: NormalizedCalendarEvent,
  rangeStart: Date,
  rangeEnd: Date
): DaySegment {
  const lastCol = dayOffset(rangeEnd, rangeStart);

  // Treat a null end as a point at start for span purposes.
  const eventEnd = event.end ?? event.start;

  const rawStartCol = dayOffset(event.start, rangeStart);
  const rawEndCol = dayOffset(eventEnd, rangeStart);

  const startCol = Math.max(0, Math.min(lastCol, rawStartCol));
  const endCol = Math.max(0, Math.min(lastCol, rawEndCol));

  return {
    endCol,
    isEnd: rawEndCol >= 0 && rawEndCol <= lastCol,
    isStart: rawStartCol >= 0 && rawStartCol <= lastCol,
    startCol,
  };
}

/** Whole minutes from `dayStart` to `instant` (`instant - dayStart`). */
export function minutesFromDayStart(instant: Date, dayStart: Date): number {
  return differenceInMinutes(instant, dayStart);
}
