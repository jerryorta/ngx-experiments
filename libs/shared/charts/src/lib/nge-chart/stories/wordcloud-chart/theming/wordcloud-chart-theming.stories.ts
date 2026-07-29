import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeWordCloudChartThemingComponent } from './wordcloud-chart-theming.component';

const meta: Meta<NgeWordCloudChartThemingComponent> = {
  component: NgeWordCloudChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Word Cloud Chart/Theming',
};

export default meta;
type Story = StoryObj<NgeWordCloudChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
