import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeHistogramChartThemingComponent } from './histogram-chart-theming.component';

const meta: Meta<NgeHistogramChartThemingComponent> = {
  component: NgeHistogramChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Histogram Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeHistogramChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
