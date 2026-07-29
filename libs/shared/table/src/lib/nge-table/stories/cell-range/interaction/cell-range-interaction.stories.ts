import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableCellRangeInteractionStoriesComponent } from './cell-range-interaction-stories.component';

const meta: Meta<NgeTableCellRangeInteractionStoriesComponent> = {
  component: NgeTableCellRangeInteractionStoriesComponent,
  title: 'Table/NgeTable/Cell Range/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableCellRangeInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {},
};
