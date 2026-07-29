import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeProportionalChartThemingComponent } from './proportional-chart-theming.component';

const meta: Meta<NgeProportionalChartThemingComponent> = {
  component: NgeProportionalChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Proportional Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeProportionalChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
