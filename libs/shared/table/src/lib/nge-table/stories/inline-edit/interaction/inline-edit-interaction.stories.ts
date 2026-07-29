import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableInlineEditInteractionStoriesComponent } from './inline-edit-interaction-stories.component';

const meta: Meta<NgeTableInlineEditInteractionStoriesComponent> = {
  component: NgeTableInlineEditInteractionStoriesComponent,
  title: 'Table/NgeTable/Inline Editing/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableInlineEditInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {},
};
