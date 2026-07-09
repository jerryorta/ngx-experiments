import type { NormalizedCalendarEvent } from '../models';

import {
  clipToDayWindow,
  daySegmentsInRange,
  eventsForDay,
  minutesFromDayStart,
  splitAllDayVsTimed,
} from './event-placement';

function event(overrides: Partial<NormalizedCalendarEvent> = {}): NormalizedCalendarEvent {
  return {
    allDay: false,
    end: new Date('2026-06-06T10:00:00'),
    id: 'evt',
    start: new Date('2026-06-06T09:00:00'),
    title: 'Event',
    ...overrides,
  };
}

describe('splitAllDayVsTimed', () => {
  it('splits events by the allDay flag (strict true)', () => {
    const a = event({ allDay: true, id: 'a' });
    const b = event({ allDay: false, id: 'b' });
    const result = splitAllDayVsTimed([a, b]);
    expect(result.allDay.map(e => e.id)).toEqual(['a']);
    expect(result.timed.map(e => e.id)).toEqual(['b']);
  });

  it('returns empty buckets for no events', () => {
    expect(splitAllDayVsTimed([])).toEqual({ allDay: [], timed: [] });
  });
});

describe('eventsForDay', () => {
  const day = new Date('2026-06-10T12:00:00');

  it('matches a single-day event on its day', () => {
    const e = event({
      end: new Date('2026-06-10T11:00:00'),
      start: new Date('2026-06-10T10:00:00'),
    });
    expect(eventsForDay([e], day).map(x => x.id)).toEqual(['evt']);
  });

  it('excludes an event on a different day', () => {
    const e = event({
      end: new Date('2026-06-09T11:00:00'),
      start: new Date('2026-06-09T10:00:00'),
    });
    expect(eventsForDay([e], day)).toEqual([]);
  });

  it('matches a multi-day event on every day it spans', () => {
    const e = event({
      end: new Date('2026-06-12T08:00:00'),
      start: new Date('2026-06-08T20:00:00'),
    });
    expect(eventsForDay([e], new Date('2026-06-08T00:00:00')).map(x => x.id)).toEqual(['evt']);
    expect(eventsForDay([e], new Date('2026-06-10T00:00:00')).map(x => x.id)).toEqual(['evt']);
    expect(eventsForDay([e], new Date('2026-06-12T00:00:00')).map(x => x.id)).toEqual(['evt']);
    expect(eventsForDay([e], new Date('2026-06-13T00:00:00'))).toEqual([]);
  });

  it('treats a null-end event as a point at its start', () => {
    const e = event({ end: null, start: new Date('2026-06-10T10:00:00') });
    expect(eventsForDay([e], day).map(x => x.id)).toEqual(['evt']);
    expect(eventsForDay([e], new Date('2026-06-11T10:00:00'))).toEqual([]);
  });
});

describe('clipToDayWindow', () => {
  const dayStart = new Date('2026-06-06T08:00:00');
  const dayEnd = new Date('2026-06-06T18:00:00');

  it('returns the event unchanged when fully inside the window', () => {
    const result = clipToDayWindow(
      new Date('2026-06-06T09:00:00'),
      new Date('2026-06-06T10:00:00'),
      dayStart,
      dayEnd
    );
    expect(result?.start.toISOString()).toBe(new Date('2026-06-06T09:00:00').toISOString());
    expect(result?.end.toISOString()).toBe(new Date('2026-06-06T10:00:00').toISOString());
  });

  it('clips an event that starts before and ends after the window', () => {
    const result = clipToDayWindow(
      new Date('2026-06-06T06:00:00'),
      new Date('2026-06-06T20:00:00'),
      dayStart,
      dayEnd
    );
    expect(result?.start.getTime()).toBe(dayStart.getTime());
    expect(result?.end.getTime()).toBe(dayEnd.getTime());
  });

  it('clips an event that overruns only one edge', () => {
    const result = clipToDayWindow(
      new Date('2026-06-06T17:00:00'),
      new Date('2026-06-06T22:00:00'),
      dayStart,
      dayEnd
    );
    expect(result?.start.toISOString()).toBe(new Date('2026-06-06T17:00:00').toISOString());
    expect(result?.end.getTime()).toBe(dayEnd.getTime());
  });

  it('returns null when the event is entirely outside the window', () => {
    expect(
      clipToDayWindow(
        new Date('2026-06-06T19:00:00'),
        new Date('2026-06-06T20:00:00'),
        dayStart,
        dayEnd
      )
    ).toBeNull();
  });

  it('returns null when the event touches the edge with zero overlap', () => {
    expect(
      clipToDayWindow(
        new Date('2026-06-06T18:00:00'),
        new Date('2026-06-06T20:00:00'),
        dayStart,
        dayEnd
      )
    ).toBeNull();
  });
});

describe('daySegmentsInRange', () => {
  // A Sunday-start week: 2026-06-07 (Sun) .. 2026-06-13 (Sat).
  const rangeStart = new Date('2026-06-07T00:00:00');
  const rangeEnd = new Date('2026-06-13T00:00:00');

  it('reports a fully-inside event with both edges flagged', () => {
    const e = event({
      end: new Date('2026-06-10T15:00:00'),
      start: new Date('2026-06-09T09:00:00'),
    });
    expect(daySegmentsInRange(e, rangeStart, rangeEnd)).toEqual({
      endCol: 3,
      isEnd: true,
      isStart: true,
      startCol: 2,
    });
  });

  it('clamps an event starting before the row (startCol 0, isStart false)', () => {
    const e = event({
      end: new Date('2026-06-09T15:00:00'),
      start: new Date('2026-06-04T09:00:00'),
    });
    const segment = daySegmentsInRange(e, rangeStart, rangeEnd);
    expect(segment.startCol).toBe(0);
    expect(segment.isStart).toBe(false);
    expect(segment.endCol).toBe(2);
    expect(segment.isEnd).toBe(true);
  });

  it('clamps an event ending after the row (endCol 6, isEnd false)', () => {
    const e = event({
      end: new Date('2026-06-20T15:00:00'),
      start: new Date('2026-06-11T09:00:00'),
    });
    const segment = daySegmentsInRange(e, rangeStart, rangeEnd);
    expect(segment.startCol).toBe(4);
    expect(segment.isStart).toBe(true);
    expect(segment.endCol).toBe(6);
    expect(segment.isEnd).toBe(false);
  });

  it('handles a null-end event as a single-column point', () => {
    const e = event({ end: null, start: new Date('2026-06-09T09:00:00') });
    expect(daySegmentsInRange(e, rangeStart, rangeEnd)).toEqual({
      endCol: 2,
      isEnd: true,
      isStart: true,
      startCol: 2,
    });
  });
});

describe('minutesFromDayStart', () => {
  it('returns whole minutes from the day window start', () => {
    expect(
      minutesFromDayStart(new Date('2026-06-06T10:30:00'), new Date('2026-06-06T08:00:00'))
    ).toBe(150);
  });

  it('returns 0 at the window start', () => {
    const start = new Date('2026-06-06T08:00:00');
    expect(minutesFromDayStart(start, start)).toBe(0);
  });
});
