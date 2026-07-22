import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { OverlayInteractionStoriesComponent } from './overlay-interaction-stories.component';

const meta: Meta<OverlayInteractionStoriesComponent> = {
  argTypes: {
    // Theme - Overlay Styling
    bandFillColor: {
      control: 'color',
      description: 'Fan / control band fill color',
      if: { arg: 'mode', neq: 'trendline' },
      table: { category: 'Theme - Overlay Styling' },
    },
    bandFillOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Fan / control band fill opacity',
      if: { arg: 'mode', neq: 'trendline' },
      table: { category: 'Theme - Overlay Styling' },
    },
    // Overlay - Fan
    fanIntervals: {
      control: 'radio',
      description: 'Prediction-interval levels (one widening band each)',
      if: { arg: 'mode', eq: 'fan' },
      options: ['0.5, 0.8, 0.95', '0.5, 0.9, 0.99', '0.8, 0.95'],
      table: { category: 'Overlay - Fan' },
    },
    // Overlay - Trendline
    fit: {
      control: 'radio',
      description: 'Trend fit method',
      if: { arg: 'mode', eq: 'trendline' },
      options: ['linear', 'loess'],
      table: { category: 'Overlay - Trendline' },
    },
    fitLineColor: {
      control: 'color',
      description: 'Trend line stroke color',
      if: { arg: 'mode', eq: 'trendline' },
      table: { category: 'Theme - Overlay Styling' },
    },
    fitLineWidth: {
      control: { max: 6, min: 1, step: 0.5, type: 'range' },
      description: 'Trend line stroke width',
      if: { arg: 'mode', eq: 'trendline' },
      table: { category: 'Theme - Overlay Styling' },
    },
    // Layer - Legend
    interactiveLegend: {
      control: 'boolean',
      description:
        'Swap in a 3-series host with a standalone interactive <nge-chart-legend>; click a series to toggle its line + trend on/off.',
      table: { category: 'Layer - Legend' },
    },
    limitLineColor: {
      control: 'color',
      description: 'Control ±σ limit line color',
      if: { arg: 'mode', eq: 'control' },
      table: { category: 'Theme - Overlay Styling' },
    },
    loessBandwidth: {
      control: { max: 1, min: 0.1, step: 0.05, type: 'range' },
      description: 'LOESS smoothing bandwidth (fit: loess)',
      if: { arg: 'mode', eq: 'trendline' },
      table: { category: 'Overlay - Trendline' },
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
    meanLineColor: {
      control: 'color',
      description: 'Control mean line color',
      if: { arg: 'mode', eq: 'control' },
      table: { category: 'Theme - Overlay Styling' },
    },
    // Overlay - Mode
    mode: {
      control: 'radio',
      description: 'Which analytical annotation the overlay draws',
      options: ['control', 'fan', 'trendline'],
      table: { category: 'Overlay - Mode' },
    },
    // Theme - Series Palette (interactive-legend host lines)
    seriesColor1: {
      control: 'color',
      description: 'Series 1 stroke (Alpha)',
      if: { arg: 'interactiveLegend' },
      table: { category: 'Theme - Series Palette' },
    },
    seriesColor2: {
      control: 'color',
      description: 'Series 2 stroke (Beta)',
      if: { arg: 'interactiveLegend' },
      table: { category: 'Theme - Series Palette' },
    },
    seriesColor3: {
      control: 'color',
      description: 'Series 3 stroke (Gamma)',
      if: { arg: 'interactiveLegend' },
      table: { category: 'Theme - Series Palette' },
    },
    // Overlay - Control
    showControlBand: {
      control: 'boolean',
      description: 'Shade the in-control zone between the limits',
      if: { arg: 'mode', eq: 'control' },
      table: { category: 'Overlay - Control' },
    },
    showFitLine: {
      control: 'boolean',
      description: 'Draw the fitted trend line',
      if: { arg: 'mode', eq: 'trendline' },
      table: { category: 'Overlay - Trendline' },
    },
    // Host - Visibility
    showPoints: {
      control: 'boolean',
      description: 'Show host data points',
      table: { category: 'Host - Visibility' },
    },
    // Host - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover (host line)',
      table: { category: 'Host - Tooltip' },
    },
    showXAxis: {
      control: 'boolean',
      description: 'Show X axis',
      table: { category: 'Host - Visibility' },
    },
    showYAxis: {
      control: 'boolean',
      description: 'Show Y axis',
      table: { category: 'Host - Visibility' },
    },
    sigma: {
      control: { max: 4, min: 1, step: 0.5, type: 'range' },
      description: 'Control-limit half-width in standard deviations',
      if: { arg: 'mode', eq: 'control' },
      table: { category: 'Overlay - Control' },
    },
    tooltipPosition: {
      control: 'radio',
      description: 'Tooltip position relative to point',
      if: { arg: 'showTooltip' },
      options: ['above', 'below', 'follow-mouse'],
      table: { category: 'Host - Tooltip' },
    },
  },
  component: OverlayInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Overlay/Interaction',
};

export default meta;
type Story = StoryObj<OverlayInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    bandFillColor: '',
    bandFillOpacity: 0.15,
    fanIntervals: '0.5, 0.8, 0.95',
    fit: 'linear',
    fitLineColor: '',
    fitLineWidth: 2,
    interactiveLegend: false,
    limitLineColor: '',
    loessBandwidth: 0.3,
    marginBottom: 40,
    marginLeft: 50,
    marginRight: 24,
    marginTop: 20,
    meanLineColor: '',
    mode: 'trendline',
    seriesColor1: '#1E88E5',
    seriesColor2: '#43A047',
    seriesColor3: '#FB8C00',
    showControlBand: true,
    showFitLine: true,
    showPoints: true,
    showTooltip: true,
    showXAxis: true,
    showYAxis: true,
    sigma: 3,
    tooltipPosition: 'follow-mouse',
  },
};

/**
 * Control mode — the series mean plus symmetric ±σ statistical-process-control
 * limits, with the in-control zone shaded (`showControlBand`).
 */
export const ControlChart: Story = {
  args: {
    ...Interaction.args,
    mode: 'control',
  },
};

/**
 * Fan mode — nested widening prediction-interval bands (one per `intervals` level)
 * that fan out toward the forecast horizon.
 */
export const FanChart: Story = {
  args: {
    ...Interaction.args,
    mode: 'fan',
  },
};

/**
 * Renders a standalone interactive `<nge-chart-legend>` above a 3-series line host
 * with a per-series trend overlay. Clicking a series toggles its line + trend in/out
 * (its color held stable via a fixed `seriesColors` palette) while the series stays
 * listed in the legend, dimmed (opacity 0.4), so it can be toggled back on.
 */
export const InteractiveLegend: Story = {
  args: {
    ...Interaction.args,
    interactiveLegend: true,
  },
};
