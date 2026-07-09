import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { EventDrop } from '../../core/models/calendar-output.model';
import type { NgeCalendarConfig } from '../../core/models/nge-calendar-config.model';

import { NgeCalendarComponent } from '../../nge-calendar/nge-calendar.component';

// All stories render through the `<nge-calendar [config]>` shell — the shell
// provides AND seeds the component-scoped store the month view injects, so the
// store-as-boundary rule holds (no provide+seed is re-implemented out here).

const ANCHOR = new Date(2026, 5, 15); // Mon Jun 15 2026

/** A normal month with a handful of single-day events. */
const USAGE_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  events: [
    {
      end: new Date(2026, 5, 10, 10, 0),
      id: 'sync',
      start: new Date(2026, 5, 10, 9, 0),
      title: 'Morning sync',
    },
    {
      end: new Date(2026, 5, 12, 15, 0),
      id: 'review',
      start: new Date(2026, 5, 12, 14, 0),
      title: 'Design review',
    },
    {
      end: new Date(2026, 5, 18, 12, 0),
      id: '1on1',
      start: new Date(2026, 5, 18, 11, 0),
      title: '1:1',
    },
  ],
  view: 'month',
};

/**
 * `editable: true` with a handful of single-day events spread across the month —
 * every chip is drag-enabled (S9). Drag a chip onto another day cell and the shell
 * emits `eventDrop`; the `Draggable` story wires that back so the move sticks.
 */
const DRAGGABLE_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  editable: true,
  events: [
    {
      end: new Date(2026, 5, 10, 10, 0),
      id: 'sync',
      start: new Date(2026, 5, 10, 9, 0),
      title: 'Morning sync',
    },
    {
      end: new Date(2026, 5, 16, 15, 0),
      id: 'review',
      start: new Date(2026, 5, 16, 14, 0),
      title: 'Design review',
    },
    {
      end: new Date(2026, 5, 22, 12, 0),
      id: '1on1',
      start: new Date(2026, 5, 22, 11, 0),
      title: '1:1',
    },
    // One event opts out → its chip is NOT draggable (no grab cursor / cdkDrag disabled).
    {
      editable: false,
      end: new Date(2026, 5, 18, 17, 0),
      id: 'locked',
      start: new Date(2026, 5, 18, 16, 0),
      title: 'Locked (not draggable)',
    },
  ],
  view: 'month',
};

/** One day deliberately overloaded with 5 events → "+N more" overflow. */
const OVERFLOW_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  events: Array.from({ length: 5 }, (_unused, i) => ({
    end: new Date(2026, 5, 16, i + 9, 30),
    id: `o${i}`,
    start: new Date(2026, 5, 16, i + 9, 0),
    title: `Event ${i + 1}`,
  })),
  view: 'month',
};

/**
 * Spanning bars together with single-day (dot) events ON THE SAME DAYS — proving the
 * dots drop below the reserved bar lanes instead of colliding — plus a bar that wraps
 * across the Sat/Sun boundary into the next week row.
 */
const MULTI_DAY_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  events: [
    // ── spanning bars ──────────────────────────────────────────────────────────
    // 3-day bar, Tue 9 → Thu 11 (entirely within the week of the 7th).
    {
      end: new Date(2026, 5, 11, 17, 0),
      id: 'conf',
      start: new Date(2026, 5, 9, 9, 0),
      title: 'Conference',
    },
    // Wraps Fri 12 → Tue 16, crossing the Sat 13 / Sun 14 weekend into the next row.
    {
      end: new Date(2026, 5, 16, 17, 0),
      id: 'offsite',
      start: new Date(2026, 5, 12, 9, 0),
      title: 'Team offsite',
    },
    // Single-day all-day bar.
    {
      allDay: true,
      id: 'holiday',
      start: new Date(2026, 5, 19),
      title: 'Company holiday',
    },
    // ── single-day (dot) events sharing days with the bars above ───────────────
    {
      end: new Date(2026, 5, 9, 9, 15),
      id: 'standup',
      start: new Date(2026, 5, 9, 9, 0),
      title: 'Standup',
    },
    {
      end: new Date(2026, 5, 10, 13, 0),
      id: 'lunch',
      start: new Date(2026, 5, 10, 12, 0),
      title: 'Lunch & learn',
    },
    {
      end: new Date(2026, 5, 12, 11, 0),
      id: 'kickoff',
      start: new Date(2026, 5, 12, 10, 0),
      title: 'Kickoff',
    },
    {
      end: new Date(2026, 5, 19, 17, 0),
      id: 'wrapup',
      start: new Date(2026, 5, 19, 16, 0),
      title: 'Wrap-up',
    },
  ],
  view: 'month',
};

/**
 * Three overlapping multi-day events in one week → the lane packer stacks them onto
 * separate rows; a single-day dot on the busiest day drops below all three lanes.
 */
