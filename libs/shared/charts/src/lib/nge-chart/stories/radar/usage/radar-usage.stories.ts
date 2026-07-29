import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeRadarUsageStoriesComponent } from './radar-usage-stories.component';

const meta: Meta<NgeRadarUsageStoriesComponent> = {
  component: NgeRadarUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Radar/Usage',
};

export default meta;
type Story = StoryObj<NgeRadarUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
