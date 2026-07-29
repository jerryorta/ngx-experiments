import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableRowExpansionInteractionStoriesComponent } from './row-expansion-interaction-stories.component';

const meta: Meta<NgeTableRowExpansionInteractionStoriesComponent> = {
  argTypes: {
    durationMs: {
      control: { max: 600, min: 0, step: 20, type: 'range' },
      description:
        "Published as --nge-table-row-detail-duration on both of Example 9's tables. 0ms is the consumer-facing escape — the animation goes away without a media query, which is why the range starts there rather than at a token minimum.",
      table: { category: 'Band - Motion' },
    },
    enableRowExpansion: {
      control: 'boolean',
      description:
        'Injects the leading disclosure column and lets a user write state.expanded. Drives Example 1 only; the rest are fixed so each keeps demonstrating its own property.',
      table: { category: 'Feature - Flags' },
    },
  },
  component: NgeTableRowExpansionInteractionStoriesComponent,
  title: 'Table/NgeTable/Row Expansion/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableRowExpansionInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    durationMs: 180,
    enableRowExpansion: true,
  },
};
