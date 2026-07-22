import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { SparklineChartUsageStoriesComponent } from './sparkline-chart-usage-stories.component';

const meta: Meta<SparklineChartUsageStoriesComponent> = {
  component: SparklineChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Sparkline Chart/Usage',
};

export default meta;
type Story = StoryObj<SparklineChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
