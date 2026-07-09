import { addDays, startOfWeek } from '@nge/date';

import type { NormalizedCalendarConfig } from '../models';
import type { TimeGridViewModel } from './time-grid-view-model.model';

import { buildTimeGrid } from './build-time-grid';

/**
 * Build the week view as a {@link TimeGridViewModel} of seven consecutive day
 * columns, starting from `startOfWeek(config.date, config.weekStartsOn)`.
 */
export function buildWeekViewModel(config: NormalizedCalendarConfig): TimeGridViewModel {
  const weekStart = startOfWeek(config.date, config.weekStartsOn);
  const days = Array.from({ length: 7 }, (_unused, index) => addDays(weekStart, index));
  return buildTimeGrid(days, config);
}
