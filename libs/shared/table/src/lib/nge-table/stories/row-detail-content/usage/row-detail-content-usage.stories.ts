import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableRowDetailContentUsageStoriesComponent } from './row-detail-content-usage-stories.component';

const meta: Meta<NgeTableRowDetailContentUsageStoriesComponent> = {
  component: NgeTableRowDetailContentUsageStoriesComponent,
  title: 'Table/NgeTable/Row Detail Content/Usage',
};

export default meta;
type Story = StoryObj<NgeTableRowDetailContentUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
