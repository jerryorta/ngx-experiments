import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeGaugeThemingComponent } from './gauge-theming.component';

const meta: Meta<NgeGaugeThemingComponent> = {
  component: NgeGaugeThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Gauge/Theming',
};

export default meta;
type Story = StoryObj<NgeGaugeThemingComponent>;

export const Theming: Story = {
  args: {},
};
