import type { Signal } from '@angular/core';

import { computed } from '@angular/core';
import { signalStoreFeature, withComputed } from '@ngrx/signals';

import type {
  NgeCalendarConfig,
  NormalizedCalendarConfig,
} from '../../../core/models/nge-calendar-config.model';
import type { NormalizedCalendarEvent } from '../../../core/models/nge-calendar-event.model';
import type { NgeCalendarEventPredicate } from '../../../core/models/nge-calendar-filter.model';
import type { MonthAgendaViewModel } from '../../../core/view-model/month-agenda-view-model.model';
import type { MonthViewModel } from '../../../core/view-model/month-view-model.model';
import type { TimeGridViewModel } from '../../../core/view-model/time-grid-view-model.model';
import type { YearViewModel } from '../../../core/view-model/year-view-model.model';
import type { NgeCalendarBaseStore } from '../nge-calendar-store.types';

import { nowLineOffsetPct } from '../../../core/layout';
import { DEFAULT_SLOT_MINUTES } from '../../../core/normalize/defaults';
import { normalizeConfig } from '../../../core/normalize/normalize-config';
import { buildDayViewModel } from '../../../core/view-model/build-day-view-model';
import { buildMonthAgendaViewModel } from '../../../core/view-model/build-month-agenda-view-model';
import { buildMonthViewModel } from '../../../core/view-model/build-month-view-model';
import { buildWeekViewModel } from '../../../core/view-model/build-week-view-model';
import { buildYearViewModel } from '../../../core/view-model/build-year-view-model';

const DECEMBER = 11;
const LAST_DAY_OF_DECEMBER = 31;

/** The active view's visible date span, `start`..`end` inclusive. */
export interface CalendarVisibleRange {
  end: Date;
  start: Date;
}

/** The now-line's vertical position as a percentage (`0..100`) of the time-grid window. */
export interface CalendarNowIndicator {
  topPct: number;
}

/**
 * The view-model feature's deps: the base store plus the filter feature's
 * `activeEventFilter` (composed before this feature), which the central
 * `_filteredConfig` seam applies to narrow every view (ARCH-149).
 */
interface ViewModelDeps extends NgeCalendarBaseStore {
  activeEventFilter: Signal<NgeCalendarEventPredicate | null>;
}

/**
 * View-model derivation concern. Normalises the effective config **once** (the
 * one place `normalizeConfig` is called), applies the active cross-view filter
 * through the `_filteredConfig` seam, and feeds that single filtered config to
 * every builder — the builders must NOT be re-normalized. All view-models are
 * `null` until a config has been set.
 */
