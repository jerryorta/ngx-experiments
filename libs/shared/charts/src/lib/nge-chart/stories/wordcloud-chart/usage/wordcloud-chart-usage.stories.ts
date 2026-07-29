import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeWordCloudChartUsageStoriesComponent } from './wordcloud-chart-usage-stories.component';

const meta: Meta<NgeWordCloudChartUsageStoriesComponent> = {
  component: NgeWordCloudChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Word Cloud Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeWordCloudChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
