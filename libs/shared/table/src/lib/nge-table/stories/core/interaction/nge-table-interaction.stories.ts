import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableInteractionStoriesComponent } from './nge-table-interaction-stories.component';

const meta: Meta<NgeTableInteractionStoriesComponent> = {
  component: NgeTableInteractionStoriesComponent,
  title: 'Table/NgeTable/Core/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {},
};
