import type { EventClick, EventDrop, EventResize } from './calendar-output.model';
import type { NgeCalendarConfig, NormalizedCalendarConfig } from './nge-calendar-config.model';
import type { NgeCalendarEvent, NormalizedCalendarEvent } from './nge-calendar-event.model';

import { normalizeEvent } from '../normalize/normalize-event';

// ARCH-146 — "phantom generic at the boundary". The optional `data?: T` payload
// is generic ONLY at the public boundary; everything internal keeps treating it
// as `unknown`. These compile-time assertions (checked by tsc during lint/test)
// pin the contract: a host's `T` surfaces, correctly typed, on every
// event-bearing output, and `T = unknown` keeps existing consumers compiling.

/** True iff `A` and `B` are mutually assignable (structurally equal). */
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/** Compile-time assert: the supplied type argument must resolve to `true`. */
type Expect<T extends true> = T;

/** A concrete domain payload used as the phantom `T` throughout the assertions. */
interface Foo {
  ref: string;
}

// ── `data` on the public + normalized event is `Foo | undefined` ──────────────
type _EventData = Expect<Equal<NgeCalendarEvent<Foo>['data'], Foo | undefined>>;
type _NormalizedEventData = Expect<Equal<NormalizedCalendarEvent<Foo>['data'], Foo | undefined>>;

// ── `T` flows through the config wrappers to the (normalized) events ──────────
type _ConfigEventData = Expect<
  Equal<NgeCalendarConfig<Foo>['events'][number]['data'], Foo | undefined>
>;
type _NormalizedConfigEventData = Expect<
  Equal<NormalizedCalendarConfig<Foo>['events'][number]['data'], Foo | undefined>
>;

// ── `T` surfaces typed on every event-bearing output ──────────────────────────
type _ClickData = Expect<Equal<EventClick<Foo>['event']['data'], Foo | undefined>>;
type _DropData = Expect<Equal<EventDrop<Foo>['event']['data'], Foo | undefined>>;
type _ResizeData = Expect<Equal<EventResize<Foo>['event']['data'], Foo | undefined>>;

// ── default `T = unknown` keeps the non-generic shapes backward-compatible ────
type _DefaultEventData = Expect<Equal<NgeCalendarEvent['data'], unknown>>;
type _DefaultClickData = Expect<Equal<EventClick['event']['data'], unknown>>;

// ── `normalizeEvent<Foo>(…)` is typed `NormalizedCalendarEvent<Foo> | null` ───
type _NormalizeReturn = Expect<
  Equal<ReturnType<typeof normalizeEvent<Foo>>, NormalizedCalendarEvent<Foo> | null>
>;

describe('NgeCalendar generic event payload (ARCH-146)', () => {
  it('round-trips the typed data payload through normalizeEvent', () => {
    const data: Foo = { ref: 'order-42' };
    const result = normalizeEvent<Foo>({
      data,
      id: 'evt-1',
      start: '2026-06-06T09:00:00.000Z',
      title: 'Standup',
    });

    expect(result).not.toBeNull();
    // The normalized `data` is statically `Foo | undefined`; read a domain field
    // off it to prove `T` flows through (would not compile if it were `unknown`).
    expect(result?.data?.ref).toBe('order-42');
    // Pure cargo — same reference, never copied or reshaped.
    expect(result?.data).toBe(data);
  });

  it('defaults data to undefined when omitted', () => {
    const result = normalizeEvent<Foo>({
      id: 'evt-2',
      start: '2026-06-06T09:00:00.000Z',
      title: 'No payload',
    });

    expect(result?.data).toBeUndefined();
  });
});
