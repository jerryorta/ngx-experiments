import type { CdkDragEnd } from '@angular/cdk/drag-drop';
import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { NgeCalendarConfig } from '../../core/models/nge-calendar-config.model';
import type {
  NgeCalendarEvent,
  NormalizedCalendarEvent,
} from '../../core/models/nge-calendar-event.model';
import type {
  TimeGridColumn,
  TimeGridViewModel,
} from '../../core/view-model/time-grid-view-model.model';

import { NgeCalendarStore } from '../../nge-calendar/store';
import {
  dayDeltaFromPixels,
  NgeTimeGridComponent,
  minuteDeltaFromPixels,
} from './nge-time-grid.component';

type Store = InstanceType<typeof NgeCalendarStore>;

// Mon Jun 15 2026. With weekStartsOn=0 the week column range is Sun Jun 14 … Sat
// Jun 20, so the anchor (15th) is the second column.
const ANCHOR = new Date(2026, 5, 15);
// Noon on the anchor day — the pinned wall clock the now-line constructor seeds.
const NOON = new Date(2026, 5, 15, 12, 0);

function event(overrides: Partial<NgeCalendarEvent> = {}): NgeCalendarEvent {
  return {
    end: new Date(2026, 5, 15, 11, 0),
    id: 'evt',
    start: new Date(2026, 5, 15, 9, 0),
    title: 'Event',
    ...overrides,
  };
}

/** An 08:00–20:00 (720-minute) week grid anchored on Jun 15, so offsets are clean. */
function config(overrides: Partial<NgeCalendarConfig> = {}): NgeCalendarConfig {
  return {
    date: ANCHOR,
    dayEndHour: 20,
    dayStartHour: 8,
    events: [],
    view: 'week',
    weekStartsOn: 0,
    ...overrides,
  };
}

/**
 * Provide the store at the testing-module level, seed it (config + today) BEFORE
 * creating the component, then create + detect. The time-grid does NOT provide its
 * own store — it injects the ambient one the shell would normally provide.
 */
function setup(
  cfg: NgeCalendarConfig = config(),
  today: Date | null = ANCHOR
): {
  el: HTMLElement;
  fixture: ComponentFixture<NgeTimeGridComponent>;
  store: Store;
} {
  TestBed.configureTestingModule({
    imports: [NgeTimeGridComponent],
    providers: [NgeCalendarStore],
  });
  const store = TestBed.inject(NgeCalendarStore);
  store.setConfig(cfg);
  if (today) {
    store.setToday(today);
  }
  const fixture = TestBed.createComponent(NgeTimeGridComponent);
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, fixture, store };
}

function columns(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>('[data-testid="nge-time-grid-column"]'));
}

/** The column element for the given day-of-month (within month 5 / June). */
function columnForDate(el: HTMLElement, dayOfMonth: number): HTMLElement {
  const col = columns(el).find(c => {
    const d = new Date(c.getAttribute('data-date') ?? '');
    return d.getDate() === dayOfMonth && d.getMonth() === 5;
  });
  if (!col) {
    throw new Error(`Column for Jun ${dayOfMonth} not found`);
  }
  return col;
}

function eventsIn(col: HTMLElement): HTMLElement[] {
  return Array.from(col.querySelectorAll<HTMLElement>('[data-testid="nge-time-grid-event"]'));
}

/**
 * The drag/resize handlers + the geometry seam are `protected`. Tests reach them
 * through this minimal structural view of the component (mirrors how the month
 * view's drag tests work) rather than loosening the component's API. `dragGeometry`
 * is overridden so the px values are deterministic — jsdom's
 * `getBoundingClientRect()` returns zeros, so the real DOM read would give no delta.
 */
interface TimeGridInternals {
  canDrag(event: NormalizedCalendarEvent): boolean;
  canResize(event: NormalizedCalendarEvent): boolean;
  canvasHeightPx(): number;
  clickMinuteOfDay(event: MouseEvent, vm: TimeGridViewModel): number;
  colTabIndex(column: TimeGridColumn): -1 | 0;
  dragGeometry(eventEl: HTMLElement): { canvasPx: number; colPx: number };
  onColumnClick(event: MouseEvent, column: TimeGridColumn): void;
  onEventDragEnd(e: CdkDragEnd): void;
  onEventDragStart(event: NormalizedCalendarEvent): void;
  onGridKeydown(event: KeyboardEvent): void;
  onResizeHandleDown(e: PointerEvent, event: NormalizedCalendarEvent): void;
}

function internals(fixture: ComponentFixture<NgeTimeGridComponent>): TimeGridInternals {
  return fixture.componentInstance as unknown as TimeGridInternals;
}

