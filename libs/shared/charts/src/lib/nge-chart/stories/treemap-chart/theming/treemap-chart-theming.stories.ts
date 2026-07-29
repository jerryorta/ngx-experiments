import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeTreemapChartThemingComponent } from './treemap-chart-theming.component';

const meta: Meta<NgeTreemapChartThemingComponent> = {
  component: NgeTreemapChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Treemap Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeTreemapChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
