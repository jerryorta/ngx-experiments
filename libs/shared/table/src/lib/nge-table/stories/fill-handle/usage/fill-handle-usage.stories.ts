import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableFillHandleUsageStoriesComponent } from './fill-handle-usage-stories.component';

const meta: Meta<NgeTableFillHandleUsageStoriesComponent> = {
  component: NgeTableFillHandleUsageStoriesComponent,
  title: 'Table/NgeTable/Fill Handle/Usage',
};

export default meta;
type Story = StoryObj<NgeTableFillHandleUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
