import { startOfDay } from '@nge/date';

import type { NormalizedCalendarConfig } from '../models';
import type { TimeGridViewModel } from './time-grid-view-model.model';

import { buildTimeGrid } from './build-time-grid';

/**
 * Build the day view as a single-column {@link TimeGridViewModel} for the
 * calendar day containing `config.date`.
 */
export function buildDayViewModel(config: NormalizedCalendarConfig): TimeGridViewModel {
  return buildTimeGrid([startOfDay(config.date)], config);
}
