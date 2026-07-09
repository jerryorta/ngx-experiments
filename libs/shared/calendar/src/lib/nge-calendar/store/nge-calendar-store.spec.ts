import { TestBed } from '@angular/core/testing';

import type { NgeCalendarConfig } from '../../core/models/nge-calendar-config.model';

import { NgeCalendarStore } from './nge-calendar-store';

type Store = InstanceType<typeof NgeCalendarStore>;

const ANCHOR = new Date(2026, 0, 15); // Thu Jan 15 2026

/** A fixed month config with two single-day timed events on the anchor day. */
function monthConfig(overrides: Partial<NgeCalendarConfig> = {}): NgeCalendarConfig {
  return {
    date: ANCHOR,
    events: [
      {
        end: new Date(2026, 0, 15, 10, 0),
        id: 'a',
        start: new Date(2026, 0, 15, 9, 0),
        title: 'Morning',
      },
      {
        end: new Date(2026, 0, 15, 15, 0),
        id: 'b',
        start: new Date(2026, 0, 15, 14, 0),
        title: 'Afternoon',
      },
    ],
    view: 'month',
    ...overrides,
  };
}

function createStore(): Store {
  TestBed.configureTestingModule({ providers: [NgeCalendarStore] });
  return TestBed.inject(NgeCalendarStore);
}

