import { addDays, addMonths, addWeeks, addYears, startOfDay } from '@nge/date';
import { patchState, signalStoreFeature, withMethods } from '@ngrx/signals';

import type {
  NgeCalendarConfig,
  NgeCalendarView,
} from '../../../core/models/nge-calendar-config.model';
import type { NgeCalendarBaseStore } from '../nge-calendar-store.types';

import { coerceToDate } from '../../../core/normalize/coerce-date';

/** Step the anchor date by one unit of `view`, in `direction` (+1 / -1). */
function step(anchorDate: Date, view: NgeCalendarView, direction: -1 | 1): Date {
  switch (view) {
    case 'day':
      return addDays(anchorDate, direction);
    case 'week':
      return addWeeks(anchorDate, direction);
    case 'year':
      return addYears(anchorDate, direction);
    case 'month':
    default:
      return addMonths(anchorDate, direction);
  }
}

/**
 * Navigation concern: owns the active view, the anchor date, and the
 * store-owned "today" / now-line clock. `next`/`previous` page by the unit of
 * the current view; `setConfig` adopts a fresh public config (seeding view +
 * anchor from it).
 */
export function withCalendarNavigation(store: NgeCalendarBaseStore) {
  return signalStoreFeature(
    withMethods(() => ({
      /**
       * Drill from a coarse view into a finer one (year → month) in a SINGLE
       * patch: re-anchor on `date` AND switch to `view` at once, so the shell's
       * `bridgeViewChange()` effect emits `viewChange` exactly once (a separate
       * `setAnchorDate` + `setView` would fire it twice). `date` is adopted as-is,
       * matching `setAnchorDate` (the year view-model's cells are already
       * day-start dates from `getMonthMatrix`).
       */
      drillInto(date: Date, view: NgeCalendarView = 'month'): void {
        patchState(store, { anchorDate: date, view });
      },

      goToToday(): void {
        patchState(store, { anchorDate: store.today() ?? startOfDay(new Date()) });
      },

      next(): void {
        patchState(store, { anchorDate: step(store.anchorDate(), store.view(), 1) });
      },

      previous(): void {
        patchState(store, { anchorDate: step(store.anchorDate(), store.view(), -1) });
      },

      setAnchorDate(date: Date): void {
        patchState(store, { anchorDate: date });
      },

      setConfig(config: NgeCalendarConfig): void {
        // `view` and `anchorDate` are INTERACTIVE state — the active view "overrides
        // config.view after user navigation" (see the store state), and the anchor is
        // moved by prev/next/today/drill. The shell re-runs `setConfig` on EVERY config
        // change (e.g. an `eventDrop` re-feeds the events), so re-seeding view/anchor
        // from an UNCHANGED config would clobber a view toggle or a date navigation.
        // Adopt `config.view` / `config.date` only when the consumer actually changes
        // them (or on the first seed); otherwise keep the interactive value.
        const previous = store.config();
        const incomingDate = coerceToDate(config.date);
        const previousDate = previous ? coerceToDate(previous.date) : null;
        const adoptView = previous === null || config.view !== previous.view;
        const adoptDate =
          incomingDate !== null &&
          (previousDate === null || incomingDate.getTime() !== previousDate.getTime());
        patchState(store, {
          config,
          ...(adoptView ? { view: config.view } : {}),
          ...(adoptDate ? { anchorDate: incomingDate } : {}),
        });
      },

      setCurrentTime(date: Date): void {
        patchState(store, { currentTime: date });
      },

      setToday(date: Date): void {
        patchState(store, { today: date });
      },

      setView(view: NgeCalendarView): void {
        patchState(store, { view });
      },
    }))
  );
}
