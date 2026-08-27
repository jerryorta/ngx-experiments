import { type Meta, type StoryObj } from '@storybook/angular';

import { SbWelcomeComponent } from './sb-welcome.component';

/**
 * The story Storybook opens on.
 *
 * Its position is not incidental: `options.storySort` in `.storybook/preview.ts`
 * pins `Welcome` first, and Storybook selects the first story in the sidebar when
 * no `?path=` is supplied. Reordering that list changes what a visitor sees on
 * arrival.
 */
const meta: Meta<SbWelcomeComponent> = {
  component: SbWelcomeComponent,
  title: 'Welcome',
};

export default meta;
type Story = StoryObj<SbWelcomeComponent>;

export const Welcome: Story = {
  args: {},
};
