import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableStripingUsageStoriesComponent } from './striping-usage-stories.component';

const meta: Meta<NgeTableStripingUsageStoriesComponent> = {
  component: NgeTableStripingUsageStoriesComponent,
  title: 'Table/NgeTable/Striping/Usage',
};

export default meta;
type Story = StoryObj<NgeTableStripingUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
