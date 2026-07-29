import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeHeatmapChartUsageStoriesComponent } from './heatmap-chart-usage-stories.component';

const meta: Meta<NgeHeatmapChartUsageStoriesComponent> = {
  component: NgeHeatmapChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Heatmap Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeHeatmapChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
