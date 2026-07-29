import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableColumnSelectionUsageStoriesComponent } from './column-selection-usage-stories.component';

const meta: Meta<NgeTableColumnSelectionUsageStoriesComponent> = {
  component: NgeTableColumnSelectionUsageStoriesComponent,
  title: 'Table/NgeTable/Column Selection/Usage',
};

export default meta;
type Story = StoryObj<NgeTableColumnSelectionUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
