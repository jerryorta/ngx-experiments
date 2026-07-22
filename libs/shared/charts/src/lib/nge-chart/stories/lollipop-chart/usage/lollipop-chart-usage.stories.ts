import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { LollipopChartUsageStoriesComponent } from './lollipop-chart-usage-stories.component';

const meta: Meta<LollipopChartUsageStoriesComponent> = {
  component: LollipopChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Lollipop Chart/Usage',
};

export default meta;
type Story = StoryObj<LollipopChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
