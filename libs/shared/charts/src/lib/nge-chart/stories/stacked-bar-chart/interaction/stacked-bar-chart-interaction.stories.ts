import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { StackedBarChartInteractionStoriesComponent } from './stacked-bar-chart-interaction-stories.component';

const meta: Meta<StackedBarChartInteractionStoriesComponent> = {
  argTypes: {
    // Layer - Layout
    animationMs: {
      control: { max: 1000, min: 0, step: 50, type: 'range' },
      description: 'Enter/update transition duration (ms)',
      table: { category: 'Layer - Layout' },
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
    barPadding: {
      control: { max: 0.9, min: 0, step: 0.05, type: 'range' },
      description: 'Padding between columns (0–1)',
      table: { category: 'Layer - Layout' },
    },
    barRadius: {
      control: { max: 20, min: 0, step: 1, type: 'range' },
      description: 'Segment corner radius (px)',
      table: { category: 'Layer - Layout' },
    },
    // Theme - Series Palette
    barStroke: {
      control: 'color',
      description: 'Segment separator stroke color',
      table: { category: 'Theme - Series Palette' },
    },
    barStrokeWidth: {
      control: { max: 5, min: 0, step: 1, type: 'range' },
      description: 'Segment separator stroke width (px)',
      table: { category: 'Theme - Series Palette' },
    },
    interactiveLegend: {
      control: 'boolean',
      description:
        'Suppress the internal legend and show the standalone interactive <nge-chart-legend> above the chart; click a series to toggle it in/out of the stack.',
      table: { category: 'Layer - Legend' },
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
    labelFontWeight: {
      control: { max: 800, min: 300, step: 100, type: 'range' },
      description: 'Value label font weight',
      table: { category: 'Theme - Label Styling' },
    },
    // Layer - Legend
    legendPosition: {
      control: 'radio',
      description: 'Legend position relative to chart',
      if: { arg: 'showLegend' },
      options: ['bottom', 'top', 'left', 'right'],
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
    // Base - Margins
    marginTop: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    marimekko: {
      control: 'boolean',
      description: 'Marimekko — column width ∝ group total (pair with expand). Forces vertical.',
      table: { category: 'Layer - Layout' },
    },
    orientation: {
      control: 'radio',
      description: 'Bar orientation (ignored for Marimekko)',
      options: ['vertical', 'horizontal'],
      table: { category: 'Layer - Layout' },
    },
    seriesColor1: {
      control: 'color',
      description: 'Series 1 fill (Cloud)',
      table: { category: 'Theme - Series Palette' },
    },
    seriesColor2: {
      control: 'color',
      description: 'Series 2 fill (Licenses)',
      table: { category: 'Theme - Series Palette' },
    },
    seriesColor3: {
      control: 'color',
      description: 'Series 3 fill (Services)',
      table: { category: 'Theme - Series Palette' },
    },
    seriesColor4: {
      control: 'color',
      description: 'Series 4 fill (Support)',
      table: { category: 'Theme - Series Palette' },
    },
    // Layer - Visibility
    showLabels: {
      control: 'boolean',
      description: 'Show per-segment value labels',
      table: { category: 'Layer - Visibility' },
    },
    showLegend: {
      control: 'boolean',
      description: 'Show chart legend',
      table: { category: 'Layer - Legend' },
    },
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on segment hover',
      table: { category: 'Layer - Tooltip' },
    },
    showXAxis: {
      control: 'boolean',
      description: 'Show X axis',
      table: { category: 'Layer - Visibility' },
    },
    showXGrid: {
      control: 'boolean',
      description: 'Show vertical gridlines',
      table: { category: 'Layer - Visibility' },
    },
    showYAxis: {
      control: 'boolean',
      description: 'Show Y axis',
      table: { category: 'Layer - Visibility' },
    },
    showYGrid: {
      control: 'boolean',
      description: 'Show horizontal gridlines',
      table: { category: 'Layer - Visibility' },
    },
    stackOffset: {
      control: 'radio',
      description: "Stacking mode ('none' = absolute, 'expand' = 100%)",
      options: ['none', 'expand'],
      table: { category: 'Layer - Layout' },
    },
    tooltipHeight: {
      control: { max: 120, min: 40, step: 5, type: 'range' },
      description: 'Tooltip height',
      if: { arg: 'showTooltip' },
      table: { category: 'Layer - Tooltip' },
    },
    tooltipPosition: {
      control: 'radio',
      description: 'Tooltip position relative to segment',
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
    xAxisLabel: {
      control: 'text',
      description: 'X axis label text',
      table: { category: 'Layer - Visibility' },
    },
    yAxisLabel: {
      control: 'text',
      description: 'Y axis label text',
      table: { category: 'Layer - Visibility' },
    },
  },
  component: StackedBarChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Stacked Bar Chart/Interaction',
};

export default meta;
type Story = StoryObj<StackedBarChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    animationMs: 300,
    axisLabelFontSize: 14,
    axisTickFontSize: 12,
    barPadding: 0.2,
    barRadius: 0,
    barStroke: '',
    barStrokeWidth: 1,
    interactiveLegend: false,
    labelColor: '',
    labelFontSize: 10,
    labelFontWeight: 500,
    legendPosition: 'bottom',
    marginBottom: 45,
    marginLeft: 55,
    marginRight: 20,
    marginTop: 20,
    marimekko: false,
    orientation: 'vertical',
    seriesColor1: '#1E88E5',
    seriesColor2: '#43A047',
    seriesColor3: '#FB8C00',
    seriesColor4: '#8E24AA',
    showLabels: true,
    showLegend: true,
    showTooltip: true,
    showXAxis: true,
    showXGrid: false,
    showYAxis: true,
    showYGrid: false,
    stackOffset: 'none',
    tooltipHeight: 65,
    tooltipPosition: 'follow-mouse',
    tooltipWidth: 150,
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Revenue ($K)',
  },
};

/**
 * Renders the standalone interactive `<nge-chart-legend>` above the chart with
 * the chart's internal legend suppressed. Clicking a series toggles it in/out of
 * the stacked bars — the stack rebuilds without it while the series stays listed
 * in the legend but dimmed (opacity 0.4) so it can be toggled back on.
 */
export const InteractiveLegend: Story = {
  args: {
    ...Interaction.args,
    interactiveLegend: true,
  },
};
