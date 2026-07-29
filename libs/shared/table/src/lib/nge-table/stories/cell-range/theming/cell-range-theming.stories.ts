import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableCellRangeThemingComponent } from './cell-range-theming.component';

const meta: Meta<NgeTableCellRangeThemingComponent> = {
  component: NgeTableCellRangeThemingComponent,
  title: 'Table/NgeTable/Cell Range/Theming',
};

export default meta;
type Story = StoryObj<NgeTableCellRangeThemingComponent>;

export const Theming: Story = {
  args: {},
};
