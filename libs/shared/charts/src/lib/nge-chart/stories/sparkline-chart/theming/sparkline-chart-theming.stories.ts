import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeSparklineChartThemingComponent } from './sparkline-chart-theming.component';

const meta: Meta<NgeSparklineChartThemingComponent> = {
  component: NgeSparklineChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Sparkline Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeSparklineChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
