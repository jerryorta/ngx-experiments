import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { HeatmapChartInteractionStoriesComponent } from './heatmap-chart-interaction-stories.component';

const meta: Meta<HeatmapChartInteractionStoriesComponent> = {
  argTypes: {
    // Theme - Bubble
    bubbleColor: {
      control: 'color',
      description: 'Bubble fill color (blank ⇒ inherit the resolved ramp color; bubble mode)',
      table: { category: 'Theme - Bubble' },
    },
    // Layer - Layout
    bubbleMaxRatio: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Max bubble radius as a fraction of half the smaller band step (bubble mode)',
      if: { arg: 'mark', eq: 'bubble' },
      table: { category: 'Layer - Layout' },
    },
    // Theme - Bubble
    bubbleOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Bubble fill opacity (0-1; bubble mode)',
      table: { category: 'Theme - Bubble' },
    },
    bubbleStroke: {
      control: 'color',
      description: 'Bubble outline stroke color (bubble mode)',
      table: { category: 'Theme - Bubble' },
    },
    bubbleStrokeWidth: {
      control: { max: 4, min: 0, step: 0.5, type: 'range' },
      description: 'Bubble outline stroke width (px; bubble mode)',
      table: { category: 'Theme - Bubble' },
    },
    // Theme - Cell
    cellEmptyColor: {
      control: 'color',
      description: 'Fill for empty (null) cells',
      table: { category: 'Theme - Cell' },
    },
    cellOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Cell fill opacity (0-1)',
      table: { category: 'Theme - Cell' },
    },
    cellRadius: {
      control: { max: 12, min: 0, step: 1, type: 'range' },
      description: 'Cell corner radius (px)',
      table: { category: 'Theme - Cell' },
    },
    cellRampFrom: {
      control: 'color',
      description: 'Ramp low-value endpoint color (blank ⇒ token ramp / --chart-surface)',
      table: { category: 'Theme - Cell' },
    },
    cellRampMid: {
      control: 'color',
      description: 'Optional ramp midpoint color (blank ⇒ straight two-stop ramp)',
      table: { category: 'Theme - Cell' },
    },
    cellRampTo: {
      control: 'color',
      description: 'Ramp high-value endpoint color (blank ⇒ token ramp / --chart-primary)',
      table: { category: 'Theme - Cell' },
    },
    cellStrokeWidth: {
      control: { max: 4, min: 0, step: 0.5, type: 'range' },
      description: 'Cell separator stroke width (px)',
      table: { category: 'Theme - Cell' },
    },
    // Layer - Layout
    colPadding: {
      control: { max: 0.5, min: 0, step: 0.01, type: 'range' },
      description: 'Column-axis band padding (fraction of the band step)',
      table: { category: 'Layer - Layout' },
    },
    // Layer - Color
    domainMax: {
      control: { type: 'number' },
      description: 'Upper color-domain bound (set with min to pin the scale; blank ⇒ data extent)',
      table: { category: 'Layer - Color' },
    },
    domainMin: {
      control: { type: 'number' },
      description: 'Lower color-domain bound (set with max to pin the scale; blank ⇒ data extent)',
      table: { category: 'Layer - Color' },
    },
    // Theme - Label
    labelColor: {
      control: 'color',
      description: 'Value label color',
      table: { category: 'Theme - Label' },
    },
    labelFontSize: {
      control: { max: 20, min: 6, step: 1, type: 'range' },
      description: 'Value label font size (px)',
      table: { category: 'Theme - Label' },
    },
    labelFontWeight: {
      control: { max: 900, min: 100, step: 100, type: 'range' },
      description: 'Value label font weight',
      table: { category: 'Theme - Label' },
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
    // Layer - Layout
    mark: {
      control: 'radio',
      description: 'Cell (color-encoded) vs bubble (size-encoded) marks',
      options: ['cell', 'bubble'],
      table: { category: 'Layer - Layout' },
    },
    rowPadding: {
      control: { max: 0.5, min: 0, step: 0.01, type: 'range' },
      description: 'Row-axis band padding (fraction of the band step)',
      table: { category: 'Layer - Layout' },
    },
    // Layer - Color
    scheme: {
      control: 'select',
      description: "Named sequential d3 scheme ('' ⇒ theme token ramp)",
      options: [
        '',
        'blues',
        'greens',
        'greys',
        'inferno',
        'magma',
        'oranges',
        'plasma',
        'purples',
        'reds',
        'viridis',
        'ylGnBu',
        'ylOrRd',
      ],
      table: { category: 'Layer - Color' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    // Layer - Visibility
    showValues: {
      control: 'boolean',
      description: 'Show per-cell value labels',
      table: { category: 'Layer - Visibility' },
    },
    showXAxis: {
      control: 'boolean',
      description: 'Show the X axis',
      table: { category: 'Layer - Visibility' },
    },
    showYAxis: {
      control: 'boolean',
      description: 'Show the Y axis',
      table: { category: 'Layer - Visibility' },
    },
    // Layer - Tooltip
    tooltipPosition: {
      control: 'radio',
      description: 'Tooltip position',
      if: { arg: 'showTooltip' },
      options: ['above', 'below', 'follow-mouse'],
      table: { category: 'Layer - Tooltip' },
    },
  },
  component: HeatmapChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Heatmap Chart/Interaction',
};

export default meta;
type Story = StoryObj<HeatmapChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    bubbleColor: '',
    bubbleMaxRatio: 0.9,
    bubbleOpacity: 0.85,
    bubbleStroke: '',
    bubbleStrokeWidth: 1,
    cellEmptyColor: '',
    cellOpacity: 1,
    cellRadius: 1,
    cellRampFrom: '',
    cellRampMid: '',
    cellRampTo: '',
    cellStrokeWidth: 1,
    colPadding: 0.05,
    domainMax: null,
    domainMin: null,
    labelColor: '',
    labelFontSize: 10,
    labelFontWeight: 500,
    marginBottom: 45,
    marginLeft: 70,
    marginRight: 20,
    marginTop: 20,
    mark: 'cell',
    rowPadding: 0.05,
    scheme: '',
    showTooltip: false,
    showValues: false,
    showXAxis: true,
    showYAxis: true,
    tooltipPosition: 'follow-mouse',
  },
};

/**
 * Bubble mode: each cell becomes a circle whose radius is sqrt-scaled to the value
 * (double-encoded with the ramp color).
 */
export const Bubble: Story = {
  args: {
    ...Interaction.args,
    mark: 'bubble',
  },
};

/**
 * Values printed in every cell against the perceptually-uniform `viridis` scheme.
 */
export const Values: Story = {
  args: {
    ...Interaction.args,
    scheme: 'viridis',
    showValues: true,
  },
};
