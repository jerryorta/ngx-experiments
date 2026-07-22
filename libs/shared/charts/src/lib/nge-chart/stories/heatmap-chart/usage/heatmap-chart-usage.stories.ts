import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { HeatmapChartUsageStoriesComponent } from './heatmap-chart-usage-stories.component';

const meta: Meta<HeatmapChartUsageStoriesComponent> = {
  component: HeatmapChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Heatmap Chart/Usage',
};

export default meta;
type Story = StoryObj<HeatmapChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
