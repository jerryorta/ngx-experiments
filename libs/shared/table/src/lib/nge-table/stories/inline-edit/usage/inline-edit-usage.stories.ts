import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableInlineEditUsageStoriesComponent } from './inline-edit-usage-stories.component';

const meta: Meta<NgeTableInlineEditUsageStoriesComponent> = {
  component: NgeTableInlineEditUsageStoriesComponent,
  title: 'Table/NgeTable/Inline Editing/Usage',
};

export default meta;
type Story = StoryObj<NgeTableInlineEditUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