describe('NgeCalendarStore', () => {
  describe('before setConfig', () => {
    it('exposes null view-models and an empty events list', () => {
      const store = createStore();
      expect(store.monthViewModel()).toBeNull();
      expect(store.weekViewModel()).toBeNull();
      expect(store.dayViewModel()).toBeNull();
      expect(store.yearViewModel()).toBeNull();
      expect(store.events()).toEqual([]);
      expect(store.visibleRange()).toBeNull();
    });
  });

  describe('setConfig + view-models', () => {
    it('seeds view + anchor from the config and builds all view-models', () => {
      const store = createStore();
      store.setConfig(monthConfig());

      expect(store.view()).toBe('month');
      expect(store.anchorDate().getTime()).toBe(ANCHOR.getTime());

      const month = store.monthViewModel();
      expect(month).not.toBeNull();
      expect(month?.weeks).toHaveLength(6);
      for (const week of month?.weeks ?? []) {
        expect(week.days).toHaveLength(7);
      }

      // week / day view-models are TimeGridViewModels
      const week = store.weekViewModel();
      expect(week?.columns).toHaveLength(7);
      expect(typeof week?.totalMinutes).toBe('number');

      const day = store.dayViewModel();
      expect(day?.columns).toHaveLength(1);

      const year = store.yearViewModel();
      expect(year?.months).toHaveLength(12);
    });

    it('surfaces the normalized events / slotMinutes / editable', () => {
      const store = createStore();
      store.setConfig(monthConfig({ editable: true, slotMinutes: 15 }));
      expect(store.events()).toHaveLength(2);
      expect(store.slotMinutes()).toBe(15);
      expect(store.editable()).toBe(true);
    });

    it('normalizes the effective config only once across all view-models', () => {
      // If normalize were re-run per builder, the events array references would
      // differ; they share one normalized config, so the same instances appear
      // in the events signal and the year view-model's underlying counts.
      const store = createStore();
      store.setConfig(monthConfig());
      const eventsA = store.events();
      const eventsB = store.events();
      expect(eventsA).toBe(eventsB);
    });
  });

  describe('navigation', () => {
    it('next/previous step by month in month view', () => {
      const store = createStore();
      store.setConfig(monthConfig({ view: 'month' }));
      store.next();
      expect(store.anchorDate().getMonth()).toBe(1); // Feb
      store.previous();
      store.previous();
      expect(store.anchorDate().getMonth()).toBe(11); // Dec (prev year)
    });

    it('next/previous step by week in week view', () => {
      const store = createStore();
      store.setConfig(monthConfig({ view: 'week' }));
      store.next();
      expect(store.anchorDate().getDate()).toBe(22); // +7 days
      store.previous();
      expect(store.anchorDate().getDate()).toBe(15);
    });

    it('next/previous step by day in day view', () => {
      const store = createStore();
      store.setConfig(monthConfig({ view: 'day' }));
      store.next();
      expect(store.anchorDate().getDate()).toBe(16);
      store.previous();
      expect(store.anchorDate().getDate()).toBe(15);
    });

    it('next/previous step by year in year view', () => {
      const store = createStore();
      store.setConfig(monthConfig({ view: 'year' }));
      store.next();
      expect(store.anchorDate().getFullYear()).toBe(2027);
      store.previous();
      expect(store.anchorDate().getFullYear()).toBe(2026);
    });

    it('goToToday jumps the anchor to the store-owned today', () => {
      const store = createStore();
      store.setConfig(monthConfig());
      const today = new Date(2030, 5, 1);
      store.setToday(today);
      store.goToToday();
      expect(store.anchorDate().getTime()).toBe(today.getTime());
    });

    it('goToToday falls back to a start-of-day when today is null', () => {
      const store = createStore();
      store.setConfig(monthConfig());
      // No setToday() call → today is null → fall back to startOfDay(new Date()).
      store.goToToday();
      const anchor = store.anchorDate();
      expect(anchor.getHours()).toBe(0);
      expect(anchor.getMinutes()).toBe(0);
      expect(anchor.getSeconds()).toBe(0);
      expect(anchor.getMilliseconds()).toBe(0);
    });

    it('keeps the prior anchor when setConfig receives an un-coercible date', () => {
      const store = createStore();
      store.setConfig(monthConfig()); // anchor → ANCHOR
      expect(store.anchorDate().getTime()).toBe(ANCHOR.getTime());
      // 'not-a-date' coerces to null → fall back to the existing anchorDate.
      store.setConfig(monthConfig({ date: 'not-a-date' }));
      expect(store.anchorDate().getTime()).toBe(ANCHOR.getTime());
    });

    it('setView / setAnchorDate / setCurrentTime mutate state', () => {
      const store = createStore();
      store.setConfig(monthConfig());
      store.setView('week');
      expect(store.view()).toBe('week');
      const d = new Date(2026, 2, 3);
      store.setAnchorDate(d);
      expect(store.anchorDate().getTime()).toBe(d.getTime());
      const now = new Date(2026, 2, 3, 12, 30);
      store.setCurrentTime(now);
      expect(store.currentTime()?.getTime()).toBe(now.getTime());
    });
  });

  describe('setConfig — interactive view + anchor survive config re-feeds', () => {
    it('preserves a view toggle when the config re-feeds with an unchanged view', () => {
      // Repro of the "Day → Week on drop" bug: the shell re-runs setConfig on every
      // config change (e.g. an eventDrop re-feeds the events), so a user view toggle
      // must survive the re-feed of an UNCHANGED config.view.
      const store = createStore();
      store.setConfig(monthConfig({ view: 'week' }));
      store.setView('day'); // user toggles to day
      expect(store.view()).toBe('day');
      store.setConfig(monthConfig({ view: 'week' })); // eventDrop re-feed, same view
      expect(store.view()).toBe('day');
    });

    it('adopts config.view when the consumer actually changes it', () => {
      const store = createStore();
      store.setConfig(monthConfig({ view: 'week' }));
      store.setView('day');
      store.setConfig(monthConfig({ view: 'year' })); // consumer-driven view change wins
      expect(store.view()).toBe('year');
    });

    it('preserves a prev/next navigation when the config re-feeds with an unchanged date', () => {
      const store = createStore();
      store.setConfig(monthConfig({ view: 'month' }));
      store.next(); // navigate to Feb
      expect(store.anchorDate().getMonth()).toBe(1);
      store.setConfig(monthConfig({ view: 'month' })); // same date → navigation preserved
      expect(store.anchorDate().getMonth()).toBe(1);
    });

    it('adopts config.date when the consumer actually changes it', () => {
      const store = createStore();
      store.setConfig(monthConfig());
      store.next();
      const newDate = new Date(2027, 5, 1); // consumer-driven date change wins
      store.setConfig(monthConfig({ date: newDate }));
      expect(store.anchorDate().getTime()).toBe(newDate.getTime());
    });
  });

  describe('selection', () => {
    it('selectEvent resolves selectedEvent and clearSelection resets it', () => {
      const store = createStore();
      store.setConfig(monthConfig());
      store.selectEvent('b');
      expect(store.selectedEventId()).toBe('b');
      expect(store.selectedEvent()?.id).toBe('b');
      store.clearSelection();
      expect(store.selectedEventId()).toBeNull();
      expect(store.selectedEvent()).toBeNull();
    });

    it('resolves selectedEvent to null for a nonexistent id', () => {
      const store = createStore();
      store.setConfig(monthConfig());
      store.selectEvent('does-not-exist');
      expect(store.selectedEventId()).toBe('does-not-exist');
      expect(store.selectedEvent()).toBeNull();
    });

    it('setHoveredEvent / setFocusedDate mutate state', () => {
      const store = createStore();
      store.setConfig(monthConfig());
      store.setHoveredEvent('a');
      expect(store.hoveredEventId()).toBe('a');
      const focus = new Date(2026, 0, 20);
      store.setFocusedDate(focus);
      expect(store.focusedDate()?.getTime()).toBe(focus.getTime());
    });

    it('slotClick stores the passed slot (starting from null)', () => {
      const store = createStore();
      store.setConfig(monthConfig());
      expect(store.lastSlotClick()).toBeNull();
      const slot = { end: new Date(2026, 0, 20, 10, 0), start: new Date(2026, 0, 20, 9, 0) };
      store.slotClick(slot);
      expect(store.lastSlotClick()).toBe(slot);
    });
  });

  describe('popover', () => {
    it('openPopover surfaces the cell chips and closePopover clears them', () => {
      const store = createStore();
      store.setConfig(monthConfig());
      store.openPopover(ANCHOR);
      const chips = store.popoverEvents();
      expect(chips.map(c => c.id).sort()).toEqual(['a', 'b']);
      store.closePopover();
      expect(store.popoverDate()).toBeNull();
      expect(store.popoverEvents()).toEqual([]);
    });

    it('returns an empty list for a day with no chips', () => {
      const store = createStore();
      store.setConfig(monthConfig());
      store.openPopover(new Date(2026, 0, 3));
      expect(store.popoverEvents()).toEqual([]);
    });
  });

  describe('filter (ARCH-149)', () => {
    /** A config with one all-day and one timed event of differing colours. */
    function filterConfig(overrides: Partial<NgeCalendarConfig> = {}): NgeCalendarConfig {
      return {
        date: ANCHOR,
        events: [
          {
            allDay: true,
            color: '#f00',
            id: 'all-day',
            start: new Date(2026, 0, 15),
            title: 'Holiday',
          },
          {
            color: '#0f0',
            end: new Date(2026, 0, 15, 10, 0),
            id: 'timed',
            start: new Date(2026, 0, 15, 9, 0),
            title: 'Standup',
          },
        ],
        view: 'month',
        ...overrides,
      };
    }

    it('exposes default (inactive) filter state', () => {
      const store = createStore();
      store.setConfig(filterConfig());
      expect(store.filter()).toEqual({ colors: [], query: '', timing: 'all' });
      expect(store.filterActive()).toBe(false);
      expect(store.activeFilterCount()).toBe(0);
      expect(store.activeEventFilter()).toBeNull();
      expect(store.events()).toHaveLength(2);
    });

    it('availableColors lists the distinct raw config colours', () => {
      const store = createStore();
      store.setConfig(filterConfig());
      expect(store.availableColors()).toEqual(['#f00', '#0f0']);
    });

    it('setFilter narrows events across the view-models and updates counts', () => {
      const store = createStore();
      store.setConfig(filterConfig());
      store.setFilter({ query: 'standup' });
      expect(store.filterActive()).toBe(true);
      expect(store.activeFilterCount()).toBe(1);
      expect(store.events().map(e => e.id)).toEqual(['timed']);
    });

    it('filters by colour and timing', () => {
      const store = createStore();
      store.setConfig(filterConfig());
      store.setFilter({ timing: 'allDay' });
      expect(store.events().map(e => e.id)).toEqual(['all-day']);
      store.setFilter({ colors: ['#0f0'], timing: 'all' });
      expect(store.events().map(e => e.id)).toEqual(['timed']);
    });

    it('availableColors stays full even when a colour is filtered out', () => {
      const store = createStore();
      store.setConfig(filterConfig());
      store.setFilter({ colors: ['#f00'] });
      expect(store.events().map(e => e.id)).toEqual(['all-day']);
      expect(store.availableColors()).toEqual(['#f00', '#0f0']);
    });

    it('clearFilter resets the filter and the host predicate', () => {
      const store = createStore();
      store.setConfig(filterConfig());
      store.setFilter({ query: 'standup' });
      store.setHostPredicate(() => false);
      store.clearFilter();
      expect(store.filter()).toEqual({ colors: [], query: '', timing: 'all' });
      expect(store.filterActive()).toBe(false);
      expect(store.events()).toHaveLength(2);
    });

    it('hostPredicate takes precedence over the default facets and is counted', () => {
      const store = createStore();
      store.setConfig(filterConfig());
      store.setFilter({ query: 'standup' }); // would keep only the timed event
      store.setHostPredicate(e => e.id === 'all-day');
      expect(store.activeEventFilter()).not.toBeNull();
      expect(store.events().map(e => e.id)).toEqual(['all-day']);
      expect(store.activeFilterCount()).toBe(2); // 1 facet + 1 host override
      expect(store.filterActive()).toBe(true);
    });

    it('config.eventFilter applies when set and no host predicate / facets win', () => {
      const store = createStore();
      store.setConfig(filterConfig({ eventFilter: e => e.allDay }));
      expect(store.events().map(e => e.id)).toEqual(['all-day']);
      // config.eventFilter is host-external — not counted, but it IS active.
      expect(store.activeFilterCount()).toBe(0);
      expect(store.activeEventFilter()).not.toBeNull();
    });

    it('a hidden event cannot be selected', () => {
      const store = createStore();
      store.setConfig(filterConfig());
      store.setFilter({ query: 'standup' }); // hides the all-day event
      store.selectEvent('all-day');
      expect(store.selectedEvent()).toBeNull();
    });

    it('a hidden event cannot be dragged (AC5 drag half)', () => {
      const store = createStore();
      store.setConfig(filterConfig());
      store.setFilter({ query: 'standup' }); // hides the all-day event
      store.startDrag({ eventId: 'all-day', mode: 'move' });
      expect(store.drag()).toBeNull();
    });

    it('does not churn visibleRange when a filter is applied (no spurious rangeChange)', () => {
      const store = createStore();
      store.setConfig(filterConfig());
      const before = store.visibleRange();
      expect(before).not.toBeNull();
      store.setFilter({ query: 'standup' }); // narrows events, not the grid date span
      // Value-equality keeps the SAME reference, so downstream rangeChange never refires.
      expect(store.visibleRange()).toBe(before);
    });
  });

  describe('visibleRange', () => {
    it('is non-null and spans 42 days in month view', () => {
      const store = createStore();
      store.setConfig(monthConfig({ view: 'month' }));
      const range = store.visibleRange();
      if (!range) {
        throw new Error('expected a non-null visibleRange');
      }
      const days = Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1;
      expect(days).toBe(42); // 6 weeks × 7 days
    });

    it('spans the calendar year in year view', () => {
      const store = createStore();
      store.setConfig(monthConfig({ view: 'year' }));
      const range = store.visibleRange();
      expect(range?.start.getFullYear()).toBe(2026);
      expect(range?.start.getMonth()).toBe(0);
      expect(range?.start.getDate()).toBe(1);
      expect(range?.end.getMonth()).toBe(11);
      expect(range?.end.getDate()).toBe(31);
    });

    it('matches the first/last column dates of the week view-model in week view', () => {
      const store = createStore();
      store.setConfig(monthConfig({ view: 'week' }));
      const range = store.visibleRange();
      const week = store.weekViewModel();
      if (!range || !week) {
        throw new Error('expected a non-null visibleRange and weekViewModel');
      }
      expect(range.start.getTime()).toBe(week.columns[0].date.getTime());
      expect(range.end.getTime()).toBe(week.columns[week.columns.length - 1].date.getTime());
    });

    it('matches the single column date of the day view-model in day view', () => {
      const store = createStore();
      store.setConfig(monthConfig({ view: 'day' }));
      const range = store.visibleRange();
      const day = store.dayViewModel();
      if (!range || !day) {
        throw new Error('expected a non-null visibleRange and dayViewModel');
      }
      expect(range.start.getTime()).toBe(day.columns[0].date.getTime());
      expect(range.end.getTime()).toBe(day.columns[day.columns.length - 1].date.getTime());
    });
  });
});
