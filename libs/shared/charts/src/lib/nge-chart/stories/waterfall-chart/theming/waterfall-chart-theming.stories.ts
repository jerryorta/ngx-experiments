import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeWaterfallChartThemingComponent } from './waterfall-chart-theming.component';

const meta: Meta<NgeWaterfallChartThemingComponent> = {
  component: NgeWaterfallChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Waterfall Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeWaterfallChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
