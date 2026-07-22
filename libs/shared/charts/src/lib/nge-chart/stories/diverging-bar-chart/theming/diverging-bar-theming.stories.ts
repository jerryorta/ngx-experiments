import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { DivergingBarThemingComponent } from './diverging-bar-theming.component';

const meta: Meta<DivergingBarThemingComponent> = {
  component: DivergingBarThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Diverging Bar Chart/Theming',
};

export default meta;
type Story = StoryObj<DivergingBarThemingComponent>;

export const Theming: Story = {
  args: {},
};
