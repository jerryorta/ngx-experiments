import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableCellEditorsInteractionStoriesComponent } from './cell-editors-interaction-stories.component';

const meta: Meta<NgeTableCellEditorsInteractionStoriesComponent> = {
  component: NgeTableCellEditorsInteractionStoriesComponent,
  title: 'Table/NgeTable/Cell Editors/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableCellEditorsInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {},
};
