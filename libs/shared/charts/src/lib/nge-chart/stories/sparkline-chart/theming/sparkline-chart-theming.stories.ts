import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { SparklineChartThemingComponent } from './sparkline-chart-theming.component';

const meta: Meta<SparklineChartThemingComponent> = {
  component: SparklineChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Sparkline Chart/Theming',
};

export default meta;
type Story = StoryObj<SparklineChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
