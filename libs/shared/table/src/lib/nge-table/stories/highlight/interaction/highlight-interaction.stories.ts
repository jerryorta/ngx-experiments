import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableHighlightInteractionStoriesComponent } from './highlight-interaction-stories.component';

const meta: Meta<NgeTableHighlightInteractionStoriesComponent> = {
  component: NgeTableHighlightInteractionStoriesComponent,
  title: 'Table/NgeTable/Highlight/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableHighlightInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {},
};
