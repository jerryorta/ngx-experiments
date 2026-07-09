import type { NgeTimeStamp } from '@nge/date';

import type { NgeCalendarEvent } from '../models/nge-calendar-event.model';

import { normalizeEvent } from './normalize-event';

function baseEvent(overrides: Partial<NgeCalendarEvent> = {}): NgeCalendarEvent {
  return {
    id: 'evt-1',
    start: '2026-06-06T09:00:00.000Z',
    title: 'Standup',
    ...overrides,
  };
}

describe('normalizeEvent', () => {
  describe('valid events', () => {
    it('normalises an event with a string start', () => {
      const result = normalizeEvent(baseEvent());
      expect(result).not.toBeNull();
      expect(result?.id).toBe('evt-1');
      expect(result?.title).toBe('Standup');
      expect(result?.start).toBeInstanceOf(Date);
      expect(result?.start.toISOString()).toBe('2026-06-06T09:00:00.000Z');
      expect(result?.end).toBeNull();
      expect(result?.allDay).toBe(false);
    });

    it('accepts a Date start', () => {
      const start = new Date('2026-06-06T09:00:00.000Z');
      const result = normalizeEvent(baseEvent({ start }));
      expect(result?.start.getTime()).toBe(start.getTime());
    });

    it('accepts a number (epoch ms) start', () => {
      const millis = Date.UTC(2026, 5, 6, 9, 0, 0);
      const result = normalizeEvent(baseEvent({ start: millis }));
      expect(result?.start.getTime()).toBe(millis);
    });

    it('accepts an NgeTimeStamp start', () => {
      const ts: NgeTimeStamp = { nanoseconds: 0, seconds: 1_780_000_000 };
      const result = normalizeEvent(baseEvent({ start: ts }));
      expect(result?.start.getTime()).toBe(1_780_000_000 * 1000);
    });

    it('coerces a valid end after start', () => {
      const result = normalizeEvent(
        baseEvent({
          end: '2026-06-06T10:00:00.000Z',
          start: '2026-06-06T09:00:00.000Z',
        })
      );
      expect(result?.end?.toISOString()).toBe('2026-06-06T10:00:00.000Z');
    });
  });

  describe('dropped events (return null)', () => {
    it('returns null for a falsy event', () => {
      expect(normalizeEvent(undefined as never)).toBeNull();
      expect(normalizeEvent(null as never)).toBeNull();
    });

    it('returns null when id is missing', () => {
      expect(normalizeEvent(baseEvent({ id: undefined as never }))).toBeNull();
    });

    it('returns null when id is an empty string', () => {
      expect(normalizeEvent(baseEvent({ id: '' }))).toBeNull();
    });

    it('returns null when id is not a string', () => {
      expect(normalizeEvent(baseEvent({ id: 42 as never }))).toBeNull();
    });

    it('returns null when start is missing', () => {
      expect(normalizeEvent(baseEvent({ start: undefined as never }))).toBeNull();
    });

    it('returns null when start is invalid', () => {
      expect(normalizeEvent(baseEvent({ start: 'not-a-date' }))).toBeNull();
    });
  });

  describe('end handling', () => {
    it('sets end to null when end is before start', () => {
      const result = normalizeEvent(
        baseEvent({
          end: '2026-06-06T08:00:00.000Z',
          start: '2026-06-06T09:00:00.000Z',
        })
      );
      expect(result).not.toBeNull();
      expect(result?.end).toBeNull();
    });

    it('sets end to null when end is invalid', () => {
      const result = normalizeEvent(baseEvent({ end: 'garbage' }));
      expect(result?.end).toBeNull();
    });

    it('keeps an end equal to start', () => {
      const result = normalizeEvent(
        baseEvent({
          end: '2026-06-06T09:00:00.000Z',
          start: '2026-06-06T09:00:00.000Z',
        })
      );
      expect(result?.end?.toISOString()).toBe('2026-06-06T09:00:00.000Z');
    });
  });

  describe('field coercion / passthrough', () => {
    it('coerces allDay to a boolean', () => {
      expect(normalizeEvent(baseEvent({ allDay: true }))?.allDay).toBe(true);
      expect(normalizeEvent(baseEvent({ allDay: undefined }))?.allDay).toBe(false);
    });

    it('defaults title to an empty string when missing', () => {
      const result = normalizeEvent(baseEvent({ title: undefined as never }));
      expect(result?.title).toBe('');
    });

    it('passes color through', () => {
      expect(normalizeEvent(baseEvent({ color: '#ff0000' }))?.color).toBe('#ff0000');
    });

    it('passes editable through', () => {
      expect(normalizeEvent(baseEvent({ editable: true }))?.editable).toBe(true);
    });

    it('passes meta through', () => {
      const meta = { priority: 'high' };
      expect(normalizeEvent(baseEvent({ meta }))?.meta).toBe(meta);
    });

    it('passes the typed data payload through and round-trips it', () => {
      interface Foo {
        ref: string;
      }
      const data: Foo = { ref: 'order-42' };
      const result = normalizeEvent<Foo>({ ...baseEvent(), data });
      // Same reference round-trips (pure cargo — never copied or reshaped).
      expect(result?.data).toBe(data);
      expect(result?.data).toEqual({ ref: 'order-42' });
    });

    it('leaves data undefined when omitted', () => {
      expect(normalizeEvent(baseEvent())?.data).toBeUndefined();
    });
  });

  it('never throws for malformed input', () => {
    expect(() => normalizeEvent({} as never)).not.toThrow();
    expect(() => normalizeEvent({ id: 'x', start: {} } as never)).not.toThrow();
  });
});
