import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { GroupedBarChartUsageStoriesComponent } from './grouped-bar-chart-usage-stories.component';

const meta: Meta<GroupedBarChartUsageStoriesComponent> = {
  component: GroupedBarChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Grouped Bar Chart/Usage',
};

export default meta;
type Story = StoryObj<GroupedBarChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
