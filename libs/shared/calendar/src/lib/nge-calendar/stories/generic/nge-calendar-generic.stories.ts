import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeCalendarGenericStoriesComponent } from './nge-calendar-generic-stories.component';

// ARCH-146 — typed-payload inference guard. The host binds
// `NgeCalendarConfig<AppointmentMeta>` to `[config]` and reads `$event.event.data`
// (a domain field) in its typed `(eventClick)`/`(eventDrop)`/`(eventResize)`
// handlers. `build-storybook` (strictTemplates) FAILS if the phantom `T` does NOT
// flow from `[config]` through to `$event` — the guard the ticket mandates.

const meta: Meta<NgeCalendarGenericStoriesComponent> = {
  component: NgeCalendarGenericStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Calendar/NgeCalendar/Typed Payload',
};

export default meta;
type Story = StoryObj<NgeCalendarGenericStoriesComponent>;

export const TypedPayload: Story = {
  args: {},
};