export function withCalendarViewModel(store: ViewModelDeps) {
  // The public config with the store's live view + anchor overlaid, so paging /
  // view switches re-derive without mutating the original config object.
  const _effectiveConfig = computed<NgeCalendarConfig | null>(() => {
    const c = store.config();
    return c ? { ...c, date: store.anchorDate(), view: store.view() } : null;
  });

  // Normalise ONCE here; every builder below consumes this and must not
  // re-normalise. Memoised by the computed, so it only re-runs when the
  // effective config changes.
  const _normalizedConfig = computed<NormalizedCalendarConfig | null>(() => {
    const ec = _effectiveConfig();
    return ec ? normalizeConfig(ec) : null;
  });

  // The central cross-view filter seam (ARCH-149): apply `activeEventFilter` to
  // the normalized config's events ONCE so every builder + `events` renders the
  // filtered set. A `null` predicate passes through the SAME reference (no copy)
  // so the no-filter path stays memoised exactly as before.
  const _filteredConfig = computed<NormalizedCalendarConfig | null>(() => {
    const nc = _normalizedConfig();
    if (nc === null) {
      return null;
    }
    const predicate = store.activeEventFilter();
    if (predicate === null) {
      return nc;
    }
    return { ...nc, events: nc.events.filter(predicate) };
  });

  const monthViewModel = computed<MonthViewModel | null>(() => {
    const nc = _filteredConfig();
    return nc ? buildMonthViewModel(nc, { maxEventsPerCell: store.maxEventsPerCell() }) : null;
  });

  // The compact mobile month-agenda view-model (ARCH-148). `null` until a config
  // is set; the component picks between this and `monthViewModel` via `monthLayout`.
  const monthAgenda = computed<MonthAgendaViewModel | null>(() => {
    const nc = _filteredConfig();
    return nc ? buildMonthAgendaViewModel(nc) : null;
  });

  // The active month-view layout variant; `'grid'` until a config is set. Reads
  // the unfiltered config — `monthLayout` is a layout knob, not event data.
  const monthLayout = computed<'agenda' | 'grid'>(() => _normalizedConfig()?.monthLayout ?? 'grid');

  const weekViewModel = computed<null | TimeGridViewModel>(() => {
    const nc = _filteredConfig();
    return nc ? buildWeekViewModel(nc) : null;
  });

  const dayViewModel = computed<null | TimeGridViewModel>(() => {
    const nc = _filteredConfig();
    return nc ? buildDayViewModel(nc) : null;
  });

  const yearViewModel = computed<null | YearViewModel>(() => {
    const nc = _filteredConfig();
    return nc ? buildYearViewModel(nc) : null;
  });

  // The active time-grid view-model — the single signal the shared
  // `<nge-time-grid>` reads for both week (7 columns) and day (1 column).
  const timeGridViewModel = computed<null | TimeGridViewModel>(() =>
    store.view() === 'day' ? dayViewModel() : weekViewModel()
  );

  // The filtered events the views render — and the set selection / drag resolve
  // ids against, so a hidden event can't be selected or dragged (ARCH-149).
  const events = computed<NormalizedCalendarEvent[]>(() => _filteredConfig()?.events ?? []);

  const slotMinutes = computed(() => _normalizedConfig()?.slotMinutes ?? DEFAULT_SLOT_MINUTES);

  const editable = computed(() => _normalizedConfig()?.editable ?? false);

  // The now-line position, derived from the live `currentTime` clock against the
  // active grid's window. `null` (hidden) outside the window or before any view.
  const nowIndicator = computed<CalendarNowIndicator | null>(() => {
    const now = store.currentTime();
    const vm = timeGridViewModel();
    if (!now || !vm) {
      return null;
    }
    const topPct = nowLineOffsetPct(now, vm.dayStartHour, vm.dayEndHour);
    return topPct === null ? null : { topPct };
  });

  // The visible date span is event-INDEPENDENT (it comes from the grid matrix /
  // column dates), so it must NOT churn when a filter narrows the view-models it
  // happens to read. A value-equality `equal` keeps the same range from
  // re-notifying — without it, applying/clearing a filter produces a fresh
  // `{start,end}` ref and refires the host's `rangeChange` output with unchanged
  // dates (which a refetch-on-range host would needlessly honour) (ARCH-149).
  const visibleRange = computed<CalendarVisibleRange | null>(
    () => {
      switch (store.view()) {
        case 'month': {
          const vm = monthViewModel();
          if (!vm || vm.weeks.length === 0) {
            return null;
          }
          const firstWeek = vm.weeks[0];
          const lastWeek = vm.weeks[vm.weeks.length - 1];
          return {
            end: lastWeek.days[lastWeek.days.length - 1].date,
            start: firstWeek.days[0].date,
          };
        }
        case 'week':
        case 'day': {
          const vm = store.view() === 'week' ? weekViewModel() : dayViewModel();
          if (!vm || vm.columns.length === 0) {
            return null;
          }
          return {
            end: vm.columns[vm.columns.length - 1].date,
            start: vm.columns[0].date,
          };
        }
        case 'year': {
          const vm = yearViewModel();
          if (!vm) {
            return null;
          }
          return {
            end: new Date(vm.year, DECEMBER, LAST_DAY_OF_DECEMBER),
            start: new Date(vm.year, 0, 1),
          };
        }
        default:
          return null;
      }
    },
    {
      equal: (a, b) =>
        a === b ||
        (a !== null &&
          b !== null &&
          a.start.getTime() === b.start.getTime() &&
          a.end.getTime() === b.end.getTime()),
    }
  );

  return signalStoreFeature(
    withComputed(() => ({
      dayViewModel,
      editable,
      events,
      monthAgenda,
      monthLayout,
      monthViewModel,
      nowIndicator,
      slotMinutes,
      timeGridViewModel,
      visibleRange,
      weekViewModel,
      yearViewModel,
    }))
  );
}
