import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { NgeDatePickerComponent } from './nge-date-picker.component';

// `nge-date-picker` is a self-contained ControlValueAccessor primitive: a themed
// trigger that opens a CDK-overlay month grid. Form stories bind it through
// `[formControl]`; the `en-US` locale keeps the rendered labels deterministic.

const meta: Meta<NgeDatePickerComponent> = {
  args: { locale: 'en-US', placeholder: 'Select date' },
  component: NgeDatePickerComponent,
  decorators: [
    moduleMetadata({ imports: [ReactiveFormsModule] }),
    applicationConfig({ providers: [provideAnimationsAsync()] }),
  ],
  title: 'Calendar/NgeDatePicker',
};

export default meta;
type Story = StoryObj<NgeDatePickerComponent>;

/** Empty picker — click the trigger to open the anchored month grid. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('nge-date-picker-trigger'));
    await waitFor(() =>
      expect(document.querySelector('[data-testid="nge-date-picker-panel"]')).toBeTruthy()
    );
  },
};

/** Pre-selected value, bound through a reactive `FormControl`. */
export const WithValue: Story = {
  render: () => {
    const control = new FormControl<null | string>('2026-06-15');
    return {
      props: { control },
      template: `<nge-date-picker [formControl]="control" locale="en-US"></nge-date-picker>`,
    };
  },
};

/** Inclusive `min` / `max` bounds — days outside the range render disabled. */
export const MinMax: Story = {
  args: { max: '2026-06-20', min: '2026-06-10' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('nge-date-picker-trigger'));
    await waitFor(() => {
      const below = document.querySelector('[data-date="2026-06-05"]');
      expect(below?.getAttribute('aria-disabled')).toBe('true');
    });
  },
};

/** Same picker with the week grid starting on Monday. */
export const WeekStartsOnMonday: Story = {
  args: { weekStartsOn: 1 },
};

/**
 * Wrapped in a host that overrides `--nge-calendar-*` tokens — proves the picker
 * (trigger AND the portalled overlay panel) themes purely through the calendar's own
 * CSS-variable namespace, mirroring the `NgeCalendar` `Themed` story.
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
        <nge-date-picker
          [placeholder]="placeholder"
          [locale]="locale"
        ></nge-date-picker>
      </div>
    `,
  }),
};

/**
 * The picker driving a reactive form: open it, pick a day, and the bound
 * `FormControl` value updates to the ISO `YYYY-MM-DD` live.
 */
export const InReactiveForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('nge-date-picker-trigger'));
    await waitFor(() => expect(document.querySelector('[data-date="2026-06-22"]')).toBeTruthy());
    await userEvent.click(document.querySelector('[data-date="2026-06-22"]') as HTMLElement);
    await waitFor(() =>
      expect(canvas.getByTestId('form-value').textContent).toContain('2026-06-22')
    );
  },
  render: () => {
    const control = new FormControl<null | string>('2026-06-15');
    return {
      props: { control },
      template: `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <nge-date-picker [formControl]="control" locale="en-US"></nge-date-picker>
          <p data-testid="form-value">Value: {{ control.value }}</p>
        </div>
      `,
    };
  },
};

/**
 * Date-of-birth use case showcasing YEAR selection. Tap the header title ("June 2026 ▾")
 * to flip the panel to a vertically scrollable grid of years (large, mobile-friendly tap
 * targets), then pick a year to jump there. The year range is bounded by `[min]`/`[max]`.
 * The play() opens the picker and reveals the year grid.
 */
export const Birthday: Story = {
  args: { max: '2026-12-31', min: '1920-01-01', placeholder: 'Date of birth' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('nge-date-picker-trigger'));
    await waitFor(() =>
      expect(document.querySelector('[data-testid="nge-date-picker-title"]')).toBeTruthy()
    );
    await userEvent.click(
      document.querySelector('[data-testid="nge-date-picker-title"]') as HTMLElement
    );
    await waitFor(() =>
      expect(document.querySelector('[data-testid="nge-date-picker-years"]')).toBeTruthy()
    );
  },
};
