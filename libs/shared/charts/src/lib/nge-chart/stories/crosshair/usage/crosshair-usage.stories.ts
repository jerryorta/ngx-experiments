import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { CrosshairUsageStoriesComponent } from './crosshair-usage-stories.component';

const meta: Meta<CrosshairUsageStoriesComponent> = {
  component: CrosshairUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Crosshair/Usage',
};

export default meta;
type Story = StoryObj<CrosshairUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
