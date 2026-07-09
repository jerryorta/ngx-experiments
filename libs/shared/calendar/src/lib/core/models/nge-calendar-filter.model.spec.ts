import type { NormalizedCalendarEvent } from './nge-calendar-event.model';

import {
  compileFilterPredicate,
  countActiveFacets,
  DEFAULT_GIGA_CALENDAR_FILTER,
  type NgeCalendarFilter,
  isDefaultFilter,
} from './nge-calendar-filter.model';

function baseEvent(overrides: Partial<NormalizedCalendarEvent> = {}): NormalizedCalendarEvent {
  return {
    allDay: false,
    end: null,
    id: 'evt-1',
    start: new Date('2026-06-06T09:00:00.000Z'),
    title: 'Standup',
    ...overrides,
  };
}

function filter(overrides: Partial<NgeCalendarFilter> = {}): NgeCalendarFilter {
  return { ...DEFAULT_GIGA_CALENDAR_FILTER, ...overrides };
}

describe('nge-calendar-filter.model', () => {
  describe('DEFAULT_GIGA_CALENDAR_FILTER', () => {
    it('is the empty pass-through filter', () => {
      expect(DEFAULT_GIGA_CALENDAR_FILTER).toEqual({ colors: [], query: '', timing: 'all' });
    });
  });

  describe('isDefaultFilter', () => {
    it('is true for the default filter', () => {
      expect(isDefaultFilter(filter())).toBe(true);
    });

    it('treats an all-whitespace query as empty', () => {
      expect(isDefaultFilter(filter({ query: '   ' }))).toBe(true);
    });

    it('is false when query is non-empty', () => {
      expect(isDefaultFilter(filter({ query: 'a' }))).toBe(false);
    });

    it('is false when colours are present', () => {
      expect(isDefaultFilter(filter({ colors: ['#f00'] }))).toBe(false);
    });

    it('is false when timing is not "all"', () => {
      expect(isDefaultFilter(filter({ timing: 'allDay' }))).toBe(false);
      expect(isDefaultFilter(filter({ timing: 'timed' }))).toBe(false);
    });
  });

  describe('countActiveFacets', () => {
    it('is 0 for the default filter', () => {
      expect(countActiveFacets(filter())).toBe(0);
    });

    it('counts a non-empty (trimmed) query as 1', () => {
      expect(countActiveFacets(filter({ query: 'meeting' }))).toBe(1);
      expect(countActiveFacets(filter({ query: '   ' }))).toBe(0);
    });

    it('counts each colour', () => {
      expect(countActiveFacets(filter({ colors: ['#f00', '#0f0'] }))).toBe(2);
    });

    it('counts a non-"all" timing as 1', () => {
      expect(countActiveFacets(filter({ timing: 'timed' }))).toBe(1);
    });

    it('sums every active facet', () => {
      expect(
        countActiveFacets(filter({ colors: ['#f00', '#0f0'], query: 'x', timing: 'allDay' }))
      ).toBe(4);
    });
  });

  describe('compileFilterPredicate', () => {
    it('returns null for the default filter (true pass-through)', () => {
      expect(compileFilterPredicate(filter())).toBeNull();
    });

    it('returns null when the query is all whitespace and nothing else is set', () => {
      expect(compileFilterPredicate(filter({ query: '   ' }))).toBeNull();
    });

    describe('query facet', () => {
      it('matches case-insensitively on the title', () => {
        const predicate = compileFilterPredicate(filter({ query: 'STAND' }));
        expect(predicate).not.toBeNull();
        expect(predicate?.(baseEvent({ title: 'Standup' }))).toBe(true);
        expect(predicate?.(baseEvent({ title: 'Retro' }))).toBe(false);
      });

      it('trims the query before matching', () => {
        const predicate = compileFilterPredicate(filter({ query: '  standup  ' }));
        expect(predicate?.(baseEvent({ title: 'Standup' }))).toBe(true);
      });

      it('matches a substring anywhere in the title', () => {
        const predicate = compileFilterPredicate(filter({ query: 'review' }));
        expect(predicate?.(baseEvent({ title: 'Code review session' }))).toBe(true);
      });
    });

    describe('colors facet', () => {
      it('keeps events whose colour is in the set', () => {
        const predicate = compileFilterPredicate(filter({ colors: ['#f00', '#0f0'] }));
        expect(predicate?.(baseEvent({ color: '#f00' }))).toBe(true);
        expect(predicate?.(baseEvent({ color: '#00f' }))).toBe(false);
      });

      it('treats a missing colour as a non-match while the colour facet is active', () => {
        const predicate = compileFilterPredicate(filter({ colors: ['#f00'] }));
        expect(predicate?.(baseEvent({ color: undefined }))).toBe(false);
      });
    });

    describe('timing facet', () => {
      it('"allDay" keeps only all-day events', () => {
        const predicate = compileFilterPredicate(filter({ timing: 'allDay' }));
        expect(predicate?.(baseEvent({ allDay: true }))).toBe(true);
        expect(predicate?.(baseEvent({ allDay: false }))).toBe(false);
      });

      it('"timed" keeps only timed (non-all-day) events', () => {
        const predicate = compileFilterPredicate(filter({ timing: 'timed' }));
        expect(predicate?.(baseEvent({ allDay: false }))).toBe(true);
        expect(predicate?.(baseEvent({ allDay: true }))).toBe(false);
      });
    });

    describe('combined facets (AND)', () => {
      it('requires every active facet to pass', () => {
        const predicate = compileFilterPredicate(
          filter({ colors: ['#f00'], query: 'sync', timing: 'timed' })
        );
        // all three pass
        expect(predicate?.(baseEvent({ allDay: false, color: '#f00', title: 'Daily sync' }))).toBe(
          true
        );
        // wrong colour
        expect(predicate?.(baseEvent({ allDay: false, color: '#0f0', title: 'Daily sync' }))).toBe(
          false
        );
        // wrong title
        expect(predicate?.(baseEvent({ allDay: false, color: '#f00', title: 'Retro' }))).toBe(
          false
        );
        // wrong timing
        expect(predicate?.(baseEvent({ allDay: true, color: '#f00', title: 'Daily sync' }))).toBe(
          false
        );
      });
    });
  });
});
