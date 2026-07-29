import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeChordChartUsageStoriesComponent } from './chord-chart-usage-stories.component';

const meta: Meta<NgeChordChartUsageStoriesComponent> = {
  component: NgeChordChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Chord Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeChordChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
