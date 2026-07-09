import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { EventDrop, EventResize } from '../../core/models/calendar-output.model';
import type { NgeCalendarConfig } from '../../core/models/nge-calendar-config.model';

import { NgeCalendarComponent } from '../../nge-calendar/nge-calendar.component';

// All stories render through the `<nge-calendar [config]>` shell — the shell
// provides AND seeds the component-scoped store the time-grid injects.

const ANCHOR = new Date(2026, 5, 15); // Mon Jun 15 2026

/** Build a Date on the anchor day at `h:m`. */
function dayAt(hour: number, minute = 0): Date {
  return new Date(2026, 5, 15, hour, minute);
}

/** A typical day: a handful of timed events plus one all-day banner. */
const USAGE_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  dayEndHour: 19,
  dayStartHour: 7,
  events: [
    { allDay: true, id: 'focus', start: ANCHOR, title: 'Focus day' },
    { end: dayAt(9, 30), id: 'standup', start: dayAt(9, 0), title: 'Standup' },
    { end: dayAt(11, 30), id: 'design', start: dayAt(10, 0), title: 'Design review' },
    { end: dayAt(13, 0), id: 'lunch', start: dayAt(12, 0), title: 'Lunch' },
    { end: dayAt(16, 0), id: 'pairing', start: dayAt(14, 30), title: 'Pairing session' },
  ],
  view: 'day',
};

/** Four overlapping events → the lane packer spreads them across the single column. */
const OVERLAP_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  dayEndHour: 18,
  dayStartHour: 8,
  events: [
    { end: dayAt(11, 0), id: 'a', start: dayAt(9, 0), title: 'Workshop A' },
    { end: dayAt(10, 30), id: 'b', start: dayAt(9, 30), title: 'Workshop B' },
    { end: dayAt(11, 30), id: 'c', start: dayAt(10, 0), title: 'Workshop C' },
    { end: dayAt(12, 0), id: 'd', start: dayAt(10, 30), title: 'Workshop D' },
  ],
  view: 'day',
};

/** All-day banners separated from the timed blocks below them. */
const ALL_DAY_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  dayEndHour: 19,
  dayStartHour: 7,
  events: [
    { allDay: true, id: 'holiday', start: ANCHOR, title: 'Public holiday' },
    { allDay: true, id: 'oncall', start: ANCHOR, title: 'On-call' },
    { end: dayAt(10, 0), id: 'sync', start: dayAt(9, 0), title: 'Sync' },
  ],
  view: 'day',
};

/**
 * Anchored on the REAL today so the live now-line renders at the current minute
 * offset (the other stories anchor on a fixed past day, so they show no now-line).
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
      { end: at(15, 30), id: 'review', start: at(14, 0), title: 'Review' },
    ],
    view: 'day',
  };
}

/**
 * `editable: true` with a handful of timed events on the anchor day — every block is
 * a free-drag `cdkDrag` (move) AND carries a bottom-edge resize handle, except the
 * one event that opts out (`editable: false`), which is neither draggable nor
 * resizable. Drop a block on a new time → `eventDrop`; drag its bottom edge →
 * `eventResize`; the stories below wire both back so the change re-renders. (Day is
 * the SAME time-grid component as week, with `view: 'day'`.)
 */
const DRAGGABLE_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  dayEndHour: 19,
  dayStartHour: 7,
  editable: true,
  events: [
    { end: dayAt(9, 30), id: 'standup', start: dayAt(9, 0), title: 'Standup' },
    { end: dayAt(11, 30), id: 'design', start: dayAt(10, 0), title: 'Design review' },
    { end: dayAt(13, 0), id: 'lunch', start: dayAt(12, 0), title: 'Lunch' },
    // Opts out → not draggable (no grab cursor / cdkDrag disabled) and no resize handle.
    {
      editable: false,
      end: dayAt(16, 0),
      id: 'locked',
      start: dayAt(14, 30),
      title: 'Locked (fixed)',
    },
  ],
  view: 'day',
};

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
  title: 'Calendar/NgeCalendar/Views/Day',
};

export default meta;
type Story = StoryObj<NgeCalendarComponent>;

/** A typical day of timed events plus an all-day banner, rendered through the shell. */
export const Usage: Story = {
  args: { config: USAGE_CONFIG },
};

/** Overlapping events packed side-by-side into lanes within the single column. */
export const Overlap: Story = {
  args: { config: OVERLAP_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const blocks = await canvas.findAllByTestId('nge-time-grid-event');
    await expect(blocks.length).toBeGreaterThanOrEqual(4);
  },
};

/** All-day banners pinned above the scrolling timed grid. */
export const AllDay: Story = {
  args: { config: ALL_DAY_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bars = await canvas.findAllByTestId('nge-time-grid-allday-bar');
    await expect(bars.length).toBeGreaterThanOrEqual(2);
  },
};

