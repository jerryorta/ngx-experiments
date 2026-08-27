import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';

import {
  DLC_ROTUNDA_ALL_HALLS,
  DLC_ROTUNDA_CORE_HALLS,
  DLC_ROTUNDA_MONOGRAM_HALLS,
  DlcRotundaStoriesComponent,
} from './dlc-rotunda-stories.component';

const meta: Meta<DlcRotundaStoriesComponent> = {
  argTypes: {
    coachMark: { control: 'boolean' },
    doorways: { control: 'object' },
    open: { control: 'boolean' },
  },
  component: DlcRotundaStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'Mobile Footer Nav/Rotunda',
};

export default meta;
type Story = StoryObj<DlcRotundaStoriesComponent>;

/** The resting oculus — tap it to bloom. */
export const Closed: Story = {
  args: {
    doorways: DLC_ROTUNDA_CORE_HALLS,
    open: false,
  },
};

/** First run: the oculus has to teach its own gesture before it can be used (COG-60). */
export const Coaching: Story = {
  args: {
    coachMark: true,
    doorways: DLC_ROTUNDA_CORE_HALLS,
    open: false,
  },
};

/** The design sketch's fan — five doorways, 96px from the anchor, spread across ±68°. */
export const BloomedFiveHalls: Story = {
  args: {
    doorways: DLC_ROTUNDA_CORE_HALLS,
    open: true,
  },
};

/** Eight doorways: the fan widens and pushes outward rather than crowding. */
export const BloomedEightHalls: Story = {
  args: {
    doorways: DLC_ROTUNDA_ALL_HALLS,
    open: true,
  },
};

/** The alternate serif-monogram glyph treatment. */
export const BloomedMonograms: Story = {
  args: {
    doorways: DLC_ROTUNDA_MONOGRAM_HALLS,
    open: true,
  },
};

export const SingleHall: Story = {
  args: {
    doorways: [DLC_ROTUNDA_CORE_HALLS[0]],
    open: true,
  },
};
