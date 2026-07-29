import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeNetworkChartThemingComponent } from './network-chart-theming.component';

const meta: Meta<NgeNetworkChartThemingComponent> = {
  component: NgeNetworkChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Network Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeNetworkChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
