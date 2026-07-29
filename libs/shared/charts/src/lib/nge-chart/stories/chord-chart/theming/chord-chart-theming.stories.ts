import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeChordChartThemingComponent } from './chord-chart-theming.component';

const meta: Meta<NgeChordChartThemingComponent> = {
  component: NgeChordChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Chord Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeChordChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
