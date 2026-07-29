import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableExportThemingComponent } from './export-theming.component';

const meta: Meta<NgeTableExportThemingComponent> = {
  component: NgeTableExportThemingComponent,
  title: 'Table/NgeTable/Export/Theming',
};

export default meta;
type Story = StoryObj<NgeTableExportThemingComponent>;

export const Theming: Story = {
  args: {},
};
