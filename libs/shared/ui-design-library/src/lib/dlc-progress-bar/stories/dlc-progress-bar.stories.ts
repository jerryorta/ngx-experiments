import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcProgressBarComponent } from '../dlc-progress-bar.component';
import { DlcProgressBarStoriesComponent } from './dlc-progress-bar-stories.component';

const meta: Meta<DlcProgressBarStoriesComponent> = {
  argTypes: {
    label: { control: 'text' },
    mode: {
      control: { type: 'select' },
      options: ['determinate', 'indeterminate'],
    },
    value: { control: { max: 100, min: 0, step: 1, type: 'range' } },
  },
  component: DlcProgressBarStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Progress Bar',
};

export default meta;
type Story = StoryObj<DlcProgressBarStoriesComponent>;

export const primary: Story = {
  args: {
    mode: 'determinate',
    value: 50,
  },
  name: 'Progress Bar',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcProgressBarComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-progress-bar [value]="60" label="Professional Dark"></dlc-progress-bar>
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-progress-bar [value]="60" label="Professional Light"></dlc-progress-bar>
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-progress-bar [value]="60" label="Home Dark"></dlc-progress-bar>
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-progress-bar [value]="60" label="Home Light"></dlc-progress-bar>
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-progress-bar [value]="60" label="Service Provider Dark"></dlc-progress-bar>
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-progress-bar [value]="60" label="Service Provider Light"></dlc-progress-bar>
        </div>
      </div>`,
  }),
};
