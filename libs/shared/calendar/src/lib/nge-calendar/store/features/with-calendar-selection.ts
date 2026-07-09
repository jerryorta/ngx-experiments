import type { Signal } from '@angular/core';

import { computed } from '@angular/core';
import { patchState, signalStoreFeature, withComputed, withMethods } from '@ngrx/signals';

import type { SlotClick } from '../../../core/models/calendar-output.model';
import type { NormalizedCalendarEvent } from '../../../core/models/nge-calendar-event.model';
import type { NgeCalendarBaseStore } from '../nge-calendar-store.types';

interface SelectionDeps extends NgeCalendarBaseStore {
  events: Signal<NormalizedCalendarEvent[]>;
}

/**
 * Selection / hover / focus concern. Depends on the normalized `events` signal
 * (from the view-model feature) to resolve `selectedEvent` from the selected id.
 */
export function withCalendarSelection(store: SelectionDeps) {
  return signalStoreFeature(
    withComputed(() => ({
      selectedEvent: computed<NormalizedCalendarEvent | null>(
        () => store.events().find(e => e.id === store.selectedEventId()) ?? null
      ),
    })),

    withMethods(() => ({
      clearSelection(): void {
        patchState(store, { selectedEventId: null });
      },

      selectDate(date: Date | null): void {
        patchState(store, { selectedDate: date });
      },

      selectEvent(id: string): void {
        patchState(store, { selectedEventId: id });
      },

      setFocusedDate(date: Date | null): void {
        patchState(store, { focusedDate: date });
      },

      setHoveredEvent(id: null | string): void {
        patchState(store, { hoveredEventId: id });
      },

      // Set fresh each call so the reference changes and the shell's
      // `bridgeSlotClick()` effect refires, relaying the public `slotClick` output.
      slotClick(slot: SlotClick): void {
        patchState(store, { lastSlotClick: slot });
      },
    }))
  );
}
