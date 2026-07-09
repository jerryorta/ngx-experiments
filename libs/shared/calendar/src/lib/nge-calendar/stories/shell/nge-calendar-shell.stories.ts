import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import type { NgeCalendarConfig } from '../../../core/models/nge-calendar-config.model';

import { NgeCalendarComponent } from '../../nge-calendar.component';

/** A small, fixed month config with a couple of events for the shell stories. */
const SAMPLE_CONFIG: NgeCalendarConfig = {
  date: new Date(2026, 0, 15),
  events: [
    {
      end: new Date(2026, 0, 15, 10, 0),
      id: 'a',
      start: new Date(2026, 0, 15, 9, 0),
      title: 'Morning sync',
    },
    {
      end: new Date(2026, 0, 17, 15, 0),
      id: 'b',
      start: new Date(2026, 0, 17, 14, 0),
      title: 'Design review',
    },
  ],
  view: 'month',
};

const meta: Meta<NgeCalendarComponent> = {
  args: { config: SAMPLE_CONFIG },
  component: NgeCalendarComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Calendar/NgeCalendar/Shell',
};

export default meta;
type Story = StoryObj<NgeCalendarComponent>;

/**
 * Bare shell with no host theme — proves the `--nge-calendar-*` literal
 * defaults render a fully styled, intentional-looking shell with zero theming.
 */
export const Bare: Story = {
  args: { config: SAMPLE_CONFIG },
};

/**
 * Same shell under a host that overrides `--nge-calendar-*` tokens directly —
 * demonstrates consumer theming (literal default → `--nge-calendar-*` override).
 */
export const Themed: Story = {
  args: { config: SAMPLE_CONFIG },
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
      ">
        <nge-calendar [config]="config"></nge-calendar>
      </div>
    `,
  }),
};
