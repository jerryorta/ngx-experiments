import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { CalendarOverviewStoriesComponent } from './calendar-overview-stories.component';

const meta: Meta<CalendarOverviewStoriesComponent> = {
  component: CalendarOverviewStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Calendar/NgeCalendar/Overview',
};

export default meta;
type Story = StoryObj<CalendarOverviewStoriesComponent>;

export const Overview: Story = {
  args: {},
};
