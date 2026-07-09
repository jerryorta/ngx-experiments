import { computed } from '@angular/core';
import { patchState, signalStoreFeature, withComputed, withMethods } from '@ngrx/signals';

import type {
  NgeCalendarEventPredicate,
  NgeCalendarFilter,
} from '../../../core/models/nge-calendar-filter.model';
import type { NgeCalendarBaseStore } from '../nge-calendar-store.types';

import {
  compileFilterPredicate,
  countActiveFacets,
  DEFAULT_GIGA_CALENDAR_FILTER,
  isDefaultFilter,
} from '../../../core/models/nge-calendar-filter.model';

/**
 * Cross-view filter concern (ARCH-149). Owns the default-facet `filter` and an
 * optional host-supplied `hostPredicate`, and derives the single
 * `activeEventFilter` predicate the view-model feature's `_filteredConfig` seam
 * consumes to narrow EVERY view.
 *
 * Composed BEFORE the view-model feature so its `activeEventFilter` computed is
 * visible to that feature's deps. It depends ONLY on the public `config` signal
 * (owned by navigation/state) plus its own state — never on view-model
 * computeds (which do not exist yet at this point in the composition).
 */
export function withCalendarFilter(store: NgeCalendarBaseStore) {
  // The FULL (unfiltered) distinct colour set from the raw config events, in
  // first-seen order. Sourced from raw config — not the filtered events — so the
  // UI can re-enable a colour the active filter is hiding.
  const availableColors = computed<string[]>(() => {
    const events = store.config()?.events ?? [];
    const seen = new Set<string>();
    const colors: string[] = [];
    for (const event of events) {
      if (event.color && !seen.has(event.color)) {
        seen.add(event.color);
        colors.push(event.color);
      }
    }
    return colors;
  });

  // The single active predicate, by precedence:
  //   hostPredicate (panel `apply`) → config.eventFilter (host config) →
  //   compiled default-facet predicate (may be null) → null (pass-through).
  const activeEventFilter = computed<NgeCalendarEventPredicate | null>(() => {
    const host = store.hostPredicate();
    if (host !== null) {
      return host;
    }
    const configFilter = store.config()?.eventFilter;
    if (configFilter) {
      return configFilter;
    }
    return compileFilterPredicate(store.filter());
  });

  // The funnel badge count. Counts the default facets plus the host-panel
  // override; `config.eventFilter` is host-external and is NOT counted.
  const activeFilterCount = computed<number>(
    () => countActiveFacets(store.filter()) + (store.hostPredicate() !== null ? 1 : 0)
  );

  const filterActive = computed<boolean>(
    () => !isDefaultFilter(store.filter()) || store.hostPredicate() !== null
  );

  return signalStoreFeature(
    withComputed(() => ({
      activeEventFilter,
      activeFilterCount,
      availableColors,
      filterActive,
    })),

    withMethods(() => ({
      clearFilter(): void {
        patchState(store, { filter: DEFAULT_GIGA_CALENDAR_FILTER, hostPredicate: null });
      },

      setFilter(partial: Partial<NgeCalendarFilter>): void {
        patchState(store, { filter: { ...store.filter(), ...partial } });
      },

      setHostPredicate(predicate: NgeCalendarEventPredicate | null): void {
        patchState(store, { hostPredicate: predicate });
      },
    }))
  );
}
