import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableRowDetailContentThemingComponent } from './row-detail-content-theming.component';

const meta: Meta<NgeTableRowDetailContentThemingComponent> = {
  component: NgeTableRowDetailContentThemingComponent,
  title: 'Table/NgeTable/Row Detail Content/Theming',
};

export default meta;
type Story = StoryObj<NgeTableRowDetailContentThemingComponent>;

export const Theming: Story = {
  args: {},
};
