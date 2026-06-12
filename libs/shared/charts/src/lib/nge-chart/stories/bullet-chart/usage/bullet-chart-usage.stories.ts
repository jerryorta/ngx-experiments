import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { BulletChartUsageStoriesComponent } from './bullet-chart-usage-stories.component';

const meta: Meta<BulletChartUsageStoriesComponent> = {
  component: BulletChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Bullet Chart/Usage',
};

export default meta;
type Story = StoryObj<BulletChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
