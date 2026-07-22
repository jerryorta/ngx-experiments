import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { WaterfallChartThemingComponent } from './waterfall-chart-theming.component';

const meta: Meta<WaterfallChartThemingComponent> = {
  component: WaterfallChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Waterfall Chart/Theming',
};

export default meta;
type Story = StoryObj<WaterfallChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
