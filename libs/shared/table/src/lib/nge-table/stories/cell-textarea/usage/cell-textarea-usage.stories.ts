import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableCellTextareaUsageStoriesComponent } from './cell-textarea-usage-stories.component';

const meta: Meta<NgeTableCellTextareaUsageStoriesComponent> = {
  component: NgeTableCellTextareaUsageStoriesComponent,
  title: 'Table/NgeTable/Cell Textarea/Usage',
};

export default meta;
type Story = StoryObj<NgeTableCellTextareaUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