/** The live current-time indicator (anchored on the real today). */
export const NowIndicator: Story = {
  args: { config: nowConfig() },
};

/**
 * The shell wrapped in a host that overrides `--nge-calendar-*` tokens — proves the
 * time-grid themes purely through the calendar's CSS-variable namespace, including
 * the `--nge-calendar-now-indicator` line.
 */
export const Themed: Story = {
  args: { config: USAGE_CONFIG },
  render: args => ({
    props: args,
    template: `
      <div style="
        --nge-calendar-accent: #0d9488;
        --nge-calendar-event-bg: #0d9488;
        --nge-calendar-event-fg: #ffffff;
        --nge-calendar-surface: #f0fdfa;
        --nge-calendar-surface-container: #ccfbf1;
        --nge-calendar-on-surface: #134e4a;
        --nge-calendar-outline-variant: #99f6e4;
        --nge-calendar-today: #ccfbf1;
        --nge-calendar-now-indicator: #db2777;
      ">
        <nge-calendar [config]="config"></nge-calendar>
      </div>
    `,
  }),
};

/**
 * S10 keyboard navigation + slot click + roving focus (day = the SAME time grid as
 * week, with `view: 'day'`). Through the shell, `slotClick` and `eventClick` are
 * wired to `fn()` spies so the `play()` can prove the two activation paths
 * end-to-end:
 *
 *  - keyboard: focus the day column (the lone tabindex=0), ArrowDown to step the
 *    focused TIME by one slot, Enter → the shell relays `slotClick` for that slot
 *    (start … start + slotMinutes);
 *  - pointer: click a timed event block → the shell relays `eventClick`.
 *
 * Drive it by hand in the live Storybook to watch the focused-slot band step within
 * the day column with ↑/↓.
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
    // The lone tabindex=0 column is the anchor day (roving-focus default).
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

/**
 * S9 drag + resize (day = the SAME time grid as week, with `view: 'day'`). With
 * `editable: true`, every timed block is a free-drag `cdkDrag` (drop it on a new
 * time → the shell emits `eventDrop`) with a bottom-edge resize handle (drag it →
 * `eventResize`); this story wires BOTH back into the config so the move / resize
 * re-renders. The "Locked" event opts out and stays put with no handle.
 *
 * Note: jsdom (the test runner) can't synthesize a real CDK pointer drag, so the
 * `play()` only asserts the *affordance* — the editable blocks expose an enabled
 * `cdkDrag` (the `--draggable` class) and a resize handle, while the opted-out one
 * does not. The actual move / resize is exercised in the component spec; drag it by
 * hand in the live Storybook to see it stick.
 */
export const DragAndResize: Story = {
  args: { config: DRAGGABLE_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const blocks = await canvas.findAllByTestId('nge-time-grid-event');
    // The editable events expose the draggable affordance + a resize handle…
    const draggable = blocks.filter(b => b.classList.contains('nge-time-grid__event--draggable'));
    await expect(draggable.length).toBeGreaterThan(0);
    const handles = await canvas.findAllByTestId('nge-time-grid-resize');
    await expect(handles.length).toBeGreaterThan(0);
    // …and the opted-out "Locked" block does NOT (no draggable class, no handle).
    const locked = blocks.find(b => b.getAttribute('data-event-id') === 'locked');
    await expect(locked).toBeTruthy();
    await expect(locked?.classList.contains('nge-time-grid__event--draggable')).toBe(false);
    await expect(locked?.querySelector('[data-testid="nge-time-grid-resize"]')).toBeNull();
  },
  render: () => {
    // A WritableSignal holds the live config so an emitted drop / resize updates the
    // event and the block re-renders at its new time / height. NOTE: a plain
    // `get config()` does NOT work — Storybook's Angular renderer snapshots `props`
    // (getters are evaluated once), so a reassigned closure never reaches the bound
    // input. A signal is passed by reference and read reactively via `[config]="config()"`.
    const config = signal<NgeCalendarConfig>({
      ...DRAGGABLE_CONFIG,
      events: DRAGGABLE_CONFIG.events.map(e => ({ ...e })),
    });
    return {
      props: {
        config,
        onDrop(drop: EventDrop): void {
          config.update(c => ({
            ...c,
            events: c.events.map(e =>
              e.id === drop.event.id
                ? { ...e, end: drop.newEnd ?? undefined, start: drop.newStart }
                : e
            ),
          }));
        },
        onResize(resize: EventResize): void {
          config.update(c => ({
            ...c,
            events: c.events.map(e =>
              e.id === resize.event.id ? { ...e, end: resize.newEnd } : e
            ),
          }));
        },
      },
      template: `
        <nge-calendar
          [config]="config()"
          (eventDrop)="onDrop($event)"
          (eventResize)="onResize($event)"
        ></nge-calendar>
      `,
    };
  },
};
