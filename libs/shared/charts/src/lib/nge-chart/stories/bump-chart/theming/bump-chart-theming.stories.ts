import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeBumpChartThemingComponent } from './bump-chart-theming.component';

const meta: Meta<NgeBumpChartThemingComponent> = {
  component: NgeBumpChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Bump Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeBumpChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
