import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableStripingInteractionStoriesComponent } from './striping-interaction-stories.component';

const meta: Meta<NgeTableStripingInteractionStoriesComponent> = {
  argTypes: {
    enableStriping: {
      control: 'boolean',
      description:
        'Paints alternate rows on --nge-table-row-surface-alt. Drives Example 1 only; the rest are fixed so each keeps demonstrating its own property.',
      table: { category: 'Feature - Flags' },
    },
  },
  component: NgeTableStripingInteractionStoriesComponent,
  title: 'Table/NgeTable/Striping/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableStripingInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    enableStriping: true,
  },
};
