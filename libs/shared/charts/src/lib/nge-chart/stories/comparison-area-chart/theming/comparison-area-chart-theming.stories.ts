import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeComparisonAreaChartThemingComponent } from './comparison-area-chart-theming.component';

const meta: Meta<NgeComparisonAreaChartThemingComponent> = {
  component: NgeComparisonAreaChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Comparison Area Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeComparisonAreaChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
