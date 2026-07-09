import { TestBed } from '@angular/core/testing';

import type { NgeCalendarConfig } from '../../../core/models/nge-calendar-config.model';

import { NgeCalendarStore } from '../nge-calendar-store';

type Store = InstanceType<typeof NgeCalendarStore>;

const SLOT = 30; // minutes
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

// A 1-hour timed event on Jan 15 2026, 09:00–10:00.
const EV_START = new Date(2026, 0, 15, 9, 0);
const EV_END = new Date(2026, 0, 15, 10, 0);

function dragConfig(overrides: Partial<NgeCalendarConfig> = {}): NgeCalendarConfig {
  return {
    date: new Date(2026, 0, 15),
    editable: true,
    events: [{ end: EV_END, id: 'a', start: EV_START, title: 'Meeting' }],
    slotMinutes: SLOT,
    view: 'week',
    ...overrides,
  };
}

function createStore(config: NgeCalendarConfig): Store {
  TestBed.configureTestingModule({ providers: [NgeCalendarStore] });
  const store = TestBed.inject(NgeCalendarStore);
  store.setConfig(config);
  return store;
}

describe('withCalendarDrag', () => {
  describe('startDrag gating', () => {
    it('is refused when the calendar is not globally editable', () => {
      const store = createStore(dragConfig({ editable: false }));
      store.startDrag({ eventId: 'a', mode: 'move' });
      expect(store.drag()).toBeNull();
    });

    it('is refused when the specific event opts out (editable === false)', () => {
      const store = createStore(
        dragConfig({
          editable: true,
          events: [{ editable: false, end: EV_END, id: 'a', start: EV_START, title: 'Locked' }],
        })
      );
      store.startDrag({ eventId: 'a', mode: 'move' });
      expect(store.drag()).toBeNull();
    });

    it('is refused for an unknown event id', () => {
      const store = createStore(dragConfig());
      store.startDrag({ eventId: 'missing', mode: 'move' });
      expect(store.drag()).toBeNull();
    });

    it('starts and captures origin when editable', () => {
      const store = createStore(dragConfig());
      store.startDrag({ eventId: 'a', mode: 'move' });
      const drag = store.drag();
      expect(drag?.eventId).toBe('a');
      expect(drag?.mode).toBe('move');
      expect(drag?.originStart.getTime()).toBe(EV_START.getTime());
      expect(drag?.originEnd?.getTime()).toBe(EV_END.getTime());
      expect(drag?.deltaMinutes).toBe(0);
      expect(drag?.deltaDays).toBe(0);
    });

    it('refuses a resize on a null-end (no-end) event', () => {
      const store = createStore(
        dragConfig({
          events: [{ id: 'a', start: EV_START, title: 'No end' }],
        })
      );
      store.startDrag({ eventId: 'a', mode: 'resize' });
      expect(store.drag()).toBeNull();
      expect(store.commitResize()).toBeNull();
    });
  });

  describe('updateDrag', () => {
    it('no-ops when there is no active drag', () => {
      const store = createStore(dragConfig());
      store.updateDrag({ deltaMinutes: 60 });
      expect(store.drag()).toBeNull();
    });

    it('keeps the existing value for omitted fields', () => {
      const store = createStore(dragConfig());
      store.startDrag({ eventId: 'a', mode: 'move' });
      store.updateDrag({ deltaMinutes: 45 });
      store.updateDrag({ deltaDays: 2 });
      expect(store.drag()?.deltaMinutes).toBe(45);
      expect(store.drag()?.deltaDays).toBe(2);
    });
  });

  describe('commitDrag (move)', () => {
    it('snaps deltaMinutes to the slot and applies deltaDays', () => {
      const store = createStore(dragConfig());
      store.startDrag({ eventId: 'a', mode: 'move' });
      // 40 raw minutes snaps to 30 (one slot); plus 1 day.
      store.updateDrag({ deltaDays: 1, deltaMinutes: 40 });
      const drop = store.commitDrag();

      expect(drop).not.toBeNull();
      const expectedDeltaMs = 1 * MS_PER_DAY + SLOT * MS_PER_MINUTE;
      expect(drop?.newStart.getTime()).toBe(EV_START.getTime() + expectedDeltaMs);
      expect(drop?.newEnd?.getTime()).toBe(EV_END.getTime() + expectedDeltaMs);
      expect(drop?.event.id).toBe('a');
      // drag cleared after commit
      expect(store.drag()).toBeNull();
    });

    it('snaps down when below half a slot', () => {
      const store = createStore(dragConfig());
      store.startDrag({ eventId: 'a', mode: 'move' });
      store.updateDrag({ deltaMinutes: 10 }); // < 15 → snaps to 0
      const drop = store.commitDrag();
      expect(drop?.newStart.getTime()).toBe(EV_START.getTime());
    });

    it('moves a null-end (no-end) event, keeping newEnd null', () => {
      const store = createStore(
        dragConfig({
          events: [{ id: 'a', start: EV_START, title: 'No end' }],
        })
      );
      store.startDrag({ eventId: 'a', mode: 'move' });
      store.updateDrag({ deltaDays: 1 });
      const drop = store.commitDrag();

      expect(drop).not.toBeNull();
      expect(drop?.newStart.getTime()).toBe(EV_START.getTime() + MS_PER_DAY);
      expect(drop?.newEnd).toBeNull();
    });

    it('returns null when no drag is active', () => {
      const store = createStore(dragConfig());
      expect(store.commitDrag()).toBeNull();
    });

    it('mirrors the returned drop into the lastEventDrop signal', () => {
      const store = createStore(dragConfig());
      store.startDrag({ eventId: 'a', mode: 'move' });
      store.updateDrag({ deltaDays: 1, deltaMinutes: 40 });
      const drop = store.commitDrag();
      expect(drop).not.toBeNull();
      // The signal holds the exact object the method returned.
      expect(store.lastEventDrop()).toBe(drop);
    });

    it('leaves lastEventDrop untouched on a no-op commit (no active drag)', () => {
      const store = createStore(dragConfig());
      expect(store.lastEventDrop()).toBeNull();
      expect(store.commitDrag()).toBeNull();
      expect(store.lastEventDrop()).toBeNull();
    });

    it('returns null when the active drag is a resize', () => {
      const store = createStore(dragConfig());
      store.startDrag({ eventId: 'a', mode: 'resize' });
      expect(store.commitDrag()).toBeNull();
      // resize drag is left intact for commitResize
      expect(store.drag()?.mode).toBe('resize');
    });
  });

  describe('commitResize', () => {
    it('snaps the end delta to the slot', () => {
      const store = createStore(dragConfig());
      store.startDrag({ eventId: 'a', mode: 'resize' });
      store.updateDrag({ deltaMinutes: 50 }); // snaps to 60
      const resize = store.commitResize();
      expect(resize?.newEnd.getTime()).toBe(EV_END.getTime() + 60 * MS_PER_MINUTE);
      expect(store.drag()).toBeNull();
    });

    it('enforces a minimum of one slot (no collapse, no inversion)', () => {
      const store = createStore(dragConfig());
      store.startDrag({ eventId: 'a', mode: 'resize' });
      // Drag the end far before the start: -120 min would invert the event.
      store.updateDrag({ deltaMinutes: -120 });
      const resize = store.commitResize();
      if (!resize) {
        throw new Error('expected a non-null EventResize');
      }
      const minEnd = EV_START.getTime() + SLOT * MS_PER_MINUTE;
      expect(resize.newEnd.getTime()).toBe(minEnd);
      // i.e. exactly one slot after the start, never before it
      expect(resize.newEnd.getTime()).toBeGreaterThan(EV_START.getTime());
    });

    it('returns null when the active drag is a move', () => {
      const store = createStore(dragConfig());
      store.startDrag({ eventId: 'a', mode: 'move' });
      expect(store.commitResize()).toBeNull();
    });

    it('returns null when there is no drag', () => {
      const store = createStore(dragConfig());
      expect(store.commitResize()).toBeNull();
    });

    it('mirrors the returned resize into the lastEventResize signal', () => {
      const store = createStore(dragConfig());
      store.startDrag({ eventId: 'a', mode: 'resize' });
      store.updateDrag({ deltaMinutes: 50 });
      const resize = store.commitResize();
      expect(resize).not.toBeNull();
      expect(store.lastEventResize()).toBe(resize);
    });

    it('leaves lastEventResize untouched on a no-op commit (no active drag)', () => {
      const store = createStore(dragConfig());
      expect(store.lastEventResize()).toBeNull();
      expect(store.commitResize()).toBeNull();
      expect(store.lastEventResize()).toBeNull();
    });
  });

  describe('cancelDrag', () => {
    it('clears the active drag', () => {
      const store = createStore(dragConfig());
      store.startDrag({ eventId: 'a', mode: 'move' });
      store.cancelDrag();
      expect(store.drag()).toBeNull();
    });
  });
});
