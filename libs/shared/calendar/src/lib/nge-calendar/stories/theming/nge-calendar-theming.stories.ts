import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import type { NgeCalendarConfig } from '../../../core/models/nge-calendar-config.model';
import type { NgeCalendarTheme } from '../../../core/models/nge-calendar-theme.model';

import { NgeCalendarComponent } from '../../nge-calendar.component';

// Theming matrix (ARCH-71). Proves the two-layer `--nge-calendar-*` token model
// (`theme/_nge-calendar-tokens.scss`) end-to-end across MULTIPLE themes AND both
// consumer override paths:
//   • the literal default (no override at all),
//   • an ancestor `<div style="--nge-calendar-*">` wrapper (CSS-var path), and
//   • the inline `config.theme` map the shell applies to its host (input path).
// All stories render the SAME representative month so the palette swap is the only
// variable. Every themed palette overrides the SAME representative token spread:
//   surface · surface-container · on-surface · on-surface-variant · accent ·
//   on-accent · event-bg · event-fg · today · now-indicator · outline-variant
// (the real names from `_nge-calendar-tokens.scss`).

const ANCHOR = new Date(2026, 5, 15); // Mon Jun 15 2026

/** A representative month with a handful of events so the palette reads clearly. */
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

/**
 * The Forest palette as an inline `config.theme` map — the SAME representative token
 * spread the CSS-var wrappers below use, but applied through the shell's host-binding
 * input path (`NgeCalendarComponent.applyTheme` → `style.setProperty`). Typed as
 * {@link NgeCalendarTheme} (`Record<\`--nge-calendar-${string}\`, string>`).
 */
const FOREST_THEME: NgeCalendarTheme = {
  '--nge-calendar-accent': '#15803d',
  '--nge-calendar-event-bg': '#15803d',
  '--nge-calendar-event-fg': '#ffffff',
  '--nge-calendar-now-indicator': '#db2777',
  '--nge-calendar-on-accent': '#ffffff',
  '--nge-calendar-on-surface': '#14532d',
  '--nge-calendar-on-surface-variant': '#3f6212',
  '--nge-calendar-outline-variant': '#bbf7d0',
  '--nge-calendar-surface': '#f0fdf4',
  '--nge-calendar-surface-container': '#dcfce7',
  '--nge-calendar-today': '#dcfce7',
};

const meta: Meta<NgeCalendarComponent> = {
  args: { config: MONTH_CONFIG },
  component: NgeCalendarComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Calendar/NgeCalendar/Theming',
};

export default meta;
type Story = StoryObj<NgeCalendarComponent>;

/**
 * No overrides at all — the calendar renders entirely from the baked-in literal
 * defaults in `_nge-calendar-tokens.scss` (blue accent, white surface). This is the
 * self-sufficient baseline every themed story below diverges from.
 */
export const DefaultLight: Story = {
  args: { config: MONTH_CONFIG },
};

/**
 * Purple palette via the ancestor CSS-var wrapper — an `<div style="--nge-calendar-*">`
 * sets the representative token spread, proving an ancestor override beats the literal
 * default through the calendar's own CSS-variable namespace.
 */
export const PurpleViaCssVars: Story = {
  args: { config: MONTH_CONFIG },
  render: args => ({
    props: args,
    template: `
      <div style="
        --nge-calendar-accent: #7c3aed;
        --nge-calendar-on-accent: #ffffff;
        --nge-calendar-event-bg: #7c3aed;
        --nge-calendar-event-fg: #ffffff;
        --nge-calendar-surface: #faf5ff;
        --nge-calendar-surface-container: #f3e8ff;
        --nge-calendar-on-surface: #2e1065;
        --nge-calendar-on-surface-variant: #6d28d9;
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
 * A SECOND distinct palette (Ocean) via the same CSS-var wrapper — proves the theming
 * matrix spans MULTIPLE themes, not just one, all through the `--nge-calendar-*`
 * namespace with no Material / `--mat-sys-*` dependency.
 */
export const OceanViaCssVars: Story = {
  args: { config: MONTH_CONFIG },
  render: args => ({
    props: args,
    template: `
      <div style="
        --nge-calendar-accent: #0369a1;
        --nge-calendar-on-accent: #ffffff;
        --nge-calendar-event-bg: #0369a1;
        --nge-calendar-event-fg: #ffffff;
        --nge-calendar-surface: #f0f9ff;
        --nge-calendar-surface-container: #e0f2fe;
        --nge-calendar-on-surface: #0c4a6e;
        --nge-calendar-on-surface-variant: #0369a1;
        --nge-calendar-outline-variant: #bae6fd;
        --nge-calendar-today: #e0f2fe;
        --nge-calendar-now-indicator: #ea580c;
      ">
        <nge-calendar [config]="config"></nge-calendar>
      </div>
    `,
  }),
};

/**
 * The Forest palette applied through `config.theme` — the inline input path NO other
 * story exercises. The shell's `applyTheme` effect writes each `--nge-calendar-*`
 * entry of {@link FOREST_THEME} onto the host element as an inline custom property,
 * so this proves the same token spread themes the calendar via the config input, not
 * just via an ancestor wrapper.
 */
export const ViaThemeInput: Story = {
  args: { config: { ...MONTH_CONFIG, theme: FOREST_THEME } },
};
