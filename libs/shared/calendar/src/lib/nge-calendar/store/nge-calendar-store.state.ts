import type { EventDrop, EventResize, SlotClick } from '../../core/models/calendar-output.model';
import type {
  NgeCalendarConfig,
  NgeCalendarView,
} from '../../core/models/nge-calendar-config.model';
import type {
  NgeCalendarEventPredicate,
  NgeCalendarFilter,
} from '../../core/models/nge-calendar-filter.model';

import { DEFAULT_GIGA_CALENDAR_FILTER } from '../../core/models/nge-calendar-filter.model';

/**
 * In-flight drag/resize interaction state. Deltas are captured raw while the
 * pointer moves and only snapped to `slotMinutes` on commit, so a gesture stays
 * smooth and the snapped result is computed once at the end.
 */
export interface CalendarDragState {
  /** Horizontal (day) delta in whole days. */
  deltaDays: number;
  /** Vertical (time) delta in minutes; raw, snapped on commit. */
  deltaMinutes: number;
  eventId: string;
  mode: 'move' | 'resize';
  originEnd: Date | null;
  originStart: Date;
}

/**
 * The component-scoped calendar store's reactive state. Holds ephemeral UI /
 * interaction state only — the rendered view-models are `withComputed` and the
 * layout maths live in the pure core. The store owns "true today" / the now-line
 * clock because the core is deliberately now-agnostic.
 */
export interface NgeCalendarStoreState {
  /** The date the current view is anchored on. */
  anchorDate: Date;
  /** Public config; the S5 shell will sync this from its `input()`. */
  config: NgeCalendarConfig | null;
  /** Now-line clock source (S7 wires the ticking). */
  currentTime: Date | null;
  drag: CalendarDragState | null;
  /** The default-facet cross-view filter the funnel panel edits (ARCH-149). */
  filter: NgeCalendarFilter;
  /** Roving focus target (S10 builds keyboard nav on this). */
  focusedDate: Date | null;
  /**
   * Host-supplied filter override set via the filter panel's `apply` callback
   * (ARCH-149). When non-null it takes precedence over the default-facet filter.
   */
  hostPredicate: NgeCalendarEventPredicate | null;
  hoveredEventId: null | string;
  /**
   * Last committed drag result. Set fresh by `commitDrag()` so the shell's
   * `bridgeEventDrop()` effect refires and relays the public `eventDrop` output.
   */
  lastEventDrop: EventDrop | null;
  /**
   * Last committed resize result. Set fresh by `commitResize()` so the shell's
   * `bridgeEventResize()` effect refires and relays the public `eventResize` output.
   */
  lastEventResize: EventResize | null;
  /**
   * Last activated empty slot. Set fresh by `slotClick()` so the shell's
   * `bridgeSlotClick()` effect refires and relays the public `slotClick` output.
   */
  lastSlotClick: null | SlotClick;
  /** Month overflow threshold (chips per cell before "+N more"). */
  maxEventsPerCell: number;
  /** The cell whose "+N more" popover is open, if any. */
  popoverDate: Date | null;
  /** The day selected in the mobile month-agenda layout (ARCH-148), if any. */
  selectedDate: Date | null;
  selectedEventId: null | string;
  /** True "today" (the core is now-agnostic, so the store owns it). */
  today: Date | null;
  /** Active view; overrides `config.view` after user navigation. */
  view: NgeCalendarView;
}

export const initialNgeCalendarStoreState: NgeCalendarStoreState = {
  anchorDate: new Date(0),
  config: null,
  currentTime: null,
  drag: null,
  filter: DEFAULT_GIGA_CALENDAR_FILTER,
  focusedDate: null,
  hostPredicate: null,
  hoveredEventId: null,
  lastEventDrop: null,
  lastEventResize: null,
  lastSlotClick: null,
  maxEventsPerCell: 3,
  popoverDate: null,
  selectedDate: null,
  selectedEventId: null,
  today: null,
  view: 'month',
};
