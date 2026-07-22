import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { DistributionChartUsageStoriesComponent } from './distribution-chart-usage-stories.component';

const meta: Meta<DistributionChartUsageStoriesComponent> = {
  component: DistributionChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Distribution Chart/Usage',
};

export default meta;
type Story = StoryObj<DistributionChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
