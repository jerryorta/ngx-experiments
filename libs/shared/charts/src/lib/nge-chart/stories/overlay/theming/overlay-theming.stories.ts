import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { OverlayThemingComponent } from './overlay-theming.component';

const meta: Meta<OverlayThemingComponent> = {
  component: OverlayThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Overlay/Theming',
};

export default meta;
type Story = StoryObj<OverlayThemingComponent>;

export const Theming: Story = {
  args: {},
};
