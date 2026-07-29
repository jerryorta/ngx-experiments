import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableUsageStoriesComponent } from './nge-table-usage-stories.component';

const meta: Meta<NgeTableUsageStoriesComponent> = {
  component: NgeTableUsageStoriesComponent,
  title: 'Table/NgeTable/Core/Usage',
};

export default meta;
type Story = StoryObj<NgeTableUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
