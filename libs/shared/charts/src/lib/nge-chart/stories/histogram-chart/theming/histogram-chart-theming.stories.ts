import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { HistogramChartThemingComponent } from './histogram-chart-theming.component';

const meta: Meta<HistogramChartThemingComponent> = {
  component: HistogramChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Histogram Chart/Theming',
};

export default meta;
type Story = StoryObj<HistogramChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
