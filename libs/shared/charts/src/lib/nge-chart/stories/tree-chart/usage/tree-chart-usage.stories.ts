import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeTreeChartUsageStoriesComponent } from './tree-chart-usage-stories.component';

const meta: Meta<NgeTreeChartUsageStoriesComponent> = {
  component: NgeTreeChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Tree Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeTreeChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
