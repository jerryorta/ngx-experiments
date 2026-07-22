import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { ComparisonAreaChartThemingComponent } from './comparison-area-chart-theming.component';

const meta: Meta<ComparisonAreaChartThemingComponent> = {
  component: ComparisonAreaChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Comparison Area Chart/Theming',
};

export default meta;
type Story = StoryObj<ComparisonAreaChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
