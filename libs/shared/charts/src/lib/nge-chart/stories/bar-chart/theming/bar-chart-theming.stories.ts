import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { BarChartThemingComponent } from './bar-chart-theming.component';

const meta: Meta<BarChartThemingComponent> = {
  component: BarChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Bar Chart/Theming',
};

export default meta;
type Story = StoryObj<BarChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
