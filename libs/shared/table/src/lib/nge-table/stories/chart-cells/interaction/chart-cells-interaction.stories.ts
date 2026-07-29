import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableChartCellsInteractionStoriesComponent } from './chart-cells-interaction-stories.component';

const meta: Meta<NgeTableChartCellsInteractionStoriesComponent> = {
  component: NgeTableChartCellsInteractionStoriesComponent,
  title: 'Table/NgeTable/Chart Cells/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableChartCellsInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {},
};
