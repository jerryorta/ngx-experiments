import type { NormalizedCalendarConfig, NormalizedCalendarEvent } from '../models';

import { buildYearViewModel } from './build-year-view-model';

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
    slotMinutes: 30,
    view: 'year',
    weekStartsOn: 0,
    ...overrides,
  };
}

describe('buildYearViewModel', () => {
  it('builds 12 mini-months for the config year', () => {
    const vm = buildYearViewModel(config({ date: new Date('2026-06-15T00:00:00') }));
    expect(vm.year).toBe(2026);
    expect(vm.months).toHaveLength(12);
    expect(vm.months.map(m => m.monthIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('gives each mini-month a 6×7 grid and weekday labels', () => {
    const vm = buildYearViewModel(config());
    for (const month of vm.months) {
      expect(month.weeks).toHaveLength(6);
      expect(month.weeks.every(row => row.length === 7)).toBe(true);
      expect(month.weekdayLabels).toHaveLength(7);
    }
  });

  it('flags out-of-month and anchor days per mini-month', () => {
    const vm = buildYearViewModel(config({ date: new Date('2026-06-15T00:00:00') }));
    const june = vm.months[5];
    const anchor = june.weeks.flat().find(day => day.isAnchor);
    expect(anchor?.dayOfMonth).toBe(15);
    expect(anchor?.isOutOfMonth).toBe(false);
    // Some June grid cells spill into May/July.
    expect(june.weeks.flat().some(day => day.isOutOfMonth)).toBe(true);
  });

  it('counts events per day and derives a density level', () => {
    // Day with 1 event → density 1; day with 3 → density 2; day with 5 → density 3.
    const events: NormalizedCalendarEvent[] = [
      event({ id: 'd1-a', start: new Date('2026-06-01T09:00:00') }),
      event({ id: 'd2-a', start: new Date('2026-06-02T08:00:00') }),
      event({ id: 'd2-b', start: new Date('2026-06-02T09:00:00') }),
      event({ id: 'd2-c', start: new Date('2026-06-02T10:00:00') }),
      ...Array.from({ length: 5 }, (_unused, i) =>
        event({ id: `d3-${i}`, start: new Date(`2026-06-03T0${i + 1}:00:00`) })
      ),
    ];
    const vm = buildYearViewModel(config({ events }));
    const june = vm.months[5];
    const cells = june.weeks.flat();

    const day1 = cells.find(c => c.dayOfMonth === 1 && !c.isOutOfMonth);
    const day2 = cells.find(c => c.dayOfMonth === 2 && !c.isOutOfMonth);
    const day3 = cells.find(c => c.dayOfMonth === 3 && !c.isOutOfMonth);

    expect(day1?.eventCount).toBe(1);
    expect(day1?.densityLevel).toBe(1);
    expect(day2?.eventCount).toBe(3);
    expect(day2?.densityLevel).toBe(2);
    expect(day3?.eventCount).toBe(5);
    expect(day3?.densityLevel).toBe(3);
  });

  it('reports density 0 for days with no events', () => {
    const vm = buildYearViewModel(config());
    const allZero = vm.months
      .flatMap(m => m.weeks.flat())
      .every(day => day.eventCount === 0 && day.densityLevel === 0);
    expect(allZero).toBe(true);
  });

  it('is deterministic for a fixed config', () => {
    const cfg = config({ events: [event({ id: 'x', start: new Date('2026-06-10T09:00:00') })] });
    expect(JSON.stringify(buildYearViewModel(cfg))).toBe(JSON.stringify(buildYearViewModel(cfg)));
  });
});
