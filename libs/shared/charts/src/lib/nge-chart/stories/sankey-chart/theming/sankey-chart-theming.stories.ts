import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeSankeyChartThemingComponent } from './sankey-chart-theming.component';

const meta: Meta<NgeSankeyChartThemingComponent> = {
  component: NgeSankeyChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Sankey Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeSankeyChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
