import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { HeatmapChartThemingComponent } from './heatmap-chart-theming.component';

const meta: Meta<HeatmapChartThemingComponent> = {
  component: HeatmapChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Heatmap Chart/Theming',
};

export default meta;
type Story = StoryObj<HeatmapChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
