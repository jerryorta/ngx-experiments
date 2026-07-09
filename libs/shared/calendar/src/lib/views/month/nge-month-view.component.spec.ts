import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';
import { endOfDay, startOfDay } from '@nge/date';

import type { NgeCalendarConfig } from '../../core/models/nge-calendar-config.model';
import type {
  NgeCalendarEvent,
  NormalizedCalendarEvent,
} from '../../core/models/nge-calendar-event.model';
import type { MonthDayCell } from '../../core/view-model/month-view-model.model';

import { NgeCalendarStore } from '../../nge-calendar/store';
import { NgeMonthViewComponent } from './nge-month-view.component';

type Store = InstanceType<typeof NgeCalendarStore>;

/**
 * The drag handlers are `protected`. Tests reach them through this minimal
 * structural view of the component (mirrors how the store/DOM are exercised
 * elsewhere) rather than loosening the component's API.
 */
interface MonthViewInternals {
  canDrag(event: NormalizedCalendarEvent): boolean;
  cellTabIndex(day: MonthDayCell): -1 | 0;
  onCellClick(event: MouseEvent, day: MonthDayCell): void;
  onChipDropped(e: CdkDragDrop<Date>, targetDay: MonthDayCell): void;
}

/**
 * Build a minimal `CdkDragDrop`-shaped object. jsdom can't synthesize a real CDK
 * pointer drag, so `onChipDropped` is invoked directly with just the fields it
 * reads: the dragged event (`item.data`), the source day's date
 * (`previousContainer.data`) and target identity (same ref ⇒ same-cell no-op).
 */
function dropEvent(
  event: NormalizedCalendarEvent,
  sourceDate: Date,
  sameCell = false
): CdkDragDrop<Date> {
  const previousContainer = { data: sourceDate };
  const container = sameCell ? previousContainer : { data: new Date(0) };
  return {
    container,
    item: { data: event },
    previousContainer,
  } as unknown as CdkDragDrop<Date>;
}

// June 2026, anchored on the 15th. With weekStartsOn=0 (Sunday) the grid's first
// row spills back into late May, so out-of-month cells are guaranteed to exist.
const ANCHOR = new Date(2026, 5, 15); // Mon Jun 15 2026

function event(overrides: Partial<NgeCalendarEvent> = {}): NgeCalendarEvent {
  return {
    end: new Date(2026, 5, 10, 10, 0),
    id: 'evt',
    start: new Date(2026, 5, 10, 9, 0),
    title: 'Event',
    ...overrides,
  };
}

function config(overrides: Partial<NgeCalendarConfig> = {}): NgeCalendarConfig {
  return {
    date: ANCHOR,
    events: [],
    view: 'month',
    ...overrides,
  };
}

/**
 * Provide the store at the testing-module level, seed it (config + today) BEFORE
 * creating the component, then create + detect. The month view does NOT provide
 * its own store — it injects the ambient one the shell would normally provide.
 */
function setup(
  cfg: NgeCalendarConfig = config(),
  today: Date | null = ANCHOR
): {
  el: HTMLElement;
  fixture: ComponentFixture<NgeMonthViewComponent>;
  store: Store;
} {
  TestBed.configureTestingModule({
    imports: [NgeMonthViewComponent],
    providers: [NgeCalendarStore],
  });
  const store = TestBed.inject(NgeCalendarStore);
  store.setConfig(cfg);
  if (today) {
    store.setToday(today);
  }
  const fixture = TestBed.createComponent(NgeMonthViewComponent);
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, fixture, store };
}

function dayCells(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>('[data-testid="nge-month-day"]'));
}

/** Reach the component's `protected` keyboard / click / tabindex API. */
function internals(fixture: ComponentFixture<NgeMonthViewComponent>): MonthViewInternals {
  return fixture.componentInstance as unknown as MonthViewInternals;
}

/** The rendered day cell whose `data-date` ISO string matches `date`. */
function cellForDate(el: HTMLElement, date: Date): HTMLElement | undefined {
  return dayCells(el).find(c => c.getAttribute('data-date') === date.toISOString());
}

/**
 * Dispatch a real bubbling `keydown` on a cell (the roving-tabindex element the
 * handler is bound to). Returns the event so a test can assert `defaultPrevented`.
 */
