import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeRadialBarThemingComponent } from './radial-bar-theming.component';

const meta: Meta<NgeRadialBarThemingComponent> = {
  component: NgeRadialBarThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Radial Bar/Theming',
};

export default meta;
type Story = StoryObj<NgeRadialBarThemingComponent>;

export const Theming: Story = {
  args: {},
};
