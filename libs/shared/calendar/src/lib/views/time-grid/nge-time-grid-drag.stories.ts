import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { expect, within } from 'storybook/test';

import type { EventDrop, EventResize } from '../../core/models/calendar-output.model';
import type { NgeCalendarConfig } from '../../core/models/nge-calendar-config.model';

import { NgeCalendarComponent } from '../../nge-calendar/nge-calendar.component';

// S9 CDK drag-drop + resize for the time-grid (week / day), rendered through the
// `<nge-calendar [config]>` shell — the shell provides AND seeds the
// component-scoped store the time-grid injects, and bridges `eventDrop` /
// `eventResize`. These stories wire those outputs back into a local config so a
// live drag / resize sticks. (Both views share one component; this is the week.)

const ANCHOR = new Date(2026, 5, 15); // Mon Jun 15 2026 (week of Sun 14 … Sat 20)

/** Build a Date on the anchor's week, `dayOffset` days from Sunday, at `h:m`. */
function weekDayAt(dayOffset: number, hour: number, minute = 0): Date {
  // Jun 14 2026 is the Sunday that opens the anchor week.
  return new Date(2026, 5, 14 + dayOffset, hour, minute);
}

/**
 * `editable: true` with a handful of timed events across the week — every block is
 * a free-drag `cdkDrag` (move) AND carries a bottom-edge resize handle, except the
 * one event that opts out (`editable: false`), which is neither draggable nor
 * resizable. Drop a block on a new time / day → `eventDrop`; drag its bottom edge →
 * `eventResize`; the stories below wire both back so the change re-renders.
 */
const DRAGGABLE_CONFIG: NgeCalendarConfig = {
  date: ANCHOR,
  dayEndHour: 19,
  dayStartHour: 7,
  editable: true,
  events: [
    { end: weekDayAt(1, 10, 0), id: 'sync', start: weekDayAt(1, 9, 0), title: 'Morning sync' },
    { end: weekDayAt(2, 15, 0), id: '1on1', start: weekDayAt(2, 14, 0), title: '1:1' },
    {
      end: weekDayAt(3, 12, 30),
      id: 'workshop',
      start: weekDayAt(3, 11, 0),
      title: 'Workshop',
    },
    // Opts out → not draggable (no grab cursor / cdkDrag disabled) and no resize handle.
    {
      editable: false,
      end: weekDayAt(4, 17, 0),
      id: 'locked',
      start: weekDayAt(4, 16, 0),
      title: 'Locked (fixed)',
    },
  ],
  view: 'week',
  weekStartsOn: 0,
};

const meta: Meta<NgeCalendarComponent> = {
  args: { config: DRAGGABLE_CONFIG },
  component: NgeCalendarComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Calendar/NgeCalendar/Views/Week/Interactions',
};

export default meta;
type Story = StoryObj<NgeCalendarComponent>;

/**
 * S9 drag + resize. With `editable: true`, every timed block is a free-drag
 * `cdkDrag` (drop it on a new time / day → the shell emits `eventDrop`) with a
 * bottom-edge resize handle (drag it → `eventResize`); this story wires BOTH back
 * into the config so the move / resize re-renders. The "Locked" event opts out and
 * stays put with no handle.
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
