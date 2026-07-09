import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { NgeCalendarConfig } from '../../core/models/nge-calendar-config.model';
import type { NgeCalendarEvent } from '../../core/models/nge-calendar-event.model';

import { NgeCalendarStore } from '../../nge-calendar/store';
import { NgeYearViewComponent } from './nge-year-view.component';

type Store = InstanceType<typeof NgeCalendarStore>;

/**
 * The keyboard / tabindex handlers are `protected`. Tests reach them through this
 * minimal structural view of the component (mirrors the month-view spec) rather
 * than loosening the component's API.
 */
interface YearViewInternals {
  monthTabIndex(monthIndex: number): -1 | 0;
  onYearKeydown(event: KeyboardEvent): void;
}

// 2026, anchored on Jun 15. Year view ignores the day for layout but keeps it as
// the `isAnchor` cell; "today" is supplied separately via store.setToday(...).
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
    view: 'year',
    ...overrides,
  };
}

/**
 * Provide the store at the testing-module level, seed it (config + today) BEFORE
 * creating the component, then create + detect. The year view does NOT provide
 * its own store — it injects the ambient one the shell would normally provide.
 */
function setup(
  cfg: NgeCalendarConfig = config(),
  today: Date | null = ANCHOR
): {
  el: HTMLElement;
  fixture: ComponentFixture<NgeYearViewComponent>;
  store: Store;
} {
  TestBed.configureTestingModule({
    imports: [NgeYearViewComponent],
    providers: [NgeCalendarStore],
  });
  const store = TestBed.inject(NgeCalendarStore);
  store.setConfig(cfg);
  if (today) {
    store.setToday(today);
  }
  const fixture = TestBed.createComponent(NgeYearViewComponent);
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, fixture, store };
}

function months(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>('.nge-year-view__month'));
}

function monthHeaders(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>('[data-testid="nge-year-month"]'));
}

function dayCells(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>('[data-testid="nge-year-day"]'));
}

/** Reach the component's `protected` keyboard / tabindex API. */
function internals(fixture: ComponentFixture<NgeYearViewComponent>): YearViewInternals {
  return fixture.componentInstance as unknown as YearViewInternals;
}

/** The month-header (roving-tabindex tile) whose 0-based index matches. */
function monthHeader(el: HTMLElement, monthIndex: number): HTMLElement {
  const header = monthHeaders(el)[monthIndex];
  if (!header) {
    throw new Error(`month header ${monthIndex} not found`);
  }
  return header;
}

/**
 * Dispatch a real bubbling `keydown` on a month-header tile (the roving-tabindex
 * element the handler is bound to). Returns the event so a test can assert
 * `defaultPrevented`.
 */
function pressKey(tile: HTMLElement, key: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key });
  tile.dispatchEvent(ev);
  return ev;
}

