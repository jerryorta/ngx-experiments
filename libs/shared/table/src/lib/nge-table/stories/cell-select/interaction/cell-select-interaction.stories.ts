import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableCellSelectInteractionStoriesComponent } from './cell-select-interaction-stories.component';

const meta: Meta<NgeTableCellSelectInteractionStoriesComponent> = {
  component: NgeTableCellSelectInteractionStoriesComponent,
  title: 'Table/NgeTable/Cell Select/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableCellSelectInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {},
};
