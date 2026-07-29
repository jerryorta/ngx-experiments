import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeScatterChartThemingComponent } from './scatter-chart-theming.component';

const meta: Meta<NgeScatterChartThemingComponent> = {
  component: NgeScatterChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Scatter Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeScatterChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
