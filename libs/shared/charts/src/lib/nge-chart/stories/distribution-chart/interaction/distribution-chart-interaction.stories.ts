import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { DistributionChartInteractionStoriesComponent } from './distribution-chart-interaction-stories.component';

const meta: Meta<DistributionChartInteractionStoriesComponent> = {
  argTypes: {
    // Theme - Box Styling
    boxColor: {
      control: 'color',
      description: 'Box fill color (--chart-primary slot; box mode)',
      if: { arg: 'render', eq: 'box' },
      table: { category: 'Theme - Box Styling' },
    },
    boxOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Box fill opacity (0-1; box mode)',
      if: { arg: 'render', eq: 'box' },
      table: { category: 'Theme - Box Styling' },
    },
    // Layer - Layout
    boxWidth: {
      control: { max: 1, min: 0.2, step: 0.05, type: 'range' },
      description: 'Box / inner-box width as a fraction of the band bandwidth (0-1)',
      table: { category: 'Layer - Layout' },
    },
    // Layer - Points
    jitter: {
      control: 'radio',
      description: 'Point-scatter strategy (points mode)',
      if: { arg: 'render', eq: 'points' },
      options: ['beeswarm', 'none', 'uniform'],
      table: { category: 'Layer - Points' },
    },
    jitterWidth: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Jitter / beeswarm spread as a fraction of the band bandwidth (points mode)',
      if: { arg: 'render', eq: 'points' },
      table: { category: 'Layer - Points' },
    },
    // Layer - Violin
    kdeKernel: {
      control: 'radio',
      description: 'KDE smoothing kernel (violin mode)',
      if: { arg: 'render', eq: 'violin' },
      options: ['epanechnikov', 'gaussian'],
      table: { category: 'Layer - Violin' },
    },
    kdeResolution: {
      control: { max: 100, min: 10, step: 5, type: 'range' },
      description: 'KDE sample resolution across the value domain (violin mode)',
      if: { arg: 'render', eq: 'violin' },
      table: { category: 'Layer - Violin' },
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
    // Theme - Median Styling
    medianColor: {
      control: 'color',
      description: 'Median line color (--chart-secondary slot; box mode)',
      if: { arg: 'render', eq: 'box' },
      table: { category: 'Theme - Median Styling' },
    },
    // Layer - Layout
    orientation: {
      control: 'radio',
      description: 'Category-axis orientation',
      options: ['vertical', 'horizontal'],
      table: { category: 'Layer - Layout' },
    },
    // Theme - Outlier Styling
    outlierColor: {
      control: 'color',
      description: 'Outlier point color (--chart-error slot; box mode)',
      if: { arg: 'render', eq: 'box' },
      table: { category: 'Theme - Outlier Styling' },
    },
    // Theme - Point Styling
    pointColor: {
      control: 'color',
      description: 'Point fill color (--chart-primary slot; points mode)',
      if: { arg: 'render', eq: 'points' },
      table: { category: 'Theme - Point Styling' },
    },
    pointOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Point fill opacity (0-1; points mode)',
      if: { arg: 'render', eq: 'points' },
      table: { category: 'Theme - Point Styling' },
    },
    // Layer - Points
    pointRadius: {
      control: { max: 8, min: 1, step: 0.5, type: 'range' },
      description: 'Point marker radius (px; points mode)',
      if: { arg: 'render', eq: 'points' },
      table: { category: 'Layer - Points' },
    },
    // Layer - Layout
    render: {
      control: 'radio',
      description: 'Distribution encoding: box-and-whisker vs violin (KDE) vs point cloud',
      options: ['box', 'violin', 'points'],
      table: { category: 'Layer - Layout' },
    },
    // Layer - Box
    showBox: {
      control: 'boolean',
      description: 'Draw the IQR box; false ⇒ an error-bar plot (box mode)',
      if: { arg: 'render', eq: 'box' },
      table: { category: 'Layer - Box' },
    },
    // Layer - Violin
    showInnerBox: {
      control: 'boolean',
      description: 'Overlay a mini box-and-whisker inside the violin (violin mode)',
      if: { arg: 'render', eq: 'violin' },
      table: { category: 'Layer - Violin' },
    },
    // Layer - Box
    showMean: {
      control: 'boolean',
      description: 'Mark the mean with a glyph (box mode)',
      if: { arg: 'render', eq: 'box' },
      table: { category: 'Layer - Box' },
    },
    showOutliers: {
      control: 'boolean',
      description: 'Draw outlier points beyond the whiskers (box mode)',
      if: { arg: 'render', eq: 'box' },
      table: { category: 'Layer - Box' },
    },
    // Layer - Tooltip
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    tooltipPosition: {
      control: 'radio',
      description: 'Tooltip position',
      if: { arg: 'showTooltip' },
      options: ['above', 'below', 'follow-mouse'],
      table: { category: 'Layer - Tooltip' },
    },
    // Theme - Violin Styling
    violinColor: {
      control: 'color',
      description: 'Violin fill color (--chart-primary slot; violin mode)',
      if: { arg: 'render', eq: 'violin' },
      table: { category: 'Theme - Violin Styling' },
    },
    violinOpacity: {
      control: { max: 1, min: 0, step: 0.05, type: 'range' },
      description: 'Violin fill opacity (0-1; violin mode)',
      if: { arg: 'render', eq: 'violin' },
      table: { category: 'Theme - Violin Styling' },
    },
    // Theme - Whisker Styling
    whiskerColor: {
      control: 'color',
      description: 'Whisker stroke color (--chart-on-surface-variant slot; box mode)',
      if: { arg: 'render', eq: 'box' },
      table: { category: 'Theme - Whisker Styling' },
    },
    // Layer - Box
    whiskerStat: {
      control: 'radio',
      description: 'Whisker extent statistic (box mode)',
      if: { arg: 'render', eq: 'box' },
      options: ['iqr', 'minmax', 'stddev', 'stderr'],
      table: { category: 'Layer - Box' },
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
  },
  component: DistributionChartInteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/NgeChart/Distribution Chart/Interaction',
};

