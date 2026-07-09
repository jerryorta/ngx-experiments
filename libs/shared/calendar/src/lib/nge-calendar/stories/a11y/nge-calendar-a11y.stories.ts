import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';

import type { NgeCalendarConfig } from '../../../core/models/nge-calendar-config.model';

import { NgeCalendarComponent } from '../../nge-calendar.component';

// ARCH-71 — dedicated Accessibility stories. Every story renders through the
// `<nge-calendar [config]>` shell (the shell provides AND seeds the
// component-scoped store each view injects, so the store-as-boundary rule holds)
// and the `play()` asserts the ARIA semantics the view templates emit:
//
//  - the grid container carries `role="grid"` + an `aria-label` (Month / Week /
//    Day / <year>);
//  - the day cells carry `role="gridcell"` + a meaningful date `aria-label`;
//  - the interactive views (Month / Week / Day) expose roving-tabindex focus —
//    exactly ONE focusable cell at `tabindex="0"` (the anchor), the rest at `-1`.
//
// The `@storybook/addon-a11y` axe pass (preview-wide `parameters.a11y.test:
// 'todo'`) additionally surfaces any contrast / name-role-value violations as
// non-failing todos; these stories pin the structural contract so a regression
// fails the build via the assertions rather than only showing up as a todo.

const ANCHOR = new Date(2026, 5, 15); // Mon Jun 15 2026 (week of Sun 14 … Sat 20)

/** Build a Date on the anchor week, `dayOffset` days from Sunday, at `h:m`. */
function weekDayAt(dayOffset: number, hour: number, minute = 0): Date {
  // Jun 14 2026 is the Sunday that opens the anchor week.
  return new Date(2026, 5, 14 + dayOffset, hour, minute);
}

/** Build a Date on the anchor day at `h:m`. */
function dayAt(hour: number, minute = 0): Date {
  return new Date(2026, 5, 15, hour, minute);
}

/** Month config: a handful of single-day events across the anchor month. */
const MONTH_CONFIG: NgeCalendarConfig = {
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

/** Week config: timed events across the anchor week plus one all-day Friday. */
const WEEK_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  dayEndHour: 21,
  dayStartHour: 7,
  events: [
    { end: weekDayAt(1, 10, 0), id: 'sync', start: weekDayAt(1, 9, 0), title: 'Morning sync' },
    { end: weekDayAt(2, 15, 0), id: '1on1', start: weekDayAt(2, 14, 0), title: '1:1' },
    { end: weekDayAt(3, 12, 30), id: 'workshop', start: weekDayAt(3, 11, 0), title: 'Workshop' },
    { allDay: true, id: 'holiday', start: weekDayAt(5, 0, 0), title: 'Company holiday' },
  ],
  view: 'week',
  weekStartsOn: 0,
};

/** Day config: a few timed events plus an all-day banner on the anchor day. */
const DAY_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  dayEndHour: 19,
  dayStartHour: 7,
  events: [
    { allDay: true, id: 'focus', start: ANCHOR, title: 'Focus day' },
    { end: dayAt(9, 30), id: 'standup', start: dayAt(9, 0), title: 'Standup' },
    { end: dayAt(11, 30), id: 'design', start: dayAt(10, 0), title: 'Design review' },
    { end: dayAt(13, 0), id: 'lunch', start: dayAt(12, 0), title: 'Lunch' },
  ],
  view: 'day',
};

/** Year config: single-day events scattered across the months of the anchor year. */
const YEAR_CONFIG: NgeCalendarConfig = {
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

const meta: Meta<NgeCalendarComponent> = {
  args: { config: MONTH_CONFIG },
  component: NgeCalendarComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Calendar/NgeCalendar/Accessibility',
};

export default meta;
type Story = StoryObj<NgeCalendarComponent>;

/**
 * Month view a11y contract: a `role="grid"` labelled "Month", `role="gridcell"`
 * day cells with a date `aria-label`, and roving-tabindex focus management
 * (exactly one cell at `tabindex="0"`, the rest at `-1`).
 */
export const Month: Story = {
  args: { config: MONTH_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Grid container: role + label.
    const grid = await canvas.findByTestId('nge-month-view');
    await expect(grid).toHaveAttribute('role', 'grid');
    await expect(grid).toHaveAttribute('aria-label', 'Month');

    // Day cells: gridcell role + a date aria-label on every cell.
    const cells = await canvas.findAllByTestId('nge-month-day');
    await expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      await expect(cell).toHaveAttribute('role', 'gridcell');
      await expect(cell.getAttribute('aria-label')).toBeTruthy();
    }

    // Roving tabindex: exactly one focusable cell (the anchor), rest at -1.
    const focusable = cells.filter(c => c.getAttribute('tabindex') === '0');
    const inert = cells.filter(c => c.getAttribute('tabindex') === '-1');
    await expect(focusable.length).toBe(1);
    await expect(inert.length).toBe(cells.length - 1);
  },
};

