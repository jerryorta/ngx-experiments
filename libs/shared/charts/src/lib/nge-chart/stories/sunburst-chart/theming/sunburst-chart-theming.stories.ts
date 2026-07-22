import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { SunburstChartThemingComponent } from './sunburst-chart-theming.component';

const meta: Meta<SunburstChartThemingComponent> = {
  component: SunburstChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Sunburst Chart/Theming',
};

export default meta;
type Story = StoryObj<SunburstChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
