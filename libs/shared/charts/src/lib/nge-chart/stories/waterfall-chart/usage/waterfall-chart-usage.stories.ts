import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeWaterfallChartUsageStoriesComponent } from './waterfall-chart-usage-stories.component';

const meta: Meta<NgeWaterfallChartUsageStoriesComponent> = {
  component: NgeWaterfallChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Waterfall Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeWaterfallChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
