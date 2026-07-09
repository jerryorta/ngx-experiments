import type { WeekStartsOn } from './temporal.models';

import {
  addDays,
  addMonths,
  addYears,
  differenceInHours,
  differenceInMinutes,
  eachDayOfInterval,
  eachHourOfInterval,
  endOfMonth,
  getMonthMatrix,
  getWeekDays,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from './temporal.fns';

describe('temporal fns', () => {
  describe('getMonthMatrix', () => {
    it('returns a fixed 6×7 grid of Dates', () => {
      const matrix = getMonthMatrix(new Date(2026, 5, 15));
      expect(matrix).toHaveLength(6);
      for (const week of matrix) {
        expect(week).toHaveLength(7);
        for (const day of week) {
          expect(day).toBeInstanceOf(Date);
        }
      }
    });

    it('first cell falls on the configured week start, for every weekStartsOn', () => {
      for (let wsOn = 0; wsOn <= 6; wsOn++) {
        const matrix = getMonthMatrix(new Date(2026, 5, 15), wsOn as WeekStartsOn);
        expect(matrix[0][0].getDay()).toBe(wsOn);
      }
    });

    it('cells are contiguous calendar days', () => {
      const flat = getMonthMatrix(new Date(2026, 5, 15)).flat();
      for (let i = 1; i < flat.length; i++) {
        expect(differenceInMinutes(flat[i], flat[i - 1])).toBe(24 * 60);
      }
    });

    it('covers every day of the target month', () => {
      const flat = getMonthMatrix(new Date(2026, 5, 10)).flat(); // June 2026 (30 days)
      for (let d = 1; d <= 30; d++) {
        const target = new Date(2026, 5, d);
        expect(flat.some(cell => isSameDay(cell, target))).toBe(true);
      }
    });

    it('includes Feb 29 in a leap year', () => {
      const flat = getMonthMatrix(new Date(2024, 1, 15)).flat(); // Feb 2024 (leap)
      expect(flat.some(cell => isSameDay(cell, new Date(2024, 1, 29)))).toBe(true);
    });

    it('respects weekStartsOn=1 (Monday) and still contains the month start', () => {
      const matrix = getMonthMatrix(new Date(2026, 5, 15), 1);
      expect(matrix[0][0].getDay()).toBe(1);
      expect(matrix.flat().some(cell => isSameDay(cell, new Date(2026, 5, 1)))).toBe(true);
    });
  });

  describe('interval generators', () => {
    it('eachDayOfInterval lists each day inclusive', () => {
      const days = eachDayOfInterval({ end: new Date(2026, 0, 5), start: new Date(2026, 0, 1) });
      expect(days).toHaveLength(5);
      expect(isSameDay(days[0], new Date(2026, 0, 1))).toBe(true);
      expect(isSameDay(days[4], new Date(2026, 0, 5))).toBe(true);
    });

    it('eachHourOfInterval lists each hour inclusive', () => {
      const hours = eachHourOfInterval({
        end: new Date(2026, 0, 1, 12, 0),
        start: new Date(2026, 0, 1, 9, 0),
      });
      expect(hours).toHaveLength(4); // 9, 10, 11, 12
    });
  });

  describe('comparisons', () => {
    it('isSameDay', () => {
      expect(isSameDay(new Date(2026, 0, 1, 9), new Date(2026, 0, 1, 18))).toBe(true);
      expect(isSameDay(new Date(2026, 0, 1), new Date(2026, 0, 2))).toBe(false);
    });

    it('isSameMonth', () => {
      expect(isSameMonth(new Date(2026, 0, 1), new Date(2026, 0, 28))).toBe(true);
      expect(isSameMonth(new Date(2026, 0, 31), new Date(2026, 1, 1))).toBe(false);
    });

    it('isWithinInterval (inclusive)', () => {
      const interval = { end: new Date(2026, 0, 31), start: new Date(2026, 0, 1) };
      expect(isWithinInterval(new Date(2026, 0, 15), interval)).toBe(true);
      expect(isWithinInterval(new Date(2026, 1, 1), interval)).toBe(false);
    });
  });

  describe('differences', () => {
    it('differenceInMinutes', () => {
      expect(differenceInMinutes(new Date(2026, 0, 1, 10, 30), new Date(2026, 0, 1, 10, 0))).toBe(
        30
      );
    });

    it('differenceInHours', () => {
      expect(differenceInHours(new Date(2026, 0, 1, 12), new Date(2026, 0, 1, 9))).toBe(3);
    });
  });

  describe('arithmetic + boundaries', () => {
    it('addDays / addMonths / addYears', () => {
      expect(isSameDay(addDays(new Date(2026, 0, 1), 5), new Date(2026, 0, 6))).toBe(true);
      expect(isSameMonth(addMonths(new Date(2026, 0, 15), 1), new Date(2026, 1, 1))).toBe(true);
      expect(addYears(new Date(2026, 5, 15), 1).getFullYear()).toBe(2027);
      expect(addYears(new Date(2026, 5, 15), -2).getFullYear()).toBe(2024);
    });

    it('startOfDay / startOfMonth / endOfMonth', () => {
      expect(startOfDay(new Date(2026, 0, 1, 13, 45)).getHours()).toBe(0);
      expect(startOfMonth(new Date(2026, 0, 20)).getDate()).toBe(1);
      expect(endOfMonth(new Date(2026, 1, 10)).getDate()).toBe(28); // Feb 2026 (non-leap)
    });

    it('startOfWeek respects weekStartsOn', () => {
      expect(startOfWeek(new Date(2026, 5, 15), 0).getDay()).toBe(0);
      expect(startOfWeek(new Date(2026, 5, 15), 1).getDay()).toBe(1);
    });
  });

  describe('getWeekDays', () => {
    it('returns 7 short labels starting Sunday by default', () => {
      const days = getWeekDays(0, 'en-US');
      expect(days).toHaveLength(7);
      expect(days[0]).toBe('Sun');
      expect(days[6]).toBe('Sat');
    });

    it('starts on Monday for weekStartsOn=1', () => {
      const days = getWeekDays(1, 'en-US');
      expect(days[0]).toBe('Mon');
      expect(days[6]).toBe('Sun');
    });
  });
});
