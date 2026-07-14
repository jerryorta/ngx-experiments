import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { ScatterChartThemingComponent } from './scatter-chart-theming.component';

const meta: Meta<ScatterChartThemingComponent> = {
  component: ScatterChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Scatter Chart/Theming',
};

export default meta;
type Story = StoryObj<ScatterChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
