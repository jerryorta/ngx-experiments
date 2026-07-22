import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { CrosshairThemingStoriesComponent } from './crosshair-theming-stories.component';

const meta: Meta<CrosshairThemingStoriesComponent> = {
  component: CrosshairThemingStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Crosshair/Theming',
};

export default meta;
type Story = StoryObj<CrosshairThemingStoriesComponent>;

export const Theming: Story = {
  args: {},
};
