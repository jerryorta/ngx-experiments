import type { NgeCalendarView } from './nge-calendar-config.model';
import type { NormalizedCalendarEvent } from './nge-calendar-event.model';

/**
 * The typed `$implicit` context handed to an event-click overlay template
 * (ARCH-147). The shell builds this from `store.selectedEvent()` and renders it
 * via `ngTemplateOutlet` — either into the default body or a host-supplied
 * `#ngeCalendarEventOverlay` `TemplateRef`.
 *
 * `data` is recovered on `event.data` through the generic `T` (ARCH-146), so a
 * host custom template reading `event.data?.<field>` is strict-template checked.
 */
export interface NgeCalendarEventOverlayContext<T = unknown> {
  /** Same as {@link event} — the implicit `let-event` binding. */
  $implicit: NormalizedCalendarEvent<T>;
  /** Closes the overlay (clears the store selection). Bind to a close button. */
  close: () => void;
  /** The selected event whose details the overlay renders. */
  event: NormalizedCalendarEvent<T>;
  /** The active calendar view at the moment the overlay opened. */
  view: NgeCalendarView;
}
