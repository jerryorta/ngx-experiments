import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeParetoChartUsageStoriesComponent } from './pareto-chart-usage-stories.component';

const meta: Meta<NgeParetoChartUsageStoriesComponent> = {
  component: NgeParetoChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Pareto Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeParetoChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
