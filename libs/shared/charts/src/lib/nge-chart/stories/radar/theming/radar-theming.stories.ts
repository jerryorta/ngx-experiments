import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeRadarThemingComponent } from './radar-theming.component';

const meta: Meta<NgeRadarThemingComponent> = {
  component: NgeRadarThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Radar/Theming',
};

export default meta;
type Story = StoryObj<NgeRadarThemingComponent>;

export const Theming: Story = {
  args: {},
};
