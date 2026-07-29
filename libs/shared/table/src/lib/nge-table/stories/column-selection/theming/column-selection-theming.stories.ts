import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableColumnSelectionThemingComponent } from './column-selection-theming.component';

const meta: Meta<NgeTableColumnSelectionThemingComponent> = {
  component: NgeTableColumnSelectionThemingComponent,
  title: 'Table/NgeTable/Column Selection/Theming',
};

export default meta;
type Story = StoryObj<NgeTableColumnSelectionThemingComponent>;

export const Theming: Story = {
  args: {},
};
