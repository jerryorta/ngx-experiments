import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeTimelineChartThemingComponent } from './timeline-chart-theming.component';

const meta: Meta<NgeTimelineChartThemingComponent> = {
  component: NgeTimelineChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Timeline Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeTimelineChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
