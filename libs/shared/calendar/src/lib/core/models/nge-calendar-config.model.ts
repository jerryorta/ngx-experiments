import type { WeekStartsOn } from '@nge/date';

import type { CalendarDateInput } from './calendar-date-input.model';
import type { NgeCalendarEvent, NormalizedCalendarEvent } from './nge-calendar-event.model';
import type { NgeCalendarTheme } from './nge-calendar-theme.model';

/** The calendar layout the consumer wants rendered. */
export type NgeCalendarView = 'day' | 'month' | 'week' | 'year';

/**
 * The full calendar configuration as supplied by a consumer (public input).
 * Only `view`, `date` and `events` are required; everything else has a default
 * applied by `normalizeConfig` to produce a {@link NormalizedCalendarConfig}.
 */
export interface NgeCalendarConfig<T = unknown> {
  date: CalendarDateInput;
  dayEndHour?: number;
  dayStartHour?: number;
  editable?: boolean;
  /**
   * Host-supplied cross-view event filter predicate (ARCH-149). When present it
   * takes precedence over the library's default-facet filter and narrows the
   * events rendered by EVERY view. Read directly off the public config (like
   * {@link eventOverlay}) — it is NOT carried into `NormalizedCalendarConfig`/
   * `normalizeConfig`/`defaults`.
   */
  eventFilter?: (event: NormalizedCalendarEvent<T>) => boolean;
  /**
   * Opt OUT of the event-click overlay popup (ARCH-147). Defaults to `true`
   * (the overlay opens on selection). This is a shell-behaviour flag read
   * directly off the public config (like {@link theme}) — it is NOT carried
   * into `NormalizedCalendarConfig`/`normalizeConfig`/`defaults`.
   */
  eventOverlay?: boolean;
  events: NgeCalendarEvent<T>[];
  locale?: string;
  /**
   * The month-view layout variant (ARCH-148). `'grid'` (default) renders the
   * classic 6×7 calendar grid; `'agenda'` renders the compact mobile
   * day-grouped agenda list. Normalised to a concrete value by `normalizeConfig`.
   */
  monthLayout?: 'agenda' | 'grid';
  slotMinutes?: number;
  theme?: NgeCalendarTheme;
  view: NgeCalendarView;
  weekStartsOn?: WeekStartsOn;
}

/**
 * The calendar configuration after normalisation: `date` is a valid `Date`,
 * `events` are all valid {@link NormalizedCalendarEvent}s, and every optional
 * tuning knob has a concrete default. This is the shape the store/layout use.
 */
export interface NormalizedCalendarConfig<T = unknown> {
  date: Date;
  dayEndHour: number;
  dayStartHour: number;
  editable: boolean;
  events: NormalizedCalendarEvent<T>[];
  locale?: string;
  /** The month-view layout variant (ARCH-148); `'grid'` is the default. */
  monthLayout: 'agenda' | 'grid';
  slotMinutes: number;
  theme?: NgeCalendarTheme;
  view: NgeCalendarView;
  weekStartsOn: WeekStartsOn;
}
