import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableFillHandleInteractionStoriesComponent } from './fill-handle-interaction-stories.component';

const meta: Meta<NgeTableFillHandleInteractionStoriesComponent> = {
  component: NgeTableFillHandleInteractionStoriesComponent,
  title: 'Table/NgeTable/Fill Handle/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableFillHandleInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {},
};
