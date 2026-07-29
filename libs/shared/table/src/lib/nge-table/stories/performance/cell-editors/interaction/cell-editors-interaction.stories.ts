import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableCellEditorsPerformanceStoriesComponent } from './cell-editors-interaction-stories.component';

const meta: Meta<NgeTableCellEditorsPerformanceStoriesComponent> = {
  argTypes: {
    stepPx: {
      control: 'number',
      description:
        'Pixels the viewport advances per measured frame. Must stay a whole number of 40px rows, or the expected-rows figure has no exact value.',
      table: { category: 'Table - Geometry' },
    },
    steps: {
      control: 'number',
      description: 'Frames to measure. Both settings of the editors toggle must agree on it.',
      table: { category: 'Table - Geometry' },
    },
    withEditors: {
      control: 'boolean',
      description:
        'Whether the seven shared columns declare their editors. Off renders exactly what the frozen baseline renders, so the pair is a controlled comparison taken on one machine in one session.',
      table: { category: 'Feature - Flags' },
    },
  },
  component: NgeTableCellEditorsPerformanceStoriesComponent,
  title: 'Table/NgeTable/Performance/Cell Editors/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableCellEditorsPerformanceStoriesComponent>;

export const Interaction: Story = {
  args: {
    stepPx: 240,
    steps: 120,
    withEditors: true,
  },
};
