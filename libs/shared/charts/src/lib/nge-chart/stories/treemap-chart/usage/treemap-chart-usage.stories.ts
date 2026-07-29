import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeTreemapChartUsageStoriesComponent } from './treemap-chart-usage-stories.component';

const meta: Meta<NgeTreemapChartUsageStoriesComponent> = {
  component: NgeTreemapChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Treemap Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeTreemapChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
