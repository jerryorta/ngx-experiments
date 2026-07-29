import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableColumnSelectionInteractionStoriesComponent } from './column-selection-interaction-stories.component';

const meta: Meta<NgeTableColumnSelectionInteractionStoriesComponent> = {
  component: NgeTableColumnSelectionInteractionStoriesComponent,
  title: 'Table/NgeTable/Column Selection/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableColumnSelectionInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {},
};
