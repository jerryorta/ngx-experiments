import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { RadarUsageStoriesComponent } from './radar-usage-stories.component';

const meta: Meta<RadarUsageStoriesComponent> = {
  component: RadarUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Radar/Usage',
};

export default meta;
type Story = StoryObj<RadarUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