const STACKED_BARS_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  events: [
    {
      end: new Date(2026, 5, 12, 17, 0), // Mon 8 → Fri 12
      id: 'sprint',
      start: new Date(2026, 5, 8, 9, 0),
      title: 'Sprint 24',
    },
    {
      end: new Date(2026, 5, 11, 17, 0), // Tue 9 → Thu 11
      id: 'designjam',
      start: new Date(2026, 5, 9, 9, 0),
      title: 'Design jam',
    },
    {
      end: new Date(2026, 5, 13, 12, 0), // Wed 10 → Sat 13
      id: 'qa',
      start: new Date(2026, 5, 10, 9, 0),
      title: 'QA pass',
    },
    {
      end: new Date(2026, 5, 10, 12, 30), // single-day dot on Wed 10
      id: 'sync',
      start: new Date(2026, 5, 10, 12, 0),
      title: 'Sync',
    },
  ],
  view: 'month',
};

/**
 * A genuinely busy week (the 14th): two OVERLAPPING multi-day bars (Launch window +
 * Press tour, sharing Tue–Thu → two lanes), single-day dot events on those same days,
 * AND a day (Thu 18) overloaded into "+N more" beneath both bars — lanes, dots and
 * overflow all stacking without colliding. Plus a second bar week + a scattered single.
 */
const BUSY_MONTH_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  events: [
    // ── two overlapping multi-day bars over the same days (→ two lanes) ─────────
    {
      end: new Date(2026, 5, 18, 17, 0), // Mon 15 → Thu 18
      id: 'launch',
      start: new Date(2026, 5, 15, 9, 0),
      title: 'Launch window',
    },
    {
      end: new Date(2026, 5, 19, 17, 0), // Tue 16 → Fri 19
      id: 'press',
      start: new Date(2026, 5, 16, 9, 0),
      title: 'Press tour',
    },
    // ── single-day (dot) events on the barred days → drop below both lanes ──────
    {
      end: new Date(2026, 5, 16, 9, 30),
      id: 'standup',
      start: new Date(2026, 5, 16, 9, 0),
      title: 'Standup',
    },
    {
      end: new Date(2026, 5, 17, 15, 0),
      id: 'retro',
      start: new Date(2026, 5, 17, 14, 0),
      title: 'Retro',
    },
    // ── Thu 18 also overloaded with single-day events → "+N more" under the bars ─
    ...Array.from({ length: 5 }, (_unused, i) => ({
      end: new Date(2026, 5, 18, i + 9, 30),
      id: `m${i}`,
      start: new Date(2026, 5, 18, i + 9, 0),
      title: `Meeting ${i + 1}`,
    })),
    // ── extra context: a second bar week + a scattered single ──────────────────
    {
      end: new Date(2026, 5, 11, 17, 0), // Tue 9 → Thu 11
      id: 'conf',
      start: new Date(2026, 5, 9, 9, 0),
      title: 'Conference',
    },
    {
      end: new Date(2026, 5, 23, 15, 0),
      id: '1on1',
      start: new Date(2026, 5, 23, 14, 0),
      title: '1:1',
    },
  ],
  view: 'month',
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
  title: 'Calendar/NgeCalendar/Views/Month',
};

export default meta;
type Story = StoryObj<NgeCalendarComponent>;

/** A normal month with a handful of events rendered through the shell. */
export const Usage: Story = {
  args: { config: USAGE_CONFIG },
};

/** A single day with 5+ events, collapsing the overflow into "+N more". */
export const Overflow: Story = {
  args: { config: OVERFLOW_CONFIG },
};

/**
 * Spanning bars (one wrapping across the weekend) coexisting with single-day dot
 * events on the same days — bars and dots stack, never overlap.
 */
export const MultiDayBars: Story = {
  args: { config: MULTI_DAY_CONFIG },
};

/** Three overlapping multi-day events stacked onto separate lanes, with a dot below. */
export const StackedBars: Story = {
  args: { config: STACKED_BARS_CONFIG },
};

/**
 * A busy month: two overlapping multi-day bars, single-day dots on the same days, and
 * an overflowing day — lanes, dots and "+N more" all stacked together, no collisions.
 */
export const BusyMonth: Story = {
  args: { config: BUSY_MONTH_CONFIG },
};

/** Same month with the week starting on Monday. */
export const WeekStartsOnMonday: Story = {
  args: { config: { ...USAGE_CONFIG, weekStartsOn: 1 } },
};

/**
 * The shell wrapped in a host that overrides `--nge-calendar-*` tokens — proves
 * the month view themes purely through the calendar's own CSS-variable namespace
 * (literal default → consumer override), mirroring the shell `Themed` story.
 */
