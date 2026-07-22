import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { StackedBarChartUsageStoriesComponent } from './stacked-bar-chart-usage-stories.component';

const meta: Meta<StackedBarChartUsageStoriesComponent> = {
  component: StackedBarChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Stacked Bar Chart/Usage',
};

export default meta;
type Story = StoryObj<StackedBarChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
