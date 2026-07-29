import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeFunnelChartUsageStoriesComponent } from './funnel-chart-usage-stories.component';

const meta: Meta<NgeFunnelChartUsageStoriesComponent> = {
  component: NgeFunnelChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Funnel Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeFunnelChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
