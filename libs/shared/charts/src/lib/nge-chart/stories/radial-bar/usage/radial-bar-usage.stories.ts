import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { RadialBarUsageStoriesComponent } from './radial-bar-usage-stories.component';

const meta: Meta<RadialBarUsageStoriesComponent> = {
  component: RadialBarUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Radial Bar/Usage',
};

export default meta;
type Story = StoryObj<RadialBarUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
