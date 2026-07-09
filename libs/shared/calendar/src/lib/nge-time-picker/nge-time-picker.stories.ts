import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { NgeTimePickerComponent } from './nge-time-picker.component';

// `nge-time-picker` is a self-contained ControlValueAccessor primitive: a themed trigger that opens
// a CDK-overlay panel of scrollable hour / minute / meridiem columns. The value is canonical 24-hour
// `HH:mm`; the displayed clock (12h vs 24h) follows the locale unless `[hour12]` overrides it.

const meta: Meta<NgeTimePickerComponent> = {
  args: { locale: 'en-US', placeholder: 'Select time' },
  component: NgeTimePickerComponent,
  decorators: [
    moduleMetadata({ imports: [ReactiveFormsModule] }),
    applicationConfig({ providers: [provideAnimationsAsync()] }),
  ],
  title: 'Calendar/NgeTimePicker',
};

export default meta;
type Story = StoryObj<NgeTimePickerComponent>;

/** Empty picker — click the trigger to open the anchored hour / minute / meridiem columns. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('nge-time-picker-trigger'));
    await waitFor(() =>
      expect(document.querySelector('[data-testid="nge-time-picker-panel"]')).toBeTruthy()
    );
  },
};

/** Pre-selected value, bound through a reactive `FormControl` (12-hour en-US display). */
export const WithValue: Story = {
  render: () => {
    const control = new FormControl<null | string>('14:30');
    return {
      props: { control },
      template: `<nge-time-picker [formControl]="control" locale="en-US"></nge-time-picker>`,
    };
  },
};

/** Same picker under a 24-hour locale — no meridiem column, `00–23` hour labels. */
export const TwentyFourHour: Story = {
  render: () => {
    const control = new FormControl<null | string>('14:30');
    return {
      props: { control },
      template: `<nge-time-picker [formControl]="control" locale="en-GB"></nge-time-picker>`,
    };
  },
};

/** Inclusive `min` / `max` bounds — out-of-range options render disabled. */
export const MinMax: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('nge-time-picker-trigger'));
    await waitFor(() => {
      const early = document.querySelector('[data-testid="nge-time-picker-hour"][data-hour="7"]');
      expect(early?.getAttribute('aria-disabled')).toBe('true');
    });
  },
  render: () => {
    const control = new FormControl<null | string>('12:00');
    return {
      props: { control },
      template: `<nge-time-picker
        [formControl]="control"
        locale="en-GB"
        min="09:00"
        max="17:00"
      ></nge-time-picker>`,
    };
  },
};

/** Coarser granularity — the minute column steps by 15 (00 / 15 / 30 / 45). */
export const MinuteStep: Story = {
  args: { minuteStep: 15 },
};

/**
 * Wrapped in a host that overrides `--nge-calendar-*` tokens — proves the picker (trigger AND the
 * portalled overlay panel) themes purely through the calendar's own CSS-variable namespace,
 * mirroring the `NgeDatePicker` `Themed` story.
 */
export const Themed: Story = {
  render: args => ({
    props: args,
    template: `
      <div style="
        --nge-calendar-accent: #7c3aed;
        --nge-calendar-on-accent: #ffffff;
        --nge-calendar-surface: #faf5ff;
        --nge-calendar-on-surface: #2e1065;
        --nge-calendar-on-surface-variant: #6d28d9;
        --nge-calendar-outline: #c4b5fd;
        --nge-calendar-outline-variant: #d8b4fe;
        --nge-calendar-hover: #f3e8ff;
      ">
        <nge-time-picker
          [placeholder]="placeholder"
          [locale]="locale"
        ></nge-time-picker>
      </div>
    `,
  }),
};

/**
 * The picker driving a reactive form: open it, pick an hour + minute, press Done, and the bound
 * `FormControl` value updates to the canonical 24-hour `HH:mm` live.
 */
export const InReactiveForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('nge-time-picker-trigger'));
    // Seeded from 14:30 → PM half; pick 3 PM (data-hour=15) and :45, then commit with Done.
    await waitFor(() => expect(document.querySelector('[data-hour="15"]')).toBeTruthy());
    await userEvent.click(document.querySelector('[data-hour="15"]') as HTMLElement);
    await userEvent.click(document.querySelector('[data-minute="45"]') as HTMLElement);
    await userEvent.click(
      document.querySelector('[data-testid="nge-time-picker-done"]') as HTMLElement
    );
    await waitFor(() => expect(canvas.getByTestId('form-value').textContent).toContain('15:45'));
  },
  render: () => {
    const control = new FormControl<null | string>('14:30');
    return {
      props: { control },
      template: `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <nge-time-picker [formControl]="control" locale="en-US"></nge-time-picker>
          <p data-testid="form-value">Value: {{ control.value }}</p>
        </div>
      `,
    };
  },
};

/**
 * Opens directly to the analog clock dial (12-hour). Tap a number or drag the hand; picking the hour
 * auto-advances to the minute dial. The in-panel toggle (top-right) flips to the scrollable columns
 * and back, sharing the same draft. 24-hour locales fall back to columns.
 */
export const Clock: Story = {
  args: { selectionMode: 'clock' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('nge-time-picker-trigger'));
    await waitFor(() =>
      expect(document.querySelector('[data-testid="nge-time-picker-dial"]')).toBeTruthy()
    );
  },
};

/**
 * The runtime surface toggle: open to the scrollable columns, then tap the header toggle to switch
 * to the analog dial (the in-progress draft carries across). Demonstrates the dial ⇄ list switch.
 */
export const SurfaceToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('nge-time-picker-trigger'));
    await waitFor(() => expect(document.querySelector('.nge-time-picker__columns')).toBeTruthy());
    await userEvent.click(
      document.querySelector('[data-testid="nge-time-picker-surface-toggle"]') as HTMLElement
    );
    await waitFor(() =>
      expect(document.querySelector('[data-testid="nge-time-picker-dial"]')).toBeTruthy()
    );
  },
};
