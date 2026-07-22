import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { SunburstChartUsageStoriesComponent } from './sunburst-chart-usage-stories.component';

const meta: Meta<SunburstChartUsageStoriesComponent> = {
  component: SunburstChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Sunburst Chart/Usage',
};

export default meta;
type Story = StoryObj<SunburstChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
