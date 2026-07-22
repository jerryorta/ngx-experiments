import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { WaterfallChartUsageStoriesComponent } from './waterfall-chart-usage-stories.component';

const meta: Meta<WaterfallChartUsageStoriesComponent> = {
  component: WaterfallChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Waterfall Chart/Usage',
};

export default meta;
type Story = StoryObj<WaterfallChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
