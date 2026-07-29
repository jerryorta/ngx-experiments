import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeLineChartUsageStoriesComponent } from './line-chart-usage-stories.component';

const meta: Meta<NgeLineChartUsageStoriesComponent> = {
  component: NgeLineChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Line Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeLineChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
