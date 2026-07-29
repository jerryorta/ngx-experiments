import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeRadialBarUsageStoriesComponent } from './radial-bar-usage-stories.component';

const meta: Meta<NgeRadialBarUsageStoriesComponent> = {
  component: NgeRadialBarUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Radial Bar/Usage',
};

export default meta;
type Story = StoryObj<NgeRadialBarUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
