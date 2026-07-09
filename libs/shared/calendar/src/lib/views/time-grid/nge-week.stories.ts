import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { NgeCalendarConfig } from '../../core/models/nge-calendar-config.model';

import { NgeCalendarComponent } from '../../nge-calendar/nge-calendar.component';

// All stories render through the `<nge-calendar [config]>` shell — the shell
// provides AND seeds the component-scoped store the time-grid injects, so the
// store-as-boundary rule holds (no provide+seed is re-implemented out here).

const ANCHOR = new Date(2026, 5, 15); // Mon Jun 15 2026 (week of Sun 14 … Sat 20)

/** Build a Date on the anchor's week, `dayOffset` days from Sunday, at `h:m`. */
function weekDayAt(dayOffset: number, hour: number, minute = 0): Date {
  // Jun 14 2026 is the Sunday that opens the anchor week.
  return new Date(2026, 5, 14 + dayOffset, hour, minute);
}

/** A typical week: timed events spread across days plus one all-day Friday. */
const USAGE_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  dayEndHour: 21,
  dayStartHour: 7,
  events: [
    { end: weekDayAt(1, 10, 0), id: 'sync', start: weekDayAt(1, 9, 0), title: 'Morning sync' },
    { end: weekDayAt(2, 15, 0), id: '1on1', start: weekDayAt(2, 14, 0), title: '1:1' },
    {
      end: weekDayAt(3, 12, 30),
      id: 'workshop',
      start: weekDayAt(3, 11, 0),
      title: 'Workshop',
    },
    { end: weekDayAt(4, 17, 0), id: 'retro', start: weekDayAt(4, 16, 0), title: 'Sprint retro' },
    { allDay: true, id: 'holiday', start: weekDayAt(5, 0, 0), title: 'Company holiday' },
  ],
  view: 'week',
  weekStartsOn: 0,
};

/** Three overlapping events on one day → the lane packer spreads them side-by-side. */
const OVERLAP_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  dayEndHour: 18,
  dayStartHour: 8,
  events: [
    { end: weekDayAt(1, 10, 30), id: 'a', start: weekDayAt(1, 9, 0), title: 'Interview A' },
    { end: weekDayAt(1, 11, 0), id: 'b', start: weekDayAt(1, 9, 30), title: 'Interview B' },
    { end: weekDayAt(1, 11, 30), id: 'c', start: weekDayAt(1, 10, 0), title: 'Interview C' },
  ],
  view: 'week',
  weekStartsOn: 0,
};

/** All-day + multi-day bars in the pinned strip, separated from the timed blocks below. */
const ALL_DAY_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  dayEndHour: 20,
  dayStartHour: 7,
  events: [
    // Multi-day bar spanning Mon → Thu in the all-day strip.
    {
      allDay: true,
      end: weekDayAt(4, 0, 0),
      id: 'conf',
      start: weekDayAt(1, 0, 0),
      title: 'Conference',
    },
    // Single all-day Wednesday.
    { allDay: true, id: 'ooo', start: weekDayAt(3, 0, 0), title: 'Out of office' },
    // Timed events on the same days drop into the scrolling body below the strip.
    { end: weekDayAt(1, 10, 0), id: 'kickoff', start: weekDayAt(1, 9, 0), title: 'Kickoff' },
    { end: weekDayAt(3, 15, 0), id: 'demo', start: weekDayAt(3, 14, 0), title: 'Demo' },
  ],
  view: 'week',
  weekStartsOn: 0,
};

/**
 * Anchored on the REAL today so the live now-line renders in today's column at the
 * current minute offset (the other stories anchor on a fixed past week, so they
 * intentionally show no now-line).
 */
