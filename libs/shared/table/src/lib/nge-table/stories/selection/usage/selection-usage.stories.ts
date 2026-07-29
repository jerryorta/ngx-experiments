import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableSelectionUsageStoriesComponent } from './selection-usage-stories.component';

const meta: Meta<NgeTableSelectionUsageStoriesComponent> = {
  component: NgeTableSelectionUsageStoriesComponent,
  title: 'Table/NgeTable/Selection/Usage',
};

export default meta;
type Story = StoryObj<NgeTableSelectionUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
