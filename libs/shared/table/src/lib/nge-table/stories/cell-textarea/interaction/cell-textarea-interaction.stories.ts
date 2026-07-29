import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableCellTextareaInteractionStoriesComponent } from './cell-textarea-interaction-stories.component';

const meta: Meta<NgeTableCellTextareaInteractionStoriesComponent> = {
  component: NgeTableCellTextareaInteractionStoriesComponent,
  title: 'Table/NgeTable/Cell Textarea/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableCellTextareaInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {},
};