function nowConfig(): NgeCalendarConfig {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const at = (hour: number, minute = 0): Date => {
    const d = new Date(today);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  return {
    date: today,
    dayEndHour: 21,
    dayStartHour: 7,
    events: [
      { end: at(10, 0), id: 'standup', start: at(9, 0), title: 'Standup' },
      { end: at(15, 0), id: 'review', start: at(14, 0), title: 'Review' },
    ],
    view: 'week',
    weekStartsOn: 0,
  };
}

// Module-scoped output spies for the `KeyboardAndSlot` story so its `render` (which
// binds the shell outputs) and `play` (which asserts them) share the same instances.
const slotClickSpy = fn();
const eventClickSpy = fn();

const meta: Meta<NgeCalendarComponent> = {
  args: { config: USAGE_CONFIG },
  component: NgeCalendarComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Calendar/NgeCalendar/Views/Week',
};

export default meta;
type Story = StoryObj<NgeCalendarComponent>;

/** A typical week of timed events plus an all-day Friday, rendered through the shell. */
export const Usage: Story = {
  args: { config: USAGE_CONFIG },
};

/** Overlapping events on one day, packed side-by-side into lanes with no collision. */
export const Overlap: Story = {
  args: { config: OVERLAP_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const blocks = await canvas.findAllByTestId('nge-time-grid-event');
    // All three overlapping events render as distinct side-by-side blocks.
    await expect(blocks.length).toBeGreaterThanOrEqual(3);
  },
};

/** All-day and multi-day bars in the pinned strip, separated from the timed grid. */
export const AllDay: Story = {
  args: { config: ALL_DAY_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bars = await canvas.findAllByTestId('nge-time-grid-allday-bar');
    await expect(bars.length).toBeGreaterThanOrEqual(2);
  },
};

/** Same week starting on Monday — the first column is Monday. */
export const WeekStartsOnMonday: Story = {
  args: { config: { ...USAGE_CONFIG, weekStartsOn: 1 } },
};

/** The live current-time indicator in today's column (anchored on the real today). */
export const NowIndicator: Story = {
  args: { config: nowConfig() },
};

/**
 * The shell wrapped in a host that overrides `--nge-calendar-*` tokens — proves the
 * time-grid themes purely through the calendar's own CSS-variable namespace (literal
 * default → consumer override), including the `--nge-calendar-now-indicator` line.
 */
export const Themed: Story = {
  args: { config: USAGE_CONFIG },
  render: args => ({
    props: args,
    template: `
      <div style="
        --nge-calendar-accent: #7c3aed;
        --nge-calendar-event-bg: #7c3aed;
        --nge-calendar-event-fg: #ffffff;
        --nge-calendar-surface: #faf5ff;
        --nge-calendar-surface-container: #f3e8ff;
        --nge-calendar-on-surface: #2e1065;
        --nge-calendar-outline-variant: #d8b4fe;
        --nge-calendar-today: #ede9fe;
        --nge-calendar-now-indicator: #db2777;
      ">
        <nge-calendar [config]="config"></nge-calendar>
      </div>
    `,
  }),
};

/**
 * S10 keyboard navigation + slot click + roving focus (time grid). Through the
 * shell, `slotClick` and `eventClick` are wired to `fn()` spies so the `play()` can
 * prove the two activation paths end-to-end:
 *
 *  - keyboard: focus the anchor day column (the lone tabindex=0), ArrowDown to step
 *    the focused TIME by one slot, Enter → the shell relays `slotClick` for that slot
 *    (start … start + slotMinutes);
 *  - pointer: click a timed event block → the shell relays `eventClick`.
 *
 * Drive it by hand in the live Storybook to watch the roving focus ring move between
 * day columns with ←/→ and the focused-slot band step within a column with ↑/↓.
 */
export const KeyboardAndSlot: Story = {
  args: { config: USAGE_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Fresh start on each (re)play so prior runs don't leak call history.
    slotClickSpy.mockClear();
    eventClickSpy.mockClear();

    // ── keyboard: ArrowDown + Enter on the focused column → slotClick ───────────
    const cols = await canvas.findAllByTestId('nge-time-grid-column');
    // The lone tabindex=0 column is the anchor (roving-focus default).
    const anchorCol = cols.find(c => c.getAttribute('tabindex') === '0') ?? cols[0];
    anchorCol.focus();
    // Native keydown dispatch — the column handler listens for `keydown` and reads
    // the roving-focus target (day + minute-of-day) from the store.
    anchorCol.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' })
    );
    anchorCol.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' })
    );
    await waitFor(() => expect(slotClickSpy).toHaveBeenCalled());

    // ── pointer: click a timed event block → eventClick ────────────────────────
    const block = (await canvas.findAllByTestId('nge-time-grid-event'))[0];
    await userEvent.click(block);
    await waitFor(() => expect(eventClickSpy).toHaveBeenCalled());
  },
  render: args => ({
    props: {
      ...args,
      onEventClick: eventClickSpy,
      onSlotClick: slotClickSpy,
    },
    template: `
      <nge-calendar
        [config]="config"
        (slotClick)="onSlotClick($event)"
        (eventClick)="onEventClick($event)"
      ></nge-calendar>
    `,
  }),
};
