import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableInlineEditThemingComponent } from './inline-edit-theming.component';

const meta: Meta<NgeTableInlineEditThemingComponent> = {
  component: NgeTableInlineEditThemingComponent,
  title: 'Table/NgeTable/Inline Editing/Theming',
};

export default meta;
type Story = StoryObj<NgeTableInlineEditThemingComponent>;

export const Theming: Story = {
  args: {},
};
