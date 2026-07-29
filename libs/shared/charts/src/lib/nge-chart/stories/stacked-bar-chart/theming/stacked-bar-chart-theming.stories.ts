import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeStackedBarChartThemingComponent } from './stacked-bar-chart-theming.component';

const meta: Meta<NgeStackedBarChartThemingComponent> = {
  component: NgeStackedBarChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Stacked Bar Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeStackedBarChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
