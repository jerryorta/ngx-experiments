import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { RadarThemingComponent } from './radar-theming.component';

const meta: Meta<RadarThemingComponent> = {
  component: RadarThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Radar/Theming',
};

export default meta;
type Story = StoryObj<RadarThemingComponent>;

export const Theming: Story = {
  args: {},
};
