import type { NormalizedCalendarEvent } from '../models';

/**
 * One day in the compact mobile month-agenda layout (ARCH-148): the day's date
 * (start-of-day) plus the events that START on that day, already ordered
 * (all-day first, then by `start` ascending). Generic over the event payload
 * `T` so consumers recover their typed `event.data<T>`.
 */
export interface MonthAgendaDayGroup<T = unknown> {
  date: Date;
  events: NormalizedCalendarEvent<T>[];
}

/**
 * The compact mobile month-agenda view-model (ARCH-148): a chronological list
 * of day groups, containing ONLY the days in the visible month that have at
 * least one event. The component is responsible for any locale formatting —
 * this view-model is pure data.
 */
export interface MonthAgendaViewModel<T = unknown> {
  days: MonthAgendaDayGroup<T>[];
}
