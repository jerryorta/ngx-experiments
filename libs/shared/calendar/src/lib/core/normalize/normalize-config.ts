import type {
  NgeCalendarConfig,
  NgeCalendarView,
  NormalizedCalendarConfig,
} from '../models/nge-calendar-config.model';
import type { NormalizedCalendarEvent } from '../models/nge-calendar-event.model';

import { coerceToDate } from './coerce-date';
import {
  DEFAULT_DAY_END_HOUR,
  DEFAULT_DAY_START_HOUR,
  DEFAULT_EDITABLE,
  DEFAULT_MONTH_LAYOUT,
  DEFAULT_SLOT_MINUTES,
  DEFAULT_VIEW,
  DEFAULT_WEEK_STARTS_ON,
} from './defaults';
import { normalizeEvent } from './normalize-event';

const VIEWS: readonly NgeCalendarView[] = ['day', 'month', 'week', 'year'];

/** Clamp `value` into the closed hour range `[0, 24]`. */
function clampHour(value: number): number {
  return Math.min(24, Math.max(0, value));
}

/**
 * Normalise a {@link NgeCalendarConfig} into a fully-defaulted
 * {@link NormalizedCalendarConfig}.
 *
 * Pure and total — never throws. Invalid optional values fall back to the
 * `DEFAULT_*` constants and every event is run through `normalizeEvent`
 * (invalid events are filtered out). The one non-deterministic branch is the
 * `date` fallback: an un-coercible `date` resolves to `new Date()` (today) so
 * the calendar always has a valid anchor to render.
 */
export function normalizeConfig(config: NgeCalendarConfig): NormalizedCalendarConfig {
  const view = VIEWS.includes(config.view) ? config.view : DEFAULT_VIEW;

  // The only non-deterministic branch: fall back to "now" when `date` is
  // missing or un-coercible, so the calendar always has a valid anchor.
  const date = coerceToDate(config.date) ?? new Date();

  const events = (config.events ?? [])
    .map(normalizeEvent)
    .filter((event): event is NormalizedCalendarEvent => event !== null);

  const weekStartsOn =
    typeof config.weekStartsOn === 'number' &&
    Number.isInteger(config.weekStartsOn) &&
    config.weekStartsOn >= 0 &&
    config.weekStartsOn <= 6
      ? config.weekStartsOn
      : DEFAULT_WEEK_STARTS_ON;

  const slotMinutes =
    typeof config.slotMinutes === 'number' && config.slotMinutes > 0
      ? config.slotMinutes
      : DEFAULT_SLOT_MINUTES;

  const monthLayout =
    config.monthLayout === 'agenda' || config.monthLayout === 'grid'
      ? config.monthLayout
      : DEFAULT_MONTH_LAYOUT;

  const dayStartHour =
    typeof config.dayStartHour === 'number' && Number.isFinite(config.dayStartHour)
      ? clampHour(config.dayStartHour)
      : DEFAULT_DAY_START_HOUR;

  let dayEndHour =
    typeof config.dayEndHour === 'number' && Number.isFinite(config.dayEndHour)
      ? clampHour(config.dayEndHour)
      : DEFAULT_DAY_END_HOUR;

  let resolvedDayStartHour = dayStartHour;
  if (dayEndHour <= resolvedDayStartHour) {
    dayEndHour = DEFAULT_DAY_END_HOUR;
    if (dayEndHour <= resolvedDayStartHour) {
      resolvedDayStartHour = DEFAULT_DAY_START_HOUR;
      dayEndHour = DEFAULT_DAY_END_HOUR;
    }
  }

  return {
    date,
    dayEndHour,
    dayStartHour: resolvedDayStartHour,
    editable: config.editable ?? DEFAULT_EDITABLE,
    events,
    locale: config.locale,
    monthLayout,
    slotMinutes,
    theme: config.theme,
    view,
    weekStartsOn,
  };
}
