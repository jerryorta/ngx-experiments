import type { NgeCalendarConfig } from '../models/nge-calendar-config.model';

import {
  DEFAULT_DAY_END_HOUR,
  DEFAULT_DAY_START_HOUR,
  DEFAULT_EDITABLE,
  DEFAULT_MONTH_LAYOUT,
  DEFAULT_SLOT_MINUTES,
  DEFAULT_VIEW,
  DEFAULT_WEEK_STARTS_ON,
} from './defaults';
import { normalizeConfig } from './normalize-config';

function baseConfig(overrides: Partial<NgeCalendarConfig> = {}): NgeCalendarConfig {
  return {
    date: '2026-06-06T00:00:00.000Z',
    events: [],
    view: 'month',
    ...overrides,
  };
}

describe('normalizeConfig', () => {
  describe('defaults applied when optionals omitted', () => {
    it('applies every default', () => {
      const result = normalizeConfig(baseConfig());
      expect(result.weekStartsOn).toBe(DEFAULT_WEEK_STARTS_ON);
      expect(result.slotMinutes).toBe(DEFAULT_SLOT_MINUTES);
      expect(result.dayStartHour).toBe(DEFAULT_DAY_START_HOUR);
      expect(result.dayEndHour).toBe(DEFAULT_DAY_END_HOUR);
      expect(result.editable).toBe(DEFAULT_EDITABLE);
      expect(result.monthLayout).toBe(DEFAULT_MONTH_LAYOUT);
    });

    it('leaves optional passthrough fields undefined when omitted', () => {
      const result = normalizeConfig(baseConfig());
      expect(result.locale).toBeUndefined();
      expect(result.theme).toBeUndefined();
    });
  });

  describe('valid values pass through', () => {
    it('keeps valid tuning knobs', () => {
      const theme = { '--nge-calendar-bg': '#fff' } as const;
      const result = normalizeConfig(
        baseConfig({
          dayEndHour: 18,
          dayStartHour: 6,
          editable: true,
          locale: 'en-GB',
          slotMinutes: 15,
          theme,
          view: 'week',
          weekStartsOn: 1,
        })
      );
      expect(result.view).toBe('week');
      expect(result.weekStartsOn).toBe(1);
      expect(result.slotMinutes).toBe(15);
      expect(result.dayStartHour).toBe(6);
      expect(result.dayEndHour).toBe(18);
      expect(result.editable).toBe(true);
      expect(result.locale).toBe('en-GB');
      expect(result.theme).toBe(theme);
    });
  });

  describe('view', () => {
    it.each(['day', 'month', 'week', 'year'] as const)('keeps valid view %s', view => {
      expect(normalizeConfig(baseConfig({ view })).view).toBe(view);
    });

    it('falls back to the default view for an invalid view', () => {
      expect(normalizeConfig(baseConfig({ view: 'decade' as never })).view).toBe(DEFAULT_VIEW);
    });
  });

  describe('date', () => {
    it('coerces a valid date', () => {
      const result = normalizeConfig(baseConfig({ date: '2026-06-06T00:00:00.000Z' }));
      expect(result.date.toISOString()).toBe('2026-06-06T00:00:00.000Z');
    });

    it('falls back to a valid Date (now) when date is un-coercible', () => {
      const result = normalizeConfig(baseConfig({ date: 'not-a-date' }));
      expect(result.date).toBeInstanceOf(Date);
      expect(Number.isNaN(result.date.getTime())).toBe(false);
    });
  });

  describe('events', () => {
    it('normalises valid events and filters out invalid ones', () => {
      const result = normalizeConfig(
        baseConfig({
          events: [
            { id: 'a', start: '2026-06-06T09:00:00.000Z', title: 'Good' },
            { id: '', start: '2026-06-06T09:00:00.000Z', title: 'No id' },
            { id: 'c', start: 'garbage', title: 'Bad start' },
            { id: 'd', start: '2026-06-06T10:00:00.000Z', title: 'Also good' },
          ],
        })
      );
      expect(result.events).toHaveLength(2);
      expect(result.events.map(event => event.id)).toEqual(['a', 'd']);
    });

    it('treats a missing events array as empty', () => {
      const result = normalizeConfig(baseConfig({ events: undefined as never }));
      expect(result.events).toEqual([]);
    });
  });

  describe('weekStartsOn', () => {
    it('falls back to default when out of range', () => {
      expect(normalizeConfig(baseConfig({ weekStartsOn: 9 as never })).weekStartsOn).toBe(
        DEFAULT_WEEK_STARTS_ON
      );
    });

    it('falls back to default for a non-integer', () => {
      expect(normalizeConfig(baseConfig({ weekStartsOn: 2.5 as never })).weekStartsOn).toBe(
        DEFAULT_WEEK_STARTS_ON
      );
    });
  });

  describe('monthLayout', () => {
    it('defaults to grid when omitted', () => {
      expect(normalizeConfig(baseConfig()).monthLayout).toBe('grid');
      expect(DEFAULT_MONTH_LAYOUT).toBe('grid');
    });

    it('falls back to the default for an invalid value', () => {
      expect(normalizeConfig(baseConfig({ monthLayout: 'list' as never })).monthLayout).toBe(
        DEFAULT_MONTH_LAYOUT
      );
    });

    it('preserves an explicit agenda layout', () => {
      expect(normalizeConfig(baseConfig({ monthLayout: 'agenda' })).monthLayout).toBe('agenda');
    });

    it('preserves an explicit grid layout', () => {
      expect(normalizeConfig(baseConfig({ monthLayout: 'grid' })).monthLayout).toBe('grid');
    });
  });

  describe('slotMinutes', () => {
    it('falls back to default when <= 0', () => {
      expect(normalizeConfig(baseConfig({ slotMinutes: 0 })).slotMinutes).toBe(
        DEFAULT_SLOT_MINUTES
      );
      expect(normalizeConfig(baseConfig({ slotMinutes: -10 })).slotMinutes).toBe(
        DEFAULT_SLOT_MINUTES
      );
    });
  });

  describe('day hours', () => {
    it('clamps dayStartHour / dayEndHour into [0, 24]', () => {
      const result = normalizeConfig(baseConfig({ dayEndHour: 99, dayStartHour: -5 }));
      expect(result.dayStartHour).toBe(0);
      expect(result.dayEndHour).toBe(24);
    });

    it('corrects dayEndHour when it is <= dayStartHour', () => {
      const result = normalizeConfig(baseConfig({ dayEndHour: 8, dayStartHour: 10 }));
      expect(result.dayEndHour).toBe(DEFAULT_DAY_END_HOUR);
      expect(result.dayStartHour).toBe(10);
    });

    it('resets both when the corrected end is still <= start', () => {
      const result = normalizeConfig(baseConfig({ dayEndHour: 12, dayStartHour: 24 }));
      expect(result.dayStartHour).toBe(0);
      expect(result.dayEndHour).toBe(24);
    });

    it('falls back to defaults for non-finite hours', () => {
      const result = normalizeConfig(
        baseConfig({
          dayEndHour: Number.NaN,
          dayStartHour: Number.POSITIVE_INFINITY,
        })
      );
      expect(result.dayStartHour).toBe(DEFAULT_DAY_START_HOUR);
      expect(result.dayEndHour).toBe(DEFAULT_DAY_END_HOUR);
    });
  });

  it('never throws for malformed input', () => {
    expect(() => normalizeConfig({} as never)).not.toThrow();
  });
});
