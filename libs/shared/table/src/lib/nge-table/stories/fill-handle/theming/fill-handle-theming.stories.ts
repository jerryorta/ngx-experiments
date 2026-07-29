import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableFillHandleThemingComponent } from './fill-handle-theming.component';

const meta: Meta<NgeTableFillHandleThemingComponent> = {
  component: NgeTableFillHandleThemingComponent,
  title: 'Table/NgeTable/Fill Handle/Theming',
};

export default meta;
type Story = StoryObj<NgeTableFillHandleThemingComponent>;

export const Theming: Story = {
  args: {},
};
