import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableCellTextareaThemingComponent } from './cell-textarea-theming.component';

const meta: Meta<NgeTableCellTextareaThemingComponent> = {
  component: NgeTableCellTextareaThemingComponent,
  title: 'Table/NgeTable/Cell Textarea/Theming',
};

export default meta;
type Story = StoryObj<NgeTableCellTextareaThemingComponent>;

export const Theming: Story = {
  args: {},
};
