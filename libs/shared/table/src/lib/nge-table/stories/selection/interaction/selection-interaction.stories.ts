import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableSelectionInteractionStoriesComponent } from './selection-interaction-stories.component';

const meta: Meta<NgeTableSelectionInteractionStoriesComponent> = {
  component: NgeTableSelectionInteractionStoriesComponent,
  title: 'Table/NgeTable/Selection/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableSelectionInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {},
};
