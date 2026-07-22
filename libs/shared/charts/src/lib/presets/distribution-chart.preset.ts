import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  DistributionJitter,
  DistributionRenderMode,
  DistributionWhiskerStat,
  NgeChartConfig,
  NgeDistributionDataPoint,
  NgeDistributionLayerConfig,
} from '../core/config';
import type { NgeTooltipConfig, NgeTooltipContent } from '../core/tooltip';

import {
  computeBoxStats,
  createDistributionChartScalesFactory,
} from '../nge-chart/nge-chart.distribution.helpers';
import { renderDistributionLayer } from '../layers/distribution';

/**
 * Options for creating a distribution chart config preset.
 *
 * One preset spans the whole distribution family — the default is a vertical
 * **box-and-whisker**; `showBox: false` gives an **error-bar** plot; `render:
 * 'violin'` a mirrored **KDE density** (with an optional inner box); `render:
 * 'points'` a **strip / jitter / beeswarm** point cloud.
 */
export interface DistributionChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Exit-transition (fade-out) duration in ms for removed marks. Default 300.
   * Set 0 for instant renders (used during zoom/pan gestures).
   */
  animationMs?: number;

  /** Box width as a fraction of the band bandwidth (0-1). Default 0.6. */
  boxWidth?: number;

  /** One distribution (box / violin / point cloud) per category — raw observations. */
  data: NgeDistributionDataPoint[];

  /** Point-scatter strategy (points mode). Default `'beeswarm'`. */
  jitter?: DistributionJitter;

  /** Jitter / beeswarm spread as a fraction of the band bandwidth (0-1). Default 0.7. */
  jitterWidth?: number;

  /** KDE bandwidth (violin mode). Defaults to the Silverman rule-of-thumb. */
  kdeBandwidth?: number;

  /** KDE smoothing kernel (violin mode). Default `'epanechnikov'`. */
  kdeKernel?: 'epanechnikov' | 'gaussian';

  /** KDE sample resolution across the value domain (violin mode). Default 50. */
  kdeResolution?: number;

  /** Chart margin configuration. */
  margin?: NgeChartBaseConfig['margin'];

  /** Click handler for a category's distribution. */
  onClick?: NgeDistributionLayerConfig['onClick'];

  /** Category-axis orientation. `'vertical'` (default) puts categories on x. */
  orientation?: 'horizontal' | 'vertical';

  /** Marker radius in pixels (points mode). */
  pointRadius?: number;

  /**
   * Distribution encoding. `'box'` (default) draws a box-and-whisker, `'points'`
   * a jittered / beeswarm point cloud, `'violin'` a mirrored KDE density.
   */
  render?: DistributionRenderMode;

  /** Draw the box (box mode). `false` ⇒ an error-bar style (whiskers only). Default true. */
  showBox?: boolean;

  /** Overlay a mini box-and-whisker inside the violin (violin mode). Default true. */
  showInnerBox?: boolean;

  /** Mark the mean with a glyph (box mode). Default false. */
  showMean?: boolean;

  /** Draw outlier points beyond the whiskers (box mode). Default true when `whiskerStat` is `'iqr'`. */
  showOutliers?: boolean;

  /** Enable tooltips on hover. Default false. */
  showTooltip?: boolean;

  /** Show the X axis. Default true. */
  showXAxis?: boolean;

  /** Show the Y axis. Default true. */
  showYAxis?: boolean;

  /** Whisker extent statistic (box mode). Default `'iqr'` (Tukey 1.5·IQR fences). */
  whiskerStat?: DistributionWhiskerStat;

  /** X axis label. */
  xAxisLabel?: string;

  /** Y axis label. */
  yAxisLabel?: string;
}

/**
 * Default tooltip content formatter for a distribution: the category as the label
 * and its median as the value.
 */
function defaultDistributionTooltipFormatter(data: NgeDistributionDataPoint): NgeTooltipContent {
  return {
    label: data.category,
    value: computeBoxStats(data.values)?.median ?? 0,
  };
}

/**
 * Create a distribution chart configuration.
 *
 * Summarises each category's raw observations as a spread on a shared band
 * (category) + linear (value) scale pair. One preset spans the family: the default
 * is a vertical **box-and-whisker**; `showBox: false` gives an **error-bar** plot;
 * `render: 'violin'` a mirrored **KDE density**; `render: 'points'` a **jitter /
 * beeswarm** point cloud. Like the histogram / lollipop presets, axes default ON — a
 * distribution is a standalone analytical chart. Supplies its own orientation-aware
 * band/linear scale factory.
 *
 * @example
 * // Box-and-whisker
 * const config = createDistributionChartConfig({
 *   data: [
 *     { category: 'A', values: [4, 5, 6, 6, 7, 9] },
 *     { category: 'B', values: [2, 3, 3, 4, 8] },
 *   ],
 * });
 *
 * @example
 * // Violin
 * const config = createDistributionChartConfig({ data, render: 'violin' });
 *
 * <nge-chart [config]="config" />
 */
export function createDistributionChartConfig(
  options: DistributionChartPresetOptions
): NgeChartConfig {
  const {
    animation,
    animationMs,
    boxWidth,
    data,
    jitter,
    jitterWidth,
    kdeBandwidth,
    kdeKernel,
    kdeResolution,
    margin,
    onClick,
    orientation,
    pointRadius,
    render,
    showBox,
    showInnerBox,
    showMean,
    showOutliers,
    showTooltip = false,
    showXAxis = true,
    showYAxis = true,
    whiskerStat,
    xAxisLabel,
    yAxisLabel,
  } = options;

  const tooltipConfig: Partial<NgeTooltipConfig<NgeDistributionDataPoint>> | undefined =
    showTooltip
      ? {
          enabled: true,
          formatContent: defaultDistributionTooltipFormatter,
          height: 65,
          position: 'follow-mouse',
          width: 140,
        }
      : undefined;

  const distributionLayer: NgeDistributionLayerConfig = {
    animationMs,
    boxWidth,
    data,
    jitter,
    jitterWidth,
    kdeBandwidth,
    kdeKernel,
    kdeResolution,
    onClick,
    orientation,
    pointRadius,
    render,
    renderer: renderDistributionLayer,
    showBox,
    showInnerBox,
    showMean,
    showOutliers,
    tooltip: tooltipConfig,
    type: 'distribution',
    whiskerStat,
  };

  return {
    animation,
    base: {
      margin: margin ?? { bottom: 45, left: 50, right: 15, top: 20 },
      showXAxis,
      showYAxis,
      xAxisLabel,
      yAxisLabel,
    },
    layers: [distributionLayer],
    scaleFactory: createDistributionChartScalesFactory({ orientation }),
  };
}
