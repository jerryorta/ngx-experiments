import {
  addMonths,
  getMonthMatrix,
  getWeekDays,
  isSameDay,
  isSameMonth,
  startOfYear,
} from '@nge/date';

import type { NormalizedCalendarConfig } from '../models';
import type { MiniMonth, MiniMonthDay, YearViewModel } from './year-view-model.model';

import { eventsForDay } from '../layout';

const MONTHS_PER_YEAR = 12;

/**
 * Map a per-day event count to a 0..3 density bucket:
 * `0` (none), `1` (1–2), `2` (3–4), `3` (5+).
 */
function densityFor(eventCount: number): number {
  if (eventCount === 0) {
    return 0;
  }
  if (eventCount <= 2) {
    return 1;
  }
  if (eventCount <= 4) {
    return 2;
  }
  return 3;
}

/**
 * Build the year {@link YearViewModel}: twelve mini-month grids for the year of
 * `config.date`. Each day carries an `eventCount` (events intersecting that day)
 * and a derived `densityLevel` for heat-map rendering.
 */
export function buildYearViewModel(config: NormalizedCalendarConfig): YearViewModel {
  const yearStart = startOfYear(config.date);
  const year = yearStart.getFullYear();
  const weekdayLabels = getWeekDays(config.weekStartsOn, config.locale);

  const months: MiniMonth[] = [];

  for (let monthIndex = 0; monthIndex < MONTHS_PER_YEAR; monthIndex++) {
    const monthAnchor = addMonths(yearStart, monthIndex);
    const matrix = getMonthMatrix(monthAnchor, config.weekStartsOn);

    const weeks: MiniMonthDay[][] = matrix.map(row =>
      row.map(cellDate => {
        const eventCount = eventsForDay(config.events, cellDate).length;
        return {
          date: cellDate,
          dayOfMonth: cellDate.getDate(),
          densityLevel: densityFor(eventCount),
          eventCount,
          isAnchor: isSameDay(cellDate, config.date),
          isOutOfMonth: !isSameMonth(cellDate, monthAnchor),
        };
      })
    );

    months.push({
      label: formatMonth(monthAnchor, config.locale),
      monthIndex,
      weekdayLabels,
      weeks,
    });
  }

  return { months, year };
}

/** A stable month label (`Intl`, defaults to the runtime locale). */
function formatMonth(monthAnchor: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(monthAnchor);
}
