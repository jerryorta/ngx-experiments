import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeLollipopChartThemingComponent } from './lollipop-chart-theming.component';

const meta: Meta<NgeLollipopChartThemingComponent> = {
  component: NgeLollipopChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Lollipop Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeLollipopChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
