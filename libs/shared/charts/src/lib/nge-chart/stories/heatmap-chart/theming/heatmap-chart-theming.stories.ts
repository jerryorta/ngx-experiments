import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeHeatmapChartThemingComponent } from './heatmap-chart-theming.component';

const meta: Meta<NgeHeatmapChartThemingComponent> = {
  component: NgeHeatmapChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Heatmap Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeHeatmapChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
