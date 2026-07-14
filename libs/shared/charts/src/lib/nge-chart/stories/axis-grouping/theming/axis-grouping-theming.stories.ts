import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { AxisGroupingThemingComponent } from './axis-grouping-theming.component';

const meta: Meta<AxisGroupingThemingComponent> = {
  component: AxisGroupingThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Axis Grouping Tiers/Theming',
};

export default meta;
type Story = StoryObj<AxisGroupingThemingComponent>;

export const Theming: Story = {
  args: {},
};
