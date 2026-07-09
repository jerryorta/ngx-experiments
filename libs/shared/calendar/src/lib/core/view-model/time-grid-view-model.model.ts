import type { NormalizedCalendarEvent } from '../models';
import type { MonthEventBar } from './month-view-model.model';

/**
 * A timed event placed inside a day column. Vertical position comes from the
 * minute offsets (relative to the column's day-start window); horizontal
 * position/width come from the overlap lane it was packed into.
 */
export interface PositionedTimedEvent {
  /** `endMinute - startMinute`, never negative. */
  durationMinutes: number;
  /** Minutes from the day-window start to the (clipped) event end. */
  endMinute: number;
  event: NormalizedCalendarEvent;
  /** Left edge as a percentage of the column width (`laneIndex / laneCount`). */
  leftPct: number;
  /** Minutes from the day-window start to the (clipped) event start. */
  startMinute: number;
  /** Width as a percentage of the column width (`100 / laneCount`). */
  widthPct: number;
}

/** A single hour gridline label down the time axis. */
export interface HourLabel {
  hour: number;
  label: string;
  /** Minutes from the day-window start to this hour line. */
  minute: number;
}

/** One day column of the time grid (used by both week and day views). */
export interface TimeGridColumn {
  allDay: NormalizedCalendarEvent[];
  date: Date;
  isAnchor: boolean;
  timed: PositionedTimedEvent[];
}

/**
 * The shared week/day time-grid view model. `columns` is one entry per day
 * (7 for week, 1 for day); `allDayBars` are the spanning all-day/multi-day bars
 * rendered across the top, reusing the month bar shape.
 */
export interface TimeGridViewModel {
  allDayBars: MonthEventBar[];
  columns: TimeGridColumn[];
  dayEndHour: number;
  dayStartHour: number;
  hourLabels: HourLabel[];
  slotMinutes: number;
  /** `(dayEndHour - dayStartHour) * 60` — the vertical extent of the grid. */
  totalMinutes: number;
}
