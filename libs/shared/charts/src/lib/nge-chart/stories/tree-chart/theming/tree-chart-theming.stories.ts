import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeTreeChartThemingComponent } from './tree-chart-theming.component';

const meta: Meta<NgeTreeChartThemingComponent> = {
  component: NgeTreeChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Tree Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeTreeChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
