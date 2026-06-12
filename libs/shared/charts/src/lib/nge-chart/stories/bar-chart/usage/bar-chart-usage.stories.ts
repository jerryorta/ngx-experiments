import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { BarChartUsageStoriesComponent } from './bar-chart-usage-stories.component';

const meta: Meta<BarChartUsageStoriesComponent> = {
  component: BarChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Bar Chart/Usage',
};

export default meta;
type Story = StoryObj<BarChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
