import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeLineChartThemingComponent } from './line-chart-theming.component';

const meta: Meta<NgeLineChartThemingComponent> = {
  component: NgeLineChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Line Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeLineChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
