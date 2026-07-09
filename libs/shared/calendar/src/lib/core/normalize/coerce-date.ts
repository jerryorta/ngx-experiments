import type { NgeTimeStamp } from '@nge/date';

import type { CalendarDateInput } from '../models/calendar-date-input.model';

/** A `Date` is valid iff its time value is not `NaN`. */
function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

/** Return `date` if valid, otherwise `null`. */
function validate(date: Date): Date | null {
  return isValidDate(date) ? date : null;
}

/**
 * Type guard for the Firebase/Firestore timestamp shape
 * (`{ seconds, nanoseconds }`). Mirrors the guard in `@nge/date`'s
 * `date.pipe.ts`: a non-null object with a numeric `seconds` field. (`seconds`
 * may legitimately be `null`, but those are treated as "no date" by the
 * caller, so we only accept a numeric `seconds` here.)
 */
function isFirebaseTimestamp(value: object): value is NgeTimeStamp {
  return 'seconds' in value && typeof (value as NgeTimeStamp).seconds === 'number';
}

/**
 * Coerce any {@link CalendarDateInput} (plus `null` / `undefined`) into a valid
 * `Date`, or `null` when the input is missing or cannot represent a real date.
 *
 * Pure and total — it NEVER throws. Invalid inputs (NaN/Infinity numbers,
 * unparseable strings, malformed objects, booleans, arrays, …) all yield
 * `null`. `Date` inputs are cloned, so the returned value never aliases the
 * caller's instance.
 *
 * - `null` / `undefined` → `null`
 * - `Date` → cloned (or `null` if it is an Invalid Date)
 * - `number` → epoch milliseconds (`0` and negatives valid; non-finite → `null`)
 * - `string` → trimmed ISO 8601; `''` → `null`; unparseable → `null`
 * - `NgeTimeStamp` → `seconds * 1000 + nanoseconds / 1e6`; `seconds` not a
 *   number → `null`
 */
export function coerceToDate(input: CalendarDateInput | null | undefined): Date | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (input instanceof Date) {
    return validate(new Date(input.getTime()));
  }

  if (typeof input === 'number') {
    return Number.isFinite(input) ? validate(new Date(input)) : null;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') {
      return null;
    }
    return validate(new Date(trimmed));
  }

  if (typeof input === 'object' && isFirebaseTimestamp(input)) {
    const seconds = input.seconds;
    if (typeof seconds !== 'number') {
      return null;
    }
    const millis = seconds * 1000 + (input.nanoseconds ?? 0) / 1e6;
    return validate(new Date(millis));
  }

  return null;
}
