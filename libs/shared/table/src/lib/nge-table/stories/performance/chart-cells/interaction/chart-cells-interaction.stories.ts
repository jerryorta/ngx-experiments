import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableChartCellsInteractionStoriesComponent } from './chart-cells-interaction-stories.component';

const meta: Meta<NgeTableChartCellsInteractionStoriesComponent> = {
  argTypes: {
    cellMode: {
      // ⚠️ `options` belongs at the argType level, NOT inside `control`. Nested, the
      // Controls panel renders a bare `-` for the row: Storybook honours
      // `type: 'select'`, finds no options where it looks for them, and gives up
      // without an error anywhere. A number control has nothing to look up, which is
      // why `stepPx` and `steps` below work either way and hide the mistake.
      control: { type: 'select' },
      description:
        'gated = the shipped ARCH-291 pattern (settle-gated). always-chart = a measurement control that BYPASSES isSettled and mounts a chart unconditionally — never a supported pattern, only the counterfactual gated is measured against. always-shell = the settle gate bypassed the other way, an optional floor reading. Three separate measurements, not one figure with a knob — read the story prose before comparing them.',
      options: ['gated', 'always-chart', 'always-shell'],
      table: { category: 'Chart Cells' },
    },
    stepPx: {
      control: { max: 1920, min: 96, step: 96, type: 'number' },
      description:
        "Pixels advanced per frame. Kept an exact multiple of this story's 96px row height so rowsAdded stays whole-number geometry — see the baseline story for the plain-table equivalent at 40px rows.",
      table: { category: 'Benchmark' },
    },
    steps: {
      control: { max: 600, min: 10, step: 10, type: 'number' },
      description:
        'Frames to measure. Fixed rather than open-ended so two runs measure the same work; changing it invalidates comparison against an earlier run.',
      table: { category: 'Benchmark' },
    },
  },
  component: NgeTableChartCellsInteractionStoriesComponent,
  title: 'Table/NgeTable/Performance/Chart Cells/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableChartCellsInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    cellMode: 'gated',
    stepPx: 288,
    steps: 120,
  },
};
