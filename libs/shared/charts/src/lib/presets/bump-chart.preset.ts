import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type { NgeBumpDataPoint, NgeBumpLayerConfig, NgeChartConfig } from '../core/config';
import type { NgeChartLegendConfig } from '../core/legend';
import type { NgeTooltipConfig, NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { extractBumpChartLegendItems } from '../core/legend';
import {
  computeBumpMaxRank,
  createBumpChartScalesFactory,
} from '../nge-chart/nge-chart.bump.helpers';
import { renderBumpLayer } from '../layers/bump';

/**
 * Tooltip options for the bump chart preset.
 */
export interface BumpChartTooltipOptions {
  /** Enable tooltips */
  enabled?: boolean;
  /** Custom content formatter */
  formatContent?: (data: NgeBumpDataPoint) => NgeTooltipContent;
  /** Tooltip height */
  height?: number;
  /** Positioning strategy */
  position?: NgeTooltipConfig<NgeBumpDataPoint>['position'];
  /** Visual styling options (border color, background color, divot size) */
  style?: NgeTooltipStyle;
  /** Tooltip width */
  width?: number;
}

/**
 * Options for creating a bump (rank-over-time) chart config preset.
 *
 * A bump chart shows how several series RANK against each other across an ordered x
 * axis. Each datum carries a metric `value`; the layer derives a `1..N` rank per
 * x-tick (highest value = rank 1 by default — flip with `rankOrder: 'asc'`). Axes
 * default ON — a bump chart is a standalone analytical chart — and the y axis is
 * labelled with integer ranks (1 at the top).
 */
export interface BumpChartPresetOptions {
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
  /** Rank-line curve interpolation. Default `'bump'` (`curveBumpX`). */
  curveType?: 'bump' | 'linear' | 'monotone';
  /** Data points. Points sharing a `seriesId` form one rank line. */
  data: NgeBumpDataPoint[];
  /** Legend configuration. Set `enabled: true` to auto-generate a legend from series data. */
  legend?: Partial<NgeChartLegendConfig>;
  /** Chart margin configuration. */
  margin?: NgeChartBaseConfig['margin'];
  /** Click handler for data points (points mode). */
  onClick?: NgeBumpLayerConfig['onClick'];
  /** Radius of the per-point circles in pixels (when `showPoints`). */
  pointRadius?: number;
  /**
   * Direction the per-x-tick ranking runs. `'desc'` (default) ranks the highest
   * `value` as rank 1; `'asc'` ranks the lowest as rank 1.
   */
  rankOrder?: 'asc' | 'desc';
  /** Color palette for series. Series index maps to colors[index % length]. */
  seriesColors?: string[];
  /** Draw the series label at the end of each rank line. Default true. */
  showLabels?: boolean;
  /** Draw circles at each rank position. Default true. */
  showPoints?: boolean;
  /** Show the X axis. Default true. */
  showXAxis?: boolean;
  /** Show the Y (rank) axis. Default true. */
  showYAxis?: boolean;
  /** Tooltip configuration. Use `{ enabled: true }` for the default tooltip. */
  tooltip?: BumpChartTooltipOptions;
  /** X axis label. */
  xAxisLabel?: string;
  /** Y axis label. Default 'Rank'. */
  yAxisLabel?: string;
}

/**
 * Default tooltip content formatter for a bump point: `"series · x"` as the label and
 * the derived rank (`#n`) as the value. The renderer fills in the derived `rank` on the
 * datum handed to this formatter.
 */
function defaultBumpTooltipFormatter(data: NgeBumpDataPoint): NgeTooltipContent {
  const xValue = data.x instanceof Date ? data.x.toLocaleDateString() : String(data.x);

  return {
    extra: { seriesId: data.seriesId, value: data.value },
    label: `${data.seriesId} · ${xValue}`,
    value: data.rank !== undefined ? `#${data.rank}` : data.value,
  };
}

/**
 * Create a bump (rank-over-time) chart configuration.
 *
 * Plots each series' RANK (1 at the top) across an ordered x axis, deriving the rank
 * per x-tick from each datum's `value`. Like the financial / histogram / distribution
 * presets, axes default ON. Supplies its own point/linear/time-x + rank-linear-y scale
 * factory and labels the y axis with integer ranks.
 *
 * @example
 * const config = createBumpChartConfig({
 *   data: [
 *     { x: 'Q1', seriesId: 'North', value: 42 },
 *     { x: 'Q1', seriesId: 'South', value: 30 },
 *     { x: 'Q2', seriesId: 'North', value: 25 },
 *     { x: 'Q2', seriesId: 'South', value: 51 },
 *   ],
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createBumpChartConfig(options: BumpChartPresetOptions): NgeChartConfig {
  const {
    animation,
    animationMs,
    curveType = 'bump',
    data,
    legend,
    margin,
    onClick,
    pointRadius,
    rankOrder = 'desc',
    seriesColors,
    showLabels = true,
    showPoints = true,
    showXAxis = true,
    showYAxis = true,
    tooltip,
    xAxisLabel,
    yAxisLabel = 'Rank',
  } = options;

  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultBumpTooltipFormatter,
        height: tooltip.height ?? 65,
        position: tooltip.position ?? 'follow-mouse',
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  const legendConfig = legend?.enabled
    ? {
        enabled: true,
        items: legend.items ?? extractBumpChartLegendItems(data, seriesColors),
        position: legend.position ?? 'bottom',
      }
    : undefined;

  const bumpLayer: NgeBumpLayerConfig = {
    animationMs,
    curveType,
    data,
    onClick,
    pointRadius,
    rankOrder,
    renderer: renderBumpLayer,
    seriesColors,
    showLabels,
    showPoints,
    tooltip: tooltipConfig,
    type: 'bump',
  };

  return {
    animation,
    base: {
      margin: margin ?? { bottom: 45, left: 45, right: 24, top: 20 },
      showXAxis,
      showYAxis,
      xAxisLabel,
      yAxisLabel,
      // Integer rank ticks only (drop any fractional tick D3 might place).
      yAxisTickFormat: (value: number) => (Number.isInteger(value) ? String(value) : ''),
      yAxisTicks: Math.max(1, computeBumpMaxRank(data, rankOrder)),
    },
    layers: [bumpLayer],
    legend: legendConfig as NgeChartLegendConfig | undefined,
    scaleFactory: createBumpChartScalesFactory({ rankOrder }),
  };
}
