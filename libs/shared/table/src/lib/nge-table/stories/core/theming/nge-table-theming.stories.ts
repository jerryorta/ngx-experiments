import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableThemingComponent } from './nge-table-theming.component';

const meta: Meta<NgeTableThemingComponent> = {
  component: NgeTableThemingComponent,
  title: 'Table/NgeTable/Core/Theming',
};

export default meta;
type Story = StoryObj<NgeTableThemingComponent>;

export const Theming: Story = {
  args: {},
};
