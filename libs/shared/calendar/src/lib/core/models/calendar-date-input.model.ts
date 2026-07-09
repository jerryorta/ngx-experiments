import type { NgeTimeStamp } from '@nge/date';

/**
 * Anything the calendar will accept as a date-like value on a public input.
 *
 * Normalised to a real `Date` by `coerceToDate`:
 * - `Date` — used directly (cloned)
 * - `NgeTimeStamp` — Firebase/Firestore `{ seconds, nanoseconds }` shape
 * - `number` — epoch milliseconds (`0` and negative are valid)
 * - `string` — ISO 8601 (date-only or date-time)
 */
export type CalendarDateInput = Date | NgeTimeStamp | number | string;
