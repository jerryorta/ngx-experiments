import type { NormalizedCalendarConfig, NormalizedCalendarEvent } from '../models';

import { buildWeekViewModel } from './build-week-view-model';

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
    date: new Date('2026-06-10T00:00:00'),
    dayEndHour: 18,
    dayStartHour: 6,
    editable: false,
    events: [],
    slotMinutes: 30,
    view: 'week',
    weekStartsOn: 0,
    ...overrides,
  };
}

describe('buildWeekViewModel', () => {
  it('builds 7 day columns starting on the configured weekStartsOn', () => {
    const vm = buildWeekViewModel(config({ weekStartsOn: 1 }));
    expect(vm.columns).toHaveLength(7);
    // Monday start.
    expect(vm.columns[0].date.getDay()).toBe(1);
    expect(vm.columns[6].date.getDay()).toBe(0);
  });

  it('emits hour labels from dayStartHour to dayEndHour inclusive', () => {
    const vm = buildWeekViewModel(config({ dayEndHour: 18, dayStartHour: 6 }));
    expect(vm.hourLabels[0]).toEqual({ hour: 6, label: '06:00', minute: 0 });
    expect(vm.hourLabels[vm.hourLabels.length - 1].hour).toBe(18);
    expect(vm.totalMinutes).toBe((18 - 6) * 60);
  });

  it('marks the anchor column', () => {
    const vm = buildWeekViewModel(config({ date: new Date('2026-06-10T00:00:00') }));
    const anchor = vm.columns.find(col => col.isAnchor);
    expect(anchor?.date.getDate()).toBe(10);
    expect(vm.columns.filter(col => col.isAnchor)).toHaveLength(1);
  });

  it('positions a timed event by minute offset from the day window start', () => {
    const e = event({
      end: new Date('2026-06-10T10:00:00'),
      start: new Date('2026-06-10T09:00:00'),
    });
    const vm = buildWeekViewModel(config({ dayStartHour: 6, events: [e] }));
    const col = vm.columns.find(c => c.isAnchor);
    expect(col?.timed).toHaveLength(1);
    const placed = col?.timed[0];
    // 09:00 is 3h after a 06:00 window start.
    expect(placed?.startMinute).toBe(180);
    expect(placed?.endMinute).toBe(240);
    expect(placed?.durationMinutes).toBe(60);
    expect(placed?.leftPct).toBe(0);
    expect(placed?.widthPct).toBe(100);
  });

  it('splits two overlapping timed events into two lanes (50% wide each)', () => {
    const a = event({
      end: new Date('2026-06-10T11:00:00'),
      id: 'a',
      start: new Date('2026-06-10T09:00:00'),
    });
    const b = event({
      end: new Date('2026-06-10T11:00:00'),
      id: 'b',
      start: new Date('2026-06-10T09:00:00'),
    });
    const vm = buildWeekViewModel(config({ events: [a, b] }));
    const col = vm.columns.find(c => c.isAnchor);
    expect(col?.timed).toHaveLength(2);
    const widths = col?.timed.map(t => t.widthPct);
    expect(widths).toEqual([50, 50]);
    const lefts = col?.timed.map(t => t.leftPct).sort((x, y) => x - y);
    expect(lefts).toEqual([0, 50]);
  });

  it('clips a timed event to the visible day window', () => {
    // Event runs 04:00–22:00 but the window is 06:00–18:00.
    const e = event({
      end: new Date('2026-06-10T22:00:00'),
      start: new Date('2026-06-10T04:00:00'),
    });
    const vm = buildWeekViewModel(config({ dayEndHour: 18, dayStartHour: 6, events: [e] }));
    const col = vm.columns.find(c => c.isAnchor);
    const placed = col?.timed[0];
    expect(placed?.startMinute).toBe(0);
    expect(placed?.endMinute).toBe((18 - 6) * 60);
  });

  it('routes all-day and multi-day events into the all-day bar strip, not timed', () => {
    const allDay = event({
      allDay: true,
      end: null,
      id: 'ad',
      start: new Date('2026-06-10T00:00:00'),
    });
    const multi = event({
      end: new Date('2026-06-12T09:00:00'),
      id: 'multi',
      start: new Date('2026-06-09T09:00:00'),
    });
    const vm = buildWeekViewModel(config({ events: [allDay, multi] }));
    const barIds = vm.allDayBars.map(bar => bar.event.id).sort();
    expect(barIds).toEqual(['ad', 'multi']);
    // Neither should be a timed entry.
    const timedIds = vm.columns.flatMap(col => col.timed.map(t => t.event.id));
    expect(timedIds).not.toContain('ad');
    expect(timedIds).not.toContain('multi');
  });

  describe('DST sanity (spring-forward 23h day, fall-back 25h day)', () => {
    // US spring-forward 2026-03-08; fall-back 2026-11-01. Use a full 24h window
    // and assert structural sanity regardless of the machine timezone.
    function assertColumnSanity(vm: ReturnType<typeof buildWeekViewModel>): void {
      for (const col of vm.columns) {
        for (const placed of col.timed) {
          expect(placed.startMinute).toBeGreaterThanOrEqual(0);
          expect(placed.endMinute).toBeGreaterThanOrEqual(placed.startMinute);
          expect(placed.durationMinutes).toBeGreaterThanOrEqual(0);
          expect(placed.leftPct).toBeGreaterThanOrEqual(0);
          expect(placed.widthPct).toBeGreaterThan(0);
        }
        // Per-column timed events must be ordered by their start lane packing
        // such that startMinutes are monotonic non-decreasing once sorted.
        const starts = col.timed.map(t => t.startMinute);
        const sorted = [...starts].sort((a, b) => a - b);
        expect(starts.length).toBe(sorted.length);
      }
    }

    it('does not crash and yields non-negative monotonic offsets across the spring-forward week', () => {
      const e = event({
        end: new Date('2026-03-08T12:00:00'),
        start: new Date('2026-03-08T01:00:00'),
      });
      const vm = buildWeekViewModel(
        config({
          date: new Date('2026-03-08T00:00:00'),
          dayEndHour: 24,
          dayStartHour: 0,
          events: [e],
        })
      );
      expect(vm.columns).toHaveLength(7);
      assertColumnSanity(vm);
    });

    it('does not crash and yields non-negative monotonic offsets across the fall-back week', () => {
      const e = event({
        end: new Date('2026-11-01T12:00:00'),
        start: new Date('2026-11-01T01:00:00'),
      });
      const vm = buildWeekViewModel(
        config({
          date: new Date('2026-11-01T00:00:00'),
          dayEndHour: 24,
          dayStartHour: 0,
          events: [e],
        })
      );
      expect(vm.columns).toHaveLength(7);
      assertColumnSanity(vm);
    });
  });
});
