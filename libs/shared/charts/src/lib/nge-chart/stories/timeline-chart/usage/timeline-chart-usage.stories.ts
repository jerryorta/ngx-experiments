import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeTimelineChartUsageStoriesComponent } from './timeline-chart-usage-stories.component';

const meta: Meta<NgeTimelineChartUsageStoriesComponent> = {
  component: NgeTimelineChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Timeline Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeTimelineChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
