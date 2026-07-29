import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeSunburstChartThemingComponent } from './sunburst-chart-theming.component';

const meta: Meta<NgeSunburstChartThemingComponent> = {
  component: NgeSunburstChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Sunburst Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeSunburstChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
