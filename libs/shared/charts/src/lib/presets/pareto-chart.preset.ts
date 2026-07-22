import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type { NgeBarDataPoint, NgeBarLayerConfig, NgeChartConfig } from '../core/config';

import {
  buildParetoCumulativePoints,
  createParetoChartScales,
  sortParetoDescending,
} from '../nge-chart/nge-chart.pareto.helpers';
import { createBarChartConfig } from './bar-chart.preset';
import { createLineChartConfig } from './line-chart.preset';

/**
 * Options for creating a Pareto chart config preset.
 */
export interface ParetoChartPresetOptions {
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

  /** Uniform bar fill. Falls back to the bar theme (`var(--chart-primary)`). */
  barColor?: string;

  /** Padding between bars (0-1). Default 0.2. */
  barPadding?: number;

  /** Bar corner radius (px). */
  barRadius?: number;

  /** Category values — rendered as individual (zero-anchored) bars. */
  data: NgeBarDataPoint[];

  /** Color of the cumulative % line. Default `var(--chart-secondary)`. */
  lineColor?: string;

  /** Chart margin configuration. */
  margin?: NgeChartBaseConfig['margin'];

  /** Click handler for bars. */
  onBarClick?: NgeBarLayerConfig['onClick'];

  /** Show per-bar value labels. Default false. */
  showLabels?: boolean;

  /** Enable tooltips on hover (bars + cumulative line). Default false. */
  showTooltip?: boolean;

  /**
   * Sort the bars descending by value (the canonical Pareto ordering). Default
   * true. Set false to preserve the input order.
   */
  sort?: boolean;

  /** X axis label. */
  xAxisLabel?: string;

  /** Secondary (right) Y axis label. Default 'Cumulative %'. */
  y2AxisLabel?: string;

  /** Primary (left) Y axis label. */
  yAxisLabel?: string;
}

/**
 * Create a Pareto chart configuration.
 *
 * A Pareto chart is a **composition of existing layers**, not a new layer type:
 * individual (zero-anchored) `bar` values, sorted descending, plus a cumulative
 * `%` `line` on a secondary (right) axis. Both layers share one band x-scale + a
 * `scaleFactory` that emits the `y2` percentage scale, so the line centers on the
 * bars and the right axis is drawn automatically.
 *
 * @example
 * const config = createParetoChartConfig({
 *   data: [
 *     { label: 'Defects A', value: 42 },
 *     { label: 'Defects B', value: 30 },
 *     { label: 'Defects C', value: 18 },
 *     { label: 'Defects D', value: 10 },
 *   ],
 *   showTooltip: true,
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createParetoChartConfig(options: ParetoChartPresetOptions): NgeChartConfig {
  const {
    animation,
    animationMs,
    barColor,
    barPadding = 0.2,
    barRadius,
    data,
    lineColor = 'var(--chart-secondary)',
    margin = { bottom: 45, left: 55, right: 60, top: 20 },
    onBarClick,
    showLabels = false,
    showTooltip = false,
    sort = true,
    xAxisLabel,
    y2AxisLabel = 'Cumulative %',
    yAxisLabel,
  } = options;

  const ordered = sort ? sortParetoDescending(data) : [...data];
  // Apply a uniform bar color (Pareto bars are conventionally one color) without
  // clobbering an explicit per-datum override.
  const barData = barColor
    ? ordered.map(point => ({ ...point, color: point.color ?? barColor }))
    : ordered;

  const barConfig = createBarChartConfig({
    animationMs,
    barPadding,
    barRadius,
    data: barData,
    onClick: onBarClick,
    showLabels,
    tooltip: { enabled: showTooltip },
  });

  const lineConfig = createLineChartConfig({
    animationMs,
    curveType: 'linear',
    data: buildParetoCumulativePoints(ordered),
    seriesColors: [lineColor],
    showPoints: true,
    tooltip: {
      enabled: showTooltip,
      formatContent: point => ({ label: String(point.x), value: `${point.y.toFixed(1)}%` }),
    },
    useSecondaryAxis: true,
  });

  return {
    animation,
    // Bars render first (back), the cumulative line second (front).
    base: {
      margin,
      showXAxis: true,
      showY2Axis: true,
      showYAxis: true,
      xAxisLabel,
      y2AxisLabel,
      yAxisLabel,
    },
    layers: [...barConfig.layers, ...lineConfig.layers],
    scaleFactory: createParetoChartScales,
  };
}
