import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { HistogramChartUsageStoriesComponent } from './histogram-chart-usage-stories.component';

const meta: Meta<HistogramChartUsageStoriesComponent> = {
  component: HistogramChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Histogram Chart/Usage',
};

export default meta;
type Story = StoryObj<HistogramChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
