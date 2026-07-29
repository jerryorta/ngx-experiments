import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeBulletChartUsageStoriesComponent } from './bullet-chart-usage-stories.component';

const meta: Meta<NgeBulletChartUsageStoriesComponent> = {
  component: NgeBulletChartUsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Bullet Chart/Usage',
};

export default meta;
type Story = StoryObj<NgeBulletChartUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
