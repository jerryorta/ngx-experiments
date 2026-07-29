import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableSelectionThemingComponent } from './selection-theming.component';

const meta: Meta<NgeTableSelectionThemingComponent> = {
  component: NgeTableSelectionThemingComponent,
  title: 'Table/NgeTable/Selection/Theming',
};

export default meta;
type Story = StoryObj<NgeTableSelectionThemingComponent>;

export const Theming: Story = {
  args: {},
};
