import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcBatteryMeterComponent } from '../dlc-battery-meter.component';
import { DlcBatteryMeterStoriesComponent } from './dlc-battery-meter-stories.component';

const meta: Meta<DlcBatteryMeterStoriesComponent> = {
  argTypes: {
    colorMap: { control: 'object' },
    showIcon: { control: 'boolean' },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    states: { control: 'object' },
    trailingLabel: { control: 'text' },
  },
  component: DlcBatteryMeterStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Battery Meter',
};

export default meta;
type Story = StoryObj<DlcBatteryMeterStoriesComponent>;

export const primary: Story = {
  args: {
    showIcon: true,
    size: 'md',
    states: [
      'done',
      'done',
      'done',
      'in-progress',
      'in-progress',
      'default',
      'default',
      'default',
      'default',
      'default',
    ],
    trailingLabel: 'May 30',
  },
  name: 'Battery Meter',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcBatteryMeterComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-battery-meter [states]="['done','done','in-progress','default','default']" trailingLabel="May 30" size="md" />
        </div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-battery-meter [states]="['done','done','in-progress','default','default']" trailingLabel="May 30" size="md" />
        </div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)">
          <dlc-battery-meter [states]="['done','done','in-progress','default','default']" trailingLabel="May 30" size="md" />
        </div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)">
          <dlc-battery-meter [states]="['done','done','in-progress','default','default']" trailingLabel="May 30" size="md" />
        </div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)">
          <dlc-battery-meter [states]="['done','done','in-progress','default','default']" trailingLabel="May 30" size="md" />
        </div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)">
          <dlc-battery-meter [states]="['done','done','in-progress','default','default']" trailingLabel="May 30" size="md" />
        </div>
      </div>`,
  }),
};
