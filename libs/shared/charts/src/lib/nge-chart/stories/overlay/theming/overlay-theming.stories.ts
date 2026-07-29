import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeOverlayThemingComponent } from './overlay-theming.component';

const meta: Meta<NgeOverlayThemingComponent> = {
  component: NgeOverlayThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Overlay/Theming',
};

export default meta;
type Story = StoryObj<NgeOverlayThemingComponent>;

export const Theming: Story = {
  args: {},
};
