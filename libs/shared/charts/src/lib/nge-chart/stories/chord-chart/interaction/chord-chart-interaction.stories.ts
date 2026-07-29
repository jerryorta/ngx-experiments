import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeChordChartInteractionStoriesComponent } from './chord-chart-interaction-stories.component';

const meta: Meta<NgeChordChartInteractionStoriesComponent> = {
  argTypes: {
    directed: {
      control: 'boolean',
      description:
        'false (default) merges A→B and B→A into ONE ribbon with asymmetric ends; true draws them as two distinct ribbons.',
      table: { category: 'Layer - Layout' },
    },
    endAngle: {
      control: { max: 6.28, min: 0, step: 0.02, type: 'range' },
      description: "End of the ring's angular span in radians (circular layout only)",
      if: { arg: 'layout', eq: 'circular' },
      table: { category: 'Layer - Geometry' },
    },
    innerRadius: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Ring band thickness — a ratio of the outer radius (circular layout only)',
      if: { arg: 'layout', eq: 'circular' },
      table: { category: 'Layer - Geometry' },
    },
    interactiveLegend: {
      control: 'boolean',
      description:
        'Suppress the internal legend and show the standalone interactive <nge-chart-legend> above the chart; click a node to toggle it, and every link touching it, in/out of the diagram.',
      table: { category: 'Layer - Legend' },
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
    labelFontWeight: {
      control: { max: 900, min: 100, step: 100, type: 'range' },
      description: 'Node label font weight',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelPadding: {
      control: { max: 24, min: 0, step: 1, type: 'range' },
      description: "Gap (px) between a node's mark and its label",
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Labels' },
    },
    layout: {
      control: 'radio',
      description:
        "'circular' (default) draws the ring of arcs (Chord Diagram / Non-ribbon Chord, per linkMark); 'linear' draws the Arc Diagram baseline.",
      options: ['circular', 'linear'],
      table: { category: 'Layer - Layout' },
    },
    legendPosition: {
      control: 'radio',
      description: 'Legend position relative to chart',
      if: { arg: 'showLegend' },
      options: ['bottom', 'top', 'left', 'right'],
      table: { category: 'Layer - Legend' },
    },
    linkMark: {
      control: 'radio',
      description:
        "'ribbon' (default) fills the area between two arcs; 'edge' strokes a thin curve instead. Ignored by the linear layout, which always renders as 'edge'.",
      if: { arg: 'layout', eq: 'circular' },
      options: ['ribbon', 'edge'],
      table: { category: 'Layer - Layout' },
    },
    linkOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description:
        'Resting ribbon/edge opacity. Ribbons overlap wherever flows cross, so translucency is what makes a crossing legible.',
      table: { category: 'Theme - Link Styling' },
    },
    linkOpacityHover: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Ribbon/edge opacity under the pointer',
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
    nodeOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Node arc/circle fill opacity',
      table: { category: 'Theme - Node Styling' },
    },
    nodeStroke: {
      control: 'color',
      description: 'Node arc/circle outline colour (empty = theme default)',
      table: { category: 'Theme - Node Styling' },
    },
    nodeStrokeWidth: {
      control: { max: 6, min: 0, step: 0.5, type: 'range' },
      description: 'Node arc/circle outline width (px)',
      table: { category: 'Theme - Node Styling' },
    },
    padAngle: {
      control: { max: 0.1, min: 0, step: 0.002, type: 'range' },
      description: 'Angular gap between adjacent ring arcs, in radians (circular layout only)',
      if: { arg: 'layout', eq: 'circular' },
      table: { category: 'Layer - Geometry' },
    },
    radiusRatio: {
      control: { max: 1, min: 0.1, step: 0.05, type: 'range' },
      description: 'Scales the self-computed outer radius by a ratio (circular layout only)',
      if: { arg: 'layout', eq: 'circular' },
      table: { category: 'Layer - Geometry' },
    },
    showLabels: {
      control: 'boolean',
      description:
        'Draw a label off each node — past the ring (circular) or beneath the circle (linear)',
      table: { category: 'Layer - Labels' },
    },
    showLegend: {
      control: 'boolean',
      description: 'Show the internal chart legend',
      table: { category: 'Layer - Legend' },
    },
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on node hover',
      table: { category: 'Layer - Tooltip' },
    },
    sortSubgroups: {
      control: 'radio',
      description:
        "Orders the ribbons WITHIN each node's arc. 'none' (default) leaves d3-chord's own order (circular layout only, in visual effect).",
      if: { arg: 'layout', eq: 'circular' },
      options: ['none', 'ascending', 'descending'],
      table: { category: 'Layer - Layout' },
    },
    startAngle: {
      control: { max: 3.14, min: -3.14, step: 0.02, type: 'range' },
      description: "Start of the ring's angular span in radians (circular layout only)",
      if: { arg: 'layout', eq: 'circular' },
      table: { category: 'Layer - Geometry' },
    },
    tooltipHeight: {
      control: { max: 120, min: 40, step: 5, type: 'range' },
      description: 'Tooltip height',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipWidth: {
      control: { max: 200, min: 80, step: 10, type: 'range' },
      description: 'Tooltip width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
  },
  component: NgeChordChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Chord Chart/Interaction',
};

export default meta;
type Story = StoryObj<NgeChordChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    directed: false,
    endAngle: 6.28,
    innerRadius: 0.9,
    interactiveLegend: false,
    labelColor: '',
    labelFontSize: 11,
    labelFontWeight: 600,
    labelPadding: 6,
    layout: 'circular',
    legendPosition: 'right',
    linkMark: 'ribbon',
    linkOpacity: 0.4,
    linkOpacityHover: 0.75,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    nodeOpacity: 1,
    nodeStroke: '',
    nodeStrokeWidth: 1,
    padAngle: 0,
    radiusRatio: 1,
    showLabels: true,
    showLegend: true,
    showTooltip: true,
    sortSubgroups: 'none',
    startAngle: 0,
    tooltipHeight: 65,
    tooltipWidth: 150,
  },
};

/** The same ring, stroked thin instead of filled — trades ribbon volume for edge legibility. */
export const NonRibbonChord: Story = {
  args: { ...Interaction.args, linkMark: 'edge' },
};

/** Nodes on a horizontal baseline, connections as stroked semicircular arcs above it. */
export const ArcDiagram: Story = {
  args: { ...Interaction.args, layout: 'linear' },
};

/**
 * Renders the standalone interactive `<nge-chart-legend>` above the chart with the chart's
 * internal legend suppressed. Clicking a node toggles it, and every link touching it, in/out
 * of the diagram — the diagram rebuilds without it while the node stays listed in the legend
 * but dimmed (opacity 0.4) so it can be toggled back on. Survivors keep the colour they had
 * before the toggle (each visible node is stamped with its stable palette colour before
 * re-rendering).
 */
export const InteractiveLegend: Story = {
  args: { ...Interaction.args, interactiveLegend: true },
};
