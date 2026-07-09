import type {
  NgeCalendarEvent,
  NormalizedCalendarEvent,
} from '../models/nge-calendar-event.model';

import { coerceToDate } from './coerce-date';

/**
 * Normalise a single {@link NgeCalendarEvent} into a
 * {@link NormalizedCalendarEvent}, or return `null` when the event cannot be
 * rendered.
 *
 * Pure and total — never throws. An event is dropped (`null`) when it is
 * missing, has no non-empty string `id`, or has a `start` that cannot be
 * coerced to a valid `Date`. An `end` that is invalid or falls before `start`
 * is discarded (`end` becomes `null`). `allDay` is coerced to a boolean and
 * `title` defaults to `''`; `color`, `data`, `editable` and `meta` pass through.
 */
export function normalizeEvent<T = unknown>(
  event: NgeCalendarEvent<T>
): NormalizedCalendarEvent<T> | null {
  if (!event || typeof event.id !== 'string' || !event.id) {
    return null;
  }

  const start = coerceToDate(event.start);
  if (start === null) {
    return null;
  }

  let end = coerceToDate(event.end);
  if (end !== null && end < start) {
    end = null;
  }

  return {
    allDay: !!event.allDay,
    color: event.color,
    data: event.data,
    editable: event.editable,
    end,
    id: event.id,
    meta: event.meta,
    start,
    title: event.title ?? '',
  };
}
