import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { GroupedBarChartThemingComponent } from './grouped-bar-chart-theming.component';

const meta: Meta<GroupedBarChartThemingComponent> = {
  component: GroupedBarChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Grouped Bar Chart/Theming',
};

export default meta;
type Story = StoryObj<GroupedBarChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
