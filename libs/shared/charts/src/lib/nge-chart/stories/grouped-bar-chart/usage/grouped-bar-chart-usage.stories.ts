import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeGroupedBarChartUsageStoriesComponent } from './grouped-bar-chart-usage-stories.component';

const meta: Meta<NgeGroupedBarChartUsageStoriesComponent> = {
  component: NgeGroupedBarChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Grouped Bar Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeGroupedBarChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
