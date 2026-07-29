import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableShowcaseUsageStoriesComponent } from './showcase-usage-stories.component';

const meta: Meta<NgeTableShowcaseUsageStoriesComponent> = {
  component: NgeTableShowcaseUsageStoriesComponent,
  title: 'Table/NgeTable/Showcase/Usage',
};

export default meta;
type Story = StoryObj<NgeTableShowcaseUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
