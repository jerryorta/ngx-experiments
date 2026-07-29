import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableRowExpansionUsageStoriesComponent } from './row-expansion-usage-stories.component';

const meta: Meta<NgeTableRowExpansionUsageStoriesComponent> = {
  component: NgeTableRowExpansionUsageStoriesComponent,
  title: 'Table/NgeTable/Row Expansion/Usage',
};

export default meta;
type Story = StoryObj<NgeTableRowExpansionUsageStoriesComponent>;

export const Usage: Story = { args: {} };
