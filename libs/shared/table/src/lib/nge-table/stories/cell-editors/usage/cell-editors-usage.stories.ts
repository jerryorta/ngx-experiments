import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableCellEditorsUsageStoriesComponent } from './cell-editors-usage-stories.component';

const meta: Meta<NgeTableCellEditorsUsageStoriesComponent> = {
  component: NgeTableCellEditorsUsageStoriesComponent,
  title: 'Table/NgeTable/Cell Editors/Usage',
};

export default meta;
type Story = StoryObj<NgeTableCellEditorsUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
