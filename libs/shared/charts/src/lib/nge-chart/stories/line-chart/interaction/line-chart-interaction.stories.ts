import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { LineChartInteractionStoriesComponent } from './line-chart-interaction-stories.component';

const meta: Meta<LineChartInteractionStoriesComponent> = {
  argTypes: {
    // Layer - Area Options
    areaOpacity: {
      control: { max: 1, min: 0, step: 0.1, type: 'range' },
      description: 'Area fill opacity (0-1)',
      if: { arg: 'showArea' },
      table: { category: 'Layer - Area' },
    },
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
    // Layer - Curve Type
    curveType: {
      control: 'radio',
      description: 'Line curve interpolation',
      options: ['linear', 'monotone', 'step'],
      table: { category: 'Layer - Line Style' },
    },
    // Interaction (ARCH-174)
    dataMode: {
      control: 'radio',
      description: 'X data type: categorical (band-window zoom) or time (continuous zoom)',
      options: ['categorical', 'time'],
      table: { category: 'Interaction' },
    },
    enableGestures: {
      control: 'boolean',
      description: 'Wheel-zoom / drag-pan / brush-zoom (double-click resets)',
      table: { category: 'Interaction' },
    },
    // Theme - Line Styling
    lineColor: {
      control: 'color',
      description: 'Line stroke color',
      table: { category: 'Theme - Line Styling' },
    },
    lineWidth: {
      control: { max: 8, min: 1, step: 1, type: 'range' },
      description: 'Line stroke width',
      table: { category: 'Theme - Line Styling' },
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
    // Theme - Point Styling
    pointRadius: {
      control: { max: 12, min: 0, step: 1, type: 'range' },
      description: 'Data point radius',
      if: { arg: 'showPoints' },
      table: { category: 'Theme - Point Styling' },
    },
    // Layer - Visibility
    showArea: {
      control: 'boolean',
      description: 'Fill area under line',
      table: { category: 'Layer - Visibility' },
    },
    showPoints: {
      control: 'boolean',
      description: 'Show data points',
      table: { category: 'Layer - Visibility' },
    },
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    showXAxis: {
      control: 'boolean',
      description: 'Show X axis',
      table: { category: 'Layer - Visibility' },
    },
    showYAxis: {
      control: 'boolean',
      description: 'Show Y axis',
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
    yAxisLabel: {
      control: 'text',
      description: 'Y axis label text',
      table: { category: 'Layer - Axis Labels' },
    },
  },
  component: LineChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Line Chart/Interaction',
};

export default meta;
type Story = StoryObj<LineChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    // Layer - Area
    areaOpacity: 0.3,
    // Theme - Axis Styling (defaults from DEFAULT_CHART_BASE_THEME)
    axisLabelFontSize: 14,
    axisTickFontSize: 12,
    // Layer - Line Style
    curveType: 'linear',
    // Interaction
    dataMode: 'categorical',
    enableGestures: true,
    // Theme - Line Styling
    lineColor: '',
    lineWidth: 2,
    marginBottom: 45,
    marginLeft: 50,
    marginRight: 20,
    // Base - Margins (defaults from DEFAULT_BASE_LAYOUT_CONFIG)
    marginTop: 20,
    // Theme - Point Styling
    pointRadius: 4,
    // Layer - Visibility
    showArea: false,
    showPoints: true,
    showTooltip: true,
    showXAxis: true,
    showYAxis: true,
    // Layer - Tooltip
    tooltipBackgroundColor: '',
    tooltipBorderColor: '',
    tooltipBorderWidth: 1,
    tooltipDivotHeight: 12,
    tooltipDivotWidth: 24,
    tooltipHeight: 65,
    tooltipPosition: 'follow-mouse',
    tooltipWidth: 140,
    // Layer - Axis Labels
    xAxisLabel: 'xAxisLabel',
    yAxisLabel: 'yAxisLabel',
  },
};
