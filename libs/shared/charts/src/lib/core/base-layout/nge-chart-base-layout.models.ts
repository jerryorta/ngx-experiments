import type { ScaleBand, ScaleLinear, ScalePoint, ScaleTime } from 'd3-scale';
import type { Selection } from 'd3-selection';

import type { NgeChartDimensions } from '../chart.models';

/**
 * Scale type for chart axes
 */
export type NgeChartScaleType = 'band' | 'linear' | 'time';

/**
 * Chart margin with all required properties
 */
export interface NgeChartMargin {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

/**
 * Configuration for the base chart layout.
 * Shared across all chart types in a composition.
 */
export interface NgeChartBaseConfig {
  /**
   * Margins around the chart area
   */
  margin?: Partial<NgeChartMargin>;

  /**
   * Show X axis
   * @default false
   */
  showXAxis?: boolean;

  /**
   * Show secondary Y axis (right side)
   * @default false
   */
  showY2Axis?: boolean;

  /**
   * Show Y axis
   * @default false
   */
  showYAxis?: boolean;

  /**
   * X axis label (e.g., "Month", "Category")
   */
  xAxisLabel?: string;

  /**
   * Custom format function for X axis tick labels.
   * @example (d) => '$' + d
   */
  xAxisTickFormat?: (d: any) => string;

  /**
   * Rotation angle for X axis tick labels in degrees.
   * Use -90 for vertical labels (reading bottom-to-top).
   * Use 0 for horizontal labels (default).
   * @default 0
   */
  xAxisTickRotation?: number;

  /**
   * Number of ticks to display on the X axis.
   * Only applies to linear/time scales (not band scales).
   * @default undefined (D3 auto-calculates)
   */
  xAxisTicks?: number;

  /**
   * X axis scale type
   * @default 'band'
   */
  xScaleType?: NgeChartScaleType;

  /**
   * Secondary Y axis label (e.g., "Percentage", "Rate")
   */
  y2AxisLabel?: string;

  /**
   * Custom color for the secondary Y axis label.
   * Use CSS color value (e.g., 'var(--chart-tertiary)').
   * @default '' (uses theme default)
   */
  y2AxisLabelColor?: string;

  /**
   * Secondary Y axis scale type
   * @default 'linear'
   */
  y2ScaleType?: 'band' | 'linear';

  /**
   * Y axis label (e.g., "Value", "Count")
   */
  yAxisLabel?: string;

  /**
   * Custom format function for Y axis tick labels.
   * @example (d) => '$' + (d / 1000) + 'K'
   */
  yAxisTickFormat?: (d: any) => string;

  /**
   * Number of ticks to display on the Y axis.
   * Only applies to linear scales (not band scales).
   * @default undefined (D3 auto-calculates)
   */
  yAxisTicks?: number;

