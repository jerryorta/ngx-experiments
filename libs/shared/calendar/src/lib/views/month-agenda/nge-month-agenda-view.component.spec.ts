import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';
import { endOfDay, startOfDay } from '@nge/date';

import type { NgeCalendarConfig } from '../../core/models/nge-calendar-config.model';
import type { NgeCalendarEvent } from '../../core/models/nge-calendar-event.model';

import { NgeCalendarStore } from '../../nge-calendar/store';
import { NgeMonthAgendaViewComponent } from './nge-month-agenda-view.component';

type Store = InstanceType<typeof NgeCalendarStore>;

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
    monthLayout: 'agenda',
    view: 'month',
    ...overrides,
  };
}

/**
 * Provide the store at the testing-module level, seed it (config + today) BEFORE
 * creating the component, then create + detect. The agenda view does NOT provide
 * its own store — it injects the ambient one the shell would normally provide.
 */
function setup(
  cfg: NgeCalendarConfig = config(),
  today: Date | null = ANCHOR
): {
  el: HTMLElement;
  fixture: ComponentFixture<NgeMonthAgendaViewComponent>;
  store: Store;
} {
  TestBed.configureTestingModule({
    imports: [NgeMonthAgendaViewComponent],
    providers: [NgeCalendarStore],
  });
  const store = TestBed.inject(NgeCalendarStore);
  store.setConfig(cfg);
  if (today) {
    store.setToday(today);
  }
  const fixture = TestBed.createComponent(NgeMonthAgendaViewComponent);
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, fixture, store };
}

function dayCells(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>('[data-testid="nge-month-agenda-day"]'));
}

function agendaGroups(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>('[data-testid="nge-month-agenda-group"]'));
}

/** The rendered grid day cell whose `data-date` ISO string matches `date`. */
function cellForDate(el: HTMLElement, date: Date): HTMLElement | undefined {
  return dayCells(el).find(c => c.getAttribute('data-date') === date.toISOString());
}

/** Dispatch a real bubbling `keydown` on a cell. Returns the event for assertions. */
function pressKey(cell: HTMLElement, key: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key });
  cell.dispatchEvent(ev);
  return ev;
}

