import { addDays, isSameDay, startOfDay } from '@nge/date';

import type { NormalizedCalendarConfig, NormalizedCalendarEvent } from '../models';
import type {
  HourLabel,
  PositionedTimedEvent,
  TimeGridColumn,
  TimeGridViewModel,
} from './time-grid-view-model.model';

import {
  assignLanes,
  clipToDayWindow,
  eventsForDay,
  minutesFromDayStart,
  splitAllDayVsTimed,
} from '../layout';
import { buildWeekRowBars } from './build-month-view-model';

const MINUTES_PER_HOUR = 60;

/** True when an event's start and end fall on different calendar days. */
function isMultiDay(event: NormalizedCalendarEvent): boolean {
  return event.end !== null && !isSameDay(event.start, event.end);
}

/**
 * The `[dayStart, dayEnd]` instants of a column's visible time window.
 *
 * Built by mutating fresh `startOfDay` clones with `setHours` (local-time,
 * DST-aware — the same primitive date-fns uses) so the lib never constructs a
 * `Date` from a raw number and stays deterministic. `setHours(24)` correctly
 * resolves to the next local midnight for a full-day (`dayEndHour: 24`) window.
 */
function dayWindow(day: Date, config: NormalizedCalendarConfig): { end: Date; start: Date } {
  const start = startOfDay(day);
  start.setHours(config.dayStartHour);
  const end = startOfDay(day);
  end.setHours(config.dayEndHour);
  return { end, start };
}

/** The hour-line labels from `dayStartHour` through `dayEndHour` (inclusive). */
function buildHourLabels(config: NormalizedCalendarConfig): HourLabel[] {
  const labels: HourLabel[] = [];
  for (let hour = config.dayStartHour; hour <= config.dayEndHour; hour++) {
    labels.push({
      hour,
      label: formatHour(hour),
      minute: (hour - config.dayStartHour) * MINUTES_PER_HOUR,
    });
  }
  return labels;
}

/** A stable, locale-independent `HH:00` label for an hour 0..24. */
function formatHour(hour: number): string {
  const clamped = ((hour % 24) + 24) % 24;
  return `${String(clamped).padStart(2, '0')}:00`;
}

/** Position the timed events of one day column into overlap lanes. */
function positionTimedEvents(
  timed: ReadonlyArray<NormalizedCalendarEvent>,
  windowStart: Date,
  windowEnd: Date
): PositionedTimedEvent[] {
  // Clip each timed event to the visible window; drop those with no overlap.
  const clipped = timed
    .map(event => {
      const eventEnd = event.end ?? event.start;
      const window = clipToDayWindow(event.start, eventEnd, windowStart, windowEnd);
      return window === null ? null : { event, window };
    })
    .filter(
      (entry): entry is { event: NormalizedCalendarEvent; window: { end: Date; start: Date } } =>
        entry !== null
    );

  const lanes = assignLanes(clipped.map(entry => entry.window));

  return clipped.map((entry, index) => {
    const startMinute = minutesFromDayStart(entry.window.start, windowStart);
    const endMinute = minutesFromDayStart(entry.window.end, windowStart);
    const { laneCount, laneIndex } = lanes[index];
    return {
      durationMinutes: Math.max(0, endMinute - startMinute),
      endMinute,
      event: entry.event,
      leftPct: (laneIndex / laneCount) * 100,
      startMinute,
      widthPct: 100 / laneCount,
    };
  });
}

/**
 * Build the shared time-grid view model for a set of consecutive `days`
 * (7 for week, 1 for day) from an already-normalized config.
 *
 * Per column: split all-day vs timed, clip timed to the day window, pack into
 * overlap lanes → percentage left/width. All-day + multi-day events become the
 * spanning `allDayBars` strip (same shape/packing as the month view's bars).
 */
export function buildTimeGrid(
  days: ReadonlyArray<Date>,
  config: NormalizedCalendarConfig
): TimeGridViewModel {
  const totalMinutes = (config.dayEndHour - config.dayStartHour) * MINUTES_PER_HOUR;

  const columns: TimeGridColumn[] = days.map(day => {
    const window = dayWindow(day, config);
    const { allDay, timed } = splitAllDayVsTimed(eventsForDay(config.events, day));
    // Multi-day timed events render in the all-day bar strip (like Google
    // Calendar), so keep only same-day timed events as positioned blocks.
    const sameDayTimed = timed.filter(event => !isMultiDay(event));
    return {
      allDay,
      date: day,
      isAnchor: isSameDay(day, config.date),
      timed: positionTimedEvents(sameDayTimed, window.start, window.end),
    };
  });

  // All-day strip: events that render as bars (all-day, or spanning >1 day),
  // packed across the whole day range like a single month week row.
  const rowStart = startOfDay(days[0]);
  const rowEnd = startOfDay(days[days.length - 1]);
  const barEvents = collectBarEvents(config.events, rowStart, rowEnd, days.length);
  const allDayBars = buildWeekRowBars(barEvents, rowStart, rowEnd);

  return {
    allDayBars,
    columns,
    dayEndHour: config.dayEndHour,
    dayStartHour: config.dayStartHour,
    hourLabels: buildHourLabels(config),
    slotMinutes: config.slotMinutes,
    totalMinutes,
  };
}

/**
 * The events that belong in the all-day bar strip across `[rowStart, rowEnd]`:
 * all-day events and any timed event spanning more than one day. De-duplicated
 * and intersecting the range.
 */
function collectBarEvents(
  events: ReadonlyArray<NormalizedCalendarEvent>,
  rowStart: Date,
  rowEnd: Date,
  dayCount: number
): NormalizedCalendarEvent[] {
  const rangeEndExclusive = addDays(rowEnd, 1).getTime();
  const rangeStartMs = rowStart.getTime();

  return events.filter(event => {
    const isBar = event.allDay || isMultiDay(event);
    if (!isBar) {
      return false;
    }
    const eventStart = event.start.getTime();
    const eventEnd = (event.end ?? event.start).getTime();
    // Overlaps the [rowStart, rowEnd] day range (rowEnd's whole day included).
    const overlaps = eventEnd >= rangeStartMs && eventStart < rangeEndExclusive;
    // A single-day all-day event only belongs if its day is in range (covered by
    // the overlap test above); dayCount is kept for documentation/clarity.
    return overlaps && dayCount > 0;
  });
}
