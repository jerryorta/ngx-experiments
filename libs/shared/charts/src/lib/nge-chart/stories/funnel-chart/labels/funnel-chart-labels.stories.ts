import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeFunnelChartLabelsStoriesComponent } from './funnel-chart-labels-stories.component';

const meta: Meta<NgeFunnelChartLabelsStoriesComponent> = {
  component: NgeFunnelChartLabelsStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Funnel Chart/Labels',
};

export default meta;
type Story = StoryObj<NgeFunnelChartLabelsStoriesComponent>;

export const Labels: Story = {
  args: {},
};
