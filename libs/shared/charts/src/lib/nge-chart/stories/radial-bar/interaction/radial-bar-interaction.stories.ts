import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { NgeRadialBarInteractionStoriesComponent } from './radial-bar-interaction-stories.component';

const meta: Meta<NgeRadialBarInteractionStoriesComponent> = {
  argTypes: {
    // Theme - Area Styling
    areaFillOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Radial area fill opacity (mark: area)',
      table: { category: 'Theme - Area Styling' },
    },
    areaLineWidth: {
      control: { max: 6, min: 0, step: 1, type: 'range' },
      description: 'Radial area outline width in px (mark: area)',
      table: { category: 'Theme - Area Styling' },
    },
    // Theme - Cell Styling
    cellColor: {
      control: 'color',
      description: 'Circular-heatmap cell base fill (mark: cell)',
      table: { category: 'Theme - Cell Styling' },
    },
    cellMinOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Fill opacity for the lowest cell value (mark: cell)',
      table: { category: 'Theme - Cell Styling' },
    },
    // Layer - Layout
    endAngle: {
      control: { max: 6.28, min: 0, step: 0.02, type: 'range' },
      description: 'End of the angular sweep in radians (semi-circle / gauge)',
      table: { category: 'Layer - Layout' },
    },
    innerRadius: {
      control: { max: 0.9, min: 0, step: 0.05, type: 'range' },
      description: 'Inner radius ratio (0 → from center, >0 → donut hole)',
      table: { category: 'Layer - Layout' },
    },
    // Layer - Legend
    interactiveLegend: {
      control: 'boolean',
      description:
        'Suppress the internal legend and show the standalone interactive <nge-chart-legend> above the chart; click a series to toggle it in/out of the radial area (mark: area).',
      table: { category: 'Layer - Legend' },
    },
    // Theme - Label Styling
    labelColor: {
      control: 'color',
      description:
        'Flat label colour for EVERY bar. Leave empty to keep the automatic on-fill contrast (black on light bars, white on dark ones). Ignored outside the mark, where the label always tracks the plot surface.',
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
    // Layer - Labels
    labelGutter: {
      control: { max: 120, min: 0, step: 4, type: 'range' },
      description:
        'Pixels reserved around the chart for outside labels — the outer radius shrinks by this much so the ring stays inside the clipped plot area. Outside placement only.',
      if: { arg: 'labelPosition', eq: 'outside' },
      table: { category: 'Layer - Labels' },
    },
    labelPosition: {
      control: 'radio',
      description:
        'inside = on the bar, running along its radius with automatic on-fill contrast; outside = a horizontal category ring just past the perimeter, on the plot surface.',
      if: { arg: 'showLabels' },
      options: ['inside', 'outside'],
      table: { category: 'Layer - Labels' },
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
    mark: {
      control: 'radio',
      description: 'Radial mark: bar arcs, closed radial area, or heatmap cells',
      options: ['bar', 'area', 'cell'],
      table: { category: 'Layer - Layout' },
    },
    minLabelAngle: {
      control: { max: 1, min: 0, step: 0.01, type: 'range' },
      description:
        'Smallest bar sweep (radians) that still gets a label. A zero-sweep bar is never labelled whatever the threshold.',
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Labels' },
    },
    minLabelSize: {
      control: { max: 80, min: 0, step: 2, type: 'range' },
      description:
        "Smallest extent (px) that still gets a label, in whichever direction the text runs: the bar's own length (inside) plus the arc at the label's radius. Catches a bar that holds a wide angle but is too short to seat a line.",
      if: { arg: 'showLabels' },
      table: { category: 'Layer - Labels' },
    },
    padAngle: {
      control: { max: 0.1, min: 0, step: 0.005, type: 'range' },
      description: 'Angular gap between adjacent bars in radians (mark: bar)',
      table: { category: 'Layer - Layout' },
    },
    // Theme - Bar Styling
    seriesColor1: {
      control: 'color',
      description: 'Palette color 1 (bars by datum index / area series by index)',
      table: { category: 'Theme - Bar Styling' },
    },
    seriesColor2: {
      control: 'color',
      description: 'Palette color 2',
      table: { category: 'Theme - Bar Styling' },
    },
    seriesColor3: {
      control: 'color',
      description: 'Palette color 3',
      table: { category: 'Theme - Bar Styling' },
    },
    showLabels: {
      control: 'boolean',
      description:
        "Draw a label on each bar (mark: bar only — an area has no per-datum mark, and a cell encodes value as fill opacity, which the on-fill contrast derivation can't read).",
      table: { category: 'Layer - Labels' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    startAngle: {
      control: { max: 3.14, min: -3.14, step: 0.02, type: 'range' },
      description: 'Start of the angular sweep in radians (semi-circle / gauge)',
      table: { category: 'Layer - Layout' },
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
    wedge: {
      control: 'radio',
      description: 'Angular distribution (mark: bar): equal slots or value-proportional wedges',
      options: ['equal', 'value'],
      table: { category: 'Layer - Layout' },
    },
  },
  component: NgeRadialBarInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Radial Bar/Interaction',
};

export default meta;
type Story = StoryObj<NgeRadialBarInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    areaFillOpacity: 0.3,
    areaLineWidth: 2,
    cellColor: '',
    cellMinOpacity: 0.1,
    endAngle: 6.28,
    innerRadius: 0.1,
    interactiveLegend: false,
    labelColor: '',
    labelFontSize: 10,
    labelFontWeight: 600,
    labelGutter: 48,
    labelPosition: 'inside',
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    mark: 'bar',
    minLabelAngle: 0.15,
    minLabelSize: 12,
    padAngle: 0.02,
    seriesColor1: '#1E88E5',
    seriesColor2: '#43A047',
    seriesColor3: '#FB8C00',
    showLabels: false,
    showTooltip: true,
    startAngle: 0,
    tooltipBackgroundColor: '',
    tooltipBorderColor: '',
    tooltipBorderWidth: 1,
    tooltipDivotHeight: 12,
    tooltipDivotWidth: 24,
    tooltipHeight: 65,
    tooltipWidth: 150,
    wedge: 'equal',
  },
};

/**
 * Renders the standalone interactive `<nge-chart-legend>` above the chart with the
 * chart's internal legend suppressed, seeded with `mark: 'area'` so there are series to
 * toggle. Clicking a series toggles it in/out of the radial area — the area rebuilds
 * without it while the series stays listed in the legend but dimmed (opacity 0.4) so it
 * can be toggled back on. Survivors keep their colors (a stable `seriesColors` slice
 * aligned to the visible series' original order is handed to the renderer).
 */
export const InteractiveLegend: Story = {
  args: {
    ...Interaction.args,
    interactiveLegend: true,
    mark: 'area',
  },
};
