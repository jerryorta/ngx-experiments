import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { PieChartThemingComponent } from './pie-chart-theming.component';

const meta: Meta<PieChartThemingComponent> = {
  component: PieChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Pie Chart/Theming',
};

export default meta;
type Story = StoryObj<PieChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
