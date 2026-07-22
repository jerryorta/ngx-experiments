import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { BumpChartThemingComponent } from './bump-chart-theming.component';

const meta: Meta<BumpChartThemingComponent> = {
  component: BumpChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Bump Chart/Theming',
};

export default meta;
type Story = StoryObj<BumpChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
