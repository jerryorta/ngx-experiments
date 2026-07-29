import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeBarChartThemingComponent } from './bar-chart-theming.component';

const meta: Meta<NgeBarChartThemingComponent> = {
  component: NgeBarChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Bar Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeBarChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
