import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeAreaChartThemingComponent } from './area-chart-theming.component';

const meta: Meta<NgeAreaChartThemingComponent> = {
  component: NgeAreaChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Area Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeAreaChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
