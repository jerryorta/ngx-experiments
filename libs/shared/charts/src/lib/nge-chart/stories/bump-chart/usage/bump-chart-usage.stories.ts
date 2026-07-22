import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { BumpChartUsageStoriesComponent } from './bump-chart-usage-stories.component';

const meta: Meta<BumpChartUsageStoriesComponent> = {
  component: BumpChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Bump Chart/Usage',
};

export default meta;
type Story = StoryObj<BumpChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
