import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { AreaChartUsageStoriesComponent } from './area-chart-usage-stories.component';

const meta: Meta<AreaChartUsageStoriesComponent> = {
  component: AreaChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Area Chart/Usage',
};

export default meta;
type Story = StoryObj<AreaChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