  /**
   * Y axis scale type
   * @default 'linear'
   */
  yScaleType?: 'band' | 'linear';
}

/**
 * Fully resolved base config with all properties defined.
 * This is the return type of mergeBaseConfig().
 */
export interface ResolvedNgeChartBaseConfig {
  margin: NgeChartMargin;
  showXAxis: boolean;
  showY2Axis: boolean;
  showYAxis: boolean;
  xAxisLabel: string;
  xAxisTickFormat: ((d: any) => string) | undefined;
  xAxisTickRotation: number;
  xAxisTicks: number | undefined;
  xScaleType: NgeChartScaleType;
  y2AxisLabel: string;
  y2AxisLabelColor: string;
  y2ScaleType: 'band' | 'linear';
  yAxisLabel: string;
  yAxisTickFormat: ((d: any) => string) | undefined;
  yAxisTicks: number | undefined;
  yScaleType: 'band' | 'linear';
}

/**
 * Default base layout configuration
 */
export const DEFAULT_BASE_LAYOUT_CONFIG: ResolvedNgeChartBaseConfig = {
  margin: {
    bottom: 45,
    left: 45,
    right: 10,
    top: 20,
  },
  showXAxis: false,
  showY2Axis: false,
  showYAxis: false,
  xAxisLabel: '',
  xAxisTickFormat: undefined,
  xAxisTickRotation: 0,
  xAxisTicks: undefined,
  xScaleType: 'band',
  y2AxisLabel: '',
  y2AxisLabelColor: '',
  y2ScaleType: 'linear',
  yAxisLabel: '',
  yAxisTickFormat: undefined,
  yAxisTicks: undefined,
  yScaleType: 'linear',
};

/**
 * Scale types used by the chart system
 */
export type NgeChartXScale =
  | ScaleBand<string>
  | ScaleLinear<number, number>
  | ScalePoint<string>
  | ScaleTime<number, number>;
export type NgeChartYScale = ScaleBand<string> | ScaleLinear<number, number>;

/**
 * Container for chart scales
 */
export interface NgeChartScales {
  x: NgeChartXScale;
  y: NgeChartYScale;
  /**
   * Optional secondary Y scale for dual-axis charts.
   * Used when layers need different Y scales (e.g., count vs percentage).
   */
  y2?: NgeChartYScale;
}

/**
 * Layout state returned after resize
 */
export interface NgeChartLayoutState {
  bounds: Selection<SVGGElement, unknown, null, undefined>;
  dimensions: NgeChartDimensions;
}

/**
 * Merge base config with defaults
 */
export function mergeBaseConfig(
  config?: Partial<NgeChartBaseConfig>
): ResolvedNgeChartBaseConfig {
  if (!config) {
    return DEFAULT_BASE_LAYOUT_CONFIG;
  }

  return {
    margin: {
      ...DEFAULT_BASE_LAYOUT_CONFIG.margin,
      ...config.margin,
    },
    showXAxis: config.showXAxis ?? DEFAULT_BASE_LAYOUT_CONFIG.showXAxis,
    showY2Axis: config.showY2Axis ?? DEFAULT_BASE_LAYOUT_CONFIG.showY2Axis,
    showYAxis: config.showYAxis ?? DEFAULT_BASE_LAYOUT_CONFIG.showYAxis,
    xAxisLabel: config.xAxisLabel ?? DEFAULT_BASE_LAYOUT_CONFIG.xAxisLabel,
    xAxisTickFormat: config.xAxisTickFormat ?? DEFAULT_BASE_LAYOUT_CONFIG.xAxisTickFormat,
    xAxisTickRotation: config.xAxisTickRotation ?? DEFAULT_BASE_LAYOUT_CONFIG.xAxisTickRotation,
    xAxisTicks: config.xAxisTicks ?? DEFAULT_BASE_LAYOUT_CONFIG.xAxisTicks,
    xScaleType: config.xScaleType ?? DEFAULT_BASE_LAYOUT_CONFIG.xScaleType,
    y2AxisLabel: config.y2AxisLabel ?? DEFAULT_BASE_LAYOUT_CONFIG.y2AxisLabel,
    y2AxisLabelColor: config.y2AxisLabelColor ?? DEFAULT_BASE_LAYOUT_CONFIG.y2AxisLabelColor,
    y2ScaleType: config.y2ScaleType ?? DEFAULT_BASE_LAYOUT_CONFIG.y2ScaleType,
    yAxisLabel: config.yAxisLabel ?? DEFAULT_BASE_LAYOUT_CONFIG.yAxisLabel,
    yAxisTickFormat: config.yAxisTickFormat ?? DEFAULT_BASE_LAYOUT_CONFIG.yAxisTickFormat,
    yAxisTicks: config.yAxisTicks ?? DEFAULT_BASE_LAYOUT_CONFIG.yAxisTicks,
    yScaleType: config.yScaleType ?? DEFAULT_BASE_LAYOUT_CONFIG.yScaleType,
  };
}
