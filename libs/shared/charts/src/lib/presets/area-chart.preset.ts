import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type { NgeAreaDataPoint, NgeAreaLayerConfig, NgeChartConfig } from '../core/config';
import type { NgeChartLegendConfig } from '../core/legend';
import type { NgeTooltipConfig, NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { extractAreaChartLegendItems } from '../core/legend';
import { createAreaChartScales } from '../nge-chart/nge-chart.area.helpers';
import { renderAreaLayer } from '../layers/area';

/**
 * Tooltip options for the area chart preset.
 */
export interface AreaChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeAreaDataPoint) => NgeTooltipContent;

  /**
   * Tooltip height
   */
  height?: number;

  /**
   * Positioning strategy
   */
  position?: NgeTooltipConfig<NgeAreaDataPoint>['position'];

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
 * Options for creating an area chart config preset.
 */
export interface AreaChartPresetOptions {
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
   * Curve interpolation type
   */
  curveType?: 'basis' | 'linear' | 'monotone' | 'step';

  /**
   * Data points. Points with the same `seriesId` are grouped into a series.
   * Points without `seriesId` are treated as a single default series. Points
   * carrying `y0` render as range bands (`[y0, y]`).
   */
  data: NgeAreaDataPoint[];

  /**
   * Area fill opacity (0-1). Falls back to the theme's `area.fill.opacity`.
   */
  fillOpacity?: number;

  /** Legend configuration. Set `enabled: true` to auto-generate legend from series data. */
  legend?: Partial<NgeChartLegendConfig>;

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Click handler for data points
   */
  onClick?: NgeAreaLayerConfig['onClick'];

  /**
   * Color palette for multi-series charts
   */
  seriesColors?: string[];

  /**
   * Draw a stroke along the top edge (y1) of each area.
   */
  showLine?: boolean;

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
   * Stacking offset for 2+ series. `'none'` stacks from a zero baseline,
   * `'expand'` normalises each column to 100%, `'wiggle'` centres the stack
   * (streamgraph), `'diverging'` splits around zero. Omit for overlaid series.
   * Ignored in range mode (points with `y0`).
   */
  stackOffset?: NgeAreaLayerConfig['stackOffset'];

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: AreaChartTooltipOptions;

  /**
   * X axis label
   */
  xAxisLabel?: string;

  /**
   * Explicit X domain `[min, max]` — continuous zoom override for linear/time x
   * (epoch ms for time). Ignored for categorical x.
   */
  xDomain?: [number, number];

  /**
   * Y axis label
   */
  yAxisLabel?: string;

  /**
   * Explicit Y domain `[min, max]` — override that replaces the stack/range-aware
   * extent.
   */
  yDomain?: [number, number];
}

/**
 * Default content formatter for area data points.
 */
function defaultAreaTooltipFormatter(data: NgeAreaDataPoint): NgeTooltipContent {
  const xValue = data.x instanceof Date ? data.x.toLocaleDateString() : String(data.x);
  const seriesLabel = data.seriesId ? `${data.seriesId}: ` : '';

  return {
    extra: { seriesId: data.seriesId },
    label: `${seriesLabel}${xValue}`,
    value: data.y,
  };
}

/**
 * Create a standard area chart configuration.
 *
 * @example
 * // Single series (plain area)
 * const config = createAreaChartConfig({
 *   data: [
 *     { x: 'Jan', y: 10 },
 *     { x: 'Feb', y: 20 },
 *     { x: 'Mar', y: 15 },
 *   ],
 * });
 *
 * @example
 * // Stacked (streamgraph via wiggle)
 * const config = createAreaChartConfig({
 *   data: [
 *     { x: 'Jan', y: 10, seriesId: 'A' },
 *     { x: 'Feb', y: 20, seriesId: 'A' },
 *     { x: 'Jan', y: 5, seriesId: 'B' },
 *     { x: 'Feb', y: 8, seriesId: 'B' },
 *   ],
 *   stackOffset: 'wiggle',
 * });
 *
 * @example
 * // Range band via y0
 * const config = createAreaChartConfig({
 *   data: [
 *     { x: 0, y0: 8, y: 14 },
 *     { x: 1, y0: 9, y: 16 },
 *   ],
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createAreaChartConfig(options: AreaChartPresetOptions): NgeChartConfig {
  const {
    animation,
    animationMs,
    curveType = 'linear',
    data,
    fillOpacity,
    legend,
    margin,
    onClick,
    seriesColors,
    showLine = false,
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
        formatContent: tooltip.formatContent ?? defaultAreaTooltipFormatter,
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
        items: legend.items ?? extractAreaChartLegendItems(data, seriesColors),
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
        curveType,
        data,
        fillOpacity,
        onClick,
        renderer: renderAreaLayer,
        seriesColors,
        showLine,
        stackOffset,
        tooltip: tooltipConfig,
        type: 'area',
      },
    ],
    legend: legendConfig as NgeChartLegendConfig | undefined,
    // Continuous-zoom overrides (linear/time x, y) are captured in the factory
    // closure — the transform rebuilds this config to change them.
    scaleFactory: (config, dimensions) =>
      createAreaChartScales(config, dimensions, { xDomain, yDomain }),
  };
}
