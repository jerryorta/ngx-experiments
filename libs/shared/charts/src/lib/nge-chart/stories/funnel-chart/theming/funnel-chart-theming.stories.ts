import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeFunnelChartThemingComponent } from './funnel-chart-theming.component';

const meta: Meta<NgeFunnelChartThemingComponent> = {
  component: NgeFunnelChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Funnel Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeFunnelChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
