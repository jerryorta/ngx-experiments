import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { ScatterChartUsageStoriesComponent } from './scatter-chart-usage-stories.component';

const meta: Meta<ScatterChartUsageStoriesComponent> = {
  component: ScatterChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Scatter Chart/Usage',
};

export default meta;
type Story = StoryObj<ScatterChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
