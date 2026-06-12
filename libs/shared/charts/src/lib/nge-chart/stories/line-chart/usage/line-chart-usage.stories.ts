import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { LineChartUsageStoriesComponent } from './line-chart-usage-stories.component';

const meta: Meta<LineChartUsageStoriesComponent> = {
  component: LineChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Line Chart/Usage',
};

export default meta;
type Story = StoryObj<LineChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
