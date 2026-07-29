import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeParallelCoordsChartThemingComponent } from './parallel-coords-chart-theming.component';

const meta: Meta<NgeParallelCoordsChartThemingComponent> = {
  component: NgeParallelCoordsChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Parallel Coordinates/Theming',
};

export default meta;
type Story = StoryObj<NgeParallelCoordsChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
