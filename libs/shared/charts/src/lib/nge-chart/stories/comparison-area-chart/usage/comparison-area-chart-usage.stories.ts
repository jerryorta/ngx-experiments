import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeComparisonAreaChartUsageStoriesComponent } from './comparison-area-chart-usage-stories.component';

const meta: Meta<NgeComparisonAreaChartUsageStoriesComponent> = {
  component: NgeComparisonAreaChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Comparison Area Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeComparisonAreaChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
