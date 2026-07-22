import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { AreaChartThemingComponent } from './area-chart-theming.component';

const meta: Meta<AreaChartThemingComponent> = {
  component: AreaChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Area Chart/Theming',
};

export default meta;
type Story = StoryObj<AreaChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
