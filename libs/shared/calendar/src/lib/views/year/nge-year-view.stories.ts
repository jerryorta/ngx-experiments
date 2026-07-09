import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { NgeCalendarConfig } from '../../core/models/nge-calendar-config.model';
import type { NgeCalendarEvent } from '../../core/models/nge-calendar-event.model';

import { NgeCalendarComponent } from '../../nge-calendar/nge-calendar.component';

// All stories render through the `<nge-calendar [config]>` shell — the shell
// provides AND seeds the component-scoped store the year view injects, so the
// store-as-boundary rule holds (no provide+seed is re-implemented out here).

const ANCHOR = new Date(2026, 5, 15); // Mon Jun 15 2026

/** A normal year with a handful of single-day events scattered across months. */
const USAGE_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  events: [
    {
      end: new Date(2026, 1, 14, 13, 0),
      id: 'valentine',
      start: new Date(2026, 1, 14, 12, 0),
      title: 'Lunch',
    },
    {
      end: new Date(2026, 3, 2, 15, 0),
      id: 'review',
      start: new Date(2026, 3, 2, 14, 0),
      title: 'Design review',
    },
    {
      end: new Date(2026, 5, 15, 12, 0),
      id: '1on1',
      start: new Date(2026, 5, 15, 11, 0),
      title: '1:1',
    },
    {
      end: new Date(2026, 8, 21, 10, 0),
      id: 'kickoff',
      start: new Date(2026, 8, 21, 9, 0),
      title: 'Kickoff',
    },
    {
      end: new Date(2026, 11, 24, 17, 0),
      id: 'party',
      start: new Date(2026, 11, 24, 16, 0),
      title: 'Holiday party',
    },
  ],
  view: 'year',
};

/**
 * Build N single-day events on one day so the density bucket can be exercised
 * deliberately (1–2 → level 1, 3–4 → 2, 5+ → 3).
 */
function eventsOn(day: Date, count: number, idPrefix: string): NgeCalendarEvent[] {
  return Array.from({ length: count }, (_unused, i) => ({
    end: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9 + i, 30),
    id: `${idPrefix}${i}`,
    start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9 + i, 0),
    title: `${idPrefix} ${i + 1}`,
  }));
}

/**
 * A busy year exercising every density bucket: a level-1 day (2 events), a level-2
 * day (4 events) and several level-3 days (5+ events), spread across the calendar.
 */
const BUSY_YEAR_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  events: [
    ...eventsOn(new Date(2026, 0, 5), 2, 'jan'), // level 1
    ...eventsOn(new Date(2026, 2, 12), 4, 'mar'), // level 2
    ...eventsOn(new Date(2026, 5, 15), 6, 'jun'), // level 3
    ...eventsOn(new Date(2026, 5, 16), 3, 'jun16'), // level 2
    ...eventsOn(new Date(2026, 8, 9), 7, 'sep'), // level 3
    ...eventsOn(new Date(2026, 10, 27), 5, 'nov'), // level 3
  ],
  view: 'year',
};

// Module-scoped output spy for the `KeyboardNav` story so its `render` (which binds
// the shell's `viewChange`) and `play` (which asserts it) share the same instance.
const viewChangeSpy = fn();

const meta: Meta<NgeCalendarComponent> = {
  args: { config: USAGE_CONFIG },
  component: NgeCalendarComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Calendar/NgeCalendar/Views/Year',
};

export default meta;
type Story = StoryObj<NgeCalendarComponent>;

/** A normal year with a handful of events rendered through the shell. */
export const Usage: Story = {
  args: { config: USAGE_CONFIG },
};

/**
 * A busy year exercising all density buckets, including level 3 (5+ events) — the
 * heat-map dots ramp in opacity with the per-day count.
 */
export const BusyYear: Story = {
  args: { config: BUSY_YEAR_CONFIG },
};

/** Same year with each mini-month starting its weeks on Monday. */
export const WeekStartsOnMonday: Story = {
  args: { config: { ...USAGE_CONFIG, weekStartsOn: 1 } },
};

/**
 * The shell wrapped in a host that overrides `--nge-calendar-*` tokens — proves
 * the year view themes purely through the calendar's own CSS-variable namespace
 * (literal default → consumer override), mirroring the shell `Themed` story. The
 * density dots ramp the overridden `accent`.
 */
export const Themed: Story = {
  args: { config: BUSY_YEAR_CONFIG },
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
 * Clicks a day cell in the year overview and asserts it drills into the month
 * view (the `<nge-month-view>` appears, replacing the year grid).
 */
export const DrillInInteraction: Story = {
  args: { config: USAGE_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dayCells = await canvas.findAllByTestId('nge-year-day');
    await userEvent.click(dayCells[10]);
    // Drilling in swaps the year grid for the month view.
    const monthView = await canvas.findByTestId('nge-month-view');
    await expect(monthView).toBeInTheDocument();
  },
};

/**
 * S11 keyboard navigation + roving focus (year). The twelve month-header tiles form
 * a managed-focus grid: the `play()` focuses the lone tabindex=0 tile (January),
 * ArrowRight moves the roving focus to February, then Enter drills into that month
 * — swapping the year grid for `<nge-month-view>` AND emitting `viewChange` with
 * `view: 'month'` (wired here to a `fn()` spy via the shell).
 *
 * Drive it by hand in the live Storybook to watch the roving focus ring move
 * between the month tiles with the arrow keys (←/→ step ±1 month, ↑/↓ ±a row).
 */
export const KeyboardNav: Story = {
  args: { config: USAGE_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Fresh start on each (re)play so prior runs don't leak call history.
    viewChangeSpy.mockClear();

    // The lone tabindex=0 tile is January (roving-focus default).
    const tiles = await canvas.findAllByTestId('nge-year-month');
    const firstTile = tiles.find(t => t.getAttribute('tabindex') === '0') ?? tiles[0];
    firstTile.focus();
    // Native keydown dispatch — the tile handler listens for `keydown` and reads
    // the roving-focus target month from the store.
    firstTile.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' })
    );
    // `afterNextRender` shifts the lone tabindex=0 onto February; press Enter on the
    // tile that now holds roving focus so the keyboard-activation path is faithful.
    await waitFor(() => {
      const focused = tiles.find(t => t.getAttribute('tabindex') === '0');
      if (!focused || focused === firstTile) {
        throw new Error('roving focus has not advanced past January yet');
      }
      focused.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' })
      );
    });

    // Enter drilled in: the year grid is replaced by the month view…
    const monthView = await canvas.findByTestId('nge-month-view');
    await expect(monthView).toBeInTheDocument();
    // …and the shell relayed `viewChange` with the month view.
    await waitFor(() => expect(viewChangeSpy).toHaveBeenCalled());
    await expect(viewChangeSpy).toHaveBeenCalledWith(expect.objectContaining({ view: 'month' }));
  },
  render: args => ({
    props: {
      ...args,
      onViewChange: viewChangeSpy,
    },
    template: `<nge-calendar [config]="config" (viewChange)="onViewChange($event)"></nge-calendar>`,
  }),
};
