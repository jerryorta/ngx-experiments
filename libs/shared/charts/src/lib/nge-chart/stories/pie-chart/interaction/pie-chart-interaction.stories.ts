import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { PieChartInteractionStoriesComponent } from './pie-chart-interaction-stories.component';

const meta: Meta<PieChartInteractionStoriesComponent> = {
  argTypes: {
    // Layer - Geometry
    endAngle: {
      control: { max: 6.28, min: 0, step: 0.02, type: 'range' },
      description: 'End of the angular sweep in radians (semi-circle / gauge)',
      table: { category: 'Layer - Geometry' },
    },
    innerRadius: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Inner radius as a ratio (0 → pie, >0 → donut)',
      table: { category: 'Layer - Geometry' },
    },
    // Layer - Legend
    interactiveLegend: {
      control: 'boolean',
      description:
        'Suppress the internal legend and show the standalone interactive <nge-chart-legend> above the chart; click a slice to toggle it in/out of the pie.',
      table: { category: 'Layer - Legend' },
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
    padAngle: {
      control: { max: 0.05, min: 0, step: 0.005, type: 'range' },
      description: 'Angular gap between adjacent slices in radians',
      table: { category: 'Layer - Geometry' },
    },
    // Theme - Slice Palette
    seriesColor1: {
      control: 'color',
      description: 'Slice 1 fill (Rent)',
      table: { category: 'Theme - Slice Palette' },
    },
    seriesColor2: {
      control: 'color',
      description: 'Slice 2 fill (Food)',
      table: { category: 'Theme - Slice Palette' },
    },
    seriesColor3: {
      control: 'color',
      description: 'Slice 3 fill (Transit)',
      table: { category: 'Theme - Slice Palette' },
    },
    seriesColor4: {
      control: 'color',
      description: 'Slice 4 fill (Utilities)',
      table: { category: 'Theme - Slice Palette' },
    },
    seriesColor5: {
      control: 'color',
      description: 'Slice 5 fill (Savings)',
      table: { category: 'Theme - Slice Palette' },
    },
    showLegend: {
      control: 'boolean',
      description: 'Show the internal chart legend',
      table: { category: 'Layer - Legend' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on slice hover',
      table: { category: 'Layer - Tooltip' },
    },
    // Theme - Slice Styling
    sliceOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Slice fill opacity',
      table: { category: 'Theme - Slice Styling' },
    },
    sliceStroke: {
      control: 'color',
      description: 'Slice outline stroke color (separates adjacent slices)',
      table: { category: 'Theme - Slice Styling' },
    },
    sliceStrokeWidth: {
      control: { max: 6, min: 0, step: 1, type: 'range' },
      description: 'Slice outline stroke width (px)',
      table: { category: 'Theme - Slice Styling' },
    },
    startAngle: {
      control: { max: 3.14, min: -3.14, step: 0.02, type: 'range' },
      description: 'Start of the angular sweep in radians',
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
  component: PieChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Pie Chart/Interaction',
};

export default meta;
type Story = StoryObj<PieChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    endAngle: 6.28,
    innerRadius: 0,
    interactiveLegend: false,
    legendPosition: 'right',
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    padAngle: 0,
    seriesColor1: '#1E88E5',
    seriesColor2: '#43A047',
    seriesColor3: '#FB8C00',
    seriesColor4: '#8E24AA',
    seriesColor5: '#00ACC1',
    showLegend: true,
    showTooltip: true,
    sliceOpacity: 1,
    sliceStroke: '',
    sliceStrokeWidth: 1,
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
 * chart's internal legend suppressed. Clicking a slice toggles it in/out of the pie —
 * the pie rebuilds without it while the slice stays listed in the legend but dimmed
 * (opacity 0.4) so it can be toggled back on. Survivors keep their colours (each
 * visible slice is stamped with its stable palette colour before re-rendering).
 */
export const InteractiveLegend: Story = {
  args: {
    ...Interaction.args,
    interactiveLegend: true,
  },
};
