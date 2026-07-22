import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { HistogramChartInteractionStoriesComponent } from './histogram-chart-interaction-stories.component';

const meta: Meta<HistogramChartInteractionStoriesComponent> = {
  argTypes: {
    // Theme - Bar Styling
    barColor: {
      control: 'color',
      description: 'Bar fill color (--chart-primary slot)',
      table: { category: 'Theme - Bar Styling' },
    },
    // Layer - Layout
    barGap: {
      control: { max: 8, min: 0, step: 1, type: 'range' },
      description: 'Horizontal gap between adjacent bin bars (px)',
      table: { category: 'Layer - Layout' },
    },
    barOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Bar fill opacity (0-1)',
      table: { category: 'Theme - Bar Styling' },
    },
    barRadius: {
      control: { max: 12, min: 0, step: 1, type: 'range' },
      description: 'Bar corner radius (px)',
      table: { category: 'Theme - Bar Styling' },
    },
    barStroke: {
      control: 'color',
      description: 'Bar outline stroke (separates adjacent bins)',
      table: { category: 'Theme - Bar Styling' },
    },
    barStrokeWidth: {
      control: { max: 4, min: 0, step: 0.5, type: 'range' },
      description: 'Bar outline stroke width (px)',
      table: { category: 'Theme - Bar Styling' },
    },
    binCount: {
      control: { max: 40, min: 2, step: 1, type: 'range' },
      description: 'Number of uniform bins across the data extent',
      table: { category: 'Layer - Layout' },
    },
    // Theme - Curve Styling
    curveColor: {
      control: 'color',
      description: 'Rootogram fitted-curve color (--chart-secondary slot)',
      if: { arg: 'mode', eq: 'rootogram' },
      table: { category: 'Theme - Curve Styling' },
    },
    curveWidth: {
      control: { max: 6, min: 1, step: 0.5, type: 'range' },
      description: 'Rootogram fitted-curve stroke width (px)',
      if: { arg: 'mode', eq: 'rootogram' },
      table: { category: 'Theme - Curve Styling' },
    },
    // Theme - Label Styling
    labelColor: {
      control: 'color',
      description: 'Per-bin count label color (--chart-on-surface slot)',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    labelFontSize: {
      control: { max: 20, min: 8, step: 1, type: 'range' },
      description: 'Per-bin count label font size (px)',
      if: { arg: 'showLabels' },
      table: { category: 'Theme - Label Styling' },
    },
    // Base - Margins
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
    // Layer - Mode
    mode: {
      control: 'radio',
      description: 'histogram (bars from the axis) vs rootogram (bars hung from the fitted curve)',
      options: ['histogram', 'rootogram'],
      table: { category: 'Layer - Mode' },
    },
    // Theme - Node Styling
    nodeColor: {
      control: 'color',
      description: 'Rootogram curve-node color (--chart-secondary slot)',
      if: { arg: 'mode', eq: 'rootogram' },
      table: { category: 'Theme - Node Styling' },
    },
    nodeRadius: {
      control: { max: 10, min: 0, step: 0.5, type: 'range' },
      description: 'Rootogram curve-node radius (px; 0 hides the nodes)',
      if: { arg: 'mode', eq: 'rootogram' },
      table: { category: 'Theme - Node Styling' },
    },
    // Layer - Visibility
    showLabels: {
      control: 'boolean',
      description: 'Show per-bin count labels above each bar',
      table: { category: 'Layer - Visibility' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on bin hover',
      table: { category: 'Layer - Tooltip' },
    },
    // Layer - Visibility (rootogram)
    showZeroLine: {
      control: 'boolean',
      description: 'Draw the y = 0 residual baseline (rootogram mode)',
      if: { arg: 'mode', eq: 'rootogram' },
      table: { category: 'Layer - Visibility' },
    },
    // Layer - Axis Labels
    xAxisLabel: {
      control: 'text',
      description: 'X axis label',
      table: { category: 'Layer - Axis Labels' },
    },
    yAxisLabel: {
      control: 'text',
      description: 'Y axis label',
      table: { category: 'Layer - Axis Labels' },
    },
    // Theme - Zero Line Styling
    zeroLineColor: {
      control: 'color',
      description: 'Rootogram zero-line color (--chart-on-surface-variant slot)',
      if: { arg: 'showZeroLine' },
      table: { category: 'Theme - Zero Line Styling' },
    },
  },
  component: HistogramChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Histogram Chart/Interaction',
};

export default meta;
type Story = StoryObj<HistogramChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    barColor: '',
    barGap: 1,
    barOpacity: 1,
    barRadius: 0,
    barStroke: '',
    barStrokeWidth: 1,
    binCount: 10,
    curveColor: '',
    curveWidth: 2,
    labelColor: '',
    labelFontSize: 10,
    marginBottom: 45,
    marginLeft: 50,
    marginRight: 15,
    marginTop: 20,
    mode: 'histogram',
    nodeColor: '',
    nodeRadius: 4,
    showLabels: false,
    showTooltip: true,
    showZeroLine: false,
    xAxisLabel: 'Value',
    yAxisLabel: 'Frequency',
    zeroLineColor: '',
  },
};

/**
 * Hanging rootogram: bars hung from the fitted normal expected-frequency curve,
 * threaded by curve nodes, with the y = 0 residual baseline drawn.
 */
export const Rootogram: Story = {
  args: {
    ...Interaction.args,
    mode: 'rootogram',
    showLabels: false,
    showZeroLine: true,
  },
};
