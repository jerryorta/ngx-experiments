import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeGaugeUsageStoriesComponent } from './gauge-usage-stories.component';

const meta: Meta<NgeGaugeUsageStoriesComponent> = {
  component: NgeGaugeUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Gauge/Usage',
};

export default meta;
type Story = StoryObj<NgeGaugeUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
