import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { ScatterChartInteractionStoriesComponent } from './scatter-chart-interaction-stories.component';

const meta: Meta<ScatterChartInteractionStoriesComponent> = {
  argTypes: {
    // Theme - Axis Styling
    axisLabelFontSize: {
      control: { max: 20, min: 8, step: 1, type: 'range' },
      description: 'Axis label font size',
      table: { category: 'Theme - Axis Styling' },
    },
    axisTickFontSize: {
      control: { max: 16, min: 8, step: 1, type: 'range' },
      description: 'Axis tick font size',
      table: { category: 'Theme - Axis Styling' },
    },
    // Gestures
    enableGestures: {
      control: 'boolean',
      description: 'Enable wheel-zoom + drag-pan (double-click resets)',
      table: { category: 'Gestures' },
    },
    // Legend
    externalLegend: {
      control: 'boolean',
      description:
        'Hide the chart-internal legend and render a standalone <nge-chart-legend> above the chart',
      if: { arg: 'multiSeries' },
      table: { category: 'Legend' },
    },
    legendPosition: {
      control: 'radio',
      description: 'Legend position',
      if: { arg: 'showLegend' },
      options: ['top', 'bottom', 'left', 'right'],
      table: { category: 'Legend' },
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
    // Base - Margins
    marginTop: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    // Data - Series
    multiSeries: {
      control: 'boolean',
      description: 'Use multi-series data (points grouped by seriesId)',
      table: { category: 'Data - Series' },
    },
    // Theme - Point Styling
    pointColor: {
      control: 'color',
      description: 'Default point fill color',
      table: { category: 'Theme - Point Styling' },
    },
    pointHoverColor: {
      control: 'color',
      description: 'Point fill color on hover',
      table: { category: 'Theme - Point Styling' },
    },
    pointOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Point fill opacity (0-1)',
      table: { category: 'Theme - Point Styling' },
    },
    // Layer - Points
    pointRadius: {
      control: { max: 20, min: 1, step: 1, type: 'range' },
      description: 'Default point radius (px)',
      table: { category: 'Layer - Points' },
    },
    // Data - Series
    pointsPerSeries: {
      control: { max: 200, min: 2, step: 1, type: 'range' },
      description: 'Points per series / data density — increase for larger clouds',
      table: { category: 'Data - Series' },
    },
    pointStrokeColor: {
      control: 'color',
      description: 'Point stroke color',
      table: { category: 'Theme - Point Styling' },
    },
    pointStrokeWidth: {
      control: { max: 5, min: 0, step: 0.5, type: 'range' },
      description: 'Point stroke width (px)',
      table: { category: 'Theme - Point Styling' },
    },
    // Range Axis
    rangeAxisX: {
      control: 'boolean',
      description:
        'Replace the X axis with a full-range ruler + draggable brush (drag a handle to zoom the plot, drag the window to pan)',
      table: { category: 'Range Axis' },
    },
    rangeAxisY: {
      control: 'boolean',
      description:
        'Replace the Y axis with a full-range ruler + draggable brush (drag a handle to zoom the plot, drag the window to pan)',
      table: { category: 'Range Axis' },
    },
    // Legend
    showLegend: {
      control: 'boolean',
      description: 'Show legend (auto-generated from series)',
      table: { category: 'Legend' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    // Layer - Visibility
    showXAxis: {
      control: 'boolean',
      description: 'Show X axis',
      table: { category: 'Layer - Visibility' },
    },
    showXGrid: {
      control: 'boolean',
      description: 'Show vertical gridlines at the X axis tick positions',
      table: { category: 'Layer - Visibility' },
    },
    showYAxis: {
      control: 'boolean',
      description: 'Show Y axis',
      table: { category: 'Layer - Visibility' },
    },
    showYGrid: {
      control: 'boolean',
      description: 'Show horizontal gridlines at the Y axis tick positions',
      table: { category: 'Layer - Visibility' },
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
      control: { max: 30, min: 10, step: 1, type: 'range' },
      description: 'Tooltip divot height',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipDivotWidth: {
      control: { max: 40, min: 10, step: 1, type: 'range' },
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
    tooltipPosition: {
      control: 'radio',
      description: 'Tooltip position relative to point',
      if: { arg: 'showTooltip' },
      options: ['above', 'below', 'follow-mouse'],
      table: { category: 'Layer - Tooltip' },
    },
    tooltipWidth: {
      control: { max: 200, min: 80, step: 10, type: 'range' },
      description: 'Tooltip width',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    // Layer - Axis Labels
    xAxisLabel: {
      control: 'text',
      description: 'X axis label text',
      table: { category: 'Layer - Axis Labels' },
    },
    // Layer - Axis Ticks
    xAxisTicks: {
      control: { max: 12, min: 0, step: 1, type: 'range' },
      description: 'Number of X axis ticks (0 = auto)',
      table: { category: 'Layer - Axis Ticks' },
    },
    // Layer - Domain
    xDomainPadding: {
      control: { max: 0.5, min: 0, step: 0.05, type: 'range' },
      description: 'X domain padding factor',
      table: { category: 'Layer - Domain' },
    },
    yAxisLabel: {
      control: 'text',
      description: 'Y axis label text',
      table: { category: 'Layer - Axis Labels' },
    },
    yAxisTicks: {
      control: { max: 12, min: 0, step: 1, type: 'range' },
      description: 'Number of Y axis ticks (0 = auto)',
      table: { category: 'Layer - Axis Ticks' },
    },
    yDomainPadding: {
      control: { max: 0.5, min: 0, step: 0.05, type: 'range' },
      description: 'Y domain padding factor',
      table: { category: 'Layer - Domain' },
    },
    yStartAtZero: {
      control: 'boolean',
      description: 'Anchor Y axis at zero',
      table: { category: 'Layer - Domain' },
    },
  },
  component: ScatterChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Scatter Chart/Interaction',
};

export default meta;
type Story = StoryObj<ScatterChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    // Theme - Axis Styling
    axisLabelFontSize: 14,
    axisTickFontSize: 12,
    // Gestures
    enableGestures: false,
    // Legend
    externalLegend: false,
    legendPosition: 'bottom',
    marginBottom: 45,
    marginLeft: 50,
    marginRight: 20,
    // Base - Margins
    marginTop: 20,
    // Data - Series
    multiSeries: false,
    // Theme - Point Styling
    pointColor: '',
    pointHoverColor: '',
    pointOpacity: 0.7,
    // Layer - Points
    pointRadius: 6,
    pointsPerSeries: 6,
    pointStrokeColor: '',
    pointStrokeWidth: 1,
    // Range Axis
    rangeAxisX: false,
    rangeAxisY: false,
    // Legend
    showLegend: false,
    // Layer - Tooltip
    showTooltip: true,
    // Layer - Visibility
    showXAxis: true,
    showXGrid: true,
    showYAxis: true,
    showYGrid: true,
    tooltipBackgroundColor: '',
    tooltipBorderColor: '',
    tooltipBorderWidth: 1,
    tooltipDivotHeight: 12,
    tooltipDivotWidth: 24,
    tooltipHeight: 65,
    tooltipPosition: 'follow-mouse',
    tooltipWidth: 140,
    // Layer - Axis Labels
    xAxisLabel: 'X Value',
    // Layer - Axis Ticks
    xAxisTicks: 0,
    // Layer - Domain
    xDomainPadding: 0.05,
    yAxisLabel: 'Y Value',
    yAxisTicks: 0,
    yDomainPadding: 0.1,
    yStartAtZero: false,
  },
};

export const MultiSeries: Story = {
  args: {
    ...Interaction.args,
    multiSeries: true,
    pointRadius: 4,
    pointsPerSeries: 90,
    showLegend: true,
  },
};

export const ExternalLegend: Story = {
  args: {
    ...MultiSeries.args,
    externalLegend: true,
  },
};

export const ZoomPan: Story = {
  args: {
    ...MultiSeries.args,
    enableGestures: true,
  },
};

// Linear x/y scatter whose X axis becomes a full-range ruler + draggable brush.
// Drag a handle to zoom the plot to that slice, drag the window to pan; the plot's
// own drag/zoom still works and moves the brush.
export const RangeAxisX: Story = {
  args: {
    ...Interaction.args,
    rangeAxisX: true,
  },
};

// Same idea on the Y dimension — the Y axis is the full-range slider.
export const RangeAxisY: Story = {
  args: {
    ...Interaction.args,
    // Wider left margin so the rotated Y title clears the range-axis brush band.
    marginLeft: 65,
    rangeAxisY: true,
  },
};

// Both range axes + the plot's OWN pan/brush-zoom gestures, plus a standalone
// interactive legend just above the chart over a denser multi-series cloud
// (200 pts/series) — the full range-axis feature set on one chart.
export const RangeAxisBoth: Story = {
  args: {
    ...Interaction.args,
    enableGestures: true,
    // Standalone interactive legend (requires multiSeries) — a simple config add-in.
    externalLegend: true,
    // Wider left margin so the rotated Y title clears the range-axis brush band.
    marginLeft: 65,
    multiSeries: true,
    pointRadius: 4,
    pointsPerSeries: 200,
    rangeAxisX: true,
    rangeAxisY: true,
  },
};
