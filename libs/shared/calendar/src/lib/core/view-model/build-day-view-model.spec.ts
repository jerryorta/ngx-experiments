import type { NormalizedCalendarConfig, NormalizedCalendarEvent } from '../models';

import { buildDayViewModel } from './build-day-view-model';

function event(overrides: Partial<NormalizedCalendarEvent> = {}): NormalizedCalendarEvent {
  return {
    allDay: false,
    end: new Date('2026-06-10T10:00:00'),
    id: 'evt',
    start: new Date('2026-06-10T09:00:00'),
    title: 'Event',
    ...overrides,
  };
}

function config(overrides: Partial<NormalizedCalendarConfig> = {}): NormalizedCalendarConfig {
  return {
    date: new Date('2026-06-10T13:00:00'),
    dayEndHour: 18,
    dayStartHour: 6,
    editable: false,
    events: [],
    slotMinutes: 30,
    view: 'day',
    weekStartsOn: 0,
    ...overrides,
  };
}

describe('buildDayViewModel', () => {
  it('builds a single column for the config day', () => {
    const vm = buildDayViewModel(config({ date: new Date('2026-06-10T13:00:00') }));
    expect(vm.columns).toHaveLength(1);
    expect(vm.columns[0].date.getDate()).toBe(10);
    expect(vm.columns[0].isAnchor).toBe(true);
  });

  it('positions a timed event in the single column', () => {
    const e = event({
      end: new Date('2026-06-10T10:00:00'),
      start: new Date('2026-06-10T09:00:00'),
    });
    const vm = buildDayViewModel(config({ dayStartHour: 6, events: [e] }));
    expect(vm.columns[0].timed).toHaveLength(1);
    expect(vm.columns[0].timed[0].startMinute).toBe(180);
    expect(vm.columns[0].timed[0].durationMinutes).toBe(60);
  });

  it('excludes events on other days from the column', () => {
    const e = event({
      end: new Date('2026-06-11T10:00:00'),
      start: new Date('2026-06-11T09:00:00'),
    });
    const vm = buildDayViewModel(config({ events: [e] }));
    expect(vm.columns[0].timed).toEqual([]);
  });

  it('puts an all-day event into the all-day bar strip', () => {
    const e = event({ allDay: true, end: null, id: 'ad', start: new Date('2026-06-10T00:00:00') });
    const vm = buildDayViewModel(config({ events: [e] }));
    expect(vm.allDayBars.map(b => b.event.id)).toEqual(['ad']);
    expect(vm.columns[0].timed).toEqual([]);
  });

  it('exposes hour labels and totalMinutes', () => {
    const vm = buildDayViewModel(config({ dayEndHour: 18, dayStartHour: 6 }));
    expect(vm.hourLabels[0].hour).toBe(6);
    expect(vm.totalMinutes).toBe((18 - 6) * 60);
  });
});
