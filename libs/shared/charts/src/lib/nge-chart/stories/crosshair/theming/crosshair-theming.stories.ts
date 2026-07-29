import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeCrosshairThemingStoriesComponent } from './crosshair-theming-stories.component';

const meta: Meta<NgeCrosshairThemingStoriesComponent> = {
  component: NgeCrosshairThemingStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Crosshair/Theming',
};

export default meta;
type Story = StoryObj<NgeCrosshairThemingStoriesComponent>;

export const Theming: Story = {
  args: {},
};
