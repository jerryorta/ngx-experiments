import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { LineChartThemingComponent } from './line-chart-theming.component';

const meta: Meta<LineChartThemingComponent> = {
  component: LineChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Line Chart/Theming',
};

export default meta;
type Story = StoryObj<LineChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
