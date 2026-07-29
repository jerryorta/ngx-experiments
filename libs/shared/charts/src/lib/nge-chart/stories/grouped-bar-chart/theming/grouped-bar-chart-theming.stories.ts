import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeGroupedBarChartThemingComponent } from './grouped-bar-chart-theming.component';

const meta: Meta<NgeGroupedBarChartThemingComponent> = {
  component: NgeGroupedBarChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Grouped Bar Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeGroupedBarChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
