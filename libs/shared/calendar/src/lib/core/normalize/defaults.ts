import type { WeekStartsOn } from '@nge/date';

import type { NgeCalendarView } from '../models/nge-calendar-config.model';

/** Minutes per time slot in the day/week time grid. */
export const DEFAULT_SLOT_MINUTES = 30;

/** First hour shown in the day/week time grid (inclusive, 0–24). */
export const DEFAULT_DAY_START_HOUR = 0;

/** Last hour shown in the day/week time grid (exclusive end, 0–24). */
export const DEFAULT_DAY_END_HOUR = 24;

/** Default first day of the week (`0` = Sunday). */
export const DEFAULT_WEEK_STARTS_ON: WeekStartsOn = 0;

/** Default calendar view when none (or an invalid one) is supplied. */
export const DEFAULT_VIEW: NgeCalendarView = 'month';

/** Whether events are editable (drag/resize) by default. */
export const DEFAULT_EDITABLE = false;

/** Default month-view layout variant (`'grid'` = the classic 6×7 grid). */
export const DEFAULT_MONTH_LAYOUT: 'agenda' | 'grid' = 'grid';
