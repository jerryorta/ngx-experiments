import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableCellEditorsThemingComponent } from './cell-editors-theming.component';

const meta: Meta<NgeTableCellEditorsThemingComponent> = {
  component: NgeTableCellEditorsThemingComponent,
  title: 'Table/NgeTable/Cell Editors/Theming',
};

export default meta;
type Story = StoryObj<NgeTableCellEditorsThemingComponent>;

export const Theming: Story = {
  args: {},
};
