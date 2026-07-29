import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeAxisGroupingUsageStoriesComponent } from './axis-grouping-usage-stories.component';

const meta: Meta<NgeAxisGroupingUsageStoriesComponent> = {
  component: NgeAxisGroupingUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Axis Grouping Tiers/Usage',
};

export default meta;
type Story = StoryObj<NgeAxisGroupingUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
