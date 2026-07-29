import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import type { NgeCalendarConfig } from '../../../core/models/nge-calendar-config.model';

import { NgeCalendarComponent } from '../../nge-calendar.component';

// Consumer-theme previews — prove the `--nge-calendar-*` token bridge
//   • libs/shared/themes/src/lib/styles/_dlc-calendar-tokens.scss
// drives the shared calendar ENTIRELY from the persona's own --dlc-* design
// tokens — no inline `--nge-calendar-*` overrides anywhere.
//
// storybook-app applies `dlc-theme-mixin()` in its `styles.scss`, so wrapping
// <nge-calendar> in a persona theme class is all it takes: the class sets the
// persona's --dlc-* values AND (via the bridge) the matching --nge-calendar-*
// tokens, which the calendar inside inherits.
//
// ⚠️ The theme class must be one this repo actually emits. There are exactly six
// (`.dlc-{professional,home,service-provider}-{light,dark}`), and they are the same
// six the Storybook theme switcher sets. A class that matches nothing fails
// silently: the wrapper still renders, the bridge never applies, and every token
// falls back to the `:root` default — so the story looks fine while proving nothing.

const ANCHOR = new Date(2026, 5, 15); // Mon Jun 15 2026

/** A representative month with a few events so each palette reads clearly. */
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

const meta: Meta<NgeCalendarComponent> = {
  args: { config: MONTH_CONFIG },
  component: NgeCalendarComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Calendar/NgeCalendar/Consumer Themes',
};

export default meta;
type Story = StoryObj<NgeCalendarComponent>;

/**
 * Render the calendar inside a `themeClass` ancestor. The wrapper paints itself
 * with the bridged `--nge-calendar-surface` so the framed preview matches the
 * calendar's own surface for the running theme.
 */
const consumerStory = (themeClass: string): Story => ({
  args: { config: MONTH_CONFIG },
  render: args => ({
    props: args,
    template: `
      <div class="${themeClass}" style="padding: 1.5rem; background: var(--nge-calendar-surface);">
        <nge-calendar [config]="config"></nge-calendar>
      </div>
    `,
  }),
});

// ── Professional ────────────────────────────────────────────────────────────
export const ProfessionalLight: Story = consumerStory('dlc-professional-light');
export const ProfessionalDark: Story = consumerStory('dlc-professional-dark');

// ── Home ────────────────────────────────────────────────────────────────────
export const HomeLight: Story = consumerStory('dlc-home-light');
export const HomeDark: Story = consumerStory('dlc-home-dark');

// ── Service Provider ────────────────────────────────────────────────────────
export const ServiceProviderLight: Story = consumerStory('dlc-service-provider-light');
export const ServiceProviderDark: Story = consumerStory('dlc-service-provider-dark');
