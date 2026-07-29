import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableShowcaseInteractionStoriesComponent } from './showcase-interaction-stories.component';

const meta: Meta<NgeTableShowcaseInteractionStoriesComponent> = {
  argTypes: {
    enableColumnResizing: {
      control: 'boolean',
      description: 'Drag-to-resize on each header (ARCH-244).',
      table: { category: 'Feature - Flags' },
    },
    enablePinning: {
      control: 'boolean',
      description:
        'Freeze columns to the left or right edge (ARCH-243). "name" and "createdAt" stay pinned in state either way.',
      table: { category: 'Feature - Flags' },
    },
    enableRowExpansion: {
      control: 'boolean',
      description: 'The leading disclosure column and its row-detail band (ARCH-298).',
      table: { category: 'Feature - Flags' },
    },
    enableRowSelection: {
      control: 'boolean',
      description: 'The leading selection control, projected as a local stand-in (ARCH-268/278).',
      table: { category: 'Feature - Flags' },
    },
    enableStriping: {
      control: 'boolean',
      description: 'Alternate-row banding on --nge-table-row-surface-alt (ARCH-286).',
      table: { category: 'Feature - Flags' },
    },
    enableVirtualization: {
      control: 'boolean',
      description: 'Render only the rows near the viewport, across all 10,000 (ARCH-245).',
      table: { category: 'Feature - Flags' },
    },
  },
  component: NgeTableShowcaseInteractionStoriesComponent,
  title: 'Table/NgeTable/Showcase/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableShowcaseInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    enableColumnResizing: true,
    enablePinning: true,
    enableRowExpansion: true,
    enableRowSelection: true,
    enableStriping: true,
    enableVirtualization: true,
  },
};
