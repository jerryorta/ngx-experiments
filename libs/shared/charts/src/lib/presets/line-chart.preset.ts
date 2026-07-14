import type { NgeChartBaseConfig } from '../core/base-layout';
import type { NgeChartConfig, NgeLineDataPoint, NgeLineLayerConfig } from '../core/config';
import type { NgeChartGesturesConfig } from '../core/gesture';
import type { NgeChartLegendConfig } from '../core/legend';
import type { NgeTooltipConfig, NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { extractLineChartLegendItems } from '../core/legend';
import { createLineChartScales } from '../nge-chart/nge-chart.line.helpers';
import { renderLineLayer } from '../layers/line';

/**
 * Tooltip options for line chart preset
 */
export interface LineChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeLineDataPoint) => NgeTooltipContent;

  /**
   * Tooltip height
   */
  height?: number;

  /**
   * Positioning strategy
   */
  position?: NgeTooltipConfig<NgeLineDataPoint>['position'];

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
 * Options for creating a line chart config preset.
 */
export interface LineChartPresetOptions {
  /**
   * Enter/update/exit transition duration in ms. Default 300.
   * Set 0 for instant renders (used during zoom/pan gestures).
   */
  animationMs?: number;

  /**
   * Area fill opacity (0-1). Only applies when showArea is true.
   */
  areaOpacity?: number;

  /**
   * Curve interpolation type
   */
  curveType?: 'linear' | 'monotone' | 'step';

  /**
   * Data points. Points with the same `seriesId` will be grouped into a series.
   * Points without `seriesId` are treated as a single default series.
   */
  data: NgeLineDataPoint[];

  /**
   * Opt-in wheel-zoom / drag-pan / brush-zoom gesture capture. Pair the chart's
   * `(chartGesture)` output with NgeLineChartTransform.onChartGesture. Works on
   * linear / time x (continuous zoom); categorical x is not continuously zoomable.
   */
  gestures?: NgeChartGesturesConfig;

  /** Legend configuration. Set `enabled: true` to auto-generate legend from series data. */
  legend?: Partial<NgeChartLegendConfig>;

  /**
   * Line stroke width in pixels
   */
  lineWidth?: number;

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Click handler for data points
   */
  onClick?: NgeLineLayerConfig['onClick'];

  /**
   * Radius of data points in pixels
   */
  pointRadius?: number;

  /**
   * Color palette for multi-series charts
   */
  seriesColors?: string[];

  /**
   * Fill area under the line(s)
   */
  showArea?: boolean;

  /**
   * Show circles at data points
   */
  showPoints?: boolean;

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
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: LineChartTooltipOptions;

  /**
   * Use secondary Y axis (y2) for this line layer.
   * When true, the line will be scaled against scales.y2 instead of scales.y.
   * Requires scales.y2 to be defined in the chart's scaleFactory.
   * @default false
   */
  useSecondaryAxis?: boolean;

  /**
   * X axis label
   */
  xAxisLabel?: string;

  /**
   * Explicit X domain `[min, max]` — continuous zoom override for linear/time x
   * (epoch ms for time), used by NgeLineChartTransform. Ignored for categorical x.
   */
  xDomain?: [number, number];

  /**
   * Y axis label
   */
  yAxisLabel?: string;

  /**
   * Explicit Y domain `[min, max]` — continuous zoom override used by
   * NgeLineChartTransform.
   */
  yDomain?: [number, number];
}

/**
 * Default content formatter for line data points
 */
function defaultLineTooltipFormatter(data: NgeLineDataPoint): NgeTooltipContent {
  const xValue = data.x instanceof Date ? data.x.toLocaleDateString() : String(data.x);
  const seriesLabel = data.seriesId ? `${data.seriesId}: ` : '';

  return {
    extra: { seriesId: data.seriesId },
    label: `${seriesLabel}${xValue}`,
    value: data.y,
  };
}

/**
 * Create a standard line chart configuration.
 *
 * @example
 * // Single series
 * const config = createLineChartConfig({
 *   data: [
 *     { x: 'Jan', y: 10 },
 *     { x: 'Feb', y: 20 },
 *     { x: 'Mar', y: 15 },
 *   ],
 *   showPoints: true,
 * });
 *
 * @example
 * // Multi-series (via seriesId)
 * const config = createLineChartConfig({
 *   data: [
 *     { x: 'Jan', y: 10, seriesId: 'Sales' },
 *     { x: 'Feb', y: 20, seriesId: 'Sales' },
 *     { x: 'Jan', y: 5, seriesId: 'Returns' },
 *     { x: 'Feb', y: 8, seriesId: 'Returns' },
 *   ],
 *   showPoints: true,
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createLineChartConfig(options: LineChartPresetOptions): NgeChartConfig {
  const {
    animationMs,
    areaOpacity,
    curveType = 'linear',
    data,
    gestures,
    legend,
    lineWidth,
    margin,
    onClick,
    pointRadius,
    seriesColors,
    showArea = false,
    showPoints = true,
    showXAxis = false,
    showXGrid = false,
    showYAxis = false,
    showYGrid = false,
    tooltip,
    useSecondaryAxis,
    xAxisLabel,
    xDomain,
    yAxisLabel,
    yDomain,
  } = options;

  // Build tooltip config if enabled
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultLineTooltipFormatter,
        height: tooltip.height ?? 65,
        position: tooltip.position ?? 'follow-mouse',
        style: tooltip.style,
        width: tooltip.width ?? 140,
      }
    : undefined;

  // Build legend config if enabled
  const legendConfig = legend?.enabled
    ? {
        enabled: true,
        items: legend.items ?? extractLineChartLegendItems(data, seriesColors),
        position: legend.position ?? 'bottom',
      }
    : undefined;

  return {
    base: {
      margin,
      showXAxis,
      showXGrid,
      showYAxis,
      showYGrid,
      xAxisLabel,
      yAxisLabel,
    },
    gestures,
    layers: [
      {
        animationMs,
        areaOpacity,
        curveType,
        data,
        lineWidth,
        onClick,
        pointRadius,
        renderer: renderLineLayer,
        seriesColors,
        showArea,
        showPoints,
        tooltip: tooltipConfig,
        type: 'line',
        useSecondaryAxis,
      },
    ],
    legend: legendConfig as NgeChartLegendConfig | undefined,
    // Continuous-zoom overrides (linear/time x, y) are captured in the factory
    // closure — the transform rebuilds this config to change them.
    scaleFactory: (config, dimensions) =>
      createLineChartScales(config, dimensions, { xDomain, yDomain }),
  };
}
