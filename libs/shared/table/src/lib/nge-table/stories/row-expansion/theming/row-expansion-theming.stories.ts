import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableRowExpansionThemingComponent } from './row-expansion-theming.component';

const meta: Meta<NgeTableRowExpansionThemingComponent> = {
  component: NgeTableRowExpansionThemingComponent,
  title: 'Table/NgeTable/Row Expansion/Theming',
};

export default meta;
type Story = StoryObj<NgeTableRowExpansionThemingComponent>;

export const Theming: Story = { args: {} };
