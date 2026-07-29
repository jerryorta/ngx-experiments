import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeNetworkChartInteractionStoriesComponent } from './network-chart-interaction-stories.component';

const meta: Meta<NgeNetworkChartInteractionStoriesComponent> = {
  // Flat alphabetical, matching the sibling chart stories — `table.category` is what groups the
  // controls in the Storybook panel, so source order carries no meaning.
  argTypes: {
    axisColor: {
      control: 'color',
      description: 'Hive axis colour',
      if: { arg: 'layout', eq: 'hive' },
      table: { category: 'Theme - Axis Styling' },
    },
    axisCount: {
      control: { max: 4, min: 2, step: 1, type: 'range' },
      description: 'How many axes the hive layout radiates (clamped to 2–4)',
      if: { arg: 'layout', eq: 'hive' },
      table: { category: 'Layer - Hive' },
    },
    axisWidth: {
      control: { max: 6, min: 0.5, step: 0.5, type: 'range' },
      description: 'Hive axis width (px)',
      if: { arg: 'layout', eq: 'hive' },
      table: { category: 'Theme - Axis Styling' },
    },
    charge: {
      control: { max: 0, min: -600, step: 20, type: 'range' },
      description: 'Many-body strength — negative repels, which is what spreads a graph out',
      if: { arg: 'layout', neq: 'hive' },
      table: { category: 'Layer - Force Tuning' },
    },
    clusterStrength: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: "How hard a node is pulled toward its group's anchor",
      if: { arg: 'layout', eq: 'cluster' },
      table: { category: 'Layer - Force Tuning' },
    },
    directed: {
      control: 'boolean',
      description:
        "Draw an arrowhead at each connection's target end — pair with labels for a Sociogram",
      table: { category: 'Layer - Visibility' },
    },
    innerRadius: {
      control: { max: 0.8, min: 0, step: 0.05, type: 'range' },
      description: 'Where each axis starts, as a ratio of the outer radius',
      if: { arg: 'layout', eq: 'hive' },
      table: { category: 'Layer - Hive' },
    },
    labelColor: {
      control: 'color',
      description: 'Label colour',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelFontSize: {
      control: { max: 24, min: 8, step: 1, type: 'range' },
      description: 'Label font size (px)',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelFontWeight: {
      control: { max: 900, min: 100, step: 100, type: 'range' },
      description: 'Label font weight',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelPadding: {
      control: { max: 24, min: 0, step: 1, type: 'range' },
      description: 'Gap (px) between a node circle and its label',
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Visibility' },
    },
    layout: {
      control: 'radio',
      description:
        "Geometry: 'force' settles a d3-force simulation, 'cluster' adds a per-group anchor to it, 'hive' places nodes deterministically on radial axes (no simulation)",
      options: ['force', 'cluster', 'hive'],
      table: { category: 'Layer - Layout' },
    },
    linkColor: {
      control: 'color',
      description: 'Edge colour when neither the link nor its source node names one',
      table: { category: 'Theme - Link Styling' },
    },
    linkDistance: {
      control: { max: 200, min: 10, step: 5, type: 'range' },
      description: 'Target distance (px) between two linked nodes',
      if: { arg: 'layout', neq: 'hive' },
      table: { category: 'Layer - Force Tuning' },
    },
    linkOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description:
        'Resting edge opacity — the load-bearing knob; at full opacity a dense interior mats into one block of colour',
      table: { category: 'Theme - Link Styling' },
    },
    linkOpacityHover: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Edge opacity under the pointer',
      table: { category: 'Theme - Link Styling' },
    },
    linkWidth: {
      control: { max: 8, min: 0.5, step: 0.5, type: 'range' },
      description: 'Edge stroke width (px)',
      table: { category: 'Theme - Link Styling' },
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
    maxNodeRadius: {
      control: { max: 40, min: 4, step: 1, type: 'range' },
      description: 'Radius (px) of the highest-magnitude node',
      table: { category: 'Layer - Nodes' },
    },
    minNodeRadius: {
      control: { max: 20, min: 1, step: 1, type: 'range' },
      description: 'Radius (px) of a zero-magnitude node',
      table: { category: 'Layer - Nodes' },
    },
    nodeColor: {
      control: 'color',
      description: 'Single-node fill (fallback when the palette is unset)',
      table: { category: 'Theme - Node Styling' },
    },
    nodeOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Node fill opacity',
      table: { category: 'Theme - Node Styling' },
    },
    nodeStroke: {
      control: 'color',
      description: 'Node outline — what keeps two touching nodes separate',
      table: { category: 'Theme - Node Styling' },
    },
    nodeStrokeWidth: {
      control: { max: 6, min: 0, step: 0.5, type: 'range' },
      description: 'Node outline width (px)',
      table: { category: 'Theme - Node Styling' },
    },
    radiusRatio: {
      control: { max: 1, min: 0.2, step: 0.05, type: 'range' },
      description: 'Scale the self-computed outer radius, applied after the label reserves',
      if: { arg: 'layout', eq: 'hive' },
      table: { category: 'Layer - Hive' },
    },
    seed: {
      control: { max: 100, min: 1, step: 1, type: 'range' },
      description:
        'Seeds the initial placement — the layout is deterministic per seed, so changing it re-rolls the arrangement without changing the data',
      if: { arg: 'layout', neq: 'hive' },
      table: { category: 'Layer - Force Tuning' },
    },
    showLabels: {
      control: 'boolean',
      description: 'Draw a label beside each node circle',
      table: { category: 'Layer - Visibility' },
    },
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    tickCount: {
      control: { max: 600, min: 1, step: 10, type: 'range' },
      description:
        'Simulation steps before the graph is drawn — run stopped, not animated, which is what makes the layout reproducible',
      if: { arg: 'layout', neq: 'hive' },
      table: { category: 'Layer - Force Tuning' },
    },
    tooltipHeight: {
      control: { max: 200, min: 40, step: 5, type: 'range' },
      description: 'Tooltip height (px)',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipWidth: {
      control: { max: 320, min: 80, step: 10, type: 'range' },
      description: 'Tooltip width (px)',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
  },
  component: NgeNetworkChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Network Chart/Interaction',
};

export default meta;
type Story = StoryObj<NgeNetworkChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    axisColor: '',
    axisCount: 3,
    axisWidth: 1,
    charge: -180,
    clusterStrength: 0.35,
    directed: false,
    innerRadius: 0.15,
    labelColor: '',
    labelFontSize: 10,
    labelFontWeight: 600,
    labelPadding: 6,
    layout: 'force',
    linkColor: '',
    linkDistance: 60,
    linkOpacity: 0.35,
    linkOpacityHover: 0.8,
    linkWidth: 1.5,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    maxNodeRadius: 16,
    minNodeRadius: 4,
    nodeColor: '',
    nodeOpacity: 1,
    nodeStroke: '',
    nodeStrokeWidth: 1,
    radiusRatio: 1,
    seed: 42,
    showLabels: true,
    showTooltip: true,
    tickCount: 300,
    tooltipHeight: 65,
    tooltipWidth: 150,
  },
};
