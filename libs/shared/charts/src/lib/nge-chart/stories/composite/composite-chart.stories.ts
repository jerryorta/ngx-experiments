import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { CompositeChartStoriesComponent } from './composite-chart-stories.component';

const meta: Meta<CompositeChartStoriesComponent> = {
  component: CompositeChartStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Composite Charts',
};

export default meta;
type Story = StoryObj<CompositeChartStoriesComponent>;

export const BarWithTrendLines: Story = {
  args: {},
};
