import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeProportionalChartUsageStoriesComponent } from './proportional-chart-usage-stories.component';

const meta: Meta<NgeProportionalChartUsageStoriesComponent> = {
  component: NgeProportionalChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Proportional Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeProportionalChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
