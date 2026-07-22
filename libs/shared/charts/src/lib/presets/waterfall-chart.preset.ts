import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeWaterfallDataPoint,
  NgeWaterfallLayerConfig,
} from '../core/config';
import type { NgeTooltipConfig, NgeTooltipContent } from '../core/tooltip';

import {
  buildCumulativePercentPoints,
  createWaterfallChartScales,
} from '../nge-chart/nge-chart.waterfall.helpers';
import { renderWaterfallLayer } from '../layers/waterfall';
import { createLineChartConfig } from './line-chart.preset';

/**
 * Options for creating a waterfall chart config preset.
 */
export interface WaterfallChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Enter/update/exit transition duration in ms. Default 300.
   * Set 0 for instant renders (used during zoom/pan gestures).
   */
  animationMs?: number;

  /** Padding between bars (0-1). Default 0.2. */
  barPadding?: number;

  /** Bar corner radius (px). */
  barRadius?: number;

  /** Draw step connectors bridging consecutive bars. Default true. */
  connectors?: boolean;

  /**
   * Overlay a cumulative running-total % line on a secondary (right) axis.
   * Default false.
   */
  cumulative?: boolean;

  /** Color of the cumulative overlay line. Default `var(--chart-secondary)`. */
  cumulativeColor?: string;

  /** Data points in sequence — one bar per point, left to right. */
  data: NgeWaterfallDataPoint[];

  /** Fill for falling (negative-delta) bars. Overrides the theme default. */
  fallColor?: string;

  /** Chart margin configuration. */
  margin?: NgeChartBaseConfig['margin'];

  /** Click handler for bars. */
  onClick?: NgeWaterfallLayerConfig['onClick'];

  /** Fill for rising (positive-delta) bars. Overrides the theme default. */
  riseColor?: string;

  /** Show per-bar value labels. Default false. */
  showLabels?: boolean;

  /** Enable tooltips on hover (bars + cumulative line). Default false. */
  showTooltip?: boolean;

  /** Show the X axis. Default true. */
  showXAxis?: boolean;

  /** Show the primary (left) Y axis. Default true. */
  showYAxis?: boolean;

  /** Fill for `'total'` bars. Overrides the theme default. */
  totalColor?: string;

  /** X axis label. */
  xAxisLabel?: string;

  /** Secondary (right) Y axis label. Default 'Cumulative %'. Only shown when `cumulative`. */
  y2AxisLabel?: string;

  /** Primary (left) Y axis label. */
  yAxisLabel?: string;

  /** Explicit value-axis (`y`) domain override — replaces the running-cumulative extent. */
  yDomain?: [number, number];
}

/**
 * Default tooltip content formatter for waterfall data points.
 */
function defaultWaterfallTooltipFormatter(data: NgeWaterfallDataPoint): NgeTooltipContent {
  return {
    label: data.label,
    value: data.value,
  };
}

/**
 * Create a waterfall chart configuration.
 *
 * Renders running-total floating bars (rise / fall / total coloring) with step
 * connectors. Set `cumulative: true` to overlay a running-total % line on a
 * secondary axis (reuses the `line` layer). Unlike the micro-chart presets, axes
 * default ON — a waterfall is a standalone analytical chart.
 *
 * @example
 * // Waterfall
 * const config = createWaterfallChartConfig({
 *   data: [
 *     { label: 'Start', value: 100, kind: 'total' },
 *     { label: 'Q1', value: 40 },
 *     { label: 'Q2', value: -25 },
 *     { label: 'End', value: 0, kind: 'total' },
 *   ],
 * });
 *
 * @example
 * // Waterfall with a cumulative % overlay
 * const config = createWaterfallChartConfig({ data, cumulative: true });
 *
 * <nge-chart [config]="config" />
 */
export function createWaterfallChartConfig(options: WaterfallChartPresetOptions): NgeChartConfig {
  const {
    animation,
    animationMs,
    barPadding,
    barRadius,
    connectors,
    cumulative = false,
    cumulativeColor = 'var(--chart-secondary)',
    data,
    fallColor,
    margin,
    onClick,
    riseColor,
    showLabels = false,
    showTooltip = false,
    showXAxis = true,
    showYAxis = true,
    totalColor,
    xAxisLabel,
    y2AxisLabel = 'Cumulative %',
    yAxisLabel,
    yDomain,
  } = options;

  const tooltipConfig: Partial<NgeTooltipConfig<NgeWaterfallDataPoint>> | undefined = showTooltip
    ? {
        enabled: true,
        formatContent: defaultWaterfallTooltipFormatter,
        height: 65,
        position: 'follow-mouse',
        width: 140,
      }
    : undefined;

  const waterfallLayer: NgeWaterfallLayerConfig = {
    animationMs,
    barPadding,
    barRadius,
    connectors,
    data,
    fallColor,
    onClick,
    renderer: renderWaterfallLayer,
    riseColor,
    showLabels,
    tooltip: tooltipConfig,
    totalColor,
    type: 'waterfall',
  };

  const layers: NgeChartConfig['layers'] = [waterfallLayer];

  if (cumulative) {
    // Reuse the line layer for the % overlay, scaled against the secondary axis.
    const lineConfig = createLineChartConfig({
      animationMs,
      curveType: 'linear',
      data: buildCumulativePercentPoints(data),
      seriesColors: [cumulativeColor],
      showPoints: true,
      tooltip: {
        enabled: showTooltip,
        formatContent: point => ({ label: String(point.x), value: `${point.y.toFixed(1)}%` }),
      },
      useSecondaryAxis: true,
    });
    layers.push(...lineConfig.layers);
  }

  return {
    animation,
    base: {
      margin: margin ?? { bottom: 45, left: 50, right: cumulative ? 60 : 15, top: 20 },
      showXAxis,
      showY2Axis: cumulative,
      showYAxis,
      xAxisLabel,
      y2AxisLabel: cumulative ? y2AxisLabel : undefined,
      yAxisLabel,
    },
    layers,
    scaleFactory: (config, dimensions) =>
      createWaterfallChartScales(config, dimensions, { cumulative, yDomain }),
  };
}
