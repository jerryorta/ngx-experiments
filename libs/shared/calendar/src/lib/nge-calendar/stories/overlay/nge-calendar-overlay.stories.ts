import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeCalendarOverlayStoriesComponent } from './nge-calendar-overlay-stories.component';

// ARCH-147 — event-click overlay popup. Selecting an event opens an anchored CDK
// overlay; the CustomOverlay story reads the typed `event.data` payload inside its
// `#ngeCalendarEventOverlay` template, so `build-storybook` (strictTemplates)
// proves the generic `T` flows from `[config]` into the overlay context.

const meta: Meta<NgeCalendarOverlayStoriesComponent> = {
  component: NgeCalendarOverlayStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Calendar/NgeCalendar/Event Overlay',
};

export default meta;
type Story = StoryObj<NgeCalendarOverlayStoriesComponent>;

/** Default built-in overlay body — title, colour swatch, formatted time. */
export const DefaultOverlay: Story = {
  args: { variant: 'default' },
};

/** Host-supplied template reading the typed `event.data` payload (inference guard). */
export const CustomOverlay: Story = {
  args: { variant: 'custom' },
};

/** Default body under a `--nge-calendar-*` theme override; the pane inherits it. */
export const Theming: Story = {
  args: { variant: 'themed' },
};
