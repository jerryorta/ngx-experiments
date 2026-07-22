import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { ParetoChartThemingComponent } from './pareto-chart-theming.component';

const meta: Meta<ParetoChartThemingComponent> = {
  component: ParetoChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Pareto Chart/Theming',
};

export default meta;
type Story = StoryObj<ParetoChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
