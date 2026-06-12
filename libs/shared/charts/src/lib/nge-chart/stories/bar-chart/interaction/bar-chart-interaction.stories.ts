import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { BarChartInteractionStoriesComponent } from './bar-chart-interaction-stories.component';

const meta: Meta<BarChartInteractionStoriesComponent> = {
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
    // Theme - Bar Styling
    barColor: {
      control: 'color',
      description: 'Bar fill color',
      table: { category: 'Theme - Bar Styling' },
    },
    barHoverColor: {
      control: 'color',
      description: 'Bar hover color',
      table: { category: 'Theme - Bar Styling' },
    },
    barRadius: {
      control: { max: 20, min: 0, step: 1, type: 'range' },
      description: 'Bar corner radius',
      table: { category: 'Theme - Bar Styling' },
    },
    // Theme - Label Styling
    labelColor: {
      control: 'color',
      description: 'Value label color',
      table: { category: 'Theme - Label Styling' },
    },
    labelFontSize: {
      control: { max: 20, min: 8, step: 1, type: 'range' },
      description: 'Value label font size',
      table: { category: 'Theme - Label Styling' },
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
    // Layer - Layout
    orientation: {
      control: 'radio',
      description: 'Bar orientation',
      options: ['vertical', 'horizontal'],
      table: { category: 'Layer - Layout' },
    },
    // Layer - Visibility
    showLabels: {
      control: 'boolean',
      description: 'Show value labels on bars',
      table: { category: 'Layer - Visibility' },
    },
    showMeanLine: {
      control: 'boolean',
      description: 'Show mean reference line',
      table: { category: 'Layer - Visibility' },
    },
    showMedianLine: {
      control: 'boolean',
      description: 'Show median reference line',
      table: { category: 'Layer - Visibility' },
    },
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on bar hover',
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
    // Theme - Statistical Styling
    statisticalLabelFontSize: {
      control: { max: 20, min: 8, step: 1, type: 'range' },
      description: 'Mean/Median label font size',
      table: { category: 'Theme - Statistical Styling' },
    },
    statisticalLabelFontWeight: {
      control: { max: 900, min: 400, step: 100, type: 'range' },
      description: 'Mean/Median label font weight',
      table: { category: 'Theme - Statistical Styling' },
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
      description: 'Tooltip position relative to bar',
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
  component: BarChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Bar Chart/Interaction',
};

export default meta;
type Story = StoryObj<BarChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    // Theme - Axis Styling (defaults from DEFAULT_CHART_BASE_THEME)
    axisLabelFontSize: 14,
    axisTickFontSize: 12,
    // Theme - Bar Styling (defaults from DEFAULT_BAR_LAYER_THEME)
    barColor: '',
    barHoverColor: '',
    barRadius: 2,
    // Theme - Label Styling (defaults from DEFAULT_BAR_LAYER_THEME)
    labelColor: '',
    labelFontSize: 12,
    marginBottom: 45,
    marginLeft: 45,
    marginRight: 45,
    // Base - Margins (defaults from DEFAULT_BASE_LAYOUT_CONFIG)
    marginTop: 20,
    // Layer - Layout
    orientation: 'vertical',
    // Layer - Visibility
    showLabels: true,
    showMeanLine: true,
    showMedianLine: true,
    showTooltip: true,
    showXAxis: true,
    showYAxis: true,
    // Theme - Statistical Styling (defaults from DEFAULT_BAR_LAYER_THEME)
    statisticalLabelFontSize: 12,
    statisticalLabelFontWeight: 500,
    // Layer - Tooltip
    tooltipBackgroundColor: '',
    tooltipBorderColor: '',
    tooltipBorderWidth: 1,
    tooltipDivotHeight: 12,
    tooltipDivotWidth: 24,
    tooltipHeight: 65,
    tooltipPosition: 'follow-mouse',
    tooltipWidth: 120,
    // Layer - Axis Labels
    xAxisLabel: 'xAxisLabel',
    yAxisLabel: 'yAxisLabel',
  },
};
