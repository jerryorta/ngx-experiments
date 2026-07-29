import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableCellSelectThemingComponent } from './cell-select-theming.component';

const meta: Meta<NgeTableCellSelectThemingComponent> = {
  component: NgeTableCellSelectThemingComponent,
  title: 'Table/NgeTable/Cell Select/Theming',
};

export default meta;
type Story = StoryObj<NgeTableCellSelectThemingComponent>;

export const Theming: Story = {
  args: {},
};