describe('NgeYearViewComponent', () => {
  // Pin the wall clock so anything that might fall back to "real now" is
  // deterministic; assertions still prefer the explicit `store.setToday(...)`.
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('grid structure', () => {
    it('creates and tags the host with the nge-year-view class', () => {
      const { el, fixture } = setup();
      expect(fixture.componentInstance).toBeTruthy();
      expect(el.classList.contains('nge-year-view')).toBe(true);
    });

    it('renders all 12 mini-months', () => {
      const { el } = setup();
      expect(months(el)).toHaveLength(12);
      expect(monthHeaders(el)).toHaveLength(12);
    });

    it('renders 12 × (6×7) = 504 day cells', () => {
      // Every mini-month is the fixed 6×7 matrix, so the year is exactly 504 cells.
      const { el } = setup();
      expect(dayCells(el)).toHaveLength(12 * 6 * 7);
    });

    it('renders nothing until a config seeds the year view-model', () => {
      // No setConfig → yearViewModel() is null → @if guard renders no grid.
      TestBed.configureTestingModule({
        imports: [NgeYearViewComponent],
        providers: [NgeCalendarStore],
      });
      const fixture = TestBed.createComponent(NgeYearViewComponent);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="nge-year-view"]')).toBeNull();
    });
  });

  describe('mini-month alignment', () => {
    function januaryCells(el: HTMLElement): HTMLElement[] {
      // The first mini-month section is January (monthIndex 0).
      return Array.from(
        months(el)[0].querySelectorAll<HTMLElement>('[data-testid="nge-year-day"]')
      );
    }

    it('lays each mini-month out as a 6×7 grid', () => {
      const { el } = setup();
      for (const m of months(el)) {
        expect(m.querySelectorAll('[data-testid="nge-year-day"]')).toHaveLength(42);
        expect(m.querySelectorAll('.nge-year-view__weekday')).toHaveLength(7);
      }
    });

    it('aligns Jan 1 2026 (a Thursday) to the Sunday-start grid (5th cell)', () => {
      // weekStartsOn=0 (Sunday). Jan 1 2026 is a Thursday → index 4 (Sun..Wed are
      // out-of-month December cells). This proves day-of-month alignment.
      const { el } = setup(config({ locale: 'en-US', weekStartsOn: 0 }));
      const cells = januaryCells(el);
      const jan1Index = cells.findIndex(c => {
        const d = new Date(c.getAttribute('data-date') ?? '');
        return d.getMonth() === 0 && d.getDate() === 1;
      });
      expect(jan1Index).toBe(4);
      // The four cells before it are out-of-month (late December).
      for (let i = 0; i < 4; i++) {
        expect(cells[i].classList.contains('nge-year-view__day--out-of-month')).toBe(true);
      }
    });

    it('shifts the alignment when weekStartsOn=1 (Monday)', () => {
      // Monday-start: Jan 1 2026 (Thu) → index 3 (Mon/Tue/Wed are out-of-month).
      const { el } = setup(config({ locale: 'en-US', weekStartsOn: 1 }));
      const cells = januaryCells(el);
      const jan1Index = cells.findIndex(c => {
        const d = new Date(c.getAttribute('data-date') ?? '');
        return d.getMonth() === 0 && d.getDate() === 1;
      });
      expect(jan1Index).toBe(3);
      const firstWeekday = el.querySelector('.nge-year-view__weekday')?.textContent?.trim();
      expect(firstWeekday).toBe('Mon');
    });
  });

  describe('density affordance', () => {
    function cellFor(el: HTMLElement, month: number, dayOfMonth: number): HTMLElement {
      const cell = dayCells(el).find(c => {
        const d = new Date(c.getAttribute('data-date') ?? '');
        return (
          d.getMonth() === month &&
          d.getDate() === dayOfMonth &&
          !c.classList.contains('nge-year-view__day--out-of-month')
        );
      });
      if (!cell) {
        throw new Error(`cell ${month}/${dayOfMonth} not found`);
      }
      return cell;
    }

    it('renders no density marker on an event-free day (level 0)', () => {
      const { el } = setup();
      const cell = cellFor(el, 5, 1); // Jun 1, no events
      expect(cell.getAttribute('data-event-count')).toBe('0');
      expect(cell.getAttribute('data-density')).toBe('0');
      expect(cell.querySelector('[data-testid="nge-year-density"]')).toBeNull();
    });

    it('ramps the density bucket: 1–2 → level 1, 3–4 → 2, 5+ → 3', () => {
      const events: NgeCalendarEvent[] = [
        // Jun 2: 2 events → level 1
        ...Array.from({ length: 2 }, (_u, i) =>
          event({
            end: new Date(2026, 5, 2, 9 + i, 30),
            id: `a${i}`,
            start: new Date(2026, 5, 2, 9 + i, 0),
          })
        ),
        // Jun 3: 4 events → level 2
        ...Array.from({ length: 4 }, (_u, i) =>
          event({
            end: new Date(2026, 5, 3, 9 + i, 30),
            id: `b${i}`,
            start: new Date(2026, 5, 3, 9 + i, 0),
          })
        ),
        // Jun 4: 6 events → level 3
        ...Array.from({ length: 6 }, (_u, i) =>
          event({
            end: new Date(2026, 5, 4, 9 + i, 30),
            id: `c${i}`,
            start: new Date(2026, 5, 4, 9 + i, 0),
          })
        ),
      ];
      const { el } = setup(config({ events }));

      const jun2 = cellFor(el, 5, 2);
      expect(jun2.getAttribute('data-event-count')).toBe('2');
      expect(jun2.getAttribute('data-density')).toBe('1');
      expect(jun2.querySelector('[data-testid="nge-year-density"]')).toBeTruthy();

      const jun3 = cellFor(el, 5, 3);
      expect(jun3.getAttribute('data-event-count')).toBe('4');
      expect(jun3.getAttribute('data-density')).toBe('2');

      const jun4 = cellFor(el, 5, 4);
      expect(jun4.getAttribute('data-event-count')).toBe('6');
      expect(jun4.getAttribute('data-density')).toBe('3');
    });
  });

  describe('today highlight', () => {
    it('marks only the cell whose date equals store.today() with the today class', () => {
      const { el, store } = setup(config(), ANCHOR);
      // Jun 15 appears once in its own month (and possibly as an out-of-month cell
      // in adjacent months); the today class lands on every cell sharing that day.
      const todayCells = dayCells(el).filter(c =>
        c.classList.contains('nge-year-view__day--today')
      );
      expect(todayCells.length).toBeGreaterThanOrEqual(1);
      for (const c of todayCells) {
        const d = new Date(c.getAttribute('data-date') ?? '');
        expect(d.toDateString()).toBe(store.today()?.toDateString());
      }
    });

    it('marks no cell as today when store.today() is null', () => {
      const { el } = setup(config(), null);
      const todayCells = dayCells(el).filter(c =>
        c.classList.contains('nge-year-view__day--today')
      );
      expect(todayCells).toHaveLength(0);
    });
  });

  describe('anchor highlight', () => {
    it('marks the cell matching config.date with the anchor class', () => {
      // today=null isolates the anchor styling from the today styling. The
      // anchor (config.date) is Jun 15 2026 and appears only in June's grid.
      const { el } = setup(config(), null);
      const anchorCells = dayCells(el).filter(c =>
        c.classList.contains('nge-year-view__day--anchor')
      );
      expect(anchorCells.length).toBeGreaterThanOrEqual(1);
      for (const c of anchorCells) {
        const d = new Date(c.getAttribute('data-date') ?? '');
        expect(d.getMonth()).toBe(5); // June
        expect(d.getDate()).toBe(15);
      }
    });
  });

  describe('drill-in', () => {
    function inMonthCell(el: HTMLElement, month: number, dayOfMonth: number): HTMLElement {
      const cell = dayCells(el).find(c => {
        const d = new Date(c.getAttribute('data-date') ?? '');
        return (
          d.getMonth() === month &&
          d.getDate() === dayOfMonth &&
          !c.classList.contains('nge-year-view__day--out-of-month')
        );
      });
      if (!cell) {
        throw new Error(`in-month cell ${month}/${dayOfMonth} not found`);
      }
      return cell;
    }

    it('drills into month view anchored at the clicked day', () => {
      const { el, fixture, store } = setup();
      const cell = inMonthCell(el, 7, 9); // Aug 9 2026
      cell.click();
      fixture.detectChanges();

      // Anchored at the exact clicked day. Assert via calendar fields (not
      // toISOString) to match the sibling drill-in tests and stay robust to any
      // future date normalization in drillInto.
      expect(store.view()).toBe('month');
      expect(store.anchorDate().getFullYear()).toBe(2026);
      expect(store.anchorDate().getMonth()).toBe(7);
      expect(store.anchorDate().getDate()).toBe(9);
    });

    it('drills into month view anchored at the 1st when a month header is clicked', () => {
      const { el, fixture, store } = setup();
      // Third header = March (monthIndex 2).
      const marchHeader = monthHeaders(el)[2];
      expect(marchHeader.getAttribute('data-month-index')).toBe('2');
      marchHeader.click();
      fixture.detectChanges();

      expect(store.view()).toBe('month');
      expect(store.anchorDate().getFullYear()).toBe(2026);
      expect(store.anchorDate().getMonth()).toBe(2);
      expect(store.anchorDate().getDate()).toBe(1);
    });

    it('drills via a SINGLE store patch (anchor + view land together)', () => {
      // A single patchState means view and anchor are both updated atomically,
      // which is what lets the shell's bridge emit viewChange exactly once.
      const { el, fixture, store } = setup();
      inMonthCell(el, 3, 20).click(); // Apr 20 2026
      fixture.detectChanges();
      expect(store.view()).toBe('month');
      expect(store.anchorDate().getMonth()).toBe(3);
      expect(store.anchorDate().getDate()).toBe(20);
    });
  });

  describe('keyboard navigation + roving focus (S11)', () => {
    // Displayed year is 2026 (anchor Jun 15 2026). The ↑/↓ step assumes 4 columns
    // (the SCSS grid is responsive, so the component defaults to a 4-wide layout).
    const YEAR = 2026;
    const MONTH_COLUMNS = 4;

    describe('roving tabindex', () => {
      it('puts January (index 0) at tabindex 0 and every other tile at -1 when focus is unset', () => {
        const { el, store } = setup();
        expect(store.focusedDate()).toBeNull();

        const zero = monthHeaders(el).filter(h => h.getAttribute('tabindex') === '0');
        const minusOne = monthHeaders(el).filter(h => h.getAttribute('tabindex') === '-1');
        // Exactly one tab stop (January), the other eleven removed from the tab order.
        expect(zero).toHaveLength(1);
        expect(minusOne).toHaveLength(11);
        expect(zero[0].getAttribute('data-month-index')).toBe('0');
      });

      it('moves the single tabindex=0 to the focused month after setFocusedDate', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(YEAR, 4, 1)); // May
        fixture.detectChanges();

        const zero = monthHeaders(el).filter(h => h.getAttribute('tabindex') === '0');
        expect(zero).toHaveLength(1);
        expect(zero[0].getAttribute('data-month-index')).toBe('4');
      });

      it('monthTabIndex returns 0 only for the focused month in the displayed year', () => {
        const { fixture, store } = setup();
        store.setFocusedDate(new Date(YEAR, 4, 1)); // May
        expect(internals(fixture).monthTabIndex(4)).toBe(0);
        expect(internals(fixture).monthTabIndex(5)).toBe(-1);
      });

      it('falls back to January (index 0) when focusedDate is in a different year', () => {
        const { fixture, store } = setup();
        // Focus in 2025 → not the displayed 2026 year → January is the tab stop.
        store.setFocusedDate(new Date(2025, 4, 1));
        expect(internals(fixture).monthTabIndex(0)).toBe(0);
        expect(internals(fixture).monthTabIndex(4)).toBe(-1);
      });
    });

    describe('arrow-key navigation', () => {
      it('ArrowRight moves the focus month +1 from January', () => {
        const { el, store } = setup();
        const ev = pressKey(monthHeader(el, 0), 'ArrowRight');
        expect(ev.defaultPrevented).toBe(true);
        const focused = store.focusedDate();
        expect(focused?.getFullYear()).toBe(YEAR);
        expect(focused?.getMonth()).toBe(1); // February
      });

      it('ArrowLeft moves the focus month -1', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(YEAR, 5, 1)); // June
        fixture.detectChanges();
        pressKey(monthHeader(el, 5), 'ArrowLeft');
        expect(store.focusedDate()?.getMonth()).toBe(4); // May
      });

      it('ArrowDown moves the focus month +columns (one row)', () => {
        const { el, store } = setup();
        pressKey(monthHeader(el, 0), 'ArrowDown');
        expect(store.focusedDate()?.getMonth()).toBe(MONTH_COLUMNS); // 0 + 4 = May (index 4)
      });

      it('ArrowUp moves the focus month -columns (one row)', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(YEAR, 8, 1)); // September (index 8)
        fixture.detectChanges();
        pressKey(monthHeader(el, 8), 'ArrowUp');
        expect(store.focusedDate()?.getMonth()).toBe(8 - MONTH_COLUMNS); // index 4 (May)
      });

      it('steps from the existing focus, not always January', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(YEAR, 2, 1)); // March
        fixture.detectChanges();
        pressKey(monthHeader(el, 2), 'ArrowRight');
        expect(store.focusedDate()?.getMonth()).toBe(3); // April
      });

      it('clamps at January (index 0) on ArrowLeft and never crosses into the previous year', () => {
        const { el, store } = setup();
        // Focus defaults to January; ArrowLeft must clamp, not roll to Dec 2025.
        pressKey(monthHeader(el, 0), 'ArrowLeft');
        const focused = store.focusedDate();
        expect(focused?.getFullYear()).toBe(YEAR);
        expect(focused?.getMonth()).toBe(0); // stays January
      });

      it('clamps at December (index 11) on ArrowRight and never crosses into the next year', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(YEAR, 11, 1)); // December
        fixture.detectChanges();
        pressKey(monthHeader(el, 11), 'ArrowRight');
        const focused = store.focusedDate();
        expect(focused?.getFullYear()).toBe(YEAR);
        expect(focused?.getMonth()).toBe(11); // stays December
      });

      it('clamps ArrowDown from the bottom row (no overflow past December)', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(YEAR, 10, 1)); // November (index 10) + 4 = 14 → clamp 11
        fixture.detectChanges();
        pressKey(monthHeader(el, 10), 'ArrowDown');
        expect(store.focusedDate()?.getMonth()).toBe(11); // clamped to December
      });

      it('clamps ArrowUp from the top row (no underflow past January)', () => {
        const { el, store } = setup();
        // Focus defaults to January (index 0); 0 - 4 = -4 → clamp to 0, no roll to Dec 2025.
        pressKey(monthHeader(el, 0), 'ArrowUp');
        const focused = store.focusedDate();
        expect(focused?.getFullYear()).toBe(YEAR);
        expect(focused?.getMonth()).toBe(0); // stays January
      });
    });

    describe('activation (Enter / Space)', () => {
      it('Enter on the focused month drills into month view anchored at the 1st', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(YEAR, 7, 1)); // August
        fixture.detectChanges();

        const ev = pressKey(monthHeader(el, 7), 'Enter');
        expect(ev.defaultPrevented).toBe(true);
        expect(store.view()).toBe('month');
        expect(store.anchorDate().getFullYear()).toBe(YEAR);
        expect(store.anchorDate().getMonth()).toBe(7);
        expect(store.anchorDate().getDate()).toBe(1);
      });

      it('Space on the focused month drills into the same month view', () => {
        const { el, fixture, store } = setup();
        store.setFocusedDate(new Date(YEAR, 2, 1)); // March
        fixture.detectChanges();

        const ev = pressKey(monthHeader(el, 2), ' ');
        expect(ev.defaultPrevented).toBe(true);
        expect(store.view()).toBe('month');
        expect(store.anchorDate().getMonth()).toBe(2);
        expect(store.anchorDate().getDate()).toBe(1);
      });

      it('Enter drills into January (the default tab stop) when focus is unset', () => {
        const { el, store } = setup();
        pressKey(monthHeader(el, 0), 'Enter');
        expect(store.view()).toBe('month');
        expect(store.anchorDate().getMonth()).toBe(0);
        expect(store.anchorDate().getDate()).toBe(1);
      });
    });
  });
});
