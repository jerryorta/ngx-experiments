import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableShowcaseInteractionStoriesComponent } from './showcase-interaction-stories.component';

const meta: Meta<NgeTableShowcaseInteractionStoriesComponent> = {
  argTypes: {
    stepPx: {
      control: { max: 1920, min: 96, step: 96, type: 'number' },
      description:
        "Pixels advanced per frame. Kept an exact multiple of this story's 96px row height so rowsAdded stays whole-number geometry — see Performance/Baseline for the plain-table equivalent at 40px rows.",
      table: { category: 'Benchmark' },
    },
    steps: {
      control: { max: 600, min: 10, step: 10, type: 'number' },
      description:
        'Frames to measure. Fixed rather than open-ended so two runs measure the same work; changing it invalidates comparison against an earlier run.',
      table: { category: 'Benchmark' },
    },
  },
  component: NgeTableShowcaseInteractionStoriesComponent,
  title: 'Table/NgeTable/Performance/Showcase/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableShowcaseInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    stepPx: 288,
    steps: 120,
  },
};
