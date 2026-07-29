import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeParallelCoordsChartUsageStoriesComponent } from './parallel-coords-chart-usage-stories.component';

const meta: Meta<NgeParallelCoordsChartUsageStoriesComponent> = {
  component: NgeParallelCoordsChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Parallel Coordinates/Usage',
};

export default meta;
type Story = StoryObj<NgeParallelCoordsChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
