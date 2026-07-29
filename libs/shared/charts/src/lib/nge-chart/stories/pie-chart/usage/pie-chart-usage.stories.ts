import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgePieChartUsageStoriesComponent } from './pie-chart-usage-stories.component';

const meta: Meta<NgePieChartUsageStoriesComponent> = {
  component: NgePieChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Pie Chart/Usage',
};

export default meta;
type Story = StoryObj<NgePieChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
