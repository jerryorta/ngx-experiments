import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeParetoChartThemingComponent } from './pareto-chart-theming.component';

const meta: Meta<NgeParetoChartThemingComponent> = {
  component: NgeParetoChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Pareto Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeParetoChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