export const Themed: Story = {
  args: { config: USAGE_CONFIG },
  render: args => ({
    props: args,
    template: `
      <div style="
        --nge-calendar-accent: #7c3aed;
        --nge-calendar-event-bg: #7c3aed;
        --nge-calendar-on-accent: #ffffff;
        --nge-calendar-surface: #faf5ff;
        --nge-calendar-surface-container: #f3e8ff;
        --nge-calendar-on-surface: #2e1065;
        --nge-calendar-outline-variant: #d8b4fe;
        --nge-calendar-today: #ede9fe;
      ">
        <nge-calendar [config]="config"></nge-calendar>
      </div>
    `,
  }),
};

/**
 * Clicks the "+N more" affordance and asserts the overflow popover appears with
 * the full event list for that cell.
 */
export const PopoverInteraction: Story = {
  args: { config: OVERFLOW_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const more = await canvas.findByTestId('nge-month-more');
    await userEvent.click(more);
    const popover = await canvas.findByTestId('nge-month-popover');
    await expect(popover).toBeInTheDocument();
  },
};

/**
 * S9 CDK drag-drop (month). With `editable: true`, every single-day chip becomes a
 * `cdkDrag` you can drop onto another day cell; the shell emits `eventDrop`, which
 * this story wires back into the config so the moved event re-renders on its new
 * day (the "Locked" chip opts out via `editable: false` and stays put).
 *
 * Note: jsdom can't synthesize a real CDK pointer drag, so the `play()` only
 * asserts the *affordance* (the chip carries the `--draggable` class and an
 * enabled `cdkDrag`); the actual move is exercised in the component spec via
 * `onChipDropped`. Drag it by hand in the live Storybook to see the move stick.
 */
export const Draggable: Story = {
  args: { config: DRAGGABLE_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chips = await canvas.findAllByTestId('nge-month-chip');
    // The editable events expose the draggable affordance…
    const draggable = chips.filter(c => c.classList.contains('nge-month-view__chip--draggable'));
    await expect(draggable.length).toBeGreaterThan(0);
    // …and the opted-out "Locked" chip does NOT.
    const locked = chips.find(c => c.getAttribute('data-event-id') === 'locked');
    await expect(locked).toBeTruthy();
    await expect(locked?.classList.contains('nge-month-view__chip--draggable')).toBe(false);
  },
  render: () => {
    // A WritableSignal holds the live config so an emitted drop updates the event and
    // the chip re-renders on its new day. NOTE: a plain `get config()` does NOT work —
    // Storybook's Angular renderer snapshots `props` (getters are evaluated once), so a
    // reassigned closure never reaches the bound input. A signal is passed by reference
    // and read reactively via `[config]="config()"`.
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
      },
      template: `<nge-calendar [config]="config()" (eventDrop)="onDrop($event)"></nge-calendar>`,
    };
  },
};

/**
 * S10 keyboard navigation + slot click + roving focus (month). Through the shell,
 * `slotClick` and `eventClick` are wired to `fn()` spies so the `play()` can prove
 * the two activation paths end-to-end:
 *
 *  - keyboard: focus the anchor day cell, ArrowRight to the next day, Enter →
 *    the shell relays `slotClick` for that empty day (start/end = day bounds);
 *  - pointer: click an event chip → the shell relays `eventClick`.
 *
 * Drive it by hand in the live Storybook to watch the roving focus ring move
 * between cells with the arrow keys.
 */
export const KeyboardAndSlot: Story = {
  args: { config: USAGE_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Fresh start on each (re)play so prior runs don't leak call history.
    slotClickSpy.mockClear();
    eventClickSpy.mockClear();

    // ── keyboard: ArrowRight + Enter on the focused day → slotClick ────────────
    const cells = await canvas.findAllByTestId('nge-month-day');
    // The lone tabindex=0 cell is the anchor (roving-focus default).
    const anchorCell = cells.find(c => c.getAttribute('tabindex') === '0') ?? cells[0];
    anchorCell.focus();
    // Native keydown dispatch — the cell handler listens for `keydown` and reads
    // the roving-focus target from the store (Storybook's userEvent.keyboard would
    // also work, but a direct dispatch keeps the assertion deterministic).
    anchorCell.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' })
    );
    // `afterNextRender` shifts the lone tabindex=0 onto the next day; press Enter on
    // the cell that now holds roving focus so the keyboard-activation path is faithful.
    await waitFor(() => {
      const focused = cells.find(c => c.getAttribute('tabindex') === '0');
      if (!focused || focused === anchorCell) {
        throw new Error('roving focus has not advanced past the anchor yet');
      }
      focused.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' })
      );
    });
    await waitFor(() => expect(slotClickSpy).toHaveBeenCalled());

    // ── pointer: click an event chip → eventClick ──────────────────────────────
    const chip = (await canvas.findAllByTestId('nge-month-chip'))[0];
    await userEvent.click(chip);
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
