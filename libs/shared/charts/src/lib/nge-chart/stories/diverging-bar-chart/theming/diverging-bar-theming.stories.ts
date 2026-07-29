import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeDivergingBarThemingComponent } from './diverging-bar-theming.component';

const meta: Meta<NgeDivergingBarThemingComponent> = {
  component: NgeDivergingBarThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Diverging Bar Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeDivergingBarThemingComponent>;

export const Theming: Story = {
  args: {},
};
