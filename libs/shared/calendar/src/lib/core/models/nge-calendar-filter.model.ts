import type { NormalizedCalendarEvent } from './nge-calendar-event.model';

/**
 * The default-filter facets the library knows how to apply (ARCH-149). A
 * cross-view filter narrows the events rendered by EVERY view (month / week /
 * day / year + the mobile agenda) through a single central predicate seam.
 */
export interface NgeCalendarFilter {
  /** Restrict to these `color` values; empty means "any colour". */
  colors: string[];
  /** Case-insensitive substring match against the event `title`. */
  query: string;
  /** `'allDay'` keeps all-day events, `'timed'` keeps timed; `'all'` keeps both. */
  timing: 'all' | 'allDay' | 'timed';
}

/** The empty (pass-through) default filter: no facet narrows anything. */
export const DEFAULT_GIGA_CALENDAR_FILTER: NgeCalendarFilter = {
  colors: [],
  query: '',
  timing: 'all',
};

/**
 * A predicate deciding whether a (normalized) event survives the filter. `T`
 * recovers the typed `event.data` payload (ARCH-146) so a host-custom predicate
 * reading `event.data?.<field>` is strict-template / strict-type checked.
 */
export type NgeCalendarEventPredicate<T = unknown> = (
  event: NormalizedCalendarEvent<T>
) => boolean;

/**
 * The typed `$implicit` context handed to a host-custom filter panel template,
 * rendered inside the filter popover (ARCH-149). Mirrors the overlay context's
 * generic + `$implicit` shape (see {@link NgeCalendarEventOverlayContext}).
 *
 * A host panel reads `filter` to seed its controls, calls `setFilter` to merge
 * partial facet changes, `apply` to override the compiled predicate outright
 * (pass `null` to fall back to the default-facet predicate), and `close` to
 * dismiss the popover.
 */
export interface NgeCalendarFilterContext<T = unknown> {
  /** Same as {@link filter} — the implicit `let-filter` binding. */
  $implicit: NgeCalendarFilter;
  /** Override the active predicate; `null` restores the default-facet predicate. */
  apply: (predicate: NgeCalendarEventPredicate<T> | null) => void;
  /** Closes the popover. Bind to a close / done button. */
  close: () => void;
  /** The current default-filter value the panel's controls reflect. */
  filter: NgeCalendarFilter;
  /** Merge a partial facet change into the default filter. */
  setFilter: (partial: Partial<NgeCalendarFilter>) => void;
}

/**
 * Compile a {@link NgeCalendarFilter} into a {@link NgeCalendarEventPredicate}.
 *
 * Pure. Returns `null` when the filter equals the defaults (empty query, empty
 * colours, timing `'all'`) so it is a true pass-through — callers can skip the
 * `.filter()` entirely and preserve the array reference. Otherwise returns a
 * predicate that ANDs every active facet:
 * - `query` — case-insensitive `title` substring (trimmed; all-whitespace = empty);
 * - `colors` — `colors.includes(event.color)`, treating a missing colour as a
 *   non-match while the colour facet is active;
 * - `timing` — `'allDay'` keeps `allDay === true`, `'timed'` keeps `allDay !== true`.
 */
export function compileFilterPredicate<T = unknown>(
  filter: NgeCalendarFilter
): NgeCalendarEventPredicate<T> | null {
  if (isDefaultFilter(filter)) {
    return null;
  }

  const query = filter.query.trim().toLowerCase();
  const colors = filter.colors;
  const timing = filter.timing;

  return (event: NormalizedCalendarEvent<T>): boolean => {
    if (query !== '' && !event.title.toLowerCase().includes(query)) {
      return false;
    }
    if (colors.length > 0 && (event.color === undefined || !colors.includes(event.color))) {
      return false;
    }
    if (timing === 'allDay' && event.allDay !== true) {
      return false;
    }
    if (timing === 'timed' && event.allDay === true) {
      return false;
    }
    return true;
  };
}

/** True when `filter` narrows nothing (empty query, no colours, timing `'all'`). */
export function isDefaultFilter(filter: NgeCalendarFilter): boolean {
  return filter.query.trim() === '' && filter.colors.length === 0 && filter.timing === 'all';
}

/** Count the active default facets (for the funnel badge): query + colours + timing. */
export function countActiveFacets(filter: NgeCalendarFilter): number {
  return (
    (filter.query.trim() !== '' ? 1 : 0) + filter.colors.length + (filter.timing !== 'all' ? 1 : 0)
  );
}
