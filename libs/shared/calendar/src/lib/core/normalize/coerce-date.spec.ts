import type { NgeTimeStamp } from '@nge/date';

import { coerceToDate } from './coerce-date';

describe('coerceToDate', () => {
  describe('nullish', () => {
    it('returns null for null', () => {
      expect(coerceToDate(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(coerceToDate(undefined)).toBeNull();
    });
  });

  describe('Date inputs', () => {
    it('returns an equal Date for a valid Date', () => {
      const input = new Date('2026-06-06T12:00:00.000Z');
      const result = coerceToDate(input);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(input.getTime());
    });

    it('clones the Date (does not return the same reference)', () => {
      const input = new Date('2026-06-06T12:00:00.000Z');
      const result = coerceToDate(input);
      expect(result).not.toBe(input);
    });

    it('returns null for an Invalid Date', () => {
      expect(coerceToDate(new Date('not-a-date'))).toBeNull();
    });
  });

  describe('number inputs (epoch ms)', () => {
    it('coerces a positive epoch-ms number', () => {
      const millis = Date.UTC(2026, 5, 6, 12, 0, 0);
      expect(coerceToDate(millis)?.getTime()).toBe(millis);
    });

    it('coerces 0 (the unix epoch) — valid', () => {
      expect(coerceToDate(0)?.getTime()).toBe(0);
    });

    it('coerces a negative epoch-ms number — valid (pre-1970)', () => {
      expect(coerceToDate(-1000)?.getTime()).toBe(-1000);
    });

    it('returns null for NaN', () => {
      expect(coerceToDate(Number.NaN)).toBeNull();
    });

    it('returns null for Infinity', () => {
      expect(coerceToDate(Number.POSITIVE_INFINITY)).toBeNull();
    });

    it('returns null for -Infinity', () => {
      expect(coerceToDate(Number.NEGATIVE_INFINITY)).toBeNull();
    });
  });

  describe('string inputs (ISO)', () => {
    it('coerces a full ISO date-time string', () => {
      const iso = '2026-06-06T12:00:00.000Z';
      expect(coerceToDate(iso)?.toISOString()).toBe(iso);
    });

    it('coerces a date-only ISO string', () => {
      const result = coerceToDate('2026-06-06');
      expect(result).toBeInstanceOf(Date);
      expect(Number.isNaN(result?.getTime())).toBe(false);
    });

    it('trims surrounding whitespace before parsing', () => {
      const iso = '2026-06-06T12:00:00.000Z';
      expect(coerceToDate(`  ${iso}  `)?.toISOString()).toBe(iso);
    });

    it('returns null for an unparseable string', () => {
      expect(coerceToDate('nope')).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(coerceToDate('')).toBeNull();
    });

    it('returns null for a whitespace-only string', () => {
      expect(coerceToDate('   ')).toBeNull();
    });
  });

  describe('NgeTimeStamp inputs', () => {
    it('coerces a timestamp with numeric seconds', () => {
      const ts: NgeTimeStamp = { nanoseconds: 0, seconds: 1_780_000_000 };
      expect(coerceToDate(ts)?.getTime()).toBe(1_780_000_000 * 1000);
    });

    it('includes the nanoseconds component', () => {
      const ts: NgeTimeStamp = { nanoseconds: 500_000_000, seconds: 1_780_000_000 };
      expect(coerceToDate(ts)?.getTime()).toBe(1_780_000_000 * 1000 + 500);
    });

    it('treats null nanoseconds as 0', () => {
      const ts = { nanoseconds: null, seconds: 1_780_000_000 } as NgeTimeStamp;
      expect(coerceToDate(ts)?.getTime()).toBe(1_780_000_000 * 1000);
    });

    it('returns null when seconds is null', () => {
      const ts: NgeTimeStamp = { nanoseconds: 0, seconds: null };
      expect(coerceToDate(ts)).toBeNull();
    });

    it('coerces seconds: 0 to the unix epoch', () => {
      const ts: NgeTimeStamp = { nanoseconds: 0, seconds: 0 };
      expect(coerceToDate(ts)?.getTime()).toBe(0);
    });
  });

  describe('garbage inputs', () => {
    it('returns null for an empty object', () => {
      expect(coerceToDate({} as never)).toBeNull();
    });

    it('returns null for an object without a numeric seconds field', () => {
      expect(coerceToDate({ seconds: 'soon' } as never)).toBeNull();
    });

    it('returns null for a boolean', () => {
      expect(coerceToDate(true as never)).toBeNull();
      expect(coerceToDate(false as never)).toBeNull();
    });

    it('returns null for an array', () => {
      expect(coerceToDate([] as never)).toBeNull();
      expect(coerceToDate([2026, 5, 6] as never)).toBeNull();
    });
  });

  describe('totality (never throws)', () => {
    it('does not throw for any of a wide range of inputs', () => {
      const inputs: unknown[] = [
        null,
        undefined,
        new Date(),
        new Date('x'),
        0,
        -1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        '',
        '   ',
        'nope',
        '2026-06-06',
        { nanoseconds: 0, seconds: 1 },
        { nanoseconds: 0, seconds: null },
        {},
        true,
        [],
        [1, 2, 3],
      ];
      for (const input of inputs) {
        expect(() => coerceToDate(input as never)).not.toThrow();
      }
    });
  });
});
