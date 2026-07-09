import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeCalendarFilterStoriesComponent } from './nge-calendar-filter-stories.component';

// ARCH-149 — cross-view filter funnel. A funnel in the header opens an anchored
// CDK Overlay popover whose facets (search / colour / timing) narrow EVERY view.
// The HostCustomPanel story reads the typed `event.data` payload inside its
// `#ngeCalendarFilter` predicate, so `build-storybook` (strictTemplates) proves
// the generic `T` flows from `[config]` into the filter context.

const meta: Meta<NgeCalendarFilterStoriesComponent> = {
  component: NgeCalendarFilterStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Calendar/NgeCalendar/Filter',
};

export default meta;
type Story = StoryObj<NgeCalendarFilterStoriesComponent>;

/** Built-in funnel — search / colour / timing facets narrow all views. */
export const DefaultFilter: Story = {
  args: { variant: 'default' },
};

/** Host `#ngeCalendarFilter` template calling `apply(predicate)` / `setFilter`. */
export const HostCustomPanel: Story = {
  args: { variant: 'host' },
};

/** External `config.eventFilter` predicate, toggled outside the funnel. */
export const ConfigPredicate: Story = {
  args: { variant: 'config' },
};

/** Default funnel under a `--nge-calendar-*` theme override; the pane inherits it. */
export const Theming: Story = {
  args: { variant: 'themed' },
};
