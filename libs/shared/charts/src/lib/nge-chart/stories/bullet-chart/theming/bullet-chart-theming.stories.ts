import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { BulletChartThemingComponent } from './bullet-chart-theming.component';

const meta: Meta<BulletChartThemingComponent> = {
  component: BulletChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Bullet Chart/Theming',
};

export default meta;
type Story = StoryObj<BulletChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
