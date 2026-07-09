import type { NgeCalendarView } from './nge-calendar-config.model';
import type { NormalizedCalendarEvent } from './nge-calendar-event.model';

/** Emitted when the user activates (clicks) an event. */
export interface EventClick<T = unknown> {
  event: NormalizedCalendarEvent<T>;
}

/** Emitted when the user drags an event to a new time. */
export interface EventDrop<T = unknown> {
  event: NormalizedCalendarEvent<T>;
  newEnd: Date | null;
  newStart: Date;
}

/** Emitted when the user resizes an event by its end edge. */
export interface EventResize<T = unknown> {
  event: NormalizedCalendarEvent<T>;
  newEnd: Date;
}

/** Emitted when the visible date range changes (paging, view switch, etc.). */
export interface RangeChange {
  end: Date;
  start: Date;
}

/** Emitted when the user activates (clicks) an empty time slot. */
export interface SlotClick {
  end: Date;
  start: Date;
}

/** Emitted when the active view and/or its anchor date changes. */
export interface ViewChange {
  date: Date;
  view: NgeCalendarView;
}