export default meta;
type Story = StoryObj<DistributionChartInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    boxColor: '',
    boxOpacity: 0.55,
    boxWidth: 0.6,
    jitter: 'beeswarm',
    jitterWidth: 0.7,
    kdeKernel: 'epanechnikov',
    kdeResolution: 50,
    marginBottom: 45,
    marginLeft: 50,
    marginRight: 15,
    marginTop: 20,
    medianColor: '',
    orientation: 'vertical',
    outlierColor: '',
    pointColor: '',
    pointOpacity: 0.7,
    pointRadius: 3,
    render: 'box',
    showBox: true,
    showInnerBox: true,
    showMean: false,
    showOutliers: true,
    showTooltip: true,
    tooltipPosition: 'follow-mouse',
    violinColor: '',
    violinOpacity: 0.4,
    whiskerColor: '',
    whiskerStat: 'iqr',
    xAxisLabel: 'Endpoint',
    yAxisLabel: 'Response (ms)',
  },
};

/**
 * Violin (KDE density) mode with the inner box-and-whisker overlaid — width reads
 * as local density around each endpoint's response-time distribution.
 */
export const Violin: Story = {
  args: {
    ...Interaction.args,
    render: 'violin',
    showInnerBox: true,
  },
};

/**
 * Points mode: every raw observation drawn as a beeswarm point cloud so the
 * per-endpoint shape and sample size read directly.
 */
export const Points: Story = {
  args: {
    ...Interaction.args,
    jitter: 'beeswarm',
    render: 'points',
  },
};

/**
 * Error-bar style: `showBox: false` drops the IQR box, whiskers span ±1σ
 * (`whiskerStat: 'stddev'`), and the mean glyph is marked.
 */
export const ErrorBars: Story = {
  args: {
    ...Interaction.args,
    showBox: false,
    showMean: true,
    whiskerStat: 'stddev',
  },
};