/**
 * Build a minimal `CdkDragEnd`-shaped object. jsdom can't synthesize a real CDK
 * pointer drag, so `onEventDragEnd` is invoked directly with just the fields it
 * reads: the pixel `distance` ({x, y}) and a `source` whose `element.nativeElement`
 * is the dragged block and whose `reset()` is a spy (asserts the transform snap-back).
 */
function dragEnd(
  distance: { x: number; y: number },
  eventEl: HTMLElement = document.createElement('button'),
  reset: jest.Mock = jest.fn()
): CdkDragEnd {
  return {
    distance,
    source: { element: { nativeElement: eventEl }, reset },
  } as unknown as CdkDragEnd;
}

/** The single timed block in the Jun 15 column (throws if missing). */
function eventBlock(el: HTMLElement): HTMLElement {
  const block = eventsIn(columnForDate(el, 15))[0];
  if (!block) {
    throw new Error('timed block not rendered');
  }
  return block;
}

/** Parsed `top%` of the single now-line; throws if it is not rendered. */
function nowTop(el: HTMLElement): number {
  const line = el.querySelector<HTMLElement>('[data-testid="nge-time-grid-now"]');
  if (!line) {
    throw new Error('now-line not rendered');
  }
  return parseFloat(line.style.top);
}

/** The `TimeGridColumn` whose date is `day` of June 2026 in the rendered view-model. */
function juneColumn(store: Store, day: number): TimeGridColumn {
  const column = store
    .timeGridViewModel()
    ?.columns.find(c => c.date.getDate() === day && c.date.getMonth() === 5);
  if (!column) {
    throw new Error(`Column for Jun ${day} not found in view-model`);
  }
  return column;
}

/**
 * Dispatch a real bubbling `keydown` on a column (the roving-tabindex element the
 * handler is bound to). Returns the event so a test can assert `defaultPrevented`.
 */
function pressKey(column: HTMLElement, key: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key });
  column.dispatchEvent(ev);
  return ev;
}

/** Minutes-since-midnight of a focused-slot `Date` (`getHours()*60 + getMinutes()`). */
function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

