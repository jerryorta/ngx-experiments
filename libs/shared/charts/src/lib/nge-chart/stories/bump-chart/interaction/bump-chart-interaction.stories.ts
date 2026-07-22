import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { BumpChartInteractionStoriesComponent } from './bump-chart-interaction-stories.component';

const meta: Meta<BumpChartInteractionStoriesComponent> = {
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
    // Layer - Layout
    curveType: {
      control: 'radio',
      description: 'Rank-line curve interpolation',
      options: ['bump', 'linear', 'monotone'],
      table: { category: 'Layer - Layout' },
    },
    // Layer - Legend
    interactiveLegend: {
      control: 'boolean',
      description:
        'Suppress the internal legend and show the standalone interactive <nge-chart-legend> above the chart; click a series to toggle its rank line on/off.',
      table: { category: 'Layer - Legend' },
    },
    // Theme - Label Styling
    labelColor: {
      control: 'color',
      description: 'End-of-line label color',
      table: { category: 'Theme - Label Styling' },
    },
    labelFontSize: {
      control: { max: 20, min: 8, step: 1, type: 'range' },
      description: 'End-of-line label font size',
      table: { category: 'Theme - Label Styling' },
    },
    labelFontWeight: {
      control: { max: 900, min: 100, step: 100, type: 'range' },
      description: 'End-of-line label font weight',
      table: { category: 'Theme - Label Styling' },
    },
    legendPosition: {
      control: 'radio',
      description: 'Internal legend position',
      if: { arg: 'showLegend' },
      options: ['bottom', 'left', 'right', 'top'],
      table: { category: 'Layer - Legend' },
    },
    // Theme - Line Styling
    lineDash: {
      control: 'text',
      description: "Line dash pattern (e.g. '6 4'); empty = solid",
      table: { category: 'Theme - Line Styling' },
    },
    lineWidth: {
      control: { max: 8, min: 1, step: 0.5, type: 'range' },
      description: 'Rank-line stroke width',
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
    pointHoverRadius: {
      control: { max: 16, min: 4, step: 1, type: 'range' },
      description: 'Point radius on hover',
      if: { arg: 'showPoints' },
      table: { category: 'Theme - Point Styling' },
    },
    pointRadius: {
      control: { max: 12, min: 0, step: 1, type: 'range' },
      description: 'Per-rank point radius',
      if: { arg: 'showPoints' },
      table: { category: 'Theme - Point Styling' },
    },
    pointStrokeWidth: {
      control: { max: 6, min: 0, step: 1, type: 'range' },
      description: 'Point stroke width',
      if: { arg: 'showPoints' },
      table: { category: 'Theme - Point Styling' },
    },
    // Layer - Layout
    rankOrder: {
      control: 'radio',
      description: "Ranking direction: 'desc' (highest value = rank 1) or 'asc'",
      options: ['asc', 'desc'],
      table: { category: 'Layer - Layout' },
    },
    // Theme - Series Palette (interactive-legend demo)
    seriesColor1: {
      control: 'color',
      description: 'Series 1 stroke (Nova)',
      table: { category: 'Theme - Series Palette' },
    },
    seriesColor2: {
      control: 'color',
      description: 'Series 2 stroke (Orbit)',
      table: { category: 'Theme - Series Palette' },
    },
    seriesColor3: {
      control: 'color',
      description: 'Series 3 stroke (Pulse)',
      table: { category: 'Theme - Series Palette' },
    },
    seriesColor4: {
      control: 'color',
      description: 'Series 4 stroke (Vertex)',
      table: { category: 'Theme - Series Palette' },
    },
    seriesColor5: {
      control: 'color',
      description: 'Series 5 stroke (Zenith)',
      table: { category: 'Theme - Series Palette' },
    },
    // Layer - Visibility
    showLabels: {
      control: 'boolean',
      description: 'Show end-of-line series labels',
      table: { category: 'Layer - Visibility' },
    },
    showLegend: {
      control: 'boolean',
      description: 'Show the internal auto-generated legend (ignored when interactiveLegend is on)',
      table: { category: 'Layer - Legend' },
    },
    showPoints: {
      control: 'boolean',
      description: 'Show per-rank point circles',
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
      description: 'Show Y (rank) axis',
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
      control: { max: 260, min: 80, step: 10, type: 'range' },
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
  component: BumpChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Bump Chart/Interaction',
};

export default meta;
type Story = StoryObj<BumpChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    // Theme - Axis Styling
    axisLabelFontSize: 14,
    axisTickFontSize: 12,
    // Layer - Layout
    curveType: 'bump',
    // Layer - Legend
    interactiveLegend: false,
    // Theme - Label Styling
    labelColor: '',
    labelFontSize: 11,
    labelFontWeight: 600,
    legendPosition: 'bottom',
    // Theme - Line Styling
    lineDash: '',
    lineWidth: 2.5,
    marginBottom: 45,
    marginLeft: 45,
    marginRight: 45,
    // Base - Margins
    marginTop: 20,
    // Theme - Point Styling
    pointHoverRadius: 7,
    pointRadius: 5,
    pointStrokeWidth: 2,
    // Layer - Layout
    rankOrder: 'desc',
    // Theme - Series Palette
    seriesColor1: '#1E88E5',
    seriesColor2: '#43A047',
    seriesColor3: '#FB8C00',
    seriesColor4: '#E53935',
    seriesColor5: '#8E24AA',
    // Layer - Visibility
    showLabels: true,
    showLegend: false,
    showPoints: true,
    showTooltip: true,
    showXAxis: true,
    showYAxis: true,
    // Layer - Tooltip
    tooltipBackgroundColor: '',
    tooltipBorderColor: '',
    tooltipHeight: 65,
    tooltipPosition: 'follow-mouse',
    tooltipWidth: 160,
    // Layer - Axis Labels
    xAxisLabel: 'Year',
    yAxisLabel: 'Rank',
  },
};

/**
 * Renders the standalone interactive `<nge-chart-legend>` above the bump chart with
 * the chart's internal legend suppressed. Clicking a series toggles its rank line in/out
 * — the chart rebuilds without it (its color held stable via a fixed `seriesColors`
 * palette aligned to the surviving series) while the series stays listed in the legend
 * but dimmed (opacity 0.4) so it can be toggled back on.
 */
export const InteractiveLegend: Story = {
  args: {
    ...Interaction.args,
    interactiveLegend: true,
  },
};
