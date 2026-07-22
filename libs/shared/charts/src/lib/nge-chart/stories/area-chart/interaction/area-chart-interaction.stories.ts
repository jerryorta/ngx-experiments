import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { AreaChartInteractionStoriesComponent } from './area-chart-interaction-stories.component';

const meta: Meta<AreaChartInteractionStoriesComponent> = {
  argTypes: {
    // Layer
    animationMs: {
      control: { max: 1000, min: 0, step: 50, type: 'range' },
      description: 'Enter/update transition duration (ms)',
      table: { category: 'Layer' },
    },
    curveType: {
      control: 'radio',
      description: 'Curve interpolation',
      options: ['linear', 'monotone', 'step'],
      table: { category: 'Layer' },
    },
    fillOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Area fill opacity (0–1)',
      table: { category: 'Layer' },
    },
    interactiveLegend: {
      control: 'boolean',
      description:
        'Suppress the internal legend and show the standalone interactive <nge-chart-legend> above the chart; click a series to toggle it in/out of the area.',
      table: { category: 'Legend' },
    },
    // Legend
    legendEnabled: {
      control: 'boolean',
      description: 'Show the series legend',
      table: { category: 'Legend' },
    },
    legendPosition: {
      control: 'radio',
      description: 'Legend position',
      if: { arg: 'legendEnabled' },
      options: ['bottom', 'left', 'right', 'top'],
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
    showLine: {
      control: 'boolean',
      description: 'Stroke the top edge of each band',
      table: { category: 'Layer' },
    },
    // Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Tooltip' },
    },
    // Axis
    showXAxis: {
      control: 'boolean',
      description: 'Show the X axis',
      table: { category: 'Axis' },
    },
    showXGrid: {
      control: 'boolean',
      description: 'Show vertical gridlines',
      table: { category: 'Axis' },
    },
    showYAxis: {
      control: 'boolean',
      description: 'Show the Y axis',
      table: { category: 'Axis' },
    },
    showYGrid: {
      control: 'boolean',
      description: 'Show horizontal gridlines',
      table: { category: 'Axis' },
    },
    stackOffset: {
      control: 'radio',
      description: "Stacking mode ('overlaid' = no stacking; 'diverging' needs mixed-sign data)",
      options: ['overlaid', 'none', 'expand', 'wiggle', 'diverging'],
      table: { category: 'Layer' },
    },
    tooltipHeight: {
      control: { max: 120, min: 40, step: 5, type: 'range' },
      description: 'Tooltip height',
      if: { arg: 'showTooltip' },
      table: { category: 'Tooltip' },
    },
    tooltipPosition: {
      control: 'radio',
      description: 'Tooltip position relative to point',
      if: { arg: 'showTooltip' },
      options: ['above', 'below', 'follow-mouse'],
      table: { category: 'Tooltip' },
    },
    tooltipWidth: {
      control: { max: 200, min: 80, step: 10, type: 'range' },
      description: 'Tooltip width',
      if: { arg: 'showTooltip' },
      table: { category: 'Tooltip' },
    },
    // Axis Labels
    xAxisLabel: {
      control: 'text',
      description: 'X axis label text',
      table: { category: 'Axis' },
    },
    yAxisLabel: {
      control: 'text',
      description: 'Y axis label text',
      table: { category: 'Axis' },
    },
  },
  component: AreaChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Area Chart/Interaction',
};

export default meta;
type Story = StoryObj<AreaChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    animationMs: 300,
    curveType: 'linear',
    fillOpacity: 0.3,
    interactiveLegend: false,
    legendEnabled: true,
    legendPosition: 'bottom',
    marginBottom: 45,
    marginLeft: 50,
    marginRight: 20,
    marginTop: 20,
    showLine: false,
    showTooltip: true,
    showXAxis: true,
    showXGrid: false,
    showYAxis: true,
    showYGrid: false,
    stackOffset: 'none',
    tooltipHeight: 65,
    tooltipPosition: 'follow-mouse',
    tooltipWidth: 140,
    xAxisLabel: 'Month',
    yAxisLabel: 'Sessions (K)',
  },
};

/**
 * Renders the standalone interactive `<nge-chart-legend>` above the chart with
 * the chart's internal legend suppressed. Clicking a series toggles it in/out of
 * the stacked area — the stack rebuilds without it while the series stays listed
 * in the legend but dimmed (opacity 0.4) so it can be toggled back on.
 */
export const InteractiveLegend: Story = {
  args: {
    ...Interaction.args,
    interactiveLegend: true,
  },
};
