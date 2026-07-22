import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { TimelineChartThemingComponent } from './timeline-chart-theming.component';

const meta: Meta<TimelineChartThemingComponent> = {
  component: TimelineChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Timeline Chart/Theming',
};

export default meta;
type Story = StoryObj<TimelineChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
