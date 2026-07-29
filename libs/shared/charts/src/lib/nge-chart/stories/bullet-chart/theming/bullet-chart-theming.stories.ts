import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeBulletChartThemingComponent } from './bullet-chart-theming.component';

const meta: Meta<NgeBulletChartThemingComponent> = {
  component: NgeBulletChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Bullet Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeBulletChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
