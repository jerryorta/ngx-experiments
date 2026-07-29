import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableBaselineInteractionStoriesComponent } from './baseline-interaction-stories.component';

const meta: Meta<NgeTableBaselineInteractionStoriesComponent> = {
  argTypes: {
    stepPx: {
      control: { max: 2000, min: 20, step: 20, type: 'number' },
      description:
        'Pixels advanced per frame — how hard the virtual window is made to slide. Larger steps rebuild more rows per frame.',
      table: { category: 'Benchmark' },
    },
    steps: {
      control: { max: 600, min: 10, step: 10, type: 'number' },
      description:
        'Frames to measure. Fixed rather than open-ended so two runs measure the same work; changing it invalidates comparison against an earlier baseline.',
      table: { category: 'Benchmark' },
    },
  },
  component: NgeTableBaselineInteractionStoriesComponent,
  title: 'Table/NgeTable/Performance/Baseline/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableBaselineInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    stepPx: 240,
    steps: 120,
  },
};
