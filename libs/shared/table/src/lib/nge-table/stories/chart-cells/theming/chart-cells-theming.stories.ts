import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableChartCellsThemingComponent } from './chart-cells-theming.component';

const meta: Meta<NgeTableChartCellsThemingComponent> = {
  component: NgeTableChartCellsThemingComponent,
  title: 'Table/NgeTable/Chart Cells/Theming',
};

export default meta;
type Story = StoryObj<NgeTableChartCellsThemingComponent>;

export const Theming: Story = {
  args: {},
};