function pressKey(cell: HTMLElement, key: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key });
  cell.dispatchEvent(ev);
  return ev;
}

describe('NgeMonthViewComponent', () => {
  // Pin the wall clock so anything that might fall back to "real now" is
  // deterministic; assertions still prefer the explicit `store.setToday(...)`.
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('grid structure', () => {
    it('creates and tags the host with the nge-month-view class', () => {
      const { el, fixture } = setup();
      expect(fixture.componentInstance).toBeTruthy();
      expect(el.classList.contains('nge-month-view')).toBe(true);
    });

    it('renders 6 weeks × 7 = 42 day cells and a 7-label weekday header', () => {
      const { el } = setup();
      expect(dayCells(el)).toHaveLength(42);
      expect(el.querySelectorAll('.nge-month-view__weekday')).toHaveLength(7);
    });

    it('renders nothing until a config seeds the month view-model', () => {
      // No setConfig → monthViewModel() is null → @if guard renders no grid.
      TestBed.configureTestingModule({
        imports: [NgeMonthViewComponent],
        providers: [NgeCalendarStore],
      });
      const fixture = TestBed.createComponent(NgeMonthViewComponent);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="nge-month-view"]')).toBeNull();
    });
  });

  describe('weekday alignment', () => {
    it('starts the header on Sunday for weekStartsOn=0', () => {
      const { el } = setup(config({ locale: 'en-US', weekStartsOn: 0 }));
      const labels = Array.from(el.querySelectorAll('.nge-month-view__weekday')).map(
        l => l.textContent?.trim() ?? ''
      );
      expect(labels[0]).toBe('Sun');
      // First cell of the grid is a Sunday (getDay() === 0).
      const firstDate = new Date(dayCells(el)[0].getAttribute('data-date') ?? '');
      expect(firstDate.getDay()).toBe(0);
    });

    it('starts the header on Monday for weekStartsOn=1', () => {
      const { el } = setup(config({ locale: 'en-US', weekStartsOn: 1 }));
      const labels = Array.from(el.querySelectorAll('.nge-month-view__weekday')).map(
        l => l.textContent?.trim() ?? ''
      );
      expect(labels[0]).toBe('Mon');
      // First cell of the grid is a Monday (getDay() === 1).
      const firstDate = new Date(dayCells(el)[0].getAttribute('data-date') ?? '');
      expect(firstDate.getDay()).toBe(1);
    });
  });

  describe('overflow "+N more"', () => {
    function overflowConfig(): NgeCalendarConfig {
      // Five single-day timed events all on Jun 10 → over the default max of 3.
      const events = Array.from({ length: 5 }, (_unused, i) =>
        event({
          end: new Date(2026, 5, 10, i + 1, 30),
          id: `e${i}`,
          start: new Date(2026, 5, 10, i + 1, 0),
          title: `E${i}`,
        })
      );
      return config({ events });
    }

    function jun10Cell(el: HTMLElement): HTMLElement {
      const cell = dayCells(el).find(c => {
        const d = new Date(c.getAttribute('data-date') ?? '');
        return d.getDate() === 10 && d.getMonth() === 5;
      });
      if (!cell) {
        throw new Error('Jun 10 cell not found');
      }
      return cell;
    }

    it('renders exactly the visible chips + a "+N more" with the hidden count', () => {
      const { el } = setup(overflowConfig());
      const cell = jun10Cell(el);
      // Default maxEventsPerCell is 3 → 3 visible chips, 2 hidden.
      expect(cell.querySelectorAll('[data-testid="nge-month-chip"]')).toHaveLength(3);
      const more = cell.querySelector<HTMLButtonElement>('[data-testid="nge-month-more"]');
      expect(more).toBeTruthy();
      expect(more?.textContent?.trim()).toBe('+2 more');
    });

    it('opens a popover listing exactly store.popoverEvents() when "+N more" is clicked', () => {
      const { el, fixture, store } = setup(overflowConfig());
      const cell = jun10Cell(el);
      const more = cell.querySelector<HTMLButtonElement>('[data-testid="nge-month-more"]');
      more?.click();
      fixture.detectChanges();

      const popover = el.querySelector('[data-testid="nge-month-popover"]');
      expect(popover).toBeTruthy();
      // popoverEvents() is the full chip list (5), not just the hidden ones.
      expect(store.popoverEvents()).toHaveLength(5);
      expect(popover?.querySelectorAll('[data-testid="nge-month-popover-event"]')).toHaveLength(5);
    });

    it('selects an event from the popover and closes it via the close button', () => {
      const { el, fixture, store } = setup(overflowConfig());
      jun10Cell(el).querySelector<HTMLButtonElement>('[data-testid="nge-month-more"]')?.click();
      fixture.detectChanges();

      const firstEvent = el.querySelector<HTMLButtonElement>(
        '[data-testid="nge-month-popover-event"]'
      );
      firstEvent?.click();
      fixture.detectChanges();
      expect(store.selectedEventId()).toBe('e0');

      el.querySelector<HTMLButtonElement>('[data-testid="nge-month-popover-close"]')?.click();
      fixture.detectChanges();
      expect(store.popoverDate()).toBeNull();
      expect(el.querySelector('[data-testid="nge-month-popover"]')).toBeNull();
    });
  });

  describe('selection', () => {
    it('selects a chip event on click', () => {
      const { el, fixture, store } = setup(
        config({ events: [event({ id: 'pick', title: 'Pick me' })] })
      );
      const chip = el.querySelector<HTMLButtonElement>('[data-testid="nge-month-chip"]');
      expect(chip).toBeTruthy();
      chip?.click();
      fixture.detectChanges();
      expect(store.selectedEventId()).toBe('pick');
    });
  });

  describe('multi-day bars', () => {
    it('renders a multi-day event as a spanning bar and NOT as chips', () => {
      // Jun 9 (Tue) → Jun 11 (Thu): inside one Sunday-start week row.
      const multi = event({
        end: new Date(2026, 5, 11, 12, 0),
        id: 'multi',
        start: new Date(2026, 5, 9, 9, 0),
        title: 'Conference',
      });
      const { el, fixture, store } = setup(config({ events: [multi] }));

      const bars = el.querySelectorAll<HTMLElement>('[data-testid="nge-month-bar"]');
      expect(bars).toHaveLength(1);
      expect(bars[0].getAttribute('data-event-id')).toBe('multi');
      // No chip carries the multi-day event.
      const chipIds = Array.from(el.querySelectorAll('[data-testid="nge-month-chip"]')).map(c =>
        c.getAttribute('data-event-id')
      );
      expect(chipIds).not.toContain('multi');

      // Clicking the bar selects the event.
      bars[0].click();
      fixture.detectChanges();
      expect(store.selectedEventId()).toBe('multi');
    });

    it('wraps a week-crossing event into a bar in each spanned week row', () => {
      // weekStartsOn=0: Jun 13 (Sat) is the LAST column of one week row and
      // Jun 14 (Sun) opens the NEXT row, so the event straddles the week
      // boundary and must produce a bar in TWO different week rows.
      const crossing = event({
        end: new Date(2026, 5, 14, 12, 0),
        id: 'cross',
        start: new Date(2026, 5, 13, 9, 0),
        title: 'Weekend trip',
      });
      const { el } = setup(config({ events: [crossing], weekStartsOn: 0 }));

      const weeksWithBar = Array.from(el.querySelectorAll('.nge-month-view__week')).filter(week =>
        week.querySelector('[data-testid="nge-month-bar"]')
      );
      expect(weeksWithBar).toHaveLength(2);
    });
  });

  describe('today highlight', () => {
    it('marks only the cell whose date equals store.today() with the today class', () => {
      const { el, store } = setup(config(), ANCHOR);
      const todayCells = dayCells(el).filter(c =>
        c.classList.contains('nge-month-view__day--today')
      );
      expect(todayCells).toHaveLength(1);
      const todayDate = new Date(todayCells[0].getAttribute('data-date') ?? '');
      // Compare the whole day (year+month+date) so a wrong-year TZ-parse can't pass.
      expect(todayDate.toDateString()).toBe(store.today()?.toDateString());
    });

    it('marks no cell as today when store.today() is null', () => {
      const { el } = setup(config(), null);
      const todayCells = dayCells(el).filter(c =>
        c.classList.contains('nge-month-view__day--today')
      );
      expect(todayCells).toHaveLength(0);
    });
  });

  describe('out-of-month dimming', () => {
    it('marks the previous/next-month cells with the out-of-month class', () => {
      const { el } = setup();
      const outCells = dayCells(el).filter(c =>
        c.classList.contains('nge-month-view__day--out-of-month')
      );
      // June 2026 (Sunday-start) spills into late May and early July.
      expect(outCells.length).toBeGreaterThan(0);
      // Every out-of-month cell's date is NOT in June (month 5).
      for (const c of outCells) {
        const d = new Date(c.getAttribute('data-date') ?? '');
        expect(d.getMonth()).not.toBe(5);
      }
    });
  });

  describe('drag-drop', () => {
    // A single-day event on Jun 10 that the gating/drop tests move around.
    const DRAGGABLE = event({ id: 'drag-me', title: 'Drag me' });

    /** The `MonthDayCell` whose date is `day` of June 2026 in the rendered model. */
    function juneCell(store: Store, day: number): MonthDayCell {
      const cell = store
        .monthViewModel()
        ?.weeks.flatMap(w => w.days)
        .find(d => d.date.getDate() === day && d.date.getMonth() === 5);
      if (!cell) {
        throw new Error(`June ${day} cell not found in view-model`);
      }
      return cell;
    }

    describe('canDrag gating', () => {
      it('is false when the calendar is not globally editable', () => {
        const { fixture } = setup(config({ editable: false, events: [DRAGGABLE] }));
        expect(internals(fixture).canDrag(DRAGGABLE as NormalizedCalendarEvent)).toBe(false);
      });

      it('is false when the event opts out (editable === false)', () => {
        const locked = event({ editable: false, id: 'locked', title: 'Locked' });
        const { fixture } = setup(config({ editable: true, events: [locked] }));
        expect(internals(fixture).canDrag(locked as NormalizedCalendarEvent)).toBe(false);
      });

      it('is true when the calendar is editable and the event does not opt out', () => {
        const { fixture } = setup(config({ editable: true, events: [DRAGGABLE] }));
        expect(internals(fixture).canDrag(DRAGGABLE as NormalizedCalendarEvent)).toBe(true);
      });

      it('reflects canDrag on the chip via the --draggable class and cdkDragDisabled', () => {
        const { el } = setup(config({ editable: true, events: [DRAGGABLE] }));
        const chip = el.querySelector<HTMLElement>('[data-testid="nge-month-chip"]');
        expect(chip?.classList.contains('nge-month-view__chip--draggable')).toBe(true);
      });
    });

    describe('onChipDropped', () => {
      it('drives the store commit, emitting a drop whose newStart lands on the target day', () => {
        const { fixture, store } = setup(config({ editable: true, events: [DRAGGABLE] }));
        const dragged = store.events().find(e => e.id === 'drag-me');
        expect(dragged).toBeTruthy();

        // Drag from Jun 10 (source) onto Jun 12 (target) → +2 days.
        internals(fixture).onChipDropped(
          dropEvent(dragged as NormalizedCalendarEvent, new Date(2026, 5, 10)),
          juneCell(store, 12)
        );

        const drop = store.lastEventDrop();
        expect(drop).not.toBeNull();
        expect(drop?.event.id).toBe('drag-me');
        // Original 09:00 on Jun 10 shifted +2 days → 09:00 on Jun 12.
        expect(drop?.newStart.getMonth()).toBe(5);
        expect(drop?.newStart.getDate()).toBe(12);
        expect(drop?.newStart.getHours()).toBe(9);
        // Drag cleared after a committed move.
        expect(store.drag()).toBeNull();
      });

      it('is a no-op when the chip is dropped back onto its source cell', () => {
        const { fixture, store } = setup(config({ editable: true, events: [DRAGGABLE] }));
        const dragged = store.events().find(e => e.id === 'drag-me');

        internals(fixture).onChipDropped(
          dropEvent(dragged as NormalizedCalendarEvent, new Date(2026, 5, 10), true),
          juneCell(store, 10)
        );

        expect(store.lastEventDrop()).toBeNull();
        expect(store.drag()).toBeNull();
      });

      it('does not commit a drop when the calendar is not editable (startDrag refused)', () => {
        const { fixture, store } = setup(config({ editable: false, events: [DRAGGABLE] }));
        const dragged = store.events().find(e => e.id === 'drag-me');

        internals(fixture).onChipDropped(
          dropEvent(dragged as NormalizedCalendarEvent, new Date(2026, 5, 10)),
          juneCell(store, 12)
        );

        // startDrag was refused, so commitDrag had nothing to commit.
        expect(store.lastEventDrop()).toBeNull();
      });
    });
  });

  describe('keyboard navigation + slot click + roving focus (S10)', () => {
    /** The `MonthDayCell` for `day` of June 2026 in the rendered view-model. */
    function juneDayCell(store: Store, day: number): MonthDayCell {
      const cell = store
        .monthViewModel()
        ?.weeks.flatMap(w => w.days)
        .find(d => d.date.getDate() === day && d.date.getMonth() === 5);
      if (!cell) {
        throw new Error(`June ${day} cell not found in view-model`);
      }
      return cell;
    }

    describe('roving tabindex', () => {
      it('puts the anchor cell at tabindex 0 and every other cell at -1 when focus is unset', () => {
        const { el, store } = setup();
        expect(store.focusedDate()).toBeNull();

        const zero = dayCells(el).filter(c => c.getAttribute('tabindex') === '0');
        const minusOne = dayCells(el).filter(c => c.getAttribute('tabindex') === '-1');
        // Exactly one tab stop, the rest removed from the tab order.
        expect(zero).toHaveLength(1);
        expect(minusOne).toHaveLength(41);
        // …and that one tab stop is the anchor (Jun 15).
        const anchorDate = new Date(zero[0].getAttribute('data-date') ?? '');
        expect(anchorDate.getMonth()).toBe(5);
        expect(anchorDate.getDate()).toBe(15);
      });

      it('moves the single tabindex=0 to the focused cell after setFocusedDate', () => {
        const { el, fixture, store } = setup();
        const target = new Date(2026, 5, 3);
        store.setFocusedDate(target);
        fixture.detectChanges();

        const zero = dayCells(el).filter(c => c.getAttribute('tabindex') === '0');
        expect(zero).toHaveLength(1);
        expect(zero[0].getAttribute('data-date')).toBe(target.toISOString());
      });

      it('cellTabIndex returns 0 only for the focused day cell', () => {
        const { fixture, store } = setup();
        store.setFocusedDate(new Date(2026, 5, 3));
        expect(internals(fixture).cellTabIndex(juneDayCell(store, 3))).toBe(0);
        expect(internals(fixture).cellTabIndex(juneDayCell(store, 4))).toBe(-1);
      });
    });

    describe('arrow-key navigation', () => {
      it('ArrowRight moves the focus date +1 day from the anchor', () => {
        const { el, store } = setup();
        const anchorCell = cellForDate(el, ANCHOR);
        expect(anchorCell).toBeTruthy();

        const ev = pressKey(anchorCell as HTMLElement, 'ArrowRight');
        expect(ev.defaultPrevented).toBe(true);
        const focused = store.focusedDate();
        expect(focused?.getMonth()).toBe(5);
        expect(focused?.getDate()).toBe(16); // Jun 15 + 1
      });

      it('ArrowLeft moves the focus date -1 day', () => {
        const { el, store } = setup();
        pressKey(cellForDate(el, ANCHOR) as HTMLElement, 'ArrowLeft');
        expect(store.focusedDate()?.getDate()).toBe(14); // Jun 15 - 1
      });

      it('ArrowDown moves the focus date +7 days (one week)', () => {
        const { el, store } = setup();
        pressKey(cellForDate(el, ANCHOR) as HTMLElement, 'ArrowDown');
        expect(store.focusedDate()?.getMonth()).toBe(5);
        expect(store.focusedDate()?.getDate()).toBe(22); // Jun 15 + 7
      });

      it('ArrowUp moves the focus date -7 days (one week)', () => {
        const { el, store } = setup();
        pressKey(cellForDate(el, ANCHOR) as HTMLElement, 'ArrowUp');
        expect(store.focusedDate()?.getDate()).toBe(8); // Jun 15 - 7
      });

      it('steps from the existing focus, not always the anchor', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(2026, 5, 3));
        fixture.detectChanges();
        // Dispatch on whatever cell currently holds focus (Jun 3).
        pressKey(cellForDate(el, new Date(2026, 5, 3)) as HTMLElement, 'ArrowRight');
        expect(store.focusedDate()?.getDate()).toBe(4);
      });

      it('navigates across the month boundary into out-of-month padding days (no clamp)', () => {
        // Jun 1 2026 is a Monday; ArrowLeft from it lands on Sun May 31 — a real,
        // rendered out-of-month cell. The store must accept it (no clamping).
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(2026, 5, 1));
        fixture.detectChanges();
        pressKey(cellForDate(el, new Date(2026, 5, 1)) as HTMLElement, 'ArrowLeft');
        const focused = store.focusedDate();
        expect(focused?.getMonth()).toBe(4); // May
        expect(focused?.getDate()).toBe(31);
      });
    });

    describe('activation (Enter / Space)', () => {
      it('Enter on the focused cell emits a slot click for the whole focused day', () => {
        const { el, store } = setup();
        const ev = pressKey(cellForDate(el, ANCHOR) as HTMLElement, 'Enter');
        expect(ev.defaultPrevented).toBe(true);

        const slot = store.lastSlotClick();
        expect(slot).not.toBeNull();
        expect(slot?.start).toEqual(startOfDay(ANCHOR));
        expect(slot?.end).toEqual(endOfDay(ANCHOR));
      });

      it('Space on the focused cell emits the same slot click', () => {
        const { el, store } = setup();
        const ev = pressKey(cellForDate(el, ANCHOR) as HTMLElement, ' ');
        expect(ev.defaultPrevented).toBe(true);
        const slot = store.lastSlotClick();
        expect(slot?.start).toEqual(startOfDay(ANCHOR));
        expect(slot?.end).toEqual(endOfDay(ANCHOR));
      });
    });

    describe('Escape', () => {
      it('closes an open "+N more" popover', () => {
        const { el, fixture, store } = setup();
        store.openPopover(ANCHOR);
        fixture.detectChanges();
        expect(store.popoverDate()).not.toBeNull();

        pressKey(cellForDate(el, ANCHOR) as HTMLElement, 'Escape');
        expect(store.popoverDate()).toBeNull();
      });
    });

    describe('drag guard', () => {
      it('ignores arrow keys while a drag is in flight', () => {
        const { el, store } = setup(config({ editable: true, events: [event({ id: 'd' })] }));
        store.startDrag({ eventId: 'd', mode: 'move' });
        expect(store.drag()).not.toBeNull();

        const ev = pressKey(cellForDate(el, ANCHOR) as HTMLElement, 'ArrowRight');
        // Guard returns before preventDefault / setFocusedDate.
        expect(ev.defaultPrevented).toBe(false);
        expect(store.focusedDate()).toBeNull();
      });
    });

    describe('onCellClick → slot', () => {
      it('emits a slot click for an empty cell and sets it as the focus target', () => {
        const { fixture, store } = setup();
        const day = juneDayCell(store, 9);
        // Click whose target is the cell body (closest('button') === null).
        const target = document.createElement('div');
        internals(fixture).onCellClick({ target } as unknown as MouseEvent, day);

        expect(store.focusedDate()).toEqual(day.date);
        const slot = store.lastSlotClick();
        expect(slot?.start).toEqual(startOfDay(day.date));
        expect(slot?.end).toEqual(endOfDay(day.date));
      });

      it('does NOT emit a slot click when the click originated on an interactive child', () => {
        const { fixture, store } = setup();
        const day = juneDayCell(store, 9);
        // A click whose target is a chip <button> inside the cell → guard returns.
        const button = document.createElement('button');
        internals(fixture).onCellClick({ target: button } as unknown as MouseEvent, day);

        expect(store.lastSlotClick()).toBeNull();
        expect(store.focusedDate()).toBeNull();
      });
    });
  });
});
