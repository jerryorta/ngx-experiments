import { endOfMonth, isSameDay, startOfDay, startOfMonth } from '@nge/date';

import type { NormalizedCalendarConfig, NormalizedCalendarEvent } from '../models';
import type { MonthAgendaDayGroup, MonthAgendaViewModel } from './month-agenda-view-model.model';

/**
 * Order events WITHIN a single day group: all-day events first, then by `start`
 * ascending. Stable tie-break on `end` then `id` so the output is deterministic.
 */
function byAgendaOrder(left: NormalizedCalendarEvent, right: NormalizedCalendarEvent): number {
  if (left.allDay !== right.allDay) {
    return left.allDay ? -1 : 1;
  }
  const startDiff = left.start.getTime() - right.start.getTime();
  if (startDiff !== 0) {
    return startDiff;
  }
  const leftEnd = (left.end ?? left.start).getTime();
  const rightEnd = (right.end ?? right.start).getTime();
  if (leftEnd !== rightEnd) {
    return leftEnd - rightEnd;
  }
  return left.id.localeCompare(right.id);
}

/**
 * Build the compact mobile month-agenda {@link MonthAgendaViewModel} from an
 * already-normalized config.
 *
 * Inclusion rule (deterministic): an event is included when `startOfDay(start)`
 * falls within the visible month `[startOfMonth(date), endOfMonth(date)]` — i.e.
 * the event STARTS in the month. Each included event is grouped by its
 * `startOfDay(start)`. Only days with at least one event are emitted; day groups
 * are chronological and events within a group are ordered all-day-first then by
 * `start` ascending. Pure and locale-free — the component does all formatting.
 */
export function buildMonthAgendaViewModel(config: NormalizedCalendarConfig): MonthAgendaViewModel {
  const monthStart = startOfMonth(config.date);
  const monthEnd = endOfMonth(config.date);

  // Bucket events by their start-of-day, keeping only those that start in the
  // visible month. The first event seen for a day carries that day's `date`
  // (its start-of-day) so the group date stays identity-stable and locale-free.
  const groups: MonthAgendaDayGroup[] = [];

  for (const event of config.events) {
    const eventDay = startOfDay(event.start);
    if (eventDay.getTime() < monthStart.getTime() || eventDay.getTime() > monthEnd.getTime()) {
      continue;
    }

    const group = groups.find(candidate => isSameDay(candidate.date, eventDay));
    if (group) {
      group.events.push(event);
    } else {
      groups.push({ date: eventDay, events: [event] });
    }
  }

  groups.sort((left, right) => left.date.getTime() - right.date.getTime());
  for (const group of groups) {
    group.events.sort(byAgendaOrder);
  }

  return { days: groups };
}
