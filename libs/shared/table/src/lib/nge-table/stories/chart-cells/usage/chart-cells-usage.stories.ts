import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableChartCellsUsageStoriesComponent } from './chart-cells-usage-stories.component';

const meta: Meta<NgeTableChartCellsUsageStoriesComponent> = {
  component: NgeTableChartCellsUsageStoriesComponent,
  title: 'Table/NgeTable/Chart Cells/Usage',
};

export default meta;
type Story = StoryObj<NgeTableChartCellsUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
