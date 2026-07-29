import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeSparklineChartUsageStoriesComponent } from './sparkline-chart-usage-stories.component';

const meta: Meta<NgeSparklineChartUsageStoriesComponent> = {
  component: NgeSparklineChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Sparkline Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeSparklineChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