describe('NgeMonthAgendaViewComponent', () => {
  // Pin the wall clock so anything that might fall back to "real now" is
  // deterministic; assertions still prefer the explicit `store.setToday(...)`.
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('component + compact grid', () => {
    it('creates and tags the host with the nge-month-agenda-view class', () => {
      const { el, fixture } = setup();
      expect(fixture.componentInstance).toBeTruthy();
      expect(el.classList.contains('nge-month-agenda-view')).toBe(true);
    });

    it('renders nothing until a config seeds the month view-model', () => {
      TestBed.configureTestingModule({
        imports: [NgeMonthAgendaViewComponent],
        providers: [NgeCalendarStore],
      });
      const fixture = TestBed.createComponent(NgeMonthAgendaViewComponent);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="nge-month-agenda-grid"]')).toBeNull();
    });

    it('renders 6 weeks × 7 = 42 compact day cells with their day numbers', () => {
      const { el } = setup();
      const cells = dayCells(el);
      expect(cells).toHaveLength(42);
      // Jun 15 cell shows "15" as its day number.
      const anchorCell = cellForDate(el, ANCHOR);
      expect(
        anchorCell?.querySelector('.nge-month-agenda-view__day-number')?.textContent?.trim()
      ).toBe('15');
    });

    it('marks only the cell whose date equals store.today() with the today class', () => {
      const { el } = setup(config(), ANCHOR);
      const todayCells = dayCells(el).filter(c =>
        c.classList.contains('nge-month-agenda-view__day--today')
      );
      expect(todayCells).toHaveLength(1);
      expect(todayCells[0].getAttribute('data-date')).toBe(ANCHOR.toISOString());
    });
  });

  describe('event-presence dot', () => {
    it('shows a dot on a day with a single-day event and not on empty days', () => {
      const { el } = setup(
        config({ events: [event({ id: 'e', start: new Date(2026, 5, 10, 9, 0) })] })
      );
      const jun10 = cellForDate(el, new Date(2026, 5, 10));
      const jun11 = cellForDate(el, new Date(2026, 5, 11));
      expect(jun10?.querySelector('[data-testid="nge-month-agenda-dot"]')).toBeTruthy();
      expect(jun11?.querySelector('[data-testid="nge-month-agenda-dot"]')).toBeNull();
    });

    it('shows a dot under every day a multi-day bar spans', () => {
      // Jun 9 (Tue) → Jun 11 (Thu): inside one Sunday-start week row.
      const { el } = setup(
        config({
          events: [
            event({
              end: new Date(2026, 5, 11, 12, 0),
              id: 'multi',
              start: new Date(2026, 5, 9, 9, 0),
              title: 'Conference',
            }),
          ],
        })
      );
      for (const day of [9, 10, 11]) {
        const cell = cellForDate(el, new Date(2026, 5, day));
        expect(cell?.querySelector('[data-testid="nge-month-agenda-dot"]')).toBeTruthy();
      }
    });
  });

  describe('agenda body', () => {
    it('renders a group per day-with-events with a heading + event cards', () => {
      const { el } = setup(
        config({
          events: [
            event({ id: 'a', start: new Date(2026, 5, 10, 9, 0), title: 'Standup' }),
            event({ id: 'b', start: new Date(2026, 5, 12, 14, 0), title: 'Review' }),
          ],
        })
      );
      const groups = agendaGroups(el);
      expect(groups).toHaveLength(2);
      expect(
        groups[0].querySelector('[data-testid="nge-month-agenda-group-heading"]')
      ).toBeTruthy();
      const cards = el.querySelectorAll('[data-testid="nge-month-agenda-event"]');
      expect(cards).toHaveLength(2);
    });

    it('renders the empty state and no groups when the month has no events', () => {
      const { el } = setup(config({ events: [] }));
      expect(agendaGroups(el)).toHaveLength(0);
      expect(el.querySelector('[data-testid="nge-month-agenda-empty"]')).toBeTruthy();
    });

    it('formats an event card time label and carries data-event-id', () => {
      const { el } = setup(
        config({
          events: [event({ id: 'pick', start: new Date(2026, 5, 10, 9, 0), title: 'Pick me' })],
          locale: 'en-US',
        })
      );
      const card = el.querySelector<HTMLButtonElement>('[data-testid="nge-month-agenda-event"]');
      expect(card?.getAttribute('data-event-id')).toBe('pick');
      const time = card?.querySelector('.nge-month-agenda-view__event-time')?.textContent ?? '';
      // 09:00 – 10:00 in en-US → "9:00 AM – 10:00 AM" (en-dash separator).
      expect(time).toContain('9:00');
      expect(time).toContain('10:00');
    });

    it('labels an all-day event card as "All day"', () => {
      const { el } = setup(
        config({
          events: [
            event({
              allDay: true,
              end: null,
              id: 'ad',
              start: new Date(2026, 5, 10),
              title: 'Holiday',
            }),
          ],
        })
      );
      const time = el
        .querySelector(
          '[data-testid="nge-month-agenda-event"] .nge-month-agenda-view__event-time'
        )
        ?.textContent?.trim();
      expect(time).toBe('All day');
    });
  });

  describe('selection', () => {
    it('selects the day on a grid-cell click and reflects the selected highlight', () => {
      const { el, fixture, store } = setup();
      const target = new Date(2026, 5, 9);
      cellForDate(el, target)?.click();
      fixture.detectChanges();

      expect(store.selectedDate()?.toISOString()).toBe(target.toISOString());
      const selectedCells = dayCells(el).filter(c =>
        c.classList.contains('nge-month-agenda-view__day--selected')
      );
      expect(selectedCells).toHaveLength(1);
      expect(selectedCells[0].getAttribute('data-date')).toBe(target.toISOString());
      expect(selectedCells[0].getAttribute('aria-selected')).toBe('true');
    });

    it('selects an event on an agenda card click', () => {
      const { el, fixture, store } = setup(
        config({
          events: [event({ id: 'pick', start: new Date(2026, 5, 10, 9, 0), title: 'Pick me' })],
        })
      );
      const card = el.querySelector<HTMLButtonElement>('[data-testid="nge-month-agenda-event"]');
      card?.click();
      fixture.detectChanges();
      expect(store.selectedEventId()).toBe('pick');
    });
  });

  describe('day activation → slotClick (host day-tap signal)', () => {
    it('emits a day-spanning slotClick on a grid-cell click, alongside selecting the day', () => {
      const { el, fixture, store } = setup();
      const target = new Date(2026, 5, 9);
      cellForDate(el, target)?.click();
      fixture.detectChanges();

      // The inline selection still happens (drives the agenda auto-scroll)...
      expect(store.selectedDate()?.toISOString()).toBe(target.toISOString());
      // ...AND a day-spanning slotClick is surfaced for the host (grid parity).
      const slot = store.lastSlotClick();
      expect(slot?.start.toISOString()).toBe(startOfDay(target).toISOString());
      expect(slot?.end.toISOString()).toBe(endOfDay(target).toISOString());
    });

    it('emits a day-spanning slotClick on Enter on the focused cell', () => {
      const { el, store } = setup();
      pressKey(cellForDate(el, ANCHOR) as HTMLElement, 'Enter');
      expect(store.lastSlotClick()?.start.toISOString()).toBe(startOfDay(ANCHOR).toISOString());
      expect(store.lastSlotClick()?.end.toISOString()).toBe(endOfDay(ANCHOR).toISOString());
    });

    it('emits a day-spanning slotClick on Space on the focused cell', () => {
      const { el, store } = setup();
      pressKey(cellForDate(el, ANCHOR) as HTMLElement, ' ');
      expect(store.lastSlotClick()?.start.toISOString()).toBe(startOfDay(ANCHOR).toISOString());
    });
  });

  describe('roving tabindex + keyboard navigation', () => {
    it('puts the anchor cell at tabindex 0 and the rest at -1 when focus is unset', () => {
      const { el, store } = setup();
      expect(store.focusedDate()).toBeNull();
      const zero = dayCells(el).filter(c => c.getAttribute('tabindex') === '0');
      const minusOne = dayCells(el).filter(c => c.getAttribute('tabindex') === '-1');
      expect(zero).toHaveLength(1);
      expect(minusOne).toHaveLength(41);
      expect(zero[0].getAttribute('data-date')).toBe(ANCHOR.toISOString());
    });

    it('ArrowRight moves the focus date +1 day from the anchor', () => {
      const { el, store } = setup();
      const ev = pressKey(cellForDate(el, ANCHOR) as HTMLElement, 'ArrowRight');
      expect(ev.defaultPrevented).toBe(true);
      expect(store.focusedDate()?.getDate()).toBe(16); // Jun 15 + 1
    });

    it('ArrowLeft moves the focus date -1 day from the anchor', () => {
      const { el, store } = setup();
      const ev = pressKey(cellForDate(el, ANCHOR) as HTMLElement, 'ArrowLeft');
      expect(ev.defaultPrevented).toBe(true);
      expect(store.focusedDate()?.getDate()).toBe(14); // Jun 15 - 1
    });

    it('ArrowDown moves the focus date +7 days (one week)', () => {
      const { el, store } = setup();
      pressKey(cellForDate(el, ANCHOR) as HTMLElement, 'ArrowDown');
      expect(store.focusedDate()?.getDate()).toBe(22); // Jun 15 + 7
    });

    it('ArrowUp moves the focus date -7 days (one week back)', () => {
      const { el, store } = setup();
      pressKey(cellForDate(el, ANCHOR) as HTMLElement, 'ArrowUp');
      expect(store.focusedDate()?.getDate()).toBe(8); // Jun 15 - 7
    });

    it('moves the tabindex-0 stop to the newly focused cell after an arrow key', () => {
      const { el, fixture, store } = setup();
      pressKey(cellForDate(el, ANCHOR) as HTMLElement, 'ArrowRight');
      fixture.detectChanges();
      expect(store.focusedDate()?.getDate()).toBe(16);
      // Jun 16 is now the sole tab stop; the anchor (Jun 15) drops to -1.
      expect(cellForDate(el, new Date(2026, 5, 16))?.getAttribute('tabindex')).toBe('0');
      expect(cellForDate(el, ANCHOR)?.getAttribute('tabindex')).toBe('-1');
      expect(dayCells(el).filter(c => c.getAttribute('tabindex') === '0')).toHaveLength(1);
    });

    it('Enter on the focused cell selects the focused day (drives the agenda)', () => {
      const { el, store } = setup();
      const ev = pressKey(cellForDate(el, ANCHOR) as HTMLElement, 'Enter');
      expect(ev.defaultPrevented).toBe(true);
      expect(store.selectedDate()?.toISOString()).toBe(ANCHOR.toISOString());
    });

    it('Space on the focused cell selects the focused day (like Enter)', () => {
      const { el, store } = setup();
      const ev = pressKey(cellForDate(el, ANCHOR) as HTMLElement, ' ');
      expect(ev.defaultPrevented).toBe(true);
      expect(store.selectedDate()?.toISOString()).toBe(ANCHOR.toISOString());
    });
  });
});
