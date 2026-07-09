const MINUTES_PER_HOUR = 60;

/**
 * The vertical position of the "now" indicator as a percentage (`0..100`) of a
 * time-grid's `[dayStartHour, dayEndHour]` window, or `null` when `now` falls
 * outside that window (so the caller hides the line).
 *
 * Uses local wall-clock hours/minutes — the same local-time basis the time-grid
 * columns are built on (`build-time-grid`'s `dayWindow` mutates a `startOfDay`
 * clone with `setHours`). Seconds are ignored: the now-line ticks per minute.
 */
export function nowLineOffsetPct(
  now: Date,
  dayStartHour: number,
  dayEndHour: number
): null | number {
  const minutesIntoDay = now.getHours() * MINUTES_PER_HOUR + now.getMinutes();
  const startMinute = dayStartHour * MINUTES_PER_HOUR;
  const endMinute = dayEndHour * MINUTES_PER_HOUR;
  const totalMinutes = endMinute - startMinute;

  if (totalMinutes <= 0 || minutesIntoDay < startMinute || minutesIntoDay > endMinute) {
    return null;
  }

  return ((minutesIntoDay - startMinute) / totalMinutes) * 100;
}
