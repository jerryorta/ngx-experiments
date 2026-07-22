import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { GaugeThemingComponent } from './gauge-theming.component';

const meta: Meta<GaugeThemingComponent> = {
  component: GaugeThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Gauge/Theming',
};

export default meta;
type Story = StoryObj<GaugeThemingComponent>;

export const Theming: Story = {
  args: {},
};
