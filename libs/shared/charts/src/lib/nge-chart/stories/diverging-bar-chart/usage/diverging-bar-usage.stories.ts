import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { DivergingBarUsageStoriesComponent } from './diverging-bar-usage-stories.component';

const meta: Meta<DivergingBarUsageStoriesComponent> = {
  component: DivergingBarUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Diverging Bar Chart/Usage',
};

export default meta;
type Story = StoryObj<DivergingBarUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
