import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeTreeChartInteractionStoriesComponent } from './tree-chart-interaction-stories.component';

const meta: Meta<NgeTreeChartInteractionStoriesComponent> = {
  // Flat alphabetical, matching the sibling chart stories — `table.category` is what groups the
  // controls in the Storybook panel, so source order carries no meaning.
  argTypes: {
    alignLeaves: {
      control: 'boolean',
      description:
        'Push every leaf onto the outer edge regardless of its depth — the Dendrogram reading. Composes with both coordinate systems.',
      table: { category: 'Layer - Layout' },
    },
    labelColor: {
      control: 'color',
      description: 'Label colour',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelFontSize: {
      control: { max: 20, min: 8, step: 1, type: 'range' },
      description: 'Label font size (px)',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelFontWeight: {
      control: { max: 900, min: 300, step: 100, type: 'range' },
      description: 'Label font weight',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelPadding: {
      control: { max: 24, min: 0, step: 1, type: 'range' },
      description: 'Gap (px) between a node circle and its label',
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Labels' },
    },
    layout: {
      control: 'radio',
      description: 'Coordinate system — cartesian, or polar with the root at the centre',
      options: ['tidy', 'radial'],
      table: { category: 'Layer - Layout' },
    },
    linkColor: {
      control: 'color',
      description: 'Edge colour',
      table: { category: 'Theme - Link Styling' },
    },
    linkOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description:
        'Resting edge opacity. A tree’s edges never cross, so this sits far above the network layer’s 0.35.',
      table: { category: 'Theme - Link Styling' },
    },
    linkShape: {
      control: 'radio',
      description:
        'Edge geometry. `elbow` is the org-chart reporting line and is cartesian-only — the radial layout falls back to `curve`.',
      options: ['curve', 'elbow', 'straight'],
      table: { category: 'Layer - Layout' },
    },
    linkWidth: {
      control: { max: 6, min: 0.5, step: 0.5, type: 'range' },
      description: 'Edge stroke width (px)',
      table: { category: 'Theme - Link Styling' },
    },
    marginBottom: {
      control: { max: 100, min: 0, step: 4, type: 'range' },
      description: 'Bottom margin',
      table: { category: 'Base - Margins' },
    },
    marginLeft: {
      control: { max: 100, min: 0, step: 4, type: 'range' },
      description: 'Left margin',
      table: { category: 'Base - Margins' },
    },
    marginRight: {
      control: { max: 100, min: 0, step: 4, type: 'range' },
      description: 'Right margin',
      table: { category: 'Base - Margins' },
    },
    marginTop: {
      control: { max: 100, min: 0, step: 4, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    maxDepth: {
      control: { max: 4, min: 0, step: 1, type: 'range' },
      description: 'Levels below the root to draw. 0 = no cap.',
      table: { category: 'Layer - Layout' },
    },
    nodeColor1: {
      control: 'color',
      description: 'Palette entry for the first top-level branch (and its descendants)',
      table: { category: 'Theme - Node Styling' },
    },
    nodeColor2: {
      control: 'color',
      description: 'Palette entry for the second top-level branch',
      table: { category: 'Theme - Node Styling' },
    },
    nodeColor3: {
      control: 'color',
      description: 'Palette entry for the third top-level branch',
      table: { category: 'Theme - Node Styling' },
    },
    nodeOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Node fill opacity',
      table: { category: 'Theme - Node Styling' },
    },
    nodeRadius: {
      control: { max: 16, min: 1, step: 1, type: 'range' },
      description: 'Node circle radius (px)',
      table: { category: 'Layer - Layout' },
    },
    nodeStroke: {
      control: 'color',
      description: 'Node outline colour — separates a circle from the edge running beneath it',
      table: { category: 'Theme - Node Styling' },
    },
    nodeStrokeWidth: {
      control: { max: 6, min: 0, step: 0.5, type: 'range' },
      description: 'Node outline width (px)',
      table: { category: 'Theme - Node Styling' },
    },
    orientation: {
      control: 'radio',
      description: 'Which edge the root sits on. Ignored by the radial layout.',
      if: { arg: 'layout', eq: 'tidy' },
      options: ['left-right', 'right-left', 'top-bottom', 'bottom-top'],
      table: { category: 'Layer - Layout' },
    },
    radiusRatio: {
      control: { max: 1, min: 0.2, step: 0.05, type: 'range' },
      description: 'Scale the self-computed outer radius. Radial layout only.',
      if: { arg: 'layout', eq: 'radial' },
      table: { category: 'Layer - Layout' },
    },
    showLabels: {
      control: 'boolean',
      description: 'Draw a label beside each node circle',
      table: { category: 'Layer - Labels' },
    },
    showTooltip: {
      control: 'boolean',
      description: 'Show a tooltip anchored above the node circle on hover',
      table: { category: 'Layer - Tooltip' },
    },
  },
  component: NgeTreeChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Tree Chart/Interaction',
};

export default meta;
type Story = StoryObj<NgeTreeChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    alignLeaves: false,
    labelColor: '',
    labelFontSize: 10,
    labelFontWeight: 600,
    labelPadding: 6,
    layout: 'tidy',
    linkColor: '',
    linkOpacity: 0.9,
    linkShape: 'curve',
    linkWidth: 1.5,
    marginBottom: 16,
    marginLeft: 16,
    marginRight: 16,
    marginTop: 16,
    maxDepth: 0,
    nodeColor1: '',
    nodeColor2: '',
    nodeColor3: '',
    nodeOpacity: 1,
    nodeRadius: 4,
    nodeStroke: '',
    nodeStrokeWidth: 1,
    orientation: 'left-right',
    radiusRatio: 1,
    showLabels: true,
    showTooltip: true,
  },
};
