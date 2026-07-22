import type { ScaleBand, ScaleLinear, ScalePoint, ScaleTime } from 'd3-scale';
import type { Selection } from 'd3-selection';

import type { AxisTierConfig } from '../axis/nge-axis.models';
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
 * Configuration for the optional shared crosshair + shared multi-series tooltip
 * (ARCH-213). Opt-in — omit it (or leave every flag off) and the chart behaves
 * exactly as before. When enabled, moving the pointer over the plot snaps a
 * vertical guide to the nearest datum x and (with `shared`) shows one tooltip
 * listing every series' value at that x. Prototype scope: continuous-x LINE +
 * AREA hosts (snap via a d3 bisector over the merged datum x-positions).
 */
export interface NgeCrosshairConfig {
  /**
   * Render ONE shared tooltip listing every series' value at the snapped x
   * (legend-style rows: colour swatch + series label + y value). When false,
   * only the crosshair guide(s) render.
   * @default false
   */
  shared?: boolean;

  /**
   * How the vertical guide snaps to data. `'datum'` (default) snaps to the
   * nearest real data x; `'tick'` is reserved for snap-to-axis-tick (not yet
   * implemented in the prototype — treated as `'datum'`).
   * @default 'datum'
   */
  snap?: 'datum' | 'tick';

  /**
   * Draw the vertical guide line that snaps to the nearest datum x.
   * @default false
   */
  x?: boolean;

  /**
   * Draw a horizontal guide line at the pointer's y position.
   * @default false
   */
  y?: boolean;
}

/**
 * Configuration for an optional range/slider axis — a full-range ruler with a
 * draggable brush (window + handles) that zooms the plot to the brushed slice.
 * When set on a dimension it REPLACES that dimension's standard axis: the plot's
 * layers keep rendering the current focus (zoomed) domain, while this axis renders
 * the full extent so the brush window shows which slice is in view.
 */
export interface NgeRangeAxisConfig {
  /**
   * The full data extent the ruler spans, `[min, max]`. The brush window maps the
   * plot's current focus domain onto this, and dragging the handles picks a new
   * focus within it. Needs an invertible (linear/time) scale.
   */
  fullDomain: [number, number];
}

/**
 * Configuration for the base chart layout.
 * Shared across all chart types in a composition.
 */
export interface NgeChartBaseConfig {
  /**
   * Opt-in shared crosshair + shared multi-series tooltip (ARCH-213). Off by
   * default (undefined → no behaviour change). See {@link NgeCrosshairConfig}.
   */
  crosshair?: NgeCrosshairConfig;

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
   * Show vertical gridlines at the X axis tick positions
   * @default false
   */
  showXGrid?: boolean;

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
   * Show horizontal gridlines at the Y axis tick positions
   * @default false
   */
  showYGrid?: boolean;

  /**
   * Grouping-tier rows rendered below the X-axis tick row (e.g. months under
   * days, quarters under months) — a second dimension of structure over the
   * ticks. Each entry is one tier row, stacked outward from the axis. Scale-
   * agnostic: resolved to pixel bands by explicit ranges, a calendar interval,
   * or a category grouping fn (see {@link AxisTierConfig}).
   */
  xAxisGroups?: AxisTierConfig[];

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
   * Optional range/slider axis for X — a full-range ruler + draggable brush that
   * zooms the plot along X. When set it REPLACES the standard X axis. Needs an
   * invertible (linear/time) X scale (e.g. scatter).
   */
  xRangeAxis?: NgeRangeAxisConfig;

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
   * Grouping-tier rows rendered to the left of the Y-axis tick labels — the
   * vertical counterpart of {@link xAxisGroups}. Each entry is one tier row,
   * stacked leftward from the tick labels.
   */
  yAxisGroups?: AxisTierConfig[];

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
   * Optional range/slider axis for Y — the vertical counterpart of
   * {@link NgeChartBaseConfig.xRangeAxis}. When set it REPLACES the standard Y axis.
   */
  yRangeAxis?: NgeRangeAxisConfig;

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
  crosshair: NgeCrosshairConfig | undefined;
  margin: NgeChartMargin;
  showXAxis: boolean;
  showXGrid: boolean;
  showY2Axis: boolean;
  showYAxis: boolean;
  showYGrid: boolean;
  xAxisGroups: AxisTierConfig[] | undefined;
  xAxisLabel: string;
  xAxisTickFormat: ((d: any) => string) | undefined;
  xAxisTickRotation: number;
  xAxisTicks: number | undefined;
  xRangeAxis: NgeRangeAxisConfig | undefined;
  xScaleType: NgeChartScaleType;
  y2AxisLabel: string;
  y2AxisLabelColor: string;
  y2ScaleType: 'band' | 'linear';
  yAxisGroups: AxisTierConfig[] | undefined;
  yAxisLabel: string;
  yAxisTickFormat: ((d: any) => string) | undefined;
  yAxisTicks: number | undefined;
  yRangeAxis: NgeRangeAxisConfig | undefined;
  yScaleType: 'band' | 'linear';
}

