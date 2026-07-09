import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import type { NgeCalendarConfig } from '../../../core/models/nge-calendar-config.model';

import { NgeCalendarComponent } from '../../nge-calendar.component';

// Consumer-theme previews — prove the per-app `--nge-calendar-*` token bridges
//   • libs/concierge/themes/src/lib/styles/_cg-nge-calendar-tokens.scss
//   • libs/got-you/themes/src/lib/styles/_gy-nge-calendar-tokens.scss
// drive the shared calendar ENTIRELY from each app's own --cg-* / --gy-* design
// tokens — no inline `--nge-calendar-*` overrides anywhere.
//
// This shared Storybook (storybook-app) applies BOTH `cg-theme-mixin()` and
// `gy-theme-mixin()` in its `styles.scss`, so wrapping <nge-calendar> in a
// persona / brand theme class is all it takes: the class sets the app's --cg-* /
// --gy-* values AND (via the bridge) the matching --nge-calendar-* tokens, which
// the calendar inside inherits.

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

// ── Concierge personas ──────────────────────────────────────────────────────
export const ConciergeProfessionalLight: Story = consumerStory('cg-professional-light');
export const ConciergeProfessionalDark: Story = consumerStory('cg-professional-dark');
export const ConciergeHomeLight: Story = consumerStory('cg-home-light');
export const ConciergeHomeDark: Story = consumerStory('cg-home-dark');
export const ConciergeServiceProviderLight: Story = consumerStory('cg-service-provider-light');
export const ConciergeServiceProviderDark: Story = consumerStory('cg-service-provider-dark');

// ── Got You ─────────────────────────────────────────────────────────────────
export const GotYouLight: Story = consumerStory('gy-light');
export const GotYouDark: Story = consumerStory('gy-dark');

// ── Cognition ───────────────────────────────────────────────────────────────
export const CognitionDark: Story = consumerStory('cog-dark');
export const CognitionLight: Story = consumerStory('cog-light');

// ── Giga Marketing (light-only) ───────────────────────────────────────────────
export const NgeMarketing: Story = consumerStory('nge-light');

// ── Media Workbench ───────────────────────────────────────────────────────────
export const MediaWorkbenchDark: Story = consumerStory('mw-dark');
export const MediaWorkbenchLight: Story = consumerStory('mw-light');
