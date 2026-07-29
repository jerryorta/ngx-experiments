import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeAreaChartUsageStoriesComponent } from './area-chart-usage-stories.component';

const meta: Meta<NgeAreaChartUsageStoriesComponent> = {
  component: NgeAreaChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Area Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeAreaChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
