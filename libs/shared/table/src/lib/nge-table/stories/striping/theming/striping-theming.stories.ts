import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableStripingThemingComponent } from './striping-theming.component';

const meta: Meta<NgeTableStripingThemingComponent> = {
  component: NgeTableStripingThemingComponent,
  title: 'Table/NgeTable/Striping/Theming',
};

export default meta;
type Story = StoryObj<NgeTableStripingThemingComponent>;

export const Theming: Story = {
  args: {},
};
