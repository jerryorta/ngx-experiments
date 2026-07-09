import type { NormalizedCalendarConfig, NormalizedCalendarEvent } from '../models';

import { buildMonthAgendaViewModel } from './build-month-agenda-view-model';

function event(overrides: Partial<NormalizedCalendarEvent> = {}): NormalizedCalendarEvent {
  return {
    allDay: false,
    end: null,
    id: 'evt',
    start: new Date('2026-06-10T09:00:00'),
    title: 'Event',
    ...overrides,
  };
}

function config(overrides: Partial<NormalizedCalendarConfig> = {}): NormalizedCalendarConfig {
  return {
    date: new Date('2026-06-15T00:00:00'),
    dayEndHour: 18,
    dayStartHour: 6,
    editable: false,
    events: [],
    monthLayout: 'agenda',
    slotMinutes: 30,
    view: 'month',
    weekStartsOn: 0,
    ...overrides,
  };
}

describe('buildMonthAgendaViewModel', () => {
  it('returns an empty day list for no events', () => {
    expect(buildMonthAgendaViewModel(config()).days).toEqual([]);
  });

  it('groups events that start on the same day into one group', () => {
    const vm = buildMonthAgendaViewModel(
      config({
        events: [
          event({ id: 'a', start: new Date('2026-06-10T09:00:00') }),
          event({ id: 'b', start: new Date('2026-06-10T15:00:00') }),
        ],
      })
    );
    expect(vm.days).toHaveLength(1);
    expect(vm.days[0].date.getDate()).toBe(10);
    expect(vm.days[0].events.map(e => e.id)).toEqual(['a', 'b']);
  });

  it('emits only days that have at least one event (omits empty days)', () => {
    const vm = buildMonthAgendaViewModel(
      config({
        events: [
          event({ id: 'd5', start: new Date('2026-06-05T09:00:00') }),
          event({ id: 'd20', start: new Date('2026-06-20T09:00:00') }),
        ],
      })
    );
    expect(vm.days.map(d => d.date.getDate())).toEqual([5, 20]);
  });

  it('orders day groups chronologically regardless of input order', () => {
    const vm = buildMonthAgendaViewModel(
      config({
        events: [
          event({ id: 'late', start: new Date('2026-06-25T09:00:00') }),
          event({ id: 'early', start: new Date('2026-06-02T09:00:00') }),
          event({ id: 'mid', start: new Date('2026-06-12T09:00:00') }),
        ],
      })
    );
    expect(vm.days.map(d => d.date.getDate())).toEqual([2, 12, 25]);
  });

  it('orders events within a group all-day first, then by start ascending', () => {
    const vm = buildMonthAgendaViewModel(
      config({
        events: [
          event({ id: 'timed-late', start: new Date('2026-06-10T15:00:00') }),
          event({ id: 'timed-early', start: new Date('2026-06-10T08:00:00') }),
          event({ allDay: true, id: 'all-day', start: new Date('2026-06-10T00:00:00') }),
        ],
      })
    );
    expect(vm.days).toHaveLength(1);
    expect(vm.days[0].events.map(e => e.id)).toEqual(['all-day', 'timed-early', 'timed-late']);
  });

  it('uses end time then id as a stable tie-break when starts are equal', () => {
    const vm = buildMonthAgendaViewModel(
      config({
        events: [
          event({
            end: new Date('2026-06-10T11:00:00'),
            id: 'z-long',
            start: new Date('2026-06-10T09:00:00'),
          }),
          event({
            end: new Date('2026-06-10T10:00:00'),
            id: 'a-short',
            start: new Date('2026-06-10T09:00:00'),
          }),
          event({
            end: new Date('2026-06-10T10:00:00'),
            id: 'm-short',
            start: new Date('2026-06-10T09:00:00'),
          }),
        ],
      })
    );
    // Same start → earlier end first (a-short/m-short before z-long); equal
    // start+end → id.localeCompare ('a-short' < 'm-short').
    expect(vm.days[0].events.map(e => e.id)).toEqual(['a-short', 'm-short', 'z-long']);
  });

  it('excludes events that start outside the visible month', () => {
    const vm = buildMonthAgendaViewModel(
      config({
        date: new Date('2026-06-15T00:00:00'),
        events: [
          event({ id: 'prev-month', start: new Date('2026-05-31T23:00:00') }),
          event({ id: 'in-month', start: new Date('2026-06-10T09:00:00') }),
          event({ id: 'next-month', start: new Date('2026-07-01T01:00:00') }),
        ],
      })
    );
    expect(vm.days).toHaveLength(1);
    expect(vm.days[0].events.map(e => e.id)).toEqual(['in-month']);
  });

  it('includes events on the first and last day of the month', () => {
    const vm = buildMonthAgendaViewModel(
      config({
        date: new Date('2026-06-15T00:00:00'),
        events: [
          event({ id: 'first', start: new Date('2026-06-01T00:30:00') }),
          event({ id: 'last', start: new Date('2026-06-30T23:30:00') }),
        ],
      })
    );
    expect(vm.days.map(d => d.date.getDate())).toEqual([1, 30]);
  });

  it('is deterministic for a fixed config (no reliance on now)', () => {
    const cfg = config({
      events: [
        event({ id: 'x', start: new Date('2026-06-10T09:00:00') }),
        event({ id: 'y', start: new Date('2026-06-12T09:00:00') }),
      ],
    });
    const a = buildMonthAgendaViewModel(cfg);
    const b = buildMonthAgendaViewModel(cfg);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
