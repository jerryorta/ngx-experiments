import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeLollipopChartUsageStoriesComponent } from './lollipop-chart-usage-stories.component';

const meta: Meta<NgeLollipopChartUsageStoriesComponent> = {
  component: NgeLollipopChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Lollipop Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeLollipopChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
