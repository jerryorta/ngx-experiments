import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeMonthAgendaStoriesComponent } from './nge-month-agenda-stories.component';

// ARCH-148 — mobile month-agenda layout. Every story drives the public
// `<nge-calendar [config]>` shell with `monthLayout: 'agenda'`, so the shell
// routes the `month` view to the compact day-grouped agenda list. The fixtures
// are deterministic (fixed `new Date(2026, …)` anchors, never a drifting
// `new Date()`); none of the four stories mutate config, so each selects its
// fixture via the static `variant` arg — no `signal()` is needed here (the
// signal-based mutable-config pattern is only for stories that reassign config,
// e.g. the month-grid `Draggable` story).

const meta: Meta<NgeMonthAgendaStoriesComponent> = {
  component: NgeMonthAgendaStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Calendar/NgeCalendar/Month Agenda',
};

export default meta;
type Story = StoryObj<NgeMonthAgendaStoriesComponent>;

/** Default agenda layout — a month with a handful of events across several days. */
export const AgendaLayout: Story = {
  args: { variant: 'agenda' },
};

/**
 * Same month under a `--nge-calendar-*` host override; the agenda layout themes
 * purely through the calendar's own CSS-variable namespace (literal default →
 * consumer override), proving the layout is themeable.
 */
export const Theming: Story = {
  args: { variant: 'themed' },
};

/**
 * A densely populated month (3 events on every day) so the agenda body overflows
 * the constrained frame height and scrolls internally.
 */
export const ManyEvents: Story = {
  args: { variant: 'manyEvents' },
};

/** A month with zero events — exercises the agenda empty state. */
export const EmptyMonth: Story = {
  args: { variant: 'empty' },
};
