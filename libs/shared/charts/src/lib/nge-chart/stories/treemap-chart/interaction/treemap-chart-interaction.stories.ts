import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeTreemapChartInteractionStoriesComponent } from './treemap-chart-interaction-stories.component';

const meta: Meta<NgeTreemapChartInteractionStoriesComponent> = {
  argTypes: {
    cellOpacity: {
      control: { max: 1, min: 0.1, step: 0.05, type: 'range' },
      description: 'Cell fill opacity',
      table: { category: 'Theme - Cell Styling' },
    },
    cellStroke: {
      control: 'color',
      description: 'Cell outline colour — empty keeps the surface token',
      table: { category: 'Theme - Cell Styling' },
    },
    cellStrokeWidth: {
      control: { max: 6, min: 0, step: 1, type: 'range' },
      description: 'Cell outline width',
      table: { category: 'Theme - Cell Styling' },
    },
    convergenceRatio: {
      control: { max: 0.1, min: 0.001, step: 0.001, type: 'range' },
      description:
        'Stop the solve at this fraction of total cell-area error (lower = slower, more faithful)',
      if: { arg: 'tiling', eq: 'voronoi' },
      table: { category: 'Layer - Voronoi' },
    },
    depthFade: {
      control: { max: 24, min: 0, step: 1, type: 'range' },
      description:
        'HCL luminance step per level of nesting. 0 paints every depth the branch colour, which makes the nesting invisible once cells get small.',
      table: { category: 'Theme - Cell Styling' },
    },
    interactiveLegend: {
      control: 'boolean',
      description:
        'Suppress the internal legend and show the standalone interactive <nge-chart-legend> above the chart; click a branch to toggle it in/out.',
      table: { category: 'Layer - Legend' },
    },
    labelColor: {
      control: 'color',
      description: 'Flat label colour — empty keeps the automatic on-fill contrast derivation',
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Labels' },
    },
    labelFontSize: {
      control: { max: 24, min: 6, step: 1, type: 'range' },
      description: 'Label font size',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelFontWeight: {
      control: { max: 900, min: 100, step: 100, type: 'range' },
      description: 'Label font weight',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    legendPosition: {
      control: 'radio',
      description: 'Legend position',
      if: { arg: 'showLegend' },
      options: ['top', 'right', 'bottom', 'left'],
      table: { category: 'Layer - Legend' },
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
    maxDepth: {
      control: { max: 4, min: 0, step: 1, type: 'range' },
      description: 'Cap the drawn levels (0 = full depth)',
      table: { category: 'Layer - Layout' },
    },
    maxIterationCount: {
      control: { max: 200, min: 5, step: 5, type: 'range' },
      description: 'Hard iteration ceiling for the solve',
      if: { arg: 'tiling', eq: 'voronoi' },
      table: { category: 'Layer - Voronoi' },
    },
    maxLabelDepth: {
      control: { max: 4, min: 0, step: 1, type: 'range' },
      description: 'Deepest level that still gets a label (0 = every drawn level)',
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Labels' },
    },
    minLabelSize: {
      control: { max: 80, min: 0, step: 2, type: 'range' },
      description: 'Smallest cell extent (px), tested on BOTH axes, that still earns a label',
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Labels' },
    },
    padding: {
      control: { max: 12, min: 0, step: 1, type: 'range' },
      description: 'Gap between sibling cells (rectangular tilings only)',
      table: { category: 'Layer - Layout' },
    },
    paddingOuter: {
      control: { max: 20, min: 0, step: 1, type: 'range' },
      description:
        'Inset between a parent cell and its children — non-zero gives the Nested Proportional Area reading (rectangular tilings only)',
      table: { category: 'Layer - Layout' },
    },
    paddingTop: {
      control: { max: 40, min: 0, step: 2, type: 'range' },
      description:
        'Extra strip at the top of a parent cell for its own label, over and above paddingOuter (rectangular tilings only)',
      table: { category: 'Layer - Layout' },
    },
    seed: {
      control: { max: 50, min: 1, step: 1, type: 'range' },
      description:
        'Seed for the initial cell sites. The layout starts from random positions, so a fixed seed is what keeps the arrangement stable across renders; change it to shop for a nicer one.',
      if: { arg: 'tiling', eq: 'voronoi' },
      table: { category: 'Layer - Voronoi' },
    },
    seriesColor1: {
      control: 'color',
      description: 'Colour for the largest top-level branch',
      table: { category: 'Theme - Cell Palette' },
    },
    seriesColor2: {
      control: 'color',
      description: 'Colour for the 2nd top-level branch',
      table: { category: 'Theme - Cell Palette' },
    },
    seriesColor3: {
      control: 'color',
      description: 'Colour for the 3rd top-level branch',
      table: { category: 'Theme - Cell Palette' },
    },
    seriesColor4: {
      control: 'color',
      description: 'Colour for the 4th top-level branch',
      table: { category: 'Theme - Cell Palette' },
    },
    showLabels: {
      control: 'boolean',
      description: 'Draw a label inside each cell',
      table: { category: 'Layer - Labels' },
    },
    showLegend: {
      control: 'boolean',
      description: 'Show the internal legend over the top-level branches',
      table: { category: 'Layer - Legend' },
    },
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    tiling: {
      control: 'select',
      description:
        "Partition algorithm. The six rectangular tilings differ only in how they cut; 'voronoi' is a weighted-Voronoi partition of convex polygons (the Convex Treemap).",
      options: ['squarify', 'resquarify', 'binary', 'slice-dice', 'dice', 'slice', 'voronoi'],
      table: { category: 'Layer - Layout' },
    },
    tooltipBackgroundColor: {
      control: 'color',
      description: 'Tooltip background colour',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipBorderColor: {
      control: 'color',
      description: 'Tooltip border colour',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipBorderWidth: {
      control: { max: 4, min: 0, step: 1, type: 'range' },
      description: 'Tooltip border width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipDivotHeight: {
      control: { max: 24, min: 0, step: 2, type: 'range' },
      description: 'Tooltip divot height',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipDivotWidth: {
      control: { max: 48, min: 0, step: 4, type: 'range' },
      description: 'Tooltip divot width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipHeight: {
      control: { max: 160, min: 40, step: 5, type: 'range' },
      description: 'Tooltip height',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipWidth: {
      control: { max: 300, min: 80, step: 10, type: 'range' },
      description: 'Tooltip width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
  },
  component: NgeTreemapChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Treemap Chart/Interaction',
};

export default meta;
type Story = StoryObj<NgeTreemapChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    cellOpacity: 1,
    cellStroke: '',
    cellStrokeWidth: 1,
    convergenceRatio: 0.01,
    depthFade: 6,
    interactiveLegend: false,
    labelColor: '',
    labelFontSize: 10,
    labelFontWeight: 600,
    legendPosition: 'right',
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    maxDepth: 0,
    maxIterationCount: 50,
    maxLabelDepth: 0,
    minLabelSize: 12,
    padding: 1,
    paddingOuter: 0,
    paddingTop: 0,
    seed: 1,
    seriesColor1: '#1E88E5',
    seriesColor2: '#43A047',
    seriesColor3: '#FB8C00',
    seriesColor4: '#8E24AA',
    showLabels: true,
    showLegend: true,
    showTooltip: true,
    tiling: 'squarify',
    tooltipBackgroundColor: '',
    tooltipBorderColor: '',
    tooltipBorderWidth: 1,
    tooltipDivotHeight: 12,
    tooltipDivotWidth: 24,
    tooltipHeight: 65,
    tooltipWidth: 150,
  },
};

export const NestedProportionalArea: Story = {
  args: {
    ...Interaction.args,
    maxLabelDepth: 1,
    padding: 2,
    paddingOuter: 4,
    paddingTop: 18,
  },
};

export const ConvexTreemap: Story = {
  args: {
    ...Interaction.args,
    maxLabelDepth: 1,
    seed: 7,
    tiling: 'voronoi',
  },
};

export const InteractiveLegend: Story = {
  args: { ...Interaction.args, interactiveLegend: true },
};
