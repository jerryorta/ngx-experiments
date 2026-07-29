import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeSunburstChartInteractionStoriesComponent } from './sunburst-chart-interaction-stories.component';

const meta: Meta<NgeSunburstChartInteractionStoriesComponent> = {
  argTypes: {
    // Layer - Geometry
    endAngle: {
      control: { max: 6.28, min: 0, step: 0.02, type: 'range' },
      description: 'End of the angular sweep in radians (radial layout)',
      table: { category: 'Layer - Geometry' },
    },
    innerRadius: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Inner radius as a ratio (0 → rings from center, >0 → donut hole)',
      table: { category: 'Layer - Geometry' },
    },
    // Layer - Legend
    interactiveLegend: {
      control: 'boolean',
      description:
        'Suppress the internal legend and show the standalone interactive <nge-chart-legend> above the chart; click a branch to toggle it in/out of the sunburst.',
      table: { category: 'Layer - Legend' },
    },
    // Theme - Label Styling
    labelColor: {
      control: 'color',
      description:
        'Flat label colour for EVERY node. Leave empty to keep the automatic on-fill contrast (black on light nodes, white on dark ones).',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelFontSize: {
      control: { max: 24, min: 6, step: 1, type: 'range' },
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
    // Layer - Layout
    layout: {
      control: 'radio',
      description: 'Partition layout (radial rings / linear icicle columns)',
      options: ['radial', 'linear'],
      table: { category: 'Layer - Layout' },
    },
    legendPosition: {
      control: 'radio',
      description: 'Legend position relative to chart',
      if: { arg: 'showLegend' },
      options: ['bottom', 'top', 'left', 'right'],
      table: { category: 'Layer - Legend' },
    },
    marginBottom: {
      control: { max: 60, min: 0, step: 5, type: 'range' },
      description: 'Bottom margin',
      table: { category: 'Base - Margins' },
    },
    marginLeft: {
      control: { max: 60, min: 0, step: 5, type: 'range' },
      description: 'Left margin',
      table: { category: 'Base - Margins' },
    },
    marginRight: {
      control: { max: 60, min: 0, step: 5, type: 'range' },
      description: 'Right margin',
      table: { category: 'Base - Margins' },
    },
    // Base - Margins
    marginTop: {
      control: { max: 60, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    maxDepth: {
      control: { max: 4, min: 0, step: 1, type: 'range' },
      description: 'Max rings / columns to render (0 = full depth)',
      table: { category: 'Layer - Geometry' },
    },
    // Layer - Labels
    maxLabelDepth: {
      control: { max: 4, min: 0, step: 1, type: 'range' },
      description:
        'Deepest ring / column that still gets a label (0 = every drawn depth). Independent of maxDepth, which governs what is DRAWN.',
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Labels' },
    },
    minLabelAngle: {
      control: { max: 1, min: 0, step: 0.01, type: 'range' },
      description:
        'Smallest node sweep (radians) that still gets a label — radial layout only. A zero-sweep node is never labelled whatever the threshold.',
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Labels' },
    },
    minLabelSize: {
      control: { max: 80, min: 0, step: 2, type: 'range' },
      description:
        'Smallest cross-text extent (px) that still gets a label: the arc length at the node mid-radius (radial) or the rect width (linear). Catches inner-ring nodes that hold a wide angle but almost no arc.',
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Labels' },
    },
    padAngle: {
      control: { max: 0.05, min: 0, step: 0.005, type: 'range' },
      description: 'Angular gap between adjacent nodes in radians (radial layout)',
      table: { category: 'Layer - Geometry' },
    },
    // Theme - Segment Styling
    segmentOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Segment fill opacity',
      table: { category: 'Theme - Segment Styling' },
    },
    segmentStroke: {
      control: 'color',
      description: 'Segment outline stroke color (separates adjacent segments)',
      table: { category: 'Theme - Segment Styling' },
    },
    segmentStrokeWidth: {
      control: { max: 6, min: 0, step: 1, type: 'range' },
      description: 'Segment outline stroke width (px)',
      table: { category: 'Theme - Segment Styling' },
    },
    // Theme - Segment Palette
    seriesColor1: {
      control: 'color',
      description: 'Branch 1 fill (Housing)',
      table: { category: 'Theme - Segment Palette' },
    },
    seriesColor2: {
      control: 'color',
      description: 'Branch 2 fill (Food)',
      table: { category: 'Theme - Segment Palette' },
    },
    seriesColor3: {
      control: 'color',
      description: 'Branch 3 fill (Transport)',
      table: { category: 'Theme - Segment Palette' },
    },
    showLabels: {
      control: 'boolean',
      description:
        'Draw a label on each node — along its radius (radial) or inside its rect (linear). Opt-in.',
      table: { category: 'Layer - Labels' },
    },
    showLegend: {
      control: 'boolean',
      description: 'Show the internal chart legend',
      table: { category: 'Layer - Legend' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on node hover',
      table: { category: 'Layer - Tooltip' },
    },
    startAngle: {
      control: { max: 3.14, min: -3.14, step: 0.02, type: 'range' },
      description: 'Start of the angular sweep in radians (radial layout)',
      table: { category: 'Layer - Geometry' },
    },
    tooltipBackgroundColor: {
      control: 'color',
      description: 'Tooltip background color',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipBorderColor: {
      control: 'color',
      description: 'Tooltip border color',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipBorderWidth: {
      control: { max: 5, min: 0, step: 1, type: 'range' },
      description: 'Tooltip border width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipDivotHeight: {
      control: { max: 30, min: 8, step: 2, type: 'range' },
      description: 'Tooltip divot height',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipDivotWidth: {
      control: { max: 40, min: 12, step: 2, type: 'range' },
      description: 'Tooltip divot width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipHeight: {
      control: { max: 120, min: 40, step: 5, type: 'range' },
      description: 'Tooltip height',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipWidth: {
      control: { max: 260, min: 80, step: 10, type: 'range' },
      description: 'Tooltip width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
  },
  component: NgeSunburstChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Sunburst Chart/Interaction',
};

export default meta;
type Story = StoryObj<NgeSunburstChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    endAngle: 6.28,
    innerRadius: 0,
    interactiveLegend: false,
    labelColor: '',
    labelFontSize: 10,
    labelFontWeight: 600,
    layout: 'radial',
    legendPosition: 'right',
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    maxDepth: 0,
    maxLabelDepth: 0,
    minLabelAngle: 0.15,
    minLabelSize: 12,
    padAngle: 0,
    segmentOpacity: 1,
    segmentStroke: '',
    segmentStrokeWidth: 1,
    seriesColor1: '#1E88E5',
    seriesColor2: '#43A047',
    seriesColor3: '#FB8C00',
    showLabels: false,
    showLegend: true,
    showTooltip: true,
    startAngle: 0,
    tooltipBackgroundColor: '',
    tooltipBorderColor: '',
    tooltipBorderWidth: 1,
    tooltipDivotHeight: 12,
    tooltipDivotWidth: 24,
    tooltipHeight: 65,
    tooltipWidth: 150,
  },
};

/**
 * Renders the standalone interactive `<nge-chart-legend>` above the chart with the
 * chart's internal legend suppressed. Clicking a branch toggles it (and its whole
 * subtree) in/out of the sunburst — the sunburst rebuilds without it while the branch
 * stays listed in the legend but dimmed (opacity 0.4) so it can be toggled back on.
 * Survivors keep their colours (each visible branch is stamped with its stable palette
 * colour before re-rendering).
 */
export const InteractiveLegend: Story = {
  args: {
    ...Interaction.args,
    interactiveLegend: true,
  },
};

/**
 * On-node labels, opened at the settings a crowded hierarchy actually needs. Each label runs
 * ALONG its ring's radius and flips on the left hemisphere so none reads upside down; its
 * colour is derived per node from that node's own fill (`labelColor` empty), so it stays
 * legible across the whole palette rather than betting on one flat value.
 *
 * The two thresholds do different jobs, and the controls show why both exist. Drop
 * `minLabelSize` to 0 and the inner ring picks up labels it has no arc to hold — an angle
 * threshold alone cannot suppress those, because their sweep is generous. Raise
 * `minLabelAngle` instead and only the narrow wedges go. `maxLabelDepth` is the blunt
 * instrument for a deep tree: label the rings that read, draw all of them.
 *
 * Flip `layout` to `linear` to see the same labels centered horizontally in their icicle
 * cells, with `minLabelSize` measured against the rect's width.
 */
export const LabelledNodes: Story = {
  args: {
    ...Interaction.args,
    innerRadius: 0.25,
    maxLabelDepth: 2,
    minLabelSize: 24,
    showLabels: true,
    showLegend: false,
  },
};
