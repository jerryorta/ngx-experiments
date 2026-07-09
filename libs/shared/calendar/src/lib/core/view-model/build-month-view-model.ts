import {
  addDays,
  getMonthMatrix,
  getWeekDays,
  isSameDay,
  isSameMonth,
  startOfDay,
} from '@nge/date';

import type { NormalizedCalendarConfig, NormalizedCalendarEvent } from '../models';
import type {
  MonthDayCell,
  MonthEventBar,
  MonthViewModel,
  MonthWeekRow,
} from './month-view-model.model';

import { assignLanes, daySegmentsInRange, eventsForDay } from '../layout';

/** Default number of chips shown in a month cell before "+N more" kicks in. */
const DEFAULT_MAX_EVENTS_PER_CELL = 3;

const SATURDAY = 6;
const SUNDAY = 0;

/** Options for {@link buildMonthViewModel}. */
export interface BuildMonthViewModelOptions {
  /** Max chips per cell before overflow; defaults to 3. */
  maxEventsPerCell?: number;
}

/**
 * True when an event should render as a horizontal **bar** across a week row
 * rather than as a per-cell chip. Bars are all-day events (the full-width
 * all-day pill — even a single day) and any event that spans more than one
 * calendar day. Single-day **timed** events become chips.
 */
function isBarEvent(event: NormalizedCalendarEvent): boolean {
  if (event.allDay) {
    return true;
  }
  if (event.end === null) {
    return false;
  }
  return !isSameDay(event.start, event.end);
}

/**
 * Build the spanning `MonthEventBar`s for a single week row `[rowStart,
 * rowEnd]` (rowEnd is the start-of-day of the 7th column). Bars are vertically
 * packed into lanes (via {@link assignLanes}) so overlapping spans stack.
 *
 * Exported for reuse by the time-grid all-day bar strip (week/day views).
 */
export function buildWeekRowBars(
  barEvents: ReadonlyArray<NormalizedCalendarEvent>,
  rowStart: Date,
  rowEnd: Date
): MonthEventBar[] {
  if (barEvents.length === 0) {
    return [];
  }

  const segments = barEvents.map(event => daySegmentsInRange(event, rowStart, rowEnd));

  // Pack bars into vertical lanes by their column span. Columns are projected to
  // real day instants (via addDays) so the span is a 1-D interval: a bar covers
  // `[startCol, endCol + 1)` days, letting two bars on disjoint columns share a
  // lane. Built from `rowStart` (no `new Date`) to keep the lib deterministic.
  const lanes = assignLanes(
    segments.map(segment => ({
      end: addDays(rowStart, segment.endCol + 1),
      start: addDays(rowStart, segment.startCol),
    }))
  );

  return barEvents.map((event, index) => {
    const segment = segments[index];
    return {
      endCol: segment.endCol,
      event,
      isEnd: segment.isEnd,
      isStart: segment.isStart,
      rowIndex: lanes[index].laneIndex,
      span: segment.endCol - segment.startCol + 1,
      startCol: segment.startCol,
    };
  });
}

/** Sort events by start ascending (stable), tie-break on end then id. */
function byStart(left: NormalizedCalendarEvent, right: NormalizedCalendarEvent): number {
  const startDiff = left.start.getTime() - right.start.getTime();
  if (startDiff !== 0) {
    return startDiff;
  }
  const leftEnd = (left.end ?? left.start).getTime();
  const rightEnd = (right.end ?? right.start).getTime();
  if (leftEnd !== rightEnd) {
    return leftEnd - rightEnd;
  }
  return left.id.localeCompare(right.id);
}

/**
 * Build the month {@link MonthViewModel} from an already-normalized config.
 *
 * Grid comes from {@link getMonthMatrix} (always 6×7). For each week row,
 * spanning/all-day events become `bars`; single-day timed events fall into the
 * matching cell's `chips`. Cells over `maxEventsPerCell` collapse the overflow
 * into `hiddenCount` with the first N kept in `visible`.
 */
export function buildMonthViewModel(
  config: NormalizedCalendarConfig,
  opts?: BuildMonthViewModelOptions
): MonthViewModel {
  const maxEventsPerCell = opts?.maxEventsPerCell ?? DEFAULT_MAX_EVENTS_PER_CELL;
  const matrix = getMonthMatrix(config.date, config.weekStartsOn);

  const barEvents = config.events.filter(isBarEvent);
  const chipEvents = config.events.filter(event => !isBarEvent(event));

  const weeks: MonthWeekRow[] = matrix.map(rowDays => {
    const rowStart = startOfDay(rowDays[0]);
    const rowEnd = startOfDay(rowDays[rowDays.length - 1]);

    // Bars: spanning/all-day events that intersect this row at all.
    const rowBarEvents = barEvents.filter(event => {
      const segment = daySegmentsInRange(event, rowStart, rowEnd);
      // Visible in the row when its clamped span actually touches a column the
      // event covers — i.e. the real start is at/left of the last col and the
      // real end is at/right of the first col.
      return rowIntersects(event, rowStart, rowEnd) && segment.endCol >= segment.startCol;
    });
    const bars = buildWeekRowBars(rowBarEvents, rowStart, rowEnd);

    const days: MonthDayCell[] = rowDays.map(cellDate => {
      const dayOfWeek = cellDate.getDay();
      const chips = eventsForDay(chipEvents, cellDate).sort(byStart);
      const visible = chips.slice(0, maxEventsPerCell);
      const hiddenCount = Math.max(0, chips.length - visible.length);

      return {
        chips,
        date: cellDate,
        dayOfMonth: cellDate.getDate(),
        hiddenCount,
        isAnchor: isSameDay(cellDate, config.date),
        isOutOfMonth: !isSameMonth(cellDate, config.date),
        isWeekend: dayOfWeek === SATURDAY || dayOfWeek === SUNDAY,
        visible,
      };
    });

    return { bars, days };
  });

  return {
    weekdayLabels: getWeekDays(config.weekStartsOn, config.locale),
    weeks,
  };
}

/** True when an event's day span overlaps the inclusive day range of the row. */
function rowIntersects(event: NormalizedCalendarEvent, rowStart: Date, rowEnd: Date): boolean {
  const eventStartDay = startOfDay(event.start).getTime();
  const eventEndDay = startOfDay(event.end ?? event.start).getTime();
  return eventEndDay >= rowStart.getTime() && eventStartDay <= rowEnd.getTime();
}
