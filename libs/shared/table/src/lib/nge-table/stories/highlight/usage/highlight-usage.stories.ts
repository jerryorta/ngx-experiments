import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableHighlightUsageStoriesComponent } from './highlight-usage-stories.component';

const meta: Meta<NgeTableHighlightUsageStoriesComponent> = {
  component: NgeTableHighlightUsageStoriesComponent,
  title: 'Table/NgeTable/Highlight/Usage',
};

export default meta;
type Story = StoryObj<NgeTableHighlightUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