/**
 * Week view a11y contract: a `role="grid"` labelled "Week", `role="gridcell"`
 * day columns with a date `aria-label`, and roving-tabindex focus management
 * (exactly one column at `tabindex="0"`).
 */
export const Week: Story = {
  args: { config: WEEK_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Grid container: a multi-column time grid is labelled "Week".
    const grid = await canvas.findByTestId('nge-time-grid');
    await expect(grid).toHaveAttribute('role', 'grid');
    await expect(grid).toHaveAttribute('aria-label', 'Week');

    // Day columns: gridcell role + a date aria-label on every column.
    const columns = await canvas.findAllByTestId('nge-time-grid-column');
    await expect(columns.length).toBe(7);
    for (const column of columns) {
      await expect(column).toHaveAttribute('role', 'gridcell');
      await expect(column.getAttribute('aria-label')).toBeTruthy();
    }

    // Roving tabindex: exactly one focusable column (the anchor), rest at -1.
    const focusable = columns.filter(c => c.getAttribute('tabindex') === '0');
    const inert = columns.filter(c => c.getAttribute('tabindex') === '-1');
    await expect(focusable.length).toBe(1);
    await expect(inert.length).toBe(columns.length - 1);
  },
};

/**
 * Day view a11y contract: the same time grid rendered with a single column is a
 * `role="grid"` labelled "Day", with one `role="gridcell"` column that is the
 * lone roving-tabindex focus target (`tabindex="0"`).
 */
export const Day: Story = {
  args: { config: DAY_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Grid container: a single-column time grid is labelled "Day".
    const grid = await canvas.findByTestId('nge-time-grid');
    await expect(grid).toHaveAttribute('role', 'grid');
    await expect(grid).toHaveAttribute('aria-label', 'Day');

    // The single day column: gridcell role + a date aria-label.
    const columns = await canvas.findAllByTestId('nge-time-grid-column');
    await expect(columns.length).toBe(1);
    const [column] = columns;
    await expect(column).toHaveAttribute('role', 'gridcell');
    await expect(column.getAttribute('aria-label')).toBeTruthy();

    // The lone column is the roving-tabindex focus target.
    await expect(column).toHaveAttribute('tabindex', '0');
  },
};

/**
 * Year view a11y contract: a `role="grid"` labelled with the year, and
 * `role="gridcell"` day cells (native `<button>`s — inherently focusable) whose
 * `aria-label` names the date AND announces the per-day event count.
 *
 * (Unlike Month/Week/Day, the year overview's cells are real buttons, so their
 * focusability comes from the element itself rather than a roving tabindex — the
 * assertion checks the role + label contract, not a specific tabindex value.)
 */
export const Year: Story = {
  args: { config: YEAR_CONFIG },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Grid container: role + a year aria-label.
    const grid = await canvas.findByTestId('nge-year-view');
    await expect(grid).toHaveAttribute('role', 'grid');
    await expect(grid.getAttribute('aria-label')).toBeTruthy();

    // Day cells: gridcell role + a descriptive (date + event-count) aria-label.
    const cells = await canvas.findAllByTestId('nge-year-day');
    await expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      await expect(cell).toHaveAttribute('role', 'gridcell');
      await expect(cell.getAttribute('aria-label')).toBeTruthy();
    }

    // A day carrying events spells the count out in its label ("…, N events").
    const withEvents = cells.find(c => Number(c.getAttribute('data-event-count')) > 0);
    await expect(withEvents).toBeTruthy();
    await expect(withEvents?.getAttribute('aria-label')).toMatch(/\d+ events/);
  },
};
