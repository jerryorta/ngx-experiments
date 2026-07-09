import type { NormalizedCalendarConfig, NormalizedCalendarEvent } from '../models';

import { buildMonthViewModel } from './build-month-view-model';

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
    view: 'month',
    weekStartsOn: 0,
    ...overrides,
  };
}

describe('buildMonthViewModel', () => {
  it('produces a 6×7 grid with weekday labels', () => {
    const vm = buildMonthViewModel(config());
    expect(vm.weeks).toHaveLength(6);
    expect(vm.weeks.every(week => week.days.length === 7)).toBe(true);
    expect(vm.weekdayLabels).toHaveLength(7);
  });

  it('flags out-of-month, anchor and weekend cells', () => {
    const vm = buildMonthViewModel(config({ date: new Date('2026-06-15T00:00:00') }));
    const allCells = vm.weeks.flatMap(week => week.days);

    const anchor = allCells.find(cell => cell.isAnchor);
    expect(anchor?.dayOfMonth).toBe(15);
    expect(anchor?.isOutOfMonth).toBe(false);

    // June 2026: the grid's first row spills into May (out of month).
    expect(allCells.some(cell => cell.isOutOfMonth)).toBe(true);

    // Every weekend cell must be a Sat/Sun.
    for (const cell of allCells) {
      const dow = cell.date.getDay();
      expect(cell.isWeekend).toBe(dow === 0 || dow === 6);
    }
  });

  it('places single-day timed events as chips on the right cell, sorted by start', () => {
    const early = event({ id: 'early', start: new Date('2026-06-10T08:00:00') });
    const late = event({ id: 'late', start: new Date('2026-06-10T15:00:00') });
    // Provided late-first to prove sorting.
    const vm = buildMonthViewModel(config({ events: [late, early] }));

    const cell = vm.weeks
      .flatMap(week => week.days)
      .find(c => c.dayOfMonth === 10 && !c.isOutOfMonth);
    expect(cell?.chips.map(c => c.id)).toEqual(['early', 'late']);
  });

  it('renders a multi-day timed event as a spanning bar with span and edge flags', () => {
    // 2026-06-09 (Tue) → 2026-06-11 (Thu), within one Sunday-start week row.
    const multi = event({
      end: new Date('2026-06-11T12:00:00'),
      id: 'multi',
      start: new Date('2026-06-09T09:00:00'),
    });
    const vm = buildMonthViewModel(config({ events: [multi] }));

    const rowWithBar = vm.weeks.find(week => week.bars.length > 0);
    expect(rowWithBar).toBeDefined();
    const bar = rowWithBar?.bars[0];
    expect(bar?.event.id).toBe('multi');
    expect(bar?.span).toBe(3);
    expect(bar?.isStart).toBe(true);
    expect(bar?.isEnd).toBe(true);

    // The multi-day event must NOT also appear as chips.
    const chipsWithMulti = vm.weeks
      .flatMap(week => week.days)
      .some(cell => cell.chips.some(c => c.id === 'multi'));
    expect(chipsWithMulti).toBe(false);
  });

  it('renders an all-day event (even single-day) as a bar, not a chip', () => {
    const allDay = event({
      allDay: true,
      end: null,
      id: 'ad',
      start: new Date('2026-06-10T00:00:00'),
    });
    const vm = buildMonthViewModel(config({ events: [allDay] }));

    const hasBar = vm.weeks.some(week => week.bars.some(bar => bar.event.id === 'ad'));
    expect(hasBar).toBe(true);
    const hasChip = vm.weeks
      .flatMap(week => week.days)
      .some(cell => cell.chips.some(c => c.id === 'ad'));
    expect(hasChip).toBe(false);
  });

  it('stacks overlapping bars onto separate rowIndex lanes', () => {
    const barA = event({
      end: new Date('2026-06-11T12:00:00'),
      id: 'A',
      start: new Date('2026-06-09T09:00:00'),
    });
    const barB = event({
      end: new Date('2026-06-12T12:00:00'),
      id: 'B',
      start: new Date('2026-06-10T09:00:00'),
    });
    const vm = buildMonthViewModel(config({ events: [barA, barB] }));
    const row = vm.weeks.find(week => week.bars.length === 2);
    expect(row).toBeDefined();
    const rowIndexes = row?.bars.map(bar => bar.rowIndex).sort((a, b) => a - b);
    expect(rowIndexes).toEqual([0, 1]);
  });

  it('applies the "+N more" overflow threshold (default 3)', () => {
    const events = Array.from({ length: 5 }, (_unused, i) =>
      event({ id: `e${i}`, start: new Date(`2026-06-10T0${i + 1}:00:00`) })
    );
    const vm = buildMonthViewModel(config({ events }));
    const cell = vm.weeks
      .flatMap(week => week.days)
      .find(c => c.dayOfMonth === 10 && !c.isOutOfMonth);
    expect(cell?.chips).toHaveLength(5);
    expect(cell?.visible).toHaveLength(3);
    expect(cell?.hiddenCount).toBe(2);
  });

  it('honours a custom maxEventsPerCell', () => {
    const events = Array.from({ length: 4 }, (_unused, i) =>
      event({ id: `e${i}`, start: new Date(`2026-06-10T0${i + 1}:00:00`) })
    );
    const vm = buildMonthViewModel(config({ events }), { maxEventsPerCell: 1 });
    const cell = vm.weeks
      .flatMap(week => week.days)
      .find(c => c.dayOfMonth === 10 && !c.isOutOfMonth);
    expect(cell?.visible).toHaveLength(1);
    expect(cell?.hiddenCount).toBe(3);
  });

  it('is deterministic for a fixed config (no reliance on now)', () => {
    const cfg = config({ events: [event({ id: 'x', start: new Date('2026-06-10T09:00:00') })] });
    const a = buildMonthViewModel(cfg);
    const b = buildMonthViewModel(cfg);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
