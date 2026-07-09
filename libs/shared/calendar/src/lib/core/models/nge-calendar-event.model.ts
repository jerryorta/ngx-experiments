import type { CalendarDateInput } from './calendar-date-input.model';

/**
 * A calendar event as supplied by a consumer (public input). Dates are
 * date-like ({@link CalendarDateInput}) and most fields are optional; the
 * library coerces this into a {@link NormalizedCalendarEvent} before rendering.
 */
export interface NgeCalendarEvent<T = unknown> {
  allDay?: boolean;
  color?: string;
  /**
   * Typed domain payload that round-trips, unchanged, to the event-bearing
   * outputs (`eventClick` / `eventDrop` / `eventResize`). Supersedes `meta` for
   * new consumers; `meta` remains for ad-hoc, untyped flags.
   */
  data?: T;
  editable?: boolean;
  end?: CalendarDateInput;
  id: string;
  meta?: Record<string, unknown>;
  start: CalendarDateInput;
  title: string;
}

/**
 * A calendar event after normalisation: `start` is always a valid `Date`,
 * `end` is a `Date` or `null` (never before `start`), and the boolean/string
 * defaults have been resolved. This is the shape views and layout consume.
 */
export interface NormalizedCalendarEvent<T = unknown> {
  allDay: boolean;
  color?: string;
  /**
   * Typed domain payload that round-trips, unchanged, to the event-bearing
   * outputs (`eventClick` / `eventDrop` / `eventResize`). Supersedes `meta` for
   * new consumers; `meta` remains for ad-hoc, untyped flags.
   */
  data?: T;
  editable?: boolean;
  end: Date | null;
  id: string;
  meta?: Record<string, unknown>;
  start: Date;
  title: string;
}