describe('NgeTimeGridComponent', () => {
  // Pin the wall clock so the constructor's `setCurrentTime(new Date())` now-line
  // seed (and any fallback to "real now") is deterministic.
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOON);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('structure', () => {
    it('creates and tags the host with the nge-time-grid class', () => {
      const { el, fixture } = setup();
      expect(fixture.componentInstance).toBeTruthy();
      expect(el.classList.contains('nge-time-grid')).toBe(true);
    });

    it('renders 7 columns for the week view', () => {
      const { el } = setup();
      expect(columns(el)).toHaveLength(7);
    });

    it('renders 1 column for the day view', () => {
      const { el } = setup(config({ view: 'day' }));
      expect(columns(el)).toHaveLength(1);
      expect(new Date(columns(el)[0].getAttribute('data-date') ?? '').getDate()).toBe(15);
    });

    it('renders nothing until a config seeds the time-grid view-model', () => {
      TestBed.configureTestingModule({
        imports: [NgeTimeGridComponent],
        providers: [NgeCalendarStore],
      });
      const fixture = TestBed.createComponent(NgeTimeGridComponent);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="nge-time-grid"]')).toBeNull();
    });

    it('renders one hour label per gridline (dayStart..dayEnd inclusive)', () => {
      const { el } = setup();
      // 08:00 … 20:00 inclusive = 13 hour lines.
      expect(el.querySelectorAll('.nge-time-grid__hour-label')).toHaveLength(13);
    });
  });

  describe('week column ordering', () => {
    it('starts the columns on Sunday for weekStartsOn=0', () => {
      const { el } = setup(config({ weekStartsOn: 0 }));
      expect(new Date(columns(el)[0].getAttribute('data-date') ?? '').getDay()).toBe(0);
    });

    it('starts the columns on Monday for weekStartsOn=1', () => {
      const { el } = setup(config({ weekStartsOn: 1 }));
      expect(new Date(columns(el)[0].getAttribute('data-date') ?? '').getDay()).toBe(1);
    });
  });

  describe('timed events', () => {
    it('positions a timed block by its minute offset (top) and duration (height)', () => {
      // 09:00–11:00 in an 08:00–20:00 window: top = 60/720, height = 120/720.
      const { el } = setup(config({ events: [event({ id: 'mtg' })] }));
      const block = eventsIn(columnForDate(el, 15))[0];
      expect(block.getAttribute('data-event-id')).toBe('mtg');
      expect(parseFloat(block.style.top)).toBeCloseTo((60 / 720) * 100, 3);
      expect(parseFloat(block.style.height)).toBeCloseTo((120 / 720) * 100, 3);
    });

    it('lays overlapping events side-by-side in lanes (no collision)', () => {
      const { el } = setup(
        config({
          events: [
            event({
              end: new Date(2026, 5, 15, 10, 0),
              id: 'a',
              start: new Date(2026, 5, 15, 9, 0),
            }),
            event({
              end: new Date(2026, 5, 15, 10, 30),
              id: 'b',
              start: new Date(2026, 5, 15, 9, 30),
            }),
          ],
        })
      );
      const blocks = eventsIn(columnForDate(el, 15));
      expect(blocks).toHaveLength(2);
      // Two overlapping events → two lanes, each half width, side by side.
      expect(parseFloat(blocks[0].style.left)).toBeCloseTo(0, 3);
      expect(parseFloat(blocks[1].style.left)).toBeCloseTo(50, 3);
      for (const block of blocks) {
        expect(parseFloat(block.style.width)).toBeCloseTo(50, 3);
      }
    });

    it('selects an event on click', () => {
      const { el, fixture, store } = setup(config({ events: [event({ id: 'pick' })] }));
      eventsIn(columnForDate(el, 15))[0].click();
      fixture.detectChanges();
      expect(store.selectedEventId()).toBe('pick');
    });
  });

  describe('all-day vs timed separation', () => {
    it('renders an all-day event in the all-day strip, not as a timed block', () => {
      const { el } = setup(
        config({ events: [event({ allDay: true, id: 'holiday', title: 'Holiday' })] })
      );
      const bars = el.querySelectorAll('[data-testid="nge-time-grid-allday-bar"]');
      expect(bars).toHaveLength(1);
      expect(bars[0].getAttribute('data-event-id')).toBe('holiday');
      // No timed block carries the all-day event.
      expect(el.querySelectorAll('[data-testid="nge-time-grid-event"]')).toHaveLength(0);
    });
  });

  describe('now indicator', () => {
    it('shows one now-line in the today column at the current-time offset', () => {
      const { el } = setup();
      const nowLines = el.querySelectorAll<HTMLElement>('[data-testid="nge-time-grid-now"]');
      expect(nowLines).toHaveLength(1);
      // 12:00 within 08:00–20:00 → (720-480)/720 = 33.33%.
      expect(parseFloat(nowLines[0].style.top)).toBeCloseTo((240 / 720) * 100, 3);
      // …and it lives inside the Jun 15 (today) column.
      expect(
        columnForDate(el, 15).querySelector('[data-testid="nge-time-grid-now"]')
      ).toBeTruthy();
    });

    it('hides the now-line when today is not in the visible range', () => {
      // Anchor a week far from the pinned "today" → no column matches.
      const { el } = setup(config({ date: new Date(2027, 0, 20) }));
      expect(el.querySelectorAll('[data-testid="nge-time-grid-now"]')).toHaveLength(0);
    });

    it('hides the now-line when the current time is outside the day window', () => {
      const { el, fixture, store } = setup();
      store.setCurrentTime(new Date(2026, 5, 15, 6, 0)); // 06:00, before dayStartHour 08
      fixture.detectChanges();
      expect(el.querySelectorAll('[data-testid="nge-time-grid-now"]')).toHaveLength(0);
    });

    it('moves the now-line down as the current time advances', () => {
      const { el, fixture, store } = setup();
      const before = nowTop(el);
      store.setCurrentTime(new Date(2026, 5, 15, 16, 0)); // 16:00 — later in the day
      fixture.detectChanges();
      expect(nowTop(el)).toBeGreaterThan(before);
    });

    it('ticks the clock so the store currentTime advances over a minute', () => {
      const { store } = setup();
      jest.setSystemTime(new Date(2026, 5, 15, 13, 30));
      jest.advanceTimersByTime(60_000); // fire the once-a-minute interval
      const now = store.currentTime();
      expect(now?.getHours()).toBe(13);
      expect(now?.getMinutes()).toBeGreaterThanOrEqual(30);
    });
  });

  // The 08:00–20:00 config window is 720 minutes; default slotMinutes is 30. The
  // store's snap / min-one-slot / editable maths is exhaustively covered in
  // with-calendar-drag.spec.ts — here we cover the time-grid's px→delta conversion
  // and the handler wiring (jsdom can't synthesize real CDK / pointer drags, and
  // getBoundingClientRect() returns zeros, so geometry is injected through seams).
  describe('px → delta conversion (pure helpers)', () => {
    it('minuteDeltaFromPixels maps a vertical pixel delta to minutes against the canvas', () => {
      // Half the canvas height == half the day window (720) == 360 minutes.
      expect(minuteDeltaFromPixels(360, 720, 720)).toBe(360);
      // A canvas twice as tall halves the minutes per pixel.
      expect(minuteDeltaFromPixels(360, 1440, 720)).toBe(180);
    });

    it('minuteDeltaFromPixels guards a zero/negative canvas (jsdom rect = 0)', () => {
      expect(minuteDeltaFromPixels(360, 0, 720)).toBe(0);
      expect(minuteDeltaFromPixels(360, -10, 720)).toBe(0);
    });

    it('dayDeltaFromPixels rounds the horizontal travel to whole columns', () => {
      expect(dayDeltaFromPixels(100, 100)).toBe(1); // exactly one column over
      expect(dayDeltaFromPixels(149, 100)).toBe(1); // < 1.5 cols → 1
      expect(dayDeltaFromPixels(150, 100)).toBe(2); // ≥ 1.5 cols → 2
      expect(dayDeltaFromPixels(-100, 100)).toBe(-1); // dragged left a column
    });

    it('dayDeltaFromPixels guards a zero column width', () => {
      expect(dayDeltaFromPixels(100, 0)).toBe(0);
    });
  });

  describe('canDrag / canResize gating', () => {
    const TIMED = event({ id: 'block' });

    it('canDrag is false when the calendar is not globally editable', () => {
      const { fixture } = setup(config({ editable: false, events: [TIMED] }));
      expect(internals(fixture).canDrag(TIMED as NormalizedCalendarEvent)).toBe(false);
    });

    it('canDrag is false when the event opts out (editable === false)', () => {
      const locked = event({ editable: false, id: 'locked' });
      const { fixture } = setup(config({ editable: true, events: [locked] }));
      expect(internals(fixture).canDrag(locked as NormalizedCalendarEvent)).toBe(false);
    });

    it('canDrag is true when the calendar is editable and the event opts in', () => {
      const { fixture } = setup(config({ editable: true, events: [TIMED] }));
      expect(internals(fixture).canDrag(TIMED as NormalizedCalendarEvent)).toBe(true);
    });

    it('canResize is false for an event with no end even when draggable', () => {
      const noEnd = event({ end: undefined, id: 'noend' });
      const { fixture, store } = setup(config({ editable: true, events: [noEnd] }));
      const normalized = store.events().find(e => e.id === 'noend');
      expect(normalized?.end).toBeNull();
      expect(internals(fixture).canDrag(normalized as NormalizedCalendarEvent)).toBe(true);
      expect(internals(fixture).canResize(normalized as NormalizedCalendarEvent)).toBe(false);
    });

    it('canResize is true for an editable event that has an end', () => {
      const { fixture, store } = setup(config({ editable: true, events: [TIMED] }));
      const normalized = store.events().find(e => e.id === 'block');
      expect(internals(fixture).canResize(normalized as NormalizedCalendarEvent)).toBe(true);
    });
  });

  describe('drag affordance in the DOM', () => {
    it('marks an editable block draggable and renders its resize handle', () => {
      const { el } = setup(config({ editable: true, events: [event({ id: 'block' })] }));
      const block = eventBlock(el);
      expect(block.classList.contains('nge-time-grid__event--draggable')).toBe(true);
      expect(block.querySelector('[data-testid="nge-time-grid-resize"]')).toBeTruthy();
    });

    it('does not mark a non-editable block draggable and omits the resize handle', () => {
      const { el } = setup(config({ editable: false, events: [event({ id: 'block' })] }));
      const block = eventBlock(el);
      expect(block.classList.contains('nge-time-grid__event--draggable')).toBe(false);
      expect(block.querySelector('[data-testid="nge-time-grid-resize"]')).toBeNull();
    });

    it('omits the resize handle on a block whose event opts out (mixed editable)', () => {
      // Two events on Jun 15: one editable (block + handle), one opted out (block, no handle).
      const { el } = setup(
        config({
          editable: true,
          events: [
            event({
              end: new Date(2026, 5, 15, 10, 0),
              id: 'open',
              start: new Date(2026, 5, 15, 9, 0),
            }),
            event({
              editable: false,
              end: new Date(2026, 5, 15, 16, 0),
              id: 'locked',
              start: new Date(2026, 5, 15, 15, 0),
            }),
          ],
        })
      );
      const byId = (id: string): HTMLElement => {
        const b = eventsIn(columnForDate(el, 15)).find(x => x.getAttribute('data-event-id') === id);
        if (!b) {
          throw new Error(`block ${id} not rendered`);
        }
        return b;
      };
      expect(byId('open').querySelector('[data-testid="nge-time-grid-resize"]')).toBeTruthy();
      expect(byId('locked').classList.contains('nge-time-grid__event--draggable')).toBe(false);
      expect(byId('locked').querySelector('[data-testid="nge-time-grid-resize"]')).toBeNull();
    });
  });

  describe('onEventDragEnd (move)', () => {
    it('converts the pixel distance and commits a snapped drop (new time + day)', () => {
      const { el, fixture, store } = setup(
        config({ editable: true, events: [event({ id: 'block' })] })
      );
      const block = eventBlock(el);
      // Inject deterministic geometry: 720px canvas (1px = 1min), 100px columns.
      const inst = internals(fixture);
      jest.spyOn(inst, 'dragGeometry').mockReturnValue({ canvasPx: 720, colPx: 100 });

      inst.onEventDragStart(store.events().find(e => e.id === 'block') as NormalizedCalendarEvent);
      // 35px down → 35 raw min → snaps to 30 (one slot); 100px right → +1 day.
      const reset = jest.fn();
      inst.onEventDragEnd(dragEnd({ x: 100, y: 35 }, block, reset));

      const drop = store.lastEventDrop();
      expect(drop).not.toBeNull();
      expect(drop?.event.id).toBe('block');
      // 09:00 Jun 15 + 1 day + 30 min → 09:30 Jun 16; end 11:00 → 11:30 Jun 16.
      expect(drop?.newStart.getDate()).toBe(16);
      expect(drop?.newStart.getHours()).toBe(9);
      expect(drop?.newStart.getMinutes()).toBe(30);
      expect(drop?.newEnd?.getDate()).toBe(16);
      expect(drop?.newEnd?.getHours()).toBe(11);
      expect(drop?.newEnd?.getMinutes()).toBe(30);
      // The CDK transform is reset so the block snaps back (move sticks via config).
      expect(reset).toHaveBeenCalledTimes(1);
      expect(store.drag()).toBeNull();
    });

    it('snaps a sub-half-slot vertical nudge back to no movement', () => {
      const { el, fixture, store } = setup(
        config({ editable: true, events: [event({ id: 'block' })] })
      );
      const block = eventBlock(el);
      const inst = internals(fixture);
      jest.spyOn(inst, 'dragGeometry').mockReturnValue({ canvasPx: 720, colPx: 100 });

      inst.onEventDragStart(store.events().find(e => e.id === 'block') as NormalizedCalendarEvent);
      inst.onEventDragEnd(dragEnd({ x: 0, y: 10 }, block)); // 10 min < 15 → snaps to 0

      const drop = store.lastEventDrop();
      expect(drop?.newStart.getDate()).toBe(15);
      expect(drop?.newStart.getHours()).toBe(9);
      expect(drop?.newStart.getMinutes()).toBe(0);
    });

    it('still resets the transform but commits nothing when not editable (startDrag refused)', () => {
      const { el, fixture, store } = setup(
        config({ editable: false, events: [event({ id: 'block' })] })
      );
      const block = eventBlock(el);
      const inst = internals(fixture);
      jest.spyOn(inst, 'dragGeometry').mockReturnValue({ canvasPx: 720, colPx: 100 });

      inst.onEventDragStart(store.events().find(e => e.id === 'block') as NormalizedCalendarEvent);
      const reset = jest.fn();
      inst.onEventDragEnd(dragEnd({ x: 100, y: 60 }, block, reset));

      expect(store.lastEventDrop()).toBeNull(); // startDrag refused → nothing to commit
      expect(reset).toHaveBeenCalledTimes(1); // …but the CDK transform is still reset
    });
  });

  describe('onResizeHandleDown (pointer resize)', () => {
    /**
     * Build the pointerdown handed to `onResizeHandleDown`. It only READS fields
     * (`target` / `clientY` / `pointerId` / `preventDefault` / `stopPropagation`),
     * so a plain object suffices — and is required, because a real `Event.target`
     * is a read-only getter that `Object.assign` can't set. The down's `target` is
     * the handle the move/up listeners get attached to.
     */
    function pointerDown(handle: HTMLElement): PointerEvent {
      return {
        clientY: 0,
        pointerId: 1,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: handle,
      } as unknown as PointerEvent;
    }

    /**
     * Drive a full pointer-resize gesture against a real handle element. The down's
     * clientY is the origin; the listeners the handler attaches then receive
     * pointermove/up events DISPATCHED on the same element — real `Event`s (so
     * dispatch sets `target` for us) with custom `clientY` props (which survive
     * jsdom dispatch). `canvasHeightPx` is stubbed so the px→minute conversion is
     * deterministic (real getBoundingClientRect → 0 in jsdom).
     */
    function resizeBy(
      fixture: ComponentFixture<NgeTimeGridComponent>,
      ev: NormalizedCalendarEvent,
      deltaPx: number,
      canvasPx = 720
    ): void {
      const inst = internals(fixture);
      jest.spyOn(inst, 'canvasHeightPx' as keyof TimeGridInternals).mockReturnValue(canvasPx);
      const handle = document.createElement('span');
      inst.onResizeHandleDown(pointerDown(handle), ev);
      handle.dispatchEvent(
        Object.assign(new Event('pointermove'), { clientY: deltaPx, pointerId: 1 })
      );
      handle.dispatchEvent(
        Object.assign(new Event('pointerup'), { clientY: deltaPx, pointerId: 1 })
      );
    }

    it('commits a snapped resize extending the end (drag down)', () => {
      const { fixture, store } = setup(
        config({ editable: true, events: [event({ id: 'block' })] })
      );
      const ev = store.events().find(e => e.id === 'block') as NormalizedCalendarEvent;
      // 720px canvas (1px = 1min); 50px down → 50 raw min → snaps to 60 (two slots).
      resizeBy(fixture, ev, 50);

      const resize = store.lastEventResize();
      expect(resize).not.toBeNull();
      expect(resize?.event.id).toBe('block');
      // end 11:00 + 60 min → 12:00 (still Jun 15).
      expect(resize?.newEnd.getHours()).toBe(12);
      expect(resize?.newEnd.getMinutes()).toBe(0);
      expect(store.drag()).toBeNull(); // cleared after commit
    });

    it('clamps to a minimum of one slot when dragged up past the start (no inversion)', () => {
      const { fixture, store } = setup(
        config({ editable: true, events: [event({ id: 'block' })] })
      );
      const ev = store.events().find(e => e.id === 'block') as NormalizedCalendarEvent;
      // Drag the end far up (-300px): would invert the 09:00–11:00 event; store
      // clamps newEnd to one slot (30 min) after the 09:00 start → 09:30.
      resizeBy(fixture, ev, -300);

      const resize = store.lastEventResize();
      expect(resize?.newEnd.getHours()).toBe(9);
      expect(resize?.newEnd.getMinutes()).toBe(30);
    });

    it('opens the resize gesture with mode "resize" and stops the block drag', () => {
      const { fixture, store } = setup(
        config({ editable: true, events: [event({ id: 'block' })] })
      );
      const ev = store.events().find(e => e.id === 'block') as NormalizedCalendarEvent;
      const startSpy = jest.spyOn(store, 'startDrag');
      const inst = internals(fixture);
      jest.spyOn(inst, 'canvasHeightPx' as keyof TimeGridInternals).mockReturnValue(720);
      const preventDefault = jest.fn();
      const stopPropagation = jest.fn();
      const down = {
        clientY: 0,
        pointerId: 1,
        preventDefault,
        stopPropagation,
        target: document.createElement('span'),
      } as unknown as PointerEvent;

      inst.onResizeHandleDown(down, ev);

      // The block's own cdkDrag is suppressed, and the resize gesture is open.
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalledWith({ eventId: 'block', mode: 'resize' });
      expect(store.drag()?.mode).toBe('resize');
    });

    it('does not open a gesture when the calendar is not editable', () => {
      const { fixture, store } = setup(
        config({ editable: false, events: [event({ id: 'block' })] })
      );
      const ev = store.events().find(e => e.id === 'block') as NormalizedCalendarEvent;
      resizeBy(fixture, ev, 50);
      expect(store.lastEventResize()).toBeNull();
      expect(store.drag()).toBeNull();
    });
  });

  // The 08:00–20:00 config window = 480..1200 min; slotMinutes = 30, so the last whole
  // slot is 1170 (19:30). The anchor is Jun 15 (the second of the Sun 14 … Sat 20
  // columns). With focus unset, the keyboard seed is the anchor day at the first slot
  // (Jun 15 @ 08:00 = 480 min).
  describe('keyboard navigation + slot click + roving focus (S10)', () => {
    describe('roving tabindex', () => {
      it('puts the anchor column at tabindex 0 and every other column at -1 when focus is unset', () => {
        const { el, store } = setup();
        expect(store.focusedDate()).toBeNull();

        const zero = columns(el).filter(c => c.getAttribute('tabindex') === '0');
        const minusOne = columns(el).filter(c => c.getAttribute('tabindex') === '-1');
        // Exactly one tab stop (the anchor, Jun 15); the other six removed from the order.
        expect(zero).toHaveLength(1);
        expect(minusOne).toHaveLength(6);
        const anchorDate = new Date(zero[0].getAttribute('data-date') ?? '');
        expect(anchorDate.getMonth()).toBe(5);
        expect(anchorDate.getDate()).toBe(15);
      });

      it('moves the single tabindex=0 to the focused day column after setFocusedDate', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(2026, 5, 17, 12, 0)); // Jun 17, noon
        fixture.detectChanges();

        const zero = columns(el).filter(c => c.getAttribute('tabindex') === '0');
        expect(zero).toHaveLength(1);
        expect(new Date(zero[0].getAttribute('data-date') ?? '').getDate()).toBe(17);
      });

      it('colTabIndex returns 0 only for the column matching the focused day', () => {
        const { fixture, store } = setup();
        store.setFocusedDate(new Date(2026, 5, 17, 9, 0));
        expect(internals(fixture).colTabIndex(juneColumn(store, 17))).toBe(0);
        expect(internals(fixture).colTabIndex(juneColumn(store, 16))).toBe(-1);
      });
    });

    describe('arrow-key navigation — time (Up/Down)', () => {
      it('ArrowDown moves the focused time +1 slot from the seeded first slot', () => {
        const { el, store } = setup();
        const ev = pressKey(columnForDate(el, 15), 'ArrowDown');
        expect(ev.defaultPrevented).toBe(true);
        const focused = store.focusedDate();
        expect(focused?.getDate()).toBe(15); // same day
        // Seed 08:00 (480) + one slot (30) → 08:30 (510).
        expect(minuteOfDay(focused as Date)).toBe(510);
      });

      it('ArrowUp moves the focused time -1 slot, keeping the same day', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(2026, 5, 15, 12, 0)); // 720 min
        fixture.detectChanges();
        pressKey(columnForDate(el, 15), 'ArrowUp');
        const focused = store.focusedDate();
        expect(focused?.getDate()).toBe(15);
        expect(minuteOfDay(focused as Date)).toBe(690); // 12:00 − 30 → 11:30
      });

      it('clamps ArrowUp at the top of the day window (does not go before dayStart)', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(2026, 5, 15, 8, 0)); // 480 = window start
        fixture.detectChanges();
        const ev = pressKey(columnForDate(el, 15), 'ArrowUp');
        expect(ev.defaultPrevented).toBe(true); // clamp still consumes the key
        expect(minuteOfDay(store.focusedDate() as Date)).toBe(480); // clamped, no move
      });

      it('clamps ArrowDown at the last whole slot of the day window', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(2026, 5, 15, 19, 30)); // 1170 = last slot start
        fixture.detectChanges();
        const ev = pressKey(columnForDate(el, 15), 'ArrowDown');
        expect(ev.defaultPrevented).toBe(true); // clamp still consumes the key
        // dayEnd 20:00 (1200) − slot (30) = 1170; ArrowDown stays put.
        expect(minuteOfDay(store.focusedDate() as Date)).toBe(1170);
      });
    });

    describe('arrow-key navigation — day (Left/Right)', () => {
      it('ArrowRight moves the focused day +1, keeping the time-of-day', () => {
        const { el, store } = setup();
        const ev = pressKey(columnForDate(el, 15), 'ArrowRight');
        expect(ev.defaultPrevented).toBe(true);
        const focused = store.focusedDate();
        expect(focused?.getDate()).toBe(16); // Jun 15 + 1
        expect(minuteOfDay(focused as Date)).toBe(480); // seeded 08:00 preserved
      });

      it('ArrowLeft moves the focused day -1, keeping the time-of-day', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(2026, 5, 16, 13, 30)); // Jun 16, 13:30
        fixture.detectChanges();
        pressKey(columnForDate(el, 16), 'ArrowLeft');
        const focused = store.focusedDate();
        expect(focused?.getDate()).toBe(15); // Jun 16 − 1
        expect(minuteOfDay(focused as Date)).toBe(810); // 13:30 preserved
      });

      it('is a no-op in the single-column day view (does not strand the tab stop)', () => {
        // Day view renders ONE column; a horizontal move has no neighbour to land on,
        // so it must NOT move focus to an unrendered day (which would leave no
        // tabindex=0). The anchor column keeps the focus.
        const { el, store } = setup(config({ view: 'day' }));
        expect(columns(el)).toHaveLength(1);
        const ev = pressKey(columnForDate(el, 15), 'ArrowRight');
        expect(ev.defaultPrevented).toBe(false); // guard returned before preventDefault
        expect(store.focusedDate()).toBeNull(); // no move committed
        // The single column is still the tab stop.
        expect(columnForDate(el, 15).getAttribute('tabindex')).toBe('0');
      });

      it('still moves the TIME (Up/Down) in the day view', () => {
        const { el, store } = setup(config({ view: 'day' }));
        pressKey(columnForDate(el, 15), 'ArrowDown');
        // Seeded 08:00 (480) + one slot → 08:30 (510), same day.
        expect(minuteOfDay(store.focusedDate() as Date)).toBe(510);
      });
    });

    describe('activation (Enter / Space)', () => {
      it('Enter activates the focused slot (start … start + slotMinutes)', () => {
        const { el, store } = setup();
        const ev = pressKey(columnForDate(el, 15), 'Enter');
        expect(ev.defaultPrevented).toBe(true);

        const slot = store.lastSlotClick();
        expect(slot).not.toBeNull();
        // Seeded Jun 15 @ 08:00 → slot [08:00, 08:30).
        expect(slot?.start).toEqual(new Date(2026, 5, 15, 8, 0));
        expect(slot?.end).toEqual(new Date(2026, 5, 15, 8, 30));
      });

      it('Space activates the slot at the current focused time', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(2026, 5, 15, 14, 0));
        fixture.detectChanges();
        pressKey(columnForDate(el, 15), ' ');
        const slot = store.lastSlotClick();
        expect(slot?.start).toEqual(new Date(2026, 5, 15, 14, 0));
        expect(slot?.end).toEqual(new Date(2026, 5, 15, 14, 30));
      });
    });

    describe('Escape', () => {
      it('closes an open popover', () => {
        const { el, fixture, store } = setup();
        store.openPopover(new Date(2026, 5, 15));
        fixture.detectChanges();
        expect(store.popoverDate()).not.toBeNull();

        pressKey(columnForDate(el, 15), 'Escape');
        expect(store.popoverDate()).toBeNull();
      });
    });

    describe('drag guard', () => {
      it('ignores arrow keys while a drag is in flight', () => {
        const { el, store } = setup(config({ editable: true, events: [event({ id: 'd' })] }));
        store.startDrag({ eventId: 'd', mode: 'move' });
        expect(store.drag()).not.toBeNull();

        const ev = pressKey(columnForDate(el, 15), 'ArrowDown');
        // Guard returns before preventDefault / setFocusedDate.
        expect(ev.defaultPrevented).toBe(false);
        expect(store.focusedDate()).toBeNull();
      });
    });

    describe('onColumnClick → slot', () => {
      it('emits a slot click for an empty-area click and sets it as the focus target', () => {
        const { fixture, store } = setup();
        const inst = internals(fixture);
        const column = juneColumn(store, 16);
        // jsdom's getBoundingClientRect() returns 0, so stub the px→minute seam to a
        // deterministic snapped minute-of-day (09:00 = 540).
        jest.spyOn(inst, 'clickMinuteOfDay').mockReturnValue(540);
        // A click whose target is the bare column body (closest('button') === null).
        const target = document.createElement('div');
        inst.onColumnClick({ target } as unknown as MouseEvent, column);

        expect(minuteOfDay(store.focusedDate() as Date)).toBe(540);
        expect(store.focusedDate()?.getDate()).toBe(16);
        const slot = store.lastSlotClick();
        expect(slot?.start).toEqual(new Date(2026, 5, 16, 9, 0));
        expect(slot?.end).toEqual(new Date(2026, 5, 16, 9, 30));
      });

      it('does NOT emit a slot click when the click originated on an interactive child', () => {
        const { fixture, store } = setup();
        const button = document.createElement('button');
        internals(fixture).onColumnClick(
          { target: button } as unknown as MouseEvent,
          juneColumn(store, 16)
        );
        expect(store.lastSlotClick()).toBeNull();
        expect(store.focusedDate()).toBeNull();
      });

      it('snaps the pointer Y to a slot via clickMinuteOfDay (real geometry seam)', () => {
        const { fixture, store } = setup();
        const inst = internals(fixture);
        const vm = store.timeGridViewModel() as TimeGridViewModel;
        // Build a column element with a deterministic rect: 720px tall (1px = 1min),
        // top at 0. A click 95px down → 95 raw min → snaps to 90 → 08:00 + 90 = 09:30.
        const colEl = document.createElement('div');
        colEl.className = 'nge-time-grid__col';
        colEl.getBoundingClientRect = () => ({ height: 720, top: 0 }) as DOMRect;
        const target = document.createElement('div');
        colEl.appendChild(target);
        const minute = inst.clickMinuteOfDay({ clientY: 95, target } as unknown as MouseEvent, vm);
        expect(minute).toBe(570); // 09:30
      });
    });

    describe('focused-slot band', () => {
      it('renders the focus band only in the focused column at the focused minute', () => {
        const { el, fixture, store } = setup();
        // No focus → no band anywhere.
        expect(el.querySelectorAll('[data-testid="nge-time-grid-focus-slot"]')).toHaveLength(0);

        store.setFocusedDate(new Date(2026, 5, 15, 14, 0)); // 14:00 = 840 min
        fixture.detectChanges();

        const bands = el.querySelectorAll<HTMLElement>('[data-testid="nge-time-grid-focus-slot"]');
        expect(bands).toHaveLength(1);
        // It lives inside the Jun 15 column.
        expect(
          columnForDate(el, 15).querySelector('[data-testid="nge-time-grid-focus-slot"]')
        ).toBeTruthy();
        // top% = (840 − 480) / 720 = 50%; height% = 30 / 720.
        expect(parseFloat(bands[0].style.top)).toBeCloseTo((360 / 720) * 100, 3);
        expect(parseFloat(bands[0].style.height)).toBeCloseTo((30 / 720) * 100, 3);
      });

      it('hides the band when the focused time is outside the day window', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(2026, 5, 15, 6, 0)); // 06:00, before dayStart 08
        fixture.detectChanges();
        expect(el.querySelectorAll('[data-testid="nge-time-grid-focus-slot"]')).toHaveLength(0);
      });
    });
  });
});
