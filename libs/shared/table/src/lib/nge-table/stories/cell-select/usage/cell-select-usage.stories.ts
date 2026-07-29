import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableCellSelectUsageStoriesComponent } from './cell-select-usage-stories.component';

const meta: Meta<NgeTableCellSelectUsageStoriesComponent> = {
  component: NgeTableCellSelectUsageStoriesComponent,
  title: 'Table/NgeTable/Cell Select/Usage',
};

export default meta;
type Story = StoryObj<NgeTableCellSelectUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
