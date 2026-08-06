import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeWelcomeComponent } from './nge-welcome.component';

/**
 * The story Storybook opens on.
 *
 * Its position is not incidental: `options.storySort` in `.storybook/preview.ts`
 * pins `Welcome` first, and Storybook selects the first story in the sidebar when
 * no `?path=` is supplied. Reordering that list changes what a visitor sees on
 * arrival.
 */
const meta: Meta<NgeWelcomeComponent> = {
  component: NgeWelcomeComponent,
  title: 'Welcome',
};

export default meta;
type Story = StoryObj<NgeWelcomeComponent>;

export const Welcome: Story = {
  args: {},
};
