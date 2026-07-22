import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { OverlayUsageStoriesComponent } from './overlay-usage-stories.component';

const meta: Meta<OverlayUsageStoriesComponent> = {
  component: OverlayUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Overlay/Usage',
};

export default meta;
type Story = StoryObj<OverlayUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
