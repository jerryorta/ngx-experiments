import type { Signal } from '@angular/core';

import { computed } from '@angular/core';
import { isSameDay } from '@nge/date';
import { patchState, signalStoreFeature, withComputed, withMethods } from '@ngrx/signals';

import type { NormalizedCalendarEvent } from '../../../core/models/nge-calendar-event.model';
import type { MonthViewModel } from '../../../core/view-model/month-view-model.model';
import type { NgeCalendarBaseStore } from '../nge-calendar-store.types';

interface PopoverDeps extends NgeCalendarBaseStore {
  monthViewModel: Signal<MonthViewModel | null>;
}

/**
 * Month "+N more" popover concern. Resolves the chips of the open cell from the
 * month view-model so the popover renders the full event list for that day.
 */
export function withCalendarPopover(store: PopoverDeps) {
  return signalStoreFeature(
    withComputed(() => ({
      popoverEvents: computed<NormalizedCalendarEvent[]>(() => {
        const date = store.popoverDate();
        const vm = store.monthViewModel();
        if (!date || !vm) {
          return [];
        }
        for (const week of vm.weeks) {
          for (const cell of week.days) {
            if (isSameDay(cell.date, date)) {
              return cell.chips;
            }
          }
        }
        return [];
      }),
    })),

    withMethods(() => ({
      closePopover(): void {
        patchState(store, { popoverDate: null });
      },

      openPopover(date: Date): void {
        patchState(store, { popoverDate: date });
      },
    }))
  );
}
