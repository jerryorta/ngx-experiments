import type { Signal } from '@angular/core';

import { patchState, signalStoreFeature, withMethods } from '@ngrx/signals';

import type { EventDrop, EventResize } from '../../../core/models/calendar-output.model';
import type { NormalizedCalendarEvent } from '../../../core/models/nge-calendar-event.model';
import type { NgeCalendarBaseStore } from '../nge-calendar-store.types';

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

interface DragDeps extends NgeCalendarBaseStore {
  editable: Signal<boolean>;
  events: Signal<NormalizedCalendarEvent[]>;
  slotMinutes: Signal<number>;
}

/** Snap a raw minute delta to the nearest whole `slot` increment. */
function snapToSlot(deltaMinutes: number, slot: number): number {
  return Math.round(deltaMinutes / slot) * slot;
}

/**
 * Drag / resize interaction concern. A gesture is captured raw (origin + live
 * deltas) and only snapped to `slotMinutes` on commit, producing the
 * `EventDrop` / `EventResize` outputs the shell will relay. Refuses to start
 * when editing is globally off or the specific event opts out.
 */
export function withCalendarDrag(store: DragDeps) {
  return signalStoreFeature(
    withMethods(() => ({
      cancelDrag(): void {
        patchState(store, { drag: null });
      },

      commitDrag(): EventDrop | null {
        const drag = store.drag();
        if (!drag || drag.mode !== 'move') {
          return null;
        }
        const event = store.events().find(e => e.id === drag.eventId);
        if (!event) {
          patchState(store, { drag: null });
          return null;
        }

        const slot = store.slotMinutes();
        const snappedMinutes = snapToSlot(drag.deltaMinutes, slot);
        const totalDeltaMs = drag.deltaDays * MS_PER_DAY + snappedMinutes * MS_PER_MINUTE;
        const newStart = new Date(drag.originStart.getTime() + totalDeltaMs);
        const newEnd =
          drag.originEnd !== null ? new Date(drag.originEnd.getTime() + totalDeltaMs) : null;

        // Fresh object each commit so the reference changes and the shell's
        // `bridgeEventDrop()` effect refires; the return value is preserved for
        // existing callers / tests.
        const drop: EventDrop = { event, newEnd, newStart };
        patchState(store, { drag: null, lastEventDrop: drop });
        return drop;
      },

      commitResize(): EventResize | null {
        const drag = store.drag();
        if (!drag || drag.mode !== 'resize' || drag.originEnd === null) {
          return null;
        }
        const event = store.events().find(e => e.id === drag.eventId);
        if (!event) {
          patchState(store, { drag: null });
          return null;
        }

        const slot = store.slotMinutes();
        const snappedMinutes = snapToSlot(drag.deltaMinutes, slot);
        let newEnd = new Date(drag.originEnd.getTime() + snappedMinutes * MS_PER_MINUTE);

        // Enforce a minimum of one slot and never let the end cross the start.
        const minEnd = new Date(drag.originStart.getTime() + slot * MS_PER_MINUTE);
        if (newEnd.getTime() < minEnd.getTime()) {
          newEnd = minEnd;
        }

        // Fresh object each commit so the reference changes and the shell's
        // `bridgeEventResize()` effect refires; the return value is preserved.
        const resize: EventResize = { event, newEnd };
        patchState(store, { drag: null, lastEventResize: resize });
        return resize;
      },

      startDrag(input: { eventId: string; mode: 'move' | 'resize' }): void {
        if (!store.editable()) {
          return;
        }
        const ev = store.events().find(e => e.id === input.eventId);
        if (!ev || ev.editable === false) {
          return;
        }
        if (input.mode === 'resize' && ev.end === null) {
          return; // an event with no end cannot be resized
        }
        patchState(store, {
          drag: {
            deltaDays: 0,
            deltaMinutes: 0,
            eventId: input.eventId,
            mode: input.mode,
            originEnd: ev.end,
            originStart: ev.start,
          },
        });
      },

      updateDrag(delta: { deltaDays?: number; deltaMinutes?: number }): void {
        const drag = store.drag();
        if (!drag) {
          return;
        }
        patchState(store, {
          drag: {
            ...drag,
            deltaDays: delta.deltaDays ?? drag.deltaDays,
            deltaMinutes: delta.deltaMinutes ?? drag.deltaMinutes,
          },
        });
      },
    }))
  );
}
