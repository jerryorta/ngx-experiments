import type { NgeChartBaseConfig } from '../core/base-layout';
import type { NgeBarDataPoint, NgeBarLayerConfig, NgeChartConfig } from '../core/config';
import type { NgeChartGesturesConfig } from '../core/gesture';
import type { NgeChartLegendConfig } from '../core/legend';
import type { NgeTooltipConfig, NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { extractBarTrendLineLegendItems } from '../core/legend';
import { renderBarLayer } from '../layers/bar';

/**
 * Tooltip options for bar chart preset
 */
export interface BarChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeBarDataPoint) => NgeTooltipContent;

  /**
   * Tooltip height
   */
  height?: number;

  /**
   * Positioning strategy
   */
  position?: NgeTooltipConfig<NgeBarDataPoint>['position'];

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
 * Options for creating a bar chart config preset.
 */
export interface BarChartPresetOptions {
  /**
   * Enter/update/exit transition duration in ms. Default 300.
   * Set 0 for instant renders (used during zoom/pan gestures).
   */
  animationMs?: number;
  barPadding?: number;
  barRadius?: number;
  data: NgeBarDataPoint[];
  /**
   * Opt-in wheel-zoom / drag-pan / brush-zoom gesture capture. Pair the chart's
   * `(chartGesture)` output with NgeBarChartTransform.onChartGesture — the band
   * (category) axis windows by whole categories, the value axis auto-fits.
   */
  gestures?: NgeChartGesturesConfig;
  /** Format function for value labels displayed on bars */
  labelFormat?: (value: number) => string;
  /** Legend configuration. Set `enabled: true` to auto-generate legend from trend lines. */
  legend?: Partial<NgeChartLegendConfig>;
  margin?: NgeChartBaseConfig['margin'];
  onClick?: NgeBarLayerConfig['onClick'];
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  showMeanLine?: boolean;
  showMedianLine?: boolean;
  showXAxis?: boolean;
  /** Show vertical gridlines at the X axis tick positions. @default false */
  showXGrid?: boolean;
  showYAxis?: boolean;
  /** Show horizontal gridlines at the Y axis tick positions. @default false */
  showYGrid?: boolean;
  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: BarChartTooltipOptions;
  xAxisLabel?: string;
  /** Custom format function for X axis tick labels */
  xAxisTickFormat?: (d: any) => string;
  /**
   * Number of ticks on the x-axis
   */
  xAxisTicks?: number;
  yAxisLabel?: string;
  /** Custom format function for Y axis tick labels */
  yAxisTickFormat?: (d: any) => string;
  /**
   * Number of ticks on the y-axis
   */
  yAxisTicks?: number;
}

/**
 * Default content formatter for bar data points
 */
function defaultBarTooltipFormatter(data: NgeBarDataPoint): NgeTooltipContent {
  return {
    label: data.label,
    value: data.value,
  };
}

/**
 * Create a standard bar chart configuration.
 *
 * @example
 * const config = createBarChartConfig({
 *   data: [{ label: 'A', value: 10 }, { label: 'B', value: 20 }],
 *   orientation: 'vertical',
 *   showLabels: true,
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createBarChartConfig(options: BarChartPresetOptions): NgeChartConfig {
  const {
    animationMs,
    barPadding,
    barRadius,
    data,
    gestures,
    labelFormat,
    legend,
    margin,
    onClick,
    orientation = 'vertical',
    showLabels = false,
    showMeanLine = false,
    showMedianLine = false,
    showXAxis = false,
    showXGrid = false,
    showYAxis = false,
    showYGrid = false,
    tooltip,
    xAxisLabel,
    xAxisTickFormat,
    xAxisTicks,
    yAxisLabel,
    yAxisTickFormat,
    yAxisTicks,
  } = options;

  // Build tooltip config if enabled
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultBarTooltipFormatter,
        height: tooltip.height ?? 65,
        position: tooltip.position ?? 'follow-mouse',
        style: tooltip.style,
        width: tooltip.width ?? 120,
      }
    : undefined;

  // Build legend config if enabled
  const legendConfig = legend?.enabled
    ? {
        enabled: true,
        items: legend.items ?? extractBarTrendLineLegendItems({ showMeanLine, showMedianLine }),
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
      xAxisTickFormat,
      xAxisTicks,
      yAxisLabel,
      yAxisTickFormat,
      yAxisTicks,
    },
    gestures,
    layers: [
      {
        animationMs,
        barPadding,
        barRadius,
        data,
        labelFormat,
        onClick,
        orientation,
        renderer: renderBarLayer,
        showLabels,
        showMeanLine,
        showMedianLine,
        tooltip: tooltipConfig,
        type: 'bar',
      },
    ],
    legend: legendConfig as NgeChartLegendConfig | undefined,
  };
}

/**
 * Add a layer to an existing chart config.
 * Returns a new config (immutable).
 */
export function addLayer(
  config: NgeChartConfig,
  layer: NgeChartConfig['layers'][number]
): NgeChartConfig {
  return {
    ...config,
    layers: [...config.layers, layer],
  };
}
