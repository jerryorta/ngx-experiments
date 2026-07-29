import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeOverlayUsageStoriesComponent } from './overlay-usage-stories.component';

const meta: Meta<NgeOverlayUsageStoriesComponent> = {
  component: NgeOverlayUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Overlay/Usage',
};

export default meta;
type Story = StoryObj<NgeOverlayUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
