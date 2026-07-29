import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableCellRangeUsageStoriesComponent } from './cell-range-usage-stories.component';

const meta: Meta<NgeTableCellRangeUsageStoriesComponent> = {
  component: NgeTableCellRangeUsageStoriesComponent,
  title: 'Table/NgeTable/Cell Range/Usage',
};

export default meta;
type Story = StoryObj<NgeTableCellRangeUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
