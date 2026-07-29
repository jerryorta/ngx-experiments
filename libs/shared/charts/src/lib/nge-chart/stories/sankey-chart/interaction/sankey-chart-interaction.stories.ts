import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeSankeyChartInteractionStoriesComponent } from './sankey-chart-interaction-stories.component';

const meta: Meta<NgeSankeyChartInteractionStoriesComponent> = {
  argTypes: {
    interactiveLegend: {
      control: 'boolean',
      description:
        'Show a standalone interactive <nge-chart-legend> above the chart; click a node to toggle it, and every link touching it, in/out of the flow.',
      table: { category: 'Layer - Legend' },
    },
    iterations: {
      control: { max: 32, min: 0, step: 1, type: 'range' },
      description:
        'Relaxation passes used to reduce link crossings. 0 leaves nodes in their initial column order.',
      table: { category: 'Layer - Layout' },
    },
    labelColor: {
      control: 'color',
      description: 'Node label colour (empty = theme default)',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelFontSize: {
      control: { max: 24, min: 8, step: 1, type: 'range' },
      description: 'Node label font size (px)',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelPadding: {
      control: { max: 24, min: 0, step: 1, type: 'range' },
      description: 'Gap (px) between a node rect and its label',
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Visibility' },
    },
    linkOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description:
        'Resting ribbon opacity. Ribbons overlap wherever flows cross, so translucency is what makes a crossing legible.',
      table: { category: 'Theme - Link Styling' },
    },
    linkOpacityHover: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Ribbon opacity under the pointer',
      table: { category: 'Theme - Link Styling' },
    },
    linkShape: {
      control: 'radio',
      description:
        "Ribbon geometry — 'curve' is the Sankey / Alluvial ribbon, 'parallelogram' the straight-sided Parallel Sets band.",
      options: ['curve', 'parallelogram'],
      table: { category: 'Layer - Layout' },
    },
    marginBottom: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Bottom margin',
      table: { category: 'Base - Margins' },
    },
    marginLeft: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Left margin',
      table: { category: 'Base - Margins' },
    },
    marginRight: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Right margin',
      table: { category: 'Base - Margins' },
    },
    marginTop: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    nodeAlign: {
      control: 'radio',
      description: 'Which column a node lands in when its depth leaves a choice',
      options: ['justify', 'left', 'right', 'center'],
      table: { category: 'Layer - Layout' },
    },
    nodeOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Node rect fill opacity',
      table: { category: 'Theme - Node Styling' },
    },
    nodePadding: {
      control: { max: 40, min: 0, step: 1, type: 'range' },
      description: 'Vertical gap (px) between node rects sharing a column',
      table: { category: 'Layer - Layout' },
    },
    nodeStroke: {
      control: 'color',
      description: 'Node rect outline colour (empty = theme default)',
      table: { category: 'Theme - Node Styling' },
    },
    nodeStrokeWidth: {
      control: { max: 6, min: 0, step: 0.5, type: 'range' },
      description: 'Node rect outline width (px)',
      table: { category: 'Theme - Node Styling' },
    },
    nodeWidth: {
      control: { max: 48, min: 2, step: 1, type: 'range' },
      description: 'Width (px) of a node rect',
      table: { category: 'Layer - Layout' },
    },
    showLabels: {
      control: 'boolean',
      description: 'Draw a label beside each node rect',
      table: { category: 'Layer - Visibility' },
    },
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on node hover',
      table: { category: 'Layer - Tooltip' },
    },
  },
  component: NgeSankeyChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Sankey Chart/Interaction',
};

export default meta;
type Story = StoryObj<NgeSankeyChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    interactiveLegend: false,
    iterations: 6,
    labelColor: '',
    labelFontSize: 11,
    labelPadding: 6,
    linkOpacity: 0.4,
    linkOpacityHover: 0.75,
    linkShape: 'curve',
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    nodeAlign: 'justify',
    nodeOpacity: 1,
    nodePadding: 8,
    nodeStroke: '',
    nodeStrokeWidth: 1,
    nodeWidth: 16,
    showLabels: true,
    showTooltip: true,
  },
};

/** Parallel Sets — the straight-sided reading, staged left. */
export const ParallelSets: Story = {
  args: { ...Interaction.args, linkShape: 'parallelogram', nodeAlign: 'left' },
};

/** Click a node in the standalone legend to toggle it, and its flows, in and out. */
export const InteractiveLegend: Story = {
  args: { ...Interaction.args, interactiveLegend: true },
};
