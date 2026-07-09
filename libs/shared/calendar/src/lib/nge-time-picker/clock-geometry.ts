// Pure, DOM-free geometry for the analog-clock surface of `nge-time-picker`.
//
// The dial's coordinate convention: angle in degrees, `0` = 12 o'clock (straight up),
// increasing **clockwise** (matching a real clock). Kept as standalone pure functions so the
// snapping / wrapping math is unit-tested without a DOM, and the SVG surface just renders the
// results (mirrors how the picker keeps `parseHm` / `formatHm` pure).

/** Degrees in a full turn. */
const FULL_TURN = 360;

/** The 12 hour marks sit 30° apart. */
const DEGREES_PER_HOUR = 30;

/** Hour positions on the dial face (12, 1 … 11). */
const HOUR_POSITIONS = 12;

/** Minutes in a full turn of the minute dial. */
const MINUTES_PER_TURN = 60;

/** Normalize any angle (degrees) into the `[0, 360)` range. */
export function normalizeAngle(deg: number): number {
  return ((deg % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

/**
 * Clock angle (degrees, `0` = 12 o'clock, increasing clockwise) for a pointer at `(x, y)`
 * relative to a dial centered at `(cx, cy)`. Uses screen pixels, so the caller passes the dial's
 * rendered-rect center — the result is independent of the SVG's internal scale.
 */
export function pointerAngle(x: number, y: number, cx: number, cy: number): number {
  // atan2(dx, -dy): the result is 0 pointing up (12 o'clock) and grows clockwise.
  return normalizeAngle((Math.atan2(x - cx, cy - y) * 180) / Math.PI);
}

/** Nearest of the 12 hour positions (`0` = the 12 o'clock label) for an angle. */
export function angleToHourIndex(deg: number): number {
  return Math.round(normalizeAngle(deg) / DEGREES_PER_HOUR) % HOUR_POSITIONS;
}

/** Angle (degrees) of hour position `index` (`0`–`11`). */
export function hourIndexToAngle(index: number): number {
  return normalizeAngle(index * DEGREES_PER_HOUR);
}

/** Nearest minute (snapped to `step`, wrapped to `0`–`59`) for an angle. */
export function angleToMinute(deg: number, step: number): number {
  const safeStep = step >= 1 ? step : 1;
  const raw = (normalizeAngle(deg) / FULL_TURN) * MINUTES_PER_TURN;
  return (Math.round(raw / safeStep) * safeStep) % MINUTES_PER_TURN;
}

/** Angle (degrees) of `minute` (`0`–`59`) on the minute dial. */
export function minuteToAngle(minute: number): number {
  return normalizeAngle((minute / MINUTES_PER_TURN) * FULL_TURN);
}

/** Cartesian point at `radius` along clock `angle` (degrees) from center `(cx, cy)`. */
export function polarToXy(
  angle: number,
  radius: number,
  cx: number,
  cy: number
): { x: number; y: number } {
  const rad = (normalizeAngle(angle) * Math.PI) / 180;
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) };
}
