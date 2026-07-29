import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeFinancialChartUsageStoriesComponent } from './financial-chart-usage-stories.component';

const meta: Meta<NgeFinancialChartUsageStoriesComponent> = {
  component: NgeFinancialChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Financial Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeFinancialChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
