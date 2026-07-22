import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeStackedBarDataPoint,
  NgeStackedBarLayerConfig,
} from '../core/config';
import type { NgeChartLegendConfig } from '../core/legend';
import type { NgeTooltipConfig, NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { extractStackedBarChartLegendItems } from '../core/legend';
import { createStackedBarChartScales } from '../nge-chart/nge-chart.stacked-bar.helpers';
import { renderStackedBarLayer } from '../layers/stacked-bar';

/**
 * Tooltip options for the stacked-bar chart preset.
 */
export interface StackedBarChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeStackedBarDataPoint) => NgeTooltipContent;

  /**
   * Tooltip height
   */
  height?: number;

  /**
   * Positioning strategy
   */
  position?: NgeTooltipConfig<NgeStackedBarDataPoint>['position'];

  /**
   * Visual styling options (border color, background color, divot size)
   */
  style?: NgeTooltipStyle;

  /**
   * Tooltip width
   */
  width?: number;
}

/**
 * Options for creating a stacked-bar chart config preset.
 */
export interface StackedBarChartPresetOptions {
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

  /**
   * Per-column WIDTH weight for a Marimekko layout: each column's width ∝
   * `bandWidthAccessor(category, columnTotal)`. Omit for uniform columns.
   * Pair with `stackOffset: 'expand'` for a Marimekko-proper chart. Forces
   * vertical orientation when set.
   */
  bandWidthAccessor?: (category: string, total: number) => number;

  /**
   * Padding between columns (0-1). Uniform-band columns only.
   */
  barPadding?: number;

  /**
   * Segment corner radius (px).
   */
  barRadius?: number;

  /**
   * Data points in long format. Points sharing a `category` stack into one
   * column; points sharing a `seriesId` form one stack series.
   */
  data: NgeStackedBarDataPoint[];

  /** Legend configuration. Set `enabled: true` to auto-generate legend from series. */
  legend?: Partial<NgeChartLegendConfig>;

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Click handler for segments
   */
  onClick?: NgeStackedBarLayerConfig['onClick'];

  /**
   * Bar orientation. Ignored (treated as vertical) for Marimekko.
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * Color palette for stack series. Series index maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Show per-segment value labels.
   */
  showLabels?: boolean;

  /**
   * Show X axis
   */
  showXAxis?: boolean;

  /**
   * Show vertical gridlines at the X axis tick positions
   * @default false
   */
  showXGrid?: boolean;

  /**
   * Show Y axis
   */
  showYAxis?: boolean;

  /**
   * Show horizontal gridlines at the Y axis tick positions
   * @default false
   */
  showYGrid?: boolean;

  /**
   * Stacking offset. `'none'` stacks from a zero baseline (absolute values);
   * `'expand'` normalises each column to 100%. Omit for `'none'`.
   */
  stackOffset?: NgeStackedBarLayerConfig['stackOffset'];

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: StackedBarChartTooltipOptions;

  /**
   * X axis label
   */
  xAxisLabel?: string;

  /**
   * Explicit value-axis domain override applied to x (horizontal orientation).
   */
  xDomain?: [number, number];

  /**
   * Y axis label
   */
  yAxisLabel?: string;

  /**
   * Explicit value-axis domain override applied to y (default vertical orientation).
   */
  yDomain?: [number, number];
}

/**
 * Default content formatter for stacked-bar data points.
 */
function defaultStackedBarTooltipFormatter(data: NgeStackedBarDataPoint): NgeTooltipContent {
  return {
    extra: { seriesId: data.seriesId },
    label: `${data.seriesId}: ${data.category}`,
    value: data.value,
  };
}

/**
 * Create a standard stacked-bar chart configuration.
 *
 * @example
 * // Plain stacked bar
 * const config = createStackedBarChartConfig({
 *   data: [
 *     { category: 'Q1', seriesId: 'Rent', value: 1200 },
 *     { category: 'Q1', seriesId: 'Utilities', value: 300 },
 *     { category: 'Q2', seriesId: 'Rent', value: 1200 },
 *     { category: 'Q2', seriesId: 'Utilities', value: 340 },
 *   ],
 * });
 *
 * @example
 * // 100% stacked
 * const config = createStackedBarChartConfig({ data, stackOffset: 'expand' });
 *
 * @example
 * // Marimekko (column width ∝ group total, height normalised to 100%)
 * const config = createStackedBarChartConfig({
 *   data,
 *   bandWidthAccessor: (_category, total) => total,
 *   stackOffset: 'expand',
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createStackedBarChartConfig(
  options: StackedBarChartPresetOptions
): NgeChartConfig {
  const {
    animation,
    animationMs,
    bandWidthAccessor,
    barPadding,
    barRadius,
    data,
    legend,
    margin,
    onClick,
    orientation = 'vertical',
    seriesColors,
    showLabels = false,
    showXAxis = false,
    showXGrid = false,
    showYAxis = false,
    showYGrid = false,
    stackOffset,
    tooltip,
    xAxisLabel,
    xDomain,
    yAxisLabel,
    yDomain,
  } = options;

  // Build tooltip config if enabled.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultStackedBarTooltipFormatter,
        height: tooltip.height ?? 65,
        position: tooltip.position ?? 'follow-mouse',
        style: tooltip.style,
        width: tooltip.width ?? 140,
      }
    : undefined;

  // Build legend config if enabled.
  const legendConfig = legend?.enabled
    ? {
        enabled: true,
        items: legend.items ?? extractStackedBarChartLegendItems(data, seriesColors),
        position: legend.position ?? 'bottom',
      }
    : undefined;

  return {
    animation,
    base: {
      margin,
      showXAxis,
      showXGrid,
      showYAxis,
      showYGrid,
      xAxisLabel,
      yAxisLabel,
    },
    layers: [
      {
        animationMs,
        bandWidthAccessor,
        barPadding,
        barRadius,
        data,
        onClick,
        orientation,
        renderer: renderStackedBarLayer,
        seriesColors,
        showLabels,
        stackOffset,
        tooltip: tooltipConfig,
        type: 'stacked-bar',
      },
    ],
    legend: legendConfig as NgeChartLegendConfig | undefined,
    // Value-domain overrides (yDomain vertical / xDomain horizontal) are captured
    // in the factory closure — the transform rebuilds this config to change them.
    scaleFactory: (config, dimensions) =>
      createStackedBarChartScales(config, dimensions, { xDomain, yDomain }),
  };
}
