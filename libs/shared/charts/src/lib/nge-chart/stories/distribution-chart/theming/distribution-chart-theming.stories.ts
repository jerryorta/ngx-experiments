import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { DistributionChartThemingComponent } from './distribution-chart-theming.component';

const meta: Meta<DistributionChartThemingComponent> = {
  component: DistributionChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Distribution Chart/Theming',
};

export default meta;
type Story = StoryObj<DistributionChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
