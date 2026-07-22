import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { FinancialChartThemingComponent } from './financial-chart-theming.component';

const meta: Meta<FinancialChartThemingComponent> = {
  component: FinancialChartThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Financial Chart/Theming',
};

export default meta;
type Story = StoryObj<FinancialChartThemingComponent>;

export const Theming: Story = {
  args: {},
};