/**
 * Default base layout configuration
 */
export const DEFAULT_BASE_LAYOUT_CONFIG: ResolvedNgeChartBaseConfig = {
  crosshair: undefined,
  margin: {
    bottom: 45,
    left: 45,
    right: 10,
    top: 20,
  },
  showXAxis: false,
  showXGrid: false,
  showY2Axis: false,
  showYAxis: false,
  showYGrid: false,
  xAxisGroups: undefined,
  xAxisLabel: '',
  xAxisTickFormat: undefined,
  xAxisTickRotation: 0,
  xAxisTicks: undefined,
  xRangeAxis: undefined,
  xScaleType: 'band',
  y2AxisLabel: '',
  y2AxisLabelColor: '',
  y2ScaleType: 'linear',
  yAxisGroups: undefined,
  yAxisLabel: '',
  yAxisTickFormat: undefined,
  yAxisTicks: undefined,
  yRangeAxis: undefined,
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
  /**
   * Clipped group INSIDE bounds that all chart layers render into. A clipPath
   * sized to boundedWidth × boundedHeight keeps marks (dots/bars/lines) from
   * spilling over the axes and margins when zoomed or panned. Axes render as
   * unclipped siblings in `bounds`.
   */
  layers: Selection<SVGGElement, unknown, null, undefined>;
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
    crosshair: config.crosshair ?? DEFAULT_BASE_LAYOUT_CONFIG.crosshair,
    margin: {
      ...DEFAULT_BASE_LAYOUT_CONFIG.margin,
      ...config.margin,
    },
    showXAxis: config.showXAxis ?? DEFAULT_BASE_LAYOUT_CONFIG.showXAxis,
    showXGrid: config.showXGrid ?? DEFAULT_BASE_LAYOUT_CONFIG.showXGrid,
    showY2Axis: config.showY2Axis ?? DEFAULT_BASE_LAYOUT_CONFIG.showY2Axis,
    showYAxis: config.showYAxis ?? DEFAULT_BASE_LAYOUT_CONFIG.showYAxis,
    showYGrid: config.showYGrid ?? DEFAULT_BASE_LAYOUT_CONFIG.showYGrid,
    xAxisGroups: config.xAxisGroups ?? DEFAULT_BASE_LAYOUT_CONFIG.xAxisGroups,
    xAxisLabel: config.xAxisLabel ?? DEFAULT_BASE_LAYOUT_CONFIG.xAxisLabel,
    xAxisTickFormat: config.xAxisTickFormat ?? DEFAULT_BASE_LAYOUT_CONFIG.xAxisTickFormat,
    xAxisTickRotation: config.xAxisTickRotation ?? DEFAULT_BASE_LAYOUT_CONFIG.xAxisTickRotation,
    xAxisTicks: config.xAxisTicks ?? DEFAULT_BASE_LAYOUT_CONFIG.xAxisTicks,
    xRangeAxis: config.xRangeAxis ?? DEFAULT_BASE_LAYOUT_CONFIG.xRangeAxis,
    xScaleType: config.xScaleType ?? DEFAULT_BASE_LAYOUT_CONFIG.xScaleType,
    y2AxisLabel: config.y2AxisLabel ?? DEFAULT_BASE_LAYOUT_CONFIG.y2AxisLabel,
    y2AxisLabelColor: config.y2AxisLabelColor ?? DEFAULT_BASE_LAYOUT_CONFIG.y2AxisLabelColor,
    y2ScaleType: config.y2ScaleType ?? DEFAULT_BASE_LAYOUT_CONFIG.y2ScaleType,
    yAxisGroups: config.yAxisGroups ?? DEFAULT_BASE_LAYOUT_CONFIG.yAxisGroups,
    yAxisLabel: config.yAxisLabel ?? DEFAULT_BASE_LAYOUT_CONFIG.yAxisLabel,
    yAxisTickFormat: config.yAxisTickFormat ?? DEFAULT_BASE_LAYOUT_CONFIG.yAxisTickFormat,
    yAxisTicks: config.yAxisTicks ?? DEFAULT_BASE_LAYOUT_CONFIG.yAxisTicks,
    yRangeAxis: config.yRangeAxis ?? DEFAULT_BASE_LAYOUT_CONFIG.yRangeAxis,
    yScaleType: config.yScaleType ?? DEFAULT_BASE_LAYOUT_CONFIG.yScaleType,
  };
}
