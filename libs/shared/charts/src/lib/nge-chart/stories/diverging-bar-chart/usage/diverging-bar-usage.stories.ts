import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeDivergingBarUsageStoriesComponent } from './diverging-bar-usage-stories.component';

const meta: Meta<NgeDivergingBarUsageStoriesComponent> = {
  component: NgeDivergingBarUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Diverging Bar Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeDivergingBarUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
