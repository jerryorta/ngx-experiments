import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeSankeyChartUsageStoriesComponent } from './sankey-chart-usage-stories.component';

const meta: Meta<NgeSankeyChartUsageStoriesComponent> = {
  component: NgeSankeyChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Sankey Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeSankeyChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
